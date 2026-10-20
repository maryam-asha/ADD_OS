<template>
	<HrFormModal v-model:show="show" :title="t('hrRecruitment.offers.make')" size="lg" icon="carbon:certificate">
		<p class="mb-3 text-sm text-secondary">{{ t("hrRecruitment.offers.hint") }}</p>
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('hrRecruitment.offers.startOn')">
				<n-date-picker v-model:formatted-value="form.startOn" value-format="yyyy-MM-dd" type="date" class="w-full" />
			</n-form-item>
			<n-form-item :label="t('hrRecruitment.offers.expiresOn')">
				<n-date-picker v-model:formatted-value="form.expiresOn" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
			</n-form-item>
		</div>

		<n-form-item :label="t('hrRecruitment.offers.pay')">
			<div class="w-full">
				<PayLinesEditor v-if="components.length" v-model:lines="form.lines" :components />
				<p v-else class="text-sm text-secondary">{{ t("hrRecruitment.offers.noPayComponents") }}</p>
			</div>
		</n-form-item>
		<p v-if="components.length" class="-mt-2 mb-3 text-xs text-secondary">{{ t("hrRecruitment.offers.payHint") }}</p>

		<n-form-item :label="t('hrRecruitment.offers.terms')">
			<n-input v-model:value="form.terms" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" :maxlength="5000" />
		</n-form-item>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!ready" @click="save">{{ t("hrLeave.request.submit") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { PayLine } from "@/add-os/modules/hr/components/payroll/PayLinesEditor.vue"
import type { PayComponent } from "@/add-os/modules/hr/types/payroll"
import { NButton, NDatePicker, NFormItem, NInput, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import PayLinesEditor from "@/add-os/modules/hr/components/payroll/PayLinesEditor.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { addDays } from "@/add-os/modules/hr/utils/time"
import { makeOffer } from "@/add-os/services/hr/recruitment"

/**
 * An offer to a candidate: when they start, until when it stands, the pay
 * (which becomes their pay on hiring, when payroll is in use) and its
 * terms. It goes to the requisition's approval before it is made, and moves
 * the application to the offer stage. Pay components need hr.payroll.view
 * to list; without them the offer carries terms only.
 */
const props = defineProps<{ applicationId: number; components: PayComponent[] }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)

function emptyForm() {
	return { startOn: addDays(todayIso(), 30) as string | null, expiresOn: null as string | null, lines: [] as PayLine[], terms: "" }
}
const form = ref(emptyForm())

watch(show, open => {
	if (open) form.value = emptyForm()
})

const ready = computed(() => {
	const f = form.value
	return !!f.startOn && f.lines.every(l => l.pay_component_id !== null && l.amount !== null && !!l.currency)
})

async function save() {
	const f = form.value
	saving.value = true
	try {
		await makeOffer(props.applicationId, {
			start_on: f.startOn as string,
			expires_on: f.expiresOn,
			compensation: f.lines.length ? f.lines.map(l => ({ pay_component_id: l.pay_component_id as number, amount: l.amount as number, currency: l.currency as string })) : null,
			terms: nullable(f.terms)
		})
		message.success(t("hrRecruitment.offers.made"))
		show.value = false
		emit("saved")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
