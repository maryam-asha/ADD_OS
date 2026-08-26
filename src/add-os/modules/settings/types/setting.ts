// src/add-os/modules/settings/types/setting.ts

/**
 * The global key/value config store — one row per key, seeded by ADDCore's
 * `SettingSeeder` and only ever *updated* from this dashboard.
 *
 * Confirmed from the collection pinned 2026-08-25 (`sha256 86d330d9…`), whose
 * `Admin (Dashboard) > Settings` folder carries exactly two requests and this
 * description: "Global key/value config. List is available to admin and
 * operations; update is admin-only." That second half is the source for
 * `canUpdateSettings()` in `config/permissions.ts`, and it is corroborated by
 * `ADDCore/routes/api/v1/admin.php`, where `GET settings` sits in the outer
 * `role:admin|operations` group and `PATCH settings/{key}` sits inside the
 * narrower `role:admin` one.
 *
 * THERE IS NO CREATE AND NO DELETE, and that is the shape of the resource
 * rather than a gap in this layer: `SettingController` implements `index` and
 * `update` only, because the key set is fixed by the seeder. A UI for adding a
 * key would be a control the backend has no route for — see
 * `views/SettingsPage.vue`.
 *
 * `update` only ever changes `value`. The `key`, `type`, and scope of a row are
 * not editable through any endpoint.
 */

/**
 * Mirrors ADDCore's `SettingValueType` enum exactly — the five cases of
 * `app/Domain/Settings/Enums/SettingValueType.php`.
 *
 * Only `int`, `bool` and `string` are in use today (see `SettingSeeder`), but
 * `time` and `json` are live cases of the backend enum and a new seeded key can
 * arrive as either without a frontend deploy. Every one of the five therefore
 * gets a control in `config/settings.config.ts`; none is treated as
 * unreachable.
 */
export type SettingValueType = "int" | "bool" | "string" | "time" | "json"

/**
 * A `json` setting's decoded value. `UpdateSettingRequest` validates this case
 * with Laravel's `array` rule, which accepts both a JSON array and a JSON
 * object (both decode to a PHP array) and rejects a bare scalar — so a
 * top-level `5` or `"text"` is a 422 even though both are valid JSON.
 * `prepareSettingValue()` mirrors that.
 */
export type SettingJsonValue = Record<string, unknown> | unknown[]

/**
 * Arrives **already typed** — `SettingResource` serialises
 * `Setting::resolvedValue()`, which casts the text column into a real
 * `int|bool|string|array|null` first. Nothing in this codebase parses or
 * coerces it on the way in.
 *
 * `null` is reachable: `resolvedValue()` short-circuits to it whenever the
 * stored column is null, for any type. No seeded key is null today (every
 * `setDefault` call passes a value), but a row written by a future migration
 * could be, so every renderer handles it.
 */
export type SettingValue = number | boolean | string | SettingJsonValue | null

export interface Setting {
	/** Dotted, immutable primary key — e.g. `booking.buffer_minutes`. Never editable. */
	key: string
	type: SettingValueType
	value: SettingValue
	/** ISO 8601. Changes on every successful update, which is why the page refetches instead of patching the row in place. */
	updated_at: string | null
}

/** Body of `PATCH /admin/settings/{key}` — this one key, nothing else. */
export interface SettingUpdatePayload extends Record<string, unknown> {
	value: SettingValue
}
