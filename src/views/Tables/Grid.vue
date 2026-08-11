<template>
	<div class="page page-wrapped flex flex-col">
		<div class="page-header">
			<div class="title">RevoGrid</div>
			<div class="links">
				<a
					href="https://revolist.github.io/revogrid/"
					target="_blank"
					alt="docs"
					rel="nofollow noopener noreferrer"
				>
					<Icon :name="ExternalIcon" :size="16" />
					docs
				</a>
			</div>
		</div>

		<div class="components-list scrollbar-styled grow">
			<n-card class="card" content-class="p-0!">
				<v-grid
					v-if="mounted"
					class="grid-component"
					auto-size-column
					:source
					:columns
					:column-types
					:pinned-top-rows
					:pinned-bottom-rows
					filter
					:theme
					resize
					range
					row-class="highlighted"
				/>
				<n-spin v-else class="h-full w-full" />
			</n-card>
		</div>
	</div>
</template>

<script setup lang="js">
import { NCard, NSpin } from "naive-ui"
import { computed, ref } from "vue"
import Icon from "@/components/common/Icon.vue"
import { useThemeStore } from "@/stores/theme"
import { generateFakeDataDemo } from "./grid-assets/dataGenerate"
import people from "./grid-assets/peopleSample"
import PluginDate from "./grid-assets/plugin-date"
import PluginSelect from "./grid-assets/plugin-select"

const ExternalIcon = "tabler:external-link"

const mounted = ref(false)
const VGrid = defineAsyncComponent(() => import("@revolist/vue3-datagrid"))
const data = generateFakeDataDemo(people, 50, window.innerWidth > 700)
const dataSource = data.source
const dataColumns = data.columns

const columnTypes = ref({})
const themeStore = useThemeStore()

const source = ref(dataSource)
const pinnedBottomRows = ref([])
const columns = ref(dataColumns)
const pinnedTopRows = ref([])

const theme = computed(() => (themeStore.isThemeDark ? "darkMaterial" : "material"))

onMounted(async () => {
	const importPluginNumeral = () => import("@revolist/revogrid-column-numeral")

	const PluginNumeral = (await importPluginNumeral()).default

	const select = new PluginSelect()
	const numeric = new PluginNumeral()
	const date = new PluginDate()

	columnTypes.value = {
		select,
		numeric,
		date
	}

	const duration = 1000 * themeStore.routerTransitionDuration
	const gap = 500

	// TIMEOUT REQUIRED BY PAGE ANIMATION
	setTimeout(() => {
		mounted.value = true
	}, duration + gap)
})
</script>

<style scoped lang="scss">
.page {
	.components-list {
		grid-template-columns: none;

		.card {
			height: 100%;
			width: 100%;
			overflow: hidden;
		}

		:deep() {
			revo-grid {
				height: 100%;
			}

			.temp-bg-range {
				display: initial !important;
			}

			.draggable-wrapper {
				background: #fff;
				color: black;
			}

			revogr-edit {
				background: #fff;
				color: black;
				border: 2px dashed rgba(var(--primary-color-rgb) / 0.5);

				input {
					margin: 0px 15px;
					width: calc(100% - 30px);
					height: 100%;
				}
			}

			.bubble {
				color: #fff;
				border: none;
				cursor: default;
				height: 32px;
				display: inline-flex;
				outline: 0;
				padding: 0 10px;
				font-size: 0.8125rem;
				box-sizing: border-box;
				transition:
					background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0ms,
					box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0ms;
				align-items: center;
				white-space: nowrap;
				border-radius: 16px;
				vertical-align: middle;
				justify-content: center;
				text-decoration: none;
				background-color: #e0e0e0;
				opacity: 0.7;
			}
		}
	}
}
</style>
