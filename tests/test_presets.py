"""TRVs with Salus presets: Permanent Hold while controlled, Off preset for Off / windows,
and Disabled leaves the TRV untouched."""

from datetime import timedelta

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from .common import HIGH, TRV, WINDOW, eid, set_salus_trv, setup_room


def presets(calls) -> list[str]:
    return [c.data["preset_mode"] for c in calls["preset"]]


async def select_mode(hass: HomeAssistant, entry, mode: str) -> None:
    await hass.services.async_call(
        "select", "select_option",
        {"entity_id": eid(hass, "select", "mode", entry), "option": mode}, blocking=True,
    )


async def test_schedule_trv_switched_to_permanent_hold_preset(hass, calls):
    set_salus_trv(hass, preset="Follow Schedule")
    await setup_room(hass)
    assert presets(calls) == ["Permanent Hold"]
    assert not calls["hvac"], "hvac mode used although the TRV supports presets"


async def test_off_uses_off_preset(hass, calls):
    set_salus_trv(hass)
    entry = await setup_room(hass)
    await select_mode(hass, entry, "off")
    assert presets(calls)[-1] == "Off"
    assert not calls["hvac"]


async def test_off_then_heat_switches_presets(hass, calls):
    set_salus_trv(hass)
    entry = await setup_room(hass)
    await select_mode(hass, entry, "off")
    assert presets(calls) == ["Off"]
    set_salus_trv(hass, preset="Off")  # gateway reports the new preset
    await hass.async_block_till_done()
    await select_mode(hass, entry, "heat")
    assert presets(calls) == ["Off", "Permanent Hold"]
    assert not calls["hvac"]


async def test_window_uses_off_preset_and_restores_hold(hass, calls, freezer):
    set_salus_trv(hass)
    await setup_room(hass)
    hass.states.async_set(WINDOW, "on", {"device_class": "window"})
    await hass.async_block_till_done()
    freezer.tick(timedelta(seconds=125))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()
    assert presets(calls)[-1] == "Off"

    set_salus_trv(hass, preset="Off")
    hass.states.async_set(WINDOW, "off", {"device_class": "window"})
    freezer.tick(timedelta(seconds=2))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()
    assert presets(calls)[-1] == "Permanent Hold"


async def test_temporary_hold_is_corrected_to_permanent_hold(hass, calls):
    set_salus_trv(hass)
    await setup_room(hass)
    hass.states.async_set(TRV, "heat", {**hass.states.get(TRV).attributes,
                                        "preset_mode": "Temporary Hold"})
    await hass.async_block_till_done()
    assert presets(calls)[-1] == "Permanent Hold"


async def test_disabled_leaves_trv_untouched(hass, calls, freezer):
    set_salus_trv(hass)
    entry = await setup_room(hass)
    await select_mode(hass, entry, "disabled")
    n = {k: len(v) for k, v in calls.items()}
    # User changes the TRV and the room gets cold: nothing may be enforced.
    set_salus_trv(hass, preset="Follow Schedule", target=17.0)
    hass.states.async_set(HIGH, "15.0", {"device_class": "temperature"})
    freezer.tick(timedelta(seconds=300))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()
    assert {k: len(v) for k, v in calls.items()} == n


async def test_disabling_sends_nothing(hass, calls):
    set_salus_trv(hass)
    entry = await setup_room(hass)
    n = {k: len(v) for k, v in calls.items()}
    await select_mode(hass, entry, "disabled")
    assert {k: len(v) for k, v in calls.items()} == n
