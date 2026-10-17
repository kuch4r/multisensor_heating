import { getRooms, slug } from "./api";
import type { HomeAssistant } from "./types";

/**
 * Dashboard strategy: `strategy: { type: custom:multisensor-heating }`.
 * Generates an overview view plus one (sub)view per room.
 */
export class HeatingDashboardStrategy extends HTMLElement {
  static async generate(config: { title?: string }, hass: HomeAssistant) {
    const rooms = await getRooms(hass, true);
    return {
      title: config.title ?? "Heating",
      views: [
        {
          title: "Overview",
          path: "overview",
          icon: "mdi:radiator",
          type: "panel",
          cards: [{ type: "custom:multisensor-heating-overview-card", tap_action: "navigate" }],
        },
        ...rooms.map((room) => ({
          title: room.name,
          path: slug(room.name),
          subview: true,
          back_path: "overview",
          type: "panel",
          cards: [{ type: "custom:multisensor-heating-room-card", entry_id: room.entry_id }],
        })),
      ],
    };
  }
}
