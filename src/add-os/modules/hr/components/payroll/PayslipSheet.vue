<template>
	<n-card size="large" class="mx-auto w-full max-w-3xl print:shadow-none">
		<article class="flex flex-col gap-5">
			<header class="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--add-border)] pb-4">
				<div class="flex flex-col gap-1">
					<span class="text-sm font-semibold text-secondary">{{ t("hr.certificate.issuer") }}</span>
					<h1 class="text-2xl font-bold">{{ t("hrPayroll.payslip.title") }}</h1>
					<span v-if="payslip.period" class="text-sm text-secondary">{{ periodLabel(payslip.period) }}</span>
				</div>
				<span v-if="payslip.published_at" class="text-sm text-secondary">{{ t("hrPayroll.payslip.issuedAt", { date: formatDate(payslip.published_at) }) }}</span>
				<n-tag v-else type="warning" size="small" round bordered>{{ t("hrPayroll.payslip.draft") }}</n-tag>
			</header>

			<n-descriptions :column="narrow ? 1 : 2" label-placement="left" size="small" bordered>
				<n-descriptions-item :label="t('hr.certificate.name')">{{ translated(payslip.employee.name) }}</n-descriptions-item>
				<n-descriptions-item :label="t('hr.profile.fields.employeeNumber')">
					<span dir="ltr">{{ payslip.employee.employee_number }}</span>
				</n-descriptions-item>
				<n-descriptions-item :label="t('hr.profile.fields.jobTitle')">{{ translated(payslip.employee.job_title) || none }}</n-descriptions-item>
				<n-descriptions-item :label="t('hr.profile.fields.orgUnit')">{{ translated(payslip.employee.org_unit) || none }}</n-descriptions-item>
				<n-descriptions-item :label="t('hrPayroll.payslip.days')">
					<span class="add-numeric">{{ t("hrPayroll.payslip.daysOf", { n: formatNumber(payslip.employed_days), of: formatNumber(payslip.days_in_month) }) }}</span>
				</n-descriptions-item>
				<n-descriptions-item :label="t('hrPayroll.currency')">
					<span dir="ltr">{{ payslip.currency }}</span>
				</n-descriptions-item>
			</n-descriptions>

			<n-alert v-if="showWarnings && payslip.warnings?.length" type="warning" :title="t('hrPayroll.payslip.warnings')" class="mb-0 print:hidden">
				<ul class="list-inside list-disc">
					<li v-for="warning in payslip.warnings" :key="warning">{{ warningLabel(t, warning) }}</li>
				</ul>
			</n-alert>

			<section v-for="group in groups" :key="group.kind" class="flex flex-col gap-2">
				<h2 class="text-base font-semibold">{{ t(`hrPayroll.kindPlural.${group.kind}`) }}</h2>
				<n-table size="small" :single-line="false">
					<thead>
						<tr>
							<th>{{ t("hrPayroll.pay.component") }}</th>
							<th>{{ t("hrPayroll.payslip.basis") }}</th>
							<th class="text-end">{{ t("hrPayroll.pay.amount") }}</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(line, index) in group.lines" :key="`${line.code}-${index}`">
							<td>{{ translated(line.name) || line.code }}</td>
							<td class="text-sm text-secondary">
								<span dir="ltr">{{ line.basis || none }}</span>
								<span v-if="line.original_currency && line.original_currency !== payslip.currency && line.original_amount" class="ms-2">
									({{ money(line.original_amount, line.original_currency) }})
								</span>
							</td>
							<td class="add-numeric text-end">{{ money(line.amount, payslip.currency) }}</td>
						</tr>
					</tbody>
				</n-table>
			</section>

			<n-descriptions :column="1" label-placement="left" size="small" bordered>
				<n-descriptions-item :label="t('hrPayroll.totals.gross')">
					<span class="add-numeric">{{ money(payslip.gross, payslip.currency) }}</span>
				</n-descriptions-item>
				<n-descriptions-item :label="t('hrPayroll.totals.deductions')">
					<span class="add-numeric">{{ money(payslip.deductions, payslip.currency) }}</span>
				</n-descriptions-item>
				<n-descriptions-item :label="t('hrPayroll.totals.net')">
					<span class="add-numeric text-lg font-bold">{{ money(payslip.net, payslip.currency) }}</span>
				</n-descriptions-item>
				<n-descriptions-item v-if="payslip.employer_cost !== undefined" :label="t('hrPayroll.totals.employerCost')">
					<span class="add-numeric">{{ money(payslip.employer_cost, payslip.currency) }}</span>
				</n-descriptions-item>
			</n-descriptions>

			<footer class="text-sm text-secondary">{{ t("hrPayroll.payslip.footer") }}</footer>
		</article>
	</n-card>
</template>

<script setup lang="ts">
import type { Payslip } from "@/add-os/modules/hr/types/payroll"
import { NAlert, NCard, NDescriptions, NDescriptionsItem, NTable, NTag } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useNarrowScreen } from "@/add-os/modules/hr/composables/useNarrowScreen"
import { money } from "@/add-os/modules/hr/utils/money"
import { linesByKind, periodLabel, warningLabel } from "@/add-os/modules/hr/utils/payroll"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { formatDate, formatNumber } from "@/add-os/utils/format"

/**
 * A payslip laid out for reading and for paper: who it is for as they were
 * when it was calculated, its lines by kind with how each was worked out,
 * and its totals. The employer's cost shows only where the server sends it
 * (HR's view, never the employee's). Everything is the server's figure.
 */
const props = defineProps<{ payslip: Payslip; showWarnings?: boolean }>()

const { t } = useI18n()
const narrow = useNarrowScreen()
const none = EMPTY

const groups = computed(() => linesByKind(props.payslip.lines ?? []))
</script>
