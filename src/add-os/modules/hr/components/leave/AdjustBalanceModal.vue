<!-- src/add-os/modules/hr/components/leave/AdjustBalanceModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="t('hrLeave.adjust.title')" size="md" icon="carbon:calculator">
		<n-form ref="formRef" :model="form" :rules label-placement="top">
			<n-form-item path="typeId" :label="t('hrLeave.request.type')">
				<n-select v-model:value="form.typeId" :options="typeOptions" />
			</n-form-item>
			<n-form-item path="kind" :label="t('hrLeave.adjust.kind')" :feedback="t(`hrLeave.adjust.kindHint.${form.kind}`)">
				<n-select v-model:value="form.kind" :options="kindOptions" />
			</n-form-item>
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item path="amount" :label="t('hrLeave.adjust.amount')" :feedback="form.kind === 'encashment' ? t('hrLeave.adjust.negativeOnly') : t('hrLeave.adjust.signHint')">
					<n-input-number v-model:value="form.amount" :min="-366" :max="form.kind === 'encashment' ? -0.01 : 366" :step="0.5" class="w-full" />
				</n-form-item>
				<n-form-item path="effectiveOn" :label="t('hrLeave.adjust.effectiveOn')">
					<n-date-picker
						v-model:formatted-value="form.effectiveOn"
						value-format="yyyy-MM-dd"
						type="date"
						clearable
						class="w-full"
						:placeholder="t('hrLeave.adjust.today')"
						:is-date-disabled="(ts: number) => ts > Date.now()"
					/>
				</n-form-item>
			</div>
			<n-form-item path="periodYear" :label="t('hrLeave.adjust.periodYear')">
				<n-input-number v-model:value="form.periodYear" :min="2000" :max="2100" :precision="0" clearable class="w-full" :placeholder="t('hrLeave.adjust.periodYearHint')" />
			</n-form-item>
			<n-form-item path="notes" :label="t('hrLeave.adjust.notes')">
				<n-input v-model:value="form.notes" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" :maxlength="500" />
			</n-form-item>
		</n-form>
		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" @click="save">
					<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
					{{ t("hrLeave.adjust.submit") }}
				</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { LeaveTypeRef, ManualLedgerKind } from "@/add-os/modules/hr/types/leave"
import { NButton, NDatePicker, NForm, NFormItem, NInput, NInputNumber, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { MANUAL_LEDGER_KINDS } from "@/add-os/modules/hr/types/leave"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { adjustLeaveBalance } from "@/add-os/services/hr/leave"
import Icon from "@/components/common/Icon.vue"

/**
 * A movement HR books by hand on a balance (AdjustLeaveBalanceRequest): an
 * opening balance, an adjustment either way, or an encashment (always
 * taken out). Every one needs a note and is audited.
 */
const props = defineProps<{ employeeId: number; types: LeaveTypeRef[] }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()

interface AdjustForm {
	typeId: number | null
	kind: ManualLedgerKind
	amount: number | null
	effectiveOn: string | null
	periodYear: number | null
	notes: string
}

const formRef = ref<FormInst | null>(null)
const saving = ref(false)
const form = ref<AdjustForm>(blank())

function blank(): AdjustForm {
	return { typeId: null, kind: "adjustment", amount: null, effectiveOn: null, periodYear: null, notes: "" }
}

watch(show, visible => {
	if (visible) form.value = blank()
})

const typeOptions = computed<SelectOption[]>(() => props.types.map(type => ({ label: translated(type.name), value: type.id })))
const kindOptions = computed<SelectOption[]>(() => MANUAL_LEDGER_KINDS.map(kind => ({ label: t(`hrLeave.ledgerKind.${kind}`), value: kind })))

const required = { required: true, message: () => t("hr.common.required"), trigger: ["blur", "change", "input"] }
const rules: FormRules = {
	typeId: { ...required, type: "number" },
	amount: { required: true, trigger: ["blur", "change"], validator: () => (form.value.amount ? true : new Error(t("hrLeave.adjust.nonZero"))) },
	notes: required
}

async function save() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}
	const f = form.value
	saving.value = true
	try {
		await adjustLeaveBalance(props.employeeId, {
			leave_type_id: f.typeId as number,
			kind: f.kind,
			amount: f.amount as number,
			effective_on: f.effectiveOn,
			period_year: f.periodYear,
			notes: f.notes.trim()
		})
		message.success(t("hrLeave.adjust.saved"))
		show.value = false
		emit("saved")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
