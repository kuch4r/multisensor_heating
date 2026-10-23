"""Shared fixtures."""

import pytest
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers.entity_component import DATA_INSTANCES
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_mock_service

from .common import TRV, setup_room


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Enable loading custom_components in every test."""
    return


@pytest.fixture
async def calls(hass: HomeAssistant):
    """Mock TRV/lock services. Real domains are set up first so the mocks override them."""
    for domain in ("climate", "lock"):
        assert await async_setup_component(hass, domain, {})
    preset_calls: list[ServiceCall] = []

    async def set_preset_mode(call: ServiceCall) -> None:
        """Record calls for the (fake) TRV; forward others to the real room climate entity."""
        entity_ids = call.data["entity_id"]
        entity_ids = [entity_ids] if isinstance(entity_ids, str) else entity_ids
        for entity_id in entity_ids:
            if entity_id == TRV:
                preset_calls.append(call)
            else:
                entity = hass.data[DATA_INSTANCES]["climate"].get_entity(entity_id)
                await entity.async_set_preset_mode(call.data["preset_mode"])

    hass.services.async_register("climate", "set_preset_mode", set_preset_mode)
    return {
        "temp": async_mock_service(hass, "climate", "set_temperature"),
        "hvac": async_mock_service(hass, "climate", "set_hvac_mode"),
        "preset": preset_calls,
        "lock": async_mock_service(hass, "lock", "lock"),
        "unlock": async_mock_service(hass, "lock", "unlock"),
    }


@pytest.fixture
async def entry(hass: HomeAssistant, calls) -> MockConfigEntry:
    return await setup_room(hass)
