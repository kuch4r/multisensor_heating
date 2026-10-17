"""Unit tests for the pure control algorithm."""

from dataclasses import replace

from custom_components.multisensor_heating.controller import (
    ControlInput,
    ControlState,
    RoomSettings,
    SensorInput,
    TrvState,
    decide,
)

SETTINGS = RoomSettings(target=21.0)
TRV = TrvState(available=True, hvac_mode="heat", current_temperature=19.0, target_temperature=19.0)


def run(sensors, *, settings=SETTINGS, trv=TRV, state=None, now=1000.0, window_since=None):
    return decide(
        ControlInput(
            now=now,
            settings=settings,
            trv=trv,
            sensors=sensors,
            window_open_since=window_since,
            state=state or ControlState(),
        )
    )


def test_cold_sensor_heats_proportionally():
    d = run([SensorInput("trv", 19.0, offset=-2.0), SensorInput("high", 20.0)])
    assert d.reason == "heating"
    assert d.deficit == 1.0
    # trv 19 + gain 2 * deficit 1 = 21
    assert d.set_temperature == 21.0


def test_bigger_gap_bigger_setpoint():
    small = run([SensorInput("high", 20.5)]).set_temperature
    big = run([SensorInput("high", 18.0)]).set_temperature
    assert big > small


def test_min_boost_and_rounding_up():
    d = run([SensorInput("high", 20.7)])
    assert d.reason == "heating"
    # deficit 0.3 * 2 = 0.6 < min boost 1.0 -> 19 + 1 = 20
    assert d.set_temperature == 20.0
    d = run([SensorInput("high", 20.0)], settings=replace(SETTINGS, gain=1.3))
    # 19 + 1.3 = 20.3 -> rounded up to 20.5
    assert d.set_temperature == 20.5


def test_hot_wins_over_cold():
    d = run([SensorInput("trv", 19.0), SensorInput("high", 21.5)])
    assert d.reason == "idle"
    assert not d.heating
    assert d.set_temperature == 17.0
    assert d.sensors["high"].status == "hot"
    assert d.sensors["trv"].status == "cold"


def test_dead_band_keeps_previous_state():
    sensors = [SensorInput("high", 21.0)]
    heating = ControlState(heating=True, reason="heating", last_write=900.0)
    assert run(sensors, state=heating).heating
    idle = ControlState(heating=False, reason="idle")
    assert not run(sensors, state=idle).heating


def test_safety_max_overrides_offset():
    # Offset says target 23, but absolute max 21.5 is reached -> stop.
    d = run([SensorInput("high", 21.6, offset=2.0, max_temp=21.5)])
    assert d.reason == "idle"


def test_safety_min_overrides_offset():
    # Offset says target 18, but absolute min 20 not reached -> heat.
    d = run([SensorInput("high", 19.5, offset=-3.0, min_temp=20.0)])
    assert d.reason == "heating"
    assert d.sensors["high"].effective_target == 20.25
    assert d.deficit == 0.75


def test_setpoint_clamped():
    d = run([SensorInput("high", 10.0)])
    assert d.set_temperature == 30.0


def test_idle_skips_write_when_trv_already_closed():
    trv = replace(TRV, current_temperature=21.0, target_temperature=18.0)
    d = run([SensorInput("high", 22.0)], trv=trv)
    assert d.reason == "idle"
    assert d.set_temperature is None


def test_rate_limit_and_state_change():
    sensors = [SensorInput("high", 19.0)]
    state = ControlState(heating=True, reason="heating", last_write=950.0)
    trv = replace(TRV, target_temperature=25.0)
    assert run(sensors, trv=trv, state=state).set_temperature is None
    assert run(sensors, trv=trv, state=state, now=1200.0).set_temperature == 23.0
    # Flip to idle -> immediate write despite rate limit.
    d = run([SensorInput("high", 22.0)], trv=trv, state=state)
    assert d.set_temperature == 17.0


def test_heating_tolerance_avoids_small_rewrites():
    state = ControlState(heating=True, reason="heating", last_write=0.0)
    trv = replace(TRV, target_temperature=20.5)
    d = run([SensorInput("high", 20.0)], trv=trv, state=state)
    assert d.requested_setpoint == 20.5
    assert d.set_temperature is None


def test_window_open_after_delay_turns_trv_off():
    sensors = [SensorInput("high", 19.0)]
    assert run(sensors, window_since=950.0).reason == "heating"
    d = run(sensors, window_since=880.0)
    assert d.reason == "window_open"
    assert d.window_blocked
    assert d.set_hvac_mode == "off"


def test_window_closed_restores_heat():
    trv = replace(TRV, hvac_mode="off")
    state = ControlState(reason="window_open", last_hvac_request="off", last_hvac_write=900.0)
    d = run([SensorInput("high", 19.0)], trv=trv, state=state)
    assert d.set_hvac_mode == "heat"
    assert d.reason == "heating"


def test_hvac_request_not_repeated_while_gateway_lags():
    state = ControlState(reason="window_open", last_hvac_request="off", last_hvac_write=980.0)
    d = run([SensorInput("high", 19.0)], window_since=0.0, state=state)
    assert d.set_hvac_mode is None
    d = run([SensorInput("high", 19.0)], window_since=0.0, state=state, now=1100.0)
    assert d.set_hvac_mode == "off"


def test_auto_mode_switched_to_heat():
    d = run([SensorInput("high", 19.0)], trv=replace(TRV, hvac_mode="auto"))
    assert d.set_hvac_mode == "heat"


def test_vacation_holds_fixed_temperature_ignoring_sensors():
    d = run([SensorInput("high", 15.0)], settings=replace(SETTINGS, away=True))
    assert d.reason == "vacation"
    assert d.set_temperature == 10.0


def test_room_off():
    d = run([SensorInput("high", 15.0)], settings=replace(SETTINGS, hvac_on=False))
    assert d.reason == "room_off"
    assert d.set_hvac_mode == "off"


def test_disabled_does_nothing():
    d = run([SensorInput("high", 15.0)], settings=replace(SETTINGS, enabled=False),
            trv=replace(TRV, hvac_mode="auto"))
    assert d.reason == "disabled"
    assert d.set_hvac_mode is None
    assert d.set_temperature is None


def test_unavailable_sensors_ignored_and_fail_safe():
    d = run([SensorInput("high", None), SensorInput("trv", 19.0)])
    assert d.reason == "heating"
    assert d.sensors["high"].status == "unavailable"
    d = run([SensorInput("high", None)])
    assert d.reason == "no_sensors"
    assert d.set_temperature == 21.0


def test_trv_unavailable():
    d = run([SensorInput("high", 15.0)], trv=TrvState(available=False))
    assert d.reason == "trv_unavailable"
    assert d.set_temperature is None
