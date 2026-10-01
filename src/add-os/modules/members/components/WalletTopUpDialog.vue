<!-- src/add-os/modules/members/components/WalletTopUpDialog.vue -->
<template>
	<n-modal
		v-model:show="show"
		preset="card"
		:title="t('members.topUp.title')"
		closable
		style="max-width: 28rem"
	>
		<div v-if="member" class="flex flex-col gap-4">
			<div class="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg flex items-center justify-between border border-black/5">
				<div class="flex flex-col">
					<span class="font-bold text-sm">{{ member.name }}</span>
					<span class="text-xs text-secondary font-mono">{{ member.phone }}</span>
				</div>
				<n-tag size="small" round type="info">
					{{ t("members.topUp.recipientMember") }}
				</n-tag>
			</div>

			<n-form ref="formRef" :model="form" :rules label-placement="top">
				<n-form-item path="amount" :label="t('members.topUp.amount')">
					<div class="flex flex-col w-full gap-1">
						<div class="flex items-center w-full gap-2">
							<n-input
								v-model:value="form.amount"
								:placeholder="t('members.topUp.amountPlaceholder')"
								inputmode="decimal"
								class="flex-1 font-bold"
							/>
							<n-select
								v-model:value="form.currency"
								:options="currencyOptions"
								class="w-28 shrink-0"
							/>
						</div>

						<!--
							The point value is always the server's answer, never computed
							here: the rate and its ceil-once rounding live in one place on
							the backend.
						-->
						<div class="min-h-5 text-xs">
							<span v-if="isPreviewLoading" class="text-secondary flex items-center gap-1">
								<n-spin :size="12" />
								{{ t("points.previewLoading") }}
							</span>
							<span v-else-if="previewError" class="text-error">{{ previewError }}</span>
							<span v-else-if="previewPoints !== null" class="font-semibold add-numeric">
								≈ {{ formatPoints(previewPoints) }}
							</span>
						</div>
					</div>
				</n-form-item>

				<n-form-item path="payment_method" :label="t('members.topUp.paymentMethod')">
					<n-select
						v-model:value="form.payment_method"
						:options="paymentMethodOptions"
					/>
				</n-form-item>

				<n-form-item path="description" :label="t('members.topUp.description')">
					<n-input
						v-model:value="form.description"
						type="text"
						:placeholder="t('members.topUp.descriptionPlaceholder')"
						maxlength="255"
					/>
				</n-form-item>
			</n-form>

			<div class="flex justify-end gap-2 pt-2">
				<n-button @click="show = false">{{ t("users.form.cancel") }}</n-button>
				<n-button type="primary" :loading="isSubmitting" @click="submitTopUp">
					<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
					{{ t("members.topUp.submit") }}
				</n-button>
			</div>
		</div>
	</n-modal>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { Member } from "@/add-os/modules/members/types/member"
import type { PaymentMethod, WalletTopUpPayload } from "@/add-os/modules/payments/types/wallet-top-up"
import { NButton, NForm, NFormItem, NInput, NModal, NSelect, NSpin, NTag, useMessage } from "naive-ui"
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { usePoints } from "@/add-os/modules/payments/composables/usePoints"
import { createWalletTopUp, previewWalletTopUp } from "@/add-os/services/wallet-top-ups"
import { ApiError } from "@/add-os/services/api"
import { useCurrencyStore } from "@/stores/currency"
import { getActivePinia } from "pinia"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{ member: Member | null }>()
const show = defineModel<boolean>("show", { required: true })
const emit = defineEmits<{ (e: "success"): void }>()

const { t } = useI18n()
const message = useMessage()
const { formatPoints } = usePoints()
const currencyStore = getActivePinia() ? useCurrencyStore() : null

const formRef = ref<FormInst | null>(null)
const isSubmitting = ref(false)

const form = ref({
	amount: "",
	currency: currencyStore?.currency || "SYP",
	payment_method: "cash" as PaymentMethod,
	description: ""
})

const PREVIEW_DEBOUNCE_MS = 300

/** Points the current amount would buy, as quoted by the server. */
const previewPoints = ref<number | null>(null)
const isPreviewLoading = ref(false)
/** Set when the server refused to quote — most importantly the below-one-point 422. */
const previewError = ref<string | null>(null)

let previewTimer: ReturnType<typeof setTimeout> | null = null
/**
 * Monotonic token for the newest preview the UI is willing to display.
 *
 * Every response compares the id it was issued with against this and discards
 * itself unless it is still the newest: a slow answer for "500" must never
 * overwrite a fresh one for "5000". `nextPreviewId()` is the only writer, so
 * superseding a request and issuing one are the same single step — there is
 * no window where two live requests share an id.
 */
let latestPreviewId = 0

function nextPreviewId(): number {
	latestPreviewId += 1
	return latestPreviewId
}

function cancelPendingPreview() {
	if (previewTimer !== null) {
		clearTimeout(previewTimer)
		previewTimer = null
	}
	// Invalidate anything already in flight as well as anything merely queued.
	nextPreviewId()
	isPreviewLoading.value = false
}

function resetPreview() {
	cancelPendingPreview()
	previewPoints.value = null
	previewError.value = null
}

async function runPreview(requestId: number) {
	if (!props.member) return

	try {
		const preview = await previewWalletTopUp({
			user_id: props.member.id,
			amount: form.value.amount.trim(),
			currency: form.value.currency,
			payment_method: form.value.payment_method
		})

		if (requestId !== latestPreviewId) return

		previewPoints.value = preview.points
		previewError.value = null
	} catch (e) {
		if (requestId !== latestPreviewId) return
		if (!(e instanceof ApiError)) throw e

		previewPoints.value = null
		// 422 is the meaningful case: the payment is too small to buy a whole
		// point. Show the server's own message when it sent one so the reason
		// is never reduced to a generic failure.
		previewError.value
			= e.status === 422
				? (e.data?.message ?? t("points.belowOnePoint"))
				: t("points.previewFailed")
	} finally {
		if (requestId === latestPreviewId) isPreviewLoading.value = false
	}
}

function schedulePreview() {
	cancelPendingPreview()

	const amount = form.value.amount.trim()
	const parsed = Number(amount)

	// Nothing to quote yet — stay silent rather than asking the server to
	// reject an empty or obviously invalid box while the operator is typing.
	if (!amount || Number.isNaN(parsed) || parsed <= 0) {
		previewPoints.value = null
		previewError.value = null
		return
	}

	// Claim the id now, so this request owns it for its whole life — from the
	// debounce window through to the response landing.
	const requestId = nextPreviewId()
	isPreviewLoading.value = true
	previewTimer = setTimeout(() => {
		previewTimer = null
		void runPreview(requestId)
	}, PREVIEW_DEBOUNCE_MS)
}

const DEFAULT_CURRENCIES = [
	{ code: "SYP", label: "SYP (ل.س)", value: "SYP" },
	{ code: "USD", label: "USD ($)", value: "USD" }
]

const currencyOptions = computed<SelectOption[]>(() => {
	if (currencyStore?.availableCurrencies?.length) {
		return currencyStore.availableCurrencies.map(c => ({
			label: `${c.code} (${c.symbol})`,
			value: c.code
		}))
	}
	return DEFAULT_CURRENCIES
})

const paymentMethodOptions = computed<SelectOption[]>(() => [
	{ label: t("walletTopUps.paymentMethod.cash") || "Cash", value: "cash" }
])

const rules = computed<FormRules>(() => ({
	amount: [
		{ required: true, message: t("walletTopUps.validation.amountFormat") || "Amount required", trigger: ["blur", "input"] },
		{
			validator: (_rule, value: string) => {
				const num = Number(value)
				return !isNaN(num) && num > 0
			},
			message: t("walletTopUps.validation.amountFormat") || "Enter a valid positive amount",
			trigger: ["blur", "input"]
		}
	],
	payment_method: [
		{ required: true, message: "Payment method required", trigger: "change" }
	]
}))

watch(show, visible => {
	if (visible) {
		form.value = {
			amount: "",
			currency: currencyStore?.currency || "SYP",
			payment_method: "cash",
			description: ""
		}
	}
	// Closing must drop an in-flight quote too, or reopening the dialog can
	// flash the previous member's point count against an empty amount.
	resetPreview()
})

// Currency is part of the quote, not just a label: the same digits buy a very
// different number of points in SYP than in USD.
watch(() => [form.value.amount, form.value.currency], schedulePreview)

onBeforeUnmount(cancelPendingPreview)

async function submitTopUp() {
	if (!props.member) return
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	isSubmitting.value = true
	const payload: WalletTopUpPayload = {
		user_id: props.member.id,
		amount: form.value.amount.trim(),
		currency: form.value.currency,
		payment_method: form.value.payment_method,
		description: form.value.description.trim() || null
	}

	try {
		const topUp = await createWalletTopUp(payload)
		// Report what was bought, not only that something happened: points
		// credited and the resulting balance are the figures the operator reads
		// back to the member, alongside the cash they actually took.
		message.success(
			`${t("members.topUp.success")} ${t("points.credited")}: ${formatPoints(topUp.points_credited)} · ${t("points.newBalance")}: ${formatPoints(topUp.new_balance_points)}`
		)
		show.value = false
		emit("success")
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
		// Same below-one-point rejection the preview surfaces — it can still
		// land here if the rate changed between quoting and submitting.
		message.error(
			e.status === 422 ? (e.data?.message ?? t("points.belowOnePoint")) : (e.data?.message ?? t("resourceCrud.mutations.genericError"))
		)
	} finally {
		isSubmitting.value = false
	}
}
</script>
