import { LitElement, html, nothing } from "lit";
import { fireEvent, getRooms } from "./api";
import type { HomeAssistant, RoomInfo } from "./types";

const LABELS: Record<string, string> = {
  title: "Title",
  tap_action: "Tap on a room",
  show_vacation_toggle: "Show vacation toggle for all rooms",
  entry_id: "Room",
  show_chart: "Show history chart",
  hours: "Default chart range",
};

abstract class BaseEditor extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _rooms: { state: true },
  };

  declare hass: HomeAssistant;
  declare _config: Record<string, unknown>;
  declare _rooms?: RoomInfo[];

  setConfig(config: Record<string, unknown>): void {
    this._config = config;
  }

  protected updated(): void {
    if (this.hass && !this._rooms) {
      this._rooms = [];
      getRooms(this.hass).then((rooms) => (this._rooms = rooms)).catch(() => undefined);
    }
  }

  protected abstract schema(): unknown[];

  protected render() {
    if (!this.hass || !this._config) return nothing;
    return html`<ha-form
      .hass=${this.hass}
      .data=${this._config}
      .schema=${this.schema()}
      .computeLabel=${(s: { name: string }) => LABELS[s.name] ?? s.name}
      @value-changed=${(ev: CustomEvent) => fireEvent(this, "config-changed", { config: ev.detail.value })}
    ></ha-form>`;
  }
}

export class OverviewCardEditor extends BaseEditor {
  protected schema(): unknown[] {
    return [
      { name: "title", selector: { text: {} } },
      {
        name: "tap_action",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "more-info", label: "Open room thermostat dialog" },
              { value: "navigate", label: "Navigate to room view (strategy dashboard)" },
              { value: "none", label: "Nothing" },
            ],
          },
        },
      },
      { name: "show_vacation_toggle", default: true, selector: { boolean: {} } },
    ];
  }
}

export class RoomCardEditor extends BaseEditor {
  protected schema(): unknown[] {
    return [
      {
        name: "entry_id",
        selector: {
          select: { mode: "dropdown", options: (this._rooms ?? []).map((r) => ({ value: r.entry_id, label: r.name })) },
        },
      },
      { name: "show_chart", selector: { boolean: {} } },
      {
        name: "hours",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: 24, label: "24 hours" },
              { value: 72, label: "3 days" },
              { value: 168, label: "7 days" },
            ],
          },
        },
      },
    ];
  }
}
