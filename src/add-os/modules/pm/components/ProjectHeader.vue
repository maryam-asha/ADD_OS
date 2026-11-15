<!-- src/add-os/modules/pm/components/ProjectHeader.vue -->
<template>
	<n-card size="small" class="border-s-4" :style="{ borderInlineStartColor: toneVar(project.tone) }" data-test="project-header">
		<div class="flex flex-col gap-3">
			<div class="flex flex-wrap items-start justify-between gap-2">
				<div class="flex min-w-0 flex-col gap-1">
					<div class="flex flex-wrap items-center gap-2">
						<h2 class="text-xl font-bold" dir="auto">{{ project.name }}</h2>
						<n-tag v-if="project.is_archived" size="small" :bordered="false" data-test="archived">{{ t("pm.header.archived") }}</n-tag>
					</div>
					<p v-if="project.description" class="text-secondary whitespace-pre-wrap" dir="auto">{{ project.description }}</p>
				</div>
				<n-button v-if="canManageProjects()" size="small" data-test="edit-project" @click="emit('edit')">
					<template #icon><Icon name="carbon:edit" :size="16" /></template>
					{{ t("pm.header.edit") }}
				</n-button>
			</div>

			<div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
				<span class="inline-flex items-center gap-1">
					<span class="text-secondary">{{ t("pm.header.lead") }}</span>
					<strong dir="auto">{{ project.lead?.name ?? t("pm.header.noLead") }}</strong>
				</span>
				<span v-if="project.starts_on || project.ends_on" class="inline-flex items-center gap-1" data-test="dates">
					<Icon name="carbon:calendar" :size="14" />
					{{ dates }}
				</span>
				<span class="inline-flex items-center gap-2" data-test="members">
					<n-avatar v-for="person in shownMembers" :key="person.id" round size="small" :src="person.avatar_url ?? undefined" :title="person.name">
						{{ person.avatar_url ? "" : initialsOf(person.name) }}
					</n-avatar>
					<span v-if="extraMembers > 0" class="text-secondary">+{{ formatNumber(extraMembers) }}</span>
					<span v-if="project.members.length === 0" class="text-secondary">{{ t("pm.header.noMembers") }}</span>
				</span>
			</div>

			<div class="flex flex-col gap-1" data-test="progress">
				<n-progress type="line" :percentage="percent" :show-indicator="false" :color="toneVar(project.tone)" />
				<div class="text-secondary flex flex-wrap gap-x-4 text-sm">
					<span>{{ t("pm.header.done", { n: formatNumber(project.counts.done), total: formatNumber(project.counts.total) }) }}</span>
					<span>{{ t("pm.header.open", { n: formatNumber(project.counts.open) }) }}</span>
					<span v-if="project.counts.overdue > 0" class="text-error">{{ t("pm.header.overdue", { n: formatNumber(project.counts.overdue) }) }}</span>
				</div>
			</div>
		</div>
	</n-card>
</template>

<script setup lang="ts">
import type { Project } from "@/add-os/modules/pm/types/pm"
import { NAvatar, NButton, NCard, NProgress, NTag } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { canManageProjects } from "@/add-os/config/permissions"
import { dayDate, initialsOf } from "@/add-os/modules/pm/utils/display"
import { toneVar } from "@/add-os/modules/pm/utils/pm"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/** The selected project at a glance: lead, dates, team and how far along it is. Editing is for `pm.projects.manage`. */
const props = defineProps<{ project: Project }>()
const emit = defineEmits<{ edit: [] }>()

const { t } = useI18n()

const MAX_MEMBERS = 5

const shownMembers = computed(() => props.project.members.slice(0, MAX_MEMBERS))
const extraMembers = computed(() => props.project.members.length - shownMembers.value.length)
const percent = computed(() => {
	const { total, done } = props.project.counts
	return total === 0 ? 0 : Math.round((done / total) * 100)
})
const dates = computed(() => {
	const { starts_on: start, ends_on: end } = props.project
	const from = start ? formatDate(dayDate(start)) : ""
	const to = end ? formatDate(dayDate(end)) : ""
	return start && end ? `${from} – ${to}` : from || to
})
</script>
