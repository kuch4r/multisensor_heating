"""Diagnostic sensors and per-sensor effective targets (recorded for charts)."""

from __future__ import annotations

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import REASONS
from .coordinator import RoomController
from .entity import RoomEntity


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback
) -> None:
    c: RoomController = entry.runtime_data
    entities: list[SensorEntity] = [EffectiveTarget(c, sid) for sid in c.sensor_ids]
    entities += [
        TemperatureValue(c, "heat_deficit", "Heat deficit"),
        TemperatureValue(c, "requested_setpoint", "Requested TRV setpoint"),
        ControlReason(c),
    ]
    async_add_entities(entities)


class _Temperature(RoomEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_suggested_display_precision = 1


class EffectiveTarget(_Temperature):
    """Room target + offset, clamped into the sensor's safety range."""

    def __init__(self, controller: RoomController, sensor_id: str) -> None:
        super().__init__(controller, f"{sensor_id}_effective_target")
        self.sensor_id = sensor_id
        self._attr_name = f"{controller.sensor_name(sensor_id)} effective target"
        self._attr_extra_state_attributes = {"sensor_entity": sensor_id}

    @property
    def native_value(self) -> float | None:
        d = self.controller.decision
        return d.sensors[self.sensor_id].effective_target if d else None


class TemperatureValue(_Temperature):
    def __init__(self, controller: RoomController, key: str, name: str) -> None:
        super().__init__(controller, key)
        self._attr_name = name
        self.key = key

    @property
    def native_value(self) -> float | None:
        d = self.controller.decision
        if d is None:
            return None
        return d.deficit if self.key == "heat_deficit" else d.requested_setpoint


class ControlReason(RoomEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = REASONS
    _attr_translation_key = "control_reason"

    def __init__(self, controller: RoomController) -> None:
        super().__init__(controller, "control_reason")

    @property
    def native_value(self) -> str | None:
        d = self.controller.decision
        return d.reason if d else None
