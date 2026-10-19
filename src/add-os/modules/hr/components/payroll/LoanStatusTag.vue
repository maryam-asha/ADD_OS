<template>
	<n-tag :type="TAG_TYPE[status]" size="small" round bordered>
		<template v-if="TAG_ICON[status]" #icon>
			<Icon :name="TAG_ICON[status]" :size="14" />
		</template>
		{{ t(`hrPayroll.loanStatus.${status}`) }}
	</n-tag>
</template>

<script setup lang="ts">
import type { LoanStatus } from "@/add-os/modules/hr/types/payroll"
import { NTag } from "naive-ui"
import { useI18n } from "vue-i18n"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import Icon from "@/components/common/Icon.vue"

/** A loan's state: a colour, an icon and a word. Settled and cancelled are neutral and carry no icon. */
defineProps<{ status: LoanStatus }>()

const { t } = useI18n()

const TAG_TYPE: Record<LoanStatus, "default" | "warning" | "success" | "error" | "info"> = {
	pending: "warning",
	active: "info",
	settled: "default",
	rejected: "error",
	cancelled: "default"
}

const TAG_ICON: Partial<Record<LoanStatus, string>> = {
	pending: STATUS_ICONS.warning,
	active: STATUS_ICONS.info,
	rejected: STATUS_ICONS.danger
}
</script>
