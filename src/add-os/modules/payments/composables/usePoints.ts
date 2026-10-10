import { useI18n } from "vue-i18n"

/**
 * Formatting for point counts — and deliberately nothing else.
 *
 * Points are the unit of account: the backend stores every price and wallet
 * balance as a whole integer of points and derives currency for display.
 * Conversion arithmetic does not belong here. The one place the dashboard
 * converts at all is the top-up form, through `utils/top-up-math.ts` and
 * `useTopUpQuote`: exact BigInt arithmetic mirroring the server's rule, safe
 * only because the server re-derives and verifies every top-up it receives
 * (ADDCore spec 2026-10-10-wallet-top-up-points-entry-design.md). Anywhere
 * else, ask the backend — `price_usd` / `price_display` on priced resources —
 * and pass the number it returns through `formatPoints`.
 */
export function usePoints() {
	const { t, locale } = useI18n()

	/**
	 * Renders a point count for display, localised digits and grouping
	 * included: `340` becomes `340 points` / `340 نقطة`.
	 */
	function formatPoints(points: number): string {
		const formatted = new Intl.NumberFormat(locale.value).format(points)

		return `${formatted} ${t("points.unit")}`
	}

	return { formatPoints }
}
