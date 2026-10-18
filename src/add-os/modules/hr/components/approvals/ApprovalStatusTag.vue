<template>
	<n-tag :type="TAG_TYPE[status]" size="small" round bordered>
		<template v-if="TAG_ICON[status]" #icon>
			<Icon :name="TAG_ICON[status]" :size="14" />
		</template>
		{{ t(`hrApprovals.${kind === "step" ? "stepStatus" : "status"}.${status}`) }}
	</n-tag>
</template>

<script setup lang="ts">
import type { ApprovalStatus, StepStatus } from "@/add-os/modules/hr/types/approvals"
import { NTag } from "naive-ui"
import { useI18n } from "vue-i18n"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import Icon from "@/components/common/Icon.vue"

/** A request's or a step's status: a colour, an icon and a word — never the colour alone. */
defineProps<{ status: ApprovalStatus | StepStatus; kind?: "request" | "step" }>()

const { t } = useI18n()

type All = ApprovalStatus | StepStatus

const TAG_TYPE: Record<All, "default" | "info" | "success" | "warning" | "error"> = {
	waiting: "default",
	pending: "warning",
	approved: "success",
	rejected: "error",
	cancelled: "default"
}

/** Waiting and cancelled are neutral and carry no icon, like a former employee's tag. */
const TAG_ICON: Partial<Record<All, string>> = {
	pending: STATUS_ICONS.warning,
	approved: STATUS_ICONS.success,
	rejected: STATUS_ICONS.danger
}
</script>
