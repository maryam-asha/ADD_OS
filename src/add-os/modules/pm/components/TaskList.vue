<!-- src/add-os/modules/pm/components/TaskList.vue -->
<template>
	<n-data-table
		:columns
		:data="tasks"
		:row-key="(row: Task) => row.id"
		:row-props
		scroll-x="52rem"
		:bordered="false"
		data-test="list"
	>
		<template #empty>{{ t("pm.list.empty") }}</template>
	</n-data-table>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Task } from "@/add-os/modules/pm/types/pm"
import type { DueGroup } from "@/add-os/modules/pm/utils/pm"
import { NDataTable, NTag } from "naive-ui"
import { computed, h } from "vue"
import { useI18n } from "vue-i18n"
import PriorityTag from "@/add-os/modules/pm/components/PriorityTag.vue"
import TaskStatusTag from "@/add-os/modules/pm/components/TaskStatusTag.vue"
import { dayDate } from "@/add-os/modules/pm/utils/display"
import { dueGroup, toneVar } from "@/add-os/modules/pm/utils/pm"
import { formatDate } from "@/add-os/utils/format"

/** The same tasks as the board, one row each: name, assignees, due, priority, status, tags. */
defineProps<{ tasks: Task[] }>()
const emit = defineEmits<{ open: [task: Task] }>()

const { t } = useI18n()

const DUE_TYPES: Record<DueGroup, "default" | "error" | "warning" | "info" | "success"> = {
	overdue: "error",
	today: "warning",
	week: "info",
	later: "default",
	none: "default",
	done: "success"
}

function rowProps(row: Task) {
	return { class: "cursor-pointer", "data-task": row.id, onClick: () => emit("open", row) }
}

const columns = computed<DataTableColumns<Task>>(() => [
	{
		key: "title",
		title: t("pm.list.columns.title"),
		minWidth: 220,
		render: row => h("span", { class: "font-bold", dir: "auto" }, row.title)
	},
	{
		key: "assignees",
		title: t("pm.list.columns.assignees"),
		minWidth: 160,
		render: row => h("div", { class: "flex flex-wrap gap-x-2" }, row.assignees.map(person => h("span", { key: person.id, dir: "auto" }, person.name)))
	},
	{
		key: "due_on",
		title: t("pm.list.columns.due"),
		width: 170,
		render: row => {
			if (!row.due_on) return t("pm.due.none")
			return h(NTag, { size: "small", bordered: false, type: DUE_TYPES[dueGroup(row, new Date())] }, () => formatDate(dayDate(row.due_on as string)))
		}
	},
	{ key: "priority", title: t("pm.list.columns.priority"), width: 140, render: row => h(PriorityTag, { priority: row.priority }) },
	{ key: "status", title: t("pm.list.columns.status"), width: 150, render: row => h(TaskStatusTag, { status: row.status }) },
	{
		key: "tags",
		title: t("pm.list.columns.tags"),
		minWidth: 160,
		render: row => h(
			"div",
			{ class: "flex flex-wrap gap-1" },
			row.tags.map(tag => h(NTag, { size: "small", round: true, bordered: false, key: tag.id }, () => [
				h("span", { class: "me-1 inline-block size-2 rounded-full", style: { backgroundColor: toneVar(tag.tone) } }),
				tag.name
			]))
		)
	}
])
</script>
