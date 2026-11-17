<template>
	<div class="flex flex-col gap-6">
		<!-- Header -->
		<PageHeader :title="t('nav.pages.providersReport', 'تقرير المزوّدين')" :description="t('reports.adminProviders.description', 'صورة تشغيلية ومالية شاملة عن المزوّدين، حصصهم في فروع العمل المشترك، وعقود مكاتبهم ومستحقاتهم.')">
			<template #actions>
				<n-button secondary :loading="isLoading" @click="fetchData">
					<template #icon><Icon name="carbon:renew" :size="16" /></template>
					{{ t("common.refresh") }}
				</n-button>
			</template>
		</PageHeader>

		<!-- Summary Metric Cards -->
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<n-card size="small">
				<n-statistic :label="t('reports.adminProviders.totalProviders', 'إجمالي المزوّدين')" :value="rows.length" />
			</n-card>
			<n-card size="small">
				<n-statistic :label="t('reports.adminProviders.totalActiveCompanies', 'إجمالي الشركات النشطة')" :value="totalActiveCompanies" />
			</n-card>
			<n-card size="small">
				<n-statistic :label="t('reports.adminProviders.totalSeatsHeld', 'مجموع المقاعد المحجوزة')" :value="totalSeatsHeld" />
			</n-card>
			<n-card size="small">
				<n-statistic
					:label="t('reports.adminProviders.providersWithOverdue', 'مزوّدون عليهم متأخرات')"
					:value="providersWithOverdueCount"
				>
					<template v-if="providersWithOverdueCount > 0" #prefix>
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
						:placeholder="t('reports.adminProviders.searchPlaceholder', 'بحث باسم المزوّد...')"
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
				:scroll-x="1100"
				:columns
				:data="filteredRows"
				:loading="isLoading"
				:bordered="false"
				:row-key="(r: AdminProviderReportItem) => r.id"
				:pagination="{ pageSize: 12 }"
			/>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { AdminProviderReportItem } from "@/add-os/services/reports"
import { NButton, NCard, NDataTable, NInput, NProgress, NStatistic, NTag } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import { formatReportMoney, getAdminProvidersReport } from "@/add-os/services/reports"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()

const isLoading = ref(false)
const rows = ref<AdminProviderReportItem[]>([])
const searchQuery = ref("")

async function fetchData() {
	isLoading.value = true
	try {
		rows.value = await getAdminProvidersReport()
	} catch (e) {
		console.error("Failed to load admin providers report:", e)
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
	return rows.value.filter(r => r.name?.toLowerCase().includes(q))
})

const totalActiveCompanies = computed(() => {
	return rows.value.reduce((acc, r) => acc + (r.active_companies || 0), 0)
})

const totalSeatsHeld = computed(() => {
	return rows.value.reduce((acc, r) => acc + (r.seats || 0), 0)
})

const providersWithOverdueCount = computed(() => {
	return rows.value.filter(r => r.outstanding.some(o => Number.parseFloat(o.overdue) > 0)).length
})

const columns = computed<DataTableColumns<AdminProviderReportItem>>(() => [
	{
		title: t("providers.columns.name"),
		key: "name",
		minWidth: 180,
		align: "center",
		render: row =>
			h("div", { class: "inline-flex flex-col items-center gap-0.5" }, [
				h("span", { class: "font-semibold text-[var(--add-text-primary)]" }, row.name),
				h(
					NTag,
					{
						size: "tiny",
						type: row.status === "active" ? "success" : "default",
						round: true,
						bordered: false,
						class: "w-fit"
					},
					{ default: () => t(`providers.status.${row.status}`, row.status) }
				)
			])
	},
	{
		title: t("reports.adminProviders.activeCompanies", "الشركات النشطة"),
		key: "active_companies",
		width: 110,
		align: "center",
		render: row => h("span", { class: "font-semibold font-mono text-[var(--add-text-primary)]" }, row.active_companies)
	},
	{
		title: t("reports.adminProviders.totalSeats", "مجموع المقاعد"),
		key: "seats",
		width: 110,
		align: "center",
		render: row =>
			h(
				NTag,
				{ size: "small", type: "info", round: true, bordered: false },
				{ default: () => `${row.seats} ${t("reports.adminProviders.seatsUnit", "مقعد")}` }
			)
	},
	{
		title: t("reports.adminProviders.branchShare", "الحصة من الفروع"),
		key: "branch_share",
		minWidth: 260,
		align: "center",
		render: row => {
			if (!row.branch_share || row.branch_share.length === 0) {
				return h("span", { class: "text-[var(--add-text-muted)] text-sm" }, "—")
			}
			return h(
				"div",
				{ class: "inline-flex flex-col items-center gap-2 py-1 w-full max-w-xs" },
				row.branch_share.map(b => {
					const hasCapacity = b.capacity > 0 && b.share !== null
					const percentValue = hasCapacity ? Math.min(100, Math.round(Number.parseFloat(b.share!) * 100)) : 0

					return h(
						"div",
						{ class: "flex flex-col gap-1 rounded-md p-1.5 bg-[var(--add-surface-sunken)] text-xs w-full text-start" },
						[
							h("div", { class: "flex items-center justify-between gap-2" }, [
								h("span", { class: "font-medium text-[var(--add-text-primary)]" }, b.branch_name || t("reports.adminProviders.unknownBranch", "فرع غير مسمى")),
								h("span", { class: "text-[var(--add-text-secondary)] font-mono text-[11px]" }, [
									h("span", `${b.seats} / ${b.capacity} ${t("reports.adminProviders.seatsShort", "مقعد")}`)
								])
							]),
							hasCapacity
								? h("div", { class: "flex items-center gap-2" }, [
										h("div", { class: "flex-1" }, [
											h(NProgress, {
												type: "line",
												percentage: percentValue,
												height: 6,
												showIndicator: false,
												status: percentValue > 50 ? "warning" : "default"
											})
										]),
										h("span", { class: "font-semibold text-[var(--add-text-primary)] w-8 text-right font-mono text-[11px]" }, `${percentValue}%`)
									])
								: h("span", { class: "text-[var(--add-text-muted)] font-mono text-xs" }, "—")
						]
					)
				})
			)
		}
	},
	{
		title: t("reports.adminProviders.activeLeases", "المكاتب المؤجرة"),
		key: "active_leases",
		width: 120,
		align: "center",
		render: row =>
			row.active_leases > 0
				? h(
						NTag,
						{ size: "small", type: "default", round: true, bordered: false },
						{ default: () => `${row.active_leases} ${t("reports.adminProviders.officesUnit", "مكتب")}` }
					)
				: h("span", { class: "text-[var(--add-text-muted)]" }, "0")
	},
	{
		title: t("reports.adminProviders.outstandingDues", "المستحق لكل عملة"),
		key: "outstanding",
		minWidth: 220,
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
