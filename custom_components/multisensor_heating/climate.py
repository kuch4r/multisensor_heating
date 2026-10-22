"""Virtual room thermostat."""

from __future__ import annotations

from dataclasses import asdict
from typing import Any

from homeassistant.components.climate import (
    PRESET_AWAY,
    PRESET_NONE,
    ClimateEntity,
    ClimateEntityFeature,
    HVACAction,
    HVACMode,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_TEMPERATURE, UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import (
    REASON_DISABLED,
    REASON_HEATING,
    REASON_IDLE,
    REASON_NO_SENSORS,
    REASON_TRV_UNAVAILABLE,
    REASON_VACATION,
)
from .entity import RoomEntity


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback
) -> None:
    async_add_entities([RoomClimate(entry.runtime_data)])


class RoomClimate(RoomEntity, ClimateEntity):
    """Room target, on/off and vacation preset; shows the reference temperature."""

    _attr_name = None
    _unrecorded_attributes = frozenset({"sensors"})
    _attr_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_hvac_modes = [HVACMode.OFF, HVACMode.HEAT]
    _attr_preset_modes = [PRESET_NONE, PRESET_AWAY]
    _attr_min_temp = 5.0
    _attr_max_temp = 30.0
    _attr_target_temperature_step = 0.5
    _attr_supported_features = (
        ClimateEntityFeature.TARGET_TEMPERATURE
        | ClimateEntityFeature.PRESET_MODE
        | ClimateEntityFeature.TURN_ON
        | ClimateEntityFeature.TURN_OFF
    )

    def __init__(self, controller) -> None:
        super().__init__(controller, "climate")

    @property
    def current_temperature(self) -> float | None:
        d = self.controller.decision
        status = d.sensors.get(self.controller.reference) if d else None
        return status.temperature if status else None

    @property
    def target_temperature(self) -> float:
        return float(self.controller.settings["target"])

    @property
    def hvac_mode(self) -> HVACMode:
        return HVACMode.HEAT if self.controller.settings["hvac_on"] else HVACMode.OFF

    @property
    def preset_mode(self) -> str:
        return PRESET_AWAY if self.controller.settings["away"] else PRESET_NONE

    @property
    def hvac_action(self) -> HVACAction:
        d = self.controller.decision
        if d is None:
            return HVACAction.IDLE
        if d.reason == REASON_HEATING:
            return HVACAction.HEATING
        if d.reason in (REASON_IDLE, REASON_VACATION, REASON_NO_SENSORS):
            return HVACAction.IDLE
        if d.reason in (REASON_DISABLED, REASON_TRV_UNAVAILABLE):
            # The TRV runs on its own; report what it is actually doing.
            trv = self.hass.states.get(self.controller.trv)
            try:
                return HVACAction(trv.attributes.get("hvac_action")) if trv else HVACAction.IDLE
            except ValueError:
                return HVACAction.IDLE
        return HVACAction.OFF

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        c, d = self.controller, self.controller.decision
        return {
            "reason": d.reason if d else None,
            "automation_enabled": c.settings["enabled"],
            "window_blocked": d.window_blocked if d else False,
            "heat_deficit": d.deficit if d else None,
            "requested_trv_setpoint": d.requested_setpoint if d else None,
            "trv_entity": c.trv,
            "reference_sensor": c.reference,
            "sensors": {sid: asdict(st) for sid, st in d.sensors.items()} if d else {},
        }

    async def async_set_temperature(self, **kwargs: Any) -> None:
        if (temp := kwargs.get(ATTR_TEMPERATURE)) is not None:
            await self.controller.async_set_setting("target", float(temp))
        if (mode := kwargs.get("hvac_mode")) is not None:
            await self.async_set_hvac_mode(mode)

    async def async_set_hvac_mode(self, hvac_mode: HVACMode) -> None:
        await self.controller.async_set_setting("hvac_on", hvac_mode == HVACMode.HEAT)

    async def async_set_preset_mode(self, preset_mode: str) -> None:
        await self.controller.async_set_setting("away", preset_mode == PRESET_AWAY)
