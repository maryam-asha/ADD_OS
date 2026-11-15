<!-- src/add-os/modules/pm/components/TaskCard.vue -->
<template>
	<n-card size="small" :data-task="task.id" class="border-s-4" :style="{ borderInlineStartColor: toneVar(task.project.tone) }">
		<div class="flex flex-col gap-2">
			<div class="flex items-start gap-2">
				<span
					v-if="task.can.move"
					class="text-secondary mt-0.5 shrink-0 cursor-grab touch-none"
					data-test="drag-handle"
					:title="t('pm.board.drag')"
				>
					<Icon name="carbon:draggable" :size="16" />
				</span>
				<button type="button" class="min-w-0 flex-1 cursor-pointer text-start font-bold break-words" data-test="open" dir="auto" @click="emit('open', task)">
					{{ task.title }}
				</button>
			</div>

			<div v-if="task.tags.length > 0" class="flex flex-wrap gap-1" data-test="tags">
				<n-tag v-for="tag in task.tags" :key="tag.id" size="small" round :bordered="false">
					<span class="inline-flex items-center gap-1">
						<span class="inline-block size-2 rounded-full" :style="{ backgroundColor: toneVar(tag.tone) }" />
						{{ tag.name }}
					</span>
				</n-tag>
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<PriorityTag :priority="task.priority" />
				<n-tag v-if="task.due_on" :type="DUE_TYPES[group]" size="small" :bordered="false" data-test="due">
					<template #icon><Icon name="carbon:calendar" :size="14" /></template>
					{{ dueLabel }}
				</n-tag>
			</div>

			<div class="flex items-center justify-between gap-2">
				<span v-if="task.subtask_counts.total > 0" class="text-secondary inline-flex items-center gap-1 text-sm" data-test="subtasks">
					<Icon name="carbon:task" :size="14" />
					{{ formatNumber(task.subtask_counts.done) }}/{{ formatNumber(task.subtask_counts.total) }}
				</span>
				<span v-else />
				<div v-if="task.assignees.length > 0" class="flex items-center gap-1" data-test="assignees">
					<n-avatar v-for="person in shown" :key="person.id" round size="small" :src="person.avatar_url ?? undefined" :title="person.name">
						{{ person.avatar_url ? "" : initialsOf(person.name) }}
					</n-avatar>
					<span v-if="extra > 0" class="text-secondary text-sm">+{{ formatNumber(extra) }}</span>
				</div>
			</div>
		</div>
	</n-card>
</template>

<script setup lang="ts">
import type { Task } from "@/add-os/modules/pm/types/pm"
import type { DueGroup } from "@/add-os/modules/pm/utils/pm"
import { NAvatar, NCard, NTag } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import PriorityTag from "@/add-os/modules/pm/components/PriorityTag.vue"
import { dayDate, initialsOf } from "@/add-os/modules/pm/utils/display"
import { dueGroup, toneVar } from "@/add-os/modules/pm/utils/pm"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * One task on the board: title, tags, priority, due chip (coloured by how
 * close the day is), the subtask count and who it is assigned to. The start
 * edge carries the project's tone. Opening it is the title; moving it is the
 * handle, which only a card the reader may move has.
 */
const props = defineProps<{ task: Task }>()
const emit = defineEmits<{ open: [task: Task] }>()

const { t } = useI18n()

const MAX_AVATARS = 3

const DUE_TYPES: Record<DueGroup, "default" | "error" | "warning" | "info" | "success"> = {
	overdue: "error",
	today: "warning",
	week: "info",
	later: "default",
	none: "default",
	done: "success"
}

const group = computed(() => dueGroup(props.task, new Date()))
const dueLabel = computed(() => {
	const date = props.task.due_on ? formatDate(dayDate(props.task.due_on)) : ""
	if (group.value === "today") return t("pm.due.today")
	if (group.value === "overdue") return `${t("pm.due.overdue")} · ${date}`
	return date
})

const shown = computed(() => props.task.assignees.slice(0, MAX_AVATARS))
const extra = computed(() => props.task.assignees.length - shown.value.length)
</script>
