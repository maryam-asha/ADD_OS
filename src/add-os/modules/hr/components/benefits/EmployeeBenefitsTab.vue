<template>
	<div class="flex flex-col gap-4">
		<HrPanel :title="t('hrBenefits.held.title')" :subtitle="t('hrBenefits.held.subtitle')" icon="carbon:gift" flush class="add-ledger-table">
			<template #extra>
				<div class="flex flex-wrap items-center gap-2">
					<n-date-picker v-model:formatted-value="asOf" value-format="yyyy-MM-dd" type="date" :clearable="false" size="small" class="w-40" :aria-label="t('hrPayroll.endOfService.asOf')" />
					<n-button v-if="mayManage" size="small" type="primary" @click="assignVisible = true">
						<template #icon><Icon name="carbon:add" :size="16" /></template>
						{{ t("hrBenefits.assignments.add") }}
					</n-button>
				</div>
			</template>
			<n-alert v-if="loadError" type="error" :title="loadError" class="m-3" />
			<n-data-table :columns :data="data?.benefits ?? []" :loading :bordered="false" size="small" :scroll-x="680">
				<template #empty>
					<span class="text-secondary">{{ t("hrBenefits.held.empty") }}</span>
				</template>
			</n-data-table>
		</HrPanel>

		<HrPanel :title="t('hrBenefits.grants.title')" :subtitle="t('hrBenefits.held.latestGrants')" icon="carbon:delivery-parcel" flush class="add-ledger-table">
			<GrantsTable :grants="data?.grants ?? []" :loading show-benefit :may-manage @changed="load" />
		</HrPanel>

		<AssignmentModal v-if="mayManage" v-model:show="assignVisible" :benefits :employee-id @saved="load" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Benefit, EmployeeBenefits } from "@/add-os/modules/hr/types/benefits"
import { NAlert, NButton, NDataTable, NDatePicker } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canManageBenefits } from "@/add-os/config/permissions"
import AssignmentModal from "@/add-os/modules/hr/components/benefits/AssignmentModal.vue"
import GrantsTable from "@/add-os/modules/hr/components/benefits/GrantsTable.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { benefitValue } from "@/add-os/modules/hr/utils/benefits"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { employeeBenefits, listBenefits } from "@/add-os/services/hr/benefits"
import { formatDate } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The benefits an employee holds on a day — each with the assignment that
 * decides it (their own, their grade's or their unit's) and its value
 * there — and their latest grants. Read with hr.benefits.view; giving one
 * to this employee, or taking one away from them alone, needs
 * hr.benefits.manage.
 */
const props = defineProps<{ employeeId: number }>()

const { t } = useI18n()
const mayManage = canManageBenefits()

const asOf = ref(todayIso())
const data = ref<EmployeeBenefits | null>(null)
const benefits = ref<Benefit[]>([])
const loading = ref(true)
const loadError = ref("")
const assignVisible = ref(false)

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		data.value = await employeeBenefits(props.employeeId, asOf.value)
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

watch(asOf, load)

onMounted(() => {
	void load()
	if (mayManage) void quietly(listBenefits, list => (benefits.value = list))
})

type Held = EmployeeBenefits["benefits"][number]

/** Where the benefit comes from: the employee's own assignment, or their grade's or unit's by name. */
function source(row: Held): string {
	if (row.target === "employee") return t("hrBenefits.held.ownAssignment")
	const name = translated(row.target === "grade" ? row.job_grade?.name : row.org_unit?.name)
	return `${t(`hrBenefits.target.${row.target}`)}${name ? ` · ${name}` : ""}`
}

const columns = computed<DataTableColumns<Held>>(() => [
	{ title: t("hrBenefits.benefit"), key: "benefit", minWidth: 180, render: row => h("span", { class: "font-semibold" }, translated(row.benefit.name)) },
	{ title: t("hrBenefits.kindLabel"), key: "kind", minWidth: 130, render: row => t(`hrBenefits.kind.${row.benefit.kind}`) },
	{ title: t("hrBenefits.amount"), key: "amount", minWidth: 120, render: row => h("span", { class: "add-numeric" }, benefitValue(t, row.amount ?? row.benefit.amount, row.benefit.currency, row.benefit.unit)) },
	{ title: t("hrBenefits.held.source"), key: "target", minWidth: 180, render: source },
	{ title: t("hrPayroll.rateTables.from"), key: "effective_from", minWidth: 110, render: row => formatDate(row.effective_from) },
	{ title: t("hrPayroll.rateTables.to"), key: "effective_to", minWidth: 110, render: row => (row.effective_to ? formatDate(row.effective_to) : EMPTY) }
])
</script>
