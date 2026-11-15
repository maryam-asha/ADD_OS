<!-- src/add-os/modules/pm/components/TaskStatusTag.vue -->
<template>
	<n-tag :type="TYPES[status]" size="small" :bordered="false" :data-status="status">{{ t(`pm.status.${status}`) }}</n-tag>
</template>

<script setup lang="ts">
import type { TaskStatus } from "@/add-os/modules/pm/types/pm"
import { NTag } from "naive-ui"
import { useI18n } from "vue-i18n"

defineProps<{ status: TaskStatus }>()

const { t } = useI18n()

const TYPES: Record<TaskStatus, "default" | "info" | "warning" | "success"> = {
	todo: "default",
	in_progress: "info",
	review: "warning",
	done: "success"
}
</script>
