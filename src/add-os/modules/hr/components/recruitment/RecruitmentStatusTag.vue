<template>
	<n-tag :type="look.type" size="small" round bordered>
		<template v-if="look.icon" #icon>
			<Icon :name="look.icon" :size="14" />
		</template>
		{{ t(`hrRecruitment.status.${kind}.${status}`) }}
	</n-tag>
</template>

<script setup lang="ts">
import { NTag } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import Icon from "@/components/common/Icon.vue"

/**
 * The state of a requisition, an opening, an offer or an interview: a
 * colour, an icon and a word — never the colour alone. What waits on
 * someone is a warning, what is under way or done is success, what was
 * refused is an error; ended states are neutral and carry no icon.
 */
const props = defineProps<{ kind: "requisition" | "opening" | "offer" | "interview"; status: string }>()

const { t } = useI18n()

interface Look { type: "default" | "info" | "warning" | "success" | "error"; icon?: string }

const LOOKS: Record<string, Look> = {
	pending: { type: "warning", icon: STATUS_ICONS.warning },
	scheduled: { type: "info", icon: STATUS_ICONS.info },
	draft: { type: "default" },
	approved: { type: "success", icon: STATUS_ICONS.success },
	open: { type: "success", icon: STATUS_ICONS.success },
	accepted: { type: "success", icon: STATUS_ICONS.success },
	completed: { type: "success", icon: STATUS_ICONS.success },
	filled: { type: "success", icon: STATUS_ICONS.success },
	rejected: { type: "error", icon: STATUS_ICONS.danger },
	declined: { type: "error", icon: STATUS_ICONS.danger }
}

const look = computed<Look>(() => LOOKS[props.status] ?? { type: "default" })
</script>
