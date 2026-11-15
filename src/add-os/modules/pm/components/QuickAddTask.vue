<!-- src/add-os/modules/pm/components/QuickAddTask.vue -->
<template>
	<div class="flex flex-wrap items-center gap-2" data-test="quick-add">
		<n-select
			v-model:value="projectId"
			:options
			class="sm:w-56!"
			:aria-label="t('pm.myTasks.quick.project')"
			:disabled="saving"
		/>
		<n-input
			v-model:value="title"
			class="min-w-0 flex-1"
			:placeholder="t('pm.myTasks.quick.placeholder')"
			:aria-label="t('pm.myTasks.quick.placeholder')"
			:disabled="saving"
			@keydown.enter="add"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Project } from "@/add-os/modules/pm/types/pm"
import { NInput, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { refusalText } from "@/add-os/modules/pm/utils/display"
import { createTask } from "@/add-os/services/pm"
import { useAuthStore } from "@/stores/auth"

/**
 * One line to jot down a task for oneself: pick the project, type a title,
 * press Enter. The task is always assigned to the signed-in account, spelled
 * out because a manager or lead who leaves the assignees out may get an
 * unassigned task. The project stays chosen for the next one.
 */
const props = defineProps<{ projects: Project[] }>()
const emit = defineEmits<{ created: [] }>()

const { t } = useI18n()
const message = useMessage()
const authStore = useAuthStore()

const projectId = ref<number | null>(props.projects[0]?.id ?? null)
const title = ref("")
const saving = ref(false)

const options = computed(() => props.projects.map(project => ({ label: project.name, value: project.id })))

watch(() => props.projects, list => {
	if (!list.some(project => project.id === projectId.value)) projectId.value = list[0]?.id ?? null
})

async function add() {
	const text = title.value.trim()
	const me = authStore.user?.id
	if (!text || projectId.value === null || me === undefined || saving.value) return
	saving.value = true
	try {
		await createTask(projectId.value, { title: text, assignee_ids: [me] })
		title.value = ""
		emit("created")
	} catch (caught) {
		message.error(refusalText(caught, t, t("pm.myTasks.quick.addError")))
	} finally {
		saving.value = false
	}
}
</script>
