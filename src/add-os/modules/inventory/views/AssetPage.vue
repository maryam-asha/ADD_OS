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

			<div v-if="!disposed" class="flex flex-wrap gap-2">
				<n-button v-if="may.manage" size="small" @click="open('move')">
					<template #icon><Icon name="carbon:location" :size="16" /></template>{{ t("inventory.actions.move.title") }}
				</n-button>
				<n-button v-if="may.custody && !asset.custodian" size="small" :disabled="asset.status !== 'in_service'" @click="open('assign')">
					<template #icon><Icon name="carbon:user-follow" :size="16" /></template>{{ t("inventory.actions.assign.title") }}
				</n-button>
				<n-button v-if="may.custody && asset.custodian" size="small" @click="open('return')">
					<template #icon><Icon name="carbon:undo" :size="16" /></template>{{ t("inventory.actions.return.title") }}
				</n-button>
				<n-button v-if="may.maintenance && !asset.open_maintenance" size="small" :disabled="asset.status !== 'in_service'" @click="open('maintenance')">
					<template #icon><Icon name="carbon:tool-kit" :size="16" /></template>{{ t("inventory.actions.maintenance.title") }}
				</n-button>
				<n-button v-if="may.maintenance && asset.open_maintenance" size="small" type="primary" @click="open('close')">
					<template #icon><Icon name="carbon:checkmark-outline" :size="16" /></template>{{ t("inventory.actions.close.title") }}
				</n-button>
				<n-button v-if="may.manage && asset.status !== 'in_maintenance'" size="small" @click="open('status')">
					<template #icon><Icon name="carbon:edit" :size="16" /></template>{{ t("inventory.actions.status.title") }}
				</n-button>
				<n-button v-if="may.manage" size="small" @click="detailsVisible = true">
					<template #icon><Icon name="carbon:document" :size="16" /></template>{{ t("inventory.assets.editDetails") }}
				</n-button>
				<n-button v-if="may.dispose" size="small" type="error" secondary @click="open('dispose')">
					<template #icon><Icon name="carbon:trash-can" :size="16" /></template>{{ t("inventory.actions.dispose.title") }}
				</n-button>
			</div>

			<n-alert v-if="asset.open_maintenance" type="warning" :title="t('inventory.maintenance.openNow')">
				{{ asset.open_maintenance.description }} · {{ formatDateTime(asset.open_maintenance.opened_at) }}
			</n-alert>

			<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<n-card :title="t('inventory.assets.whereAndWho')" size="small">
					<dl class="flex flex-col gap-2 text-sm">
						<div><dt class="text-secondary">{{ t("inventory.assets.location") }}</dt><dd>{{ placeLabel(asset.location) }}</dd></div>
						<div>
							<dt class="text-secondary">{{ t("inventory.assets.custodian") }}</dt>
							<dd>{{ custodianLabel(asset.custodian) }}<span v-if="asset.custodian" class="text-secondary"> · {{ formatDate(asset.custodian.since) }}</span></dd>
						</div>
						<div>
							<dt class="text-secondary">{{ t("inventory.assets.serial") }}</dt>
							<dd><span v-if="asset.serial_number" dir="ltr" class="font-mono">{{ asset.serial_number }}</span><template v-else>{{ EMPTY }}</template></dd>
						</div>
						<div><dt class="text-secondary">{{ t("inventory.assets.qr") }}</dt><dd class="break-all"><span dir="ltr" class="font-mono text-xs">{{ asset.qr_token }}</span></dd></div>
						<div><dt class="text-secondary">{{ t("inventory.assets.warrantyUntil") }}</dt><dd>{{ asset.warranty_until ? formatDate(asset.warranty_until) : EMPTY }}</dd></div>
					</dl>
				</n-card>
				<n-card :title="t('inventory.assets.money')" size="small">
					<dl class="flex flex-col gap-2 text-sm">
						<div><dt class="text-secondary">{{ t("inventory.assets.purchasedOn") }}</dt><dd>{{ asset.purchased_on ? formatDate(asset.purchased_on) : EMPTY }}</dd></div>
						<div><dt class="text-secondary">{{ t("inventory.assets.cost") }}</dt><dd class="add-numeric">{{ money(asset.purchase_cost, asset.currency) }}</dd></div>
						<div><dt class="text-secondary">{{ t("inventory.assets.supplier") }}</dt><dd>{{ asset.supplier ?? EMPTY }}</dd></div>
						<div><dt class="text-secondary">{{ t("inventory.assets.life") }}</dt><dd>{{ asset.useful_life_months ? months(asset.useful_life_months) : EMPTY }}</dd></div>
						<div><dt class="text-secondary">{{ t("inventory.assets.salvage") }}</dt><dd class="add-numeric">{{ money(asset.salvage_value, asset.currency) }}</dd></div>
					</dl>
				</n-card>
				<n-card :title="t('inventory.assets.depreciation')" size="small">
					<p v-if="!asset.depreciation" class="text-sm text-secondary">{{ t("inventory.assets.noDepreciation") }}</p>
					<dl v-else class="flex flex-col gap-2 text-sm">
						<div><dt class="text-secondary">{{ t("inventory.assets.monthly") }}</dt><dd class="add-numeric">{{ money(asset.depreciation.monthly, asset.currency) }}</dd></div>
						<div><dt class="text-secondary">{{ t("inventory.assets.accumulated") }}</dt><dd class="add-numeric">{{ money(asset.depreciation.accumulated, asset.currency) }}</dd></div>
						<div><dt class="text-secondary">{{ t("inventory.assets.bookValue") }}</dt><dd class="add-numeric font-semibold">{{ money(asset.depreciation.book_value, asset.currency) }}</dd></div>
						<div><dt class="text-secondary">{{ t("inventory.assets.elapsed") }}</dt><dd>{{ months(asset.depreciation.months_elapsed) }}</dd></div>
					</dl>
					<div v-if="asset.disposal" class="mt-3 border-t border-[var(--add-border)] pt-3 text-sm">
						<span class="font-semibold">{{ t(`inventory.disposal.methods.${asset.disposal.method}`) }}</span>
						· {{ formatDate(asset.disposal.disposed_on) }}
						<span v-if="asset.disposal.proceeds"> · {{ money(asset.disposal.proceeds, asset.currency) }}</span>
					</div>
				</n-card>
			</div>

			<p v-if="asset.notes" class="whitespace-pre-line text-sm text-secondary">{{ asset.notes }}</p>

			<n-card size="small" class="add-ledger-table">
				<n-tabs type="line" animated>
					<n-tab-pane name="movements" :tab="t('inventory.history.movements')">
						<n-data-table :columns="movementColumns" :data="asset.movements ?? []" :bordered="false" size="small" :scroll-x="tableWidth(movementColumns)" />
					</n-tab-pane>
					<n-tab-pane name="custody" :tab="t('inventory.history.custody')">
						<n-data-table :columns="custodyColumns" :data="asset.assignments ?? []" :bordered="false" size="small" :scroll-x="tableWidth(custodyColumns)" />
					</n-tab-pane>
					<n-tab-pane name="maintenance" :tab="t('inventory.history.maintenance')">
						<n-data-table :columns="maintenanceColumns" :data="asset.maintenance ?? []" :bordered="false" size="small" :scroll-x="tableWidth(maintenanceColumns)" />
					</n-tab-pane>
					<n-tab-pane name="schedules" :tab="t('inventory.history.schedules')">
						<div v-if="may.maintenance && !disposed" class="mb-3 flex justify-end">
							<n-button size="small" @click="editSchedule(null)">
								<template #icon><Icon name="carbon:add" :size="16" /></template>{{ t("inventory.schedules.add") }}
							</n-button>
						</div>
						<n-data-table :columns="scheduleColumns" :data="asset.maintenance_schedules ?? []" :bordered="false" size="small" :scroll-x="tableWidth(scheduleColumns)" />
					</n-tab-pane>
				</n-tabs>
			</n-card>

			<AssetActionModal v-model:show="actionVisible" :asset :action :schedules="asset.maintenance_schedules" @done="load" />
			<AssetDetailsModal v-if="may.manage" v-model:show="detailsVisible" :asset @saved="load" />
			<ScheduleModal v-if="may.maintenance" v-model:show="scheduleVisible" :asset-id="asset.id" :schedule="editingSchedule" @saved="load" />
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Asset, AssetAction, AssetAssignment, AssetMovement, MaintenanceRecord, MaintenanceSchedule } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NButton, NCard, NDataTable, NPopconfirm, NSpin, NTabPane, NTabs, NTag, useMessage } from "naive-ui"
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
import { COLUMN, custodianLabel, EMPTY, isolate, localized, money, placeLabel, tableWidth } from "@/add-os/modules/inventory/utils/display"
import { getAsset, removeSchedule } from "@/add-os/services/inventory"
import { countKey, formatNumber } from "@/add-os/utils/format"
import { formatDate, formatDateTime } from "@/add-os/utils/format/dates"
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
	{ title: t("inventory.history.when"), key: "moved_at", ...COLUMN.dateTime, render: row => formatDateTime(row.moved_at) },
	{ title: t("inventory.history.from"), key: "from", ...COLUMN.place, render: row => (row.from ? placeLabel(row.from) : t("inventory.history.registered")) },
	{ title: t("inventory.history.to"), key: "to", ...COLUMN.place, render: row => placeLabel(row.to) },
	{ title: t("inventory.common.note"), key: "note", ...COLUMN.text, render: row => row.note ?? EMPTY },
	{ title: t("inventory.history.by"), key: "actor", ...COLUMN.person, render: row => actorName(row.actor) }
])

const custodyColumns = computed<DataTableColumns<AssetAssignment>>(() => [
	{ title: t("inventory.assets.custodian"), key: "custodian", ...COLUMN.person, render: row => custodianLabel(row.custodian) },
	{ title: t("inventory.history.handedOver"), key: "assigned_at", ...COLUMN.dateTime, render: row => formatDateTime(row.assigned_at) },
	{ title: t("inventory.history.returned"), key: "returned_at", ...COLUMN.dateTime, render: row => (row.returned_at ? formatDateTime(row.returned_at) : h(NTag, { size: "small", round: true, type: "warning" }, () => t("inventory.history.stillHeld"))) },
	{ title: t("inventory.common.note"), key: "note", ...COLUMN.text, render: row => [row.note, row.return_note].filter(Boolean).join(" · ") || EMPTY }
])

const maintenanceColumns = computed<DataTableColumns<MaintenanceRecord>>(() => [
	{ title: t("inventory.maintenance.type"), key: "type", ...COLUMN.flag, render: row => t(`inventory.maintenanceType.${row.type}`) },
	{ title: t("inventory.maintenance.description"), key: "description", ...COLUMN.text, minWidth: 220 },
	{ title: t("inventory.history.opened"), key: "opened_at", ...COLUMN.dateTime, render: row => formatDateTime(row.opened_at) },
	{ title: t("inventory.history.closed"), key: "closed_at", ...COLUMN.dateTime, render: row => (row.closed_at ? formatDateTime(row.closed_at) : h(NTag, { size: "small", round: true, type: "warning" }, () => t("inventory.maintenance.open"))) },
	{ title: t("inventory.maintenance.cost"), key: "cost", ...COLUMN.money, render: row => h("span", { class: "add-numeric" }, money(row.cost, row.currency)) },
	{ title: t("inventory.maintenance.resolution"), key: "resolution", ...COLUMN.text, render: row => row.resolution ?? EMPTY }
])

const scheduleColumns = computed<DataTableColumns<MaintenanceSchedule>>(() => [
	{ title: t("inventory.schedules.title"), key: "title", ...COLUMN.text },
	{ title: t("inventory.schedules.frequency"), key: "interval_months", width: 150, render: row => every(row.interval_months) },
	{
		title: t("inventory.schedules.nextDue"),
		key: "next_due_on",
		...COLUMN.date,
		render: row => h("span", { class: row.overdue ? "text-error font-semibold" : "" }, formatDate(row.next_due_on))
	},
	{ title: t("inventory.common.status"), key: "is_active", ...COLUMN.flag, render: row => t(row.is_active ? "inventory.common.active" : "inventory.common.inactive") },
	{
		title: "",
		key: "actions",
		...COLUMN.actions,
		render: row =>
			may.maintenance && !disposed.value
				? h("div", { class: "flex items-center justify-end gap-3" }, [
						h(NButton, { text: true, type: "primary", "aria-label": t("inventory.common.edit"), title: t("inventory.common.edit"), onClick: () => editSchedule(row) }, { icon: () => h(Icon, { name: "carbon:edit", size: 18 }) }),
						h(
							NPopconfirm,
							{ onPositiveClick: () => void deleteSchedule(row) },
							{
								trigger: () => h(NButton, { text: true, type: "error", "aria-label": t("inventory.common.delete"), title: t("inventory.common.delete") }, { icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }),
								default: () => t("inventory.schedules.confirmDelete")
							}
						)
					])
				: null
	}
])
</script>
