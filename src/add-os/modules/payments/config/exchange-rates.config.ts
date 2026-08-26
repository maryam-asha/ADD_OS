// src/add-os/modules/payments/config/exchange-rates.config.ts
import type { DataTableColumns, FormItemRule, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { Currency } from "@/add-os/modules/payments/types/currency"
import type { ExchangeRate, ExchangeRatePayload, PendingExchangeRateSuggestion } from "@/add-os/modules/payments/types/exchange-rate"
import { NTag } from "naive-ui"
import { h } from "vue"
import { formatDate, formatNumber } from "@/add-os/utils/format"

/**
 * A suggestion is USD/SYP only, and the backend says so twice: the ingestion
 * job quotes exactly this pair, and `StoreExchangeRateRequest::withValidator()`
 * rejects any submission carrying a `suggestion_id` whose `currency_code` is
 * anything but 'SYP'. Hardcoded here for the same reason it is hardcoded there
 * — it is a property of the vendor feed, not a configuration.
 */
export const SUGGESTION_CURRENCY_CODE = "SYP"

/**
 * DISPLAY ONLY, and deliberately not sourced from the backend, because the
 * backend has no counterpart to it: the only threshold in
 * `StoreExchangeRateRequest` is the 10x plausibility band that catches an
 * un-inverted number, which answers a different question entirely (is this
 * value broken) from this one (is this move big enough to look at twice).
 *
 * 5% is a UI judgement about when a quote deserves a warning tone rather than a
 * neutral one. It gates no submission and blocks nothing — an admin can accept
 * any deviation. One line to change if operations want a different number.
 */
export const DEVIATION_WARNING_THRESHOLD_PERCENT = 5

export function buildExchangeRateColumns(t: ComposerTranslation, latestIds: Set<number>): DataTableColumns<ExchangeRate> {
	return [
		{ title: t("exchangeRates.columns.currencyCode"), key: "currency_code" },
		{
			title: t("exchangeRates.columns.rateToBase"),
			key: "rate_to_base",
			/**
			 * No `fractionDigits`, on purpose. This column used to round to 4, which
			 * was right for the five-figure SYP-per-USD number the table held before
			 * ADDCore's multi-currency migration and is wrong for what it holds now:
			 * `rate_to_base` is USD per 1 unit, so a real SYP rate of 0.0000680272
			 * rendered as "0.0001". `formatNumber`'s default keeps whatever precision
			 * the `decimal(20,10)` column returned and strips trailing zeros, which
			 * reads correctly at both magnitudes.
			 */
			render: row => formatNumber(row.rate_to_base)
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

/**
 * The codes `POST /admin/exchange-rates` will actually accept.
 *
 * Mirrors `StoreExchangeRateRequest`'s own predicate —
 * `Rule::exists('currencies','code')->where(is_active = true, is_base = false)`
 * — against the list `CurrenciesPage` manages. The base currency is excluded
 * because its rate to itself is definitionally 1 and it never gets a row;
 * inactive ones because the server refuses them.
 */
export function selectableRateCurrencies(currencies: Currency[]): Currency[] {
	return currencies.filter(currency => currency.is_active && !currency.is_base)
}

export interface ExchangeRateFieldOptions {
	currencies: Currency[]
	/**
	 * Set when the form was opened by accepting a suggestion. Pins the currency
	 * to that code and takes the control out of play: a suggestion is only valid
	 * against SYP, so an editable dropdown here could only ever be used to make
	 * the submission invalid.
	 */
	lockedCurrencyCode?: string
}

/**
 * ── ORIGINAL NOTE on `currency_code`, kept for the record ───────────────────
 * "Only "USD" has ever been accepted (SYP/EUR/GBP/TRY/SAR all rejected as 422
 * invalid — SYP is the fixed base currency the rate converts into). Fixed and
 * disabled rather than a free choice: there is nothing else valid to pick, and
 * no endpoint anywhere lists a currency set."
 *
 * ── REVERSAL, 2026-08-26 ────────────────────────────────────────────────────
 * Both halves of that stopped being true, and in opposite directions.
 *
 * ADDCore's multi-currency migration seeds USD as the BASE currency, and the
 * validator now excludes base rows — so the one hardcoded option this form
 * offered was the one code guaranteed to 422. Every manual create from this
 * page was failing before this change, and the accept-a-suggestion path could
 * not have worked at all, since it needs "SYP".
 *
 * And there IS an endpoint listing the currency set now:
 * `GET /admin/currencies`, the resource `CurrenciesPage` manages. So the field
 * reads that list rather than naming codes, which is what keeps it correct the
 * next time an admin adds one.
 *
 * What that costs, stated plainly: this page now depends on a second request,
 * and an empty or failed currencies list leaves the dropdown empty instead of
 * showing a wrong-but-populated one. That is the intended failure — the
 * behaviour it replaces was a populated dropdown whose only value was rejected.
 */
export function exchangeRateFields(t: ComposerTranslation, options: ExchangeRateFieldOptions): FieldDescriptor<ExchangeRatePayload>[] {
	const { currencies, lockedCurrencyCode } = options

	/** A currency code is an identifier, not a phrase — never routed through t(). */
	const currencyOptions: SelectOption[] = lockedCurrencyCode
		? [{ label: lockedCurrencyCode, value: lockedCurrencyCode }]
		: selectableRateCurrencies(currencies).map(currency => ({ label: currency.code, value: currency.code }))

	/**
	 * Mirrors the server's `required|numeric|gt:0`, so a submission that cannot
	 * succeed does not make the round trip.
	 *
	 * It deliberately does NOT mirror the other rule on this field — the 10x band
	 * around `suggested_rate_to_base` that applies only when a `suggestion_id` is
	 * present. That band exists to catch a client which forgot to invert and sent
	 * the raw SYP-per-USD figure; this page pre-fills from
	 * `suggested_rate_to_base` and never computes it, so the only way to reach the
	 * band is an admin deliberately typing a value 10x away from the quote they
	 * are reviewing — and the server is the right place to argue with that.
	 */
	const rateToBaseRule: FormItemRule = {
		required: true,
		trigger: ["blur", "change", "input"],
		validator: (_rule, value: unknown) => {
			if (value === null || value === undefined) {
				return new Error(t("resourceCrud.validation.required", { field: t("exchangeRates.form.rateToBase") }))
			}
			if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
				return new Error(t("exchangeRates.validation.rateMustBePositive"))
			}
			return true
		}
	}

	const effectiveFromRule: FormItemRule = {
		required: true,
		trigger: ["blur", "input"],
		validator: (_rule, value) =>
			(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) || new Error(t("exchangeRates.validation.effectiveFromFormat"))
	}

	return [
		{
			key: "currency_code",
			labelKey: "exchangeRates.form.currencyCode",
			type: "select",
			required: true,
			options: currencyOptions,
			disabledWhen: () => lockedCurrencyCode !== undefined
		},
		{ key: "rate_to_base", labelKey: "exchangeRates.form.rateToBase", type: "number", rule: rateToBaseRule },
		{ key: "effective_from", labelKey: "exchangeRates.form.effectiveFrom", type: "text", rule: effectiveFromRule }
	]
}

/**
 * Today in UTC, as the `YYYY-MM-DD` this field holds.
 *
 * UTC and not local, because `ExchangeRatesPage.submit` appends `T00:00:00Z` to
 * whatever this returns. Taking the local date in Damascus (UTC+3) just after
 * midnight would name tomorrow and produce an instant three hours in the
 * FUTURE, which `ExchangeRate::current()` (`effective_from <= now()`) then skips
 * until it arrives — a rate that silently is not in effect yet. The UTC date
 * always lands at or before now.
 *
 * Not routed through `utils/format`: that module renders dates for people
 * ("26 آب 2026"), and this is a wire-shaped value the field's own regex requires.
 */
export function todayEffectiveFrom(now: Date = new Date()): string {
	return now.toISOString().slice(0, 10)
}

export function emptyExchangeRatePayload(currencies: Currency[] = []): ExchangeRatePayload {
	const selectable = selectableRateCurrencies(currencies)

	return {
		/**
		 * Pre-selected only when there is exactly one thing to pick — with SYP the
		 * only non-base currency today that is the common case, and it saves a click
		 * with no decision in it. With two or more the operator chooses; an empty
		 * value fails the required rule rather than silently defaulting to whichever
		 * row happened to sort first.
		 */
		currency_code: selectable.length === 1 ? selectable[0].code : "",
		rate_to_base: 0,
		effective_from: ""
	}
}

/**
 * The prefill an Accept produces.
 *
 * `rate_to_base` is `suggested_rate_to_base` copied VERBATIM — the backend
 * already did the inversion, and recomputing it from `rate_usd_to_syp` here is
 * the single most likely bug in this feature. It stays editable once prefilled:
 * the review step exists so an admin can adjust before submitting, not so they
 * can watch an auto-apply happen.
 *
 * `suggestion_id` is deliberately NOT part of this payload. It is not a form
 * field, `buildPayload()` would drop it, and it is merged at submit — see
 * `ExchangeRatesPage.submit`.
 */
export function suggestionExchangeRatePayload(suggestion: PendingExchangeRateSuggestion, now: Date = new Date()): ExchangeRatePayload {
	return {
		currency_code: SUGGESTION_CURRENCY_CODE,
		rate_to_base: suggestion.suggested_rate_to_base,
		effective_from: todayEffectiveFrom(now)
	}
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
