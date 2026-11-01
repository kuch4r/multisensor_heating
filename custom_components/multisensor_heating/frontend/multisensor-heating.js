import { _ as e, l as t } from "./multisensor-heating-api-D21jmt_P.js";
//#region frontend-src/strategy.ts
var n = class extends HTMLElement {
	static async generate(n, r) {
		let i = await t(r, !0);
		return {
			title: n.title ?? "Heating",
			views: [{
				title: "Overview",
				path: "overview",
				icon: "mdi:radiator",
				type: "panel",
				cards: [{
					type: "custom:multisensor-heating-overview-card",
					title: n.title ?? "Heating",
					tap_action: "navigate"
				}]
			}, ...i.map((t) => ({
				title: t.name,
				path: e(t.name),
				subview: !0,
				back_path: "overview",
				type: "panel",
				cards: [{
					type: "custom:multisensor-heating-room-card",
					entry_id: t.entry_id
				}]
			}))]
		};
	}
};
//#endregion
//#region frontend-src/index.ts
customElements.get("ll-strategy-dashboard-multisensor-heating") || customElements.define("ll-strategy-dashboard-multisensor-heating", n);
var r = window;
r.customCards = r.customCards ?? [], r.customCards.push({
	type: "multisensor-heating-overview-card",
	name: "Multi-Sensor Heating: Overview",
	description: "Status tile for every room controlled by Multi-Sensor Heating.",
	preview: !1
}, {
	type: "multisensor-heating-room-card",
	name: "Multi-Sensor Heating: Room",
	description: "Room status, sensor offsets/ranges with suggestions, and history chart.",
	preview: !1
}), import("./multisensor-heating-cards-BcSKauVM.js").catch((e) => console.error("Multi-Sensor Heating: failed to load cards", e));
//#endregion
