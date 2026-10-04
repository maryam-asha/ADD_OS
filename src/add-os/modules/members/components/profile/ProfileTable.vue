<!-- src/add-os/modules/members/components/profile/ProfileTable.vue -->
<!--
	One tab of the member profile: a filter bar (select filters and an
	optional day range) over a server-paginated table. Every tab is the same
	shape — only what it loads and how its rows look differ — so each tab is
	this component with its own `load` and `columns`.
-->
<template>
	<div class="flex flex-col gap-4">
		<div v-if="filters.length || dateRange" class="flex flex-wrap items-center gap-3">
			<div v-for="filter in filters" :key="filter.key" class="w-44 shrink-0">
				<n-select
					v-model:value="values[filter.key]"
					:options="filter.options"
					:placeholder="filter.placeholder"
					clearable
					size="small"
					class="w-full"
				/>
			</div>
			<n-date-picker
				v-if="dateRange"
				v-model:formatted-value="range"
				type="daterange"
				value-format="yyyy-MM-dd"
				clearable
				size="small"
				class="w-64 shrink-0"
			/>
			<span class="text-xs text-stone-500 ms-auto">{{ t("memberProfile.resultCount", { count: formatNumber(total) }) }}</span>
		</div>

		<n-alert v-if="failed" type="error" :bordered="false">{{ t("memberProfile.loadError") }}</n-alert>

		<n-data-table
			remote
			:columns
			:data="rows"
			:loading="isLoading"
			:bordered="false"
			:row-key
			:pagination
			size="small"
			@update:page="onPage"
		/>
	</div>
</template>

<script setup lang="ts" generic="T extends object">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { Paginated } from "@/add-os/services/pagination"
import { NAlert, NDataTable, NDatePicker, NSelect } from "naive-ui"
import { computed, onMounted, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import { formatNumber } from "@/add-os/utils/format"

export interface ProfileFilter {
	/** The query key the server reads, e.g. `status`. */
	key: string
	placeholder: string
	options: SelectOption[]
}

const props = withDefaults(defineProps<{
	load: (query: Record<string, unknown>) => Promise<Paginated<T>>
	columns: DataTableColumns<T>
	rowKey: (row: T) => string | number
	filters?: ProfileFilter[]
	/** Adds a day range, sent as `from`/`to` (Y-m-d). */
	dateRange?: boolean
	pageSize?: number
}>(), { filters: () => [], dateRange: false, pageSize: 15 })

const { t } = useI18n()

const values = reactive<Record<string, string | number | null>>({})
const range = ref<[string, string] | null>(null)
const rows = ref<T[]>([])
const total = ref(0)
const page = ref(1)
const isLoading = ref(false)
const failed = ref(false)
/** Only the newest request may land: an older answer is for filters no longer chosen. */
let request = 0

const pagination = computed(() => ({
	page: page.value,
	pageSize: props.pageSize,
	itemCount: total.value
}))

async function fetchPage(): Promise<void> {
	const current = ++request
	isLoading.value = true
	failed.value = false

	const query: Record<string, unknown> = { page: page.value, per_page: props.pageSize }
	for (const [key, value] of Object.entries(values)) {
		if (value !== null && value !== undefined && value !== "") query[key] = value
	}
	if (range.value) {
		query.from = range.value[0]
		query.to = range.value[1]
	}

	try {
		const result = await props.load(query)
		if (current !== request) return
		rows.value = result.data
		total.value = result.meta.total
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (current === request) failed.value = true
	} finally {
		if (current === request) isLoading.value = false
	}
}

function onPage(next: number): void {
	page.value = next
	void fetchPage()
}

// A new filter starts again from the first page.
watch([values, range], () => {
	page.value = 1
	void fetchPage()
}, { deep: true })

onMounted(fetchPage)

defineExpose({ rows, total, reload: fetchPage })
</script>
