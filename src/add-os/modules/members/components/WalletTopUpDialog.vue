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
import { NButton, NForm, NFormItem, NInput, NModal, NSelect, NTag, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { createWalletTopUp } from "@/add-os/services/wallet-top-ups"
import { ApiError } from "@/add-os/services/api"
import { useCurrencyStore } from "@/stores/currency"
import { getActivePinia } from "pinia"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{ member: Member | null }>()
const show = defineModel<boolean>("show", { required: true })
const emit = defineEmits<{ (e: "success"): void }>()

const { t } = useI18n()
const message = useMessage()
const currencyStore = getActivePinia() ? useCurrencyStore() : null

const formRef = ref<FormInst | null>(null)
const isSubmitting = ref(false)

const form = ref({
	amount: "",
	currency: currencyStore?.currency || "SYP",
	payment_method: "cash" as PaymentMethod,
	description: ""
})

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
	{ label: t("walletTopUps.paymentMethod.cash") || "Cash", value: "cash" },
	{ label: t("walletTopUps.paymentMethod.syriatel") || "Syriatel Cash", value: "syriatel" },
	{ label: t("walletTopUps.paymentMethod.sham") || "Sham Cash", value: "sham" },
	{ label: t("walletTopUps.paymentMethod.mtn") || "MTN Cash", value: "mtn" }
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
})

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
		await createWalletTopUp(payload)
		message.success(t("members.topUp.success"))
		show.value = false
		emit("success")
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
		message.error(e.data?.message ?? t("resourceCrud.mutations.genericError"))
	} finally {
		isSubmitting.value = false
	}
}
</script>
