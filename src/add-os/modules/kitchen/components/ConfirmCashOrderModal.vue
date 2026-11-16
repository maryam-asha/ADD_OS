<!-- src/add-os/modules/kitchen/components/ConfirmCashOrderModal.vue -->
<template>
	<n-modal v-model:show="show" preset="card" :title="t('kitchen.confirmCash.title', { id: orderLabel })" class="max-w-md">
		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-1 rounded-xl border border-[var(--add-border)] bg-[var(--add-surface-sunken)] p-3">
				<span class="text-sm text-[var(--add-text-secondary)]">{{ t("kitchen.confirmCash.due") }}</span>
				<bdi v-if="dueAmount" dir="ltr" class="text-lg font-extrabold add-numeric" data-test="cash-due-amount">{{ formatMoneyAmount(dueAmount) }}</bdi>
				<bdi dir="ltr" :class="dueAmount ? 'text-sm text-[var(--add-text-secondary)] add-numeric' : 'text-lg font-extrabold add-numeric'" data-test="cash-due">{{ t("kitchen.confirmCash.duePoints", { points: duePoints }) }}</bdi>
			</div>
			<n-alert v-if="currency && !dueAmount && order?.cash_due_amounts" type="warning" :bordered="false" data-test="no-rate">{{ t("kitchen.confirmCash.noRate", { currency }) }}</n-alert>

			<n-form-item :label="t('kitchen.confirmCash.currency')" :show-feedback="false">
				<div class="w-full" data-test="cash-currency">
					<n-select v-model:value="currency" :options="currencyOptions" :aria-label="t('kitchen.confirmCash.currency')" />
				</div>
			</n-form-item>

			<p class="text-xs text-[var(--add-text-muted)]">{{ t("kitchen.confirmCash.note") }}</p>
			<n-alert v-if="currenciesFailed" type="warning" :bordered="false" data-test="currencies-failed">{{ t("kitchen.confirmCash.currenciesFailed") }}</n-alert>
			<n-alert v-if="serverError" type="error" :bordered="false" data-test="confirm-cash-error">{{ serverError }}</n-alert>
		</div>
		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("resourceCrud.form.cancel") }}</n-button>
				<n-button type="primary" :loading :disabled="!currency || (!dueAmount && !!order?.cash_due_amounts)" data-test="confirm-cash-submit" @click="submit">{{ t("kitchen.confirmCash.submit") }}</n-button>
			</div>
		</template>
	</n-modal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { KitchenOrder } from "@/add-os/modules/kitchen/types/kitchen"
import { NAlert, NButton, NFormItem, NModal, NSelect } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { formatMoneyAmount, formatNumber } from "@/add-os/utils/format"
import { useCurrencyStore } from "@/stores/currency"

/**
 * Reception confirms a cash order once the cash is in hand. There is no amount
 * to type: the desk takes exactly what is due (the server works it out from
 * `cash_due_points` at the day's rate), and only chooses the currency it is
 * taken in — the base one unless the member pays in another. A refusal from the
 * server (no rate for that currency yet) comes back through `serverError` and
 * the dialog stays open.
 */
const props = defineProps<{
	order: KitchenOrder | null
	loading?: boolean
	serverError?: string | null
}>()
const emit = defineEmits<{ submit: [currency: string], changeCurrency: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const currencyStore = useCurrencyStore()
const currency = ref<string | null>(null)
const currenciesFailed = ref(false)

const orderLabel = computed(() => (props.order ? formatNumber(props.order.id, { grouping: false }) : ""))
const duePoints = computed(() => formatNumber(props.order?.cash_due_points ?? 0))
/** What to collect in the chosen currency; null when that currency has no rate yet. */
const dueAmount = computed(() => props.order?.cash_due_amounts?.find(amount => amount.currency === currency.value) ?? null)
const currencyOptions = computed<SelectOption[]>(() => currencyStore.availableCurrencies.map(c => ({ label: `${c.code} (${c.symbol})`, value: c.code })))

watch(show, async open => {
	if (!open) return
	currenciesFailed.value = false
	try {
		await currencyStore.fetchCurrencies()
	} catch {
		// The list the store already holds (the base one among it) is still usable.
		currenciesFailed.value = true
	}
	const base = currencyStore.availableCurrencies.find(c => c.is_base)
	currency.value = base?.code ?? currencyStore.currency
}, { immediate: true })

watch(currency, () => emit("changeCurrency"))

function submit() {
	if (currency.value) emit("submit", currency.value)
}
</script>
