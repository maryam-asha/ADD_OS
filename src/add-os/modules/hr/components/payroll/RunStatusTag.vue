<template>
	<n-tag :type="TAG_TYPE[status]" size="small" round bordered>
		<template v-if="TAG_ICON[status]" #icon>
			<Icon :name="TAG_ICON[status]" :size="14" />
		</template>
		{{ t(`hrPayroll.runStatus.${status}`) }}
	</n-tag>
</template>

<script setup lang="ts">
import type { PayrollRunStatus } from "@/add-os/modules/hr/types/payroll"
import { NTag } from "naive-ui"
import { useI18n } from "vue-i18n"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import Icon from "@/components/common/Icon.vue"

/** A payroll run's state: a colour, an icon and a word — never the colour alone. Open is neutral. */
defineProps<{ status: PayrollRunStatus }>()

const { t } = useI18n()

const TAG_TYPE: Record<PayrollRunStatus, "default" | "info" | "warning" | "success"> = {
	open: "default",
	calculated: "info",
	reviewed: "warning",
	approved: "success",
	paid: "success"
}

const TAG_ICON: Partial<Record<PayrollRunStatus, string>> = {
	calculated: STATUS_ICONS.info,
	reviewed: STATUS_ICONS.warning,
	approved: STATUS_ICONS.success,
	paid: STATUS_ICONS.success
}
</script>
