<!-- src/add-os/modules/pm/views/MyTasksPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<PageHeader :title="t('pm.myTasks.title')" :description="t('pm.myTasks.description')" />

		<div class="grid grid-cols-2 gap-3 lg:grid-cols-4" :title="t('pm.myTasks.countersHint')">
			<n-card v-for="item in COUNTERS" :key="item" size="small" :data-counter="item">
				<div class="flex flex-col gap-1">
					<span class="text-secondary text-sm">{{ t(`pm.myTasks.counters.${item}`) }}</span>
					<span class="text-2xl font-bold">{{ formatNumber(counts[item]) }}</span>
				</div>
			</n-card>
		</div>

		<QuickAddTask v-if="quickProjects.length > 0" :projects="quickProjects" @created="reload" />

		<div class="flex gap-1" role="tablist" :aria-label="t('pm.myTasks.scopeLabel')">
			<n-button
				v-for="option in SCOPES"
				:key="option"
				size="small"
				:type="scope === option ? 'primary' : 'default'"
				:secondary="scope !== option"
				role="tab"
				:aria-selected="scope === option"
				:data-scope="option"
				@click="scope = option"
			>
				{{ t(`pm.scope.${option}`) }}
			</n-button>
		</div>

		<n-alert v-if="loadError" type="error" :title="t('pm.myTasks.loadError')" />

		<n-spin v-else-if="loading" class="flex justify-center py-12" data-test="tasks-loading" />

		<n-empty v-else-if="tasks.length === 0" :description="t('pm.myTasks.empty')" data-test="no-tasks" />

		<div v-else class="flex flex-col gap-5">
			<section v-for="group in visibleGroups" :key="group.key" class="flex flex-col gap-2" :data-group="group.key">
				<button
					v-if="group.key === 'done'"
					type="button"
					class="flex cursor-pointer items-center gap-2 text-start font-bold"
					:aria-expanded="showDone"
					data-toggle="done"
					@click="showDone = !showDone"
				>
					<Icon :name="showDone ? 'carbon:chevron-down' : 'carbon:chevron-right'" :size="16" />
					{{ t(`pm.myTasks.groups.${group.key}`) }}
					<n-tag size="small" round :bordered="false">{{ formatNumber(group.tasks.length) }}</n-tag>
				</button>
				<h2 v-else class="flex items-center gap-2 font-bold">
					{{ t(`pm.myTasks.groups.${group.key}`) }}
					<n-tag size="small" round :bordered="false">{{ formatNumber(group.tasks.length) }}</n-tag>
				</h2>

				<template v-if="group.key !== 'done' || showDone">
					<div
						v-for="task in group.tasks"
						:key="task.id"
						:data-task="task.id"
						class="border-border-subtle flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-s-4 px-3 py-2"
						:style="{ borderInlineStartColor: toneVar(task.project.tone) }"
					>
						<button type="button" class="min-w-0 flex-1 cursor-pointer text-start font-bold break-words" data-test="open" dir="auto" @click="openTask(task)">
							{{ task.title }}
						</button>
						<span class="text-secondary inline-flex items-center gap-1 text-sm" data-test="project" dir="auto">
							<span class="inline-block size-2 rounded-full" :style="{ backgroundColor: toneVar(task.project.tone) }" />
							{{ task.project.name }}
						</span>
						<span v-if="task.due_on" class="text-secondary text-sm" data-test="due">{{ formatDate(dayDate(task.due_on)) }}</span>
						<PriorityTag :priority="task.priority" />
						<TaskStatusTag :status="task.status" />
					</div>
				</template>
			</section>
		</div>

		<TaskPanel
			v-if="selected"
			v-model:show="panelOpen"
			:task-id="selected.id"
			:project-id="selected.project.id"
			@saved="reload"
			@deleted="reload"
		/>
	</div>
</template>

<script setup lang="ts">
import type { MyTaskScope, Project, Task, TaskCounts } from "@/add-os/modules/pm/types/pm"
import type { DueGroup } from "@/add-os/modules/pm/utils/pm"
import { NAlert, NButton, NCard, NEmpty, NSpin, NTag } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import PriorityTag from "@/add-os/modules/pm/components/PriorityTag.vue"
import QuickAddTask from "@/add-os/modules/pm/components/QuickAddTask.vue"
import TaskPanel from "@/add-os/modules/pm/components/TaskPanel.vue"
import TaskStatusTag from "@/add-os/modules/pm/components/TaskStatusTag.vue"
import { dayDate } from "@/add-os/modules/pm/utils/display"
import { dueGroup, toneVar } from "@/add-os/modules/pm/utils/pm"
import { listMyTasks, listProjects, myTaskCounts } from "@/add-os/services/pm"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"
import { useAuthStore } from "@/stores/auth"

/**
 * The signed-in account's tasks across every project, grouped by how close
 * they are due, with a one-line quick add. Which scope is shown is state of
 * this page only. The counters always count what is assigned to the account,
 * whatever the scope.
 */

const SCOPES: MyTaskScope[] = ["assigned", "created", "all"]
const COUNTERS = ["overdue", "today", "week", "completed"] as const
const GROUPS: DueGroup[] = ["overdue", "today", "week", "later", "none", "done"]

const { t } = useI18n()
const authStore = useAuthStore()

const scope = ref<MyTaskScope>("assigned")
const tasks = ref<Task[]>([])
const counts = ref<TaskCounts>({ overdue: 0, today: 0, week: 0, completed: 0 })
const projects = ref<Project[]>([])
const loading = ref(true)
const loadError = ref(false)
const showDone = ref(false)

/** Open projects the account is a member of: the only ones it may add a task to for itself. */
const quickProjects = computed(() => {
	const me = authStore.user?.id
	return projects.value.filter(project => !project.is_archived && me !== undefined
		&& (project.members.some(person => person.id === me) || project.lead?.id === me))
})

const visibleGroups = computed(() => {
	const today = new Date()
	return GROUPS
		.map(key => ({ key, tasks: tasks.value.filter(task => dueGroup(task, today) === key) }))
		.filter(group => group.tasks.length > 0)
})

let request = 0

async function loadTasks(quiet: boolean) {
	const mine = ++request
	if (!quiet) loading.value = true
	try {
		const rows = await listMyTasks(scope.value)
		if (mine !== request) return
		tasks.value = rows
		loadError.value = false
	} catch {
		if (mine === request) loadError.value = true
	} finally {
		if (mine === request) loading.value = false
	}
}

async function loadCounts() {
	try {
		counts.value = await myTaskCounts()
	} catch {
		// The list still works; the counters keep their last values.
	}
}

async function loadProjects() {
	try {
		projects.value = await listProjects()
	} catch {
		projects.value = []
	}
}

/** After a task was added, saved, completed or deleted: the list and the counters read again. */
async function reload() {
	await Promise.all([loadTasks(true), loadCounts()])
}

watch(scope, () => void loadTasks(false))

onMounted(() => {
	void loadTasks(false)
	void loadCounts()
	void loadProjects()
})

// ── Task panel ──────────────────────────────────────────────────────────────
const selected = ref<Task | null>(null)

const panelOpen = computed({
	get: () => selected.value !== null,
	set: (open: boolean) => {
		if (!open) selected.value = null
	}
})

function openTask(task: Task) {
	selected.value = task
}
</script>
