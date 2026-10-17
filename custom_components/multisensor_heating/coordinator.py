"""RoomController: wires Home Assistant state to the pure control algorithm."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from dataclasses import asdict, fields
from datetime import timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_ON, STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import CALLBACK_TYPE, Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.event import (
    async_call_later,
    async_track_state_change_event,
    async_track_time_interval,
)
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    CONF_LOCK,
    CONF_MAX_SETPOINT,
    CONF_MIN_BOOST,
    CONF_MIN_SETPOINT,
    CONF_MIN_WRITE_INTERVAL,
    CONF_NAME,
    CONF_REFERENCE,
    CONF_STALE_TIMEOUT,
    CONF_STOP_MARGIN,
    CONF_TEMP_SENSORS,
    CONF_TRV,
    CONF_WINDOW_DELAY,
    CONF_WINDOW_SENSORS,
    DEFAULT_GAIN,
    DEFAULT_HYSTERESIS,
    DEFAULT_PARAMS,
    DEFAULT_SENSOR_MAX,
    DEFAULT_SENSOR_MIN,
    DEFAULT_TARGET,
    DEFAULT_VACATION_TEMP,
    DOMAIN,
    EVALUATE_INTERVAL_S,
    REASON_NO_SENSORS,
    STATS_SAMPLE_S,
    STATS_WINDOW_H,
)
from .controller import (
    ControlInput,
    ControlState,
    Decision,
    RoomSettings,
    SensorInput,
    TrvState,
    decide,
)
from .recorder_util import async_get_history, state_temperature
from .stats import DeltaSummary, OffsetStats

_LOGGER = logging.getLogger(__name__)
STORAGE_VERSION = 1
LOCK_RETRY_S = 60.0

DEFAULT_SETTINGS: dict[str, Any] = {
    "target": DEFAULT_TARGET,
    "hvac_on": True,
    "away": False,
    "enabled": True,
    "lock": False,
    "gain": DEFAULT_GAIN,
    "hysteresis": DEFAULT_HYSTERESIS,
    "vacation_temp": DEFAULT_VACATION_TEMP,
}
DEFAULT_SENSOR_SETTINGS: dict[str, float] = {
    "offset": 0.0,
    "min": DEFAULT_SENSOR_MIN,
    "max": DEFAULT_SENSOR_MAX,
}


class RoomController:
    """Controls one room (one TRV)."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        opts = {**DEFAULT_PARAMS, **entry.options}
        self.params = opts
        self.name: str = entry.data[CONF_NAME]
        self.trv: str = entry.data[CONF_TRV]
        self.lock_entity: str | None = opts.get(CONF_LOCK)
        self.sensor_ids: list[str] = [
            self.trv,
            *[s for s in opts.get(CONF_TEMP_SENSORS, []) if s != self.trv],
        ]
        self.window_sensors: list[str] = list(opts.get(CONF_WINDOW_SENSORS, []))
        ref = opts.get(CONF_REFERENCE)
        self.reference: str = ref if ref in self.sensor_ids else self.sensor_ids[-1]
        self.settings: dict[str, Any] = dict(DEFAULT_SETTINGS)
        self.sensor_settings: dict[str, dict[str, float]] = {
            sid: dict(DEFAULT_SENSOR_SETTINGS) for sid in self.sensor_ids
        }
        self.control_state = ControlState()
        self.decision: Decision | None = None
        self.stats = OffsetStats(STATS_WINDOW_H * 3600, STATS_SAMPLE_S)
        self._last_sample: float = 0.0
        self._last_lock_attempt: float = 0.0
        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}.{entry.entry_id}"
        )
        self._listeners: list[CALLBACK_TYPE] = []
        self._unsubs: list[CALLBACK_TYPE] = []
        self._window_timer: CALLBACK_TYPE | None = None
        self._eval_lock = asyncio.Lock()
        self.unique_ids: set[str] = set()

    # ---- lifecycle -------------------------------------------------------------------

    async def async_setup(self) -> None:
        stored = await self._store.async_load() or {}
        self.settings.update(
            {k: v for k, v in stored.get("settings", {}).items() if k in DEFAULT_SETTINGS}
        )
        for sid, values in stored.get("sensors", {}).items():
            if sid in self.sensor_settings:
                self.sensor_settings[sid].update(values)
        names = {f.name for f in fields(ControlState)}
        self.control_state = ControlState(
            **{k: v for k, v in stored.get("control_state", {}).items() if k in names}
        )

        watched = [self.trv, *self.sensor_ids[1:], *self.window_sensors]
        if self.lock_entity:
            watched.append(self.lock_entity)
        self._unsubs.append(
            async_track_state_change_event(self.hass, watched, self._handle_state_change)
        )
        self._unsubs.append(
            async_track_time_interval(
                self.hass, self._handle_tick, timedelta(seconds=EVALUATE_INTERVAL_S)
            )
        )
        self.entry.async_create_background_task(
            self.hass, self._async_seed_stats(), f"{DOMAIN}_seed_stats_{self.entry.entry_id}"
        )

    async def async_unload(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        if self._window_timer:
            self._window_timer()
            self._window_timer = None
        await self._store.async_save(self._data())

    def _data(self) -> dict[str, Any]:
        return {
            "settings": self.settings,
            "sensors": self.sensor_settings,
            "control_state": asdict(self.control_state),
        }

    def _save(self) -> None:
        self._store.async_delay_save(self._data, 10)

    # ---- listeners -------------------------------------------------------------------

    @callback
    def async_add_listener(self, update_callback: CALLBACK_TYPE) -> Callable[[], None]:
        self._listeners.append(update_callback)
        return lambda: self._listeners.remove(update_callback)

    @callback
    def _notify(self) -> None:
        for update_callback in list(self._listeners):
            update_callback()

    @callback
    def _handle_state_change(self, event: Event[EventStateChangedData]) -> None:
        new_state = event.data["new_state"]
        if (
            event.data["entity_id"] in self.window_sensors
            and new_state is not None
            and new_state.state == STATE_ON
        ):
            if self._window_timer:
                self._window_timer()
            self._window_timer = async_call_later(
                self.hass, float(self.params[CONF_WINDOW_DELAY]) + 1, self._handle_window_timer
            )
        self.hass.async_create_task(self.async_evaluate())

    async def _handle_window_timer(self, _now: Any = None) -> None:
        self._window_timer = None
        await self.async_evaluate()

    async def _handle_tick(self, _now: Any = None) -> None:
        now = dt_util.utcnow().timestamp()
        if now - self._last_sample >= STATS_SAMPLE_S:
            self._last_sample = now
            self.stats.add(now, self.current_temperatures(), self.reference)
        await self.async_evaluate()

    # ---- inputs ----------------------------------------------------------------------

    def current_temperatures(self) -> dict[str, float | None]:
        now = dt_util.utcnow()
        stale = timedelta(minutes=float(self.params[CONF_STALE_TIMEOUT]))
        temps: dict[str, float | None] = {}
        for sid in self.sensor_ids:
            state = self.hass.states.get(sid)
            temp = state_temperature(state)
            if state is not None and sid != self.trv and now - state.last_reported > stale:
                temp = None
            temps[sid] = temp
        return temps

    def window_open_since(self) -> float | None:
        opened = [
            state.last_changed.timestamp()
            for wid in self.window_sensors
            if (state := self.hass.states.get(wid)) is not None and state.state == STATE_ON
        ]
        return min(opened) if opened else None

    def _trv_state(self) -> TrvState:
        state = self.hass.states.get(self.trv)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return TrvState(available=False)
        attrs = state.attributes
        return TrvState(
            available=True,
            hvac_mode=state.state,
            current_temperature=state_temperature(state),
            target_temperature=attrs.get("temperature"),
        )

    def room_settings(self) -> RoomSettings:
        p, s = self.params, self.settings
        return RoomSettings(
            target=float(s["target"]),
            hvac_on=bool(s["hvac_on"]),
            away=bool(s["away"]),
            enabled=bool(s["enabled"]),
            gain=float(s["gain"]),
            hysteresis=float(s["hysteresis"]),
            vacation_temp=float(s["vacation_temp"]),
            min_boost=float(p[CONF_MIN_BOOST]),
            stop_margin=float(p[CONF_STOP_MARGIN]),
            window_delay=float(p[CONF_WINDOW_DELAY]),
            min_write_interval=float(p[CONF_MIN_WRITE_INTERVAL]),
            min_setpoint=float(p[CONF_MIN_SETPOINT]),
            max_setpoint=float(p[CONF_MAX_SETPOINT]),
        )

    # ---- evaluation ------------------------------------------------------------------

    async def async_evaluate(self) -> None:
        async with self._eval_lock:
            now = dt_util.utcnow().timestamp()
            temps = self.current_temperatures()
            sensors = [
                SensorInput(
                    key=sid,
                    temperature=temps[sid],
                    offset=float(self.sensor_settings[sid]["offset"]),
                    min_temp=float(self.sensor_settings[sid]["min"]),
                    max_temp=float(self.sensor_settings[sid]["max"]),
                )
                for sid in self.sensor_ids
            ]
            decision = decide(
                ControlInput(
                    now=now,
                    settings=self.room_settings(),
                    trv=self._trv_state(),
                    sensors=sensors,
                    window_open_since=self.window_open_since(),
                    state=self.control_state,
                )
            )
            if decision.set_hvac_mode is not None:
                await self._call("climate", "set_hvac_mode",
                                 {"entity_id": self.trv, "hvac_mode": decision.set_hvac_mode})
            if decision.set_temperature is not None:
                await self._call("climate", "set_temperature",
                                 {"entity_id": self.trv, "temperature": decision.set_temperature})
            await self._enforce_lock(now)
            self._update_issue(decision.reason == REASON_NO_SENSORS)
            if decision.set_hvac_mode or decision.set_temperature is not None:
                _LOGGER.debug("%s: %s -> hvac=%s setpoint=%s", self.name, decision.reason,
                              decision.set_hvac_mode, decision.set_temperature)
            self.decision = decision
            self.control_state = decision.state
            self._save()
        self._notify()

    async def _enforce_lock(self, now: float) -> None:
        if not (self.lock_entity and self.settings["enabled"] and self.settings["lock"]):
            return
        state = self.hass.states.get(self.lock_entity)
        if state is None or state.state != "unlocked" or now - self._last_lock_attempt < LOCK_RETRY_S:
            return
        self._last_lock_attempt = now
        await self._call("lock", "lock", {"entity_id": self.lock_entity})

    async def _call(self, domain: str, service: str, data: dict[str, Any]) -> None:
        try:
            await self.hass.services.async_call(domain, service, data, blocking=True)
        except (HomeAssistantError, ValueError) as err:
            _LOGGER.warning("%s: %s.%s failed: %s", self.name, domain, service, err)

    def _update_issue(self, active: bool) -> None:
        issue_id = f"no_sensors_{self.entry.entry_id}"
        if active:
            ir.async_create_issue(
                self.hass, DOMAIN, issue_id, is_fixable=False,
                severity=ir.IssueSeverity.WARNING, translation_key="no_sensors",
                translation_placeholders={"room": self.name},
            )
        else:
            ir.async_delete_issue(self.hass, DOMAIN, issue_id)

    # ---- setters used by entities ----------------------------------------------------

    async def async_set_setting(self, key: str, value: Any) -> None:
        old = self.settings.get(key)
        self.settings[key] = value
        if key == "enabled" and old and not value:
            await self._hand_over_to_trv()
        if key == "lock" and self.lock_entity and not value:
            await self._call("lock", "unlock", {"entity_id": self.lock_entity})
        self._save()
        await self.async_evaluate()

    async def async_set_sensor_setting(self, sensor_id: str, key: str, value: float) -> None:
        self.sensor_settings[sensor_id][key] = value
        self._save()
        await self.async_evaluate()

    async def _hand_over_to_trv(self) -> None:
        """Kill switch: return the TRV to its own Salus schedule and unlock it."""
        state = self.hass.states.get(self.trv)
        if state is not None and "auto" in (state.attributes.get("hvac_modes") or []):
            await self._call("climate", "set_hvac_mode", {"entity_id": self.trv, "hvac_mode": "auto"})
        if self.lock_entity:
            await self._call("lock", "unlock", {"entity_id": self.lock_entity})
        self.control_state = ControlState()

    # ---- statistics ------------------------------------------------------------------

    def sensor_name(self, sensor_id: str) -> str:
        if sensor_id == self.trv:
            return "TRV"
        state = self.hass.states.get(sensor_id)
        return state.name if state is not None else sensor_id

    def offset_summary(self, sensor_id: str) -> DeltaSummary:
        return self.stats.summary(sensor_id, dt_util.utcnow().timestamp())

    async def _async_seed_stats(self) -> None:
        end = dt_util.utcnow()
        start = end - timedelta(hours=STATS_WINDOW_H)
        try:
            history = await async_get_history(self.hass, self.sensor_ids, start)
        except Exception:  # noqa: BLE001 - recorder may be unavailable; stats are optional
            _LOGGER.debug("%s: could not load history for offset statistics", self.name)
            return
        series = {
            sid: [(s.last_updated.timestamp(), state_temperature(s)) for s in history.get(sid, [])]
            for sid in self.sensor_ids
        }
        self.stats.seed(series, self.reference, start.timestamp(), end.timestamp())
        self._last_sample = end.timestamp()
        self._notify()
