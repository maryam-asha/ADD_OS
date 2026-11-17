<template>
	<div class="flex flex-col gap-5">
		<!-- Header -->
		<PageHeader :title="t('nav.pages.companyReport', 'تقرير شركاتي')" :description="t('reports.providerCompanies.description', 'نظرة شاملة على الشركات، الاشتراكات السارية، المكاتب المؤجرة، والمبالغ المستحقة.')">
			<template #actions>
				<n-button secondary :loading="isLoading" @click="fetchData">
					<template #icon><Icon name="carbon:renew" :size="16" /></template>
					{{ t("common.refresh") }}
				</n-button>
			</template>
		</PageHeader>

		<!-- Quick Metric Highlights -->
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<n-card size="small">
				<n-statistic :label="t('reports.providerCompanies.totalCompanies', 'إجمالي الشركات')" :value="rows.length" />
			</n-card>
			<n-card size="small">
				<n-statistic :label="t('reports.providerCompanies.subscribedCompanies', 'شركات باشتراك سارٍ')" :value="activeMembershipsCount" />
			</n-card>
			<n-card size="small">
				<n-statistic
					:label="t('reports.providerCompanies.stoppedRenewals', 'تجديد متوقف')"
					:value="stoppedRenewalsCount"
				>
					<template v-if="stoppedRenewalsCount > 0" #prefix>
						<Icon name="carbon:warning-alt" class="text-[var(--add-warning-text)]" :size="18" />
					</template>
				</n-statistic>
			</n-card>
			<n-card size="small">
				<n-statistic
					:label="t('reports.providerCompanies.withOverdue', 'شركات عليها متأخرات')"
					:value="companiesWithOverdueCount"
				>
					<template v-if="companiesWithOverdueCount > 0" #prefix>
						<Icon name="carbon:warning" class="text-[var(--add-danger-text)]" :size="18" />
					</template>
				</n-statistic>
			</n-card>
		</div>

		<!-- Filter Bar -->
		<n-card size="small">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="w-full sm:w-72">
					<n-input
						v-model:value="searchQuery"
						clearable
						:placeholder="t('reports.providerCompanies.searchPlaceholder', 'بحث باسم الشركة...')"
					>
						<template #prefix><Icon name="carbon:search" :size="16" class="text-[var(--add-text-muted)]" /></template>
					</n-input>
				</div>
				<div class="text-xs text-[var(--add-text-muted)]">
					{{ t("reports.common.totalCount", { count: filteredRows.length }) }}
				</div>
			</div>
		</n-card>

		<!-- Data Table -->
		<n-card class="add-ledger-table">
			<n-data-table
				size="small"
				:scroll-x="900"
				:columns
				:data="filteredRows"
				:loading="isLoading"
				:bordered="false"
				:row-key="(r: ProviderCompanyReportItem) => r.id"
				:pagination
			/>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { ProviderCompanyReportItem } from "@/add-os/services/reports"
import { NButton, NCard, NDataTable, NInput, NStatistic, NTag, NTooltip } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import { formatReportMoney, getProviderCompaniesReport } from "@/add-os/services/reports"
import { formatDate } from "@/add-os/utils/format/dates"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()

const isLoading = ref(false)
const rows = ref<ProviderCompanyReportItem[]>([])
const searchQuery = ref("")

const pagination = { pageSize: 15 }

async function fetchData() {
	isLoading.value = true
	try {
		rows.value = await getProviderCompaniesReport()
	} catch (e) {
		console.error("Failed to load provider companies report:", e)
	} finally {
		isLoading.value = false
	}
}

onMounted(() => {
	fetchData()
})

const filteredRows = computed(() => {
	if (!searchQuery.value.trim()) return rows.value
	const q = searchQuery.value.toLowerCase().trim()
	return rows.value.filter(r => r.legal_name?.toLowerCase().includes(q))
})

const activeMembershipsCount = computed(() => {
	return rows.value.filter(r => r.membership !== null).length
})

const stoppedRenewalsCount = computed(() => {
	return rows.value.filter(r => r.membership && (!r.membership.auto_renew || r.membership.renewal_stop_reason)).length
})

const companiesWithOverdueCount = computed(() => {
	return rows.value.filter(r => r.outstanding.some(o => Number.parseFloat(o.overdue) > 0)).length
})

const columns = computed<DataTableColumns<ProviderCompanyReportItem>>(() => [
	{
		title: t("companies.columns.legalName", "اسم الشركة"),
		key: "legal_name",
		minWidth: 180,
		align: "center",
		render: row =>
			h("div", { class: "inline-flex flex-col items-center gap-0.5" }, [
				h("span", { class: "font-semibold text-[var(--add-text-primary)]" }, row.legal_name),
				h(
					NTag,
					{
						size: "tiny",
						type: row.status === "active" ? "success" : "default",
						bordered: false,
						round: true,
						class: "w-fit"
					},
					{ default: () => t(`companies.status.${row.status}`, row.status) }
				)
			])
	},
	{
		title: t("reports.providerCompanies.membersCount", "عدد الأعضاء"),
		key: "members_count",
		width: 100,
		align: "center",
		render: row => h("span", { class: "font-semibold font-mono" }, row.members_count ?? 0)
	},
	{
		title: t("reports.providerCompanies.currentMembership", "الاشتراك الحالي"),
		key: "membership",
		minWidth: 220,
		align: "center",
		render: row => {
			if (!row.membership) {
				return h("span", { class: "text-[var(--add-text-muted)] text-sm" }, "—")
			}
			const m = row.membership
			const isRenewalStopped = !m.auto_renew || !!m.renewal_stop_reason
			const stopReasonText = m.renewal_stop_reason_label || m.renewal_stop_reason || t("reports.providerCompanies.renewalStopped", "تجديد متوقف")

			return h("div", { class: "inline-flex flex-col items-center gap-1 py-1" }, [
				h("div", { class: "flex items-center justify-center gap-1.5 flex-wrap" }, [
					h("span", { class: "font-medium text-sm text-[var(--add-text-primary)]" }, m.plan_name || "—"),
					h(
						NTag,
						{ size: "tiny", type: "info", bordered: false, round: true },
						{ default: () => `${m.seats} ${t("reports.providerCompanies.seats", "مقاعد")}` }
					)
				]),
				h("div", { class: "flex items-center justify-center gap-2 text-xs text-[var(--add-text-secondary)]" }, [
					h("span", `${t("reports.providerCompanies.endsAt", "ينتهي:")} ${m.current_period_end ? formatDate(m.current_period_end, { style: "short" }) : "—"}`)
				]),
				isRenewalStopped
					? h(
							NTooltip,
							{ trigger: "hover" },
							{
								trigger: () =>
									h(
										"div",
										{ class: "flex items-center gap-1 text-xs text-[var(--add-warning-text)] font-medium cursor-help" },
										[
											h(Icon, { name: "carbon:warning-alt", size: 14 }),
											h("span", stopReasonText)
										]
									),
								default: () => t("reports.providerCompanies.stopReasonTooltip", { reason: stopReasonText })
							}
						)
					: h(
							NTag,
							{ size: "tiny", type: "success", bordered: false, round: true, class: "w-fit" },
							{ default: () => t("reports.providerCompanies.autoRenewActive", "تجديد تلقائي مفعّل") }
						)
			])
		}
	},
	{
		title: t("reports.providerCompanies.activeLeases", "المكاتب المؤجرة"),
		key: "active_leases_count",
		width: 120,
		align: "center",
		render: row =>
			row.active_leases_count > 0
				? h(
						NTag,
						{ size: "small", type: "info", round: true, bordered: false },
						{ default: () => `${row.active_leases_count} ${t("reports.providerCompanies.offices", "مكتب")}` }
					)
				: h("span", { class: "text-[var(--add-text-muted)]" }, "0")
	},
	{
		title: t("reports.providerCompanies.outstandingDues", "المستحق عليها"),
		key: "outstanding",
		minWidth: 200,
		align: "center",
		render: row => {
			if (!row.outstanding || row.outstanding.length === 0) {
				return h("span", { class: "text-[var(--add-text-muted)]" }, "—")
			}
			return h(
				"div",
				{ class: "inline-flex flex-col items-center gap-1 py-1" },
				row.outstanding.map(o => {
					const hasOverdue = Number.parseFloat(o.overdue) > 0
					return h(
						"div",
						{ class: "flex items-center justify-between gap-2 text-xs rounded px-2 py-1 bg-[var(--add-surface-sunken)]" },
						[
							h("span", { class: "font-mono font-medium text-[var(--add-text-secondary)]" }, `${t("reports.common.remaining", "المتبقي:")} ${formatReportMoney(o.remaining, o.currency)}`),
							hasOverdue
								? h(
										NTag,
										{ size: "tiny", type: "error", round: true, bordered: false },
										{ default: () => `${t("reports.common.overdueShort", "متأخر:")} ${formatReportMoney(o.overdue, o.currency)}` }
									)
								: null
						]
					)
				})
			)
		}
	}
])
</script>
