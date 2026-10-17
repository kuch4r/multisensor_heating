"""Window blocked / heating demand binary sensors."""

from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .coordinator import RoomController
from .entity import RoomEntity


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback
) -> None:
    c: RoomController = entry.runtime_data
    async_add_entities([WindowBlocked(c), HeatingDemand(c)])


class WindowBlocked(RoomEntity, BinarySensorEntity):
    _attr_name = "Window blocked"
    _attr_device_class = BinarySensorDeviceClass.WINDOW

    def __init__(self, controller: RoomController) -> None:
        super().__init__(controller, "window_blocked")

    @property
    def is_on(self) -> bool:
        d = self.controller.decision
        return bool(d and d.window_blocked)


class HeatingDemand(RoomEntity, BinarySensorEntity):
    _attr_name = "Heating"
    _attr_device_class = BinarySensorDeviceClass.HEAT

    def __init__(self, controller: RoomController) -> None:
        super().__init__(controller, "heating")

    @property
    def is_on(self) -> bool:
        d = self.controller.decision
        return bool(d and d.heating)
