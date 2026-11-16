import type { QuickAccessShortcut, QuickAccessShortcutPayload } from "@/add-os/modules/cms/types/quick-access-shortcut"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<QuickAccessShortcut, QuickAccessShortcutPayload, QuickAccessShortcutPayload>(
	"/api/v1/admin/quick-access-shortcuts"
)

export const listQuickAccessShortcuts = api.list
export const getQuickAccessShortcut = api.getById
export const createQuickAccessShortcut = api.create
export const updateQuickAccessShortcut = api.update
export const removeQuickAccessShortcut = api.remove
