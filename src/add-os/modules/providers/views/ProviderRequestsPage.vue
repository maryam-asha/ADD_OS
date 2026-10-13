<template>
	<div class="flex flex-col gap-6">
		<!-- Page Header -->
		<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
			<div class="flex flex-col gap-1">
				<div class="flex items-center gap-3">
					<h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
						{{ t("providerRequests.title") }}
					</h1>
					<span
						v-if="counts.pending"
						class="inline-flex items-center rounded-full border border-amber-200/60 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300"
					>
						{{ t("providerRequests.pendingBadge", { count: formatNumber(counts.pending) }) }}
					</span>
				</div>
				<p class="text-xs text-slate-500 dark:text-slate-400">{{ t("providerRequests.subtitle") }}</p>
			</div>
		</div>

		<!-- Stat Cards: one per status; a card is also the status filter -->
		<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
			<button
				v-for="card in statCards"
				:key="card.status"
				type="button"
				class="flex flex-col justify-between gap-4 rounded-2xl border bg-white p-5 text-start shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 dark:bg-slate-900"
				:class="query.status === card.status ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-slate-200/80 hover:border-slate-300 dark:border-slate-800'"
				:aria-pressed="query.status === card.status"
				@click="query.status = card.status"
			>
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t(`providerRequests.statusOptions.${card.status}`) }}</span>
					<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" :class="card.iconClass">
						<Icon :name="card.icon" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-2">
					<span class="font-mono text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
						{{ counts[card.status] === null ? "–" : formatNumber(counts[card.status] ?? 0) }}
					</span>
					<span class="text-xs font-medium text-slate-400 dark:text-slate-500">{{ t(`providerRequests.stats.${card.status}`) }}</span>
				</div>
			</button>
		</div>

		<n-alert v-if="error" type="error" :title="t('providerRequests.loadError')" />

		<!-- Filter Section -->
		<div class="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
			<div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
				<n-select v-model:value="query.type" :options="typeOptions" clearable :placeholder="t('providerRequests.filters.typeAll')" class="w-full" />
				<n-select v-model:value="query.provider_id" :options="providerOptions" clearable filterable :placeholder="t('providerRequests.filters.providerAll')" class="w-full" />
				<n-select v-model:value="query.company_id" :options="companyOptions" clearable filterable :placeholder="t('providerRequests.filters.companyAll')" class="w-full" />
			</div>
			<div class="flex items-center justify-end gap-2">
				<n-button secondary circle :title="t('providerRequests.filters.reset')" :aria-label="t('providerRequests.filters.reset')" @click="resetFilters">
					<template #icon><Icon name="carbon:renew" :size="16" /></template>
				</n-button>
			</div>
		</div>

		<!-- Table Card -->
		<div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
			<n-data-table
				v-if="data.length > 0 || isLoading"
				remote
				:columns
				:data
				:loading="isLoading"
				:bordered="false"
				:row-key
				:row-props
				:pagination="false"
				:scroll-x="1100"
			/>
			<div v-else class="flex flex-col items-center gap-2 py-16 text-center">
				<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800">
					<Icon :name="query.status === 'pending' ? 'carbon:checkmark-outline' : 'carbon:document'" :size="22" />
				</div>
				<p class="text-sm font-semibold text-slate-800 dark:text-slate-200">
					{{ query.status === "pending" ? t("providerRequests.empty.pendingTitle") : t("providerRequests.empty.title") }}
				</p>
				<p class="text-xs text-slate-500">{{ query.status === "pending" ? t("providerRequests.empty.pendingBody") : t("providerRequests.empty.body") }}</p>
			</div>

			<div v-if="data.length > 0 && meta" class="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 text-xs text-slate-500 sm:flex-row dark:border-slate-800">
				<div>
					{{ t("companies.pagination.showing", { from: (meta.current_page - 1) * meta.per_page + 1, to: Math.min(meta.current_page * meta.per_page, meta.total), total: meta.total }) }}
				</div>
				<n-pagination v-model:page="page" :page-count="meta.last_page" :page-slot="5">
					<template #prev>{{ t("companies.pagination.prev") }}</template>
					<template #next>{{ t("companies.pagination.next") }}</template>
				</n-pagination>
			</div>
		</div>

		<!-- Review Dialog -->
		<n-modal :show="selectedId !== null" @update:show="(value: boolean) => !value && (selectedId = null)">
			<div class="flex max-h-[90vh] w-[min(46rem,95vw)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
				<ProviderRequestDetail
					:request-id="selectedId"
					:plan-names
					:currency-options
					closable
					@close="selectedId = null"
					@decided="onDecided"
				/>
			</div>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ProviderRequest, ProviderRequestStatus, ProviderRequestType } from "@/add-os/modules/providers/types"
import { NAlert, NButton, NDataTable, NModal, NPagination, NSelect } from "naive-ui"
import { computed, h, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { currentLocale } from "@/add-os/lang/currentLocale"
import ProviderRequestDetail from "@/add-os/modules/providers/components/ProviderRequestDetail.vue"
import { daysWaiting, REQUEST_TYPE_ICON, requestSummary, waitLevel } from "@/add-os/modules/providers/utils/request-headline"
import { listCompanies } from "@/add-os/services/companies"
import { listCurrencies } from "@/add-os/services/currencies"
import { listPlans } from "@/add-os/services/plans"
import { listProviderRequests } from "@/add-os/services/provider-requests"
import { listProviders } from "@/add-os/services/providers"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Provider requests, in the Companies page's layout: status cards that are
 * also the status filter, a filter bar, the table, and the review in a dialog.
 * A decided request leaves the pending list because the refetch no longer
 * returns it — never by splicing it out locally.
 */

const { t } = useI18n()

const STATUSES: ProviderRequestStatus[] = ["pending", "approved", "rejected", "cancelled"]
const TYPES: ProviderRequestType[] = ["plan_assignment", "wallet_top_up", "company_member", "company_admin", "plan_design"]

interface RequestQuery {
	status: ProviderRequestStatus
	type?: ProviderRequestType
	provider_id?: number
	company_id?: number
	per_page: number
}

const query = ref<RequestQuery>({ status: "pending", per_page: 15 })
const page = ref(1)
/** The request open in the review dialog. */
const selectedId = ref<number | null>(null)
const { data, isLoading, error, meta, refetch } = useResourceList<ProviderRequest>(listProviderRequests, query, page)

const { data: providers } = useResourceList(listProviders)
const { data: companies } = useResourceList(listCompanies)
const { data: currencies } = useResourceList(listCurrencies)
const { data: plans } = useResourceList(() => listPlans())

const typeOptions = computed<SelectOption[]>(() => TYPES.map(type => ({ label: t(`providerRequests.typeOptions.${type}`), value: type })))
const providerOptions = computed<SelectOption[]>(() => providers.value.map(p => ({ label: p.name, value: p.id })))
const companyOptions = computed<SelectOption[]>(() => companies.value.filter(c => c.provider).map(c => ({ label: c.legal_name, value: c.id })))
const currencyOptions = computed<SelectOption[]>(() => currencies.value.filter(c => c.is_active).map(c => ({ label: c.code, value: c.code })))
const planNames = computed<Record<number, string>>(() =>
	Object.fromEntries(plans.value.map(p => [p.id, pickLocalized(p.name, currentLocale.value) || `#${p.id}`]))
)

function resetFilters() {
	query.value = { status: query.value.status, per_page: 15 }
}

// ── Counts per status, for the current type / provider / company ─────────────
const counts = ref<Record<ProviderRequestStatus, number | null>>({ pending: null, approved: null, rejected: null, cancelled: null })

async function loadCounts() {
	const scope = { type: query.value.type, provider_id: query.value.provider_id, company_id: query.value.company_id, per_page: 1 }
	const results = await Promise.allSettled(STATUSES.map(status => listProviderRequests({ ...scope, status })))
	STATUSES.forEach((status, i) => {
		const result = results[i]
		counts.value[status] = result?.status === "fulfilled" ? (result.value.meta?.total ?? result.value.data.length) : null
	})
}

watch(() => [query.value.type, query.value.provider_id, query.value.company_id], loadCounts, { immediate: true })

const statCards = computed(() => [
	{ status: "pending" as const, icon: "carbon:hourglass", iconClass: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" },
	{ status: "approved" as const, icon: "carbon:checkmark-outline", iconClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" },
	{ status: "rejected" as const, icon: "carbon:close-outline", iconClass: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400" },
	{ status: "cancelled" as const, icon: "carbon:document", iconClass: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" }
])

// ── Table ─────────────────────────────────────────────────────────────────────
const STATUS_PILL: Record<ProviderRequestStatus, { pill: string; dot: string }> = {
	pending: {
		pill: "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60",
		dot: "bg-amber-500"
	},
	approved: {
		pill: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60",
		dot: "bg-emerald-500"
	},
	rejected: {
		pill: "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60",
		dot: "bg-rose-500"
	},
	cancelled: {
		pill: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
		dot: "bg-slate-400"
	}
}

const WAIT_TEXT = { fresh: "text-slate-400 dark:text-slate-500", aging: "text-amber-600 dark:text-amber-400", late: "text-rose-600 dark:text-rose-400" }

function rowKey(row: ProviderRequest) {
	return row.id
}

function rowProps(row: ProviderRequest) {
	return { class: "cursor-pointer", onClick: () => (selectedId.value = row.id) }
}

const columns = computed<DataTableColumns<ProviderRequest>>(() => [
	{
		title: t("providerRequests.columns.request"),
		key: "type",
		minWidth: 220,
		render: row =>
			h("div", { class: "flex items-center gap-3 py-1 whitespace-nowrap" }, [
				h("div", { class: "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" }, [
					h(Icon, { name: REQUEST_TYPE_ICON[row.type], size: 18 })
				]),
				h("div", { class: "flex flex-col gap-0.5 min-w-0" }, [
					h("span", { class: "font-bold text-sm text-slate-900 dark:text-slate-100" }, t(`providerRequests.typeOptions.${row.type}`)),
					h("span", { class: "text-xs text-slate-400 dark:text-slate-500 font-mono" }, `#${row.id}`)
				])
			])
	},
	{
		title: t("providerRequests.columns.provider"),
		key: "provider",
		minWidth: 150,
		render: row => h("span", { class: "text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap" }, row.provider?.name ?? "—")
	},
	{
		title: t("providerRequests.columns.company"),
		key: "company",
		minWidth: 160,
		render: row => h("span", { class: "text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap" }, row.company?.legal_name ?? "—")
	},
	{
		title: t("providerRequests.columns.summary"),
		key: "payload",
		minWidth: 200,
		render: row => h("span", { class: "text-sm text-slate-700 dark:text-slate-300" }, requestSummary(row, t, planNames.value))
	},
	{
		title: t("providerRequests.columns.submittedAt"),
		key: "created_at",
		minWidth: 150,
		render: row => {
			const days = daysWaiting(row.created_at)
			const waiting =
				row.status === "pending"
					? h(
							"span",
							{ class: `text-xs font-medium ${WAIT_TEXT[waitLevel(days)]}` },
							days === 0 ? t("providerRequests.wait.today") : t("providerRequests.wait.days", { n: formatNumber(days) }, days)
						)
					: null
			return h("div", { class: "flex flex-col gap-0.5 whitespace-nowrap" }, [
				h("span", { class: "text-sm text-slate-700 dark:text-slate-300 font-medium" }, formatDate(row.created_at)),
				waiting
			])
		}
	},
	{
		title: t("providerRequests.columns.status"),
		key: "status",
		width: 140,
		render: row =>
			h(
				"span",
				{ class: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${STATUS_PILL[row.status].pill}` },
				[h("span", { class: `w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_PILL[row.status].dot}` }), t(`providerRequests.statusOptions.${row.status}`)]
			)
	},
	{
		title: t("common.actions"),
		key: "actions",
		width: 120,
		render: row =>
			h(
				NButton,
				{
					size: "small",
					type: row.status === "pending" ? "primary" : "default",
					secondary: row.status !== "pending",
					onClick: (event: MouseEvent) => {
						event.stopPropagation()
						selectedId.value = row.id
					}
				},
				{ default: () => (row.status === "pending" ? t("providerRequests.review") : t("common.view")) }
			)
	}
])

// ── Review ────────────────────────────────────────────────────────────────────

async function onDecided() {
	selectedId.value = null
	await Promise.all([refetch(), loadCounts()])
}
</script>
