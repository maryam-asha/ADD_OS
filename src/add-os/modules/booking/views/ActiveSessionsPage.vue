<!-- src/add-os/modules/booking/views/ActiveSessionsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.activeSessions") }}</h1>
			<p>{{ t("activeSessions.description") }}</p>
		</div>

		<n-alert v-if="error" type="error" :title="t('activeSessions.loadError')" />

		<div class="flex justify-end">
			<n-button :aria-label="t('activeSessions.refresh')" :loading="isLoading" @click="refetch">
				<template #icon><Icon name="carbon:renew" :size="16" /></template>
				{{ t("activeSessions.refresh") }}
			</n-button>
		</div>

		<n-card class="add-ledger-table">
			<n-data-table v-if="rows.length > 0 || isLoading" :columns :data="rows" :loading="isLoading" :bordered="false" :row-key size="small" :scroll-x="1050" />
			<div v-else-if="!error" class="py-10 text-center">{{ t("activeSessions.empty") }}</div>
		</n-card>

		<n-modal v-model:show="checkOutModalVisible" preset="card" :title="t('activeSessions.checkOut.title')" class="max-w-md">
			<n-form :model="checkOutForm" label-placement="top">
				<n-form-item
					path="checked_out_at"
					:label="t('activeSessions.checkOut.atLabel')"
					:feedback="checkOutFieldErrors.checked_out_at?.[0]"
					:validation-status="checkOutFieldErrors.checked_out_at ? 'error' : undefined"
				>
					<n-date-picker
						v-model:value="checkOutForm.checked_out_at"
						type="datetime"
						format="yyyy-MM-dd hh:mm a"
						:time-picker-props="{ use12Hours: true }"
						:is-date-disabled="isFutureDate"
						class="w-full"
					/>
				</n-form-item>

				<n-form-item path="payment_method" :label="t('activeSessions.checkOut.settleLabel')">
					<n-select
						v-model:value="checkOutForm.payment_method"
						:options="paymentMethodOptions"
						:placeholder="t('activeSessions.checkOut.settleNone')"
						clearable
					/>
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="checkOutModalVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="action.isSubmitting.value" @click="submitCheckOut">
						{{ t("activeSessions.checkOut.button") }}
					</n-button>
				</div>
			</template>
		</n-modal>

		<n-modal v-model:show="extendModalVisible" preset="card" :title="t('activeSessions.extend.title')" class="max-w-md">
			<n-spin :show="extendOptionsLoading">
				<n-alert v-if="extendOptionsError" type="error" :title="t('activeSessions.extend.loadError')" />
				<n-alert v-else-if="extendOptions && !extendOptions.can_extend" type="warning" :title="extendOptions.reason_label ?? ''" />
				<n-form v-else-if="extendOptions" :model="extendForm" label-placement="top">
					<n-form-item
						path="additional_minutes"
						:label="t('activeSessions.extend.optionLabel')"
						:feedback="extendFieldErrors.additional_minutes?.[0]"
						:validation-status="extendFieldErrors.additional_minutes ? 'error' : undefined"
					>
						<n-radio-group v-model:value="extendForm.additional_minutes" :aria-label="t('activeSessions.extend.optionPlaceholder')">
							<div class="flex flex-col gap-2">
								<n-radio v-for="option in extendOptions.options" :key="option.minutes" :value="option.minutes">
									{{ optionLabel(option) }}
								</n-radio>
							</div>
						</n-radio-group>
					</n-form-item>
					<p class="text-xs">{{ t("activeSessions.extend.latestDeparture", { time: formatTime(extendOptions.latest_end_at) }) }}</p>
				</n-form>
			</n-spin>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="extendModalVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button
						type="primary"
						:disabled="!extendOptions?.can_extend"
						:loading="action.isSubmitting.value"
						@click="submitExtend"
					>
						{{ t("activeSessions.extend.button") }}
					</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { FieldErrors } from "@/add-os/modules/booking/composables/useReceptionAction"
import type { ActiveSession, BookingExtensionOptions, ExtensionOption } from "@/add-os/modules/booking/types/reception"
import type { PaymentMethod } from "@/add-os/modules/payments/types/wallet-top-up"
import {
	NAlert,
	NButton,
	NCard,
	NDataTable,
	NDatePicker,
	NForm,
	NFormItem,
	NModal,
	NRadio,
	NRadioGroup,
	NSelect,
	NSpin,
	useDialog
} from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useReceptionAction } from "@/add-os/modules/booking/composables/useReceptionAction"
import { buildSessionColumns } from "@/add-os/modules/booking/config/active-sessions.config"
import { PAYMENT_METHODS } from "@/add-os/modules/payments/types/wallet-top-up"
import {
	cancelBooking,
	checkOutSession,
	extendBooking,
	getExtensionOptions,
	listActiveSessions,
	settleSessionPayment
} from "@/add-os/services/reception"
import { formatTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The live reception board — everyone checked in and not yet checked out,
 * bookings and walk-ins in one table.
 *
 * ── Refresh, not polling ────────────────────────────────────────────────────
 * There is a refresh button and no timer. A poll on a screen whose rows carry
 * destructive buttons is worse than a stale row: `n-data-table` re-renders on
 * new data, and an operator halfway through choosing an action would have the
 * row move under the cursor. Every action refetches on completion, so the board
 * is current after anything that changes it — which is when it matters.
 *
 * ── Settlement lives inside check-out ───────────────────────────────────────
 * Not a separate row button. The API refuses to settle a session that has not
 * been checked out ("This booking or session must be checked out before payment
 * can be settled."), and every row here is by definition still checked in, so a
 * standalone settle button could only ever return 422 — a control that is a
 * no-op in every case it is offered. Folded into the check-out dialog it fires
 * the instant it becomes legal, which is also the moment the operator is
 * taking the money.
 */

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const dialog = useDialog()
const router = useRouter()

const { data: rows, isLoading, error, refetch } = useResourceList<ActiveSession>(listActiveSessions)

const action = useReceptionAction(refetch)

/** The session's own page: live timer, bill so far, and its end request if any. */
function openDetails(row: ActiveSession): void {
	router.push({ name: "bookings.activeSessionDetail", params: { type: row.type, id: row.id } })
}

function rowKey(row: ActiveSession) {
	// Ids are unique per table, so a booking and a walk-in can share one.
	return `${row.type}-${row.id}`
}

const paymentMethodOptions = computed<SelectOption[]>(() =>
	// Reused from Wallet Top-Up rather than redeclared: same four wire values,
	// same four labels, one place to change them.
	PAYMENT_METHODS.map(method => ({ label: t(`walletTopUps.paymentMethod.${method}`), value: method }))
)

/* ── Check out ─────────────────────────────────────────────────────────────── */

const checkOutModalVisible = ref(false)
const checkOutTarget = ref<ActiveSession | null>(null)
const checkOutForm = ref<{ checked_out_at: number | null; payment_method: PaymentMethod | null }>({
	checked_out_at: null,
	payment_method: null
})
const checkOutFieldErrors = ref<FieldErrors>({})

/** Greys out tomorrow onward in the picker; the submit check below is the real rule. */
function isFutureDate(timestamp: number): boolean {
	const endOfToday = new Date()
	endOfToday.setHours(23, 59, 59, 999)
	return timestamp > endOfToday.getTime()
}

function openCheckOut(row: ActiveSession) {
	checkOutTarget.value = row
	checkOutForm.value = { checked_out_at: Date.now(), payment_method: null }
	checkOutFieldErrors.value = {}
	checkOutModalVisible.value = true
}

/**
 * Mirrors the server's `before_or_equal:now` so an obviously-wrong time never
 * leaves the browser. It cannot replace the server rule — the two clocks differ,
 * and "not after the branch's closing time" is a second rule this page has no
 * data to evaluate — so a 422 still comes back as a toast carrying the server's
 * own wording.
 *
 * Settlement runs as a second call, after check-out has actually succeeded.
 * Sequential rather than combined because the failure modes differ: if the
 * check-out fails, nothing happened and the dialog stays open for another try;
 * if the check-out succeeded and only the settlement failed, the session HAS
 * ended, and holding the dialog open would invite the operator to check out a
 * session that is already checked out. So the dialog closes and the failed
 * settlement is reported on its own.
 */
async function submitCheckOut() {
	const target = checkOutTarget.value
	const at = checkOutForm.value.checked_out_at
	if (!target || at === null) return

	if (at > Date.now()) {
		checkOutFieldErrors.value = { checked_out_at: [t("activeSessions.checkOut.futureNotAllowed")] }
		return
	}

	checkOutFieldErrors.value = {}
	const paymentMethod = checkOutForm.value.payment_method

	const checkedOut = await action.run(() => checkOutSession(target.type, target.id, new Date(at)), t("activeSessions.checkOut.success"))
	if (!checkedOut) return

	if (paymentMethod) {
		await action.run(() => settleSessionPayment(target.type, target.id, paymentMethod), t("activeSessions.checkOut.settleSuccess"))
	}

	checkOutModalVisible.value = false
}

/* ── Extend ────────────────────────────────────────────────────────────────── */

/*
 * The dialog offers the lengths the server says fit — `GET .../extension-options`
 * — instead of a free number of minutes.
 *
 * Changed 2026-10-03. It used to open on a typed field preset to 30 minutes, on
 * the reasoning that the server took any integer >= 1 that fitted before
 * closing. That stopped being true: an extension is now at least the minimum
 * booking length in steps of the space's granularity, stops at the next
 * booking's buffer and the branch's closing, and is refused outright on a
 * space that does not allow it or a booking that is not running (ADDCore
 * `docs/decisions/booking-outcomes-and-extension.md`). The 30-minute preset
 * would have been a 422 on every space. What was given up: an operator can no
 * longer type an arbitrary length — only pick one the server will accept, with
 * its price in view.
 */
const extendModalVisible = ref(false)
const extendTargetId = ref<number | null>(null)
const extendForm = ref<{ additional_minutes: number | null }>({ additional_minutes: null })
const extendFieldErrors = ref<FieldErrors>({})
const extendOptions = ref<BookingExtensionOptions | null>(null)
const extendOptionsLoading = ref(false)
const extendOptionsError = ref(false)

/** "2h — until 01:00 PM · 20 $": every part rendered by the server. */
function optionLabel(option: ExtensionOption): string {
	const price = option.price ?? option.price_point
	return price
		? t("activeSessions.extend.option", { duration: option.label, time: option.end_time, price })
		: t("activeSessions.extend.optionFree", { duration: option.label, time: option.end_time })
}

async function openExtend(row: ActiveSession) {
	extendTargetId.value = row.id
	extendForm.value = { additional_minutes: null }
	extendFieldErrors.value = {}
	extendOptions.value = null
	extendOptionsError.value = false
	extendModalVisible.value = true
	extendOptionsLoading.value = true

	try {
		const options = await getExtensionOptions(row.id)
		// An answer for a booking the operator has since left is dropped.
		if (extendTargetId.value !== row.id) return
		extendOptions.value = options
		// The shortest offered length, the commonest ask; the operator can pick another.
		extendForm.value.additional_minutes = options.options[0]?.minutes ?? null
	} catch {
		extendOptionsError.value = true
	} finally {
		extendOptionsLoading.value = false
	}
}

async function submitExtend() {
	const id = extendTargetId.value
	const minutes = extendForm.value.additional_minutes
	const offered = extendOptions.value
	if (id === null || !offered?.can_extend) return

	if (minutes === null || !offered.options.some(option => option.minutes === minutes)) {
		extendFieldErrors.value = { additional_minutes: [t("activeSessions.extend.chooseOption")] }
		return
	}

	extendFieldErrors.value = {}
	const succeeded = await action.run(() => extendBooking(id, minutes), t("activeSessions.extend.success"), errors => {
		extendFieldErrors.value = errors
	})

	if (succeeded) extendModalVisible.value = false
}

/* ── Cancel ────────────────────────────────────────────────────────────────── */

function confirmCancel(row: ActiveSession) {
	dialog.warning({
		title: t("activeSessions.cancel.confirmTitle"),
		content: t("activeSessions.cancel.confirmText"),
		positiveText: t("activeSessions.cancel.confirmOk"),
		negativeText: t("activeSessions.cancel.confirmCancel"),
		onPositiveClick: () => cancelSession(row)
	})
}

async function cancelSession(row: ActiveSession) {
	await action.run(() => cancelBooking(row.id), t("activeSessions.cancel.success"))
}

const columns = computed<DataTableColumns<ActiveSession>>(() =>
	buildSessionColumns(t, { onCheckOut: openCheckOut, onDetails: openDetails, onExtend: openExtend, onCancel: confirmCancel })
)

defineExpose({
	rows,
	refetch,
	openCheckOut,
	submitCheckOut,
	checkOutForm,
	checkOutFieldErrors,
	checkOutModalVisible,
	openExtend,
	submitExtend,
	extendForm,
	extendFieldErrors,
	extendModalVisible,
	extendOptions,
	cancelSession
})
</script>
