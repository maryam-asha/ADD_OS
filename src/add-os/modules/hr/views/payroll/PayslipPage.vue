<!-- src/add-os/modules/hr/views/payroll/PayslipPage.vue -->
<template>
	<div class="add-print-page flex flex-col gap-5">
		<div class="flex flex-wrap items-center justify-between gap-3 print:hidden">
			<n-button text @click="back">
				<template #icon><Icon name="carbon:arrow-left" :size="16" class="rtl:rotate-180" /></template>
				{{ t("hr.common.back") }}
			</n-button>
			<n-button v-if="payslip" type="primary" @click="print">
				<template #icon><Icon name="carbon:printer" :size="16" /></template>
				{{ t("hr.certificate.print") }}
			</n-button>
		</div>

		<n-alert v-if="notFound" type="warning" :title="t('hrPayroll.payslip.notFound')" />
		<n-alert v-else-if="loadError" type="error" :title="loadError" />
		<n-skeleton v-else-if="loading" text :repeat="8" />
		<PayslipSheet v-else-if="payslip" :payslip :show-warnings="!mine" />
	</div>
</template>

<script setup lang="ts">
import type { Payslip } from "@/add-os/modules/hr/types/payroll"
import { NAlert, NButton, NSkeleton } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import PayslipSheet from "@/add-os/modules/hr/components/payroll/PayslipSheet.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { ApiError } from "@/add-os/services/api"
import { getMyPayslip, getPayslip } from "@/add-os/services/hr/payroll"
import Icon from "@/components/common/Icon.vue"

/**
 * One payslip, printable. The same page serves HR (`hrPay.hrPayslip`, any
 * slip, employer cost and warnings included) and the employee
 * (`myHr.hrMyPayslip`, their own issued slips only — any other answers 404).
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const mine = computed(() => route.name === "myHr.hrMyPayslip")

const payslip = ref<Payslip | null>(null)
const loading = ref(true)
const loadError = ref("")
const notFound = ref(false)

onMounted(async () => {
	const id = Number(route.params.id)
	try {
		payslip.value = mine.value ? await getMyPayslip(id) : await getPayslip(id)
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) notFound.value = true
		else loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
})

/** Back to where the slip was opened from: the run it belongs to, or the employee's pay. */
function back() {
	if (mine.value) void router.push({ name: "myHr.hrMyPay" })
	else if (payslip.value) void router.push({ name: "hrPay.hrPayrollRun", params: { id: payslip.value.payroll_run_id } })
	else router.back()
}

function print() {
	window.print()
}
</script>
