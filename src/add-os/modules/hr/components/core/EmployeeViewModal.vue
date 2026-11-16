<!-- src/add-os/modules/hr/components/core/EmployeeViewModal.vue -->
<template>
	<n-modal
		v-model:show="show"
		preset="card"
		closable
		class="hr-form-modal add-print-page"
		:auto-focus="false"
		:segmented="{ content: true, footer: true }"
		:style="{ maxWidth: '52rem', width: '95vw' }"
		content-style="flex: 1 1 auto; min-height: 0; overflow-y: auto;"
		:aria-label="employee ? translated(employee.name) : t('hr.common.view')"
	>
		<!-- Whose file this is, as the file itself opens (EmployeeHero): initials, name and status, job and unit, number. -->
		<template #header>
			<div class="flex min-w-0 items-center gap-4">
				<EmployeeAvatar :name="employee?.name" size="lg" />
				<div v-if="employee" class="flex min-w-0 flex-col gap-1">
					<div class="flex flex-wrap items-center gap-2">
						<h2 class="text-xl font-bold">{{ translated(employee.name) }}</h2>
						<EmployeeStatusTag :status="employee.status" />
					</div>
					<span v-if="role" class="text-sm font-normal text-secondary">{{ role }}</span>
					<span class="font-mono text-xs font-normal text-secondary" dir="ltr">{{ employee.employee_number }}</span>
				</div>
				<n-skeleton v-else-if="!loadError" text class="w-48" />
			</div>
		</template>

		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />
		<n-skeleton v-else-if="!employee" text :repeat="8" />

		<div v-else class="flex flex-col gap-4">
			<!-- The figures first: pay (to holders of hr.payroll.view) and start. -->
			<div class="grid grid-cols-1 gap-4" :class="mayViewPay ? 'sm:grid-cols-2' : ''">
				<HrStatCard
					v-if="mayViewPay"
					:label="t('hr.employeeView.netPay')"
					:value="payValue"
					icon="carbon:money"
					:loading="payLoading"
					data-test="net-pay"
				>
					<span v-if="pay.length" class="add-numeric text-secondary" dir="ltr">{{ pay.map(formula).join(" · ") }}</span>
					<span v-else-if="!payLoading" class="text-secondary">{{ payError ? t("hr.common.loadError") : t("hr.employeeView.noPay") }}</span>
				</HrStatCard>
				<HrStatCard :label="t('hr.profile.fields.hiredOn')" :value="formatDate(employee.hired_on)" icon="carbon:calendar" :hint="startHint" text-value />
			</div>

			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<HrPanel v-for="group in groups" :key="group.title" :title="group.title" :icon="group.icon">
					<n-descriptions :column="1" label-placement="left" size="small">
						<n-descriptions-item v-for="row in group.rows" :key="row.label" :label="row.label">
							<span :dir="row.ltr ? 'ltr' : undefined">{{ row.value }}</span>
						</n-descriptions-item>
					</n-descriptions>
				</HrPanel>
			</div>
		</div>

		<template v-if="employee" #footer>
			<div class="flex flex-wrap items-center justify-end gap-2 print:hidden">
				<n-button @click="print">
					<template #icon><Icon name="carbon:printer" :size="16" /></template>
					{{ t("hr.employees.print") }}
				</n-button>
				<n-button v-if="mayEdit" @click="go('hr.employeeEdit')">
					<template #icon><Icon name="carbon:edit" :size="16" /></template>
					{{ t("hr.common.edit") }}
				</n-button>
				<n-button type="primary" @click="go('hr.employeeProfile')">
					<template #icon><Icon name="carbon:user-profile" :size="16" /></template>
					{{ t("hr.employeeView.openFile") }}
				</n-button>
			</div>
		</template>
	</n-modal>
</template>

<script setup lang="ts">
import type { Employee } from "@/add-os/modules/hr/types/hr"
import type { NetPay } from "@/add-os/modules/hr/utils/money"
import { NAlert, NButton, NDescriptions, NDescriptionsItem, NModal, NSkeleton } from "naive-ui"
import { computed, nextTick, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { canUpdateEmployees, canViewPayroll } from "@/add-os/config/permissions"
import EmployeeStatusTag from "@/add-os/modules/hr/components/EmployeeStatusTag.vue"
import EmployeeAvatar from "@/add-os/modules/hr/components/ui/EmployeeAvatar.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import HrStatCard from "@/add-os/modules/hr/components/ui/HrStatCard.vue"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { money, netPay } from "@/add-os/modules/hr/utils/money"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { getEmployee } from "@/add-os/services/hr/core"
import { listCompensation } from "@/add-os/services/hr/payroll"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * An employee at a glance, over the employee list, in the HR module's own
 * pieces: the file's header (as EmployeeHero opens the profile), two stat
 * cards — net pay with the sum it comes from (to holders of
 * hr.payroll.view), and the start date — then identity and job & contact as
 * titled panels; from there the full file, the edit page, or paper.
 *
 * Its first version (2026-11-12) copied Bayraq's dark band with a sheet
 * lifted over it. It was replaced the same day, on review: the view should
 * read as ADD, not as a copy of Bayraq. Bayraq's content (net pay and its
 * sum, identity, job and contact) stays; its chrome does not.
 *
 * `printOnOpen` prints the sheet once it has loaded: the list's print
 * action. The dialog carries `.add-print-page`, so printing keeps only it
 * (theme-overrides/_print.scss); it unmounts when closed, so the list never
 * prints as a sheet.
 */
const props = defineProps<{ employeeId: number | null; printOnOpen?: boolean }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const router = useRouter()
const mayViewPay = canViewPayroll()
const mayEdit = canUpdateEmployees()

const employee = ref<Employee | null>(null)
const loadError = ref(false)
const pay = ref<NetPay[]>([])
const payLoading = ref(false)
const payError = ref(false)

async function loadPay(id: number) {
	payLoading.value = true
	payError.value = false
	try {
		pay.value = netPay(await listCompensation(id), todayIso())
	} catch (e) {
		payError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		payLoading.value = false
	}
}

async function load(id: number) {
	employee.value = null
	loadError.value = false
	pay.value = []
	const payLoaded = mayViewPay ? loadPay(id) : Promise.resolve()
	try {
		employee.value = await getEmployee(id)
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
		return
	}
	await payLoaded
	if (props.printOnOpen && show.value) {
		await nextTick()
		print()
	}
}

watch(
	() => [show.value, props.employeeId] as const,
	([open, id]) => {
		if (open && id) void load(id)
	},
	{ immediate: true }
)

function print() {
	window.print()
}

function go(name: "hr.employeeEdit" | "hr.employeeProfile") {
	if (!employee.value) return
	show.value = false
	void router.push({ name, params: { id: employee.value.id } })
}

/** The job and the unit held now, under the name. */
const role = computed(() => {
	const job = employee.value?.current_assignment
	return [translated(job?.job_title), translated(job?.org_unit?.name)].filter(Boolean).join(" · ")
})

/** Net pay per currency, side by side when there is more than one. */
const payValue = computed(() => (pay.value.length ? pay.value.map(entry => money(entry.net, entry.currency)).join(" · ") : EMPTY))

/** `500 + 500 − 10`: the lines the net pay adds up, in the order they add. */
function formula(entry: NetPay): string {
	const plus = entry.earnings.map(a => formatNumber(a)).join(" + ")
	const minus = entry.deductions.map(a => ` − ${formatNumber(a)}`).join("")
	return `${plus || formatNumber(0)}${minus}`
}

/** Under the start date: the end of probation while it runs, else the confirmation. */
const startHint = computed(() => {
	const e = employee.value
	if (!e) return undefined
	if (e.probation_ends_on && !e.confirmed_on) return `${t("hr.profile.fields.probationEndsOn")}: ${formatDate(e.probation_ends_on)}`
	if (e.confirmed_on) return `${t("hr.profile.fields.confirmedOn")}: ${formatDate(e.confirmed_on)}`
	return undefined
})

interface Row {
	label: string
	value: string
	ltr?: boolean
}

const groups = computed<{ title: string; icon: string; rows: Row[] }[]>(() => {
	const e = employee.value
	if (!e) return []
	const job = e.current_assignment
	return [
		{
			title: t("hr.employeeView.identity"),
			icon: "carbon:user-profile",
			rows: [
				{ label: t("hr.editEmployee.nationality"), value: e.nationality || EMPTY, ltr: true },
				{ label: t("hr.editEmployee.dateOfBirth"), value: e.date_of_birth ? formatDate(e.date_of_birth) : EMPTY },
				{ label: t("hr.editEmployee.gender"), value: e.gender ? t(`hr.gender.${e.gender}`) : EMPTY },
				{ label: t("hr.editEmployee.maritalStatus"), value: e.marital_status ? t(`hr.maritalStatus.${e.marital_status}`) : EMPTY },
				{ label: t("hr.editEmployee.address"), value: e.address || EMPTY }
			]
		},
		{
			title: t("hr.employeeView.jobAndContact"),
			icon: "carbon:portfolio",
			rows: [
				{ label: t("hr.profile.fields.manager"), value: translated(job?.manager?.name) || t("hr.employees.noManager") },
				{ label: t("hr.profile.fields.position"), value: translated(job?.position?.title) || EMPTY },
				{ label: t("hr.profile.fields.employmentType"), value: job ? t(`hr.employmentType.${job.employment_type}`) : EMPTY },
				{ label: t("hr.profile.fields.phone"), value: e.phone || EMPTY, ltr: true },
				{ label: t("hr.profile.fields.workEmail"), value: e.work_email || EMPTY, ltr: true },
				{ label: t("hr.employeeView.account"), value: t(e.user_id ? "hr.employeeView.accountLinked" : "hr.employeeView.accountNone") }
			]
		}
	]
})
</script>
