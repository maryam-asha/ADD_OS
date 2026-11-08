<!-- src/add-os/modules/access/views/AccessLogPage.vue -->
<!--
	Every door opened, locked or refused, newest first: by whom, through which
	channel (the sticker scan, the app's door buttons, the desk activating a
	code, staff from this dashboard) and with which code. A door opened by
	typing its code on the keypad is not here — the lock does not report it.
-->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.accessLogs") }}</h1>
			<p class="text-sm text-secondary">{{ t("accessLog.subtitle") }}</p>
		</div>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<n-select v-model:value="deviceId" :options="lockOptions" clearable :placeholder="t('accessLog.filters.lock')" />
			<n-select v-model:value="eventType" :options="typeOptions" clearable :placeholder="t('accessLog.filters.type')" />
			<n-select v-model:value="channel" :options="channelOptions" clearable :placeholder="t('accessLog.filters.channel')" />
			<n-date-picker v-model:formatted-value="range" type="daterange" value-format="yyyy-MM-dd" clearable />
		</div>

		<n-alert v-if="error" type="error" :title="t('accessLog.loadError')" />

		<n-data-table :columns :data="rows" :loading="isLoading" :bordered="false" :row-key="(row: AccessEvent) => row.id" size="small" :scroll-x="900" />

		<div v-if="meta && meta.last_page > 1" class="flex justify-end">
			<n-pagination v-model:page="page" :page-count="meta.last_page" :disabled="isLoading" />
		</div>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { AccessEvent, AccessEventChannel, AccessEventType, Device } from "@/add-os/modules/access/types/access"
import { NAlert, NDataTable, NDatePicker, NPagination, NSelect, NTag } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute } from "vue-router"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { can } from "@/add-os/config/permissions"
import { listAccessEvents, listDevices } from "@/add-os/services/access"
import { formatDateTime } from "@/add-os/utils/format"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const route = useRoute()

const initialDevice = Number(route.query.device_id)
const deviceId = ref<number | null>(Number.isFinite(initialDevice) && initialDevice > 0 ? initialDevice : null)
const eventType = ref<AccessEventType | null>(null)
const channel = ref<AccessEventChannel | null>(null)
const range = ref<[string, string] | null>(null)
const query = computed<Record<string, unknown>>(() => ({
	device_id: deviceId.value,
	event_type: eventType.value,
	channel: channel.value,
	from: range.value?.[0] ?? null,
	to: range.value?.[1] ?? null
}))

const page = ref(1)
const { data: rows, isLoading, error, meta } = useResourceList<AccessEvent>(listAccessEvents, query, page)

const devices = ref<Device[]>([])
onMounted(async () => {
	if (!can("devices.view")) return
	try {
		devices.value = (await listDevices()).filter(device => device.type === "lock")
	} catch {
		devices.value = []
	}
})
const lockOptions = computed(() => devices.value.map(lock => ({ label: `${lock.external_ref ?? "—"} · #${lock.id}`, value: lock.id })))

const TYPES: AccessEventType[] = ["unlock", "lock", "failed_attempt"]
const CHANNELS: AccessEventChannel[] = ["qr_scan", "app_remote", "reception_activation", "dashboard"]
const typeOptions = computed(() => TYPES.map(type => ({ label: t(`accessLog.type.${type}`), value: type })))
const channelOptions = computed(() => CHANNELS.map(channel => ({ label: t(`accessLog.channel.${channel}`), value: channel })))

const TYPE_TAG: Record<AccessEventType, "success" | "info" | "default" | "error"> = {
	unlock: "success",
	lock: "info",
	lock_auto: "default",
	failed_attempt: "error"
}

const columns = computed<DataTableColumns<AccessEvent>>(() => [
	{ title: t("accessLog.columns.at"), key: "occurred_at", render: row => formatDateTime(row.occurred_at) },
	{
		title: t("accessLog.columns.type"),
		key: "event_type",
		render: row => h(NTag, { type: TYPE_TAG[row.event_type] ?? "default", size: "small", round: true, bordered: false }, { default: () => t(`accessLog.type.${row.event_type}`) })
	},
	{ title: t("accessLog.columns.channel"), key: "channel", render: row => t(`accessLog.channel.${row.channel}`) },
	{ title: t("accessLog.columns.place"), key: "device", render: row => row.device?.space?.name ?? (row.device ? `#${row.device.id}` : "—") },
	{ title: t("accessLog.columns.actor"), key: "actor", render: row => row.actor?.name ?? "—" },
	{
		title: t("accessLog.columns.code"),
		key: "grant",
		render: row =>
			row.grant?.booking_id
				? t("doorCodes.forBooking", { id: row.grant.booking_id })
				: row.grant?.office_lease_id
					? t("doorCodes.forLease", { id: row.grant.office_lease_id })
					: "—"
	}
])
</script>
