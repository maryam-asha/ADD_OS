<!-- src/add-os/modules/pm/views/ProjectsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t("pm.projects.title") }}</h1>
				<p>{{ t("pm.projects.description") }}</p>
			</div>
			<n-button v-if="mayManage" type="primary" data-test="new-project" @click="openForm(false)">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("pm.projects.new") }}
			</n-button>
		</div>

		<n-alert v-if="loadError" type="error" :title="t('pm.projects.loadError')" />

		<n-spin v-else-if="loadingProjects" class="flex justify-center py-12" data-test="projects-loading" />

		<n-empty v-else-if="!loadingProjects && projects.length === 0" :description="t('pm.projects.empty')" data-test="no-projects" />

		<template v-else-if="project">
			<div class="flex flex-wrap gap-2" role="tablist" :aria-label="t('pm.projects.title')">
				<button
					v-for="item in projects"
					:key="item.id"
					type="button"
					role="tab"
					:aria-selected="item.id === project.id"
					:data-project="item.id"
					class="border-border-subtle inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1"
					:class="item.id === project.id ? 'border-border-strong bg-surface-sunken font-bold' : ''"
					@click="setQuery({ project: String(item.id) })"
				>
					<span class="inline-block size-2 rounded-full" :style="{ backgroundColor: toneVar(item.tone) }" />
					<span dir="auto">{{ item.name }}</span>
					<n-tag size="small" round :bordered="false" :title="t('pm.projects.openCount', { n: formatNumber(item.counts.open) })">{{ formatNumber(item.counts.open) }}</n-tag>
				</button>
			</div>

			<ProjectHeader :project @edit="openForm(true)" />

			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex gap-1" role="tablist" :aria-label="t('pm.view.label')">
					<n-button
						v-for="option in VIEWS"
						:key="option.key"
						size="small"
						:type="view === option.key ? 'primary' : 'default'"
						:secondary="view !== option.key"
						role="tab"
						:aria-selected="view === option.key"
						:data-view="option.key"
						@click="setQuery({ view: option.key })"
					>
						<template #icon><Icon :name="option.icon" :size="16" /></template>
						{{ t(`pm.view.${option.key}`) }}
					</n-button>
				</div>
				<TaskFilters v-model="filters" :members="people" :tags />
			</div>

			<n-alert v-if="tasksError" type="error" :title="t('pm.projects.tasksError')" />

			<n-spin :show="loadingTasks">
				<TaskBoard v-if="view === 'board'" :tasks :can-add @open="openTask" @add="addTask" @moved="onMoved" />
				<TaskList v-else :tasks @open="openTask" />
			</n-spin>
		</template>

		<ProjectFormModal v-model:show="formOpen" :project="editing ? project : null" @saved="onSaved" />
	</div>
</template>

<script setup lang="ts">
import type { Person, Project, Tag, Task, TaskFilters as TaskFilterValues, TaskStatus } from "@/add-os/modules/pm/types/pm"
import { NAlert, NButton, NEmpty, NSpin, NTag, useMessage } from "naive-ui"
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import { canManageProjects } from "@/add-os/config/permissions"
import ProjectFormModal from "@/add-os/modules/pm/components/ProjectFormModal.vue"
import ProjectHeader from "@/add-os/modules/pm/components/ProjectHeader.vue"
import TaskBoard from "@/add-os/modules/pm/components/TaskBoard.vue"
import TaskFilters from "@/add-os/modules/pm/components/TaskFilters.vue"
import TaskList from "@/add-os/modules/pm/components/TaskList.vue"
import { mayAddTasks, refusalText } from "@/add-os/modules/pm/utils/display"
import { toneVar } from "@/add-os/modules/pm/utils/pm"
import { listProjects, listProjectTasks, listTags, moveTask } from "@/add-os/services/pm"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"
import { useAuthStore } from "@/stores/auth"

/**
 * Projects, one at a time: a chip per project the account may see, the
 * project's header, and its top-level tasks as a board or a list. Which project
 * and which view are navigation, so they live in the URL (`?project=`,
 * `?view=board|list`); the task filters are only state of this page.
 */

const VIEWS = [
	{ key: "board", icon: "carbon:column" },
	{ key: "list", icon: "carbon:list" }
] as const
type View = (typeof VIEWS)[number]["key"]

const FILTER_DELAY_MS = 250

const { t } = useI18n()
const message = useMessage()
const route = useRoute()
const router = useRouter()

const mayManage = canManageProjects()
const authStore = useAuthStore()

const projects = ref<Project[]>([])
const tasks = ref<Task[]>([])
const tags = ref<Tag[]>([])
const filters = ref<TaskFilterValues>({})
const loadingProjects = ref(true)
const loadingTasks = ref(false)
const loadError = ref(false)
const tasksError = ref(false)

// ── URL: which project, which view ─────────────────────────────────────────
const project = computed<Project | null>(() => {
	const wanted = Number(route.query.project)
	return projects.value.find(item => item.id === wanted) ?? projects.value[0] ?? null
})
const view = computed<View>(() => (route.query.view === "list" ? "list" : "board"))

function setQuery(patch: Record<string, string>) {
	void router.replace({ query: { ...route.query, ...patch } })
}

const canAdd = computed(() => (project.value ? mayAddTasks(project.value, authStore.user.id) : false))

/** The people a task of this project can be assigned to, for the assignee filter. */
const people = computed<Person[]>(() => {
	const byId = new Map<number, Person>()
	if (project.value?.lead) byId.set(project.value.lead.id, project.value.lead)
	for (const person of project.value?.members ?? []) byId.set(person.id, person)
	return [...byId.values()]
})

// ── Loading ─────────────────────────────────────────────────────────────────
async function loadProjects() {
	try {
		projects.value = await listProjects()
		loadError.value = false
	} catch {
		loadError.value = true
	} finally {
		loadingProjects.value = false
	}
}

let tasksRequest = 0
let lastKey = ""

function keyOf(): string {
	return `${project.value?.id ?? ""}|${JSON.stringify(filters.value)}`
}

/** `quiet` reads again without the spinner: after a drop the board already shows the person's order. */
async function loadTasks(quiet = false) {
	const current = project.value
	if (!current) {
		tasks.value = []
		return
	}
	const mine = ++tasksRequest
	lastKey = keyOf()
	if (!quiet) loadingTasks.value = true
	try {
		const rows = await listProjectTasks(current.id, filters.value)
		if (mine !== tasksRequest) return
		tasks.value = rows
		tasksError.value = false
	} catch {
		if (mine === tasksRequest) tasksError.value = true
	} finally {
		if (mine === tasksRequest) loadingTasks.value = false
	}
}

async function loadTags() {
	try {
		tags.value = await listTags()
	} catch {
		tags.value = []
	}
}

let filterTimer: ReturnType<typeof setTimeout> | undefined

// A new project starts with no filters; the same project's filters apply after a short pause.
watch(() => project.value?.id, () => {
	clearTimeout(filterTimer)
	filters.value = {}
	void loadTasks()
})

watch(filters, () => {
	clearTimeout(filterTimer)
	filterTimer = setTimeout(() => {
		if (keyOf() !== lastKey) void loadTasks()
	}, FILTER_DELAY_MS)
}, { deep: true })

onMounted(async () => {
	void loadTags()
	await loadProjects()
})
onBeforeUnmount(() => clearTimeout(filterTimer))

// ── Dropping a card ─────────────────────────────────────────────────────────
async function onMoved(taskId: number, status: TaskStatus, order: number[]) {
	try {
		await moveTask(taskId, status, order)
	} catch (caught) {
		message.error(refusalText(caught, t, t("pm.board.moveError")))
	}
	// Success or not, the server's order is the truth (it renumbers only the cards the actor may move).
	await Promise.all([loadTasks(true), loadProjects()])
}

// ── Task panel hook (Task 8) ────────────────────────────────────────────────
// TaskPanel binds to these: `selectedTask` opens an existing task, `newTaskStatus` a new one in that column.
const selectedTask = ref<Task | null>(null)
const newTaskStatus = ref<TaskStatus | null>(null)

function openTask(task: Task) {
	newTaskStatus.value = null
	selectedTask.value = task
}

function addTask(status: TaskStatus) {
	selectedTask.value = null
	newTaskStatus.value = status
}

// ── Project form ────────────────────────────────────────────────────────────
const formOpen = ref(false)
const editing = ref(false)

function openForm(edit: boolean) {
	editing.value = edit
	formOpen.value = true
}

async function onSaved(saved: Project) {
	await loadProjects()
	if (saved.id !== project.value?.id) setQuery({ project: String(saved.id) })
}

defineExpose({ selectedTask, newTaskStatus })
</script>
