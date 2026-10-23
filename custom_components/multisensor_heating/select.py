"""Room mode selector: heat / vacation / off / disabled."""

from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import MODES
from .coordinator import RoomController
from .entity import RoomEntity


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback
) -> None:
    async_add_entities([RoomMode(entry.runtime_data)])


class RoomMode(RoomEntity, SelectEntity):
    """Heat = controlled (permanent hold), Vacation = fixed temperature,
    Off = TRV switched off, Disabled = TRV follows its own Salus schedule."""

    _attr_options = MODES
    _attr_translation_key = "mode"
    _attr_icon = "mdi:thermostat-cog"

    def __init__(self, controller: RoomController) -> None:
        super().__init__(controller, "mode")

    @property
    def current_option(self) -> str:
        return self.controller.mode

    async def async_select_option(self, option: str) -> None:
        await self.controller.async_set_mode(option)
