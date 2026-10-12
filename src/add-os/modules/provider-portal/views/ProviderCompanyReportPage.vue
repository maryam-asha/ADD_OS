<template>
	<div class="flex flex-col gap-5">
		<!-- Header -->
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t("nav.pages.companyReport", "تقرير شركاتي") }}</h1>
				<p class="text-sm text-neutral-500">
					{{ t("reports.providerCompanies.description", "نظرة شاملة على الشركات، الاشتراكات السارية، المكاتب المؤجرة، والمبالغ المستحقة.") }}
				</p>
			</div>
			<n-button secondary :loading="isLoading" @click="fetchData">
				<template #icon><Icon name="carbon:renew" :size="16" /></template>
				{{ t("common.refresh", "تحديث") }}
			</n-button>
		</div>

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
						<Icon name="carbon:warning-alt" class="text-amber-500" :size="18" />
					</template>
				</n-statistic>
			</n-card>
			<n-card size="small">
				<n-statistic
					:label="t('reports.providerCompanies.withOverdue', 'شركات عليها متأخرات')"
					:value="companiesWithOverdueCount"
				>
					<template v-if="companiesWithOverdueCount > 0" #prefix>
						<Icon name="carbon:warning" class="text-rose-500" :size="18" />
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
						<template #prefix><Icon name="carbon:search" :size="16" class="text-neutral-400" /></template>
					</n-input>
				</div>
				<div class="text-xs text-neutral-400">
					{{ t("reports.common.totalCount", { count: filteredRows.length }) }}
				</div>
			</div>
		</n-card>

		<!-- Data Table -->
		<n-card class="add-ledger-table">
			<n-data-table
				:columns="columns"
				:data="filteredRows"
				:loading="isLoading"
				:bordered="false"
				:row-key="(r: ProviderCompanyReportItem) => r.id"
				:pagination="pagination"
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
		width: 180,
		render: row =>
			h("div", { class: "flex flex-col gap-0.5" }, [
				h("span", { class: "font-semibold text-neutral-800 dark:text-neutral-100" }, row.legal_name),
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
		render: row => h("span", { class: "font-semibold" }, row.members_count ?? 0)
	},
	{
		title: t("reports.providerCompanies.currentMembership", "الاشتراك الحالي"),
		key: "membership",
		minWidth: 220,
		render: row => {
			if (!row.membership) {
				return h("span", { class: "text-neutral-400 text-sm" }, "—")
			}
			const m = row.membership
			const isRenewalStopped = !m.auto_renew || !!m.renewal_stop_reason
			const stopReasonText = m.renewal_stop_reason_label || m.renewal_stop_reason || t("reports.providerCompanies.renewalStopped", "تجديد متوقف")

			return h("div", { class: "flex flex-col gap-1 py-1" }, [
				h("div", { class: "flex items-center gap-1.5 flex-wrap" }, [
					h("span", { class: "font-medium text-sm text-neutral-800 dark:text-neutral-200" }, m.plan_name || "—"),
					h(
						NTag,
						{ size: "tiny", type: "info", bordered: false, round: true },
						{ default: () => `${m.seats} ${t("reports.providerCompanies.seats", "مقاعد")}` }
					)
				]),
				h("div", { class: "flex items-center gap-2 text-xs text-neutral-500" }, [
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
										{ class: "flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium cursor-help" },
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
				: h("span", { class: "text-neutral-400" }, "0")
	},
	{
		title: t("reports.providerCompanies.outstandingDues", "المستحق عليها"),
		key: "outstanding",
		minWidth: 200,
		render: row => {
			if (!row.outstanding || row.outstanding.length === 0) {
				return h("span", { class: "text-neutral-400" }, "—")
			}
			return h(
				"div",
				{ class: "flex flex-col gap-1 py-1" },
				row.outstanding.map(o => {
					const hasOverdue = Number.parseFloat(o.overdue) > 0
					return h(
						"div",
						{ class: "flex items-center justify-between gap-2 text-xs rounded px-2 py-1 bg-neutral-50 dark:bg-neutral-800/60" },
						[
							h("span", { class: "font-mono font-medium text-neutral-600 dark:text-neutral-300" }, `${t("reports.common.remaining", "المتبقي:")} ${formatReportMoney(o.remaining, o.currency)}`),
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
