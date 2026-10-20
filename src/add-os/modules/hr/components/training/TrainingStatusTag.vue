<template>
	<n-tag :type="look.type" size="small" round bordered>
		<template v-if="look.icon" #icon>
			<Icon :name="look.icon" :size="14" />
		</template>
		{{ t(`hrTraining.status.${kind}.${status}`) }}
	</n-tag>
</template>

<script setup lang="ts">
import { NTag } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import Icon from "@/components/common/Icon.vue"

/**
 * A session's, an enrollment's or a learning request's status: a colour,
 * an icon and a word. Scheduled and enrolled are under way, a pending
 * request waits on its approver, done is success, a no-show or a refusal
 * an error; cancelled is neutral and carries no icon.
 */
const props = defineProps<{ kind: "session" | "enrollment" | "request"; status: string }>()

const { t } = useI18n()

interface Look { type: "default" | "info" | "warning" | "success" | "error"; icon?: string }

const LOOKS: Record<string, Look> = {
	scheduled: { type: "info", icon: STATUS_ICONS.info },
	enrolled: { type: "info", icon: STATUS_ICONS.info },
	pending: { type: "warning", icon: STATUS_ICONS.warning },
	completed: { type: "success", icon: STATUS_ICONS.success },
	approved: { type: "success", icon: STATUS_ICONS.success },
	no_show: { type: "error", icon: STATUS_ICONS.danger },
	rejected: { type: "error", icon: STATUS_ICONS.danger }
}

const look = computed<Look>(() => LOOKS[props.status] ?? { type: "default" })
</script>
