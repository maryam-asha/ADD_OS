import type { Tone } from "@/add-os/modules/dashboard/config/tones"

/** One row of a panel's "needs attention" list. */
export interface AttentionItem {
	key: string
	label: string
	count: number
	/** The screen that lists these; none when the dashboard has no such screen yet. */
	to?: string
}

/** One tile of a statistics card: an icon, a label and a count. */
export interface StatusTile {
	key: string
	label: string
	count: number
	icon: string
	tone: Tone
	/** The screen that lists what the tile counts. */
	to?: string
}
