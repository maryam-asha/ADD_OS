<!-- src/add-os/modules/members/components/WalletTopUpDialog.vue -->
<template>
	<n-modal
		v-model:show="show"
		preset="card"
		:title="t('members.topUp.title')"
		closable
		class="rounded-2xl border border-[var(--add-border)]/70 shadow-lg bg-[var(--add-surface-raised)]"
		style="width: min(34rem, 95vw)"
		content-style="max-height: 72vh; overflow-y: auto; padding-inline-end: 6px"
	>
		<!--
			The same cards as the Wallet Top-up page — recipient and balance, one
			points-or-cash box with its currency and quick adds, payment methods, and
			the balance before and after — so the desk sees one top-up form,
			wherever it opens it.
		-->
		<n-form v-if="member" ref="formRef" :model="form" :rules label-placement="top" class="flex flex-col gap-4">
			<!-- Recipient and current balance -->
			<div class="flex items-center justify-between p-3.5 rounded-xl border border-[var(--add-border)]/60 bg-[var(--add-surface)]/60">
				<div class="flex items-center gap-3">
					<n-avatar round :size="42" class="bg-[var(--add-brand-levant-deep-teal)] text-[var(--add-surface-raised)] font-bold text-sm">{{ initials }}</n-avatar>
					<div class="flex flex-col gap-0.5">
						<span class="font-bold text-[var(--add-brand-charcoal-backbone)]">{{ member.name }}</span>
						<bdi dir="ltr" class="text-xs text-[var(--add-text-muted)] font-medium">{{ member.phone }}</bdi>
						<n-tag size="small" round :type="member.status === 'active' ? 'success' : 'error'" :bordered="false" class="w-fit text-[10px] font-semibold">
							{{ member.status === "active" ? t("walletTopUps.active") : t("walletTopUps.inactive") }}
						</n-tag>
					</div>
				</div>
				<div class="flex flex-col items-end gap-1 text-xs">
					<span class="text-[var(--add-text-muted)]">{{ t("walletTopUps.generalBalance") }}</span>
					<span v-if="isLoadingBalance" class="text-[var(--add-text-muted)] italic">{{ t("walletTopUps.loadingBalance") }}</span>
					<span v-else class="font-bold font-numeric text-[var(--add-primary-text)] text-base">{{ currentBalancePoints === null ? "—" : formatPoints(currentBalancePoints) }}</span>
				</div>
			</div>

			<!--
				Points (default) or cash, in the chosen currency. useTopUpQuote derives
				the other figure here, instantly; the server re-checks it on submit.
			-->
			<div class="flex flex-col gap-3 p-3.5 rounded-xl border border-[var(--add-border)]/60 bg-[var(--add-surface-raised)]">
				<div class="flex items-center justify-between gap-2">
					<span class="text-xs font-bold text-[var(--add-brand-charcoal-backbone)] uppercase tracking-wider">{{ t("members.topUp.amount") }}</span>
					<n-radio-group v-model:value="mode" size="small">
						<n-radio-button value="points">{{ t("points.entryMode.points") }}</n-radio-button>
						<n-radio-button value="amount">{{ t("points.entryMode.amount") }}</n-radio-button>
					</n-radio-group>
				</div>

				<div class="flex items-center w-full border border-[var(--add-border)] rounded-xl bg-[var(--add-surface-raised)] shadow-2xs overflow-hidden focus-within:border-[var(--add-brand-smart-olive)] focus-within:ring-1 focus-within:ring-[var(--add-brand-smart-olive)] transition-all">
					<div class="w-32 shrink-0 bg-[var(--add-surface-sunken)]/60 border-e border-[var(--add-border)]">
						<FormIsolatedSelect
							v-model:value="form.currency"
							:options="currencyOptions"
							:bordered="false"
							:consistent-menu-width="false"
							class="font-bold text-[var(--add-brand-charcoal-backbone)]"
						/>
					</div>
					<n-input
						v-model:value="input"
						:placeholder="mode === 'points' ? t('points.pointsPlaceholder') : t('members.topUp.amountPlaceholder')"
						:input-props
						:bordered="false"
						class="flex-1 text-base font-bold font-numeric min-w-0"
					/>
					<span class="text-xs font-bold text-[var(--add-text-muted)] shrink-0 px-3 whitespace-nowrap">{{ mode === "points" ? t("points.unit") : form.currency }}</span>
				</div>

				<div class="min-h-5 flex flex-col gap-0.5 text-xs">
					<span v-if="errorMessage" class="text-[var(--add-danger-text)] font-medium">{{ errorMessage }}</span>
					<template v-else-if="summary">
						<span class="font-bold font-numeric text-[var(--add-primary-text)] add-numeric">{{ summary }}</span>
						<span v-if="note" class="text-[var(--add-text-muted)] add-numeric">{{ note }}</span>
					</template>
				</div>

				<div v-if="presets.length" class="grid grid-cols-4 gap-2">
					<button
						v-for="preset in presets"
						:key="preset"
						type="button"
						class="py-2 px-1.5 rounded-xl text-xs font-bold font-numeric border transition-all text-[var(--add-primary-text)] border-[var(--add-border)]/70 bg-[var(--add-surface-sunken)]/60 hover:bg-[var(--add-brand-smart-olive)]/15 hover:border-[var(--add-brand-smart-olive)] shadow-2xs cursor-pointer"
						@click="addPreset(preset)"
					>
						+ {{ formatNumber(preset) }}
					</button>
				</div>
			</div>

			<!-- Payment method -->
			<div class="flex flex-col gap-2">
				<span class="text-xs font-bold text-[var(--add-brand-charcoal-backbone)] uppercase tracking-wider">{{ t("members.topUp.paymentMethod") }}</span>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
					<div
						v-for="method in paymentMethodList"
						:key="method.id"
						class="flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer"
						:class="form.payment_method === method.id ? 'border-[var(--add-brand-smart-olive)] bg-[var(--add-brand-smart-olive)]/10 shadow-xs ring-1 ring-[var(--add-brand-smart-olive)]' : 'border-[var(--add-border)]/60 bg-[var(--add-surface-raised)] hover:border-[var(--add-border-strong)]'"
						@click="form.payment_method = method.id"
					>
						<div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" :class="method.iconBg">
							<Icon :name="method.icon" :size="18" />
						</div>
						<span class="font-bold text-[var(--add-brand-charcoal-backbone)] text-sm">{{ method.label }}</span>
					</div>
				</div>
			</div>

			<!-- The balance before and after preview -->
			<div class="flex flex-col gap-2 p-3.5 rounded-xl border border-[var(--add-border)]/60 bg-[var(--add-surface)]/60">
				<span class="text-xs font-bold text-[var(--add-text-muted)] uppercase tracking-wider">{{ t("walletTopUps.walletPreview") }}</span>
				<div class="grid grid-cols-3 gap-2 items-center text-center text-xs">
					<div class="flex flex-col p-2 bg-[var(--add-surface-raised)] rounded-lg border border-[var(--add-border)]/40 shadow-2xs">
						<span class="text-[var(--add-text-muted)] text-[11px]">{{ t("walletTopUps.currentGeneralBalance") }}</span>
						<span class="font-bold font-numeric text-[var(--add-brand-charcoal-backbone)] text-sm mt-0.5">{{ currentBalancePoints === null ? "—" : formatPoints(currentBalancePoints) }}</span>
					</div>
					<div class="flex flex-col p-2 bg-[var(--add-brand-smart-olive)]/12 rounded-lg border border-[var(--add-brand-smart-olive)]/30 shadow-2xs">
						<span class="text-[var(--add-primary-text)] text-[11px] font-semibold">{{ t("walletTopUps.topUpAmount") }}</span>
						<span class="font-bold font-numeric text-[var(--add-primary-text)] text-sm mt-0.5">{{ quote === null ? "—" : `+ ${formatPoints(quote.points)}` }}</span>
						<span class="text-[var(--add-text-muted)] text-[10px] font-numeric add-numeric">{{ collectText }}</span>
					</div>
					<div class="flex flex-col p-2 bg-[var(--add-surface-raised)] rounded-lg border border-[var(--add-border)]/40 shadow-2xs">
						<span class="text-[var(--add-text-muted)] text-[11px]">{{ t("walletTopUps.newGeneralBalance") }}</span>
						<span class="font-bold font-numeric text-[var(--add-brand-levant-deep-teal)] text-sm mt-0.5">{{ newBalancePoints === null ? "—" : formatPoints(newBalancePoints) }}</span>
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

			<!-- Action buttons -->
			<div class="flex gap-2.5 pt-1">
				<n-button class="h-11 px-4 rounded-xl" @click="show = false">{{ t("users.form.cancel") }}</n-button>
				<n-button type="primary" size="large" class="flex-1 h-11 rounded-xl text-sm font-bold shadow-sm" :loading="isSubmitting" :disabled="quote === null" @click="submitTopUp">
					<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
					{{ t("members.topUp.submit") }}
				</n-button>
			</div>
		</n-form>
	</n-modal>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { InputHTMLAttributes } from "vue"
import type { Member } from "@/add-os/modules/members/types/member"
import type { PaymentMethod, WalletTopUpPayload } from "@/add-os/modules/payments/types/wallet-top-up"
import { NAvatar, NButton, NForm, NFormItem, NInput, NModal, NRadioButton, NRadioGroup, NSelect, NTag, useMessage } from "naive-ui"
import { getActivePinia } from "pinia"
import { computed, defineComponent, h, provide, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { usePoints } from "@/add-os/modules/payments/composables/usePoints"
import { useTopUpQuote } from "@/add-os/modules/payments/composables/useTopUpQuote"
import { ApiError } from "@/add-os/services/api"
import { createWalletTopUp, getWalletBalance } from "@/add-os/services/wallet-top-ups"
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

function emptyForm() {
	return {
		currency: currencyStore?.currency || "SYP",
		payment_method: "cash" as PaymentMethod,
		description: ""
	}
}

const form = ref(emptyForm())

const {
	config: quoteConfig,
	mode,
	input,
	quote,
	errorMessage,
	summary,
	note,
	presets,
	addPreset,
	reset: resetQuote
} = useTopUpQuote(computed(() => form.value.currency))

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
	{ id: "cash" as PaymentMethod, label: t("walletTopUps.paymentMethod.cash"), icon: "carbon:money", iconBg: "bg-[var(--add-brand-smart-olive)]/15 text-[var(--add-primary-text)]" }
])

/**
 * A select that does not register with the surrounding form item, so the
 * currency inside the input box is not validated as part of it — the same
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

/** Numeric keypad hint for the box, and the hook the spec finds it by. */
const inputProps = computed(() => ({
	"data-testid": "top-up-input",
	"inputmode": mode.value === "points" ? "numeric" : "decimal"
}) as InputHTMLAttributes)

/** The cash under the points this top-up adds. */
const collectText = computed(() => `${quote.value === null ? "0" : formatNumber(quote.value.amount)} ${form.value.currency}`)

/** The member's general balance in points, as the server reported it. */
const currentBalancePoints = ref<number | null>(null)
const isLoadingBalance = ref(false)

/**
 * The balance read also carries the rates the quote converts with, which is
 * why it runs again after a stale-quote rejection.
 */
async function loadBalance() {
	if (!props.member) return
	isLoadingBalance.value = true
	try {
		const balance = await getWalletBalance({ user_id: props.member.id })
		currentBalancePoints.value = balance.balance_points
		quoteConfig.value = balance.top_up ?? null
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
		currentBalancePoints.value = null
		quoteConfig.value = null
	} finally {
		isLoadingBalance.value = false
	}
}

/** Two whole point counts, added — the quote already did the conversion. */
const newBalancePoints = computed(() => {
	if (currentBalancePoints.value === null) return null
	return quote.value === null ? currentBalancePoints.value : currentBalancePoints.value + quote.value.points
})

const rules = computed<FormRules>(() => ({
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
	if (visible) form.value = emptyForm()
	resetQuote()
})

async function submitTopUp() {
	if (!props.member || quote.value === null) return
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	isSubmitting.value = true
	const payload: WalletTopUpPayload = {
		user_id: props.member.id,
		points: quote.value.points,
		amount: quote.value.amount,
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
		const pointsError = e.status === 422 ? e.data?.errors?.points?.[0] : undefined
		if (pointsError !== undefined) {
			// The rates moved after this dialog read them. Re-read them so the
			// figures update, and leave submitting to the operator: the member
			// has to agree to the new numbers first.
			message.error(pointsError)
			await loadBalance()
			return
		}
		message.error(e.data?.message ?? t("resourceCrud.mutations.genericError"))
	} finally {
		isSubmitting.value = false
	}
}
</script>
