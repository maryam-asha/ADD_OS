<!-- src/add-os/modules/kiosk/views/ArrivalRequestsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.arrivalRequests") }}</h1>
			<p>{{ t("arrivalRequests.description") }}</p>
		</div>

		<n-alert v-if="error" type="error" :title="t('arrivalRequests.loadError')" />

		<n-card class="add-ledger-table">
			<n-data-table v-if="rows.length > 0 || isLoading" :columns :data="rows" :loading="isLoading" :bordered="false" :row-key />
			<div v-else-if="!error" class="py-10 text-center">{{ t("arrivalRequests.empty") }}</div>

			<div v-if="meta && meta.last_page > 1" class="mt-4 flex justify-end">
				<n-pagination v-model:page="page" :page-count="meta.last_page" :disabled="isLoading" />
			</div>
		</n-card>

		<ResourceFormDrawer
			v-model:show="spaceDrawerVisible"
			v-model:model="spaceForm"
			:fields="spaceFields"
			:title="t('arrivalRequests.confirm.spaceTitle')"
			:submitting="action.isSubmitting.value"
			:on-submit="submitConfirmWithSpace"
		/>
	</div>
</template>

<script setup lang="ts">
import type { ArrivalRequest } from "@/add-os/modules/kiosk/types/arrival-request"
import type { Space } from "@/add-os/modules/spatial/types/space"
import { NAlert, NCard, NDataTable, NPagination } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import { useNow } from "@/add-os/composables/useNow"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useReceptionAction } from "@/add-os/modules/booking/composables/useReceptionAction"
import {
	buildArrivalRequestColumns,
	buildConfirmSpaceFields,
	emptyConfirmSpaceForm
} from "@/add-os/modules/kiosk/config/arrival-requests.config"
import { confirmArrivalRequest, listArrivalRequests, rejectArrivalRequest } from "@/add-os/services/reception"
import { listSpaces } from "@/add-os/services/spaces"

/**
 * Members waiting at the reception desk.
 *
 * Structurally an `ApprovalQueuePage`: backend-paginated list, per-row actions,
 * and a refetch after every action rather than local row-splicing. The queue is
 * defined server-side as `status = pending`, so an actioned row leaves because
 * the next response no longer contains it — splicing here would draw the same
 * picture while letting the screen disagree with the server.
 *
 * What is different from that page is the confirm, which has two shapes.
 */

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const page = ref(1)
const { data: rows, isLoading, error, refetch, meta } = useResourceList<ArrivalRequest>(listArrivalRequests, undefined, page)

/**
 * Every space, loaded once, for the walk-in picker.
 *
 * Unfiltered on purpose — the backend only requires `exists:spaces,id`, so
 * narrowing by branch or building would impose a constraint the API does not.
 * Fetched on mount rather than when the drawer opens: the operator opening it
 * has someone standing in front of them, and a dropdown that is briefly empty
 * while it loads is a dropdown they will click twice.
 */
const { data: spaces } = useResourceList<Space>(() => listSpaces())

/** 30s is well under the granularity of "N minutes ago", so no tick is ever visibly skipped. */
const now = useNow(30_000)

const action = useReceptionAction(refetch)

function rowKey(row: ArrivalRequest) {
	return row.id
}

/**
 * Runs one command, then refetches if it did NOT succeed.
 *
 * `useReceptionAction` already refetches on success and already surfaces the
 * server's own message on failure — which matters most for the 409 raised when
 * someone else has already actioned the row, where that wording is the whole
 * explanation. What it does not do is refetch on failure, and a 409 means this
 * page's picture of the row is provably stale.
 *
 * This refetches on any failure rather than on 409 specifically. Distinguishing
 * them would mean threading a status code out of a composable that two other
 * screens depend on, to serve a decision this one can make from a boolean — and
 * refetching after a 5xx is harmless, since a failed action leaves the row's
 * true state unverified either way.
 */
async function runAndResync(command: () => Promise<unknown>, successMessage: string): Promise<boolean> {
	const succeeded = await action.run(command as () => Promise<{ message?: string }>, successMessage)
	if (!succeeded) await refetch()
	return succeeded
}

const spaceDrawerVisible = ref(false)
const confirmTargetId = ref<number | null>(null)
const spaceForm = ref(emptyConfirmSpaceForm())
const spaceFields = computed(() => buildConfirmSpaceFields(t, spaces.value))

/**
 * The branch this whole screen turns on.
 *
 * A matched row is checked into its own booking by the backend, so confirm
 * carries no body. An unmatched row is an ordinary walk-in and REQUIRES a
 * `space_id`; the operator picks where the member is starting. The picker is
 * shown only in that branch — asking which space to use for someone who already
 * has a booking would be asking a question with a known answer.
 */
async function confirm(row: ArrivalRequest) {
	if (row.matched_booking !== null) {
		await runAndResync(() => confirmArrivalRequest(row.id), t("arrivalRequests.confirm.success"))
		return
	}

	confirmTargetId.value = row.id
	// A fresh object, not a mutation: ResourceFormDrawer watches the model's
	// identity to clear the previous session's validation state and 422 feedback.
	spaceForm.value = emptyConfirmSpaceForm()
	spaceDrawerVisible.value = true
}

/**
 * Only reachable once the drawer's own required rule has passed, so `space_id`
 * is a real id by here. The `null` guard is a type narrowing, not a second
 * validation — the drawer is what prevents an empty submit.
 */
async function submitConfirmWithSpace(payload: Record<string, unknown>) {
	const id = confirmTargetId.value
	const spaceId = payload.space_id
	if (id === null || typeof spaceId !== "number") return

	const succeeded = await runAndResync(() => confirmArrivalRequest(id, spaceId), t("arrivalRequests.confirm.success"))
	if (succeeded) spaceDrawerVisible.value = false
}

/**
 * No confirmation dialog, deliberately. Rejecting an arrival signal is not
 * destructive: the request never charged anything and never reserved a space,
 * so there is nothing to undo and nothing to warn about. A confirm step here
 * would be ceremony that trains operators to click through dialogs.
 */
async function reject(row: ArrivalRequest) {
	await runAndResync(() => rejectArrivalRequest(row.id), t("arrivalRequests.reject.success"))
}

const columns = computed(() => buildArrivalRequestColumns(t, now.value, confirm, reject))

defineExpose({ confirm, reject, submitConfirmWithSpace, spaceForm, spaceFields, spaceDrawerVisible, confirmTargetId, page, rows, meta, spaces })
</script>
