<!-- src/add-os/modules/kitchen/views/KitchenBoardPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<PageHeader :title="t('nav.pages.board')" :description="t('kitchen.board.description')">
			<template #actions>
				<div class="ms-auto flex flex-wrap items-center gap-2">
					<ChimeMuteButton />
					<n-button :loading="isLoading" @click="load">
						<template #icon><Icon name="carbon:renew" :size="16" /></template>
						{{ t("kitchen.board.refresh") }}
					</n-button>
				</div>
			</template>
		</PageHeader>

		<n-alert v-if="loadError" type="error" :title="t('kitchen.board.loadError')" />

		<n-card v-if="missingStore" data-test="no-store">
			<div class="flex flex-col items-center gap-3 py-6 text-center">
				<Icon name="carbon:warning-alt" :size="32" />
				<h2 class="text-lg font-bold">{{ t("kitchen.board.noStore.title") }}</h2>
				<p>{{ t("kitchen.board.noStore.reason", { branch: missingStore.branch.name }) }}</p>
				<router-link v-if="mayUpdateStores" :to="{ name: 'kitchen.stores' }" data-test="no-store-link">
					<n-button type="primary">{{ t("kitchen.board.noStore.link") }}</n-button>
				</router-link>
			</div>
		</n-card>

		<div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<section v-for="column in columns" :key="column.status" class="flex flex-col gap-3" :data-column="column.status">
				<div class="flex items-center gap-2">
					<h2 class="text-lg font-bold">{{ t(`kitchen.board.columns.${column.status}`) }}</h2>
					<n-tag size="small" round :bordered="false">{{ formatNumber(column.orders.length) }}</n-tag>
				</div>
				<KitchenOrderCard
					v-for="order in column.orders"
					:key="order.id"
					:order
					:can-manage="mayManage"
					:now
					:fetched-at
					:busy="busyId === order.id"
					@accept="accept(order)"
					@adjust="openAdjust(order)"
					@reject="openReject(order)"
					@ready="ready(order)"
					@deliver="deliver(order)"
				/>
				<p v-if="column.orders.length === 0" class="text-secondary py-6 text-center">{{ t("kitchen.board.emptyColumn") }}</p>
			</section>
		</div>

		<AcceptWithChangesModal v-model:show="adjustVisible" :order="adjustTarget" :loading="busyId !== null" :server-error="adjustServerError" @submit="submitAdjust" />
		<RejectOrderModal v-model:show="rejectVisible" :order-id="rejectTarget?.id ?? null" :loading="busyId !== null" :server-error="rejectServerError" @submit="submitReject" />
	</div>
</template>

<script setup lang="ts">
import type { KitchenOrder, KitchenOrderStatus, KitchenStoreRow } from "@/add-os/modules/kitchen/types/kitchen"
import type { AcceptLine } from "@/add-os/services/kitchen"
import { NAlert, NButton, NCard, NTag, useMessage } from "naive-ui"
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import { useNewArrivalChime } from "@/add-os/composables/useNewArrivalChime"
import { canManageKitchenOrders, canUpdateKitchenStores, canViewKitchenStores } from "@/add-os/config/permissions"
import { useBranchOptions } from "@/add-os/modules/dashboard/composables/useBranchOptions"
import AcceptWithChangesModal from "@/add-os/modules/kitchen/components/AcceptWithChangesModal.vue"
import ChimeMuteButton from "@/add-os/modules/kitchen/components/ChimeMuteButton.vue"
import KitchenOrderCard from "@/add-os/modules/kitchen/components/KitchenOrderCard.vue"
import RejectOrderModal from "@/add-os/modules/kitchen/components/RejectOrderModal.vue"
import { useKitchenRealtime } from "@/add-os/modules/kitchen/composables/useKitchenRealtime"
import { ApiError } from "@/add-os/services/api"
import { acceptKitchenOrder, listKitchenOrders, listKitchenStores, markKitchenOrderDelivered, markKitchenOrderReady, rejectKitchenOrder } from "@/add-os/services/kitchen"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The kitchen's live queue for one branch: new, preparing and ready orders,
 * each column oldest first — the queue is worked from its head.
 *
 * Nothing on screen is changed in place. Every action, whether it worked or
 * not, ends by reading the board again: a second member of staff may have
 * handled the order first (409), or the store may be short (422), and in both
 * cases the server's list is the truth and its sentence is the explanation.
 */

const OPEN_STATUSES: KitchenOrderStatus[] = ["pending", "preparing", "ready"]
/** The API's ceiling; a branch kitchen with more open orders than this has a different problem. */
const BOARD_PAGE_SIZE = 100

const { t } = useI18n()
const message = useMessage()
const { defaultBranchId } = useBranchOptions()

const mayManage = canManageKitchenOrders()
const mayUpdateStores = canUpdateKitchenStores()

// ── Branch: the dashboard's default one (ADD Core resolves the same) ──────
const branchId = defaultBranchId

watch(branchId, () => void load())

// ── The kitchen store each branch draws from ───────────────────────────────
// Only readable with `kitchen-stores.view`; without it the board cannot tell,
// and simply shows the orders.
const stores = ref<KitchenStoreRow[]>([])

async function loadStores() {
	if (!canViewKitchenStores()) return
	try {
		stores.value = await listKitchenStores()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		stores.value = []
	}
}

const missingStore = computed(() => stores.value.find(row => row.branch.id === branchId.value && row.warehouse === null) ?? null)

// ── Orders ──────────────────────────────────────────────────────────────────
const orders = ref<KitchenOrder[]>([])
const isLoading = ref(false)
const loadError = ref(false)
const fetchedAt = ref(Date.now())
const now = ref(Date.now())
// A chime when an order the board has not shown arrives; moving between columns is not an arrival.
const chime = useNewArrivalChime(orders)
// Another branch's orders are not arrivals.
watch(branchId, () => chime.rebase(), { flush: "sync" })

async function load() {
	const id = branchId.value
	if (id === null) return
	isLoading.value = true
	try {
		const page = await listKitchenOrders({ branch_id: id, status: OPEN_STATUSES, per_page: BOARD_PAGE_SIZE })
		if (branchId.value !== id) return
		orders.value = page.data
		fetchedAt.value = Date.now()
		now.value = fetchedAt.value
		loadError.value = false
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		loadError.value = true
	} finally {
		isLoading.value = false
	}
}

function submittedAt(order: KitchenOrder): number {
	return order.timestamps.submitted_at ? new Date(order.timestamps.submitted_at).getTime() : 0
}

const columns = computed(() =>
	OPEN_STATUSES.map(status => ({
		status,
		orders: orders.value.filter(order => order.status === status).sort((a, b) => submittedAt(a) - submittedAt(b) || a.id - b.id)
	}))
)

useKitchenRealtime(load)

// The waited time moves once a minute.
let ticker: ReturnType<typeof setInterval> | undefined
onMounted(() => {
	void loadStores()
	if (branchId.value !== null) void load()
	ticker = setInterval(() => (now.value = Date.now()), 60_000)
})
onBeforeUnmount(() => clearInterval(ticker))

// ── Actions ─────────────────────────────────────────────────────────────────
const busyId = ref<number | null>(null)

/**
 * Runs one action; true when it worked. Either way the board is read again.
 * `onReasonError` takes a 422 on `reason` (rejecting); `onUnprocessable`
 * any 422 at all — its first field error, else its message (accepting with
 * changes, whose dialog shows it).
 */
async function run(order: KitchenOrder, action: () => Promise<unknown>, success: string, onReasonError?: (text: string) => void, onUnprocessable?: (text: string) => void): Promise<boolean> {
	busyId.value = order.id
	try {
		await action()
		message.success(success)
		return true
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		const reasonError = caught.status === 422 ? caught.data?.errors?.reason?.[0] : undefined
		const unprocessable = caught.status === 422 ? (Object.values(caught.data?.errors ?? {})[0]?.[0] ?? caught.data?.message) : undefined
		if (reasonError && onReasonError) onReasonError(reasonError)
		else if (unprocessable && onUnprocessable) onUnprocessable(unprocessable)
		else if (caught.status === 403) message.error(t("resourceCrud.mutations.permissionError"))
		else message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		return false
	} finally {
		try {
			await load()
		} finally {
			busyId.value = null
		}
	}
}

function accept(order: KitchenOrder) {
	return run(order, () => acceptKitchenOrder(order.id), t("kitchen.success.accept"))
}

const adjustVisible = ref(false)
const adjustTarget = ref<KitchenOrder | null>(null)
const adjustServerError = ref<string | null>(null)

function openAdjust(order: KitchenOrder) {
	adjustTarget.value = order
	adjustServerError.value = null
	adjustVisible.value = true
}

/** No line changed: the order is accepted as it is. */
async function submitAdjust(lines: AcceptLine[]) {
	const order = adjustTarget.value
	if (order === null) return
	adjustServerError.value = null
	const worked = await run(
		order,
		() => acceptKitchenOrder(order.id, lines),
		t(lines.length > 0 ? "kitchen.success.acceptAdjusted" : "kitchen.success.accept"),
		undefined,
		text => {
			adjustServerError.value = text
		}
	)
	// Refused for another reason (already handled): the board has reloaded, nothing is left to accept.
	if (worked || adjustServerError.value === null) adjustVisible.value = false
}

function ready(order: KitchenOrder) {
	return run(order, () => markKitchenOrderReady(order.id), t("kitchen.success.ready"))
}

function deliver(order: KitchenOrder) {
	return run(order, () => markKitchenOrderDelivered(order.id), t("kitchen.success.deliver"))
}

const rejectVisible = ref(false)
const rejectTarget = ref<KitchenOrder | null>(null)
const rejectServerError = ref<string | null>(null)

function openReject(order: KitchenOrder) {
	rejectTarget.value = order
	rejectServerError.value = null
	rejectVisible.value = true
}

async function submitReject(reason: string) {
	const order = rejectTarget.value
	if (order === null) return
	rejectServerError.value = null
	const worked = await run(order, () => rejectKitchenOrder(order.id, reason), t("kitchen.success.reject"), text => {
		rejectServerError.value = text
	})
	// Refused for another reason (already handled): the board has reloaded, nothing is left to reject.
	if (worked || rejectServerError.value === null) rejectVisible.value = false
}

defineExpose({ columns, branchId, load })
</script>
