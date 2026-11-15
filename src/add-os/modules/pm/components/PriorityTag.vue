<!-- src/add-os/modules/pm/components/PriorityTag.vue -->
<template>
	<n-tag v-if="tag" :type="tag.type" size="small" :bordered="false" :data-priority="priority">
		<template #icon><Icon :name="tag.icon" :size="14" /></template>
		{{ t(tag.labelKey) }}
	</n-tag>
</template>

<script setup lang="ts">
import type { TaskPriority } from "@/add-os/modules/pm/types/pm"
import { NTag } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { priorityTag } from "@/add-os/modules/pm/utils/pm"
import Icon from "@/components/common/Icon.vue"

/** A task's priority: always the flag and the word, never colour alone. */
const props = defineProps<{ priority: TaskPriority | null }>()

const { t } = useI18n()
const tag = computed(() => priorityTag(props.priority))
</script>
