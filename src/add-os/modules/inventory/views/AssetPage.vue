<!-- src/add-os/modules/inventory/views/AssetPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<n-alert v-if="loadError" type="error" :title="loadError" />
		<n-spin v-else-if="!asset" class="py-16" />

		<template v-else>
			<HrPageHeader :title="`${isolate(asset.code)} · ${isolate(localized(asset.item.name))}`" :description="localized(asset.item.category.name)" :eyebrow="t('nav.pages.inventoryAssets')">
				<template #actions>
					<AssetStatusTag :status="asset.status" />
					<router-link :to="{ name: 'inventory.inventoryAssets' }">
						<n-button secondary>
							<template #icon><Icon name="carbon:arrow-left" class="rtl:rotate-180" :size="16" /></template>
							{{ t("inventory.assets.back") }}
						</n-button>
					</router-link>
				</template>
			</HrPageHeader>

			<!-- Action Buttons Ribbon -->
			<div v-if="!disposed" class="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
				<n-button v-if="may.manage" size="small" secondary @click="open('move')">
					<template #icon><Icon name="carbon:location" :size="15" /></template>{{ t("inventory.actions.move.title") }}
				</n-button>
				<n-button v-if="may.custody && !asset.custodian" size="small" type="primary" :disabled="asset.status !== 'in_service'" @click="open('assign')">
					<template #icon><Icon name="carbon:user-follow" :size="15" /></template>{{ t("inventory.actions.assign.title") }}
				</n-button>
				<n-button v-if="may.custody && asset.custodian" size="small" type="warning" secondary @click="open('return')">
					<template #icon><Icon name="carbon:undo" :size="15" /></template>{{ t("inventory.actions.return.title") }}
				</n-button>
				<n-button v-if="may.maintenance && !asset.open_maintenance" size="small" secondary :disabled="asset.status !== 'in_service'" @click="open('maintenance')">
					<template #icon><Icon name="carbon:tool-kit" :size="15" /></template>{{ t("inventory.actions.maintenance.title") }}
				</n-button>
				<n-button v-if="may.maintenance && asset.open_maintenance" size="small" type="primary" @click="open('close')">
					<template #icon><Icon name="carbon:checkmark-outline" :size="15" /></template>{{ t("inventory.actions.close.title") }}
				</n-button>
				<n-button v-if="may.manage && asset.status !== 'in_maintenance'" size="small" secondary @click="open('status')">
					<template #icon><Icon name="carbon:edit" :size="15" /></template>{{ t("inventory.actions.status.title") }}
				</n-button>
				<n-button v-if="may.manage" size="small" secondary @click="detailsVisible = true">
					<template #icon><Icon name="carbon:document" :size="15" /></template>{{ t("inventory.assets.editDetails") }}
				</n-button>
				<n-button v-if="may.dispose" size="small" type="error" secondary @click="open('dispose')">
					<template #icon><Icon name="carbon:trash-can" :size="15" /></template>{{ t("inventory.actions.dispose.title") }}
				</n-button>
			</div>

			<n-alert v-if="asset.open_maintenance" type="warning" :title="t('inventory.maintenance.openNow')">
				{{ asset.open_maintenance.description }} · {{ formatDateTime(asset.open_maintenance.opened_at) }}
			</n-alert>

			<!-- 3 Info Cards Grid -->
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<n-card size="small" class="rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800 dark:bg-slate-900" :bordered="false">
					<template #header>
						<div class="flex items-center gap-2">
							<Icon name="carbon:location" :size="18" class="text-blue-500" />
							<span class="font-bold">{{ t("inventory.assets.whereAndWho") }}</span>
						</div>
					</template>
					<dl class="flex flex-col gap-2.5 text-sm">
						<div>
							<dt class="text-xs text-secondary">{{ t("inventory.assets.location") }}</dt>
							<dd class="font-medium">{{ placeLabel(asset.location) }}</dd>
						</div>
						<div>
							<dt class="text-xs text-secondary">{{ t("inventory.assets.custodian") }}</dt>
							<dd class="font-medium">
								{{ custodianLabel(asset.custodian) }}
								<span v-if="asset.custodian" class="text-xs text-secondary"> · {{ formatDate(asset.custodian.since) }}</span>
							</dd>
						</div>
						<div>
							<dt class="text-xs text-secondary">{{ t("inventory.assets.serial") }}</dt>
							<dd>
								<span v-if="asset.serial_number" dir="ltr" class="font-mono text-xs font-semibold">{{ asset.serial_number }}</span>
								<template v-else>{{ EMPTY }}</template>
							</dd>
						</div>
						<div>
							<dt class="text-xs text-secondary">{{ t("inventory.assets.qr") }}</dt>
							<dd class="break-all"><span dir="ltr" class="font-mono text-xs text-slate-500">{{ asset.qr_token }}</span></dd>
						</div>
						<div>
							<dt class="text-xs text-secondary">{{ t("inventory.assets.warrantyUntil") }}</dt>
							<dd class="font-medium">{{ asset.warranty_until ? formatDate(asset.warranty_until) : EMPTY }}</dd>
						</div>
					</dl>
				</n-card>

				<n-card size="small" class="rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800 dark:bg-slate-900" :bordered="false">
					<template #header>
						<div class="flex items-center gap-2">
							<Icon name="carbon:currency" :size="18" class="text-emerald-500" />
							<span class="font-bold">{{ t("inventory.assets.money") }}</span>
						</div>
					</template>
					<dl class="flex flex-col gap-2.5 text-sm">
						<div>
							<dt class="text-xs text-secondary">{{ t("inventory.assets.purchasedOn") }}</dt>
							<dd class="font-medium">{{ asset.purchased_on ? formatDate(asset.purchased_on) : EMPTY }}</dd>
						</div>
						<div>
							<dt class="text-xs text-secondary">{{ t("inventory.assets.cost") }}</dt>
							<dd class="add-numeric font-mono font-semibold text-emerald-600 dark:text-emerald-400">{{ money(asset.purchase_cost, asset.currency) }}</dd>
						</div>
						<div>
							<dt class="text-xs text-secondary">{{ t("inventory.assets.supplier") }}</dt>
							<dd class="font-medium">{{ asset.supplier ?? EMPTY }}</dd>
						</div>
						<div>
							<dt class="text-xs text-secondary">{{ t("inventory.assets.life") }}</dt>
							<dd class="font-medium">{{ asset.useful_life_months ? months(asset.useful_life_months) : EMPTY }}</dd>
						</div>
						<div>
							<dt class="text-xs text-secondary">{{ t("inventory.assets.salvage") }}</dt>
							<dd class="add-numeric font-medium">{{ money(asset.salvage_value, asset.currency) }}</dd>
						</div>
					</dl>
				</n-card>

				<n-card size="small" class="rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800 dark:bg-slate-900" :bordered="false">
					<template #header>
						<div class="flex items-center gap-2">
							<Icon name="carbon:chart-line" :size="18" class="text-amber-500" />
							<span class="font-bold">{{ t("inventory.assets.depreciation") }}</span>
						</div>
					</template>
					<p v-if="!asset.depreciation" class="text-sm text-secondary">{{ t("inventory.assets.noDepreciation") }}</p>
					<dl v-else class="flex flex-col gap-2.5 text-sm">
						<div>
							<dt class="text-xs text-secondary">{{ t("inventory.assets.monthly") }}</dt>
							<dd class="add-numeric font-medium">{{ money(asset.depreciation.monthly, asset.currency) }}</dd>
						</div>
						<div>
							<dt class="text-xs text-secondary">{{ t("inventory.assets.accumulated") }}</dt>
							<dd class="add-numeric font-medium text-amber-600 dark:text-amber-400">{{ money(asset.depreciation.accumulated, asset.currency) }}</dd>
						</div>
						<div>
							<dt class="text-xs text-secondary">{{ t("inventory.assets.bookValue") }}</dt>
							<dd class="add-numeric font-mono font-bold text-emerald-600 dark:text-emerald-400">{{ money(asset.depreciation.book_value, asset.currency) }}</dd>
						</div>
						<div>
							<dt class="text-xs text-secondary">{{ t("inventory.assets.elapsed") }}</dt>
							<dd class="font-medium">{{ months(asset.depreciation.months_elapsed) }}</dd>
						</div>
					</dl>
					<div v-if="asset.disposal" class="mt-3 border-t border-[var(--add-border)] pt-3 text-sm">
						<span class="font-semibold">{{ t(`inventory.disposal.methods.${asset.disposal.method}`) }}</span>
						· {{ formatDate(asset.disposal.disposed_on) }}
						<span v-if="asset.disposal.proceeds"> · {{ money(asset.disposal.proceeds, asset.currency) }}</span>
					</div>
				</n-card>
			</div>

			<p v-if="asset.notes" class="rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 text-sm text-secondary dark:border-slate-800 dark:bg-slate-800/30 whitespace-pre-line">{{ asset.notes }}</p>

			<!-- History Card with Tabs -->
			<n-card size="small" class="add-ledger-table rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800 dark:bg-slate-900" :bordered="false">
				<n-tabs type="line" animated>
					<n-tab-pane name="movements" :tab="t('inventory.history.movements')">
						<n-data-table :columns="movementColumns" :data="asset.movements ?? []" :bordered="false" size="small" :scroll-x="780">
							<template #empty>
								<div class="flex flex-col items-center justify-center py-8 text-slate-400">
									<Icon name="carbon:location" :size="32" class="mb-1 opacity-50" />
									<span class="text-sm">{{ t("inventory.stock.emptyMovements") }}</span>
								</div>
							</template>
						</n-data-table>
					</n-tab-pane>
					<n-tab-pane name="custody" :tab="t('inventory.history.custody')">
						<n-data-table :columns="custodyColumns" :data="asset.assignments ?? []" :bordered="false" size="small" :scroll-x="780">
							<template #empty>
								<div class="flex flex-col items-center justify-center py-8 text-slate-400">
									<Icon name="carbon:user-follow" :size="32" class="mb-1 opacity-50" />
									<span class="text-sm">{{ t("inventory.custody.empty") }}</span>
								</div>
							</template>
						</n-data-table>
					</n-tab-pane>
					<n-tab-pane name="maintenance" :tab="t('inventory.history.maintenance')">
						<n-data-table :columns="maintenanceColumns" :data="asset.maintenance ?? []" :bordered="false" size="small" :scroll-x="880">
							<template #empty>
								<div class="flex flex-col items-center justify-center py-8 text-slate-400">
									<Icon name="carbon:tool-kit" :size="32" class="mb-1 opacity-50" />
									<span class="text-sm">{{ t("inventory.maintenance.empty") }}</span>
								</div>
							</template>
						</n-data-table>
					</n-tab-pane>
					<n-tab-pane name="schedules" :tab="t('inventory.history.schedules')">
						<div v-if="may.maintenance && !disposed" class="mb-3 flex justify-end">
							<n-button size="small" type="primary" secondary @click="editSchedule(null)">
								<template #icon><Icon name="carbon:add" :size="15" /></template>{{ t("inventory.schedules.add") }}
							</n-button>
						</div>
						<n-data-table :columns="scheduleColumns" :data="asset.maintenance_schedules ?? []" :bordered="false" size="small" :scroll-x="680">
							<template #empty>
								<div class="flex flex-col items-center justify-center py-8 text-slate-400">
									<Icon name="carbon:calendar" :size="32" class="mb-1 opacity-50" />
									<span class="text-sm">{{ t("inventory.maintenance.noneDue") }}</span>
								</div>
							</template>
						</n-data-table>
					</n-tab-pane>
				</n-tabs>
			</n-card>

			<AssetActionModal v-model:show="actionVisible" :asset="asset" :action="action" :schedules="asset.maintenance_schedules" @done="load" />
			<AssetDetailsModal v-if="may.manage" v-model:show="detailsVisible" :asset="asset" @saved="load" />
			<ScheduleModal v-if="may.maintenance" v-model:show="scheduleVisible" :asset-id="asset.id" :schedule="editingSchedule" @saved="load" />
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Asset, AssetAction, AssetAssignment, AssetMovement, MaintenanceRecord, MaintenanceSchedule } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NButton, NCard, NDataTable, NPopconfirm, NSpin, NTabPane, NTabs, NTag, NTooltip, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute } from "vue-router"
import { canDisposeAssets, canManageAssets, canManageCustody, canManageMaintenance } from "@/add-os/config/permissions"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import AssetActionModal from "@/add-os/modules/inventory/components/AssetActionModal.vue"
import AssetDetailsModal from "@/add-os/modules/inventory/components/AssetDetailsModal.vue"
import AssetStatusTag from "@/add-os/modules/inventory/components/AssetStatusTag.vue"
import ScheduleModal from "@/add-os/modules/inventory/components/ScheduleModal.vue"
import { ALIGN_END, custodianLabel, EMPTY, isolate, localized, money, PLACE_COLUMN, placeLabel } from "@/add-os/modules/inventory/utils/display"
import { getAsset, removeSchedule } from "@/add-os/services/inventory"
import { countKey, formatNumber } from "@/add-os/utils/format"
import { formatDate, formatDateTime, formatTime } from "@/add-os/utils/format/dates"
import Icon from "@/components/common/Icon.vue"

/**
 * One asset: where it is and who holds it, what it cost and is worth on
 * the books, and its whole history — movements, custody, repairs, routine
 * servicing. The actions offered are the ones the account's permissions
 * and the asset's state allow; a disposed asset is read only.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const route = useRoute()
const message = useMessage()

const may = { manage: canManageAssets(), custody: canManageCustody(), maintenance: canManageMaintenance(), dispose: canDisposeAssets() }

const asset = ref<Asset | null>(null)
const loadError = ref("")
const action = ref<AssetAction>("move")
const actionVisible = ref(false)
const detailsVisible = ref(false)
const scheduleVisible = ref(false)
const editingSchedule = ref<MaintenanceSchedule | null>(null)

const disposed = computed(() => asset.value?.status === "disposed")

onMounted(load)

async function load() {
	loadError.value = ""
	try {
		asset.value = await getAsset(Number(route.params.id))
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("inventory.common.loadError"))
	}
}

function open(next: AssetAction) {
	action.value = next
	actionVisible.value = true
}

function editSchedule(schedule: MaintenanceSchedule | null) {
	editingSchedule.value = schedule
	scheduleVisible.value = true
}

async function deleteSchedule(schedule: MaintenanceSchedule) {
	try {
		await removeSchedule(schedule.id)
		message.success(t("inventory.schedules.deleted"))
		await load()
	} catch (e) {
		message.error(apiErrorMessage(e, t("inventory.common.saveError")))
	}
}

const actorName = (actor: { name: string | null } | null) => actor?.name ?? EMPTY
const months = (n: number) => t(countKey("inventory.assets.months", n), { n: formatNumber(n) })
const every = (n: number) => t(countKey("inventory.schedules.every", n), { n: formatNumber(n) })

const movementColumns = computed<DataTableColumns<AssetMovement>>(() => [
	{
		title: t("inventory.history.when"),
		key: "moved_at",
		width: 150,
		render: row =>
			h("div", { class: "inline-flex flex-col text-xs leading-tight" }, [
				h("span", { class: "font-medium text-slate-800 dark:text-slate-200" }, formatDate(row.moved_at)),
				h("span", { class: "text-slate-500 text-[11px] add-numeric mt-0.5" }, formatTime(row.moved_at))
			])
	},
	{ title: t("inventory.history.from"), key: "from", ...PLACE_COLUMN, render: row => (row.from ? placeLabel(row.from) : t("inventory.history.registered")) },
	{ title: t("inventory.history.to"), key: "to", ...PLACE_COLUMN, render: row => placeLabel(row.to) },
	{ title: t("inventory.common.note"), key: "note", minWidth: 160, render: row => row.note ?? EMPTY },
	{ title: t("inventory.history.by"), key: "actor", minWidth: 120, render: row => actorName(row.actor) }
])

const custodyColumns = computed<DataTableColumns<AssetAssignment>>(() => [
	{ title: t("inventory.assets.custodian"), key: "custodian", minWidth: 180, render: row => custodianLabel(row.custodian) },
	{
		title: t("inventory.history.handedOver"),
		key: "assigned_at",
		width: 150,
		render: row =>
			h("div", { class: "inline-flex flex-col text-xs leading-tight" }, [
				h("span", { class: "font-medium text-slate-800 dark:text-slate-200" }, formatDate(row.assigned_at)),
				h("span", { class: "text-slate-500 text-[11px] add-numeric mt-0.5" }, formatTime(row.assigned_at))
			])
	},
	{
		title: t("inventory.history.returned"),
		key: "returned_at",
		width: 140,
		align: "center",
		render: row =>
			row.returned_at
				? h("div", { class: "inline-flex flex-col text-xs leading-tight items-center" }, [
						h("span", { class: "font-medium text-slate-800 dark:text-slate-200" }, formatDate(row.returned_at)),
						h("span", { class: "text-slate-500 text-[11px] add-numeric mt-0.5" }, formatTime(row.returned_at))
				  ])
				: h(NTag, { size: "small", round: true, type: "warning" }, () => t("inventory.history.stillHeld"))
	},
	{ title: t("inventory.common.note"), key: "note", minWidth: 160, render: row => [row.note, row.return_note].filter(Boolean).join(" · ") || EMPTY }
])

const maintenanceColumns = computed<DataTableColumns<MaintenanceRecord>>(() => [
	{
		title: t("inventory.maintenance.type"),
		key: "type",
		width: 120,
		align: "center",
		render: row =>
			h(
				NTag,
				{ size: "small", round: true, type: row.type === "corrective" ? "error" : "info" },
				() => t(`inventory.maintenanceType.${row.type}`)
			)
	},
	{ title: t("inventory.maintenance.description"), key: "description", minWidth: 220 },
	{
		title: t("inventory.history.opened"),
		key: "opened_at",
		width: 150,
		render: row =>
			h("div", { class: "inline-flex flex-col text-xs leading-tight" }, [
				h("span", { class: "font-medium text-slate-800 dark:text-slate-200" }, formatDate(row.opened_at)),
				h("span", { class: "text-slate-500 text-[11px] add-numeric mt-0.5" }, formatTime(row.opened_at))
			])
	},
	{
		title: t("inventory.history.closed"),
		key: "closed_at",
		width: 140,
		align: "center",
		render: row =>
			row.closed_at
				? h("div", { class: "inline-flex flex-col text-xs leading-tight items-center" }, [
						h("span", { class: "font-medium text-slate-800 dark:text-slate-200" }, formatDate(row.closed_at)),
						h("span", { class: "text-slate-500 text-[11px] add-numeric mt-0.5" }, formatTime(row.closed_at))
				  ])
				: h(NTag, { size: "small", round: true, type: "warning" }, () => t("inventory.maintenance.open"))
	},
	{
		title: t("inventory.maintenance.cost"),
		key: "cost",
		minWidth: 110,
		align: ALIGN_END,
		render: row => h("span", { class: "add-numeric font-semibold" }, money(row.cost, row.currency))
	},
	{ title: t("inventory.maintenance.resolution"), key: "resolution", minWidth: 180, render: row => row.resolution ?? EMPTY }
])

const scheduleColumns = computed<DataTableColumns<MaintenanceSchedule>>(() => [
	{ title: t("inventory.schedules.title"), key: "title", minWidth: 180 },
	{ title: t("inventory.schedules.frequency"), key: "interval_months", minWidth: 120, render: row => every(row.interval_months) },
	{
		title: t("inventory.schedules.nextDue"),
		key: "next_due_on",
		minWidth: 140,
		render: row =>
			h(
				"span",
				{ class: row.overdue ? "text-rose-600 dark:text-rose-400 font-semibold" : "" },
				formatDate(row.next_due_on)
			)
	},
	{
		title: t("inventory.common.status"),
		key: "is_active",
		width: 100,
		align: "center",
		render: row =>
			h(
				NTag,
				{ size: "small", round: true, type: row.is_active ? "success" : "default" },
				() => t(row.is_active ? "inventory.common.active" : "inventory.common.inactive")
			)
	},
	{
		title: "",
		key: "actions",
		width: 100,
		align: "center",
		render: row =>
			may.maintenance && !disposed.value
				? h("div", { class: "flex items-center justify-center gap-1.5" }, [
						h(
							NTooltip,
							{ trigger: "hover" },
							{
								trigger: () =>
									h(
										NButton,
										{ size: "tiny", quaternary: true, circle: true, class: "text-slate-500 hover:text-primary", "aria-label": t("inventory.common.edit"), onClick: () => editSchedule(row) },
										{ icon: () => h(Icon, { name: "carbon:edit", size: 16 }) }
									),
								default: () => t("inventory.common.edit")
							}
						),
						h(
							NPopconfirm,
							{ onPositiveClick: () => void deleteSchedule(row) },
							{
								trigger: () =>
									h(
										NButton,
										{ size: "tiny", quaternary: true, circle: true, class: "text-slate-500 hover:text-error", "aria-label": t("inventory.common.delete") },
										{ icon: () => h(Icon, { name: "carbon:trash-can", size: 16 }) }
									),
								default: () => t("inventory.schedules.confirmDelete")
							}
						)
					])
				: null
	}
])
</script>
