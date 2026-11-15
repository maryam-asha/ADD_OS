<!-- src/add-os/modules/pm/components/TaskBoard.vue -->
<template>
	<div class="grid auto-cols-[85%] grid-flow-col gap-3 overflow-x-auto pb-2 sm:auto-cols-[45%] lg:auto-cols-fr" data-test="board">
		<section v-for="status in TASK_STATUSES" :key="status" class="bg-surface-sunken flex min-w-0 flex-col gap-3 rounded-lg p-3" :data-column="status">
			<div class="flex items-center gap-2">
				<h2 class="font-bold">{{ t(`pm.status.${status}`) }}</h2>
				<n-tag size="small" round :bordered="false" data-test="count">{{ formatNumber(columns[status].length) }}</n-tag>
			</div>

			<div class="relative flex min-h-24 flex-col">
				<p v-if="columns[status].length === 0" class="text-secondary pointer-events-none absolute inset-x-0 top-4 text-center text-sm">{{ t("pm.board.empty") }}</p>
				<draggable
					v-model="columns[status]"
					group="pm-tasks"
					item-key="id"
					handle="[data-test='drag-handle']"
					:animation="150"
					class="flex min-h-24 flex-1 flex-col gap-2"
					@change="onChange(status, $event)"
				>
					<template #item="{ element }">
						<TaskCard :task="element" @open="emit('open', $event)" />
					</template>
				</draggable>
			</div>

			<n-button v-if="canAdd" quaternary block data-test="add" @click="emit('add', status)">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("pm.board.add") }}
			</n-button>
		</section>
	</div>
</template>

<script setup lang="ts">
import type { Task, TaskStatus } from "@/add-os/modules/pm/types/pm"
import { NButton, NTag } from "naive-ui"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import draggable from "vuedraggable"
import TaskCard from "@/add-os/modules/pm/components/TaskCard.vue"
import { TASK_STATUSES } from "@/add-os/modules/pm/types/pm"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The project's top-level tasks in four columns, one per status, each top to
 * bottom by `sort_order`. A drop is reported, not applied: the page sends
 * `moved(taskId, status, order)` (`order` being the target column's ids as the
 * person left it) and reads the board again from the server's answer.
 */
const props = withDefaults(defineProps<{ tasks: Task[]; canAdd?: boolean }>(), { canAdd: true })
const emit = defineEmits<{
	open: [task: Task]
	add: [status: TaskStatus]
	moved: [taskId: number, status: TaskStatus, order: number[]]
}>()

const { t } = useI18n()

type Columns = Record<TaskStatus, Task[]>

function group(tasks: Task[]): Columns {
	const columns: Columns = { todo: [], in_progress: [], review: [], done: [] }
	for (const task of [...tasks].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)) columns[task.status].push(task)
	return columns
}

const columns = ref<Columns>(group(props.tasks))

watch(() => props.tasks, tasks => {
	columns.value = group(tasks)
})

interface DragChange {
	added?: { element: Task; newIndex: number }
	moved?: { element: Task; newIndex: number; oldIndex: number }
	removed?: unknown
}

/** `added` is the target column of a cross-column drop, `moved` a reorder inside one; `removed` is the source column and needs nothing. */
function onChange(status: TaskStatus, change: DragChange) {
	const hit = change.added ?? change.moved
	if (!hit) return
	emit("moved", hit.element.id, status, columns.value[status].map(task => task.id))
}
</script>
