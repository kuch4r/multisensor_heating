"""Kill switch and TRV child lock switch."""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .coordinator import RoomController
from .entity import RoomEntity


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback
) -> None:
    c: RoomController = entry.runtime_data
    entities = [SettingSwitch(c, "enabled", "Automation", "mdi:robot")]
    if c.lock_entity:
        entities.append(SettingSwitch(c, "lock", "TRV lock", "mdi:lock"))
    async_add_entities(entities)


class SettingSwitch(RoomEntity, SwitchEntity):
    """Boolean room setting."""

    def __init__(self, controller: RoomController, key: str, name: str, icon: str) -> None:
        super().__init__(controller, key)
        self.key = key
        self._attr_name = name
        self._attr_icon = icon

    @property
    def is_on(self) -> bool:
        return bool(self.controller.settings[self.key])

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self.controller.async_set_setting(self.key, True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self.controller.async_set_setting(self.key, False)
