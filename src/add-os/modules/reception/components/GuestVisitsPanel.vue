<!-- src/add-os/modules/reception/components/GuestVisitsPanel.vue -->
<!--
	The reception desk's guests tab: members' coworking guests inside on a
	visit (GET reception/guest-visits) — free while their grace runs, or
	declined by a host who will not pay for them. Recording one and checking
	one out happen here; a visit past its grace leaves this list and shows on
	the live sessions board as a walk-in.
-->
<template>
	<div class="flex flex-col gap-4">
		<n-alert type="info" :bordered="false">{{ t("guestVisits.description") }}</n-alert>

		<n-alert v-if="error" type="error" :title="t('guestVisits.loadError')" />

		<div class="flex justify-end gap-2">
			<n-button :loading="isLoading" @click="refetch">
				<template #icon><Icon name="carbon:renew" :size="16" /></template>
				{{ t("activeSessions.refresh") }}
			</n-button>
			<n-button v-if="canCheckInAtReception()" type="primary" @click="recordOpen = true">
				<template #icon><Icon name="carbon:user-follow" :size="16" /></template>
				{{ t("guestVisits.record.button") }}
			</n-button>
		</div>

		<n-card class="add-ledger-table">
			<n-data-table
				v-if="rows.length > 0 || isLoading"
				:columns
				:data="rows"
				:loading="isLoading"
				:bordered="false"
				:row-key
				:row-class-name
				size="small"
				:scroll-x="980"
			/>
			<div v-else-if="!error" class="py-10 text-center">{{ t("guestVisits.empty") }}</div>
		</n-card>

		<RecordGuestModal v-model:show="recordOpen" @recorded="refetch" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { RowAction } from "@/add-os/components/page/row-actions"
import type { GuestVisit } from "@/add-os/modules/booking/types/reception"
import { NAlert, NButton, NCard, NDataTable, NTag } from "naive-ui"
import { computed, h, onBeforeUnmount, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import RowActions from "@/add-os/components/page/RowActions.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { canCheckInAtReception } from "@/add-os/config/permissions"
import { useReceptionAction } from "@/add-os/modules/booking/composables/useReceptionAction"
import { useReceptionRealtime } from "@/add-os/modules/booking/composables/useReceptionRealtime"
import RecordGuestModal from "@/add-os/modules/reception/components/RecordGuestModal.vue"
import { useOpenRecord } from "@/add-os/notifications/useOpenRecord"
import { checkOutGuestVisit, listGuestVisits } from "@/add-os/services/reception"
import { formatNumber, formatTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()

const { data: rows, isLoading, error, refetch } = useResourceList<GuestVisit>(listGuestVisits)

const action = useReceptionAction(async () => {
	await refetch()
	emit("changed")
})

/** A notice about a visit (a host declined to pay) opens this tab with its row picked out. */
const { rowClassName } = useOpenRecord(undefined, () => rows.value)

// The desk's events reload it too (a 30 s poll while the socket is down);
// guest visits send no event of their own.
useReceptionRealtime(refetch)

const recordOpen = ref(false)

function rowKey(row: GuestVisit): number {
	return row.id
}

/* ── The grace countdown ───────────────────────────────────────────────────── */

/**
 * `grace_seconds_left` is the server's count when the list was read, so the
 * countdown runs from that moment on this machine's clock — the two clocks
 * never have to agree. Ticks every 15 s: the desk reads minutes, not seconds.
 */
const loadedAt = ref(Date.now())
const now = ref(Date.now())
const ticker = window.setInterval(() => {
	now.value = Date.now()
}, 15_000)

/** The minute job (`guests:run`) converts a visit within a minute of its grace end; read the list again after it. */
const CONVERSION_DELAY_MS = 65_000
let reloadTimer: number | undefined

watch(rows, (visits) => {
	loadedAt.value = Date.now()
	now.value = loadedAt.value
	window.clearTimeout(reloadTimer)
	const pending = visits.filter(visit => visit.status === "in_grace").map(visit => visit.grace_seconds_left)
	if (pending.length === 0) return
	reloadTimer = window.setTimeout(() => void refetch(), Math.min(...pending) * 1000 + CONVERSION_DELAY_MS)
})

onBeforeUnmount(() => {
	window.clearInterval(ticker)
	window.clearTimeout(reloadTimer)
})

function minutesLeft(visit: GuestVisit): number {
	const left = visit.grace_seconds_left * 1000 - (now.value - loadedAt.value)
	return left <= 0 ? 0 : Math.ceil(left / 60_000)
}

function graceCell(visit: GuestVisit) {
	if (visit.status === "declined") {
		return h(NTag, { type: "error", round: true, size: "small", title: t("guestVisits.status.declinedHint") }, { default: () => t("guestVisits.status.declined") })
	}
	const minutes = minutesLeft(visit)
	if (minutes === 0) {
		return h(NTag, { type: "warning", round: true, size: "small", title: t("guestVisits.status.graceOverHint") }, { default: () => t("guestVisits.status.graceOver") })
	}
	return h("div", { class: "flex flex-col items-center gap-0.5" }, [
		h(NTag, { type: "success", round: true, size: "small" }, { default: () => t("guestVisits.status.inGrace", { minutes: formatNumber(minutes) }) }),
		h("span", { class: "font-mono text-xs" }, t("guestVisits.status.until", { time: formatTime(visit.grace_ends_at) }))
	])
}

/* ── Check out ─────────────────────────────────────────────────────────────── */

/**
 * Within the grace, or declined, nothing is billed; past it the server bills
 * the session from the arrival and says so in its message — the dialog warns
 * of that before it happens.
 */
function checkOut(visit: GuestVisit): Promise<boolean> {
	return action.run(() => checkOutGuestVisit(visit.id), t("guestVisits.checkOut.success"))
}

function checkOutConfirm(visit: GuestVisit): string {
	if (visit.status === "in_grace" && minutesLeft(visit) === 0) return t("guestVisits.checkOut.confirmBilled", { name: visit.guest.name })
	return t("guestVisits.checkOut.confirmFree", { name: visit.guest.name })
}

const columns = computed<DataTableColumns<GuestVisit>>(() => [
	{
		title: t("guestVisits.columns.guest"),
		key: "guest",
		minWidth: 180,
		align: "center",
		render: row => h("div", { class: "flex flex-col items-center gap-1" }, [
			h("span", { class: "font-semibold" }, row.guest.name),
			h("span", { class: "font-mono text-xs", dir: "ltr" }, row.guest.phone),
			h(
				NTag,
				{ size: "small", round: true, type: row.guest.has_account ? "info" : "default" },
				{ default: () => t(row.guest.has_account ? "guestVisits.account.member" : "guestVisits.account.none") }
			)
		])
	},
	{ title: t("guestVisits.columns.host"), key: "host", minWidth: 150, align: "center", render: row => row.host.name ?? "—" },
	{
		title: t("guestVisits.columns.billedTo"),
		key: "bills_host",
		minWidth: 130,
		align: "center",
		render: row => t(row.bills_host ? "guestVisits.billedTo.host" : "guestVisits.billedTo.guest")
	},
	{
		title: t("guestVisits.columns.arrivedAt"),
		key: "arrived_at",
		minWidth: 110,
		align: "center",
		render: row => h("span", { class: "font-mono text-xs" }, formatTime(row.arrived_at))
	},
	{ title: t("guestVisits.columns.grace"), key: "grace_ends_at", minWidth: 150, align: "center", render: graceCell },
	{
		title: t("activeSessions.columns.actions"),
		key: "actions",
		minWidth: 160,
		align: "center",
		render: (row) => {
			if (!canCheckInAtReception()) return null
			const actions: RowAction[] = [{
				key: "checkOut",
				label: t("guestVisits.checkOut.button"),
				icon: "carbon:logout",
				primary: true,
				confirm: checkOutConfirm(row),
				onClick: () => checkOut(row)
			}]
			return h(RowActions, { actions, labelled: true })
		}
	}
])

defineExpose({ rows, refetch, checkOut, recordOpen })
</script>
