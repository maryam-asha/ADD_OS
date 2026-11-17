<!-- src/add-os/modules/pm/components/TaskPanel.vue -->
<template>
	<DetailDrawer v-model:show="show" size="lg">
		<template #header>
			<div class="flex items-center justify-between gap-3">
				<span class="min-w-0 break-words" dir="auto">{{ panelTitle }}</span>
				<n-button v-if="canComplete" type="success" secondary size="small" :loading="moving" data-test="complete" @click="changeStatus('done')">
					<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
					{{ t("pm.task.markComplete") }}
				</n-button>
			</div>
		</template>

		<n-alert v-if="loadError" type="error" :title="t('pm.task.loadError')" />

		<n-spin v-else-if="loading" class="flex justify-center py-12" data-test="task-loading" />

		<div v-else-if="project" class="flex flex-col gap-4">
			<n-alert v-if="serverError" type="error" data-test="form-error">{{ serverError }}</n-alert>
			<n-alert v-else-if="!canEdit && !isNew" type="info" data-test="read-only">{{ t("pm.task.readOnly") }}</n-alert>

			<div class="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
				<div>
					<n-form-item :label="t('pm.task.title')" :feedback="titleError ?? undefined" :validation-status="titleError ? 'error' : undefined">
						<n-input v-model:value="title" :maxlength="255" :disabled="!canEdit" data-test="title" />
					</n-form-item>
					<n-form-item :label="t('pm.task.description')" :feedback="errorOf('description')" :validation-status="errorOf('description') ? 'error' : undefined">
						<n-input v-model:value="description" type="textarea" :autosize="{ minRows: 4, maxRows: 12 }" :maxlength="10000" :disabled="!canEdit" data-test="description" />
					</n-form-item>
				</div>

				<div>
					<n-form-item :label="t('pm.task.status')">
						<n-select :value="status" :options="statusOptions" :disabled="!canSetStatus || moving" data-test="status" @update:value="onStatus" />
					</n-form-item>
					<n-form-item :label="t('pm.task.assignees')" :feedback="errorOf('assignee_ids')" :validation-status="errorOf('assignee_ids') ? 'error' : undefined">
						<n-select v-model:value="assigneeIds" :options="peopleOptions" multiple :disabled="!canAssign" :placeholder="t('pm.people.placeholder')" data-test="assignees" />
					</n-form-item>
					<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
						<n-form-item :label="t('pm.task.startsOn')" :feedback="errorOf('starts_on')" :validation-status="errorOf('starts_on') ? 'error' : undefined" data-test="start-field">
							<n-date-picker :formatted-value="startsOn" type="date" value-format="yyyy-MM-dd" clearable :disabled="!canEdit" class="w-full" @update:formatted-value="startsOn = $event" />
						</n-form-item>
						<n-form-item :label="t('pm.task.dueOn')" :feedback="errorOf('due_on')" :validation-status="errorOf('due_on') ? 'error' : undefined" data-test="due-field">
							<n-date-picker :formatted-value="dueOn" type="date" value-format="yyyy-MM-dd" clearable :disabled="!canEdit" class="w-full" @update:formatted-value="dueOn = $event" />
						</n-form-item>
					</div>
					<n-form-item :label="t('pm.priority.label')" :feedback="errorOf('priority')" :validation-status="errorOf('priority') ? 'error' : undefined">
						<n-select v-model:value="priority" :options="priorityOptions" clearable :disabled="!canEdit" data-test="priority" />
					</n-form-item>
					<n-form-item v-if="tagOptions.length > 0" :label="t('pm.task.tags')" :feedback="errorOf('tag_ids')" :validation-status="errorOf('tag_ids') ? 'error' : undefined">
						<n-select v-model:value="tagIds" :options="tagOptions" multiple :disabled="!canEdit" data-test="tags" />
					</n-form-item>
					<n-form-item :label="t('pm.task.estimate')" :feedback="errorOf('estimate_hours')" :validation-status="errorOf('estimate_hours') ? 'error' : undefined">
						<n-input-number v-model:value="estimate" :min="0" :max="999" :show-button="false" clearable :disabled="!canEdit" class="w-full" data-test="estimate">
							<template #suffix>{{ t("pm.task.hours") }}</template>
						</n-input-number>
					</n-form-item>
				</div>
			</div>

			<SubtaskList
				v-if="task && task.parent_id === null"
				:subtasks="task.subtasks ?? []"
				:parent-id="task.id"
				:project-id
				:can-add="mayAdd"
				@changed="onSubtasksChanged"
			/>
		</div>

		<template v-if="project && !loading && !loadError && (canEdit || canDelete)" #footer>
			<div class="flex w-full items-center justify-between gap-2">
				<n-button v-if="canDelete" type="error" secondary :loading="deleting" data-test="delete" @click="confirm({ title: t('pm.task.delete'), content: t('pm.task.deleteConfirm'), positiveText: t('pm.task.delete'), onConfirm: remove })">
					<template #icon><Icon name="carbon:trash-can" :size="16" /></template>
					{{ t("pm.task.delete") }}
				</n-button>
				<span v-else />
				<n-button v-if="canEdit" type="primary" :loading="saving" data-test="save" @click="save">{{ t("pm.task.save") }}</n-button>
			</div>
		</template>
	</DetailDrawer>
</template>

<script setup lang="ts">
import type { Project, Tag, Task, TaskPayload, TaskPriority, TaskStatus } from "@/add-os/modules/pm/types/pm"
import { NAlert, NButton, NDatePicker, NFormItem, NInput, NInputNumber, NSelect, NSpin, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import DetailDrawer from "@/add-os/components/page/DetailDrawer.vue"
import { useConfirm } from "@/add-os/components/page/useConfirm"
import SubtaskList from "@/add-os/modules/pm/components/SubtaskList.vue"
import { TASK_PRIORITIES, TASK_STATUSES } from "@/add-os/modules/pm/types/pm"
import { mayAddTasks, refusalText } from "@/add-os/modules/pm/utils/display"
import { ApiError } from "@/add-os/services/api"
import { createTask, deleteTask, getProject, getTask, listTags, moveTask, updateTask } from "@/add-os/services/pm"
import Icon from "@/components/common/Icon.vue"
import { useAuthStore } from "@/stores/auth"

/**
 * One task in a side drawer: its words on one side, its status, people,
 * dates, priority, tags and estimate on the other, with its subtasks below.
 * `taskId` null is a new task, born in `initialStatus`. What the reader may
 * change comes from the server's `can`: other fields save together, but the
 * status always goes through the move route so a person who may only move a
 * task still can. A 422 stays under its field and the drawer stays open.
 */
const props = withDefaults(defineProps<{
	taskId: number | null
	projectId: number
	initialStatus?: TaskStatus
}>(), { initialStatus: "todo" })
const emit = defineEmits<{ saved: [], deleted: [] }>()

const show = defineModel<boolean>("show", { default: false })

const { t } = useI18n()
const confirm = useConfirm()
const message = useMessage()
const authStore = useAuthStore()

const task = ref<Task | null>(null)
const project = ref<Project | null>(null)
const tags = ref<Tag[]>([])

const title = ref("")
const description = ref("")
const status = ref<TaskStatus>("todo")
const priority = ref<TaskPriority | null>(null)
const startsOn = ref<string | null>(null)
const dueOn = ref<string | null>(null)
const estimate = ref<number | null>(null)
const assigneeIds = ref<number[]>([])
const tagIds = ref<number[]>([])

const loading = ref(false)
const loadError = ref(false)
const saving = ref(false)
const moving = ref(false)
const deleting = ref(false)
const serverError = ref<string | null>(null)
const titleError = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

const isNew = computed(() => props.taskId === null)
const userId = computed<number | undefined>(() => authStore.user.id)

/** Whether the account may add tasks to this project (a new task, or a subtask). */
const mayAdd = computed(() => (project.value ? mayAddTasks(project.value, userId.value) : false))
const canEdit = computed(() => (isNew.value ? mayAdd.value : (task.value?.can.edit ?? false)))
const canSetStatus = computed(() => (isNew.value ? canEdit.value : (task.value?.can.move ?? false)))
const canComplete = computed(() => !isNew.value && !loading.value && !loadError.value && canSetStatus.value && status.value !== "done")
const canDelete = computed(() => !isNew.value && (task.value?.can.delete ?? false))
const canAssign = computed(() => {
	if (isNew.value) return Boolean(project.value && (project.value.can.manage || project.value.can.lead))
	return task.value?.can.assign ?? false
})

const panelTitle = computed(() => (isNew.value ? t("pm.task.newTitle") : (task.value?.title ?? t("pm.task.editTitle"))))

const statusOptions = computed(() => TASK_STATUSES.map(value => ({ label: t(`pm.status.${value}`), value })))
const priorityOptions = computed(() => TASK_PRIORITIES.map(value => ({ label: t(`pm.priority.${value}`), value })))
const tagOptions = computed(() => {
	const byId = new Map<number, string>()
	for (const tag of task.value?.tags ?? []) byId.set(tag.id, tag.name)
	for (const tag of tags.value) byId.set(tag.id, tag.name)
	return [...byId].map(([value, label]) => ({ label, value }))
})

/** Only the project's own people can be assigned; whoever is already assigned stays listed. */
const peopleOptions = computed(() => {
	const byId = new Map<number, string>()
	if (project.value?.lead) byId.set(project.value.lead.id, project.value.lead.name)
	for (const person of project.value?.members ?? []) byId.set(person.id, person.name)
	for (const person of task.value?.assignees ?? []) byId.set(person.id, person.name)
	return [...byId].map(([value, label]) => ({ label, value }))
})

function errorOf(field: string): string | undefined {
	return fieldErrors.value[field]
}

function clearErrors() {
	serverError.value = null
	titleError.value = null
	fieldErrors.value = {}
}

function fill(source: Task | null) {
	title.value = source?.title ?? ""
	description.value = source?.description ?? ""
	status.value = source?.status ?? props.initialStatus
	priority.value = source?.priority ?? null
	startsOn.value = source?.starts_on ?? null
	dueOn.value = source?.due_on ?? null
	estimate.value = source?.estimate_hours ?? null
	assigneeIds.value = source ? source.assignees.map(person => person.id) : []
	tagIds.value = source ? source.tags.map(tag => tag.id) : []
}

let generation = 0

/** `quiet` re-reads the task in place (after a move or a subtask change) without the spinner. */
async function load(quiet = false) {
	const mine = ++generation
	if (!quiet) {
		loading.value = true
		loadError.value = false
		clearErrors()
		task.value = null
		fill(null)
	}
	try {
		const [loadedProject, loadedTags, loadedTask] = await Promise.all([
			getProject(props.projectId),
			listTags().catch(() => [] as Tag[]),
			props.taskId === null ? Promise.resolve(null) : getTask(props.taskId)
		])
		if (mine !== generation) return
		project.value = loadedProject
		tags.value = loadedTags
		task.value = loadedTask
		if (quiet && loadedTask) status.value = loadedTask.status
		else fill(loadedTask)
		// A member creating a task gets themselves: the server's default, shown here.
		if (!quiet && loadedTask === null && !canAssign.value && userId.value !== undefined) assigneeIds.value = [userId.value]
	} catch {
		if (mine === generation) loadError.value = true
	} finally {
		if (mine === generation) loading.value = false
	}
}

watch(() => [show.value, props.taskId, props.projectId] as const, ([open]) => {
	if (open) void load()
}, { immediate: true })

/** Puts a failed save where the person can act on it: under its field, else as the drawer's alert. */
function report(caught: unknown, fallback: string) {
	if (caught instanceof ApiError && caught.status === 422 && caught.data?.errors) {
		const next: Record<string, string> = {}
		for (const [key, messages] of Object.entries(caught.data.errors)) {
			const field = key.split(".")[0]
			if (!(field in next) && messages[0]) next[field] = messages[0]
		}
		fieldErrors.value = next
		if (next.title) titleError.value = next.title
		// A field this form has no control for still gets heard.
		const shown = ["title", "description", "assignee_ids", "starts_on", "due_on", "priority", "tag_ids", "estimate_hours"]
		const stray = Object.keys(next).find(field => !shown.includes(field))
		if (stray) serverError.value = next[stray]
		return
	}
	serverError.value = refusalText(caught, t, fallback)
}

async function save() {
	if (saving.value) return
	clearErrors()
	if (title.value.trim() === "") {
		titleError.value = t("pm.task.titleRequired")
		return
	}
	saving.value = true
	const payload: TaskPayload = {
		title: title.value.trim(),
		description: description.value.trim() === "" ? null : description.value.trim(),
		priority: priority.value,
		starts_on: startsOn.value,
		due_on: dueOn.value,
		estimate_hours: estimate.value,
		tag_ids: tagIds.value
	}
	if (canAssign.value) payload.assignee_ids = assigneeIds.value
	try {
		if (isNew.value) {
			await createTask(props.projectId, { ...payload, status: status.value })
			message.success(t("pm.task.created"))
		} else if (task.value) {
			await updateTask(task.value.id, payload)
			message.success(t("pm.task.updated"))
		}
		show.value = false
		emit("saved")
	} catch (caught) {
		report(caught, t("pm.task.saveError"))
	} finally {
		saving.value = false
	}
}

/** The status select: in a new task it is only the column it starts in; in an existing one it moves it now. */
function onStatus(next: TaskStatus) {
	if (isNew.value) status.value = next
	else void changeStatus(next)
}

async function changeStatus(next: TaskStatus) {
	if (!task.value || moving.value || next === status.value) return
	moving.value = true
	serverError.value = null
	try {
		await moveTask(task.value.id, next)
		status.value = next
		emit("saved")
		await load(true)
	} catch (caught) {
		serverError.value = refusalText(caught, t, t("pm.task.moveError"))
	} finally {
		moving.value = false
	}
}

async function remove() {
	if (!task.value || deleting.value) return
	deleting.value = true
	try {
		await deleteTask(task.value.id)
		message.success(t("pm.task.deleted"))
		show.value = false
		emit("deleted")
	} catch (caught) {
		serverError.value = refusalText(caught, t, t("pm.task.deleteError"))
	} finally {
		deleting.value = false
	}
}

async function onSubtasksChanged() {
	emit("saved")
	await load(true)
}
</script>
