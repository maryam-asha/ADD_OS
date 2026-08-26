// src/add-os/modules/payments/config/currencies.config.ts
import type { DataTableColumns, FormItemRule } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Currency, CurrencyPayload } from "@/add-os/modules/payments/types/currency"
import { NSwitch, NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { formatNumber } from "@/add-os/utils/format"

/** Mirrors StoreCurrencyRequest/UpdateCurrencyRequest exactly. Diverging is a guaranteed 422. */
const CODE_PATTERN = /^[A-Z]{3}$/
const MAX_SYMBOL_LENGTH = 10
const MIN_DECIMAL_PLACES = 0
const MAX_DECIMAL_PLACES = 6
const MIN_ORDER = 0

interface StatusColumnHandlers {
	/** Called only for a non-base row — the base row renders no control to call it. */
	onToggle: (row: Currency, isActive: boolean) => void
	/** `code` of the row whose status request is in flight, or `null`. */
	pendingCode: string | null
}

/**
 * The base currency gets a badge where every other row gets a switch, rather
 * than a switch rendered `disabled`.
 *
 * `updateStatus()` answers a hard 422 (`api.currency.base_currency_status_locked`)
 * for `is_base`, so the control must not be live — but a greyed-out switch only
 * poses the question "why can't I click this?", which is the same objection
 * `ResourceTable` already documents for its delete button. The badge answers it:
 * this row is the base currency, that is why there is nothing to toggle.
 * `CurrenciesPage.toggleStatus` refuses a base row as well, so the rule holds
 * even if something reaches past the rendered control.
 */
function renderStatus(t: ComposerTranslation, row: Currency, handlers: StatusColumnHandlers) {
	if (row.is_base) {
		return h(NTag, { type: "info", round: true, bordered: true, title: t("currencies.baseLocked") }, { default: () => t("currencies.baseBadge") })
	}

	return h(NSwitch, {
		"value": row.is_active,
		"loading": handlers.pendingCode === row.code,
		"aria-label": t("currencies.columns.isActive"),
		"onUpdate:value": (value: boolean) => handlers.onToggle(row, value)
	})
}

export function buildCurrencyColumns(t: ComposerTranslation, locale: SupportedLocale, handlers: StatusColumnHandlers): DataTableColumns<Currency> {
	return [
		/** A currency code is an identifier, not a phrase — rendered verbatim, never translated. */
		{ title: t("currencies.columns.code"), key: "code" },
		{ title: t("currencies.columns.name"), key: "name", render: row => pickLocalized(row.name, locale) },
		{ title: t("currencies.columns.symbol"), key: "symbol", render: row => row.symbol ?? "—" },
		{ title: t("currencies.columns.decimalPlaces"), key: "decimal_places", render: row => formatNumber(row.decimal_places) },
		{ title: t("currencies.columns.order"), key: "order", render: row => (row.order === null ? "—" : formatNumber(row.order)) },
		{ title: t("currencies.columns.isActive"), key: "is_active", render: row => renderStatus(t, row, handlers) }
	]
}

/**
 * `mode` decides one thing only: whether `code` is offered.
 *
 * It is the immutable primary key — `UpdateCurrencyRequest` has no `code` rule
 * at all, so a changed value would be silently dropped rather than rejected,
 * which is the worse of the two failures. Leaving the field out of the edit
 * form means `buildPayload()` cannot put it on the wire either.
 *
 * `is_active` and `is_base` appear in neither mode. Status is its own endpoint
 * (the switch in the table), and `is_base` is not settable through the API at
 * all.
 */
export function buildCurrencyFields(t: ComposerTranslation, mode: "create" | "edit"): FieldDescriptor<CurrencyPayload>[] {
	/**
	 * The server's own `size:3|regex:/^[A-Z]{3}$/|unique` — mirrored case-
	 * sensitively rather than loosened to accept "usd" and upper-casing on
	 * submit. The rule an operator is held to here is then exactly the rule the
	 * server holds them to, and `unique` stays the server's to enforce: a
	 * duplicate lands back on this field as a 422 through ResourceFormDrawer's
	 * own handler.
	 */
	const codeRule: FormItemRule = {
		required: true,
		trigger: ["blur", "change", "input"],
		validator: (_rule, value: unknown) => {
			const text = typeof value === "string" ? value.trim() : ""
			if (text === "") return new Error(t("resourceCrud.validation.required", { field: t("currencies.form.code") }))
			if (!CODE_PATTERN.test(text)) return new Error(t("currencies.validation.codeFormat"))
			return true
		}
	}

	const symbolRule: FormItemRule = {
		trigger: ["blur", "change", "input"],
		validator: (_rule, value: unknown) => {
			const text = typeof value === "string" ? value.trim() : ""
			if (text.length > MAX_SYMBOL_LENGTH) return new Error(t("currencies.validation.symbolTooLong", { max: MAX_SYMBOL_LENGTH }))
			return true
		}
	}

	/**
	 * `n-input-number` will hand back a non-integer if one is typed, and `null`
	 * when cleared — both are checked here rather than assumed away by the
	 * widget.
	 *
	 * The `typeof` test is not redundant with `Number.isInteger`: that one is
	 * declared `(value: unknown) => boolean`, not a type predicate, so it proves
	 * nothing to the compiler and the comparisons after it would be against
	 * `unknown`.
	 */
	const decimalPlacesRule: FormItemRule = {
		required: true,
		trigger: ["blur", "change", "input"],
		validator: (_rule, value: unknown) => {
			if (value === null || value === undefined) {
				return new Error(t("resourceCrud.validation.required", { field: t("currencies.form.decimalPlaces") }))
			}
			if (typeof value !== "number" || !Number.isInteger(value) || value < MIN_DECIMAL_PLACES || value > MAX_DECIMAL_PLACES) {
				return new Error(t("currencies.validation.decimalPlacesRange", { min: MIN_DECIMAL_PLACES, max: MAX_DECIMAL_PLACES }))
			}
			return true
		}
	}

	/** Optional (`nullable|integer|min:0`) — an empty field is a real value here. */
	const orderRule: FormItemRule = {
		trigger: ["blur", "change", "input"],
		validator: (_rule, value: unknown) => {
			if (value === null || value === undefined) return true
			if (typeof value !== "number" || !Number.isInteger(value) || value < MIN_ORDER) {
				return new Error(t("currencies.validation.orderInvalid", { min: MIN_ORDER }))
			}
			return true
		}
	}

	return [
		...(mode === "create" ? [{ key: "code" as const, labelKey: "currencies.form.code", type: "text" as const, rule: codeRule }] : []),
		{ key: "name", labelKey: "currencies.form.name", type: "bilingual-text", required: true },
		{ key: "symbol", labelKey: "currencies.form.symbol", type: "text", rule: symbolRule },
		{ key: "decimal_places", labelKey: "currencies.form.decimalPlaces", type: "number", rule: decimalPlacesRule },
		{ key: "order", labelKey: "currencies.form.order", type: "number", rule: orderRule }
	]
}

/**
 * `decimal_places: 2` matches both seeded rows and the column's own DB default;
 * `order: null` is left genuinely empty rather than guessed, since the list is
 * sorted by it and picking a number for the operator would silently reposition
 * the new row.
 */
export function emptyCurrencyPayload(): CurrencyPayload {
	return { code: "", name: { ar: "", en: "" }, symbol: "", decimal_places: 2, order: null }
}

/** The row → form mapping, kept next to `emptyCurrencyPayload` so the two stay the same shape. */
export function currencyPayloadFrom(row: Currency): CurrencyPayload {
	return {
		code: row.code,
		name: { ...row.name },
		symbol: row.symbol ?? "",
		decimal_places: row.decimal_places,
		order: row.order
	}
}
