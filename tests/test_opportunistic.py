"""F-21: opportunistic heating across rooms sharing one heat source."""

from datetime import timedelta

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_fire_time_changed

from custom_components.multisensor_heating.const import DEFAULT_PARAMS, DOMAIN

from .common import HIGH, eid, set_trv, setup_room

BED_TRV = "climate.bed_trv"
BED_HIGH = "sensor.bed_high"


async def setup_bedroom(hass: HomeAssistant) -> MockConfigEntry:
    """Second room whose reference (20.9) is below target 21 but not cold."""
    hass.states.async_set(BED_TRV, "heat", {"current_temperature": 21.0, "temperature": 19.0})
    hass.states.async_set(BED_HIGH, "20.9", {"device_class": "temperature"})
    entry = MockConfigEntry(
        domain=DOMAIN, entry_id="bed_entry", title="Bedroom", unique_id=BED_TRV,
        data={"name": "Bedroom", "trv_entity": BED_TRV},
        options={**DEFAULT_PARAMS, "temp_sensors": [BED_HIGH], "window_sensors": [],
                 "reference_sensor": BED_HIGH},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def reason(hass: HomeAssistant, entry) -> str:
    return hass.states.get(eid(hass, "sensor", "control_reason", entry)).state


async def settle(hass: HomeAssistant, freezer) -> None:
    freezer.tick(timedelta(seconds=2))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()


async def test_idle_room_heats_only_while_other_room_calls(hass, freezer, calls):
    bed = await setup_bedroom(hass)
    assert reason(hass, bed) == "idle"

    living = await setup_room(hass)  # cold: primary demand
    await hass.async_block_till_done()
    assert reason(hass, living) == "heating"
    assert reason(hass, bed) == "opportunistic"
    assert hass.states.get(eid(hass, "binary_sensor", "heating", bed)).state == "on"
    bed_writes = [c.data["temperature"] for c in calls["temp"] if c.data["entity_id"] == BED_TRV]
    assert bed_writes[-1] == 22.0  # normal curve: TRV 21 + min boost 1

    # Living room reaches its targets -> its demand ends -> bedroom stops too.
    set_trv(hass, current=21.3, target=23.0)
    hass.states.async_set(HIGH, "21.5", {"device_class": "temperature"})
    await settle(hass, freezer)
    assert reason(hass, living) == "idle"
    assert reason(hass, bed) == "idle"


async def test_unloading_primary_room_stops_opportunistic(hass, calls):
    living = await setup_room(hass)
    bed = await setup_bedroom(hass)
    assert reason(hass, bed) == "opportunistic"
    assert await hass.config_entries.async_unload(living.entry_id)
    await hass.async_block_till_done()
    assert reason(hass, bed) == "idle"


async def test_opportunistic_room_does_not_trigger_others(hass, calls):
    bed = await setup_bedroom(hass)
    assert bed.runtime_data.has_primary_demand is False
    living = await setup_room(hass)
    assert reason(hass, bed) == "opportunistic"
    assert living.runtime_data.has_primary_demand
    assert not bed.runtime_data.has_primary_demand
