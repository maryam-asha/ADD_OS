<template>
	<HrFormModal v-model:show="show" :title="t('hrPayroll.pay.change')" size="lg" icon="carbon:money">
		<p class="mb-3 text-sm text-secondary">{{ t("hrPayroll.pay.changeHint") }}</p>
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('hrPayroll.pay.effectiveFrom')">
				<n-date-picker
					v-model:formatted-value="effectiveFrom"
					value-format="yyyy-MM-dd"
					type="date"
					class="w-full"
					:is-date-disabled="(ts: number) => !!latestFrom && toIso(ts) <= latestFrom"
				/>
			</n-form-item>
			<n-form-item :label="t('hrPayroll.pay.reason')">
				<n-input v-model:value="reason" :maxlength="32" :placeholder="t('hrPayroll.pay.reasonPlaceholder')" />
			</n-form-item>
		</div>

		<PayLinesEditor v-model:lines="lines" :components :max="MAX_LINES" />
		<p v-if="!lines.length" class="mt-3 text-sm text-warning-text">{{ t("hrPayroll.pay.endsPay") }}</p>
		<p class="mt-3 text-xs text-secondary">{{ t("hrPayroll.pay.percentHint") }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!ready" @click="save">{{ t("hr.common.save") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { PayLine } from "@/add-os/modules/hr/components/payroll/PayLinesEditor.vue"
import type { Compensation, PayComponent } from "@/add-os/modules/hr/types/payroll"
import { NButton, NDatePicker, NFormItem, NInput, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import PayLinesEditor from "@/add-os/modules/hr/components/payroll/PayLinesEditor.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { addDays } from "@/add-os/modules/hr/utils/time"
import { changeCompensation } from "@/add-os/services/hr/payroll"

/**
 * A pay change from a date: the whole pay as it will be, each active
 * component once with its amount and currency. Every line running then ends
 * the day before; no lines at all ends the pay. The change is recorded on
 * the career timeline, and the server refuses a date on or before a change
 * already made, or one the employee is not employed on. Opens on the pay in
 * force, to adjust rather than retype.
 */
const props = defineProps<{ employeeId: number; components: PayComponent[]; current: Compensation[]; latestFrom: string | null }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

/** ChangeCompensationRequest takes 30 lines at most. */
const MAX_LINES = 30

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)

let nextKey = 0
const effectiveFrom = ref<string | null>(todayIso())
const reason = ref("")
const lines = ref<PayLine[]>([])

watch(show, open => {
	if (!open) return
	const earliest = props.latestFrom ? addDays(props.latestFrom, 1) : todayIso()
	effectiveFrom.value = earliest > todayIso() ? earliest : todayIso()
	reason.value = ""
	lines.value = props.current.map(c => ({ key: ++nextKey, pay_component_id: c.component.id, amount: Number.parseFloat(c.amount), currency: c.currency }))
	if (!lines.value.length) addLine()
})

function toIso(ts: number): string {
	const d = new Date(ts)
	const pad = (n: number) => String(n).padStart(2, "0")
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** A new line takes the currency the others use. */
function addLine() {
	lines.value.push({ key: ++nextKey, pay_component_id: null, amount: null, currency: lines.value.find(l => l.currency)?.currency ?? null })
}

const ready = computed(() => !!effectiveFrom.value && lines.value.every(l => l.pay_component_id !== null && l.amount !== null && !!l.currency))

async function save() {
	saving.value = true
	try {
		const result = await changeCompensation(
			props.employeeId,
			effectiveFrom.value as string,
			lines.value.map(l => ({ pay_component_id: l.pay_component_id as number, amount: l.amount as number, currency: l.currency as string })),
			nullable(reason.value)
		)
		message.success(serverMessage(result, t("hrPayroll.pay.changed")))
		show.value = false
		emit("saved")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
