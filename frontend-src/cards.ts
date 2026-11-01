import { OverviewCardEditor, RoomCardEditor } from "./editors";
import { HeatingChart } from "./history-chart";
import { OverviewCard } from "./overview-card";
import { RoomCard } from "./room-card";

const define = (name: string, ctor: CustomElementConstructor) => {
  if (!customElements.get(name)) customElements.define(name, ctor);
};

define("multisensor-heating-chart", HeatingChart);
define("multisensor-heating-overview-card", OverviewCard);
define("multisensor-heating-room-card", RoomCard);
define("multisensor-heating-overview-card-editor", OverviewCardEditor);
define("multisensor-heating-room-card-editor", RoomCardEditor);

console.info("%c MULTISENSOR-HEATING %c loaded ", "background:#e8590c;color:#fff", "");
