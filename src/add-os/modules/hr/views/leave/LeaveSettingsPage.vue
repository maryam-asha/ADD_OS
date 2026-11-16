<!-- src/add-os/modules/hr/views/leave/LeaveSettingsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrLeaveSettings')" :description="t('hrLeave.settings.description')" />

		<!-- Leave types, as Bayraq's: the types as cards, the chosen one edited beside them with its policies under it. -->
		<HrPanel :title="t('hrLeave.settings.tabs.types')" :subtitle="t('hrLeave.types.description')" icon="carbon:calendar">
			<template v-if="mayManage" #extra>
				<n-button type="primary" size="small" @click="selectType(null)">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrLeave.types.add") }}
				</n-button>
			</template>

			<n-alert v-if="typesError" type="error" :title="t('hr.common.loadError')" class="mb-4" />
			<div v-if="typesLoading" class="flex justify-center py-10">
				<n-spin />
			</div>
			<div v-else class="@container">
				<div class="grid grid-cols-1 items-start gap-4 @3xl:grid-cols-[18rem_1fr]">
					<nav class="flex flex-col gap-2" :aria-label="t('hrLeave.settings.tabs.types')">
						<p v-if="!leaveTypes.length" class="text-secondary">{{ t("hrLeave.types.empty") }}</p>
						<button
							v-for="type in leaveTypes"
							:key="type.id"
							type="button"
							class="flex flex-col gap-1 rounded-add-default border p-3 text-start transition-colors"
							:class="selectedTypeId === type.id ? 'border-primary bg-[var(--add-surface-sunken)]' : 'border-[var(--add-border)] hover:bg-[var(--add-surface-sunken)]'"
							:aria-current="selectedTypeId === type.id ? 'true' : undefined"
							@click="selectType(type)"
						>
							<span class="flex items-center justify-between gap-2">
								<span class="font-semibold">{{ translated(type.name) }}</span>
								<ActiveTag :active="type.is_active" />
							</span>
							<span class="text-xs text-secondary">{{ typeSummary(type) }}</span>
						</button>
					</nav>

					<section class="min-w-0 rounded-add-large border border-[var(--add-border)] p-4">
						<LeaveTypeEditor
							v-if="editingType"
							:type="selectedType"
							:document-type-options
							:may-manage
							@saved="onTypeSaved"
							@cancel="editingType = false"
							@delete="confirmDeleteType"
						/>
						<p v-else class="py-8 text-center text-secondary">{{ t("hrLeave.types.chooseOne") }}</p>
					</section>
				</div>
				<section v-if="selectedType" class="mt-4 rounded-add-large border border-[var(--add-border)] p-4">
					<header class="mb-3 flex flex-wrap items-center justify-between gap-3">
						<div class="flex flex-col">
							<h4 class="font-semibold">{{ t("hrLeave.policies.ofType") }}</h4>
							<span class="text-sm text-secondary">{{ t("hrLeave.policies.description") }}</span>
						</div>
						<n-button v-if="mayManage" size="small" @click="openPolicy(null)">
							<template #icon><Icon name="carbon:add" :size="16" /></template>
							{{ t("hrLeave.policies.add") }}
						</n-button>
					</header>
					<n-alert v-if="policiesError" type="error" :title="t('hr.common.loadError')" />
					<n-data-table v-else :columns="policyColumns" :data="typePolicies" :loading="policiesLoading" :bordered="false" size="small" :scroll-x="760">
						<template #empty>
							<span class="text-secondary">{{ t("hrLeave.policies.empty") }}</span>
						</template>
					</n-data-table>
				</section>
			</div>
		</HrPanel>

		<HrPanel :title="t('hrLeave.settings.tabs.holidays')" icon="carbon:calendar-heat-map">
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
		</HrPanel>

		<HrPanel :title="t('hrLeave.settings.tabs.coverage')" icon="carbon:user-multiple">
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
		</HrPanel>

		<LeavePolicyModal v-if="mayManage" v-model:show="policyVisible" :policy="editingPolicy" :types="leaveTypes" :grades :units :leave-type-id="selectedTypeId" @saved="loadPolicies" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { CoverageForm, HolidayForm } from "@/add-os/modules/hr/config/leave.config"
import type { JobGrade, OrgUnit, Position } from "@/add-os/modules/hr/types/hr"
import type { CoverageRule, CoverageRulePayload, Holiday, HolidayPayload, LeavePolicy, LeaveType } from "@/add-os/modules/hr/types/leave"
import { NAlert, NButton, NDataTable, NSpin, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageHrSettings } from "@/add-os/config/permissions"
import ActiveTag from "@/add-os/modules/hr/components/ActiveTag.vue"
import HrResourcePanel from "@/add-os/modules/hr/components/core/HrResourcePanel.vue"
import LeavePolicyModal from "@/add-os/modules/hr/components/leave/LeavePolicyModal.vue"
import LeaveTypeEditor from "@/add-os/modules/hr/components/leave/LeaveTypeEditor.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import {
	buildCoverageColumns,
	buildCoverageFields,
	buildHolidayColumns,
	buildHolidayFields,
	emptyCoverageForm,
	emptyHolidayForm
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
	deleteCoverageRule,
	deleteHoliday,
	deleteLeavePolicy,
	deleteLeaveType,
	listCoverageRules,
	listHolidays,
	listLeavePolicies,
	listLeaveTypes,
	updateCoverageRule,
	updateHoliday
} from "@/add-os/services/hr/leave"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Leave types, the policies that give them, public holidays and the
 * coverage rules approvals are checked against. Read with hr.leave.view;
 * changed with hr.settings.manage. Laid out after Bayraq's leave settings:
 * the types as cards with the chosen one edited beside them
 * (LeaveTypeEditor) and its policies under it, then the holidays and the
 * coverage rules, one panel under the other instead of tabs.
 *
 * f97384d replaced this page with a Bayraq-styled one that saved a fixed
 * document type and a 10-day carry-over nobody entered and hid failed
 * saves; it was restored on 2026-11-09 and given this layout on
 * 2026-11-10. See docs/hr/FORMS-AS-PAGES.md.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const mayManage = canManageHrSettings()

// ── Lookups for the forms and the tables. Each may be refused (another permission); the form then offers fewer choices.
const leaveTypes = ref<LeaveType[]>([])
const grades = ref<JobGrade[]>([])
const units = ref<OrgUnit[]>([])
const positions = ref<Position[]>([])
const documentTypeOptions = ref<SelectOption[]>([])

onMounted(() => {
	void loadTypes()
	void quietly(listJobGrades, v => (grades.value = v))
	void quietly(listOrgUnits, v => (units.value = v))
	void quietly(listPositions, v => (positions.value = v))
	void quietly(listDocumentTypes, v => (documentTypeOptions.value = v.filter(d => d.is_active).map(d => ({ label: translated(d.name), value: d.id }))))
	void loadPolicies()
})

// ── Types ───────────────────────────────────────────────────────────────────
const typesLoading = ref(true)
const typesError = ref(false)
/** The type in the editor: an id, or null with `editingType` for a new one. */
const selectedTypeId = ref<number | null>(null)
const editingType = ref(false)
const selectedType = computed(() => leaveTypes.value.find(type => type.id === selectedTypeId.value) ?? null)

async function loadTypes() {
	typesLoading.value = true
	typesError.value = false
	try {
		leaveTypes.value = await listLeaveTypes()
		if (selectedTypeId.value !== null && !selectedType.value) {
			selectedTypeId.value = null
			editingType.value = false
		}
	} catch (e) {
		typesError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		typesLoading.value = false
	}
}

function selectType(type: LeaveType | null) {
	selectedTypeId.value = type?.id ?? null
	editingType.value = true
}

/** A new type stays open in the editor once saved, ready for its first policy. */
async function onTypeSaved(id: number | null) {
	await loadTypes()
	if (id !== null) selectedTypeId.value = id
}

function confirmDeleteType(type: LeaveType) {
	dialog.warning({
		title: t("hrLeave.types.delete"),
		content: t("hrLeave.types.deleteConfirm", { name: translated(type.name) }),
		positiveText: t("hr.common.delete"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			try {
				await deleteLeaveType(type.id)
				message.success(t("hrLeave.types.deleted"))
				selectedTypeId.value = null
				editingType.value = false
				await loadTypes()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

/** What a card says under the name: the unit, paid or not, against a balance or not. */
function typeSummary(type: LeaveType): string {
	return [t(`hrLeave.unit.${type.unit}`), type.is_paid ? t("hrLeave.types.isPaid") : t("hrLeave.types.unpaid"), type.tracks_balance ? t("hrLeave.types.tracksBalance") : t("hrLeave.types.noBalance")].join(" · ")
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
/** The chosen type's policies, newest first as the server lists them. */
const typePolicies = computed(() => policies.value.filter(policy => policy.leave_type_id === selectedTypeId.value))

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
		render: row => leaveAmount(t, row.annual_entitlement, typeOf(row.leave_type_id)?.unit ?? "day")
	},
	{
		title: t("hrLeave.policies.carryOver"),
		key: "carry_over_mode",
		minWidth: 130,
		render: row => t(`hrLeave.policies.carryOverShort.${row.carry_over_mode}`, { n: row.carry_over_max ? formatNumber(row.carry_over_max) : "" })
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
