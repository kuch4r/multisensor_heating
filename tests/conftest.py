"""Shared fixtures."""

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_mock_service

from .common import setup_room


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Enable loading custom_components in every test."""
    return


@pytest.fixture
async def calls(hass: HomeAssistant):
    """Mock TRV/lock services. Real domains are set up first so the mocks override them."""
    for domain in ("climate", "lock"):
        assert await async_setup_component(hass, domain, {})
    return {
        "temp": async_mock_service(hass, "climate", "set_temperature"),
        "hvac": async_mock_service(hass, "climate", "set_hvac_mode"),
        "lock": async_mock_service(hass, "lock", "lock"),
        "unlock": async_mock_service(hass, "lock", "unlock"),
    }


@pytest.fixture
async def entry(hass: HomeAssistant, calls) -> MockConfigEntry:
    return await setup_room(hass)
