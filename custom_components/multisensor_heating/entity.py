"""Base entity for Multi-Sensor Heating."""

from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import Entity

from .const import DOMAIN
from .coordinator import RoomController


class RoomEntity(Entity):
    """Entity bound to a RoomController; refreshed after every evaluation."""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, controller: RoomController, key: str) -> None:
        self.controller = controller
        self._attr_unique_id = f"{controller.entry.entry_id}_{key}"
        controller.unique_ids.add(self._attr_unique_id)
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, controller.entry.entry_id)},
            name=controller.name,
            manufacturer="Multi-Sensor Heating",
            model="Room controller",
        )

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.controller.async_add_listener(self.async_write_ha_state))
