<template>
	<n-tag :type="active ? 'success' : 'default'" size="small" round bordered>
		<template v-if="active" #icon>
			<Icon :name="STATUS_ICONS.success" :size="14" />
		</template>
		{{ active ? t("hr.common.active") : t("hr.common.inactive") }}
	</n-tag>
</template>

<script setup lang="ts">
import { NTag } from "naive-ui"
import { useI18n } from "vue-i18n"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import Icon from "@/components/common/Icon.vue"

/** Active or not, for HR settings rows. Like a former employee's tag, an inactive one is neutral and carries no icon. */
defineProps<{ active: boolean }>()

const { t } = useI18n()
</script>
