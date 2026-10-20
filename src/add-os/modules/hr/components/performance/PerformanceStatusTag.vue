<template>
	<n-tag :type="look.type" size="small" round bordered>
		<template v-if="look.icon" #icon>
			<Icon :name="look.icon" :size="14" />
		</template>
		{{ t(`hrPerformance.status.${kind}.${status}`) }}
	</n-tag>
</template>

<script setup lang="ts">
import { NTag } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import Icon from "@/components/common/Icon.vue"

/**
 * A cycle's phase, a review's status or a goal's state: a colour, an icon
 * and a word. What is under way is information, what waits on the next
 * person a warning, what is done success; drafts and cancelled goals are
 * neutral and carry no icon.
 */
const props = defineProps<{ kind: "cycle" | "review" | "goal"; status: string }>()

const { t } = useI18n()

interface Look { type: "default" | "info" | "warning" | "success" | "error"; icon?: string }

const LOOKS: Record<string, Look> = {
	goal_setting: { type: "info", icon: STATUS_ICONS.info },
	self_review: { type: "info", icon: STATUS_ICONS.info },
	manager_review: { type: "info", icon: STATUS_ICONS.info },
	calibration: { type: "warning", icon: STATUS_ICONS.warning },
	closed: { type: "success", icon: STATUS_ICONS.success },
	open: { type: "default" },
	self_submitted: { type: "info", icon: STATUS_ICONS.info },
	manager_submitted: { type: "warning", icon: STATUS_ICONS.warning },
	finalized: { type: "success", icon: STATUS_ICONS.success },
	active: { type: "info", icon: STATUS_ICONS.info },
	completed: { type: "success", icon: STATUS_ICONS.success }
}

const look = computed<Look>(() => LOOKS[props.status] ?? { type: "default" })
</script>
