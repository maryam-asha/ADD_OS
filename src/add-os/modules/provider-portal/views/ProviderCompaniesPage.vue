<!-- src/add-os/modules/provider-portal/views/ProviderCompaniesPage.vue -->
<template>
	<div class="flex flex-col gap-5 text-neutral-800 dark:text-neutral-100">
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- HEADER & ACTIONS -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
					{{ t("providerPortal.companies", "الشركات") }}
				</h1>
				<p class="text-sm text-neutral-500">
					{{ t("companies.description", "إدارة وتتبع بيانات الشركات المسجلة، اشتراكاتها المكانية، عقود الإيجار، والمستحقات المالية.") }}
				</p>
			</div>

			<div class="flex items-center gap-2">
				<n-button
					secondary
					class="rounded-lg"
					:loading="isLoading"
					@click="refetch"
				>
					<template #icon><Icon name="carbon:renew" :size="16" /></template>
					{{ t("common.refresh", "تحديث") }}
				</n-button>
				<n-button
					type="primary"
					class="rounded-lg font-medium"
					:disabled="isLoading || !data.length"
					@click="exportCsv"
				>
					<template #icon><Icon name="carbon:download" :size="16" /></template>
					{{ t("reports.common.exportCsv", "تصدير CSV") }}
				</n-button>
			</div>
		</div>

		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- METRICS SUMMARY HIGHLIGHTS -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<!-- Total Companies -->
			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400">
						{{ t("reports.providerCompanies.totalCompanies", "إجمالي الشركات") }}
					</span>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--add-primary,#657C50)]/10 text-[var(--add-primary-text,#556843)] dark:bg-[var(--add-primary,#657C50)]/20 dark:text-[var(--add-primary,#657C50)]">
						<Icon name="carbon:enterprise" :size="18" />
					</div>
				</div>
				<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-text-primary,#43474F)] dark:text-neutral-50">
					{{ meta?.total ?? data.length }}
				</span>
			</div>

			<!-- Active Subscriptions -->
			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400">
						{{ t("reports.providerCompanies.subscribedCompanies", "شركات باشتراك سارٍ") }}
					</span>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--add-success,#657C50)]/10 text-[var(--add-success-text,#556843)] dark:bg-[var(--add-success,#657C50)]/20 dark:text-[var(--add-success,#657C50)]">
						<Icon name="carbon:id-management" :size="18" />
					</div>
				</div>
				<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-primary-text,#556843)] dark:text-[var(--add-primary,#657C50)]">
					{{ activeSubscriptionsCount }}
				</span>
			</div>

			<!-- Stopped Renewals -->
			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400">
						{{ t("reports.providerCompanies.stoppedRenewals", "تجديد متوقف") }}
					</span>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--add-warning,#E7B155)]/10 text-[var(--add-warning-text,#845A13)] dark:bg-[var(--add-warning,#E7B155)]/20 dark:text-[var(--add-warning,#E7B155)]">
						<Icon name="carbon:warning-alt" :size="18" />
					</div>
				</div>
				<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-warning-text,#845A13)] dark:text-[var(--add-warning,#E7B155)]">
					{{ stoppedRenewalsCount }}
				</span>
			</div>

			<!-- Companies with Overdue -->
			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400">
						{{ t("reports.providerCompanies.withOverdue", "شركات عليها متأخرات") }}
					</span>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--add-danger,#D93D23)]/10 text-[var(--add-danger-text,#B4321D)] dark:bg-[var(--add-danger,#D93D23)]/20 dark:text-[var(--add-danger,#D93D23)]">
						<Icon name="carbon:warning" :size="18" />
					</div>
				</div>
				<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-danger-text,#B4321D)] dark:text-[var(--add-danger,#D93D23)]">
					{{ overdueCompaniesCount }}
				</span>
			</div>
		</div>

		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- FILTERS SECTION -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-3.5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60">
			<div class="flex flex-1 flex-wrap items-center gap-3">
				<!-- Search -->
				<div class="w-full sm:w-72">
					<n-input
						v-model:value="searchTerm"
						clearable
						:placeholder="t('companies.filters.search', 'البحث باسم الشركة أو رقم السجل...')"
						class="rounded-xl"
					>
						<template #prefix>
							<Icon name="carbon:search" :size="16" class="text-neutral-400" />
						</template>
					</n-input>
				</div>

				<!-- Status Filter -->
				<div class="w-44">
					<n-select
						v-model:value="statusFilter"
						:options="statusOptions"
						class="rounded-xl"
						:placeholder="t('companies.filters.status', 'الحالة: الجميع')"
					/>
				</div>
			</div>

			<div class="flex items-center gap-2 text-xs text-[var(--add-text-muted,#5A606B)]">
				<span>{{ t('reports.common.totalCount', { count: filteredData.length }) }}</span>
				<n-button
					v-if="searchTerm || statusFilter !== 'all'"
					size="tiny"
					secondary
					class="rounded-md"
					@click="resetFilters"
				>
					{{ t('common.reset', 'إعادة تعيين') }}
				</n-button>
			</div>
		</div>

		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- MAIN DATA TABLE -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<div class="overflow-hidden rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60 add-ledger-table">
			<n-data-table
				:columns="columns"
				:data="filteredData"
				:loading="isLoading"
				:bordered="false"
				size="small"
				:row-key="rowKey"
				:pagination="false"
				:scroll-x="1100"
			/>

			<!-- Empty State when filtered data is empty -->
			<div v-if="!isLoading && filteredData.length === 0" class="py-14 text-center text-sm text-[var(--add-text-muted,#5A606B)]">
				{{ t("companies.empty", "لا توجد شركات مطابقة لمعايير البحث.") }}
			</div>

			<!-- Custom Pagination Footer -->
			<div
				v-if="filteredData.length > 0"
				class="flex flex-col sm:flex-row items-center justify-between px-6 py-3.5 border-t border-[var(--add-border,#CDC2AF)]/30 dark:border-neutral-800 gap-3 text-xs text-[var(--add-text-secondary,#565B65)] dark:text-neutral-400 bg-[var(--add-surface,#F7F5F2)]/40 dark:bg-neutral-900/40"
			>
				<div>
					{{ t('companies.pagination.showing', 'عرض {from} إلى {to} من أصل {total} شركة', {
						from: meta ? ((meta.current_page - 1) * meta.per_page) + 1 : 1,
						to: meta ? Math.min(meta.current_page * meta.per_page, meta.total) : filteredData.length,
						total: meta?.total ?? filteredData.length
					}) }}
				</div>

				<n-pagination
					v-model:page="page"
					:page-count="meta?.last_page || Math.ceil((meta?.total || filteredData.length) / (meta?.per_page || 15))"
					:page-slot="5"
					size="small"
				>
					<template #prev>{{ t('companies.pagination.prev', 'السابق') }}</template>
					<template #next>{{ t('companies.pagination.next', 'التالي') }}</template>
				</n-pagination>
			</div>
		</div>

		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- DETAIL MODAL -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<ProviderCompanyDetailModal
			v-model:show="detailModalVisible"
			:company-id="selectedCompanyId"
			@updated="refetch"
		/>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { Company } from "@/add-os/modules/members/types/company"
import { NButton, NDataTable, NInput, NPagination, NSelect, NTag, NTooltip } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useResourceList } from "@/add-os/composables/useResourceList"
import ProviderCompanyDetailModal from "@/add-os/modules/provider-portal/components/ProviderCompanyDetailModal.vue"
import { listProviderCompanies } from "@/add-os/services/provider-portal"
import { formatReportMoney } from "@/add-os/services/reports"
import { formatDate } from "@/add-os/utils/format/dates"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()
const page = ref(1)
const query = ref<Record<string, unknown>>({})

const searchTerm = ref("")
const statusFilter = ref<string>("all")

const { data, isLoading, meta, refetch } = useResourceList<Company>(
	q => listProviderCompanies({ ...q, page: page.value }),
	query,
	page
)

const selectedCompanyId = ref<number | null>(null)
const detailModalVisible = ref(false)

function openDetail(row: Company) {
	selectedCompanyId.value = row.id
	detailModalVisible.value = true
}

function rowKey(row: Company) {
	return row.id
}

const statusOptions = computed<SelectOption[]>(() => [
	{ label: t("companies.status.all", "الحالة: الجميع"), value: "all" },
	{ label: t("companies.status.active", "نشط"), value: "active" },
	{ label: t("companies.status.inactive", "غير نشط"), value: "inactive" }
])

function resetFilters() {
	searchTerm.value = ""
	statusFilter.value = "all"
}

const filteredData = computed(() => {
	let list = data.value || []

	if (statusFilter.value !== "all") {
		list = list.filter(item => item.status === statusFilter.value)
	}

	if (searchTerm.value.trim()) {
		const term = searchTerm.value.toLowerCase().trim()
		list = list.filter(item =>
			item.legal_name?.toLowerCase().includes(term) ||
			item.contract_ref?.toLowerCase().includes(term) ||
			String(item.id).includes(term)
		)
	}

	return list
})

const activeSubscriptionsCount = computed(() => {
	return (data.value || []).filter(c => (c as any).membership !== null && (c as any).membership !== undefined).length
})

const stoppedRenewalsCount = computed(() => {
	return (data.value || []).filter(c => {
		const m = (c as any).membership
		return m && (!m.auto_renew || m.renewal_stop_reason)
	}).length
})

const overdueCompaniesCount = computed(() => {
	return (data.value || []).filter(c => {
		const m = (c as any).membership
		const outstanding = (c as any).outstanding
		if (m?.renewal_stop_reason || m?.overdue_amount) return true
		if (Array.isArray(outstanding)) {
			return outstanding.some(o => Number.parseFloat(o.overdue) > 0)
		}
		return false
	}).length
})


function getMonogram(name: string): string {
	if (!name) return "—"
	const cleaned = name.replace(/^(شركة|مؤسسة|مجموعة|مكتب)\s+/, "").trim()
	const parts = cleaned.split(/\s+/)
	if (parts[0] && parts[0].length >= 2) {
		return parts[0].slice(0, 3)
	}
	return name.slice(0, 3)
}

function exportCsv() {
	const headers = [
		t("common.id", "ID"),
		t("companies.columns.legalName", "اسم الشركة"),
		t("companies.columns.contractRef", "رقم العقد والسجل"),
		t("providerPortal.membershipTitle", "الاشتراك والخطة"),
		t("providerPortal.seats", "المقاعد"),
		t("providerPortal.members", "الموظفون"),
		t("providerPortal.companyLeases", "المكاتب المؤجرة"),
		t("reports.common.status", "الحالة")
	]

	const rows = filteredData.value.map(row => {
		const m = (row as any).membership
		const leases = (row as any).office_leases || []
		const membersCount = (row as any).members_count ?? (row as any).members?.length ?? 0
		return [
			`"${row.id}"`,
			`"${(row.legal_name || "").replace(/"/g, '""')}"`,
			`"${row.contract_ref || ""}"`,
			`"${(m?.plan_name || "—").replace(/"/g, '""')}"`,
			`"${m?.seats || 0}"`,
			`"${membersCount}"`,
			`"${leases.length}"`,
			`"${t(`companies.status.${row.status}`, row.status)}"`
		].join(",")
	})

	const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n")
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
	const url = URL.createObjectURL(blob)
	const link = document.createElement("a")
	link.setAttribute("href", url)
	link.setAttribute("download", `provider-companies-${new Date().toISOString().slice(0, 10)}.csv`)
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}

const columns = computed<DataTableColumns<Company>>(() => [
	/* 1. Company Name & Legal Monogram */
	{
		title: t("companies.columns.companyAndRecord", "الشركة والسجل"),
		key: "legal_name",
		minWidth: 240,
		align: "center",
		render: row => {
			const monogram = getMonogram(row.legal_name)
			return h("div", { class: "inline-flex items-center gap-3 py-1 text-start" }, [
				h(
					"div",
					{
						class: "flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-sunken,#EDEAE8)] text-xs font-bold text-[var(--add-text-primary,#43474F)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
					},
					monogram
				),
				h("div", { class: "flex min-w-0 flex-col gap-0.5" }, [
					h(
						"span",
						{
							class: "cursor-pointer truncate text-sm font-bold text-[var(--add-text-primary,#43474F)] hover:text-[var(--add-primary-text,#556843)] hover:underline dark:text-neutral-100",
							title: row.legal_name,
							onClick: () => openDetail(row)
						},
						row.legal_name
					),
					h(
						"span",
						{ class: "font-mono text-xs text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400" },
						`CR: #${row.contract_ref || row.id}`
					)
				])
			])
		}
	},

	/* 2. Membership & Plan Details */
	{
		title: t("providerPortal.membershipTitle", "الاشتراك والخطة"),
		key: "membership",
		minWidth: 200,
		align: "center",
		render: row => {
			const m = (row as any).membership
			if (!m) {
				return h("span", { class: "text-xs text-[var(--add-text-muted,#5A606B)]" }, "—")
			}

			const isRenewalStopped = !m.auto_renew || !!m.renewal_stop_reason
			const stopReasonText = m.renewal_stop_reason_label || m.renewal_stop_reason || t("reports.providerCompanies.renewalStopped", "تجديد متوقف")

			return h("div", { class: "inline-flex flex-col items-center gap-1 py-1" }, [
				h("div", { class: "flex flex-wrap items-center justify-center gap-1.5" }, [
					h("span", { class: "text-xs font-bold text-[var(--add-text-primary,#43474F)] dark:text-neutral-200" }, m.plan_name || "خطة اشتراك"),
					h(
						NTag,
						{
							size: "tiny",
							type: "primary",
							bordered: false,
							round: true,
							class: "font-medium"
						},
						{ default: () => `${m.seats || 0} ${t("reports.providerCompanies.seats", "مقاعد")}` }
					)
				]),
				h("div", { class: "flex items-center justify-center gap-2 text-xs text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400" }, [
					h("span", `${t("reports.providerCompanies.endsAt", "ينتهي:")} ${m.current_period_end ? formatDate(m.current_period_end) : "—"}`)
				]),
				isRenewalStopped
					? h(
							NTooltip,
							{ trigger: "hover" },
							{
								trigger: () =>
									h(
										"div",
										{ class: "flex items-center gap-1 text-xs font-medium text-[var(--add-warning-text,#845A13)] dark:text-[var(--add-warning,#E7B155)] cursor-help" },
										[
											h(Icon, { name: "carbon:warning-alt", size: 14 }),
											h("span", stopReasonText)
										]
									),
								default: () => stopReasonText
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

	/* 3. Registered Employees / Members Count */
	{
		title: t("providerPortal.members", "الموظفون"),
		key: "members_count",
		width: 110,
		align: "center",
		render: row => {
			const count = (row as any).members_count ?? (row as any).members?.length ?? 0
			return h(
				"div",
				{ class: "flex items-center justify-center gap-1.5" },
				[
					h(Icon, { name: "carbon:user", size: 14, class: "text-[var(--add-text-muted,#5A606B)]" }),
					h("span", { class: "font-mono font-bold text-xs text-[var(--add-text-primary,#43474F)] dark:text-neutral-100" }, `${count}`)
				]
			)
		}
	},

	/* 4. Active Office Leases */
	{
		title: t("providerPortal.companyLeases", "المكاتب المؤجرة"),
		key: "leases",
		minWidth: 170,
		align: "center",
		render: row => {
			const leases = (row as any).office_leases || []
			const lease = leases[0]
			const leasesCount = (row as any).active_leases_count ?? leases.length

			if (leasesCount === 0) {
				return h("span", { class: "text-xs text-[var(--add-text-muted,#5A606B)]" }, "0 مكتب")
			}

			return h("div", { class: "inline-flex flex-col items-center gap-0.5" }, [
				h("div", { class: "flex items-center justify-center gap-1.5" }, [
					h(
						NTag,
						{ size: "tiny", type: "info", round: true, bordered: false },
						{ default: () => `${leasesCount} ${t("reports.providerCompanies.offices", "مكتب")}` }
					),
					lease?.space?.name ? h("span", { class: "text-xs font-semibold text-[var(--add-text-primary,#43474F)] dark:text-neutral-200" }, lease.space.name) : null
				]),
				lease?.starts_on ? h("span", { class: "font-mono text-xs text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400" }, `${lease.starts_on} → ${lease.ends_on || "—"}`) : null
			])
		}
	},

	/* 5. Monthly Value / Financial Overview */
	{
		title: t("companies.columns.monthlyAmount", "البدل الشهري"),
		key: "financials",
		minWidth: 150,
		align: "center",
		render: row => {
			const lease = (row as any).office_leases?.[0]
			if (lease?.monthly_amount) {
				return h(
					"span",
					{ class: "font-mono text-xs font-bold text-[var(--add-text-primary,#43474F)] dark:text-neutral-100" },
					formatReportMoney(lease.monthly_amount, lease.currency || "SYP")
				)
			}
			return h("span", { class: "text-xs text-[var(--add-text-muted,#5A606B)]" }, "—")
		}
	},

	/* 6. Company Status */
	{
		title: t("companies.columns.status", "الحالة"),
		key: "status",
		width: 100,
		align: "center",
		render: row =>
			h(
				"span",
				{
					class: "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold " +
						(row.status === "active"
							? "border border-[var(--add-success,#657C50)]/40 bg-[var(--add-success,#657C50)]/10 text-[var(--add-success-text,#556843)] dark:bg-[var(--add-success,#657C50)]/20 dark:text-[var(--add-success,#657C50)]"
							: "border border-[var(--add-border,#CDC2AF)] bg-[var(--add-surface-sunken,#EDEAE8)] text-[var(--add-text-secondary,#565B65)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300")
				},
				t(`companies.status.${row.status}`, row.status === "active" ? "نشط" : "غير نشط")
			)
	},

	/* 7. Action View Details Button */
	{
		title: t("common.actions", "الإجراءات"),
		key: "actions",
		width: 90,
		align: "center",
		render: row =>
			h(
				"button",
				{
					type: "button",
					class: "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface,#F7F5F2)] text-[var(--add-text-secondary,#565B65)] transition-colors hover:bg-[var(--add-surface-sunken,#EDEAE8)] hover:text-[var(--add-primary-text,#556843)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700",
					"aria-label": t("common.view", "عرض تفاصيل الشركة"),
					title: t("common.view", "عرض تفاصيل الشركة"),
					onClick: () => openDetail(row)
				},
				[h(Icon, { name: "carbon:view", size: 16 })]
			)
	}
])
</script>
