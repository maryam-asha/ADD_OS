<template>
	<div class="action-toolbar flex items-center">
		<div class="flex">
			<n-checkbox
				:checked="checkControl === 1"
				:indeterminate="checkControl === 2"
				size="large"
				@click="toggleCheckAll()"
			/>
		</div>
		<div v-if="checkControl" class="flex grow items-center gap-3">
			<n-tooltip>
				<template #trigger>
					<n-button text>
						<Icon :size="20" :name="TrashIcon" />
					</n-button>
				</template>
				<span>Delete</span>
			</n-tooltip>

			<n-tooltip>
				<template #trigger>
					<n-button text>
						<Icon :size="20" :name="LabelOutIcon" />
					</n-button>
				</template>
				<span>Add label</span>
			</n-tooltip>
			<n-tooltip>
				<template #trigger>
					<n-button text>
						<Icon :size="20" :name="FolderIcon" />
					</n-button>
				</template>
				<span>Move to folder</span>
			</n-tooltip>
			<n-tooltip>
				<template #trigger>
					<n-button text>
						<Icon :size="20" :name="StarredIcon" />
					</n-button>
				</template>
				<span>Star</span>
			</n-tooltip>
		</div>
		<div v-if="!checkControl" class="search-box flex grow">
			<n-input v-model:value="search" placeholder="Search..." clearable size="medium">
				<template #prefix>
					<Icon :name="SearchIcon" />
				</template>
			</n-input>
		</div>
		<div v-if="!checkControl" class="flex justify-center opacity-50">
			<n-button text>
				<Icon :size="18" :name="RefreshIcon" />
			</n-button>
		</div>
		<div v-if="!checkControl" class="menu-btn flex justify-center opacity-50">
			<n-button text @click="sidebarOpen = true">
				<Icon :size="24" :name="MenuIcon" />
			</n-button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onClickOutside } from "@vueuse/core"
import { NButton, NCheckbox, NInput, NTooltip } from "naive-ui"
import { ref } from "vue"
import Icon from "@/components/common/Icon.vue"

const { checkControl } = defineProps<{
	checkControl: number
}>()

const emit = defineEmits<{
	(e: "toggleCheckAll"): void
}>()

const search = defineModel<string>("search", { default: "" })

const StarredIcon = "carbon:star"
const TrashIcon = "carbon:trash-can"
const LabelOutIcon = "carbon:bookmark"
const MenuIcon = "ion:menu-sharp"
const SearchIcon = "carbon:search"
const FolderIcon = "carbon:folder-move-to"
const RefreshIcon = "ion:reload"

const sidebarOpen = ref(false)

const sidebar = ref(null)
onClickOutside(sidebar, () => (sidebarOpen.value = false))

function toggleCheckAll() {
	emit("toggleCheckAll")
}
</script>

<style lang="scss" scoped>
.action-toolbar {
	gap: 18px;

	.menu-btn,
	.new-btn {
		display: none;
	}

	.search-box {
		margin: 0px 12px;
		.n-input {
			background-color: transparent;

			:deep() {
				.n-input__border,
				.n-input__state-border {
					display: none;
				}
			}
		}
	}
}
</style>
