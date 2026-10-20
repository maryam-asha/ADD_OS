<template>
	<div class="flex flex-col gap-3">
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<HrStatCard :label="t('hrTraining.budgets.balance')" :value="budget ? money(budget.balance, budget.currency) : EMPTY" icon="carbon:wallet" :hint="t('hrTraining.budgets.balanceHint')" :loading />
			<HrStatCard :label="t('hrTraining.budgets.available')" :value="budget ? money(budget.available, budget.currency) : EMPTY" icon="carbon:money" :hint="t('hrTraining.budgets.availableHint')" :loading />
		</div>
		<n-data-table v-if="budget?.entries" :columns :data="budget.entries" :bordered="false" size="small" :scroll-x="560" class="add-ledger-table">
			<template #empty>
				<span class="text-secondary">{{ t("hrTraining.budgets.noEntries") }}</span>
			</template>
		</n-data-table>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { BudgetEntry, LearningBudget } from "@/add-os/modules/hr/types/training"
import { NDataTable } from "naive-ui"
import { computed, h } from "vue"
import { useI18n } from "vue-i18n"
import HrStatCard from "@/add-os/modules/hr/components/ui/HrStatCard.vue"
import { money } from "@/add-os/modules/hr/utils/money"
import { signedMoney } from "@/add-os/modules/hr/utils/training"
import { EMPTY } from "@/add-os/modules/hr/utils/translated"
import { formatDateTime } from "@/add-os/utils/format"

/**
 * One employee's learning budget for a year: the balance (the sum of the
 * ledger), what is available (less the requests still pending), and — on
 * the HR side — each entry with its sign and note.
 */
const props = defineProps<{ budget: LearningBudget | null; loading?: boolean }>()

const { t } = useI18n()

const columns = computed<DataTableColumns<BudgetEntry>>(() => [
	{ title: t("hrTraining.budgets.when"), key: "created_at", minWidth: 150, render: row => (row.created_at ? formatDateTime(row.created_at) : EMPTY) },
	{ title: t("hrTraining.budgets.kind"), key: "kind", minWidth: 110, render: row => t(`hrTraining.entryKind.${row.kind}`) },
	{
		title: t("hrTraining.budgets.amount"),
		key: "amount",
		minWidth: 120,
		render: row => h("span", { class: ["add-numeric font-semibold", row.amount.trim().startsWith("-") ? "text-error" : "text-success"], dir: "ltr" }, signedMoney(row.amount, props.budget?.currency ?? ""))
	},
	{ title: t("hrTraining.budgets.note"), key: "note", minWidth: 180, render: row => row.note || EMPTY }
])
</script>
