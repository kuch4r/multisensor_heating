"""Per-sensor offset/min/max and room tuning numbers."""

from __future__ import annotations

from typing import Any

from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory, UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import DOMAIN
from .coordinator import RoomController
from .entity import RoomEntity

SENSOR_NUMBERS = {
    # key: (label, min, max, step)
    "offset": ("offset", -10.0, 10.0, 0.1),
    "min": ("min", 5.0, 30.0, 0.5),
    "max": ("max", 10.0, 35.0, 0.5),
}
ROOM_NUMBERS = {
    "gain": ("Gain", 0.5, 10.0, 0.1, None),
    "hysteresis": ("Hysteresis", 0.1, 3.0, 0.1, UnitOfTemperature.CELSIUS),
    "vacation_temp": ("Vacation temperature", 5.0, 20.0, 0.5, UnitOfTemperature.CELSIUS),
}


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback
) -> None:
    c: RoomController = entry.runtime_data
    entities: list[NumberEntity] = [
        SensorNumber(c, sid, key) for sid in c.sensor_ids for key in SENSOR_NUMBERS
    ]
    entities += [RoomNumber(c, key) for key in ROOM_NUMBERS]
    async_add_entities(entities)


class SensorNumber(RoomEntity, NumberEntity):
    """Offset / safety min / safety max of one sensor."""

    _attr_mode = NumberMode.BOX
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, controller: RoomController, sensor_id: str, key: str) -> None:
        super().__init__(controller, f"{sensor_id}_{key}")
        label, self._attr_native_min_value, self._attr_native_max_value, \
            self._attr_native_step = SENSOR_NUMBERS[key]
        self.sensor_id, self.key = sensor_id, key
        self._attr_name = f"{controller.sensor_name(sensor_id)} {label}"

    @property
    def native_value(self) -> float:
        return float(self.controller.sensor_settings[self.sensor_id][self.key])

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        attrs: dict[str, Any] = {"sensor_entity": self.sensor_id}
        if self.key == "offset":
            attrs.update(self.controller.offset_summary(self.sensor_id).as_dict())
            attrs["is_reference"] = self.sensor_id == self.controller.reference
        return attrs

    async def async_set_native_value(self, value: float) -> None:
        current = self.controller.sensor_settings[self.sensor_id]
        low = value if self.key == "min" else current["min"]
        high = value if self.key == "max" else current["max"]
        if low > high:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="invalid_range",
                translation_placeholders={"min": f"{low:g}", "max": f"{high:g}"},
            )
        await self.controller.async_set_sensor_setting(self.sensor_id, self.key, value)


class RoomNumber(RoomEntity, NumberEntity):
    """Room-level tuning value."""

    _attr_mode = NumberMode.BOX
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, controller: RoomController, key: str) -> None:
        super().__init__(controller, key)
        (self._attr_name, self._attr_native_min_value, self._attr_native_max_value,
         self._attr_native_step, self._attr_native_unit_of_measurement) = ROOM_NUMBERS[key]
        self.key = key

    @property
    def native_value(self) -> float:
        return float(self.controller.settings[self.key])

    async def async_set_native_value(self, value: float) -> None:
        await self.controller.async_set_setting(self.key, value)
