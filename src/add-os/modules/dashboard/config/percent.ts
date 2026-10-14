import type { ComposerTranslation } from "vue-i18n"
import { formatNumber } from "@/add-os/utils/format/numbers"

/**
 * A share as a percentage to one decimal — except a share too small to show,
 * which reads "<0.1%" rather than a "0%" that would say nothing was there.
 */
export function sharePercent(t: ComposerTranslation, value: number): string {
	if (value > 0 && value < 0.1) return t("dashboard.percent", { value: "<0.1" })
	return t("dashboard.percent", { value: formatNumber(value, { fractionDigits: 1, trimZeros: true }) })
}
