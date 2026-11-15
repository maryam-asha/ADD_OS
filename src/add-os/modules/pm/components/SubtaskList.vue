<!-- src/add-os/modules/pm/components/SubtaskList.vue -->
<template>
	<div class="flex flex-col gap-2" data-test="subtasks">
		<h3 class="font-bold">{{ t("pm.task.subtasks.title") }}</h3>

		<p v-if="subtasks.length === 0" class="text-secondary">{{ t("pm.task.subtasks.empty") }}</p>

		<ul v-else class="flex flex-col gap-1">
			<li v-for="subtask in subtasks" :key="subtask.id" class="flex items-center gap-2" :data-subtask="subtask.id">
				<n-checkbox
					:checked="subtask.status === 'done'"
					:disabled="!subtask.can.move || busy"
					:aria-label="t('pm.task.subtasks.toggle', { title: subtask.title })"
					data-test="subtask-toggle"
					@update:checked="toggle(subtask, $event)"
				/>
				<span class="min-w-0 flex-1 break-words" :class="subtask.status === 'done' ? 'text-secondary line-through' : ''" dir="auto">{{ subtask.title }}</span>
				<n-button
					v-if="subtask.can.delete"
					quaternary
					size="small"
					:disabled="busy"
					:aria-label="t('pm.task.subtasks.delete', { title: subtask.title })"
					data-test="subtask-delete"
					@click="remove(subtask)"
				>
					<template #icon><Icon name="carbon:trash-can" :size="16" /></template>
				</n-button>
			</li>
		</ul>

		<form v-if="canAdd" class="flex gap-2" @submit.prevent="add">
			<n-input v-model:value="title" :maxlength="255" :placeholder="t('pm.task.subtasks.placeholder')" :disabled="busy" data-test="subtask-title" />
			<n-button attr-type="submit" :disabled="busy || title.trim() === ''" data-test="subtask-add">{{ t("pm.task.subtasks.add") }}</n-button>
		</form>
	</div>
</template>

<script setup lang="ts">
import type { Task } from "@/add-os/modules/pm/types/pm"
import { NButton, NCheckbox, NInput, useMessage } from "naive-ui"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { refusalText } from "@/add-os/modules/pm/utils/display"
import { createTask, deleteTask, moveTask } from "@/add-os/services/pm"
import Icon from "@/components/common/Icon.vue"

/**
 * A task's subtasks: done or not, added by title, removed. A subtask never
 * has subtasks of its own, so it is only ever a title and a checkbox. Each
 * action reads `can` of the subtask it touches; `canAdd` says whether the
 * account may add tasks to the project at all.
 */
const props = defineProps<{ subtasks: Task[], parentId: number, projectId: number, canAdd: boolean }>()
const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const message = useMessage()

const title = ref("")
const busy = ref(false)

async function run(action: () => Promise<unknown>, failure: string): Promise<boolean> {
	busy.value = true
	try {
		await action()
		emit("changed")
		return true
	} catch (caught) {
		message.error(refusalText(caught, t, failure))
		return false
	} finally {
		busy.value = false
	}
}

async function add() {
	const value = title.value.trim()
	if (busy.value || value === "") return
	if (await run(() => createTask(props.projectId, { title: value, parent_id: props.parentId }), t("pm.task.subtasks.addError"))) title.value = ""
}

function toggle(subtask: Task, done: boolean) {
	void run(() => moveTask(subtask.id, done ? "done" : "todo"), t("pm.task.moveError"))
}

function remove(subtask: Task) {
	void run(() => deleteTask(subtask.id), t("pm.task.subtasks.deleteError"))
}
</script>
