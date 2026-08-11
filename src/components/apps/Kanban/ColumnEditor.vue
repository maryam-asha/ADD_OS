<template>
	<n-card class="column-editor">
		<div class="flex flex-col gap-2">
			<n-input v-model:value="column.title" placeholder="Column title..." size="large" />

			<div class="flex justify-end">
				<div class="flex items-center gap-4">
					<n-button v-if="column.id">Delete</n-button>
					<n-button type="primary" @click="emit('close')">Close</n-button>
				</div>
			</div>
		</div>
	</n-card>
</template>

<script lang="ts" setup>
import type { Column } from "@/mock/kanban"
import { NButton, NCard, NInput } from "naive-ui"

const emit = defineEmits<{
	(e: "close"): void
}>()

const column = defineModel<Column>("column", { default: { title: "" } })
</script>

<style lang="scss" scoped>
.column-editor {
	max-width: 500px;
	width: 80vw;

	.n-button {
		margin-top: 10px;
	}
}
</style>
