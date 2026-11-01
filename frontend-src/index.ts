import { HeatingDashboardStrategy } from "./strategy";

// Home Assistant gives a dashboard strategy only 5 s to be registered. Keep this entry
// tiny and define the strategy first; the cards (Lit, charts) load in a separate chunk
// and Home Assistant re-renders custom cards once they are defined.
if (!customElements.get("ll-strategy-dashboard-multisensor-heating")) {
  customElements.define("ll-strategy-dashboard-multisensor-heating", HeatingDashboardStrategy);
}

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

import("./cards").catch((err) => console.error("Multi-Sensor Heating: failed to load cards", err));
