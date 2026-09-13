export type SettingType = "string" | "integer" | "float" | "boolean" | "json"

export interface SettingItem {
	key: string
	type: SettingType
	value: unknown
	updated_at?: string | null
}
