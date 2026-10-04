<!-- src/add-os/modules/members/components/WalletTopUpDialog.vue -->
<template>
	<n-modal
		v-model:show="show"
		preset="card"
		:title="t('members.topUp.title')"
		closable
		class="rounded-2xl"
		style="max-width: 40rem"
	>
		<!--
			The same cards as the Wallet Top-up page — recipient and balance, one
			amount box with its currency and quick amounts, payment methods, and
			the balance before and after — so the desk sees one top-up form,
			wherever it opens it.
		-->
		<n-form v-if="member" ref="formRef" :model="form" :rules label-placement="top" class="flex flex-col gap-4">
			<!-- Recipient and current balance -->
			<div class="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 bg-stone-50/50">
				<div class="flex items-center gap-3">
					<n-avatar round :size="44" class="bg-emerald-700 text-white font-bold">{{ initials }}</n-avatar>
					<div class="flex flex-col gap-0.5">
						<span class="font-bold text-stone-900">{{ member.name }}</span>
						<bdi dir="ltr" class="text-xs text-stone-500 font-medium">{{ member.phone }}</bdi>
						<n-tag size="small" round :type="member.status === 'active' ? 'success' : 'error'" class="w-fit text-[10px] font-semibold">
							{{ member.status === "active" ? t("walletTopUps.active") : t("walletTopUps.inactive") }}
						</n-tag>
					</div>
				</div>
				<div class="flex flex-col items-end gap-1 text-xs">
					<span class="text-stone-500">{{ t("walletTopUps.generalBalance") }}</span>
					<span v-if="isLoadingBalance" class="text-stone-400 italic">{{ t("walletTopUps.loadingBalance") }}</span>
					<span v-else class="font-bold text-teal-700 text-base">{{ currentBalancePoints === null ? "—" : formatPoints(currentBalancePoints) }}</span>
				</div>
			</div>

			<!-- Amount: currency and digits in one box, the quote under it, quick amounts -->
			<div class="flex flex-col gap-3 p-3.5 rounded-xl border border-stone-200">
				<span class="text-sm font-bold text-stone-900">{{ t("members.topUp.amount") }}</span>
				<n-form-item path="amount" class="m-0 w-full" :show-label="false">
					<div class="flex items-center w-full border border-stone-200 rounded-xl bg-white shadow-2xs overflow-hidden focus-within:border-teal-600 focus-within:ring-1 focus-within:ring-teal-600 transition-all">
						<div class="w-32 shrink-0 bg-stone-50/70 border-e border-stone-200">
							<FormIsolatedSelect
								v-model:value="form.currency"
								:options="currencyOptions"
								:bordered="false"
								:consistent-menu-width="false"
								class="font-bold text-stone-700"
							/>
						</div>
						<n-input
							v-model:value="form.amount"
							:placeholder="t('members.topUp.amountPlaceholder')"
							inputmode="decimal"
							:bordered="false"
							class="flex-1 text-base font-bold min-w-0"
						/>
						<span class="text-xs font-bold text-stone-400 shrink-0 px-3 whitespace-nowrap">{{ formattedInputAmount }}</span>
					</div>
				</n-form-item>

				<!--
					The point value is always the server's answer, never computed
					here: the rate and its ceil-once rounding live in one place on
					the backend.
				-->
				<div class="min-h-5 text-xs">
					<span v-if="isPreviewLoading" class="text-stone-400 flex items-center gap-1">
						<n-spin :size="12" />
						{{ t("points.previewLoading") }}
					</span>
					<span v-else-if="previewError" class="text-red-600">{{ previewError }}</span>
					<span v-else-if="previewPoints !== null" class="font-bold text-teal-700 add-numeric">≈ {{ formatPoints(previewPoints) }}</span>
				</div>

				<div class="grid grid-cols-4 gap-2">
					<button
						v-for="preset in amountPresets"
						:key="preset"
						type="button"
						class="py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-teal-700 border-teal-200 bg-teal-50/50 hover:bg-teal-100 shadow-2xs cursor-pointer"
						@click="addPresetAmount(preset)"
					>
						+ {{ formatNumber(preset) }}
					</button>
				</div>
			</div>

			<!-- Payment method -->
			<div class="flex flex-col gap-2">
				<span class="text-sm font-bold text-stone-900">{{ t("members.topUp.paymentMethod") }}</span>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
					<div
						v-for="method in paymentMethodList"
						:key="method.id"
						class="flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer"
						:class="form.payment_method === method.id ? 'border-teal-700 bg-teal-50/40 shadow-sm ring-1 ring-teal-600' : 'border-stone-200 bg-white hover:border-stone-300'"
						@click="form.payment_method = method.id"
					>
						<div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" :class="method.iconBg">
							<Icon :name="method.icon" :size="20" />
						</div>
						<span class="font-bold text-stone-900 text-sm">{{ method.label }}</span>
					</div>
				</div>
			</div>

			<!-- The balance before and after -->
			<div class="flex flex-col gap-2 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30">
				<span class="text-xs font-bold text-stone-700 uppercase tracking-wider">{{ t("walletTopUps.walletPreview") }}</span>
				<div class="grid grid-cols-3 gap-2 items-center text-center text-xs">
					<div class="flex flex-col p-2 bg-white rounded-lg border border-emerald-100">
						<span class="text-stone-400 text-[11px]">{{ t("walletTopUps.currentGeneralBalance") }}</span>
						<span class="font-bold text-stone-800 text-sm mt-0.5">{{ currentBalancePoints === null ? "—" : formatPoints(currentBalancePoints) }}</span>
					</div>
					<div class="flex flex-col p-2 bg-emerald-100/50 rounded-lg border border-emerald-200">
						<span class="text-emerald-700 text-[11px] font-medium">{{ t("walletTopUps.topUpAmount") }}</span>
						<span class="font-extrabold text-emerald-800 text-sm mt-0.5">{{ previewPoints === null ? "—" : `+ ${formatPoints(previewPoints)}` }}</span>
						<span class="text-emerald-700/70 text-[10px] add-numeric">{{ formattedInputAmount }}</span>
					</div>
					<div class="flex flex-col p-2 bg-white rounded-lg border border-emerald-100">
						<span class="text-stone-400 text-[11px]">{{ t("walletTopUps.newGeneralBalance") }}</span>
						<span class="font-bold text-teal-800 text-sm mt-0.5">{{ newBalancePoints === null ? "—" : formatPoints(newBalancePoints) }}</span>
					</div>
				</div>
			</div>

			<n-form-item path="description" :label="t('members.topUp.description')" class="m-0">
				<n-input
					v-model:value="form.description"
					type="text"
					:placeholder="t('members.topUp.descriptionPlaceholder')"
					maxlength="255"
				/>
			</n-form-item>

			<div class="flex gap-2">
				<n-button class="h-12 rounded-xl" @click="show = false">{{ t("users.form.cancel") }}</n-button>
				<n-button type="primary" size="large" class="flex-1 h-12 rounded-xl text-base font-bold shadow-md" :loading="isSubmitting" @click="submitTopUp">
					<template #icon><Icon name="carbon:checkmark" :size="18" /></template>
					{{ t("members.topUp.submit") }}
				</n-button>
			</div>
		</n-form>
	</n-modal>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { Member } from "@/add-os/modules/members/types/member"
import type { PaymentMethod, WalletTopUpPayload } from "@/add-os/modules/payments/types/wallet-top-up"
import { NAvatar, NButton, NForm, NFormItem, NInput, NModal, NSelect, NSpin, NTag, useMessage } from "naive-ui"
import { getActivePinia } from "pinia"
import { computed, defineComponent, h, onBeforeUnmount, provide, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { usePoints } from "@/add-os/modules/payments/composables/usePoints"
import { ApiError } from "@/add-os/services/api"
import { createWalletTopUp, getWalletBalance, previewWalletTopUp } from "@/add-os/services/wallet-top-ups"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"
import { useCurrencyStore } from "@/stores/currency"

const props = defineProps<{ member: Member | null }>()
const emit = defineEmits<{ (e: "success"): void }>()
const show = defineModel<boolean>("show", { required: true })
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

/** The methods the desk takes, as the Wallet Top-up page shows them. */
const paymentMethodList = computed(() => [
	{ id: "cash" as PaymentMethod, label: t("walletTopUps.paymentMethod.cash"), icon: "carbon:money", iconBg: "bg-emerald-50 text-emerald-700" }
])

/**
 * A select that does not register with the surrounding form item, so the
 * currency inside the amount box is not validated as the amount — the same
 * isolation the Wallet Top-up page uses.
 */
const FormIsolatedSelect = defineComponent({
	name: "FormIsolatedSelect",
	setup(_props, { attrs, slots }) {
		provide("n-form-item", null)
		return () => h(NSelect, attrs, slots)
	}
})

const initials = computed(() =>
	(props.member?.name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase()
)

/** Quick amounts in the chosen currency — the page's own presets. */
const amountPresets = computed(() => (form.value.currency === "SYP" ? [500, 1000, 2500, 5000] : [10, 25, 50, 100]))

function addPresetAmount(value: number) {
	form.value.amount = String((Number(form.value.amount) || 0) + value)
}

const formattedInputAmount = computed(() => {
	const amount = Number(form.value.amount)
	return Number.isNaN(amount) || amount === 0 ? `0 ${form.value.currency}` : `${formatNumber(amount)} ${form.value.currency}`
})

/** The member's general balance in points, as the server reported it. */
const currentBalancePoints = ref<number | null>(null)
const isLoadingBalance = ref(false)

async function loadBalance() {
	if (!props.member) return
	isLoadingBalance.value = true
	try {
		currentBalancePoints.value = (await getWalletBalance({ user_id: props.member.id })).balance_points
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
		currentBalancePoints.value = null
	} finally {
		isLoadingBalance.value = false
	}
}

/** Two whole point counts the server produced, added — not a conversion. */
const newBalancePoints = computed(() => {
	if (currentBalancePoints.value === null) return null
	return previewPoints.value === null ? currentBalancePoints.value : currentBalancePoints.value + previewPoints.value
})

const rules = computed<FormRules>(() => ({
	amount: [
		{ required: true, message: t("walletTopUps.validation.amountFormat") || "Amount required", trigger: ["blur", "input"] },
		{
			validator: (_rule, value: string) => {
				const num = Number(value)
				return !Number.isNaN(num) && num > 0
			},
			message: t("walletTopUps.validation.amountFormat") || "Enter a valid positive amount",
			trigger: ["blur", "input"]
		}
	],
	payment_method: [
		{ required: true, message: "Payment method required", trigger: "change" }
	]
}))

// Whenever the dialog is shown, for whichever member: also when it mounts
// already open.
watch(() => [show.value, props.member?.id], () => {
	if (show.value) void loadBalance()
}, { immediate: true })

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
