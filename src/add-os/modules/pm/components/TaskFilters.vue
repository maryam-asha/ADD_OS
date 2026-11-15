<!-- src/add-os/modules/pm/components/TaskFilters.vue -->
<template>
	<div class="flex flex-wrap items-center gap-2" data-test="filters">
		<n-input :value="model.q ?? ''" :placeholder="t('pm.filters.search')" clearable class="sm:w-72!" @update:value="set('q', $event || null)">
			<template #prefix><Icon name="carbon:search" :size="16" /></template>
		</n-input>
		<n-select :value="model.assignee ?? null" :options="assigneeOptions" :placeholder="t('pm.filters.assignee')" clearable class="sm:w-44!" @update:value="set('assignee', $event)" />
		<n-select :value="model.status ?? null" :options="statusOptions" :placeholder="t('pm.filters.status')" clearable class="sm:w-40!" @update:value="set('status', $event)" />
		<n-select :value="model.priority ?? null" :options="priorityOptions" :placeholder="t('pm.priority.label')" clearable class="sm:w-40!" @update:value="set('priority', $event)" />
		<n-select v-if="tags.length > 0" :value="model.tag ?? null" :options="tagOptions" :placeholder="t('pm.filters.tag')" clearable class="sm:w-40!" @update:value="set('tag', $event)" />
		<n-select :value="model.due ?? null" :options="dueOptions" :placeholder="t('pm.filters.due')" clearable class="sm:w-40!" @update:value="set('due', $event)" />
		<n-button v-if="active" quaternary data-test="clear" @click="model = {}">{{ t("pm.filters.clear") }}</n-button>
	</div>
</template>

<script setup lang="ts">
import type { DueFilter, Person, Tag, TaskFilters } from "@/add-os/modules/pm/types/pm"
import { NButton, NInput, NSelect } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { TASK_PRIORITIES, TASK_STATUSES } from "@/add-os/modules/pm/types/pm"
import Icon from "@/components/common/Icon.vue"

/** What narrows a project's tasks. Held by the page, not the URL. */
const props = defineProps<{ members: Person[]; tags: Tag[] }>()

const model = defineModel<TaskFilters>({ default: () => ({}) })

const { t } = useI18n()

const DUE_FILTERS: DueFilter[] = ["overdue", "today", "week", "none"]

const assigneeOptions = computed(() => props.members.map(person => ({ label: person.name, value: person.id })))
const statusOptions = computed(() => TASK_STATUSES.map(status => ({ label: t(`pm.status.${status}`), value: status })))
const priorityOptions = computed(() => TASK_PRIORITIES.map(priority => ({ label: t(`pm.priority.${priority}`), value: priority })))
const tagOptions = computed(() => props.tags.map(tag => ({ label: tag.name, value: tag.id })))
const dueOptions = computed(() => DUE_FILTERS.map(due => ({ label: t(`pm.due.${due}`), value: due })))

const active = computed(() => Object.values(model.value).some(value => value !== null && value !== undefined && value !== ""))

function set<K extends keyof TaskFilters>(key: K, value: TaskFilters[K] | null | undefined) {
	model.value = { ...model.value, [key]: value ?? null }
}
</script>
