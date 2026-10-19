<template>
	<n-tag :type="TAG_TYPE[status]" size="small" round bordered>
		<template v-if="TAG_ICON[status]" #icon>
			<Icon :name="TAG_ICON[status]" :size="14" />
		</template>
		{{ t(`hrTimesheets.status.${status}`) }}
	</n-tag>
</template>

<script setup lang="ts">
import type { TimesheetStatus } from "@/add-os/modules/hr/types/timesheets"
import { NTag } from "naive-ui"
import { useI18n } from "vue-i18n"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import Icon from "@/components/common/Icon.vue"

/** A timesheet's state: a colour, an icon and a word — never the colour alone. A draft is neutral. */
defineProps<{ status: TimesheetStatus }>()

const { t } = useI18n()

const TAG_TYPE: Record<TimesheetStatus, "default" | "warning" | "success" | "error"> = {
	draft: "default",
	submitted: "warning",
	approved: "success",
	rejected: "error"
}

const TAG_ICON: Partial<Record<TimesheetStatus, string>> = {
	submitted: STATUS_ICONS.warning,
	approved: STATUS_ICONS.success,
	rejected: STATUS_ICONS.danger
}
</script>
