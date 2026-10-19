<template>
	<n-tag :type="TAG_TYPE[status]" size="small" round bordered>
		<template v-if="TAG_ICON[status]" #icon>
			<Icon :name="TAG_ICON[status]" :size="14" />
		</template>
		{{ t(`hrBenefits.grantStatus.${status}`) }}
	</n-tag>
</template>

<script setup lang="ts">
import type { BenefitGrantStatus } from "@/add-os/modules/hr/types/benefits"
import { NTag } from "naive-ui"
import { useI18n } from "vue-i18n"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import Icon from "@/components/common/Icon.vue"

/** A grant's state: a colour, an icon and a word. Cancelled is neutral and carries no icon. */
defineProps<{ status: BenefitGrantStatus }>()

const { t } = useI18n()

const TAG_TYPE: Record<BenefitGrantStatus, "default" | "warning" | "success" | "error"> = {
	pending: "warning",
	fulfilled: "success",
	failed: "error",
	cancelled: "default"
}

const TAG_ICON: Partial<Record<BenefitGrantStatus, string>> = {
	pending: STATUS_ICONS.warning,
	fulfilled: STATUS_ICONS.success,
	failed: STATUS_ICONS.danger
}
</script>
