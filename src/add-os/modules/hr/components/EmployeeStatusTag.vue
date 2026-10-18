<template>
	<n-tag :type="TAG_TYPE[status]" round bordered size="small">
		<template v-if="TAG_ICON[status]" #icon>
			<Icon :name="TAG_ICON[status]" :size="14" />
		</template>
		{{ t(`hr.status.${status}`) }}
	</n-tag>
</template>

<script setup lang="ts">
import type { EmployeeStatus } from "@/add-os/modules/hr/types/hr"
import { NTag } from "naive-ui"
import { useI18n } from "vue-i18n"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import Icon from "@/components/common/Icon.vue"

defineProps<{ status: EmployeeStatus }>()

const { t } = useI18n()

const TAG_TYPE: Record<EmployeeStatus, "default" | "info" | "success" | "warning" | "error"> = {
	upcoming: "info",
	probation: "warning",
	active: "success",
	suspended: "error",
	terminated: "default"
}

/** A former employee's tag carries no icon. */
const TAG_ICON: Partial<Record<EmployeeStatus, string>> = {
	upcoming: STATUS_ICONS.info,
	probation: STATUS_ICONS.warning,
	active: STATUS_ICONS.success,
	suspended: STATUS_ICONS.danger
}
</script>
