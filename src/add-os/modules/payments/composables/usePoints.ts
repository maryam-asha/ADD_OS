import { useI18n } from "vue-i18n"

/**
 * Formatting for point counts — and deliberately nothing else.
 *
 * Points are the unit of account: the backend stores every price and wallet
 * balance as a whole integer of points and derives currency for display. The
 * point rate lives on the server, in one place, and an admin can change it.
 * So this composable contains NO conversion arithmetic: no multiplying by a
 * rate, no dividing cash into points, no rounding rules. A second copy of
 * those rules here would silently drift from the server's the moment the rate
 * moved, and the two would disagree about real money.
 *
 * When a currency equivalent or a point quote is needed, ask the backend for
 * it — `price_usd` / `price_display` on priced resources, or the top-up
 * preview endpoint — and pass the number it returns through `formatPoints`.
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
