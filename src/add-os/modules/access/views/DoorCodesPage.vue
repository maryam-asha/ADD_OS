<!-- src/add-os/modules/access/views/DoorCodesPage.vue -->
<!--
	Every door code on a lock and where it stands — whose it is, for which
	booking or lease, when it must be used by and until when it opens. Never
	the code itself: that stays between the lock and the member. A booking's
	live code can be stopped here (it is then not issued again on its own; the
	desk can re-issue it from the booking); an office's code follows its lease.
-->
<template>
	<div class="flex flex-col gap-5">
		<PageHeader :title="t(titleKey || 'nav.pages.doorCodes')" :description="t('doorCodes.subtitle')" />

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<n-select v-model:value="lockId" :options="lockOptions" clearable :placeholder="t('doorCodes.filters.lock')" />
			<n-select v-model:value="status" :options="statusOptions" />
		</div>

		<n-alert v-if="error" type="error" :title="t('doorCodes.loadError')" />

		<n-data-table :columns :data="rows" :loading="isLoading" :bordered="false" :row-key="(row: AccessGrant) => row.id" size="small" :scroll-x="980" />

		<div v-if="meta && meta.last_page > 1" class="flex justify-end">
			<n-pagination v-model:page="page" :page-count="meta.last_page" :disabled="isLoading" />
		</div>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { AccessGrant, AccessGrantStatus, Device } from "@/add-os/modules/access/types/access"
import { NAlert, NDataTable, NPagination, NSelect, NTag, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute } from "vue-router"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import RowActions from "@/add-os/components/page/RowActions.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { can } from "@/add-os/config/permissions"
import { listAccessGrants, listDevices, revokeAccessGrant } from "@/add-os/services/access"
import { ApiError } from "@/add-os/services/api"
import { formatDateTime } from "@/add-os/utils/format"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const route = useRoute()

const initialLock = Number(route.query.lock_id)
const lockId = ref<number | null>(Number.isFinite(initialLock) && initialLock > 0 ? initialLock : null)
const status = ref<string>("live")
const query = computed<Record<string, unknown>>(() => ({ lock_id: lockId.value, status: status.value }))
const page = ref(1)
const { data: rows, isLoading, error, refetch, meta } = useResourceList<AccessGrant>(listAccessGrants, query, page)

const canRevoke = computed(() => can("access-grants.revoke"))

const locks = ref<Device[]>([])
onMounted(async () => {
	if (!can("devices.view")) return
	try {
		locks.value = (await listDevices()).filter(device => device.type === "lock")
	} catch {
		locks.value = []
	}
})

const lockOptions = computed(() => locks.value.map(lock => ({ label: `${lock.external_ref ?? "—"} · #${lock.id}`, value: lock.id })))

const STATUSES: AccessGrantStatus[] = ["issued", "activated", "expired", "revoked"]
const statusOptions = computed(() => [
	{ label: t("doorCodes.status.live"), value: "live" },
	...STATUSES.map(status => ({ label: t(`doorCodes.status.${status}`), value: status }))
])

const STATUS_TYPE: Record<AccessGrantStatus, "success" | "info" | "default" | "error"> = {
	activated: "success",
	issued: "info",
	expired: "default",
	revoked: "error"
}

const isLive = (row: AccessGrant) => row.status === "issued" || row.status === "activated"
const at = (value: string | null) => (value ? formatDateTime(value) : "—")

const columns = computed<DataTableColumns<AccessGrant>>(() => [
	{
		title: t("doorCodes.columns.status"),
		key: "status",
		render: row => {
			const reason = row.revoke_reason ? ` · ${t(`doorCodes.revokeReason.${row.revoke_reason}`)}` : ""
			return h(NTag, { type: STATUS_TYPE[row.status], size: "small", round: true, bordered: false }, { default: () => `${t(`doorCodes.status.${row.status}`)}${reason}` })
		}
	},
	{
		title: t("doorCodes.columns.place"),
		key: "lock",
		render: row => row.lock.space?.name ?? `#${row.lock.id}`
	},
	{
		title: t("doorCodes.columns.for"),
		key: "grantee",
		render: row => {
			const who = row.grantee.name ?? `#${row.grantee.id}`
			const what = row.booking_id
				? t("doorCodes.forBooking", { id: row.booking_id })
				: row.office_lease_id
					? t("doorCodes.forLease", { id: row.office_lease_id })
					: ""
			return h("div", { class: "flex flex-col" }, [h("span", who), what ? h("span", { class: "text-xs text-secondary" }, what) : null])
		}
	},
	{ title: t("doorCodes.columns.issuedAt"), key: "issued_at", render: row => at(row.issued_at) },
	{
		title: t("doorCodes.columns.activation"),
		key: "activated_at",
		render: row => (row.activated_at ? at(row.activated_at) : row.status === "issued" ? t("doorCodes.activateBy", { at: at(row.must_activate_by) }) : "—")
	},
	{ title: t("doorCodes.columns.expiresAt"), key: "expires_at", render: row => at(row.expires_at) },
	{
		title: t("doorCodes.columns.revoked"),
		key: "revoked_at",
		render: row => (row.revoked_at ? [at(row.revoked_at), row.revoked_by ? ` · ${row.revoked_by.name}` : ""].join("") : "—")
	},
	{
		title: "",
		key: "actions",
		width: 90,
		render: row =>
			canRevoke.value && isLive(row) && row.source_type === "booking"
				? h(RowActions, { actions: [{ key: "revoke", label: t("doorCodes.revoke.button"), icon: "carbon:close-outline", danger: true, onClick: () => confirmRevoke(row) }] })
				: null
	}
])

function confirmRevoke(row: AccessGrant) {
	dialog.warning({
		title: t("doorCodes.revoke.button"),
		content: t("doorCodes.revoke.confirm", { who: row.grantee.name ?? `#${row.grantee.id}`, place: row.lock.space?.name ?? `#${row.lock.id}` }),
		positiveText: t("doorCodes.revoke.ok"),
		negativeText: t("resourceCrud.table.deleteConfirmCancel"),
		onPositiveClick: async () => {
			try {
				const response = await revokeAccessGrant(row.id)
				message.success(response.message ?? t("doorCodes.revoke.done"))
				await refetch()
			} catch (caught) {
				if (!(caught instanceof ApiError)) throw caught
				message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
			}
		}
	})
}
</script>
