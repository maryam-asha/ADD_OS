<!-- src/add-os/modules/payments/components/CollectPaymentModal.vue -->
<template>
	<n-modal :show preset="card" :title="t('collectPayment.title')" class="max-w-lg" @update:show="emit('update:show', $event)">
		<n-spin :show="isLoading">
			<n-alert v-if="loadFailed" type="error" :bordered="false" :title="t('collectPayment.loadError')" />
			<n-alert v-else-if="!isLoading && items.length === 0" type="success" :bordered="false" :title="t('collectPayment.nothingOwed')" />

			<div v-else-if="items.length > 0" class="flex flex-col gap-4">
				<!-- Several owed items: the operator picks which one the money is for. -->
				<n-radio-group v-if="items.length > 1" v-model:value="selectedKey" :aria-label="t('collectPayment.itemLabel')">
					<div class="flex flex-col gap-2">
						<n-radio v-for="item in items" :key="keyOf(item)" :value="keyOf(item)">
							<span class="flex flex-wrap gap-x-2">
								<span class="font-medium">{{ itemTitle(item) }}</span>
								<bdi dir="ltr" class="add-numeric">{{ formatAmount(item.amount) }}</bdi>
							</span>
						</n-radio>
					</div>
				</n-radio-group>

				<div v-if="selected" class="flex flex-col gap-1 rounded-xl border border-[var(--add-border)] bg-[var(--add-surface-sunken)] p-3">
					<span class="text-sm text-[var(--add-text-secondary)]">{{ t("collectPayment.due", { title: itemTitle(selected) }) }}</span>
					<bdi dir="ltr" class="text-lg font-extrabold add-numeric">{{ formatAmount(selected.amount) }}</bdi>
					<span class="text-xs text-[var(--add-text-muted)]">{{ t("collectPayment.duePoints", { points: formatNumber(selected.amount_points) }) }}</span>
				</div>

				<n-form label-placement="top">
					<n-form-item
						:label="t('collectPayment.received')"
						:feedback="fieldErrors.amount?.[0] ?? fieldErrors.currency?.[0] ?? shortageMessage ?? undefined"
						:validation-status="fieldErrors.amount || fieldErrors.currency || shortageMessage ? 'error' : undefined"
					>
						<div class="flex w-full gap-2">
							<n-select v-model:value="currency" :options="currencyOptions" class="w-36 shrink-0" :aria-label="t('collectPayment.currency')" />
							<n-input v-model:value="amount" :input-props="{ inputmode: 'decimal', dir: 'ltr' }" :placeholder="t('collectPayment.amountPlaceholder')" class="flex-1" />
						</div>
					</n-form-item>
				</n-form>

				<p class="text-xs text-[var(--add-text-muted)]">{{ t("collectPayment.changeNote") }}</p>
			</div>
		</n-spin>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="emit('update:show', false)">{{ t("resourceCrud.form.cancel") }}</n-button>
				<n-button type="primary" :disabled="!selected || !amountIsValid" :loading="isSubmitting" @click="submit">
					{{ t("collectPayment.submit") }}
				</n-button>
			</div>
		</template>
	</n-modal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { OutstandingItem, OutstandingPurpose, SettleAtReceptionResult } from "@/add-os/modules/booking/types/reception"
import { NAlert, NButton, NForm, NFormItem, NInput, NModal, NRadio, NRadioGroup, NSelect, NSpin, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import { getOutstanding, settleAtReception } from "@/add-os/services/reception"
import { formatCurrency, formatDateTime, formatNumber, isCurrencyCode } from "@/add-os/utils/format"
import { useCurrencyStore } from "@/stores/currency"

/**
 * The desk takes money for something a member owes, recorded as it was handed
 * over: the amount and the currency the member actually paid in
 * (`POST reception/payments/settle`). The server converts it at the current
 * rate, refuses too little with the shortage, and keeps anything over as
 * points in the member's wallet.
 *
 * What is owed comes from `reception/outstanding`, re-read in the chosen
 * currency, so the figure shown is the server's own arithmetic. `focus` limits
 * the dialog to one item — the session just checked out; without it every
 * owed item is offered.
 */

const props = defineProps<{
	show: boolean
	userId: number | null
	focus?: { purpose: OutstandingPurpose, id: number } | null
}>()

const emit = defineEmits<{
	"update:show": [value: boolean]
	settled: [result: SettleAtReceptionResult]
}>()

const { t } = useI18n()
const message = useMessage()
const currencyStore = useCurrencyStore()

const allItems = ref<OutstandingItem[]>([])
const isLoading = ref(false)
const loadFailed = ref(false)
const isSubmitting = ref(false)
const selectedKey = ref<string | null>(null)
const currency = ref<string>(currencyStore.currency)
const amount = ref("")
const fieldErrors = ref<Record<string, string[]>>({})
const shortage = ref<{ shortage: string, currency: string } | null>(null)

function keyOf(item: OutstandingItem): string {
	return `${item.purpose}-${item.payable_id ?? item.payment_id}`
}

const items = computed(() => {
	const focus = props.focus
	return focus ? allItems.value.filter(item => keyOf(item) === `${focus.purpose}-${focus.id}`) : allItems.value
})

const selected = computed(() => items.value.find(item => keyOf(item) === selectedKey.value) ?? null)

const currencyOptions = computed<SelectOption[]>(() =>
	currencyStore.availableCurrencies.map(c => ({ label: `${c.code} (${c.symbol})`, value: c.code }))
)

const amountIsValid = computed(() => /^\d+(?:\.\d{1,6})?$/.test(amount.value.trim()) && Number(amount.value) > 0)

const shortageMessage = computed(() =>
	shortage.value ? t("collectPayment.short", { amount: formatAmount({ value: shortage.value.shortage, currency: shortage.value.currency }) }) : null
)

function formatAmount(value: { value: string, currency: string }): string {
	const fractionDigits = value.value.split(".")[1]?.length ?? 0
	return formatCurrency(value.value, isCurrencyCode(value.currency) ? { currency: value.currency, fractionDigits } : { fractionDigits })
}

function itemTitle(item: OutstandingItem): string {
	const kind = t(`collectPayment.purpose.${item.purpose}`)
	const name = item.title ? `${kind} — ${item.title}` : kind
	return item.starts_at ? `${name} · ${formatDateTime(item.starts_at)}` : name
}

/** Re-reads what is owed in the chosen currency, and starts the amount at exactly that. */
async function load(): Promise<void> {
	if (props.userId === null) return

	isLoading.value = true
	loadFailed.value = false
	try {
		const summary = await getOutstanding(props.userId, currency.value)
		allItems.value = summary.items
		if (!items.value.some(item => keyOf(item) === selectedKey.value)) {
			selectedKey.value = items.value[0] ? keyOf(items.value[0]) : null
		}
		amount.value = selected.value?.amount.value ?? ""
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		loadFailed.value = true
	} finally {
		isLoading.value = false
	}
}

watch(() => props.show, async (open) => {
	if (!open) return
	allItems.value = []
	selectedKey.value = null
	fieldErrors.value = {}
	shortage.value = null
	await currencyStore.fetchCurrencies()
	currency.value = currencyStore.currency
	await load()
})

watch(currency, () => {
	if (!props.show) return
	fieldErrors.value = {}
	shortage.value = null
	void load()
})

watch(selectedKey, () => {
	shortage.value = null
	amount.value = selected.value?.amount.value ?? ""
})

watch(amount, () => {
	shortage.value = null
	fieldErrors.value = {}
})

async function submit(): Promise<void> {
	const item = selected.value
	if (!item || !amountIsValid.value) return

	isSubmitting.value = true
	fieldErrors.value = {}
	shortage.value = null
	try {
		const result = await settleAtReception({
			purpose: item.purpose,
			...(item.purpose === "plan_purchase" ? { payment_id: item.payment_id } : { payable_id: item.payable_id }),
			collected_via: "cash",
			amount: amount.value.trim(),
			currency: currency.value
		})

		message.success(result.change_points > 0
			? t("collectPayment.successWithChange", { points: formatNumber(result.change_points) })
			: t("collectPayment.success"))
		emit("settled", result)

		if (props.focus) {
			emit("update:show", false)
		} else {
			await load()
			if (items.value.length === 0) emit("update:show", false)
		}
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught

		const data = caught.data as { message?: string, errors?: Record<string, string[]>, shortage?: string, currency?: string } | undefined
		if (caught.status === 422 && data?.shortage && data.currency) {
			shortage.value = { shortage: data.shortage, currency: data.currency }
		} else if (caught.status === 422 && data?.errors) {
			fieldErrors.value = data.errors
		} else if (caught.status === 403) {
			message.error(t("resourceCrud.mutations.permissionError"))
		} else {
			message.error(data?.message ?? t("resourceCrud.mutations.genericError"))
			// Paid elsewhere meanwhile, or no longer owed: show what is.
			if (caught.status === 409) await load()
		}
	} finally {
		isSubmitting.value = false
	}
}

defineExpose({ items, selected, currency, amount, shortage, fieldErrors, submit, load })
</script>
