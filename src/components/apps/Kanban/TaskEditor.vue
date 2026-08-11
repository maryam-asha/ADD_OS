<template>
	<n-card class="task-editor">
		<div class="flex flex-col gap-2">
			<n-input
				v-model:value="task.title"
				placeholder="Task title..."
				type="textarea"
				size="large"
				:autosize="{
					minRows: 2,
					maxRows: 7
				}"
			/>
			<div class="flex justify-between">
				<div class="grow">
					<span
						v-if="task.label"
						class="task-label custom-label"
						:style="`--label-color:${labelsColors[task.label.id]}`"
					>
						{{ task.label.title }}
					</span>
				</div>
				<div class="flex items-center gap-4">
					<n-button v-if="task.id">Delete</n-button>
					<n-button type="primary" @click="emit('close')">Close</n-button>
				</div>
			</div>
		</div>
	</n-card>
</template>

<script lang="ts" setup>
import type { Task } from "@/mock/kanban"
import { NButton, NCard, NInput } from "naive-ui"
import { computed } from "vue"
import { useThemeStore } from "@/stores/theme"

const emit = defineEmits<{
	(e: "close"): void
}>()

const task = defineModel<Task>("task", { default: { title: "" } })

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
.task-editor {
	max-width: 500px;
	width: 80vw;

	.n-button {
		margin-top: 10px;
	}

	.custom-label::before {
		z-index: 0;
	}
}
</style>
