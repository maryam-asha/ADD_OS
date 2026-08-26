import type { MessageResponse } from "./resource-factory"
import type { Setting, SettingValue } from "@/add-os/modules/settings/types/setting"
import { get, patch } from "./api"

const BASE = "/api/v1/admin/settings"

/**
 * Two calls, because the resource has two endpoints. Confirmed from the
 * collection pinned 2026-08-25 (`sha256 86d330d9…`): `Admin (Dashboard) >
 * Settings` holds `GET /api/v1/admin/settings` and
 * `PATCH /api/v1/admin/settings/{key}` and nothing else.
 *
 * Hand-written rather than `createResourceApi()` for the same reason as
 * `services/currencies.ts`, plus one more: the factory builds five verbs off
 * `${base}/${id}` with `id: number`, and this resource has no numeric id (the
 * key is a dotted string), no `store`, and no `destroy`. Wiring the factory
 * here would ship three callable functions for routes that do not exist.
 */

/**
 * The key goes into a path segment, so it is encoded — the same habit
 * `services/currencies.ts` documents. `encodeURIComponent` leaves `.`, `_` and
 * every ASCII letter alone, so this is a no-op for every key `SettingSeeder`
 * creates and the request URL stays readable in a network log.
 */
function settingPath(key: string): string {
	return `${BASE}/${encodeURIComponent(key)}`
}

/**
 * Not paginated, and that is the endpoint's own shape rather than a discarded
 * page: `SettingController::index()` returns
 * `Setting::query()->where('scope_type', Global)->orderBy('key')->get()` — a
 * plain resource collection with no `meta`. The `key` sort is the server's;
 * nothing re-sorts client-side.
 *
 * Available to `admin` and `operations` both. It is only the update that is
 * admin-only, so the page loads for an operations account and gates its
 * controls rather than gating the fetch.
 */
export async function listSettings(): Promise<Setting[]> {
	const res = await get<{ data: Setting[] }>(BASE)
	return res.data
}

/**
 * `value` is sent in whatever JSON type it is handed, with no coercion at all.
 * That is the contract, not a convenience: `UpdateSettingRequest::rules()`
 * switches on the row's own `type` — `integer` for `int`, `boolean` for `bool`,
 * `date_format:H:i` for `time`, `array` for `json` — so a stringified `"15"` or
 * `"1"` is a hard 422. The one caller that turns operator input into a wire
 * value is `prepareSettingValue()` in
 * `modules/settings/config/settings.config.ts`; this layer must not
 * second-guess it.
 *
 * Returns `{message}`, never the updated resource — refetch for the new state
 * (which is also how the row's `updated_at` reaches the table).
 */
export async function updateSetting(key: string, value: SettingValue): Promise<MessageResponse> {
	return patch<MessageResponse>(settingPath(key), { value })
}
