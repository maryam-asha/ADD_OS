<!-- src/add-os/modules/pricing/views/CouponsPage.vue -->
<!--
	Every discount code, paged by the server. Operations reads; only an admin
	sees the controls that change one. Deleting a used code is refused by the
	server (409) — the admin is offered deactivation, and decides.

	Two tabs on the same endpoint: typed coupons (`is_automatic=0`) and
	automatic offers (`is_automatic=1`), which have no code and apply
	themselves (ADDCore pinned collection 2026-10-06, `Offers (automatic)`).
-->
<template>
	<div class="flex flex-col gap-6">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.coupons") }}</h1>
				<p class="text-secondary">{{ t("coupons.page.description") }}</p>
			</div>
			<div class="flex gap-2">
				<n-button secondary size="small" :loading="isLoading" @click="fetchPage">
					<template #icon><Icon name="carbon:renew" :size="16" /></template>
					{{ t("coupons.page.refresh") }}
				</n-button>
				<n-button v-if="canWrite" type="primary" size="small" data-test="coupon-new" @click="openForm(null)">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t(automatic ? "coupons.page.newOffer" : "coupons.page.new") }}
				</n-button>
			</div>
		</div>

		<n-card size="small">
			<div class="flex flex-col gap-4">
				<div class="flex gap-2">
					<n-button v-for="name in TABS" :key="name" size="small" :type="tab === name ? 'primary' : 'default'" :secondary="tab !== name" :data-test="`coupons-tab-${name}`" @click="tab = name">
						{{ t(`coupons.tabs.${name}`) }}
					</n-button>
				</div>
				<p class="text-xs text-secondary">{{ t(`coupons.tabs.${tab}Hint`) }}</p>
				<div class="flex flex-wrap items-center gap-3">
					<div class="w-64 shrink-0">
						<n-input v-model:value="search" clearable size="small" :placeholder="t('coupons.page.searchPlaceholder')">
							<template #prefix><Icon name="carbon:search" :size="16" /></template>
						</n-input>
					</div>
					<n-select v-model:value="filters.state" :options="stateOptions" :placeholder="t('coupons.filters.state')" clearable size="small" class="w-44" />
					<n-select v-model:value="filters.is_active" :options="activeOptions" :placeholder="t('coupons.filters.active')" clearable size="small" class="w-44" />
					<span class="text-xs text-secondary ms-auto">{{ t("coupons.page.count", { count: formatNumber(total) }) }}</span>
				</div>
				<n-alert v-if="failed" type="error" :bordered="false">{{ t("coupons.page.loadError") }}</n-alert>
				<n-data-table remote :columns :data="rows" :loading="isLoading" :bordered="false" :row-key="(row: Coupon) => row.id" :pagination :row-props size="small" @update:page="onPage" />
			</div>
		</n-card>

		<CouponFormDrawer v-model:show="formVisible" :coupon-id="formId" :automatic @saved="fetchPage" />
		<CouponDetailDrawer v-model:show="detailVisible" :coupon-id="detailId" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { Coupon } from "@/add-os/modules/pricing/types/coupon"
import { NAlert, NButton, NCard, NDataTable, NInput, NSelect, NSwitch, NTag, useDialog, useMessage } from "naive-ui"
import { computed, h, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { canManageCoupons } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import CouponDetailDrawer from "@/add-os/modules/pricing/components/CouponDetailDrawer.vue"
import CouponFormDrawer from "@/add-os/modules/pricing/components/CouponFormDrawer.vue"
import { COUPON_STATES } from "@/add-os/modules/pricing/types/coupon"
import { discountLabel } from "@/add-os/modules/pricing/utils/coupon-form"
import { ApiError } from "@/add-os/services/api"
import { deleteCoupon, listCoupons, setCouponActive } from "@/add-os/services/coupons"
import { formatDateTime, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const canWrite = canManageCoupons()

const PAGE_SIZE = 20
const TABS = ["coupons", "offers"] as const
/** Typed coupons, or automatic offers — one endpoint, filtered by `is_automatic`. */
const tab = ref<(typeof TABS)[number]>("coupons")
const automatic = computed(() => tab.value === "offers")
const filters = reactive<{ state: string | null, is_active: number | null }>({ state: null, is_active: null })
const search = ref("")
/** What is actually sent: `search` once typing has paused. */
const searchTerm = ref("")
const rows = ref<Coupon[]>([])
const total = ref(0)
const page = ref(1)
const isLoading = ref(false)
const failed = ref(false)
const toggling = ref<number | null>(null)
const formVisible = ref(false)
const formId = ref<number | null>(null)
const detailVisible = ref(false)
const detailId = ref<number | null>(null)
/** Only the newest request may land: an older answer is for filters no longer chosen. */
let request = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined

const stateOptions = computed<SelectOption[]>(() => COUPON_STATES.map(value => ({ label: t(`coupons.state.${value}`), value })))
const activeOptions = computed<SelectOption[]>(() => [{ label: t("coupons.filters.activeYes"), value: 1 }, { label: t("coupons.filters.activeNo"), value: 0 }])
const pagination = computed(() => ({ page: page.value, pageSize: PAGE_SIZE, itemCount: total.value }))

function usage(row: Coupon): string {
	return `${formatNumber(row.used ?? 0)} / ${row.usage_limit === null ? "∞" : formatNumber(row.usage_limit)}`
}

/** Keeps a control's click from also opening the row's details. */
function only(handler: () => void) {
	return (event: MouseEvent) => {
		event.stopPropagation()
		handler()
	}
}

/** How a dialog names it: its code, or — an offer has none — its name. */
function labelOf(row: Coupon): string {
	return row.code ?? (row.name ? pickLocalized(row.name, currentLocale.value) : "") ?? ""
}

const columns = computed<DataTableColumns<Coupon>>(() => [
	// An offer has no code to show.
	...(automatic.value ? [] : [{ title: t("coupons.columns.code"), key: "code", render: (row: Coupon) => h("bdi", { dir: "ltr", class: "font-mono font-semibold" }, row.code ?? "") }]),
	{ title: t("coupons.columns.name"), key: "name", render: row => (row.name ? pickLocalized(row.name, currentLocale.value) || "—" : "—") },
	{ title: t("coupons.columns.discount"), key: "discount", render: row => discountLabel(t, row) },
	{
		title: t("coupons.columns.targets"),
		key: "targets",
		render: row => (row.targets?.length
			? h("div", { class: "flex flex-wrap gap-1" }, [...new Set(row.targets.map(target => target.purpose))].map(purpose => h(NTag, { size: "small", bordered: false }, { default: () => t(`pricing.purpose.${purpose}`) })))
			: t("coupons.detail.allPurchases"))
	},
	{ title: t("coupons.columns.usage"), key: "used", render: row => h("bdi", { dir: "ltr" }, usage(row)) },
	{
		title: t("coupons.columns.window"),
		key: "window",
		// Two lines, not "start → end": a fixed arrow points the wrong way in RTL.
		render: row => h("div", { class: "flex flex-col text-xs" }, [
			h("span", row.starts_at ? formatDateTime(row.starts_at) : "—"),
			h("span", { class: "text-secondary" }, row.ends_at ? formatDateTime(row.ends_at) : "—")
		])
	},
	{
		title: t("coupons.columns.active"),
		key: "is_active",
		render: row => (canWrite
			? h("span", { "data-test": "coupon-active-switch", "onClick": only(() => void toggle(row)) }, [h(NSwitch, { value: row.is_active, loading: toggling.value === row.id, size: "small" })])
			: h(NTag, { size: "small", round: true, bordered: false, type: row.is_active ? "success" : "default" }, { default: () => t(row.is_active ? "coupons.filters.activeYes" : "coupons.filters.activeNo") }))
	},
	...(canWrite
		? [{
				title: t("coupons.columns.actions"),
				key: "actions",
				render: (row: Coupon) => h("div", { class: "flex gap-1" }, [
					h(NButton, { size: "tiny", quaternary: true, onClick: only(() => openForm(row.id)) }, { default: () => t("coupons.edit") }),
					h(NButton, { "size": "tiny", "quaternary": true, "type": "error", "data-test": "coupon-delete", "onClick": only(() => confirmDelete(row)) }, { default: () => t("coupons.delete.action") })
				])
			}]
		: [])
])

function rowProps(row: Coupon) {
	return {
		class: "cursor-pointer",
		onClick: () => {
			detailId.value = row.id
			detailVisible.value = true
		}
	}
}

function query(): Record<string, unknown> {
	const q: Record<string, unknown> = { page: page.value, per_page: PAGE_SIZE, is_automatic: automatic.value ? 1 : 0 }
	if (filters.state) q.state = filters.state
	if (filters.is_active !== null) q.is_active = filters.is_active
	if (searchTerm.value.trim()) q.search = searchTerm.value.trim()
	return q
}

async function fetchPage(): Promise<void> {
	const current = ++request
	isLoading.value = true
	failed.value = false
	try {
		const result = await listCoupons(query())
		if (current !== request) return
		rows.value = result.data
		total.value = result.meta.total
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (current === request) failed.value = true
	} finally {
		if (current === request) isLoading.value = false
	}
}

function onPage(next: number): void {
	page.value = next
	void fetchPage()
}

// A new filter starts again from the first page.
watch([filters, searchTerm, tab], () => {
	page.value = 1
	void fetchPage()
}, { deep: true })
watch(search, (value) => {
	clearTimeout(searchTimer)
	searchTimer = setTimeout(() => (searchTerm.value = value ?? ""), 350)
})

function openForm(id: number | null): void {
	formId.value = id
	formVisible.value = true
}

async function toggle(row: Coupon): Promise<void> {
	toggling.value = row.id
	try {
		message.success((await setCouponActive(row.id, !row.is_active)).message)
		await fetchPage()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		message.error(caught.data?.message ?? t("coupons.page.loadError"))
	} finally {
		toggling.value = null
	}
}

function confirmDelete(row: Coupon): void {
	dialog.warning({
		title: t("coupons.delete.confirmTitle", { code: labelOf(row) }),
		content: t("coupons.delete.confirmBody"),
		positiveText: t("coupons.delete.confirm"),
		negativeText: t("coupons.delete.cancel"),
		onPositiveClick: () => remove(row)
	})
}

async function remove(row: Coupon): Promise<void> {
	try {
		await deleteCoupon(row.id)
		message.success(t("coupons.delete.deleted"))
		await fetchPage()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (caught.status !== 409) {
			message.error(caught.data?.message ?? t("coupons.page.loadError"))
			return
		}
		// A used code stays: the server says why, and the admin decides.
		dialog.error({
			title: t("coupons.delete.conflictTitle"),
			content: caught.data?.message ?? "",
			positiveText: t("coupons.delete.deactivateInstead"),
			negativeText: t("coupons.delete.cancel"),
			onPositiveClick: () => confirmDeactivate(row)
		})
	}
}

function confirmDeactivate(row: Coupon): void {
	dialog.warning({
		title: t("coupons.delete.deactivateTitle", { code: labelOf(row) }),
		content: t("coupons.delete.deactivateBody"),
		positiveText: t("coupons.delete.deactivate"),
		negativeText: t("coupons.delete.cancel"),
		onPositiveClick: async () => {
			try {
				message.success((await setCouponActive(row.id, false)).message)
				await fetchPage()
			} catch (caught) {
				if (!(caught instanceof ApiError)) throw caught
				message.error(caught.data?.message ?? t("coupons.page.loadError"))
			}
		}
	})
}

void fetchPage()
defineExpose({ filters })
</script>
