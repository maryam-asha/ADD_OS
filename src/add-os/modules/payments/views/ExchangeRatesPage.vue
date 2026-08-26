<!-- src/add-os/modules/payments/views/ExchangeRatesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.exchangeRates") }}</h1>
		</div>

		<ExchangeRateSuggestionBanner :suggestion :dismissing="isDismissing" @accept="acceptSuggestion" @dismiss="dismissSuggestion" />

		<ResourceStatCards v-if="!error && !isLoading && latest.length > 0" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('exchangeRates.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("exchangeRates.create.button") }}
			</n-button>
		</div>

		<ResourceTable :columns :data :loading="isLoading" />

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:title="acceptingSuggestionId === null ? t('exchangeRates.create.title') : t('exchangeRates.suggestion.reviewTitle')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { Currency } from "@/add-os/modules/payments/types/currency"
import type { ExchangeRate, ExchangeRatePayload, ExchangeRateSuggestionResponse, PendingExchangeRateSuggestion } from "@/add-os/modules/payments/types/exchange-rate"
/**
 * `NAlert`/`NButton` are imported rather than assumed: this project registers no
 * naive-ui components globally and its Vite `Components()` plugin scans only
 * `src/components/cards`, so every other page under `modules/` imports the ones
 * it renders. This file (and `PlansPage`) did not — leaving `<n-alert>` and
 * `<n-button>` to resolve to unknown elements.
 */
import { NAlert, NButton, useMessage } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import ExchangeRateSuggestionBanner from "@/add-os/modules/payments/components/ExchangeRateSuggestionBanner.vue"
import {
	buildExchangeRateColumns,
	emptyExchangeRatePayload,
	exchangeRateFields,
	latestRatesByCurrency,
	SUGGESTION_CURRENCY_CODE,
	suggestionExchangeRatePayload
} from "@/add-os/modules/payments/config/exchange-rates.config"
import { ApiError } from "@/add-os/services/api"
import { listCurrencies } from "@/add-os/services/currencies"
import { createExchangeRate, dismissExchangeRateSuggestion, getExchangeRateSuggestion, listExchangeRates } from "@/add-os/services/exchange-rates"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()

const { data, isLoading, error, refetch } = useResourceList<ExchangeRate>(listExchangeRates)

/**
 * The second request this page now makes, and the reason it makes it: the
 * currency codes `POST /admin/exchange-rates` accepts are rows in the
 * admin-managed `currencies` table, not a literal set this file can name. See
 * the reversal note on `exchangeRateFields`.
 *
 * Its own failure is deliberately not surfaced as a page error — the rates
 * table is still perfectly readable without it. What an empty list costs is an
 * empty currency dropdown in the create form, which is the honest state.
 */
const { data: currencies } = useResourceList<Currency>(listCurrencies)

const latest = computed(() => latestRatesByCurrency(data.value))
const latestIds = computed(() => new Set(latest.value.map(rate => rate.id)))
const columns = computed(() => buildExchangeRateColumns(t, latestIds.value))

/**
 * One card per currency that has a rate, rather than the single hardcoded
 * "Latest USD → SYP" card this used to show.
 *
 * That card searched for `currency_code === "USD"` and can never match again:
 * USD is the base currency now, and the base never gets a row here. The value
 * shown is `rate_to_base` as stored — no client-side inversion into a
 * SYP-per-USD headline, because the one number this codebase must never compute
 * from the other is exactly that one.
 */
const statCards = computed<StatCard[]>(() =>
	latest.value.map(rate => ({
		label: t("exchangeRates.stats.latestFor", { code: rate.currency_code }),
		value: formatNumber(rate.rate_to_base)
	}))
)

/**
 * Exchange Rates has no update/delete endpoint (verification report) — those two
 * are never invoked, only present to satisfy useResourceMutations' shared shape.
 *
 * The refetch covers both lists: creating a rate changes the suggestion response
 * too, and not only when that create was an accept. `deviation_percent` is
 * measured against the currently effective rate, so any new rate moves it.
 */
const mutations = useResourceMutations(
	{
		create: createExchangeRate,
		update: () => Promise.reject(new Error("Exchange rates cannot be updated.")),
		remove: () => Promise.reject(new Error("Exchange rates cannot be deleted."))
	},
	async () => {
		await Promise.all([refetch(), refetchSuggestion()])
	},
	{
		createSuccess: t("exchangeRates.create.success"),
		updateSuccess: t("exchangeRates.create.success"),
		deleteSuccess: t("exchangeRates.create.success")
	}
)

const suggestion = ref<ExchangeRateSuggestionResponse | null>(null)

/**
 * Failure is swallowed to `null` on purpose: this endpoint is an advisory
 * extra, and a 403 for an operator whose role cannot see suggestions must not
 * turn the rates table — which they CAN see — into an error page. No banner is
 * the correct rendering of "no suggestion available to me", whatever the reason.
 */
async function refetchSuggestion() {
	try {
		suggestion.value = await getExchangeRateSuggestion()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		suggestion.value = null
	}
}

refetchSuggestion()

const drawerVisible = ref(false)
const form = ref<ExchangeRatePayload>(emptyExchangeRatePayload())

/**
 * The pending suggestion this drawer session is accepting, or `null` for a
 * manual entry. It is NOT a form field and never enters the model.
 *
 * `ResourceFormDrawer` submits `buildPayload(fields, model)`, which copies only
 * declared field keys — so a hidden key parked in the model would be silently
 * dropped, and adding a hidden field type to that shared component to carry one
 * page's id would be the workaround. It does not need one: the drawer hands its
 * payload to this page's own `submit`, which already owned a transform
 * (`effective_from` → an instant). Merging one more key there is the same seam,
 * not a new one.
 */
const acceptingSuggestionId = ref<number | null>(null)

const fields = computed(() =>
	exchangeRateFields(t, {
		currencies: currencies.value,
		/**
		 * Pinned to SYP for the whole accept session. The backend rejects a
		 * `suggestion_id` submitted against any other currency, so leaving the
		 * dropdown live here would only offer a way to invalidate the submission.
		 */
		lockedCurrencyCode: acceptingSuggestionId.value === null ? undefined : SUGGESTION_CURRENCY_CODE
	})
)

function openCreate() {
	acceptingSuggestionId.value = null
	form.value = emptyExchangeRatePayload(currencies.value)
	drawerVisible.value = true
}

/**
 * Accept is a review step, not an apply: it opens the same create form
 * pre-filled, and the admin still submits it. `rate_to_base` arrives as
 * `suggested_rate_to_base` verbatim and stays editable, which is the whole
 * point of reviewing rather than auto-applying.
 */
function acceptSuggestion(pending: PendingExchangeRateSuggestion) {
	acceptingSuggestionId.value = pending.id
	form.value = suggestionExchangeRatePayload(pending)
	drawerVisible.value = true
}

const isDismissing = ref(false)

/** One click, no body, no confirm — dismissing is reversible by tomorrow's fetch. */
async function dismissSuggestion() {
	const id = suggestion.value?.id
	if (id === null || id === undefined) return

	isDismissing.value = true
	try {
		await dismissExchangeRateSuggestion(id)
		message.success(t("exchangeRates.suggestion.dismissed"))
		await refetchSuggestion()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (caught.status === 403) message.error(t("resourceCrud.mutations.permissionError"))
		else message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		/**
		 * A 422 here means the suggestion stopped being pending — someone else
		 * accepted or dismissed it. Refetching clears the banner, which is the
		 * outcome the click was asking for anyway.
		 */
		if (caught.status === 422) await refetchSuggestion()
	} finally {
		isDismissing.value = false
	}
}

/**
 * `suggestion_id` is merged here rather than being carried in the form model —
 * see `acceptingSuggestionId`. Without it the backend has no way to tell an
 * accept from a manual entry that happens to carry similar numbers: the
 * suggestion would stay `pending`, the new row would be stamped
 * `source = manual`, and the banner would still be there afterwards.
 *
 * It is cleared only after the create resolves, so a 422 leaves the drawer open
 * on a submission that is still an accept.
 */
async function submit(payload: Record<string, unknown>) {
	const effectiveFrom = String(payload.effective_from)
	const suggestionId = acceptingSuggestionId.value

	await mutations.create({
		...payload,
		effective_from: `${effectiveFrom}T00:00:00Z`,
		...(suggestionId === null ? {} : { suggestion_id: suggestionId })
	} as unknown as ExchangeRatePayload)

	acceptingSuggestionId.value = null
}

defineExpose({
	openCreate,
	acceptSuggestion,
	dismissSuggestion,
	refetchSuggestion,
	submit,
	form,
	fields,
	drawerVisible,
	acceptingSuggestionId,
	suggestion,
	data,
	currencies,
	statCards
})
</script>
