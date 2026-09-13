import type { DataTableColumns, FormItemRule, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { ExchangeRate, ExchangeRatePayload } from "@/add-os/modules/payments/types/exchange-rate"
import { NTag } from "naive-ui"
import { h } from "vue"
import { formatDate, formatNumber } from "@/add-os/utils/format"

export function buildExchangeRateColumns(t: ComposerTranslation, latestIds: Set<number>): DataTableColumns<ExchangeRate> {
	return [
		{ title: t("exchangeRates.columns.currencyCode"), key: "currency_code" },
		{
			title: t("exchangeRates.columns.rateToBase"),
			key: "rate_to_base",
			render: row => {
				if (row.display_rate) {
					return row.display_rate
				}
				const num = Number(row.rate_to_base)
				if (num <= 0) return "-"
				if (row.currency_code === "SYP") {
					const displayRate = num < 1 ? Math.round(1 / num) : num
					return `${formatNumber(displayRate, { fractionDigits: 0 })} ل.س`
				}
				if (num < 1) {
					const inverse = Math.round(1 / num)
					return `1 USD = ${formatNumber(inverse, { fractionDigits: 2 })} ${row.currency_code}`
				}
				return `${formatNumber(num, { fractionDigits: 4 })} USD`
			}
		},
		{
			title: t("exchangeRates.columns.effectiveFrom"),
			key: "effective_from",
			render: row => formatDate(row.effective_from, { style: "dateTime" })
		},
		{
			title: "",
			key: "latest",
			render: row =>
				latestIds.has(row.id)
					? h(NTag, { type: "success", round: true, size: "small" }, { default: () => t("exchangeRates.latestBadge") })
					: null
		}
	]
}

export function exchangeRateFields(
	t: ComposerTranslation,
	currencyOptions: SelectOption[] = [{ label: "SYP", value: "SYP" }]
): FieldDescriptor<ExchangeRatePayload>[] {
	const dateRule: FormItemRule = {
		required: true,
		trigger: ["blur", "change", "input"],
		validator: (_rule, value) =>
			(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) || new Error(t("exchangeRates.validation.effectiveFromFormat"))
	}

	return [
		{
			key: "currency_code",
			labelKey: "exchangeRates.form.currencyCode",
			type: "select",
			required: true,
			options: currencyOptions.length > 0 ? currencyOptions : [{ label: "SYP", value: "SYP" }]
		},
		{ key: "rate_to_base", labelKey: "exchangeRates.form.rateToBase", type: "number", required: true },
		{ key: "effective_from", labelKey: "exchangeRates.form.effectiveFrom", type: "date", required: true, rule: dateRule }
	]
}

export function emptyExchangeRatePayload(defaultCode = "SYP"): ExchangeRatePayload {
	return { currency_code: defaultCode, rate_to_base: 0, effective_from: "" }
}

/**
 * The backend has no `/latest` endpoint (confirmed 404, and absent from the
 * Postman collection too) — "latest per currency" is computed client-side.
 * Tie-break-by-highest-id is inferred from the one tied-effective_from case
 * observed live (the backend's own server-side conversion picked the higher-id
 * row), not from reading backend code.
 */
export function latestRatesByCurrency(rates: ExchangeRate[]): ExchangeRate[] {
	const latest = new Map<string, ExchangeRate>()
	for (const rate of rates) {
		const current = latest.get(rate.currency_code)
		if (!current) {
			latest.set(rate.currency_code, rate)
			continue
		}
		const currentTime = new Date(current.effective_from).getTime()
		const rateTime = new Date(rate.effective_from).getTime()
		if (rateTime > currentTime || (rateTime === currentTime && rate.id > current.id)) {
			latest.set(rate.currency_code, rate)
		}
	}
	return [...latest.values()]
}
