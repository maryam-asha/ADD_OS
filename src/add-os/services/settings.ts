import type { SettingItem } from "@/add-os/modules/settings/types/setting"
import { get, patch } from "./api"
import { rowsOf } from "./pagination"

const BASE = "/api/v1/admin/settings"

export async function listSettings(): Promise<SettingItem[]> {
	const res = await get<{ data: SettingItem[] }>(BASE)
	return rowsOf<SettingItem>(res.data)
}

export async function updateSetting(key: string, value: unknown): Promise<{ message: string }> {
	return patch<{ message: string }>(`${BASE}/${encodeURIComponent(key)}`, { value })
}
