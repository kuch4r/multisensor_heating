"""Config and options flow for Multi-Sensor Heating."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components.binary_sensor import BinarySensorDeviceClass
from homeassistant.components.sensor import SensorDeviceClass
from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
    CONF_LOCK,
    CONF_MAX_SETPOINT,
    CONF_MIN_BOOST,
    CONF_MIN_SETPOINT,
    CONF_MIN_WRITE_INTERVAL,
    CONF_NAME,
    CONF_REFERENCE,
    CONF_STALE_TIMEOUT,
    CONF_STOP_MARGIN,
    CONF_TEMP_SENSORS,
    CONF_TRV,
    CONF_WINDOW_DELAY,
    CONF_WINDOW_SENSORS,
    DEFAULT_PARAMS,
    DOMAIN,
)


def _num(min_: float, max_: float, step: float, unit: str) -> selector.NumberSelector:
    return selector.NumberSelector(
        selector.NumberSelectorConfig(
            min=min_, max=max_, step=step, unit_of_measurement=unit,
            mode=selector.NumberSelectorMode.BOX,
        )
    )


def _sensors_schema(values: dict[str, Any]) -> vol.Schema:
    return vol.Schema(
        {
            vol.Optional(CONF_LOCK, description={"suggested_value": values.get(CONF_LOCK)}):
                selector.EntitySelector(selector.EntitySelectorConfig(domain="lock")),
            # suggested_value (not default) so clearing a field really removes the sensors.
            vol.Optional(CONF_TEMP_SENSORS,
                         description={"suggested_value": values.get(CONF_TEMP_SENSORS, [])}):
                selector.EntitySelector(
                    selector.EntitySelectorConfig(
                        domain="sensor", device_class=SensorDeviceClass.TEMPERATURE,
                        multiple=True,
                    )
                ),
            vol.Optional(CONF_WINDOW_SENSORS,
                         description={"suggested_value": values.get(CONF_WINDOW_SENSORS, [])}):
                selector.EntitySelector(
                    selector.EntitySelectorConfig(
                        domain="binary_sensor",
                        device_class=[
                            BinarySensorDeviceClass.WINDOW,
                            BinarySensorDeviceClass.DOOR,
                            BinarySensorDeviceClass.OPENING,
                        ],
                        multiple=True,
                    )
                ),
        }
    )


def _reference_schema(trv: str, sensors: list[str], current: str | None) -> vol.Schema:
    options = [selector.SelectOptionDict(value=trv, label=f"TRV ({trv})")] + [
        selector.SelectOptionDict(value=s, label=s) for s in sensors
    ]
    default = current if current in [trv, *sensors] else (sensors[0] if sensors else trv)
    return vol.Schema(
        {
            vol.Required(CONF_REFERENCE, default=default): selector.SelectSelector(
                selector.SelectSelectorConfig(options=options)
            )
        }
    )


def _params_schema(values: dict[str, Any]) -> vol.Schema:
    v = {**DEFAULT_PARAMS, **values}
    return vol.Schema(
        {
            vol.Required(CONF_MIN_BOOST, default=v[CONF_MIN_BOOST]): _num(0.5, 10, 0.5, "°C"),
            vol.Required(CONF_STOP_MARGIN, default=v[CONF_STOP_MARGIN]): _num(0.5, 10, 0.5, "°C"),
            vol.Required(CONF_WINDOW_DELAY, default=v[CONF_WINDOW_DELAY]): _num(0, 3600, 10, "s"),
            vol.Required(CONF_MIN_WRITE_INTERVAL, default=v[CONF_MIN_WRITE_INTERVAL]):
                _num(30, 3600, 30, "s"),
            vol.Required(CONF_MIN_SETPOINT, default=v[CONF_MIN_SETPOINT]): _num(5, 20, 0.5, "°C"),
            vol.Required(CONF_MAX_SETPOINT, default=v[CONF_MAX_SETPOINT]): _num(20, 35, 0.5, "°C"),
            vol.Required(CONF_STALE_TIMEOUT, default=v[CONF_STALE_TIMEOUT]):
                _num(5, 1440, 5, "min"),
        }
    )


class _SensorsStepsMixin:
    """Shared sensors -> reference -> params steps."""

    _values: dict[str, Any]
    _trv: str

    async def async_step_sensors(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            self._values.pop(CONF_LOCK, None)
            self._values.update({CONF_TEMP_SENSORS: [], CONF_WINDOW_SENSORS: [], **user_input})
            return await self.async_step_reference()
        return self.async_show_form(step_id="sensors", data_schema=_sensors_schema(self._values))

    async def async_step_reference(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            self._values.update(user_input)
            return await self.async_step_params()
        return self.async_show_form(
            step_id="reference",
            data_schema=_reference_schema(
                self._trv, self._values.get(CONF_TEMP_SENSORS, []),
                self._values.get(CONF_REFERENCE),
            ),
        )


class MultiSensorHeatingConfigFlow(_SensorsStepsMixin, ConfigFlow, domain=DOMAIN):
    """Create one config entry per room."""

    VERSION = 1

    def __init__(self) -> None:
        self._values = {}
        self._data: dict[str, Any] = {}
        self._trv = ""

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            await self.async_set_unique_id(user_input[CONF_TRV])
            self._abort_if_unique_id_configured()
            self._data = user_input
            self._trv = user_input[CONF_TRV]
            return await self.async_step_sensors()
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_NAME): selector.TextSelector(),
                    vol.Required(CONF_TRV): selector.EntitySelector(
                        selector.EntitySelectorConfig(domain="climate")
                    ),
                }
            ),
        )

    async def async_step_params(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            return self.async_create_entry(
                title=self._data[CONF_NAME], data=self._data,
                options={**self._values, **user_input},
            )
        return self.async_show_form(step_id="params", data_schema=_params_schema({}))

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return MultiSensorHeatingOptionsFlow()


class MultiSensorHeatingOptionsFlow(_SensorsStepsMixin, OptionsFlow):
    """Edit sensors, reference and parameters of a room."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None):
        self._values = dict(self.config_entry.options)
        self._trv = self.config_entry.data[CONF_TRV]
        return await self.async_step_sensors()

    async def async_step_params(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            return self.async_create_entry(data={**self._values, **user_input})
        return self.async_show_form(step_id="params", data_schema=_params_schema(self._values))
