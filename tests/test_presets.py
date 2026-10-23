"""TRVs with Salus presets: always Permanent Hold while controlled; Off / windows hold the
minimum setpoint (the TRV3RF ignores the "Off" preset, it only knocks it out of Permanent
Hold); Disabled leaves the TRV untouched."""

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


def setpoints(calls) -> list[float]:
    return [c.data["temperature"] for c in calls["temp"]]


async def test_off_holds_minimum_setpoint_in_permanent_hold(hass, calls):
    set_salus_trv(hass)
    entry = await setup_room(hass)
    await select_mode(hass, entry, "off")
    assert setpoints(calls)[-1] == 5.0
    assert "Off" not in presets(calls)
    assert not calls["hvac"]


async def test_off_then_heat_keeps_permanent_hold(hass, calls):
    set_salus_trv(hass)
    entry = await setup_room(hass)
    await select_mode(hass, entry, "off")
    set_salus_trv(hass, target=5.0)  # gateway reports the new setpoint
    await hass.async_block_till_done()
    await select_mode(hass, entry, "heat")
    assert setpoints(calls)[-1] > 5.0
    assert presets(calls) == []
    assert not calls["hvac"]


async def test_window_holds_minimum_setpoint_and_resumes(hass, calls, freezer):
    set_salus_trv(hass)
    await setup_room(hass)
    hass.states.async_set(WINDOW, "on", {"device_class": "window"})
    await hass.async_block_till_done()
    freezer.tick(timedelta(seconds=125))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()
    assert setpoints(calls)[-1] == 5.0
    assert "Off" not in presets(calls)

    set_salus_trv(hass, target=5.0)
    hass.states.async_set(WINDOW, "off", {"device_class": "window"})
    freezer.tick(timedelta(seconds=2))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()
    assert setpoints(calls)[-1] > 5.0
    assert not calls["hvac"]


async def test_off_preset_left_by_old_versions_is_corrected(hass, calls):
    """HoldType 7 ("Off" preset) is not off on a TRV3RF; switch it back to Permanent Hold."""
    set_salus_trv(hass, preset="Off")
    entry = await setup_room(hass)
    assert presets(calls) == ["Permanent Hold"]
    await select_mode(hass, entry, "off")
    assert presets(calls) == ["Permanent Hold"]


async def test_off_room_does_not_fight_permanent_hold(hass, calls, freezer):
    """The reported bug: an Off room re-sent the Off preset whenever the TRV was in hold."""
    set_salus_trv(hass)
    entry = await setup_room(hass)
    await select_mode(hass, entry, "off")
    set_salus_trv(hass, target=5.0)
    freezer.tick(timedelta(seconds=300))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()
    assert presets(calls) == []


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
