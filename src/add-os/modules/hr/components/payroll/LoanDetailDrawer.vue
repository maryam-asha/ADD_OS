<template>
	<HrDrawer v-model:show="show" :title="t('hrPayroll.loans.detail')">
		<div v-if="loan" class="flex flex-col gap-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<span v-if="loan.employee" class="font-semibold">{{ translated(loan.employee.name) }}</span>
				<LoanStatusTag :status="loan.status" />
			</div>
			<n-descriptions :column="1" label-placement="left" size="small" bordered>
				<n-descriptions-item :label="t('hrPayroll.loans.amount')">
					<span class="add-numeric">{{ money(loan.amount, loan.currency) }}</span>
				</n-descriptions-item>
				<n-descriptions-item :label="t('hrPayroll.loans.installments')">
					{{ t("hrApprovals.summary.installmentsOf", { n: formatNumber(loan.installments), amount: money(loan.installment_amount, loan.currency) }) }}
				</n-descriptions-item>
				<n-descriptions-item :label="t('hrPayroll.loans.firstMonth')">{{ periodLabel(loan.first_month) }}</n-descriptions-item>
				<n-descriptions-item :label="t('hrPayroll.loans.outstanding')">
					<span class="add-numeric font-semibold">{{ money(loan.outstanding, loan.currency) }}</span>
				</n-descriptions-item>
				<n-descriptions-item :label="t('hrApprovals.summary.reason')">{{ loan.reason || none }}</n-descriptions-item>
			</n-descriptions>

			<HrPanel v-if="loan.schedule.length" :title="t('hrPayroll.loans.schedule')" icon="carbon:calendar" flush class="add-ledger-table">
				<n-data-table :columns :data="loan.schedule" :bordered="false" size="small" :max-height="320" />
			</HrPanel>
			<p v-else-if="loan.status === 'pending'" class="text-sm text-secondary">{{ t("hrPayroll.loans.scheduleOnApproval") }}</p>
		</div>

		<template v-if="loan && footer" #footer>
			<div class="flex justify-end">
				<n-button v-if="settle && loan.status === 'active'" type="warning" secondary @click="settleVisible = true">
					<template #icon><Icon name="carbon:checkmark-outline" :size="16" /></template>
					{{ t("hrPayroll.loans.settle") }}
				</n-button>
				<n-button v-if="cancel && loan.status === 'pending'" type="error" secondary :loading="busy" @click="confirmCancel">
					<template #icon><Icon name="carbon:close" :size="16" /></template>
					{{ t("hrPayroll.loans.cancel") }}
				</n-button>
			</div>
		</template>

		<HrFormModal v-model:show="settleVisible" :title="t('hrPayroll.loans.settle')" size="sm" icon="carbon:checkmark-outline">
			<p class="mb-3 text-sm text-secondary">{{ t("hrPayroll.loans.settleHint", { amount: loan ? money(loan.outstanding, loan.currency) : none }) }}</p>
			<n-form-item :label="t('hrPayroll.loans.settleNote')">
				<n-input v-model:value="note" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" :maxlength="255" />
			</n-form-item>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="settleVisible = false">{{ t("hr.common.cancel") }}</n-button>
					<n-button type="primary" :loading="busy" :disabled="!note.trim()" @click="doSettle">{{ t("hrPayroll.loans.settle") }}</n-button>
				</div>
			</template>
		</HrFormModal>
	</HrDrawer>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Loan } from "@/add-os/modules/hr/types/payroll"
import type { UpdateResult } from "@/add-os/services/hr/core"
import { NButton, NDataTable, NDescriptions, NDescriptionsItem, NFormItem, NInput, useDialog, useMessage } from "naive-ui"
import { computed, h, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrDrawer from "@/add-os/modules/hr/components/HrDrawer.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import LoanStatusTag from "@/add-os/modules/hr/components/payroll/LoanStatusTag.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { money } from "@/add-os/modules/hr/utils/money"
import { periodLabel } from "@/add-os/modules/hr/utils/payroll"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * One loan and its schedule (laid out once it is approved). HR settles an
 * active one — what is still due, paid outside payroll — with a note; the
 * employee cancels their own while it is pending.
 */
const props = defineProps<{ loan: Loan | null; settle?: (id: number, note: string) => Promise<UpdateResult>; cancel?: (id: number) => Promise<UpdateResult> }>()
const emit = defineEmits<{ changed: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const none = EMPTY
const busy = ref(false)
const settleVisible = ref(false)
const note = ref("")

watch(show, open => {
	if (open) note.value = ""
})

const footer = computed(() => (props.settle && props.loan?.status === "active") || (props.cancel && props.loan?.status === "pending"))

async function doSettle() {
	if (!props.loan || !props.settle) return
	busy.value = true
	try {
		message.success(serverMessage(await props.settle(props.loan.id, note.value.trim()), t("hrPayroll.loans.settled")))
		settleVisible.value = false
		show.value = false
		emit("changed")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		busy.value = false
	}
}

function confirmCancel() {
	dialog.warning({
		title: t("hrPayroll.loans.cancel"),
		content: t("hrPayroll.loans.cancelConfirm"),
		positiveText: t("hrPayroll.loans.cancel"),
		negativeText: t("hr.common.back"),
		onPositiveClick: async () => {
			if (!props.loan || !props.cancel) return
			busy.value = true
			try {
				message.success(serverMessage(await props.cancel(props.loan.id), t("hrPayroll.loans.cancelled")))
				show.value = false
				emit("changed")
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			} finally {
				busy.value = false
			}
		}
	})
}

type Installment = Loan["schedule"][number]
const columns = computed<DataTableColumns<Installment>>(() => [
	{ title: t("hrPayroll.loans.month"), key: "month", minWidth: 130, render: row => periodLabel(row.month) },
	{ title: t("hrPayroll.loans.amount"), key: "amount", minWidth: 110, render: row => h("span", { class: "add-numeric" }, money(row.amount, props.loan?.currency ?? "")) },
	{ title: t("hr.common.status"), key: "status", minWidth: 100, render: row => t(`hrPayroll.installmentStatus.${row.status}`) }
])
</script>
