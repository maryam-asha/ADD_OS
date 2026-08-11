<template>
	<div class="task-card flex flex-col justify-between">
		<div class="task-header flex justify-between gap-3">
			<div class="task-title">{{ task.title }}</div>
			<Icon v-if="mobile" :size="20" class="pan-area" :name="PanIcon" />
		</div>
		<div class="task-footer flex items-end justify-between">
			<span class="task-date">{{ task.dateText }}</span>
			<span
				v-if="task.label"
				class="task-label custom-label"
				:style="`--label-color:${labelsColors[task.label.id]}`"
			>
				{{ task.label.title }}
			</span>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { Task } from "@/mock/kanban"
import { computed } from "vue"
import Icon from "@/components/common/Icon.vue"
import { useThemeStore } from "@/stores/theme"

const { task, mobile } = defineProps<{
	task: Task
	mobile: boolean
}>()

const PanIcon = "carbon:move"
const themeStore = useThemeStore()
const style = computed(() => themeStore.style)

const labelsColors = {
	design: style.value["extra1-color"],
	"feature-request": style.value["extra2-color"],
	backend: style.value["extra3-color"],
	qa: style.value["extra4-color"]
} as unknown as { [key: string]: string }
</script>

<style lang="scss" scoped>
.task-card {
	cursor: move;
	border-radius: var(--border-radius-small);
	padding: 8px 10px;
	margin-bottom: 10px;
	margin-top: 3px;
	background-color: var(--bg-default-color);
	transition: all 0.2s;
	border: 1px solid var(--border-color);

	.pan-area {
		margin-top: 2px;
	}

	.task-title {
		font-weight: bold;
		font-size: 15px;
		line-height: 1.3;
	}

	.task-footer {
		margin-top: 14px;
		.task-date {
			font-size: 14px;
			opacity: 0.8;
		}
	}

	&:hover {
		border-color: var(--primary-color);
	}
}
</style>
