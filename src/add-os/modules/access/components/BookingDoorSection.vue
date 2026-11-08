<!-- src/add-os/modules/access/components/BookingDoorSection.vue -->
<!--
	A booking's door, for the desk: where its code stands (never the code
	itself), and the three things reception does with it — activate it on the
	member's arrival, issue a new one in place of an expired, stopped or lost
	one, and open the door outright. A room with no lock has no code: the
	server says so when asked to issue one, and the section shows nothing more.
-->
<template>
	<section v-if="canView" class="flex flex-col gap-2" data-test="booking-door">
		<h3 class="flex items-center gap-2 font-semibold">
			<Icon name="carbon:locked" :size="16" />
			{{ t("bookingDoor.title") }}
		</h3>

		<n-spin :show="loading">
			<p v-if="grant === null && !loading" class="text-secondary">{{ t("bookingDoor.none") }}</p>

			<dl v-if="grant" class="flex flex-col divide-y divide-[var(--border-color)]">
				<div class="flex justify-between gap-4 py-2">
					<dt class="text-secondary">{{ t("bookingDoor.status") }}</dt>
					<dd>
						<n-tag :type="STATUS_TYPE[grant.status]" size="small" :bordered="false">
							{{ t(`doorCodes.status.${grant.status}`) }}<template v-if="grant.revoke_reason"> · {{ t(`doorCodes.revokeReason.${grant.revoke_reason}`) }}</template>
						</n-tag>
					</dd>
				</div>
				<div v-if="grant.status === 'issued' && grant.must_activate_by" class="flex justify-between gap-4 py-2">
					<dt class="text-secondary">{{ t("bookingDoor.activateBy") }}</dt>
					<dd>{{ formatDateTime(grant.must_activate_by) }}</dd>
				</div>
				<div v-if="grant.activated_at" class="flex justify-between gap-4 py-2">
					<dt class="text-secondary">{{ t("bookingDoor.activatedAt") }}</dt>
					<dd>{{ formatDateTime(grant.activated_at) }}</dd>
				</div>
				<div v-if="grant.expires_at" class="flex justify-between gap-4 py-2">
					<dt class="text-secondary">{{ t("bookingDoor.expiresAt") }}</dt>
					<dd>{{ formatDateTime(grant.expires_at) }}</dd>
				</div>
			</dl>
		</n-spin>

		<div v-if="canCheckIn || mayOpen" class="flex flex-wrap gap-2">
			<n-button v-if="canCheckIn && grant?.status === 'issued'" type="primary" size="small" :loading="busy === 'activate'" @click="activate">
				<template #icon><Icon name="carbon:checkmark-outline" :size="16" /></template>
				{{ t("bookingDoor.activate") }}
			</n-button>
			<n-button v-if="canCheckIn && bookingOpen" size="small" secondary :loading="busy === 'reissue'" @click="confirmReissue">
				<template #icon><Icon name="carbon:renew" :size="16" /></template>
				{{ grant ? t("bookingDoor.reissue") : t("bookingDoor.issue") }}
			</n-button>
			<n-button v-if="mayOpen" size="small" type="warning" secondary :loading="busy === 'unlock'" @click="confirmUnlock">
				<template #icon><Icon name="carbon:unlocked" :size="16" /></template>
				{{ t("bookingDoor.open") }}
			</n-button>
		</div>
	</section>
</template>

<script setup lang="ts">
import type { AccessGrantStatus, BookingAccessGrant } from "@/add-os/modules/access/types/access"
import { NButton, NSpin, NTag, useDialog, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { can } from "@/add-os/config/permissions"
import { activateAccessGrant, getBookingAccessGrant, reissueBookingAccessGrant, unlockDevice } from "@/add-os/services/access"
import { ApiError } from "@/add-os/services/api"
import { formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	bookingId: number
	/** Confirmed and not ended: the only booking the server gives a new code. */
	bookingOpen: boolean
}>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const canView = computed(() => can("reception.view"))
const canCheckIn = computed(() => can("reception.check_in"))

const grant = ref<BookingAccessGrant | null>(null)
const loading = ref(false)
const busy = ref<"activate" | "reissue" | "unlock" | null>(null)

const mayOpen = computed(() => can("devices.control") && grant.value !== null && props.bookingOpen)

const STATUS_TYPE: Record<AccessGrantStatus, "success" | "info" | "default" | "error"> = {
	activated: "success",
	issued: "info",
	expired: "default",
	revoked: "error"
}

async function load() {
	if (!canView.value) return
	loading.value = true
	try {
		grant.value = await getBookingAccessGrant(props.bookingId)
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		// 404: no code issued for this booking yet.
		grant.value = null
	} finally {
		loading.value = false
	}
}

watch(() => props.bookingId, load, { immediate: true })

function fail(caught: unknown) {
	if (!(caught instanceof ApiError)) throw caught
	message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
}

async function run(kind: "activate" | "reissue" | "unlock", call: () => Promise<{ message?: string } | unknown>, done: string) {
	busy.value = kind
	try {
		const response = (await call()) as { message?: string } | undefined
		message.success(response?.message ?? done)
		await load()
	} catch (caught) {
		fail(caught)
	} finally {
		busy.value = null
	}
}

function activate() {
	if (grant.value) void run("activate", () => activateAccessGrant(grant.value!.id), t("bookingDoor.activated"))
}

function confirmReissue() {
	dialog.warning({
		title: grant.value ? t("bookingDoor.reissue") : t("bookingDoor.issue"),
		content: grant.value ? t("bookingDoor.reissueConfirm") : t("bookingDoor.issueConfirm"),
		positiveText: t("bookingDoor.confirm"),
		negativeText: t("resourceCrud.table.deleteConfirmCancel"),
		onPositiveClick: () => run("reissue", () => reissueBookingAccessGrant(props.bookingId), t("bookingDoor.reissued"))
	})
}

function confirmUnlock() {
	const lockId = grant.value?.lock_id
	if (!lockId) return
	dialog.warning({
		title: t("bookingDoor.open"),
		content: t("bookingDoor.openConfirm"),
		positiveText: t("bookingDoor.confirm"),
		negativeText: t("resourceCrud.table.deleteConfirmCancel"),
		onPositiveClick: () => run("unlock", () => unlockDevice(lockId), t("bookingDoor.opened"))
	})
}
</script>
