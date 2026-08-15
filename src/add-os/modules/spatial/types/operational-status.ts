import type { SelectOption } from "naive-ui"
// src/add-os/modules/spatial/types/operational-status.ts
import type { ComposerTranslation } from "vue-i18n"
import { NTag } from "naive-ui"
import { h } from "vue"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import Icon from "@/components/common/Icon.vue"

/** Shared by Space and Resource — `App\Domain\Foundation\Enums\OperationalStatus` in ADDCore. */
export type OperationalStatus = "active" | "maintenance" | "retired"

const STATUS_VALUES = ["active", "maintenance", "retired"] as const

const STATUS_TAG_TYPE: Record<OperationalStatus, "success" | "warning" | "error"> = {
	active: "success",
	maintenance: "warning",
	retired: "error"
}

const STATUS_ICON: Record<OperationalStatus, string> = {
	active: STATUS_ICONS.success,
	maintenance: STATUS_ICONS.warning,
	retired: STATUS_ICONS.danger
}

export function buildOperationalStatusOptions(t: ComposerTranslation): SelectOption[] {
	return STATUS_VALUES.map(status => ({ label: t(`operationalStatus.${status}`), value: status }))
}

export function renderOperationalStatusTag(status: OperationalStatus, t: ComposerTranslation) {
	return h(
		NTag,
		{ type: STATUS_TAG_TYPE[status], round: true, bordered: true },
		{ default: () => [h(Icon, { name: STATUS_ICON[status], size: 14 }), ` ${t(`operationalStatus.${status}`)}`] }
	)
}
