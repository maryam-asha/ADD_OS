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
			<n-data-table v-if="rows.length > 0 || isLoading" :columns :data="rows" :loading="isLoading" :bordered="false" :row-key />
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
					<n-date-picker v-model:value="checkOutForm.checked_out_at" type="datetime" :is-date-disabled="isFutureDate" class="w-full" />
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
			<n-form :model="extendForm" label-placement="top">
				<n-form-item
					path="additional_minutes"
					:label="t('activeSessions.extend.minutesLabel')"
					:feedback="extendFieldErrors.additional_minutes?.[0]"
					:validation-status="extendFieldErrors.additional_minutes ? 'error' : undefined"
				>
					<n-input-number v-model:value="extendForm.additional_minutes" :min="1" :precision="0" class="w-full" />
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="extendModalVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="action.isSubmitting.value" @click="submitExtend">
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
import type { ActiveSession } from "@/add-os/modules/booking/types/reception"
import type { PaymentMethod } from "@/add-os/modules/payments/types/wallet-top-up"
import {
	NAlert,
	NButton,
	NCard,
	NDataTable,
	NDatePicker,
	NForm,
	NFormItem,
	NInputNumber,
	NModal,
	NSelect,
	useDialog
} from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useReceptionAction } from "@/add-os/modules/booking/composables/useReceptionAction"
import { buildSessionColumns } from "@/add-os/modules/booking/config/active-sessions.config"
import { PAYMENT_METHODS } from "@/add-os/modules/payments/types/wallet-top-up"
import { cancelBooking, checkOutSession, extendBooking, listActiveSessions, settleSessionPayment } from "@/add-os/services/reception"
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

/**
 * What the extend dialog opens on. A starting value, not a rule — the server
 * accepts any integer >= 1 that still fits before closing time, and the
 * operator types over it. Half an hour is the shortest extension anyone asks
 * for in practice; opening on an empty field would make the common case slower
 * for no gain.
 */
const DEFAULT_EXTENSION_MINUTES = 30

const { data: rows, isLoading, error, refetch } = useResourceList<ActiveSession>(listActiveSessions)

const action = useReceptionAction(refetch)

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

const extendModalVisible = ref(false)
const extendTargetId = ref<number | null>(null)
const extendForm = ref<{ additional_minutes: number | null }>({ additional_minutes: DEFAULT_EXTENSION_MINUTES })
const extendFieldErrors = ref<FieldErrors>({})

function openExtend(row: ActiveSession) {
	extendTargetId.value = row.id
	extendForm.value = { additional_minutes: DEFAULT_EXTENSION_MINUTES }
	extendFieldErrors.value = {}
	extendModalVisible.value = true
}

async function submitExtend() {
	const id = extendTargetId.value
	const minutes = extendForm.value.additional_minutes
	if (id === null) return

	if (minutes === null || !Number.isInteger(minutes) || minutes < 1) {
		extendFieldErrors.value = { additional_minutes: [t("activeSessions.extend.minutesInvalid")] }
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
	buildSessionColumns(t, { onCheckOut: openCheckOut, onExtend: openExtend, onCancel: confirmCancel })
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
	cancelSession
})
</script>
