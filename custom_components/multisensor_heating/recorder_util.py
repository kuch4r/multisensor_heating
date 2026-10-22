"""Helpers for reading recorder history."""

from __future__ import annotations

from datetime import datetime

from homeassistant.components.recorder import get_instance, history
from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import HomeAssistant, State


def state_temperature(state: State | None) -> float | None:
    """Temperature of a sensor, or current_temperature of a climate entity."""
    if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
        return None
    raw = (
        state.attributes.get("current_temperature")
        # Recorder history returns LazyState objects, which have no `.domain`.
        if state.entity_id.startswith("climate.")
        else state.state
    )
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def state_number(state: State, attribute: str | None = None) -> float | None:
    """Numeric state or attribute value."""
    if state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
        return None
    try:
        return float(state.attributes.get(attribute) if attribute else state.state)
    except (TypeError, ValueError):
        return None


async def async_get_history(
    hass: HomeAssistant, entity_ids: list[str], start: datetime
) -> dict[str, list[State]]:
    """Full (non-minimal) state history incl. attributes since ``start``."""
    if not entity_ids:
        return {}
    return await get_instance(hass).async_add_executor_job(
        lambda: history.get_significant_states(
            hass,
            start,
            None,
            entity_ids,
            include_start_time_state=True,
            significant_changes_only=False,
            minimal_response=False,
            no_attributes=False,
        )
    )
