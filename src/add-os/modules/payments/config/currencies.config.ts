import type { DataTableColumns, FormItemRule } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Currency, CurrencyCreatePayload, CurrencyUpdatePayload } from "@/add-os/modules/payments/types/currency"
import { NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { NUMERIC_CELL_CLASS, STATUS_ICONS } from "@/add-os/theme/tokens"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Mirrors `StoreCurrencyRequest`'s `regex:/^[A-Z]{3}$/`. Mirrored for immediate
 * feedback on a field the user types by hand, not to take the decision off the
 * server — a code that slips past this still gets a 422 the drawer renders.
 */
export const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/

/** `null` renders as an empty cell; `0` is a real value and must still print. */
function optionalNumberCell(value: number | null) {
	if (value === null) return ""
	return h("span", { class: NUMERIC_CELL_CLASS }, formatNumber(value))
}

export function buildCurrencyColumns(t: ComposerTranslation, locale: SupportedLocale): DataTableColumns<Currency> {
	return [
		{
			title: t("currencies.columns.code"),
			key: "code",
			/**
			 * The base badge rides in the code cell rather than taking a column of
			 * its own: exactly one row ever carries it, and a dedicated column
			 * would be empty for every other row.
			 */
			render: row =>
				h("div", { class: "flex items-center gap-2" }, [
					h("span", { class: NUMERIC_CELL_CLASS }, row.code),
					row.is_base ? h(NTag, { type: "info", round: true, size: "small" }, { default: () => t("currencies.baseBadge") }) : null
				])
		},
		{ title: t("currencies.columns.name"), key: "name", render: row => pickLocalized(row.name, locale) },
		{ title: t("currencies.columns.symbol"), key: "symbol", render: row => row.symbol ?? "" },
		{
			title: t("currencies.columns.decimalPlaces"),
			key: "decimal_places",
			render: row => h("span", { class: NUMERIC_CELL_CLASS }, formatNumber(row.decimal_places))
		},
		{ title: t("currencies.columns.order"), key: "order", render: row => optionalNumberCell(row.order) },
		{
			title: t("currencies.columns.isActive"),
			key: "is_active",
			render: row =>
				h(
					NTag,
					{ type: row.is_active ? "success" : "error", round: true, bordered: true },
					{
						default: () => [
							h(Icon, { name: row.is_active ? STATUS_ICONS.success : STATUS_ICONS.danger, size: 14 }),
							` ${t(row.is_active ? "currencies.isActiveYes" : "currencies.isActiveNo")}`
						]
					}
				)
		}
	]
}

/**
 * The four fields both forms share. `name` and `decimal_places` are required
 * because `UpdateCurrencyRequest` declares them so — `decimal_places` is
 * `['required','integer','min:0','max:6']`, and `name` comes from
 * `TranslatableField::rules('name')`, which defaults to required. Only
 * `symbol` and `order` are genuinely nullable.
 */
const sharedCurrencyFields: FieldDescriptor<CurrencyUpdatePayload>[] = [
	{ key: "name", labelKey: "currencies.form.name", type: "bilingual-text", required: true },
	{ key: "symbol", labelKey: "currencies.form.symbol", type: "text" },
	{ key: "decimal_places", labelKey: "currencies.form.decimalPlaces", type: "number", required: true },
	{ key: "order", labelKey: "currencies.form.order", type: "number" }
]

/**
 * Create carries `code`; edit does not, and that omission is the whole
 * enforcement of "immutable after create". `buildPayload` emits every
 * non-virtual field, so a field that isn't here cannot reach the request —
 * stronger than a disabled input, which still submits its value.
 */
export function currencyCreateFields(t: ComposerTranslation): FieldDescriptor<CurrencyCreatePayload>[] {
	const codeRule: FormItemRule = {
		required: true,
		trigger: ["blur", "input"],
		validator: (_rule, value) =>
			(typeof value === "string" && CURRENCY_CODE_PATTERN.test(value)) || new Error(t("currencies.validation.codeFormat"))
	}

	return [
		{ key: "code", labelKey: "currencies.form.code", type: "text", rule: codeRule },
		...(sharedCurrencyFields as FieldDescriptor<CurrencyCreatePayload>[])
	]
}

export const currencyEditFields: FieldDescriptor<CurrencyUpdatePayload>[] = sharedCurrencyFields

export function emptyCurrencyPayload(): CurrencyCreatePayload {
	return { code: "", name: { ar: "", en: "" }, symbol: "", decimal_places: 2, order: null }
}

/**
 * `name` is spread, not passed by reference: the drawer edits its model in
 * place, and aliasing would mutate the row still rendered in the table behind
 * the modal.
 */
export function currencyEditPayload(row: Currency): CurrencyUpdatePayload {
	return { name: { ...row.name }, symbol: row.symbol ?? "", decimal_places: row.decimal_places, order: row.order }
}
