<!-- src/add-os/modules/hr/views/leave/LeaveSettingsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.hrLeaveSettings") }}</h1>
			<p class="max-w-3xl">{{ t("hrLeave.settings.description") }}</p>
		</div>

		<n-tabs v-model:value="tab" type="line" animated>
			<n-tab-pane name="types" :tab="t('hrLeave.settings.tabs.types')" display-directive="show:lazy">
				<HrResourcePanel
					:api="typesApi"
					:columns="typeColumns"
					:fields="typeFields"
					:empty-form="emptyLeaveTypeForm"
					:to-form="typeToForm"
					:to-payload="typeToPayload"
					:can-manage="mayManage"
					:description="t('hrLeave.types.description')"
					:labels="{
						add: t('hrLeave.types.add'),
						createTitle: t('hrLeave.types.add'),
						editTitle: t('hrLeave.types.edit'),
						created: t('hrLeave.types.created'),
						updated: t('hrLeave.types.updated'),
						deleted: t('hrLeave.types.deleted'),
						deleteWarning: t('hrLeave.types.deleteWarning')
					}"
				/>
			</n-tab-pane>

			<n-tab-pane name="policies" :tab="t('hrLeave.settings.tabs.policies')" display-directive="show:lazy">
				<div class="flex flex-col gap-4">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<p class="max-w-3xl">{{ t("hrLeave.policies.description") }}</p>
						<n-button v-if="mayManage" type="primary" class="ms-auto" @click="openPolicy(null)">
							<template #icon><Icon name="carbon:add" :size="16" /></template>
							{{ t("hrLeave.policies.add") }}
						</n-button>
					</div>
					<n-alert v-if="policiesError" type="error" :title="t('hr.common.loadError')" />
					<n-card class="add-ledger-table">
						<n-data-table :columns="policyColumns" :data="policies" :loading="policiesLoading" :bordered="false" size="small" :scroll-x="900">
							<template #empty>
								<span class="text-secondary">{{ t("hrLeave.policies.empty") }}</span>
							</template>
						</n-data-table>
					</n-card>
				</div>
			</n-tab-pane>

			<n-tab-pane name="holidays" :tab="t('hrLeave.settings.tabs.holidays')" display-directive="show:lazy">
				<HrResourcePanel
					:api="holidaysApi"
					:columns="holidayColumns"
					:fields="holidayFields"
					:empty-form="emptyHolidayForm"
					:to-form="holidayToForm"
					:to-payload="holidayToPayload"
					:can-manage="mayManage"
					:description="t('hrLeave.holidays.description')"
					:labels="{
						add: t('hrLeave.holidays.add'),
						createTitle: t('hrLeave.holidays.add'),
						editTitle: t('hrLeave.holidays.edit'),
						created: t('hrLeave.holidays.created'),
						updated: t('hrLeave.holidays.updated'),
						deleted: t('hrLeave.holidays.deleted')
					}"
				/>
			</n-tab-pane>

			<n-tab-pane name="coverage" :tab="t('hrLeave.settings.tabs.coverage')" display-directive="show:lazy">
				<HrResourcePanel
					:api="coverageApi"
					:columns="coverageColumns"
					:fields="coverageFields"
					:empty-form="emptyCoverageForm"
					:to-form="coverageToForm"
					:to-payload="coverageToPayload"
					:can-manage="mayManage"
					:description="t('hrLeave.coverage.description')"
					:labels="{
						add: t('hrLeave.coverage.add'),
						createTitle: t('hrLeave.coverage.add'),
						editTitle: t('hrLeave.coverage.edit'),
						created: t('hrLeave.coverage.created'),
						updated: t('hrLeave.coverage.updated'),
						deleted: t('hrLeave.coverage.deleted')
					}"
				/>
			</n-tab-pane>
		</n-tabs>

		<LeavePolicyModal v-if="mayManage" v-model:show="policyVisible" :policy="editingPolicy" :types="leaveTypes" :grades :units @saved="loadPolicies" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { CoverageForm, HolidayForm, LeaveTypeForm } from "@/add-os/modules/hr/config/leave.config"
import type { JobGrade, OrgUnit, Position } from "@/add-os/modules/hr/types/hr"
import type { CoverageRule, CoverageRulePayload, Holiday, HolidayPayload, LeavePolicy, LeaveType, LeaveTypePayload } from "@/add-os/modules/hr/types/leave"
import { NAlert, NButton, NCard, NDataTable, NTabPane, NTabs, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageHrSettings } from "@/add-os/config/permissions"
import HrResourcePanel from "@/add-os/modules/hr/components/core/HrResourcePanel.vue"
import LeavePolicyModal from "@/add-os/modules/hr/components/leave/LeavePolicyModal.vue"
import {
	buildCoverageColumns,
	buildCoverageFields,
	buildHolidayColumns,
	buildHolidayFields,
	buildLeaveTypeColumns,
	buildLeaveTypeFields,
	emptyCoverageForm,
	emptyHolidayForm,
	emptyLeaveTypeForm
} from "@/add-os/modules/hr/config/leave.config"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { toBilingual, toTranslatable } from "@/add-os/modules/hr/utils/forms"
import { leaveAmount } from "@/add-os/modules/hr/utils/leave"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { listDocumentTypes, listJobGrades, listOrgUnits, listPositions } from "@/add-os/services/hr/core"
import {
	createCoverageRule,
	createHoliday,
	createLeaveType,
	deleteCoverageRule,
	deleteHoliday,
	deleteLeavePolicy,
	deleteLeaveType,
	listCoverageRules,
	listHolidays,
	listLeavePolicies,
	listLeaveTypes,
	updateCoverageRule,
	updateHoliday,
	updateLeaveType
} from "@/add-os/services/hr/leave"
import { formatDate } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Leave types, the policies that give them, public holidays and the
 * coverage rules approvals are checked against. Read with hr.leave.view;
 * changed with hr.settings.manage.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const mayManage = canManageHrSettings()
const tab = ref<"types" | "policies" | "holidays" | "coverage">("types")

// ── Lookups for the forms and the tables. Each may be refused (another permission); the form then offers fewer choices.
const leaveTypes = ref<LeaveType[]>([])
const grades = ref<JobGrade[]>([])
const units = ref<OrgUnit[]>([])
const positions = ref<Position[]>([])
const documentTypeOptions = ref<SelectOption[]>([])

onMounted(() => {
	void quietly(listLeaveTypes, v => (leaveTypes.value = v))
	void quietly(listJobGrades, v => (grades.value = v))
	void quietly(listOrgUnits, v => (units.value = v))
	void quietly(listPositions, v => (positions.value = v))
	void quietly(listDocumentTypes, v => (documentTypeOptions.value = v.filter(d => d.is_active).map(d => ({ label: translated(d.name), value: d.id }))))
	void loadPolicies()
})

// ── Types ───────────────────────────────────────────────────────────────────
const typesApi = {
	list: async () => (leaveTypes.value = await listLeaveTypes()),
	create: createLeaveType,
	update: updateLeaveType,
	remove: deleteLeaveType
}
const typeColumns = computed(() => buildLeaveTypeColumns(t))
const typeFields = computed(() => buildLeaveTypeFields(t, documentTypeOptions.value))
function typeToForm(row: LeaveType): LeaveTypeForm {
  return {
	code: row.code,
	name: toBilingual(row.name),
	unit: row.unit,
	is_paid: row.is_paid,
	tracks_balance: row.tracks_balance,
	allows_half_day: row.allows_half_day,
	counts_calendar_days: row.counts_calendar_days,
	hide_reason: row.hide_reason,
	attachment_document_type_id: row.attachment_document_type_id,
	is_active: row.is_active,
	editing: true
}
}
function typeToPayload(f: LeaveTypeForm): LeaveTypePayload {
  return {
	code: f.code.trim(),
	name: toTranslatable(f.name),
	unit: f.unit,
	is_paid: f.is_paid,
	tracks_balance: f.tracks_balance,
	allows_half_day: f.unit === "day" && f.allows_half_day,
	counts_calendar_days: f.unit === "day" && f.counts_calendar_days,
	hide_reason: f.hide_reason,
	attachment_document_type_id: f.attachment_document_type_id,
	is_active: f.is_active
}
}

// ── Policies ────────────────────────────────────────────────────────────────
const policies = ref<LeavePolicy[]>([])
const policiesLoading = ref(true)
const policiesError = ref(false)
const policyVisible = ref(false)
const editingPolicy = ref<LeavePolicy | null>(null)

async function loadPolicies() {
	policiesLoading.value = true
	policiesError.value = false
	try {
		policies.value = await listLeavePolicies()
	} catch (e) {
		policiesError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		policiesLoading.value = false
	}
}

function openPolicy(policy: LeavePolicy | null) {
	editingPolicy.value = policy
	policyVisible.value = true
}

function confirmDeletePolicy(policy: LeavePolicy) {
	dialog.warning({
		title: t("hrLeave.policies.delete"),
		content: t("hrLeave.policies.deleteConfirm"),
		positiveText: t("hr.common.delete"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			try {
				await deleteLeavePolicy(policy.id)
				message.success(t("hrLeave.policies.deleted"))
				await loadPolicies()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

const typeOf = (id: number) => leaveTypes.value.find(type => type.id === id)

/** Who a policy covers: every limit it sets, or everyone. */
function scopeOf(policy: LeavePolicy): string {
	const parts = [
		...(policy.contract_types ?? []).map(c => t(`hr.contractType.${c}`)),
		...(policy.job_grade_ids ?? []).map(id => grades.value.find(g => g.id === id)?.code ?? `#${id}`),
		...(policy.org_unit_ids ?? []).map(id => translated(units.value.find(u => u.id === id)?.name) || `#${id}`)
	]
	return parts.length ? parts.join("، ") : t("hrLeave.policies.everyone")
}

const policyColumns = computed<DataTableColumns<LeavePolicy>>(() => [
	{ title: t("hrLeave.request.type"), key: "leave_type_id", minWidth: 140, render: row => translated(typeOf(row.leave_type_id)?.name) || EMPTY },
	{ title: t("hrApprovals.flows.name"), key: "name", minWidth: 140, render: row => translated(row.name) || EMPTY },
	{
		title: t("hrLeave.policies.effective"),
		key: "effective_from",
		minWidth: 190,
		render: row => (row.effective_to ? `${formatDate(row.effective_from)} – ${formatDate(row.effective_to)}` : t("hr.career.since", { date: formatDate(row.effective_from) }))
	},
	{ title: t("hrLeave.policies.accrualMethod"), key: "accrual_method", minWidth: 120, render: row => t(`hrLeave.accrual.${row.accrual_method}`) },
	{
		title: t("hrLeave.policies.annualEntitlement"),
		key: "annual_entitlement",
		minWidth: 120,
		className: "add-numeric",
		render: row => leaveAmount(t, row.annual_entitlement, typeOf(row.leave_type_id)?.unit ?? "day")
	},
	{ title: t("hrLeave.policies.appliesTo"), key: "scope", minWidth: 200, ellipsis: { tooltip: true }, render: scopeOf },
	...(mayManage
		? [
				{
					title: t("hr.employees.columns.actions"),
					key: "actions",
					width: 100,
					align: "center" as const,
					render: (row: LeavePolicy) =>
						h("div", { class: "flex justify-center gap-3" }, [
							h(NButton, { text: true, type: "primary", "aria-label": t("hr.common.edit"), title: t("hr.common.edit"), onClick: () => openPolicy(row) }, { icon: () => h(Icon, { name: "carbon:edit", size: 18 }) }),
							h(
								NButton,
								{ text: true, type: "error", "aria-label": t("hr.common.delete"), title: t("hr.common.delete"), onClick: () => confirmDeletePolicy(row) },
								{ icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }
							)
						])
				}
			]
		: [])
])

// ── Holidays ────────────────────────────────────────────────────────────────
const holidaysApi = { list: () => listHolidays(), create: createHoliday, update: updateHoliday, remove: deleteHoliday }
const holidayColumns = computed(() => buildHolidayColumns(t))
const holidayFields = computed(() => buildHolidayFields(t))
const holidayToForm = (row: Holiday): HolidayForm => ({ name: toBilingual(row.name), starts_on: row.starts_on, ends_on: row.ends_on, recurs_annually: row.recurs_annually })
const holidayToPayload = (f: HolidayForm): HolidayPayload => ({ name: toTranslatable(f.name), starts_on: f.starts_on, ends_on: f.ends_on, recurs_annually: f.recurs_annually })

// ── Coverage ────────────────────────────────────────────────────────────────
const coverageApi = { list: listCoverageRules, create: createCoverageRule, update: updateCoverageRule, remove: deleteCoverageRule }
const unitOptions = computed<SelectOption[]>(() => units.value.map(u => ({ label: translated(u.name), value: u.id })))
const positionOptions = computed<SelectOption[]>(() =>
	positions.value.map(p => ({ label: `${translated(p.title)} · ${translated(units.value.find(u => u.id === p.org_unit_id)?.name)}`, value: p.id }))
)
function coverageScope(rule: CoverageRule): string {
	if (rule.org_unit_id) return `${t("hr.hire.orgUnit")}: ${translated(units.value.find(u => u.id === rule.org_unit_id)?.name) || `#${rule.org_unit_id}`}`
	if (rule.position_id) return `${t("hr.hire.position")}: ${translated(positions.value.find(p => p.id === rule.position_id)?.title) || `#${rule.position_id}`}`
	return ""
}
const coverageColumns = computed(() => buildCoverageColumns(t, coverageScope))
const coverageFields = computed(() => buildCoverageFields(unitOptions.value, positionOptions.value))
const coverageToForm = (row: CoverageRule): CoverageForm => ({ org_unit_id: row.org_unit_id, position_id: row.position_id, min_present: row.min_present, is_active: row.is_active, editing: true })
function coverageToPayload(f: CoverageForm): CoverageRulePayload {
  return {
	...(f.editing ? {} : { org_unit_id: f.org_unit_id, position_id: f.position_id }),
	min_present: f.min_present ?? 1,
	is_active: f.is_active
}
}
</script>
