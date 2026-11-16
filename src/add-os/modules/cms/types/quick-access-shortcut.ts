// src/add-os/modules/cms/types/quick-access-shortcut.ts

import type { Bilingual } from "@/add-os/components/resource/field-types"

/** One quick-access tile on the member app's home (GET member/home → quick_access). */
export interface QuickAccessShortcut {
	id: number
	/** A stable id the app can recognise the tile by, e.g. `cafe`. */
	key: string
	label: Bilingual
	/** The tile's icon, an uploaded image; null until one is set. */
	icon_url: string | null
	/** One of the member app's own static routes, e.g. `/cafe-menu`. */
	route: string
	order: number
	is_active: boolean
	created_at: string
}

export interface QuickAccessShortcutPayload {
	key: string
	label: Bilingual
	icon_url: string
	route: string
	order: number | null
	is_active: boolean
}
