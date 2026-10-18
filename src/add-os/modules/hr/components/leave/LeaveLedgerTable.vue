<!-- src/add-os/modules/hr/components/leave/LeaveLedgerTable.vue -->
<template>
	<div class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center gap-3">
			<n-select v-model:value="typeId" :options="typeOptions" :placeholder="t('hrLeave.ledger.allTypes')" clearable class="max-w-xs" />
		</div>
		<n-alert v-if="error" type="error" :title="t('hr.common.loadError')" />
		<n-data-table :columns :data="rows" :loading :bordered="false" size="small" :scroll-x="720">
			<template #empty>
				<span class="text-secondary">{{ t("hrLeave.ledger.empty") }}</span>
			</template>
		</n-data-table>
		<div v-if="lastPage > 1" class="flex justify-center">
			<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
		</div>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { LeaveTypeRef, LedgerEntry } from "@/add-os/modules/hr/types/leave"
import type { Paginated } from "@/add-os/services/pagination"
import { NAlert, NDataTable, NPagination, NSelect } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { leaveAmount } from "@/add-os/modules/hr/utils/leave"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { formatDate } from "@/add-os/utils/format"

/**
 * Every movement on a leave balance, oldest first: openings, accruals,
 * usage, reversals, adjustments, expiries, encashments. `load` is the
 * employee's ledger (HR) or one's own (hr/me); `types` names the types.
 */
const props = defineProps<{
	load: (filters: { page: number; leave_type_id: number | null }) => Promise<Paginated<LedgerEntry>>
	types: LeaveTypeRef[]
}>()

const { t } = useI18n()

const rows = ref<LedgerEntry[]>([])
const loading = ref(true)
const error = ref(false)
const page = ref(1)
const lastPage = ref(1)
const typeId = ref<number | null>(null)

async function reload() {
	loading.value = true
	error.value = false
	try {
		const result = await props.load({ page: page.value, leave_type_id: typeId.value })
		rows.value = result.data
		lastPage.value = result.meta.last_page
	} catch (e) {
		error.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

onMounted(reload)
watch(page, reload)
watch(typeId, () => {
	if (page.value === 1) void reload()
	else page.value = 1
})

defineExpose({ reload })

const typeOptions = computed<SelectOption[]>(() => props.types.map(type => ({ label: translated(type.name), value: type.id })))
const typeOf = (id: number) => props.types.find(type => type.id === id)

const columns = computed<DataTableColumns<LedgerEntry>>(() => [
	{ title: t("hrLeave.ledger.date"), key: "effective_on", minWidth: 110, render: row => formatDate(row.effective_on) },
	{ title: t("hrLeave.ledger.type"), key: "leave_type_id", minWidth: 140, render: row => translated(typeOf(row.leave_type_id)?.name) || EMPTY },
	{ title: t("hrLeave.ledger.kind"), key: "kind", minWidth: 120, render: row => t(`hrLeave.ledgerKind.${row.kind}`) },
	{
		title: t("hrLeave.ledger.amount"),
		key: "amount",
		minWidth: 110,
		className: "add-numeric",
		render: row => {
			const unit = typeOf(row.leave_type_id)?.unit ?? "day"
			const sign = row.amount.startsWith("-") ? "" : "+"
			return `${sign}${leaveAmount(t, row.amount, unit)}`
		}
	},
	{ title: t("hrLeave.ledger.year"), key: "period_year", minWidth: 80, render: row => String(row.period_year) },
	{ title: t("hrLeave.ledger.notes"), key: "notes", minWidth: 200, ellipsis: { tooltip: true }, render: row => row.notes || EMPTY }
])
</script>
