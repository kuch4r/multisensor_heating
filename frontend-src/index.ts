import { OverviewCardEditor, RoomCardEditor } from "./editors";
import { HeatingChart } from "./history-chart";
import { OverviewCard } from "./overview-card";
import { RoomCard } from "./room-card";
import { HeatingDashboardStrategy } from "./strategy";

const define = (name: string, ctor: CustomElementConstructor) => {
  if (!customElements.get(name)) customElements.define(name, ctor);
};

define("multisensor-heating-chart", HeatingChart);
define("multisensor-heating-overview-card", OverviewCard);
define("multisensor-heating-room-card", RoomCard);
define("multisensor-heating-overview-card-editor", OverviewCardEditor);
define("multisensor-heating-room-card-editor", RoomCardEditor);
define("ll-strategy-dashboard-multisensor-heating", HeatingDashboardStrategy);

const w = window as unknown as { customCards?: Array<Record<string, unknown>> };
w.customCards = w.customCards ?? [];
w.customCards.push(
  {
    type: "multisensor-heating-overview-card",
    name: "Multi-Sensor Heating: Overview",
    description: "Status tile for every room controlled by Multi-Sensor Heating.",
    preview: false,
  },
  {
    type: "multisensor-heating-room-card",
    name: "Multi-Sensor Heating: Room",
    description: "Room status, sensor offsets/ranges with suggestions, and history chart.",
    preview: false,
  },
);

console.info("%c MULTISENSOR-HEATING %c loaded ", "background:#e8590c;color:#fff", "");
