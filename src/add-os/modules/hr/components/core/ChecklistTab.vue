<!-- src/add-os/modules/hr/components/core/ChecklistTab.vue -->
<template>
	<div class="flex flex-col gap-4">
		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />
		<n-skeleton v-else-if="loading" text :repeat="4" />
		<n-card v-else-if="!tasks.length" size="small">
			<p class="text-secondary">{{ t("hr.checklist.empty") }}</p>
		</n-card>

		<n-card v-for="group in groups" :key="group.kind" size="small">
			<template #header>
				<div class="flex flex-wrap items-center gap-3">
					<span>{{ t(`hr.checklistKind.${group.kind}`) }}</span>
					<span class="text-sm font-normal text-secondary">{{ t("hr.checklist.progress", { done: formatNumber(group.done), total: formatNumber(group.tasks.length) }) }}</span>
				</div>
			</template>
			<ul class="flex flex-col divide-y divide-[var(--add-border)]">
				<li v-for="task in group.tasks" :key="task.id" class="flex flex-wrap items-start justify-between gap-3 py-2">
					<div class="flex min-w-0 flex-1 items-start gap-3">
						<n-checkbox :checked="task.completed_at !== null" :disabled="savingId === task.id" @update:checked="(checked: boolean) => toggle(task, checked)">
							<span :class="task.completed_at ? 'line-through text-secondary' : ''">{{ translated(task.title) }}</span>
						</n-checkbox>
					</div>
					<div class="flex items-center gap-3 text-sm">
						<span v-if="task.completed_at" class="text-secondary">{{ t("hr.checklist.doneOn", { date: formatDateTime(task.completed_at) }) }}</span>
						<span v-else-if="task.due_on" :class="isOverdue(task) ? 'text-error font-semibold' : 'text-secondary'">
							{{ isOverdue(task) ? t("hr.checklist.overdue", { date: formatDate(task.due_on) }) : t("hr.checklist.dueOn", { date: formatDate(task.due_on) }) }}
						</span>
						<n-button text type="primary" :aria-label="t('hr.checklist.note')" :title="t('hr.checklist.note')" @click="openNote(task)">
							<template #icon><Icon :name="task.notes ? 'carbon:document' : 'carbon:add-comment'" :size="18" /></template>
						</n-button>
					</div>
					<p v-if="task.notes" class="w-full ps-8 text-sm text-secondary">{{ task.notes }}</p>
				</li>
			</ul>
		</n-card>

		<HrFormModal v-model:show="noteVisible" :title="t('hr.checklist.note')" size="sm" icon="carbon:add-comment">
			<n-input v-model:value="noteText" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" :maxlength="500" show-count />
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="noteVisible = false">{{ t("hr.common.cancel") }}</n-button>
					<n-button type="primary" :loading="noteTask !== null && savingId === noteTask.id" @click="saveNote">
						<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
						{{ t("hr.common.save") }}
					</n-button>
				</div>
			</template>
		</HrFormModal>
	</div>
</template>

<script setup lang="ts">
import type { ChecklistKind, ChecklistTask } from "@/add-os/modules/hr/types/hr"
import { NAlert, NButton, NCard, NCheckbox, NInput, NSkeleton, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { CHECKLIST_KINDS } from "@/add-os/modules/hr/types/hr"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { listEmployeeChecklist, updateChecklistTask } from "@/add-os/services/hr/core"
import { formatDate, formatDateTime, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The employee's onboarding and offboarding tasks, created from the active
 * templates on hire and on termination. Reading them needs
 * hr.checklists.manage too, so the tab only exists for those who can tick.
 */
const props = defineProps<{ employeeId: number }>()

const { t } = useI18n()
const message = useMessage()

const tasks = ref<ChecklistTask[]>([])
const loading = ref(true)
const loadError = ref(false)
const savingId = ref<number | null>(null)

async function load() {
	loadError.value = false
	try {
		tasks.value = await listEmployeeChecklist(props.employeeId)
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

onMounted(load)
defineExpose({ load })

const groups = computed(() =>
	CHECKLIST_KINDS.map((kind: ChecklistKind) => {
		const items = tasks.value.filter(task => task.kind === kind)
		return { kind, tasks: items, done: items.filter(task => task.completed_at !== null).length }
	}).filter(group => group.tasks.length)
)

const today = new Date().toISOString().slice(0, 10)
function isOverdue(task: ChecklistTask): boolean {
	return task.completed_at === null && task.due_on !== null && task.due_on < today
}

async function update(task: ChecklistTask, payload: { completed: boolean; notes?: string | null }): Promise<boolean> {
	savingId.value = task.id
	try {
		message.success(serverMessage(await updateChecklistTask(task.id, payload), t("hr.checklist.saved")))
		await load()
		return true
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
		return false
	} finally {
		savingId.value = null
	}
}

function toggle(task: ChecklistTask, checked: boolean) {
	void update(task, { completed: checked })
}

const noteVisible = ref(false)
const noteTask = ref<ChecklistTask | null>(null)
const noteText = ref("")

function openNote(task: ChecklistTask) {
	noteTask.value = task
	noteText.value = task.notes ?? ""
	noteVisible.value = true
}

async function saveNote() {
	const task = noteTask.value
	if (!task) return
	if (await update(task, { completed: task.completed_at !== null, notes: nullable(noteText.value) })) noteVisible.value = false
}
</script>
