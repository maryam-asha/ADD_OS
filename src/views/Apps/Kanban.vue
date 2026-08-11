<template>
	<div class="page page-min-wrapped page-without-footer">
		<LtrContext class="scrollbar-styled overflow-x-auto overflow-y-hidden">
			<div class="columns-scroll">
				<div class="columns-wrap flex">
					<draggable
						v-model="columns"
						item-key="title"
						:animation="200"
						ghost-class="ghost-column"
						handle=".pan-area"
						group="columns"
						class="flex items-start"
					>
						<template #item="{ element: column }">
							<div class="column">
								<draggable
									v-model="column.tasks"
									item-key="id"
									:animation="200"
									:handle="isMobile() ? '.pan-area' : undefined"
									ghost-class="ghost-card"
									group="tasks"
								>
									<template #header>
										<div class="column-header flex justify-between">
											<span class="flex items-center gap-3" @click="selectColumn(column)">
												<span>
													{{ column.title }}

													<Icon :name="EditIcon" :size="12" />
												</span>
												<span class="opacity-40">{{ column.tasks.length || 0 }}</span>
											</span>
											<Icon :name="PanIcon" :size="20" class="pan-area" />
										</div>
									</template>
									<template #item="{ element: task }">
										<TaskCard
											:task
											:mobile="isMobile()"
											:class="{
												'item-appear item-appear__bottom item-appear__delayed-010':
													cardAnimation
											}"
											@click="selectTask(task)"
										/>
									</template>
									<template #footer>
										<button
											class="add-task-btn flex items-center justify-center"
											@click="addTask(column)"
										>
											<Icon :name="AddIcon" :size="20" />
											<span>Add card</span>
										</button>
									</template>
								</draggable>
							</div>
						</template>
						<template #footer>
							<div class="column flex items-center justify-center">
								<button
									class="add-task-btn mt-0! flex items-center justify-center"
									@click="addColumn()"
								>
									<Icon :name="AddIcon" :size="20" />
									<span>Add column</span>
								</button>
							</div>
						</template>
					</draggable>
					<div class="spacer" />
				</div>
			</div>
		</LtrContext>

		<n-modal v-model:show="showTaskEditor" class="kanban-modal">
			<div class="fixed! top-[20vh] left-[50vw] -translate-x-1/2!">
				<TaskEditor v-if="selectedTask" :task="selectedTask" @close="selectedTask = null" />
			</div>
		</n-modal>

		<n-modal v-model:show="showColumnEditor" class="kanban-modal">
			<div class="fixed! top-[20vh] left-[50vw] -translate-x-1/2!">
				<ColumnEditor v-if="selectedColumn" :column="selectedColumn" @close="selectedColumn = null" />
			</div>
		</n-modal>
	</div>
</template>

<script lang="ts" setup>
import type { Column, Task } from "@/mock/kanban"
import { NModal } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import draggable from "vuedraggable"
import ColumnEditor from "@/components/apps/Kanban/ColumnEditor.vue"
import TaskCard from "@/components/apps/Kanban/TaskCard.vue"
import TaskEditor from "@/components/apps/Kanban/TaskEditor.vue"
import Icon from "@/components/common/Icon.vue"
import LtrContext from "@/components/common/LtrContext.vue"
import { useHideLayoutFooter } from "@/composables/useHideLayoutFooter"
import { getTask } from "@/mock/kanban"
import { isMobile } from "@/utils"
import dayjs from "@/utils/dayjs"

const AddIcon = "carbon:add-alt"
const PanIcon = "carbon:pan-horizontal"
const EditIcon = "uil:edit-alt"

const selectedTask = ref<Task | null>(null)
const selectedColumn = ref<Column | null>(null)
const cardAnimation = ref(true)

const showTaskEditor = computed({ get: () => selectedTask.value !== null, set: () => (selectedTask.value = null) })
const showColumnEditor = computed({
	get: () => selectedColumn.value !== null,
	set: () => (selectedColumn.value = null)
})

const columns = ref(getTask())

function selectTask(task: Task) {
	selectedTask.value = task
}
function selectColumn(column: Column) {
	selectedColumn.value = column
}

function addColumn() {
	columns.value.push({
		id: `${Date.now()}`,
		title: "Untitled",
		tasks: []
	})
}

function addTask(column: Column) {
	column.tasks.push({
		id: `${Date.now()}`,
		title: "Untitled",
		date: dayjs().toDate(),
		dateText: dayjs().format("HH:mm")
	})
}

// :has() CSS relational pseudo-class not yet supported by Firefox
// (https://caniuse.com/css-has)
// at the moment this worker around permit to hide Layout Footer
useHideLayoutFooter()

onMounted(() => {
	setTimeout(() => {
		cardAnimation.value = false
	}, 1000)
})
</script>

<style lang="scss" scoped>
.page {
	.column {
		background-color: var(--bg-secondary-color);
		margin-left: 14px;
		width: 70vw;
		max-width: 320px;
		min-width: 300px;
		margin-top: 2px;
		margin-bottom: 20px;
		border-radius: var(--border-radius);
		border: 1px solid var(--border-color);
		padding: 10px;
		display: inline-block;
		transition: all 0.2s;

		&:first-child {
			margin-left: 0;
		}
		&:last-child {
			margin-right: var(--view-padding);
		}
		&:hover {
			border-color: var(--primary-color);
		}

		.column-header {
			margin-bottom: 10px;

			span {
				cursor: pointer;

				span:first-child {
					i {
						position: relative;
						top: 2px;
					}
				}

				&:hover {
					text-decoration-color: var(--primary-color);
					text-decoration-thickness: 2px;
				}
			}
		}

		.pan-area {
			cursor: ew-resize;
		}

		.add-task-btn {
			background-color: rgba(var(--primary-color-rgb) / 0.1);
			width: 100%;
			height: 50px;
			border-radius: var(--border-radius-small);
			font-size: 16px;
			color: var(--primary-color);
			margin-top: 10px;
			gap: 10px;
		}
	}

	.spacer {
		width: calc(var(--view-padding) * 2);
	}

	.ghost-column,
	.ghost-card {
		box-shadow: 0px 0px 0px 2px var(--primary-color);
		opacity: 0.5;
	}
}
</style>

<style lang="scss">
.route-Apps-Kanban {
	.view.boxed {
		max-width: initial !important;

		.page {
			.columns-scroll {
				max-width: var(--boxed-width);
				margin: 0 auto;
			}
		}
	}
	.columns-wrap {
		padding: 0 var(--view-padding);
	}
}
</style>
