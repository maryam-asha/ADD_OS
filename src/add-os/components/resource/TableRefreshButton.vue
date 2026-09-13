<!-- src/add-os/components/resource/TableRefreshButton.vue -->
<template>
	<n-tooltip trigger="hover">
		<template #trigger>
			<n-button
				quaternary
				circle
				size="small"
				:loading
				:disabled="loading"
				:aria-label="label"
				:title="label"
				@click="handleClick"
			>
				<template #icon>
					<Icon name="carbon:renew" :size="16" />
				</template>
			</n-button>
		</template>
		{{ label }}
	</n-tooltip>
</template>

<script setup lang="ts">
import { NButton, NTooltip } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	loading?: boolean
	tooltip?: string
	onRefresh?: () => void | Promise<void>
}>()

const emit = defineEmits<{
	(e: "refresh"): void
}>()

const { t } = useI18n()

const label = computed(() => props.tooltip || t("resourceCrud.table.refreshAction"))

function handleClick() {
	if (props.loading) return
	if (props.onRefresh) {
		props.onRefresh()
	} else {
		emit("refresh")
	}
}
</script>
