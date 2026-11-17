<!-- src/add-os/modules/provider-portal/views/ProviderCompaniesPage.vue -->
<template>
	<div class="flex flex-col gap-5 text-[var(--add-text-primary)]">
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- HEADER & ACTIONS -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<PageHeader :title="t('providerPortal.companies', 'الشركات')" :description="t('companies.description', 'إدارة وتتبع بيانات الشركات المسجلة، اشتراكاتها المكانية، عقود الإيجار، والمستحقات المالية.')">
			<template #actions>
				<div class="flex items-center gap-2">
					<n-button
						secondary
						class="rounded-lg"
						:loading="isLoading"
						@click="refetch"
					>
						<template #icon><Icon name="carbon:renew" :size="16" /></template>
						{{ t("common.refresh") }}
					</n-button>
					<n-button
						type="primary"
						class="rounded-lg font-medium"
						:disabled="isLoading || !data.length"
						@click="exportCsv"
					>
						<template #icon><Icon name="carbon:download" :size="16" /></template>
						{{ t("reports.common.exportCsv") }}
					</n-button>
				</div>
			</template>
		</PageHeader>

		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- METRICS SUMMARY HIGHLIGHTS -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<!-- Total Companies -->
			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border)]/40 bg-[var(--add-surface-raised)] p-4 shadow-xs">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-muted)]">
						{{ t("reports.providerCompanies.totalCompanies", "إجمالي الشركات") }}
					</span>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--add-primary)]/10 text-[var(--add-primary-text)]">
						<Icon name="carbon:enterprise" :size="18" />
					</div>
				</div>
				<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-text-primary)]">
					{{ meta?.total ?? data.length }}
				</span>
			</div>

			<!-- Active Subscriptions -->
			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border)]/40 bg-[var(--add-surface-raised)] p-4 shadow-xs">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-muted)]">
						{{ t("reports.providerCompanies.subscribedCompanies", "شركات باشتراك سارٍ") }}
					</span>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--add-success)]/10 text-[var(--add-success-text)]">
						<Icon name="carbon:id-management" :size="18" />
					</div>
				</div>
				<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-primary-text)]">
					{{ activeSubscriptionsCount }}
				</span>
			</div>

			<!-- Stopped Renewals -->
			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border)]/40 bg-[var(--add-surface-raised)] p-4 shadow-xs">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-muted)]">
						{{ t("reports.providerCompanies.stoppedRenewals", "تجديد متوقف") }}
					</span>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--add-warning)]/10 text-[var(--add-warning-text)]">
						<Icon name="carbon:warning-alt" :size="18" />
					</div>
				</div>
				<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-warning-text)]">
					{{ stoppedRenewalsCount }}
				</span>
			</div>

			<!-- Companies with Overdue -->
			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border)]/40 bg-[var(--add-surface-raised)] p-4 shadow-xs">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-muted)]">
						{{ t("reports.providerCompanies.withOverdue", "شركات عليها متأخرات") }}
					</span>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--add-danger)]/10 text-[var(--add-danger-text)]">
						<Icon name="carbon:warning" :size="18" />
					</div>
				</div>
				<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-danger-text)]">
					{{ overdueCompaniesCount }}
				</span>
			</div>
		</div>

		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- FILTERS SECTION -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--add-border)]/40 bg-[var(--add-surface-raised)] p-3.5 shadow-xs">
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
							<Icon name="carbon:search" :size="16" class="text-[var(--add-text-muted)]" />
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

			<div class="flex items-center gap-2 text-xs text-[var(--add-text-muted)]">
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
		<AddDataTable
			v-model:page="page"
			:columns
			:data="filteredData"
			:loading="isLoading"
			:row-key
			:scroll-x="1100"
			:empty-text="t('companies.empty', 'لا توجد شركات مطابقة لمعايير البحث.')"
			:meta
		/>

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
import { NButton, NInput, NSelect, NTag, NTooltip } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import RowActions from "@/add-os/components/page/RowActions.vue"
import AddDataTable from "@/add-os/components/table/AddDataTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import ProviderCompanyDetailModal from "@/add-os/modules/provider-portal/components/ProviderCompanyDetailModal.vue"
import { useOpenRecord } from "@/add-os/notifications/useOpenRecord"
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

// A notification's link (`?open=<id>`) opens that company's details here.
useOpenRecord(id => {
	selectedCompanyId.value = id
	detailModalVisible.value = true
})

function rowKey(row: Company) {
	return row.id
}

const statusOptions = computed<SelectOption[]>(() => [
	{ label: t("companies.status.all"), value: "all" },
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
		t("reports.common.status")
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

	const csvContent = `\uFEFF${[headers.join(","), ...rows].join("\n")}`
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
						class: "flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-xl border border-[var(--add-border)]/40 bg-[var(--add-surface-sunken)] text-xs font-bold text-[var(--add-text-primary)]"
					},
					monogram
				),
				h("div", { class: "flex min-w-0 flex-col gap-0.5" }, [
					h(
						"span",
						{
							class: "cursor-pointer truncate text-sm font-bold text-[var(--add-text-primary)] hover:text-[var(--add-primary-text)] hover:underline",
							title: row.legal_name,
							onClick: () => openDetail(row)
						},
						row.legal_name
					),
					h(
						"span",
						{ class: "font-mono text-xs text-[var(--add-text-muted)]" },
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
				return h("span", { class: "text-xs text-[var(--add-text-muted)]" }, "—")
			}

			const isRenewalStopped = !m.auto_renew || !!m.renewal_stop_reason
			const stopReasonText = m.renewal_stop_reason_label || m.renewal_stop_reason || t("reports.providerCompanies.renewalStopped", "تجديد متوقف")

			return h("div", { class: "inline-flex flex-col items-center gap-1 py-1" }, [
				h("div", { class: "flex flex-wrap items-center justify-center gap-1.5" }, [
					h("span", { class: "text-xs font-bold text-[var(--add-text-primary)]" }, m.plan_name || "خطة اشتراك"),
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
				h("div", { class: "flex items-center justify-center gap-2 text-xs text-[var(--add-text-muted)]" }, [
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
										{ class: "flex items-center gap-1 text-xs font-medium text-[var(--add-warning-text)] cursor-help" },
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
					h(Icon, { name: "carbon:user", size: 14, class: "text-[var(--add-text-muted)]" }),
					h("span", { class: "font-mono font-bold text-xs text-[var(--add-text-primary)]" }, `${count}`)
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
				return h("span", { class: "text-xs text-[var(--add-text-muted)]" }, "0 مكتب")
			}

			return h("div", { class: "inline-flex flex-col items-center gap-0.5" }, [
				h("div", { class: "flex items-center justify-center gap-1.5" }, [
					h(
						NTag,
						{ size: "tiny", type: "info", round: true, bordered: false },
						{ default: () => `${leasesCount} ${t("reports.providerCompanies.offices", "مكتب")}` }
					),
					lease?.space?.name ? h("span", { class: "text-xs font-semibold text-[var(--add-text-primary)]" }, lease.space.name) : null
				]),
				lease?.starts_on ? h("span", { class: "font-mono text-xs text-[var(--add-text-muted)]" }, `${lease.starts_on} → ${lease.ends_on || "—"}`) : null
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
					{ class: "font-mono text-xs font-bold text-[var(--add-text-primary)]" },
					formatReportMoney(lease.monthly_amount, lease.currency || "SYP")
				)
			}
			return h("span", { class: "text-xs text-[var(--add-text-muted)]" }, "—")
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
					class: `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
						row.status === "active"
							? "border border-[var(--add-success)]/40 bg-[var(--add-success)]/10 text-[var(--add-success-text)]"
							: "border border-[var(--add-border)] bg-[var(--add-surface-sunken)] text-[var(--add-text-secondary)]"}`
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
		render: row => h(RowActions, { actions: [{ key: "view", label: t("common.view", "عرض تفاصيل الشركة"), icon: "carbon:view", onClick: () => openDetail(row) }] })
	}
])
</script>
