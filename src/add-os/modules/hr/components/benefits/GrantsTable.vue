<template>
	<n-data-table :columns :data="grants" :loading :bordered="false" size="small" :scroll-x>
		<template #empty>
			<span class="text-secondary">{{ t("hrBenefits.grants.empty") }}</span>
		</template>
	</n-data-table>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { BenefitGrant } from "@/add-os/modules/hr/types/benefits"
import { NDataTable, NTooltip, useDialog, useMessage } from "naive-ui"
import { computed, h } from "vue"
import { useI18n } from "vue-i18n"
import RowActions from "@/add-os/components/page/RowActions.vue"
import GrantStatusTag from "@/add-os/modules/hr/components/benefits/GrantStatusTag.vue"
import { benefitValue, canCancelGrant, canRetryGrant, grantPeriodLabel } from "@/add-os/modules/hr/utils/benefits"
import { employeeCell } from "@/add-os/modules/hr/utils/cells"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { money } from "@/add-os/modules/hr/utils/money"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { cancelGrant, retryGrant } from "@/add-os/services/hr/benefits"
import { formatDate } from "@/add-os/utils/format"

/**
 * Benefit grants: what was granted, to whom, for which period, and whether
 * it was delivered. A failed delivery carries the server's reason (in ADD,
 * an employee with no member wallet). With hr.benefits.manage a failed or
 * stuck grant is tried again, and one not delivered is called off.
 */
const props = defineProps<{ grants: BenefitGrant[]; loading?: boolean; showEmployee?: boolean; showBenefit?: boolean; mayManage?: boolean }>()
const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

async function retry(grant: BenefitGrant) {
	try {
		const result = await retryGrant(grant.id)
		if (result.status === "failed") message.warning(result.failure || t("hrBenefits.grants.stillFailed"))
		else message.success(t("hrBenefits.grants.retried"))
		emit("changed")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	}
}

function confirmCancel(grant: BenefitGrant) {
	dialog.warning({
		title: t("hrBenefits.grants.cancel"),
		content: t("hrBenefits.grants.cancelConfirm"),
		positiveText: t("hrBenefits.grants.cancel"),
		negativeText: t("hr.common.back"),
		onPositiveClick: async () => {
			try {
				message.success(serverMessage(await cancelGrant(grant.id), t("hrBenefits.grants.cancelled")))
				emit("changed")
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

function statusCell(row: BenefitGrant) {
	const tag = h(GrantStatusTag, { status: row.status })
	if (row.status !== "failed" || !row.failure) return tag
	return h(NTooltip, {}, { trigger: () => h("span", { class: "cursor-help" }, [tag]), default: () => row.failure })
}

const scrollX = computed(() => 620 + (props.showEmployee ? 200 : 0) + (props.showBenefit ? 180 : 0) + (props.mayManage ? 80 : 0))

const columns = computed<DataTableColumns<BenefitGrant>>(() => [
	...(props.showEmployee ? [{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 200, render: (row: BenefitGrant) => employeeCell(row.employee) }] : []),
	...(props.showBenefit ? [{ title: t("hrBenefits.benefit"), key: "benefit", minWidth: 180, render: (row: BenefitGrant) => translated(row.benefit?.name) || EMPTY }] : []),
	{ title: t("hrBenefits.grants.period"), key: "period", minWidth: 130, render: row => grantPeriodLabel(t, row.period) },
	{ title: t("hrBenefits.grants.grantedOn"), key: "granted_on", minWidth: 110, render: row => formatDate(row.granted_on) },
	{ title: t("hrBenefits.amount"), key: "amount", minWidth: 120, render: row => h("span", { class: "add-numeric" }, benefitValue(t, row.amount, row.currency, row.unit)) },
	{
		title: t("hrBenefits.employerCost"),
		key: "employer_cost",
		minWidth: 120,
		render: row => h("span", { class: "add-numeric" }, row.employer_cost && row.cost_currency ? money(row.employer_cost, row.cost_currency) : EMPTY)
	},
	{ title: t("hr.common.status"), key: "status", minWidth: 130, render: statusCell },
	...(props.mayManage
		? [
				{
					title: "",
					key: "actions",
					width: 100,
					render: (row: BenefitGrant) =>
						h(RowActions, {
							actions: [
								...(canRetryGrant(row) ? [{ key: "retry", label: t("hrBenefits.grants.retry"), icon: "carbon:renew", onClick: () => void retry(row) }] : []),
								...(canCancelGrant(row.status) ? [{ key: "cancel", label: t("hrBenefits.grants.cancel"), icon: "carbon:close", danger: true, onClick: () => confirmCancel(row) }] : [])
							]
						})
				}
			]
		: [])
])
</script>
