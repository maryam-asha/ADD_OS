<!-- src/add-os/modules/hr/components/leave/LeavePolicyModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="policy ? t('hrLeave.policies.edit') : t('hrLeave.policies.add')" size="lg" icon="carbon:rule">
		<n-form ref="formRef" :model="form" :rules label-placement="top">
			<n-form-item path="leaveTypeId" :label="t('hrLeave.request.type')">
				<n-select v-model:value="form.leaveTypeId" :options="typeOptions" :disabled="policy !== null" />
			</n-form-item>
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item path="nameAr" :label="t('hrApprovals.flows.nameAr')">
					<n-input v-model:value="form.nameAr" />
				</n-form-item>
				<n-form-item path="nameEn" :label="t('hrApprovals.flows.nameEn')">
					<n-input v-model:value="form.nameEn" />
				</n-form-item>
				<n-form-item path="effectiveFrom" :label="t('hrLeave.policies.effectiveFrom')">
					<n-date-picker v-model:formatted-value="form.effectiveFrom" value-format="yyyy-MM-dd" type="date" class="w-full" />
				</n-form-item>
				<n-form-item path="effectiveTo" :label="t('hrLeave.policies.effectiveTo')">
					<n-date-picker v-model:formatted-value="form.effectiveTo" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
				</n-form-item>
			</div>

			<h3 class="mb-2 mt-2 font-semibold">{{ t("hrLeave.policies.entitlement") }}</h3>
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item path="accrualMethod" :label="t('hrLeave.policies.accrualMethod')" :feedback="t(`hrLeave.accrual.hint.${form.accrualMethod}`)">
					<n-select v-model:value="form.accrualMethod" :options="accrualOptions" />
				</n-form-item>
				<n-form-item path="annualEntitlement" :label="t('hrLeave.policies.annualEntitlement')">
					<n-input-number v-model:value="form.annualEntitlement" :min="0" :max="366" :step="0.5" class="w-full" />
				</n-form-item>
				<n-form-item path="maxNegative" :label="t('hrLeave.policies.maxNegative')" :feedback="t('hrLeave.policies.maxNegativeHint')">
					<n-input-number v-model:value="form.maxNegative" :min="0" :max="366" :step="0.5" class="w-full" />
				</n-form-item>
			</div>

			<!-- A yearly grant: when it renews, and what someone who joins mid-cycle gets. -->
			<div v-if="form.accrualMethod === 'annual_grant'" class="grid grid-cols-1 gap-x-4 sm:grid-cols-2" data-test="grant-rules">
				<n-form-item :label="t('hrLeave.policies.renewal')">
					<n-radio-group v-model:value="form.grantCycle" name="grant-cycle">
						<div class="flex flex-col gap-2">
							<n-radio v-for="cycle in GRANT_CYCLES" :key="cycle" :value="cycle" :label="t(`hrLeave.policies.grantCycles.${cycle}`)" />
						</div>
					</n-radio-group>
				</n-form-item>
				<n-form-item :label="t('hrLeave.policies.hireGrant')">
					<n-radio-group v-model:value="form.hireGrant" name="hire-grant">
						<div class="flex flex-col gap-2">
							<n-radio v-for="grant in HIRE_GRANTS" :key="grant" :value="grant" :label="t(`hrLeave.policies.hireGrants.${grant}`)" />
						</div>
					</n-radio-group>
				</n-form-item>
			</div>

			<div class="mb-4 flex flex-col gap-2">
				<span class="font-semibold">{{ t("hrLeave.policies.serviceTiers") }}</span>
				<span class="text-sm text-secondary">{{ t("hrLeave.policies.serviceTiersHint") }}</span>
				<div v-for="(tier, index) in form.tiers" :key="index" class="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
					<n-input-number v-model:value="tier.minYears" :min="1" :max="60" :precision="0" :placeholder="t('hrLeave.policies.minYears')" :aria-label="t('hrLeave.policies.minYears')" />
					<n-input-number v-model:value="tier.entitlement" :min="0" :max="366" :step="0.5" :placeholder="t('hrLeave.policies.tierEntitlement')" :aria-label="t('hrLeave.policies.tierEntitlement')" />
					<n-button text type="error" :aria-label="t('hrLeave.policies.removeTier')" :title="t('hrLeave.policies.removeTier')" @click="form.tiers.splice(index, 1)">
						<template #icon><Icon name="carbon:trash-can" :size="18" /></template>
					</n-button>
				</div>
				<div>
					<n-button size="small" :disabled="form.tiers.length >= 20" @click="form.tiers.push({ minYears: null, entitlement: null })">
						<template #icon><Icon name="carbon:add" :size="16" /></template>
						{{ t("hrLeave.policies.addTier") }}
					</n-button>
				</div>
				<!-- Only a calendar-year grant can start a tier mid-cycle: an anniversary cycle renews on that day anyway. -->
				<n-form-item v-if="tierTimingApplies" :label="t('hrLeave.policies.tierTiming')" :show-feedback="false" data-test="tier-timing">
					<n-radio-group v-model:value="form.tierTiming" name="tier-timing">
						<div class="flex flex-col gap-2">
							<n-radio v-for="timing in TIER_TIMINGS" :key="timing" :value="timing" :label="t(`hrLeave.policies.tierTimings.${timing}`)" />
						</div>
					</n-radio-group>
				</n-form-item>
			</div>

			<h3 class="mb-2 font-semibold">{{ t("hrLeave.policies.carryOver") }}</h3>
			<n-form-item :label="t('hrLeave.policies.carryOverMode')">
				<n-radio-group v-model:value="form.carryOverMode" name="carry-over-mode">
					<div class="flex flex-col gap-2">
						<n-radio v-for="mode in CARRY_OVER_MODES" :key="mode" :value="mode" :label="t(`hrLeave.policies.carryOverModes.${mode}`)" />
					</div>
				</n-radio-group>
			</n-form-item>
			<div v-if="form.carryOverMode !== 'none'" class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<!-- No hint here: a hint would hide the "set a limit" error, and the choice above already says it. -->
				<n-form-item v-if="form.carryOverMode === 'capped'" path="carryOverMax" :label="t('hrLeave.policies.carryOverMax')">
					<n-input-number v-model:value="form.carryOverMax" :min="0" :max="366" :step="0.5" class="w-full" />
				</n-form-item>
				<n-form-item path="carryOverExpiry" :label="t('hrLeave.policies.carryOverExpiry')" :feedback="t('hrLeave.policies.carryOverExpiryHint')">
					<n-input-number v-model:value="form.carryOverExpiry" :min="1" :max="24" :precision="0" clearable class="w-full" />
				</n-form-item>
			</div>

			<h3 class="mb-1 mt-2 font-semibold">{{ t("hrLeave.policies.appliesTo") }}</h3>
			<p class="mb-3 text-sm text-secondary">{{ t("hrLeave.policies.appliesToHint") }}</p>
			<n-form-item path="contractTypes" :label="t('hr.profile.fields.contractType')">
				<n-select v-model:value="form.contractTypes" :options="contractOptions" multiple clearable :placeholder="t('hrLeave.policies.everyone')" />
			</n-form-item>
			<n-form-item path="gradeIds" :label="t('hr.hire.jobGrade')">
				<n-select v-model:value="form.gradeIds" :options="gradeOptions" multiple clearable filterable :placeholder="t('hrLeave.policies.everyone')" />
			</n-form-item>
			<n-form-item path="unitIds" :label="t('hr.hire.orgUnit')">
				<n-select v-model:value="form.unitIds" :options="unitOptions" multiple clearable filterable :placeholder="t('hrLeave.policies.everyone')" />
			</n-form-item>
			<p v-if="tierError" class="text-sm text-error">{{ tierError }}</p>
		</n-form>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" @click="save">
					<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
					{{ t("hr.common.save") }}
				</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { ContractType, JobGrade, OrgUnit } from "@/add-os/modules/hr/types/hr"
import type { AccrualMethod, CarryOverMode, GrantCycle, HireGrant, LeavePolicy, LeavePolicyPayload, LeaveType, TierTiming } from "@/add-os/modules/hr/types/leave"
import { NButton, NDatePicker, NForm, NFormItem, NInput, NInputNumber, NRadio, NRadioGroup, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { CONTRACT_TYPES } from "@/add-os/modules/hr/types/hr"
import { ACCRUAL_METHODS, CARRY_OVER_MODES, GRANT_CYCLES, HIRE_GRANTS, TIER_TIMINGS } from "@/add-os/modules/hr/types/leave"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { createLeavePolicy, updateLeavePolicy } from "@/add-os/services/hr/leave"
import Icon from "@/components/common/Icon.vue"

/**
 * A leave policy (StoreLeavePolicyRequest): how much of a type an employee
 * earns and how — monthly, granted once a year, or not at all — more with
 * years of service, how much carries into the next year and for how long,
 * how far below zero the balance may go, and for whom (contract types,
 * grades, units; none chosen means everyone). Decimal strings from the
 * server are read into the number inputs for editing only.
 *
 * The rules a company sets for itself (2026-11-14): when a yearly grant
 * renews (1 January, or each hire anniversary), what a new hire gets (a
 * share, the whole year, or nothing until probation is over), when a higher
 * tier starts (next renewal, or its anniversary as the difference for the
 * rest of the year), and what unused days do (lapse, carry up to a limit,
 * all carry). Carry-over is chosen, never read from an empty field: an
 * empty limit used to mean "everything carries", the opposite of what most
 * would guess. A new policy starts with nothing carried over.
 */
const props = defineProps<{
	policy: LeavePolicy | null
	types: LeaveType[]
	grades: JobGrade[]
	units: OrgUnit[]
	/** A new policy starts on this type: the leave settings open it from a type's own list. */
	leaveTypeId?: number | null
}>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()

interface PolicyForm {
	leaveTypeId: number | null
	nameAr: string
	nameEn: string
	effectiveFrom: string | null
	effectiveTo: string | null
	accrualMethod: AccrualMethod
	annualEntitlement: number | null
	maxNegative: number | null
	tiers: { minYears: number | null; entitlement: number | null }[]
	grantCycle: GrantCycle
	hireGrant: HireGrant
	tierTiming: TierTiming
	carryOverMode: CarryOverMode
	carryOverMax: number | null
	carryOverExpiry: number | null
	contractTypes: ContractType[]
	gradeIds: number[]
	unitIds: number[]
}

const toNumber = (value: string | number | null | undefined): number | null => (value === null || value === undefined || value === "" ? null : Number(value))

function fromPolicy(p: LeavePolicy | null): PolicyForm {
	return {
		leaveTypeId: p?.leave_type_id ?? props.leaveTypeId ?? null,
		nameAr: p?.name?.ar ?? "",
		nameEn: p?.name?.en ?? "",
		effectiveFrom: p?.effective_from ?? null,
		effectiveTo: p?.effective_to ?? null,
		accrualMethod: p?.accrual_method ?? "monthly",
		annualEntitlement: toNumber(p?.annual_entitlement) ?? 0,
		maxNegative: toNumber(p?.max_negative) ?? 0,
		tiers: (p?.service_tiers ?? []).map(tier => ({ minYears: tier.min_years, entitlement: toNumber(tier.entitlement) })),
		grantCycle: p?.grant_cycle ?? "calendar_year",
		hireGrant: p?.hire_grant ?? "prorated",
		tierTiming: p?.tier_timing ?? "next_cycle",
		carryOverMode: p?.carry_over_mode ?? "none",
		carryOverMax: toNumber(p?.carry_over_max),
		carryOverExpiry: p?.carry_over_expiry_months ?? null,
		contractTypes: p?.contract_types ?? [],
		gradeIds: p?.job_grade_ids ?? [],
		unitIds: p?.org_unit_ids ?? []
	}
}

const formRef = ref<FormInst | null>(null)
const form = ref<PolicyForm>(fromPolicy(null))
const saving = ref(false)
const tierError = ref("")

watch(show, visible => {
	if (!visible) return
	tierError.value = ""
	form.value = fromPolicy(props.policy)
})

const typeOptions = computed<SelectOption[]>(() => props.types.map(type => ({ label: translated(type.name), value: type.id })))
const accrualOptions = computed<SelectOption[]>(() => ACCRUAL_METHODS.map(m => ({ label: t(`hrLeave.accrual.${m}`), value: m })))
const contractOptions = computed<SelectOption[]>(() => CONTRACT_TYPES.map(c => ({ label: t(`hr.contractType.${c}`), value: c })))
const gradeOptions = computed<SelectOption[]>(() => props.grades.map(g => ({ label: `${g.code} · ${translated(g.name)}`, value: g.id })))
const unitOptions = computed<SelectOption[]>(() => props.units.map(u => ({ label: translated(u.name), value: u.id })))

/** A tier can start mid-cycle only under a calendar-year grant with tiers. */
const tierTimingApplies = computed(() => form.value.accrualMethod === "annual_grant" && form.value.grantCycle === "calendar_year" && form.value.tiers.length > 0)

const required = { required: true, message: () => t("hr.common.required"), trigger: ["blur", "change"] }
const rules: FormRules = {
	leaveTypeId: { ...required, type: "number" },
	effectiveFrom: required,
	annualEntitlement: { ...required, type: "number" },
	maxNegative: { ...required, type: "number" },
	carryOverMax: {
		trigger: ["blur", "change"],
		validator: (_rule: unknown, value: number | null) => form.value.carryOverMode !== "capped" || value !== null,
		message: () => t("hrLeave.policies.carryOverMaxRequired")
	}
}

async function save() {
	tierError.value = ""
	let valid = true
	try {
		await formRef.value?.validate()
	} catch {
		valid = false
	}
	const f = form.value
	const years = f.tiers.map(tier => tier.minYears)
	if (f.tiers.some(tier => tier.minYears === null || tier.entitlement === null)) {
		tierError.value = t("hrLeave.policies.tierIncomplete")
		valid = false
	} else if (new Set(years).size !== years.length) {
		tierError.value = t("hrLeave.policies.tierDuplicate")
		valid = false
	}
	if (!valid) return

	const nameAr = f.nameAr.trim()
	const annual = f.accrualMethod === "annual_grant"
	const body: LeavePolicyPayload = {
		name: nameAr ? { ar: nameAr, en: nullable(f.nameEn) } : null,
		effective_from: f.effectiveFrom as string,
		effective_to: f.effectiveTo,
		accrual_method: f.accrualMethod,
		annual_entitlement: f.annualEntitlement as number,
		service_tiers: f.tiers.length ? f.tiers.map(tier => ({ min_years: tier.minYears as number, entitlement: tier.entitlement as number })) : null,
		// Only a yearly grant has a cycle, a new-hire rule or a mid-cycle tier; anything else keeps the defaults.
		grant_cycle: annual ? f.grantCycle : "calendar_year",
		hire_grant: annual ? f.hireGrant : "prorated",
		tier_timing: tierTimingApplies.value ? f.tierTiming : "next_cycle",
		carry_over_mode: f.carryOverMode,
		carry_over_max: f.carryOverMode === "capped" ? f.carryOverMax : null,
		carry_over_expiry_months: f.carryOverMode === "none" ? null : f.carryOverExpiry,
		max_negative: f.maxNegative as number,
		contract_types: f.contractTypes.length ? f.contractTypes : null,
		job_grade_ids: f.gradeIds.length ? f.gradeIds : null,
		org_unit_ids: f.unitIds.length ? f.unitIds : null
	}
	saving.value = true
	try {
		if (props.policy) {
			message.success(serverMessage(await updateLeavePolicy(props.policy.id, body), t("hrLeave.policies.saved")))
		} else {
			await createLeavePolicy({ ...body, leave_type_id: f.leaveTypeId as number })
			message.success(t("hrLeave.policies.saved"))
		}
		show.value = false
		emit("saved")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
