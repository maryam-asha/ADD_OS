<!-- src/add-os/modules/hr/views/core/MyCertificatePage.vue -->
<template>
	<div class="add-print-page flex flex-col gap-5">
		<div class="flex flex-wrap items-center justify-between gap-3 print:hidden">
			<n-button text @click="router.push({ name: 'myHr.myProfile' })">
				<template #icon><Icon name="carbon:arrow-left" :size="16" class="rtl:rotate-180" /></template>
				{{ t("hr.common.back") }}
			</n-button>
			<n-button v-if="certificate" type="primary" @click="print">
				<template #icon><Icon name="carbon:printer" :size="16" /></template>
				{{ t("hr.certificate.print") }}
			</n-button>
		</div>

		<n-alert v-if="!validKind" type="warning" :title="t('hr.certificate.unknown')" />
		<n-alert v-else-if="loadError" type="error" :title="loadError" />
		<n-skeleton v-else-if="loading" text :repeat="8" />

		<n-card v-else-if="certificate" size="large" class="mx-auto w-full max-w-3xl print:shadow-none">
			<article class="flex flex-col gap-6 leading-relaxed">
				<header class="flex flex-col gap-1 border-b border-[var(--add-border)] pb-4">
					<span class="text-sm font-semibold text-secondary">{{ t("hr.certificate.issuer") }}</span>
					<h1 class="text-2xl font-bold">{{ kind === "salary" ? t("hr.certificate.salaryTitle") : t("hr.certificate.employmentTitle") }}</h1>
					<span class="text-sm text-secondary">{{ t("hr.certificate.generatedAt", { date: formatDateTime(certificate.generated_at) }) }}</span>
				</header>

				<p>{{ t("hr.certificate.toWhom") }}</p>
				<p>{{ statement }}</p>

				<n-descriptions :column="1" label-placement="left" size="small" bordered>
					<n-descriptions-item :label="t('hr.certificate.name')">{{ translated(certificate.name) }}</n-descriptions-item>
					<n-descriptions-item :label="t('hr.profile.fields.employeeNumber')">
						<span dir="ltr">{{ certificate.employee_number }}</span>
					</n-descriptions-item>
					<n-descriptions-item :label="t('hr.profile.fields.hiredOn')">{{ formatDate(certificate.hired_on) }}</n-descriptions-item>
					<n-descriptions-item :label="t('hr.profile.fields.jobTitle')">{{ translated(certificate.job_title) || none }}</n-descriptions-item>
					<n-descriptions-item :label="t('hr.profile.fields.orgUnit')">{{ translated(certificate.org_unit) || none }}</n-descriptions-item>
					<n-descriptions-item :label="t('hr.profile.fields.contractType')">
						{{ certificate.contract_type ? t(`hr.contractType.${certificate.contract_type}`) : none }}
					</n-descriptions-item>
					<n-descriptions-item :label="t('hr.profile.fields.status')">{{ t(`hr.status.${certificate.status}`) }}</n-descriptions-item>
				</n-descriptions>

				<template v-if="salary">
					<section class="flex flex-col gap-2">
						<h2 class="text-lg font-semibold">{{ t("hr.certificate.monthlyPay") }}</h2>
						<n-table v-if="salary.monthly_pay.length" size="small" :single-line="false">
							<thead>
								<tr>
									<th>{{ t("hr.certificate.component") }}</th>
									<th class="text-end">{{ t("hr.certificate.amount") }}</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="line in salary.monthly_pay" :key="line.code">
									<td>{{ translated(line.name) }}</td>
									<td class="add-numeric text-end">{{ money(line.amount, line.currency) }}</td>
								</tr>
							</tbody>
						</n-table>
						<p v-else class="text-secondary">{{ t("hr.certificate.noPay") }}</p>
					</section>

					<section v-if="salary.last_payslip" class="flex flex-col gap-2">
						<h2 class="text-lg font-semibold">{{ t("hr.certificate.lastPayslip", { period: salary.last_payslip.period }) }}</h2>
						<n-descriptions :column="2" label-placement="left" size="small" bordered>
							<n-descriptions-item :label="t('hr.certificate.gross')">
								<span class="add-numeric">{{ money(salary.last_payslip.gross, salary.last_payslip.currency) }}</span>
							</n-descriptions-item>
							<n-descriptions-item :label="t('hr.certificate.net')">
								<span class="add-numeric">{{ money(salary.last_payslip.net, salary.last_payslip.currency) }}</span>
							</n-descriptions-item>
						</n-descriptions>
					</section>
				</template>

				<footer class="text-sm text-secondary">{{ t("hr.certificate.footer") }}</footer>
			</article>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { EmploymentCertificate, SalaryCertificate } from "@/add-os/modules/hr/types/hr"
import { NAlert, NButton, NCard, NDescriptions, NDescriptionsItem, NSkeleton, NTable } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { money } from "@/add-os/modules/hr/utils/money"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { getMyEmploymentCertificate, getMySalaryCertificate } from "@/add-os/services/hr/core"
import { formatDate, formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The signed-in employee's employment or salary certificate, laid out for
 * paper and printed by the browser — the server returns the facts as JSON
 * and generates no PDF. Each one fetched is audited on the server.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const none = EMPTY

const kind = computed(() => String(route.params.kind))
const validKind = computed(() => kind.value === "employment" || kind.value === "salary")

const certificate = ref<EmploymentCertificate | SalaryCertificate | null>(null)
const loading = ref(true)
const loadError = ref("")

const salary = computed(() => (kind.value === "salary" && certificate.value && "monthly_pay" in certificate.value ? (certificate.value as SalaryCertificate) : null))

const statement = computed(() => {
	const c = certificate.value
	if (!c) return ""
	const params = { name: translated(c.name), number: c.employee_number, date: formatDate(c.hired_on), title: translated(c.job_title) || none }
	return c.status === "terminated" ? t("hr.certificate.statementFormer", params) : t("hr.certificate.statement", params)
})

async function load() {
	if (!validKind.value) return
	loading.value = true
	loadError.value = ""
	try {
		certificate.value = kind.value === "salary" ? await getMySalaryCertificate() : await getMyEmploymentCertificate()
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

onMounted(load)

function print() {
	window.print()
}
</script>
