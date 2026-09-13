import type { Bilingual } from "@/add-os/components/resource/field-types"

/**
 * Admin-managed currency lookup. Sourced from ADD Core's `CurrencyResource`
 * and `routes/api/v1/admin.php`, **not** from `ADD-OS.postman_collection.json`
 * — the collection carries no `currencies` request in either the pinned
 * snapshot or the canonical file, so nothing here is a "per the collection"
 * claim.
 *
 * `code` is the primary key: a 3-letter uppercase string, not an
 * autoincrement id (`Currency::$primaryKey = 'code'`, `$incrementing = false`).
 * That is why this resource does not go through `createResourceApi`, which
 * is `number`-keyed and PUT-based.
 *
 * `name` is cast to `array` on the model and serialized verbatim, so it
 * arrives as the `{ar, en}` object — `HasTranslations::translate()` is an
 * opt-in helper the resource never calls, not an accessor that flattens it.
 */
export interface Currency {
	code: string
	name: Bilingual
	symbol: string | null
	decimal_places: number
	is_base: boolean
	is_active: boolean
	order: number | null
	created_at: string
}

/**
 * `is_base` and `is_active` are deliberately absent. `StoreCurrencyRequest`
 * does technically accept `is_active` (`nullable|boolean`), and because the
 * controller merges `$request->validated()` *after* its own defaults a client
 * value would win — but a new currency has exactly one correct initial state
 * (active, non-base), so this omits both and lets the server default them.
 * Changing either afterwards is its own action, and `is_base` is a one-way
 * financially-consequential one.
 */
export interface CurrencyCreatePayload extends Record<string, unknown> {
	code: string
	/**
	 * `symbol` is `string` here but `string | null` on `Currency`: the text
	 * input always yields a string, and `''` satisfies the server's
	 * `nullable|string|max:10`. `order` stays nullable because `n-input-number`
	 * genuinely emits `null` when cleared, and the server accepts that.
	 */
	name: Bilingual
	symbol: string
	decimal_places: number
	order: number | null
}

/**
 * No `code` — the primary key is immutable, and it is enforced structurally:
 * `currencyEditFields` omits the field entirely, so `buildPayload` cannot
 * emit it.
 *
 * `name` and `decimal_places` are required here, not optional:
 * `UpdateCurrencyRequest` declares `decimal_places` as
 * `['required','integer','min:0','max:6']` and takes `name` from
 * `TranslatableField::rules('name')`, which defaults to required. Only
 * `symbol` and `order` are genuinely nullable.
 */
export interface CurrencyUpdatePayload extends Record<string, unknown> {
	name: Bilingual
	symbol: string
	decimal_places: number
	order: number | null
}
