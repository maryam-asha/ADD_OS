<template>
	<n-tag :type="TYPE[status]" size="small" round bordered>
		<template v-if="ICON[status]" #icon>
			<Icon :name="ICON[status]" :size="14" />
		</template>
		{{ t(`hrAttendance.dayStatus.${status}`) }}
	</n-tag>
</template>

<script setup lang="ts">
import type { DayStatus } from "@/add-os/modules/hr/types/time"
import { NTag } from "naive-ui"
import { useI18n } from "vue-i18n"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import Icon from "@/components/common/Icon.vue"

/** An attendance day's status: a colour, an icon and a word. Days with nothing to judge (rest, holiday, leave, still open) are neutral. */
defineProps<{ status: DayStatus }>()

const { t } = useI18n()

const TYPE: Record<DayStatus, "default" | "info" | "success" | "warning" | "error"> = {
	present: "success",
	incomplete: "warning",
	no_record: "warning",
	absent: "error",
	excused: "info",
	rest: "default",
	holiday: "default",
	leave: "default",
	open: "default"
}

const ICON: Partial<Record<DayStatus, string>> = {
	present: STATUS_ICONS.success,
	incomplete: STATUS_ICONS.warning,
	no_record: STATUS_ICONS.warning,
	absent: STATUS_ICONS.danger,
	excused: STATUS_ICONS.info
}
</script>
