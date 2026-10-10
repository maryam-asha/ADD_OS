import type { Ref } from "vue"
import type { TopUpConfig, TopUpCurrency } from "@/add-os/modules/payments/types/wallet-top-up"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { usePoints } from "@/add-os/modules/payments/composables/usePoints"
import {
	amountForPoints,
	isMultipleOf,
	isPositiveAmount,
	normalizeDecimal,
	pointsForAmount,
	remainderBelowOnePoint,
	toAsciiDigits
} from "@/add-os/modules/payments/utils/top-up-math"
import { formatNumber } from "@/add-os/utils/format"

/** What the operator types; the other figure is derived. Points is the default. */
export type TopUpEntryMode = "points" | "amount"

export interface TopUpQuote {
	/** Whole points this top-up credits — sent as `points`, verified by the server. */
	points: number
	/** Points mode: what was typed, lower than `points` when cash rounding raised it. Null in amount mode. */
	requestedPoints: number | null
	/** Cash to collect, a plain decimal string sent as `amount`. */
	amount: string
	/** Amount mode: the cash too small to buy another point, or null. */
	remainder: string | null
}

export type TopUpQuoteError = "invalidPoints" | "invalidAmount" | "belowMinimum" | "notCashStep" | "currencyUnavailable"

type QuoteResult = { quote: TopUpQuote, error: null } | { quote: null, error: TopUpQuoteError | null }

/** Quick-add point counts; any below the configured minimum is hidden. */
const POINT_PRESETS = [10, 50, 100, 500]

const WHOLE_NUMBER = /^\d+$/

/**
 * Points ↔ cash for the top-up form, computed here instead of asking the
 * server on every keystroke (ADDCore spec
 * 2026-10-10-wallet-top-up-points-entry-design.md). Safe because the server
 * re-derives the points from the amount on submit and refuses a mismatch:
 * this decides what the operator sees, never what is credited.
 *
 * `config` is the `top_up` block of `wallet-balance`; the caller sets it on
 * every balance read, and re-reads after a stale-quote 422.
 */
export function useTopUpQuote(currency: Readonly<Ref<string>>) {
	const { t } = useI18n()
	const { formatPoints } = usePoints()

	const config = ref<TopUpConfig | null>(null)
	const mode = ref<TopUpEntryMode>("points")
	const input = ref("")

	// A points count is not an amount: switching what is typed starts the box over.
	watch(mode, () => {
		input.value = ""
	}, { flush: "sync" })

	const currencyConfig = computed<TopUpCurrency | null>(() => config.value?.currencies.find(c => c.code === currency.value) ?? null)
	const minPoints = computed(() => config.value?.min_points ?? null)

	const result = computed<QuoteResult>(() => {
		const raw = toAsciiDigits(input.value).trim()
		if (raw === "" || config.value === null) return { quote: null, error: null }

		const target = currencyConfig.value
		if (target === null) return { quote: null, error: "currencyUnavailable" }

		try {
			return mode.value === "points"
				? quoteFromPoints(raw, target, config.value.point_rate_usd, config.value.min_points)
				: quoteFromAmount(raw, target, config.value.point_rate_usd, config.value.min_points)
		} catch {
			// A rate or step the arithmetic cannot use (malformed, or zero): this
			// currency cannot be quoted, and the form must say so rather than break.
			return { quote: null, error: "currencyUnavailable" }
		}
	})

	const quote = computed(() => result.value.quote)
	const error = computed(() => result.value.error)

	function cash(amount: string): string {
		return `${formatNumber(normalizeDecimal(amount))} ${currency.value}`
	}

	/** The line under the input: what to collect, or what the cash buys. */
	const summary = computed(() => {
		const current = quote.value
		if (current === null) return null
		return mode.value === "points"
			? t("points.collect", { amount: cash(current.amount), points: formatPoints(current.points) })
			: t("points.buys", { points: formatPoints(current.points) })
	})

	/** A second line when the fraction landed somewhere the operator should see it. */
	const note = computed(() => {
		const current = quote.value
		if (current === null) return null
		if (current.remainder !== null) return t("points.remainder", { amount: cash(current.remainder) })
		if (current.requestedPoints !== null && current.points > current.requestedPoints) {
			return t("points.raisedByRounding", { points: formatPoints(current.points) })
		}
		return null
	})

	const errorMessage = computed(() => {
		switch (error.value) {
			case null:
				return null
			case "belowMinimum":
				return t("points.errors.belowMinimum", { min: formatPoints(minPoints.value ?? 0) })
			case "notCashStep":
				return t("points.errors.notCashStep", { step: cash(currencyConfig.value?.cash_step ?? "1") })
			default:
				return t(`points.errors.${error.value}`)
		}
	})

	const presets = computed(() => (mode.value === "points" ? POINT_PRESETS.filter(points => points >= (minPoints.value ?? 0)) : []))

	function addPreset(points: number) {
		const current = toAsciiDigits(input.value).trim()
		input.value = String((WHOLE_NUMBER.test(current) ? Number(current) : 0) + points)
	}

	/** Back to an empty points box, for the next top-up. */
	function reset() {
		mode.value = "points"
		input.value = ""
	}

	return { config, mode, input, quote, error, errorMessage, summary, note, minPoints, presets, addPreset, reset }
}

function quoteFromPoints(raw: string, target: TopUpCurrency, pointRate: string, min: number): QuoteResult {
	if (!WHOLE_NUMBER.test(raw)) return { quote: null, error: "invalidPoints" }
	const requested = Number(raw)
	if (requested < min) return { quote: null, error: "belowMinimum" }

	const amount = amountForPoints(requested, target.rate_to_base, pointRate, target.cash_step)
	return {
		quote: { points: pointsForAmount(amount, target.rate_to_base, pointRate), requestedPoints: requested, amount, remainder: null },
		error: null
	}
}

function quoteFromAmount(raw: string, target: TopUpCurrency, pointRate: string, min: number): QuoteResult {
	if (!isPositiveAmount(raw)) return { quote: null, error: "invalidAmount" }
	if (!isMultipleOf(raw, target.cash_step)) return { quote: null, error: "notCashStep" }

	const amount = normalizeDecimal(raw)
	const points = pointsForAmount(amount, target.rate_to_base, pointRate)
	if (points < min) return { quote: null, error: "belowMinimum" }

	return {
		quote: {
			points,
			requestedPoints: null,
			amount,
			remainder: remainderBelowOnePoint(amount, points, target.rate_to_base, pointRate, target.decimal_places)
		},
		error: null
	}
}
