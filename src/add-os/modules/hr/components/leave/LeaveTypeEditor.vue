<!-- src/add-os/modules/hr/components/leave/LeaveTypeEditor.vue -->
<template>
	<n-form ref="formRef" :model="form" :rules label-placement="top" class="@container flex flex-col gap-4">
		<header class="flex flex-col">
			<span class="text-xs font-semibold text-secondary">{{ t(`hrLeave.unit.${form.unit}`) }} · {{ form.isPaid ? t("hrLeave.types.isPaid") : t("hrLeave.types.unpaid") }}</span>
			<h3 class="text-lg font-semibold">{{ type ? translated(type.name) : t("hrLeave.types.add") }}</h3>
		</header>

		<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
			<n-form-item path="nameAr" :label="t('hr.org.nameAr')">
				<n-input v-model:value="form.nameAr" :disabled="!mayManage" />
			</n-form-item>
			<n-form-item path="nameEn" :label="t('hr.org.nameEn')">
				<n-input v-model:value="form.nameEn" :disabled="!mayManage" />
			</n-form-item>
			<n-form-item path="code" :label="t('hr.org.code')">
				<n-input v-model:value="form.code" dir="ltr" :disabled="!mayManage" />
			</n-form-item>
			<n-form-item :label="t('hrLeave.types.unit')" :feedback="type ? t('hrLeave.types.unitFixed') : undefined">
				<n-select v-model:value="form.unit" :options="unitOptions" :disabled="!mayManage || type !== null" />
			</n-form-item>
		</div>

		<section class="flex flex-col gap-3">
			<h4 class="font-semibold">{{ t("hrLeave.types.balanceSection") }}</h4>
			<label class="flex items-center gap-3">
				<n-switch v-model:value="form.tracksBalance" :disabled="!mayManage" />
				<span>{{ t("hrLeave.types.tracksBalance") }}</span>
			</label>
		</section>

		<section v-if="form.unit === 'day'" class="flex flex-col gap-3">
			<h4 class="font-semibold">{{ t("hrLeave.types.durationSection") }}</h4>
			<label class="flex items-center gap-3">
				<n-switch v-model:value="form.countsCalendarDays" :disabled="!mayManage" />
				<span>{{ t("hrLeave.types.countsCalendarDays") }}</span>
			</label>
			<label class="flex items-center gap-3">
				<n-switch v-model:value="form.allowsHalfDay" :disabled="!mayManage" />
				<span>{{ t("hrLeave.types.allowsHalfDay") }}</span>
			</label>
		</section>

		<section class="flex flex-col gap-3">
			<h4 class="font-semibold">{{ t("hrLeave.types.requestSection") }}</h4>
			<label class="flex items-center gap-3">
				<n-switch v-model:value="form.isPaid" :disabled="!mayManage" />
				<span>{{ t("hrLeave.types.isPaid") }}</span>
			</label>
			<label class="flex items-center gap-3">
				<n-switch v-model:value="form.hideReason" :disabled="!mayManage" />
				<span>{{ t("hrLeave.types.hideReason") }}</span>
			</label>
			<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
				<n-form-item path="minRequest" :label="t('hrLeave.types.minRequest')" :feedback="t('hrLeave.types.requestLimitHint')">
					<n-input-number v-model:value="form.minRequest" :min="0" :max="366" :step="form.unit === 'hour' ? 0.5 : 1" clearable class="w-full" :disabled="!mayManage">
						<template #suffix>{{ t(`hrLeave.unit.${form.unit}`) }}</template>
					</n-input-number>
				</n-form-item>
				<n-form-item path="maxRequest" :label="t('hrLeave.types.maxRequest')" :feedback="t('hrLeave.types.requestLimitHint')">
					<n-input-number v-model:value="form.maxRequest" :min="0.5" :max="366" :step="form.unit === 'hour' ? 0.5 : 1" clearable class="w-full" :disabled="!mayManage">
						<template #suffix>{{ t(`hrLeave.unit.${form.unit}`) }}</template>
					</n-input-number>
				</n-form-item>
			</div>
			<n-form-item :label="t('hrLeave.types.attachmentType')" class="max-w-md">
				<n-select v-model:value="form.attachmentTypeId" :options="documentTypeOptions" clearable :placeholder="t('hrLeave.types.noAttachment')" :disabled="!mayManage" />
			</n-form-item>
			<label class="flex items-center gap-3">
				<n-switch v-model:value="form.isActive" :disabled="!mayManage" />
				<span>{{ t("hr.common.active") }}</span>
			</label>
		</section>

		<footer v-if="mayManage" class="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--add-border)] pt-4">
			<n-button v-if="type" type="error" secondary class="me-auto" @click="emit('delete', type)">
				<template #icon><Icon name="carbon:trash-can" :size="16" /></template>
				{{ t("hrLeave.types.delete") }}
			</n-button>
			<n-button @click="emit('cancel')">{{ t("hr.common.cancel") }}</n-button>
			<n-button type="primary" :loading="saving" @click="save">
				<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
				{{ t("hr.common.save") }}
			</n-button>
		</footer>
	</n-form>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { LeaveType, LeaveTypePayload, LeaveUnit } from "@/add-os/modules/hr/types/leave"
import { NButton, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { LEAVE_UNITS } from "@/add-os/modules/hr/types/leave"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { createLeaveType, updateLeaveType } from "@/add-os/services/hr/leave"
import Icon from "@/components/common/Icon.vue"

/**
 * A leave type (StoreLeaveTypeRequest), edited beside the list of types as
 * Bayraq edits its leave types: the type, then its settings grouped as
 * Bayraq groups them (the balance, how the length is counted, what a
 * request needs). What a type gives (entitlement, accrual, carry-over,
 * tiers) is its policies', listed under this editor. The unit is fixed once
 * the type exists; half days and calendar days apply to a day type only.
 * A needed document is a document type, never a yes/no: the server checks
 * that one was uploaded of that type. The shortest and longest single
 * request, in the type's unit, are optional (empty: no limit); the server
 * refuses a request outside them at the quote, so the form says so first.
 *
 * Until 2026-11-10 these fields were a dialog over a table
 * (buildLeaveTypeFields in leave.config, via HrResourcePanel).
 */
const props = defineProps<{ type: LeaveType | null; documentTypeOptions: SelectOption[]; mayManage: boolean }>()
const emit = defineEmits<{ saved: [id: number | null]; cancel: []; delete: [type: LeaveType] }>()

const { t } = useI18n()
const message = useMessage()

interface TypeForm {
	nameAr: string
	nameEn: string
	code: string
	unit: LeaveUnit
	isPaid: boolean
	tracksBalance: boolean
	allowsHalfDay: boolean
	countsCalendarDays: boolean
	hideReason: boolean
	attachmentTypeId: number | null
	minRequest: number | null
	maxRequest: number | null
	isActive: boolean
}

function fromType(type: LeaveType | null): TypeForm {
	return {
		nameAr: type?.name.ar ?? "",
		nameEn: type?.name.en ?? "",
		code: type?.code ?? "",
		unit: type?.unit ?? "day",
		isPaid: type?.is_paid ?? true,
		tracksBalance: type?.tracks_balance ?? true,
		allowsHalfDay: type?.allows_half_day ?? false,
		countsCalendarDays: type?.counts_calendar_days ?? false,
		hideReason: type?.hide_reason ?? false,
		attachmentTypeId: type?.attachment_document_type_id ?? null,
		minRequest: type?.min_request ? Number(type.min_request) : null,
		maxRequest: type?.max_request ? Number(type.max_request) : null,
		isActive: type?.is_active ?? true
	}
}

const formRef = ref<FormInst | null>(null)
const form = ref<TypeForm>(fromType(props.type))
const saving = ref(false)

watch(
	() => props.type,
	type => (form.value = fromType(type))
)

const unitOptions = computed<SelectOption[]>(() => LEAVE_UNITS.map(unit => ({ label: t(`hrLeave.unit.${unit}`), value: unit })))

const rules = computed<FormRules>(() => ({
	nameAr: { required: true, trigger: ["blur", "input"], validator: (_r: unknown, v: string) => !!v?.trim(), message: t("hr.common.arabicRequired", { field: t("hrLeave.types.name") }) },
	code: { required: true, trigger: ["blur", "input"], validator: (_r: unknown, v: string) => !!v?.trim(), message: t("hr.common.required") },
	maxRequest: {
		trigger: ["blur", "change"],
		validator: (_r: unknown, v: number | null) => v === null || form.value.minRequest === null || v >= form.value.minRequest,
		message: t("hrLeave.types.requestLimitOrder")
	}
}))

function payload(): LeaveTypePayload {
	const f = form.value
	return {
		code: f.code.trim(),
		name: { ar: f.nameAr.trim(), en: nullable(f.nameEn) },
		unit: f.unit,
		is_paid: f.isPaid,
		tracks_balance: f.tracksBalance,
		allows_half_day: f.unit === "day" && f.allowsHalfDay,
		counts_calendar_days: f.unit === "day" && f.countsCalendarDays,
		hide_reason: f.hideReason,
		attachment_document_type_id: f.attachmentTypeId,
		min_request: f.minRequest,
		max_request: f.maxRequest,
		is_active: f.isActive
	}
}

async function save() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}
	saving.value = true
	try {
		if (props.type) {
			message.success(serverMessage(await updateLeaveType(props.type.id, payload()), t("hrLeave.types.updated")))
			emit("saved", props.type.id)
		} else {
			const created = await createLeaveType(payload())
			message.success(t("hrLeave.types.created"))
			emit("saved", created?.id ?? null)
		}
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}

defineExpose({ form, payload, save })
</script>
