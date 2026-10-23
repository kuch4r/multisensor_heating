"""Pure control algorithm (no Home Assistant imports, fully unit-testable).

The TRV runs its own valve loop based on ``setpoint - trv_temperature``. We steer it
by writing a setpoint above its own reading to heat (bigger gap = more heat) and
below its own reading to stop.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field, replace

from .const import (
    REASON_DISABLED,
    REASON_HEATING,
    REASON_IDLE,
    REASON_NO_SENSORS,
    REASON_ROOM_OFF,
    REASON_TRV_UNAVAILABLE,
    REASON_VACATION,
    REASON_WINDOW_OPEN,
)

HVAC_OFF = "off"
HVAC_HEAT = "heat"
STEP = 0.5
HVAC_RETRY_S = 60.0

STATUS_COLD = "cold"
STATUS_OK = "ok"
STATUS_HOT = "hot"
STATUS_UNAVAILABLE = "unavailable"


@dataclass(frozen=True)
class SensorInput:
    """A temperature sensor and its per-sensor settings."""

    key: str
    temperature: float | None
    offset: float = 0.0
    min_temp: float = 5.0
    max_temp: float = 30.0


@dataclass(frozen=True)
class RoomSettings:
    """User settings of a room."""

    target: float
    hvac_on: bool = True
    away: bool = False
    enabled: bool = True
    gain: float = 2.0
    hysteresis: float = 0.5
    vacation_temp: float = 10.0
    min_boost: float = 1.0
    stop_margin: float = 2.0
    window_delay: float = 120.0
    min_write_interval: float = 180.0
    min_setpoint: float = 5.0
    max_setpoint: float = 30.0


@dataclass(frozen=True)
class TrvState:
    """Current state of the TRV climate entity."""

    available: bool
    hvac_mode: str | None = None
    current_temperature: float | None = None
    target_temperature: float | None = None


@dataclass(frozen=True)
class ControlState:
    """State carried between evaluations (persisted)."""

    heating: bool = False
    reason: str | None = None
    last_write: float | None = None
    last_hvac_request: str | None = None
    last_hvac_write: float | None = None


@dataclass(frozen=True)
class ControlInput:
    """Everything the algorithm needs for one evaluation."""

    now: float
    settings: RoomSettings
    trv: TrvState
    sensors: list[SensorInput]
    window_open_since: float | None
    state: ControlState = field(default_factory=ControlState)


@dataclass(frozen=True)
class SensorStatus:
    """Evaluation result of one sensor."""

    temperature: float | None
    effective_target: float
    lower: float
    upper: float
    status: str
    deficit: float | None


@dataclass(frozen=True)
class Decision:
    """Result of one evaluation, including actions to apply to the TRV."""

    reason: str
    heating: bool
    window_blocked: bool
    state: ControlState
    set_hvac_mode: str | None = None
    set_temperature: float | None = None
    requested_setpoint: float | None = None
    deficit: float | None = None
    sensors: dict[str, SensorStatus] = field(default_factory=dict)


def evaluate_sensor(sensor: SensorInput, settings: RoomSettings) -> SensorStatus:
    """Classify a single sensor against its effective target and safety range."""
    half = settings.hysteresis / 2
    lo, hi = sensor.min_temp + half, sensor.max_temp - half
    if lo > hi:
        lo = hi = (sensor.min_temp + sensor.max_temp) / 2
    # The absolute safety range wins over room target + offset.
    eff = min(max(settings.target + sensor.offset, lo), hi)
    lower, upper = eff - half, eff + half
    if sensor.temperature is None:
        return SensorStatus(None, eff, lower, upper, STATUS_UNAVAILABLE, None)
    temp = sensor.temperature
    if temp >= upper:
        status = STATUS_HOT
    elif temp <= lower:
        status = STATUS_COLD
    else:
        status = STATUS_OK
    return SensorStatus(temp, eff, lower, upper, status, round(eff - temp, 2))


def _round_up(value: float) -> float:
    return math.ceil(round(value / STEP, 6)) * STEP


def _round_down(value: float) -> float:
    return math.floor(round(value / STEP, 6)) * STEP


def _clamp(value: float, settings: RoomSettings) -> float:
    return min(max(value, settings.min_setpoint), settings.max_setpoint)


def decide(inp: ControlInput) -> Decision:
    """Compute the next action for a room."""
    s, trv, prev, now = inp.settings, inp.trv, inp.state, inp.now
    statuses = {sensor.key: evaluate_sensor(sensor, s) for sensor in inp.sensors}
    window_blocked = (
        inp.window_open_since is not None and now - inp.window_open_since >= s.window_delay
    )

    def result(reason: str, heating: bool, hvac: str | None, setpoint: float | None,
               deficit: float | None = None) -> Decision:
        reason_changed = reason != prev.reason or heating != prev.heating
        state = replace(prev, heating=heating, reason=reason)
        set_hvac = None
        if hvac is not None and trv.hvac_mode != hvac and (
            prev.last_hvac_request != hvac
            or prev.last_hvac_write is None
            or now - prev.last_hvac_write >= HVAC_RETRY_S
        ):
            set_hvac = hvac
            state = replace(state, last_hvac_request=hvac, last_hvac_write=now)
        set_temp = None
        if setpoint is not None and setpoint != trv.target_temperature and (
            reason_changed
            or prev.last_write is None
            or now - prev.last_write >= s.min_write_interval
        ):
            set_temp = setpoint
            state = replace(state, last_write=now)
        return Decision(
            reason=reason,
            heating=heating,
            window_blocked=window_blocked,
            state=state,
            set_hvac_mode=set_hvac,
            set_temperature=set_temp,
            requested_setpoint=setpoint,
            deficit=deficit,
            sensors=statuses,
        )

    if not s.enabled:
        return Decision(REASON_DISABLED, False, window_blocked,
                        replace(prev, heating=False, reason=REASON_DISABLED), sensors=statuses)
    if not trv.available:
        return Decision(REASON_TRV_UNAVAILABLE, False, window_blocked,
                        replace(prev, heating=False, reason=REASON_TRV_UNAVAILABLE),
                        sensors=statuses)
    if window_blocked:
        return result(REASON_WINDOW_OPEN, False, HVAC_OFF, None)
    if not s.hvac_on:
        return result(REASON_ROOM_OFF, False, HVAC_OFF, None)
    if s.away:
        return result(REASON_VACATION, False, HVAC_HEAT, _clamp(s.vacation_temp, s))

    available = [st for st in statuses.values() if st.status != STATUS_UNAVAILABLE]
    if not available or trv.current_temperature is None:
        # Only switch the TRV on if it is not off, or if we switched it off ourselves;
        # never resurrect a TRV that was switched off by hand.
        hvac = HVAC_HEAT if trv.hvac_mode != HVAC_OFF or prev.last_hvac_request == HVAC_OFF else None
        return result(REASON_NO_SENSORS, False, hvac, _clamp(_round_down(s.target), s))

    if any(st.status == STATUS_HOT for st in available):
        heating = False
    elif any(st.status == STATUS_COLD for st in available):
        heating = True
    else:
        heating = prev.heating and prev.reason in (REASON_HEATING, REASON_IDLE)

    deficit = max(st.deficit for st in available if st.deficit is not None)
    trv_temp = trv.current_temperature
    if heating:
        setpoint = _clamp(_round_up(trv_temp + max(s.min_boost, s.gain * deficit)), s)
        current = trv.target_temperature
        if prev.heating and current is not None and abs(current - setpoint) <= STEP:
            # Close enough to the ideal setpoint; avoid needless writes (battery).
            setpoint = current
        return result(REASON_HEATING, True, HVAC_HEAT, setpoint, deficit)

    setpoint = _clamp(_round_down(trv_temp - s.stop_margin), s)
    if trv.target_temperature is not None and trv.target_temperature <= trv_temp - STEP:
        # Valve is already closed by the TRV; avoid needless writes (battery).
        return result(REASON_IDLE, False, HVAC_HEAT, trv.target_temperature, deficit)
    return result(REASON_IDLE, False, HVAC_HEAT, setpoint, deficit)
