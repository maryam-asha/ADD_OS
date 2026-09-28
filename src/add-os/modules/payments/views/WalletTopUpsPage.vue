<!-- src/add-os/modules/payments/views/WalletTopUpsPage.vue -->
<template>
	<div class="flex flex-col gap-6 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
		<!-- Top Bar Header -->
		<div class="flex items-center justify-between border-b border-stone-200/80 pb-4">
			<div class="flex items-center gap-3">
				<n-button circle secondary @click="router?.back?.()">
					<template #icon><Icon :name="backIcon" :size="18" /></template>
				</n-button>
				<div class="flex flex-col">
					<h1 class="text-2xl font-bold text-stone-900">{{ t("walletTopUps.title") }}</h1>
					<span class="text-xs text-amber-800 font-medium">{{ t("walletTopUps.receptionSubtitle") }}</span>
				</div>
			</div>
			<n-button circle secondary @click="handleOpenHistory">
				<template #icon><Icon name="carbon:time" :size="18" /></template>
			</n-button>
		</div>

		<n-alert v-if="loadError" type="error" :title="t('walletTopUps.loadError')" />

		<n-form ref="formRef" :model="form" :rules label-placement="top" class="w-full">
			<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
				<!-- Left Column: Recipient & Amount Details -->
				<div class="lg:col-span-7 flex flex-col gap-6">
					<!-- Recipient Type Switcher & Search Member/Company -->
					<n-card size="small" class="shadow-sm border border-stone-200">
						<div class="flex flex-col gap-4">
							<div class="flex items-center justify-between">
								<span class="text-sm font-bold text-stone-800">{{ t("walletTopUps.form.recipientType") }}</span>
								<n-radio-group v-model:value="recipientType" size="small">
									<n-radio-button value="user">{{ t("walletTopUps.recipientType.user") }}</n-radio-button>
									<n-radio-button value="company">{{ t("walletTopUps.recipientType.company") }}</n-radio-button>
								</n-radio-group>
							</div>

							<!-- Member Select / Search -->
							<n-form-item
								v-if="recipientType === 'user'"
								path="user_id"
								:label="t('walletTopUps.searchMember')"
								:feedback="fieldErrors.user_id?.[0]"
								:validation-status="fieldErrors.user_id ? 'error' : undefined"
								class="m-0"
							>
								<div class="flex items-center gap-2 w-full">
									<n-select
										v-model:value="form.user_id"
										:options="userOptions"
										:loading="isLoadingUsers"
										filterable
										clearable
										:placeholder="t('walletTopUps.searchMemberPlaceholder')"
										class="w-full"
									/>
									<n-button circle secondary class="shrink-0">
										<template #icon><Icon name="carbon:qr-code" :size="18" /></template>
									</n-button>
								</div>
							</n-form-item>

							<!-- Company Select / Search -->
							<n-form-item
								v-else
								path="company_id"
								:label="t('walletTopUps.searchCompany')"
								:feedback="fieldErrors.company_id?.[0]"
								:validation-status="fieldErrors.company_id ? 'error' : undefined"
								class="m-0"
							>
								<n-select
									v-model:value="form.company_id"
									:options="companyOptions"
									:loading="isLoadingCompanies"
									filterable
									clearable
									:placeholder="t('walletTopUps.searchCompanyPlaceholder')"
									class="w-full"
								/>
							</n-form-item>
						</div>
					</n-card>

					<!-- Inactive Company Warning -->
					<n-alert v-if="recipientType === 'company' && isSelectedCompanyInactive" type="error" :title="t('walletTopUps.companyInactiveWarning')" />

					<!-- Selected Recipient Profile Card -->
					<n-card size="small" class="shadow-sm border border-stone-200 bg-stone-50/50">
						<div v-if="hasRecipientSelected" class="flex flex-col gap-3">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3.5">
									<n-avatar round :size="48" class="bg-emerald-700 text-white font-bold text-base">
										{{ recipientInitials }}
									</n-avatar>
									<div class="flex flex-col gap-0.5">
										<span class="font-bold text-stone-900 text-base">{{ recipientDisplayName }}</span>
										<span class="text-xs text-stone-500 font-medium">{{ recipientSubtitle }}</span>
										<div class="flex items-center gap-2 mt-1">
											<n-tag
												:type="recipientStatus === 'active' ? 'success' : 'error'"
												size="small"
												round
												class="w-fit font-semibold text-[10px]"
											>
												{{ recipientStatus === 'active' ? t("walletTopUps.active") : t("walletTopUps.inactive") }}
											</n-tag>
											<span v-if="affiliatedCompanyName" class="text-[11px] text-stone-500">
												{{ t("walletTopUps.affiliation") }} <strong>{{ affiliatedCompanyName }}</strong>
											</span>
										</div>
									</div>
								</div>

								<div class="flex flex-col items-end gap-1 text-xs">
									<span class="text-stone-500">{{ t("walletTopUps.generalBalance") }}</span>
									<span v-if="isLoadingBalance" class="text-xs text-stone-400 italic">
										{{ t("walletTopUps.loadingBalance") }}
									</span>
									<span v-else class="font-bold text-teal-700 text-base">
										{{ formattedCurrentBalance }}
									</span>
								</div>
							</div>

							<!-- Member Belongs to Company: Scope Choice (Personal vs Company Wallet) -->
							<div v-if="recipientType === 'user' && userHasCompanies" class="border-t border-stone-200/80 pt-3 flex flex-col gap-2">
								<span class="text-xs font-bold text-stone-700">{{ t("walletTopUps.balanceScope") }}</span>
								<n-radio-group v-model:value="userBalanceScope" size="small" class="flex gap-4">
									<n-radio value="personal">{{ t("walletTopUps.personalBalance") }}</n-radio>
									<n-radio value="company">{{ t("walletTopUps.companyBalance") }}</n-radio>
								</n-radio-group>
							</div>
						</div>

						<!-- Placeholder when nothing selected -->
						<div v-else class="py-4 text-center text-sm text-stone-400 flex items-center justify-center gap-2">
							<Icon name="carbon:information" :size="18" />
							<span>{{ t("walletTopUps.selectRecipientFirst") }}</span>
						</div>
					</n-card>

							<!-- Top-up Amount Section & Preset Chips -->
							<n-card size="small" class="shadow-sm border border-stone-200">
								<div class="flex flex-col gap-3">
									<span class="text-sm font-bold text-stone-900">{{ t("walletTopUps.form.amount") }}</span>

									<!-- Unified Amount & Currency Input Box -->
									<n-form-item
										path="amount"
										:feedback="fieldErrors.amount?.[0]"
										:validation-status="fieldErrors.amount ? 'error' : undefined"
										class="m-0 w-full"
									>
										<div
											class="flex items-center w-full border border-stone-200 rounded-xl bg-white shadow-2xs overflow-hidden focus-within:border-teal-600 focus-within:ring-1 focus-within:ring-teal-600 transition-all"
										>
											<!-- Currency Selector (Small section, unified inside same box) -->
											<div class="w-32 sm:w-36 shrink-0 bg-stone-50/70 border-e border-stone-200">
												<FormIsolatedSelect
													v-model:value="selectedCurrency"
													:options="currencyOptions"
													:bordered="false"
													:consistent-menu-width="false"
													class="font-bold text-stone-700"
												/>
											</div>

											<!-- Price Input (Fills the rest of the unified box) -->
											<n-input
												v-model:value="form.amount"
												:placeholder="AMOUNT_PLACEHOLDER"
												inputmode="decimal"
												:bordered="false"
												class="flex-1 text-base font-bold min-w-0"
											/>

											<!-- Live Formatted Preview -->
											<span class="text-xs font-bold text-stone-400 shrink-0 px-3 whitespace-nowrap">{{ formattedInputAmount }}</span>
										</div>
									</n-form-item>

									<!--
										What this cash actually buys. Always the server's answer,
										never computed here: the rate and its ceil-once rounding
										live in one place on the backend.
									-->
									<div class="min-h-5 text-xs">
										<span v-if="isPreviewLoading" class="text-stone-400 flex items-center gap-1">
											<n-spin :size="12" />
											{{ t("points.previewLoading") }}
										</span>
										<span v-else-if="previewError" class="text-red-600">{{ previewError }}</span>
										<span v-else-if="previewPoints !== null" class="font-bold text-teal-700 add-numeric">
											≈ {{ formatPoints(previewPoints) }}
										</span>
									</div>

									<!-- Quick Preset Chips -->
									<div class="grid grid-cols-4 gap-2">
										<button
											v-for="preset in amountPresets"
											:key="preset"
											type="button"
											class="py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-teal-700 border-teal-200 bg-teal-50/50 hover:bg-teal-100 shadow-2xs cursor-pointer"
											@click="addPresetAmount(preset)"
										>
											+ {{ preset.toLocaleString() }}
										</button>
									</div>
								</div>
							</n-card>

							<!-- Optional Description / Notes -->
							<n-card size="small" class="shadow-sm border border-stone-200">
								<div class="flex flex-col gap-2">
									<span class="text-sm font-bold text-stone-900">{{ t("walletTopUps.form.description") }}</span>
									<n-input
										v-model:value="form.description"
										type="text"
										placeholder="Optional notes or receipt remark"
										maxlength="255"
									/>
								</div>
							</n-card>
						</div>

						<!-- Right Column: Payment Method, Summary Preview & Submission -->
						<div class="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-6">
							<!-- Payment Method Radio Cards -->
							<n-card size="small" class="shadow-sm border border-stone-200">
								<div class="flex flex-col gap-3">
									<span class="text-sm font-bold text-stone-900">{{ t("walletTopUps.form.paymentMethod") }}</span>

									<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
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
											<div class="flex flex-col text-xs">
												<span class="font-bold text-stone-900 text-sm">{{ method.label }}</span>
												<span class="text-stone-400 text-[11px]">{{ method.desc }}</span>
											</div>
										</div>
									</div>
								</div>
							</n-card>

							<!-- Wallet Preview Box -->
							<n-card size="small" class="shadow-sm border border-emerald-200 bg-emerald-50/30">
								<div class="flex flex-col gap-3">
									<span class="text-xs font-bold text-stone-700 uppercase tracking-wider">{{ t("walletTopUps.walletPreview") }}</span>
									<div class="grid grid-cols-3 gap-2 items-center text-center text-xs">
										<div class="flex flex-col p-2 bg-white rounded-lg border border-emerald-100">
											<span class="text-stone-400 text-[11px]">{{ t("walletTopUps.currentGeneralBalance") }}</span>
											<span class="font-bold text-stone-800 text-xs sm:text-sm mt-0.5">{{ formattedCurrentBalance }}</span>
										</div>
										<div class="flex flex-col p-2 bg-emerald-100/50 rounded-lg border border-emerald-200">
											<span class="text-emerald-700 text-[11px] font-medium">{{ t("walletTopUps.topUpAmount") }}</span>
											<!-- The points the server quoted, above the cash that buys them. -->
											<span class="font-extrabold text-emerald-800 text-xs sm:text-sm mt-0.5">
												{{ previewPoints === null ? "—" : `+ ${formatPoints(previewPoints)}` }}
											</span>
											<span class="text-emerald-700/70 text-[10px] add-numeric">{{ formattedInputAmount }}</span>
										</div>
										<div class="flex flex-col p-2 bg-white rounded-lg border border-emerald-100">
											<span class="text-stone-400 text-[11px]">{{ t("walletTopUps.newGeneralBalance") }}</span>
											<span class="font-bold text-teal-800 text-xs sm:text-sm mt-0.5">
												{{ calculatedNewBalancePoints === null ? "—" : formatPoints(calculatedNewBalancePoints) }}
											</span>
										</div>
									</div>
								</div>
							</n-card>

					<!-- Submit Button -->
					<n-button
						type="primary"
						size="large"
						block
						class="h-12 rounded-xl text-base font-bold shadow-md"
						:loading="isSubmitting"
						:disabled="isSelectedCompanyInactive || isSubmitting"
						@click="submit"
					>
						{{ t("walletTopUps.addCreditButton") }}
					</n-button>
				</div>
			</div>
		</n-form>

		<!-- Receipt Confirmation Modal (Shows on completion without navigating to a separate route) -->
		<n-modal
			v-model:show="receiptModalVisible"
			preset="card"
			class="max-w-lg w-full rounded-2xl shadow-xl overflow-hidden print:shadow-none print:m-0"
			:title="t('walletCredited.title')"
			:bordered="false"
			size="medium"
		>
			<div v-if="lastReceipt" class="flex flex-col gap-5">
				<!-- Hero Success Header -->
				<div class="flex flex-col items-center text-center p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
					<div class="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
						<Icon name="carbon:checkmark-filled" :size="32" />
					</div>
					<h2 class="text-lg font-bold text-stone-900">{{ t("walletCredited.heroTitle") }}</h2>
					<p class="text-xs text-stone-500 mt-0.5">{{ t("walletCredited.heroSubtitle") }}</p>
					<span class="text-[11px] font-mono font-semibold text-emerald-800 mt-2 px-2.5 py-0.5 bg-emerald-100/60 rounded-md">
						{{ lastReceipt.transaction_code || `TOP-${lastReceipt.id}` }}
					</span>
				</div>

				<!-- Receipt Details List -->
				<div class="flex flex-col gap-2.5 text-xs">
					<!--
						A receipt has to show both halves: what was paid, and what was
						bought. Points lead — they are what the wallet actually holds —
						with the cash tendered underneath.
					-->
					<div class="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-100">
						<span class="text-stone-500 font-medium">{{ t("points.credited") }}</span>
						<div class="flex flex-col items-end">
							<span class="text-base font-extrabold text-stone-900 add-numeric">
								{{ formatPoints(lastReceipt.points_credited) }}
							</span>
							<span class="text-[10px] text-stone-400 font-mono">
								{{ lastReceipt.payment_amount || lastReceipt.amount }} {{ lastReceipt.payment_currency || lastReceipt.currency || selectedCurrency }}
							</span>
						</div>
					</div>

					<!-- Recipient / Beneficiary -->
					<div v-if="lastReceipt.recipient_name" class="flex items-center justify-between py-2 border-b border-stone-100">
						<span class="text-stone-400">{{ t("walletTopUps.recipient") || "Beneficiary" }}</span>
						<span class="font-bold text-stone-800">{{ lastReceipt.recipient_name }}</span>
					</div>

					<!-- Payment Method -->
					<div class="flex items-center justify-between py-2 border-b border-stone-100">
						<span class="text-stone-400">{{ t("walletCredited.paymentMethod") }}</span>
						<span class="font-semibold text-stone-800 capitalize">{{ lastReceipt.payment_method }}</span>
					</div>

					<!-- Balances (Previous & New), in the unit the wallet is kept in. -->
					<div class="flex items-center justify-between py-2 border-b border-stone-100">
						<span class="text-stone-400">{{ t("walletCredited.newGeneralBalance") }}</span>
						<span class="font-bold text-teal-700 add-numeric">{{ formatPoints(lastReceipt.new_balance_points) }}</span>
					</div>

					<div class="flex items-center justify-between py-2 border-b border-stone-100">
						<span class="text-stone-400">{{ t("walletCredited.previousGeneralBalance") }}</span>
						<span class="text-stone-600 add-numeric">{{ formatPoints(lastReceipt.previous_balance_points) }}</span>
					</div>

					<!-- Date & Time -->
					<div class="flex items-center justify-between py-2 border-b border-stone-100">
						<span class="text-stone-400">{{ t("walletCredited.dateTime") }}</span>
						<span class="text-stone-600">{{ formatReceiptDate(lastReceipt.created_at) }}</span>
					</div>

					<!-- Performed By -->
					<div v-if="lastReceipt.performed_by_name" class="flex items-center justify-between py-2">
						<span class="text-stone-400">{{ t("walletCredited.creditedBy") }}</span>
						<span class="text-stone-600 font-medium">{{ lastReceipt.performed_by_name }}</span>
					</div>
				</div>

				<!-- Modal Actions -->
				<div class="flex items-center gap-3 pt-2 print:hidden">
					<n-button secondary class="flex-1 rounded-xl font-semibold" @click="handlePrintReceipt">
						<template #icon><Icon name="carbon:printer" :size="18" /></template>
						{{ t("walletCredited.printReceipt") }}
					</n-button>
					<n-button type="primary" class="flex-1 rounded-xl font-bold" @click="closeReceiptModal">
						{{ t("walletCredited.newTopUp") }}
					</n-button>
				</div>
			</div>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { PaymentMethod, WalletBalanceResponse, WalletTopUp, WalletTopUpPayload } from "@/add-os/modules/payments/types/wallet-top-up"
import { NAlert, NAvatar, NButton, NCard, NForm, NFormItem, NInput, NModal, NRadio, NRadioButton, NRadioGroup, NSelect, NSpin, NTag, useMessage } from "naive-ui"
import { computed, defineComponent, h, onBeforeUnmount, onMounted, provide, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

const FormIsolatedSelect = defineComponent({
	name: "FormIsolatedSelect",
	setup(_props, { attrs, slots }) {
		provide("n-form-item", null)
		return () => h(NSelect, attrs, slots)
	}
})
import Icon from "@/components/common/Icon.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { usePoints } from "@/add-os/modules/payments/composables/usePoints"
import { ApiError } from "@/add-os/services/api"
import { listCompanies } from "@/add-os/services/companies"
import { listUsers } from "@/add-os/services/users"
import { createWalletTopUp, getWalletBalance, previewWalletTopUp } from "@/add-os/services/wallet-top-ups"
import { formatCurrency, isCurrencyCode } from "@/add-os/utils/format"
import { useCurrencyStore } from "@/stores/currency"
import { useLocalesStore } from "@/stores/i18n"
import { useThemeStore } from "@/stores/theme"
import { getActivePinia } from "pinia"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const { formatPoints } = usePoints()
const router = useRouter()
const message = useMessage()
const themeStore = getActivePinia() ? useThemeStore() : null
const currencyStore = getActivePinia() ? useCurrencyStore() : null
const localesStore = getActivePinia() ? useLocalesStore() : null

const BackIconLtr = "carbon:arrow-left"
const BackIconRtl = "carbon:arrow-right"
const backIcon = computed<string>(() => (themeStore?.isRTL ? BackIconRtl : BackIconLtr))

const AMOUNT_PLACEHOLDER = "Enter amount"
const AMOUNT_PATTERN = /^\d+(?:\.\d{1,2})?$/
const MINIMUM_AMOUNT = 0.01

/**
 * SYP is the new pound (two zeros removed, 100 old = 1 new, in circulation
 * since 2026-01-01; old notes withdrawn after 2026-07-30). Only banknotes are
 * issued — no piastre coins — so cash is tendered in whole pounds. A trailing
 * ".00" is still accepted: it names the same whole amount.
 */
const SYP_AMOUNT_PATTERN = /^\d+(?:\.0{1,2})?$/
const SYP_MINIMUM_AMOUNT = 1

function isValidAmount(value: string, currency: string): boolean {
	const trimmed = value.trim()
	if (currency === "SYP") return SYP_AMOUNT_PATTERN.test(trimmed) && Number(trimmed) >= SYP_MINIMUM_AMOUNT
	return AMOUNT_PATTERN.test(trimmed) && Number(trimmed) >= MINIMUM_AMOUNT
}

type RecipientType = "user" | "company"
const recipientType = ref<RecipientType>("user")
const userBalanceScope = ref<"personal" | "company">("personal")
const selectedCurrency = ref<string>(currencyStore?.currency || "SYP")

onMounted(async () => {
	if (currencyStore) {
		await currencyStore.fetchCurrencies()
		if (currencyStore.currency) {
			selectedCurrency.value = currencyStore.currency
		}
	}
})

const DEFAULT_CURRENCIES = [
	{ code: "SYP", name: "ليرة سورية (SYP)", symbol: "ل.س" },
	{ code: "USD", name: "دولار أمريكي (USD)", symbol: "$" },
	{ code: "EUR", name: "يورو (EUR)", symbol: "€" }
]

const currencyOptions = computed<SelectOption[]>(() => {
	const list = currencyStore?.availableCurrencies?.length ? currencyStore.availableCurrencies : DEFAULT_CURRENCIES
	return list.map(c => ({
		label: `${c.code} (${c.symbol})`,
		value: c.code
	}))
})

function emptyForm() {
	return {
		user_id: null as number | null,
		company_id: null as number | null,
		amount: "",
		payment_method: "cash" as PaymentMethod,
		description: ""
	}
}

const formRef = ref<FormInst | null>(null)
const form = ref(emptyForm())
const fieldErrors = ref<Record<string, string[]>>({})
const isSubmitting = ref(false)

const amountPresets = computed(() => {
	if (selectedCurrency.value === "SYP") {
		// New-pound values: the old 50,000 / 100,000 / 250,000 / 500,000 presets with two zeros removed.
		return [500, 1000, 2500, 5000]
	}
	return [10, 25, 50, 100]
})

const currentBalance = ref<number | null>(null)
/** The wallet's balance in whole points, as the server reported it. */
const currentBalancePoints = ref<number | null>(null)
const balanceData = ref<WalletBalanceResponse | null>(null)
const isLoadingBalance = ref(false)

const PREVIEW_DEBOUNCE_MS = 300

/**
 * What the typed cash would buy, quoted by the server.
 *
 * This page has its own top-up form, separate from the reception dialog, and
 * had no preview at all. It gets the same treatment for the same reason: the
 * point rate and its ceil-once rounding live on the backend, so the only way
 * to show an operator what they are about to credit — before they credit it —
 * is to ask. Nothing here divides cash by a rate.
 */
const previewPoints = ref<number | null>(null)
const isPreviewLoading = ref(false)
/** Set when the server refused to quote — most importantly the below-one-point 422. */
const previewError = ref<string | null>(null)

let previewTimer: ReturnType<typeof setTimeout> | null = null
/**
 * Monotonic token for the newest preview the UI is willing to display, so a
 * slow answer for "500" can never overwrite a fresh one for "5000".
 * `nextPreviewId()` is the only writer: superseding a request and issuing one
 * are the same single step, leaving no window where two live requests share
 * an id. Mirrors WalletTopUpDialog.vue.
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
	const recipient = buildRecipient()
	if (recipient === null) return

	try {
		const preview = await previewWalletTopUp({
			...recipient,
			amount: form.value.amount.trim(),
			currency: selectedCurrency.value,
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
		// point. Show the server's own message when it sent one.
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

	// Nothing to quote yet — stay silent rather than asking the server to
	// reject a half-typed box, or quoting before a recipient is chosen.
	if (!isValidAmount(amount, selectedCurrency.value) || buildRecipient() === null) {
		previewPoints.value = null
		previewError.value = null
		return
	}

	// Claim the id now, so this request owns it from the debounce window
	// through to its response landing.
	const requestId = nextPreviewId()
	isPreviewLoading.value = true
	previewTimer = setTimeout(() => {
		previewTimer = null
		void runPreview(requestId)
	}, PREVIEW_DEBOUNCE_MS)
}

// Fetch only members for the user dropdown
const { data: users, isLoading: isLoadingUsers, error: usersError } = useResourceList(() => listUsers({ role: "member" }))
const { data: companies, isLoading: isLoadingCompanies, error: companiesError } = useResourceList(listCompanies)

const loadError = computed(() => usersError.value !== null || companiesError.value !== null)

const userOptions = computed<SelectOption[]>(() =>
	users.value.map(user => ({
		label: `${user.name} — ${user.phone}`,
		value: user.id
	}))
)

const companyOptions = computed<SelectOption[]>(() =>
	companies.value.map(company => ({
		label: `${company.legal_name} — ${company.contract_ref}${company.status === "inactive" ? ` (${t("walletTopUps.inactive")})` : ""}`,
		value: company.id
	}))
)

const selectedUser = computed(() => (recipientType.value === "user" ? users.value.find(u => u.id === form.value.user_id) : null))
const selectedCompany = computed(() => (recipientType.value === "company" ? companies.value.find(c => c.id === form.value.company_id) : null))

const hasRecipientSelected = computed(() => (recipientType.value === "user" ? form.value.user_id !== null : form.value.company_id !== null))

const userHasCompanies = computed(() => Boolean(selectedUser.value?.companies && selectedUser.value.companies.length > 0))
const affiliatedCompany = computed(() => selectedUser.value?.companies?.[0] ?? null)
const affiliatedCompanyName = computed(() => affiliatedCompany.value?.legal_name ?? null)

const isSelectedCompanyInactive = computed(() => {
	if (recipientType.value === "company") {
		return selectedCompany.value?.status === "inactive"
	}
	return false
})

const recipientDisplayName = computed(() => {
	if (recipientType.value === "user") {
		return selectedUser.value?.name ?? ""
	}
	return selectedCompany.value?.legal_name ?? ""
})

const recipientSubtitle = computed(() => {
	if (recipientType.value === "user") {
		return selectedUser.value?.phone ?? ""
	}
	return selectedCompany.value?.contract_ref ?? ""
})

const recipientStatus = computed(() => {
	if (recipientType.value === "user") {
		return selectedUser.value?.status ?? "active"
	}
	return selectedCompany.value?.status ?? "active"
})

const recipientInitials = computed(() => {
	const name = recipientDisplayName.value || "ADD"
	const parts = name.trim().split(" ")
	if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
	return name.slice(0, 2).toUpperCase()
})

/**
 * Points first, the currency equivalent second: `340 points (≈ 24,990 SYP)`.
 *
 * Both halves come off the balance response as the server rendered them —
 * `balance_points` and `balance_display` — so the parenthesised figure is the
 * backend's own conversion, not one made here.
 */
const formattedCurrentBalance = computed(() => {
	if (currentBalancePoints.value === null) return formatPoints(0)

	const primary = formatPoints(currentBalancePoints.value)
	const display = balanceData.value?.balance_display
	const displayCurrency = balanceData.value?.display_currency ?? balanceData.value?.currency

	if (display && isCurrencyCode(displayCurrency)) {
		return `${primary} (≈ ${formatCurrency(display, { currency: displayCurrency })})`
	}
	return primary
})

const formattedInputAmount = computed(() => {
	const num = Number(form.value.amount)
	return Number.isNaN(num) || num === 0 ? `0 ${selectedCurrency.value}` : `${num.toLocaleString()} ${selectedCurrency.value}`
})

/**
 * The balance after this top-up, in points — or `null` while there is nothing
 * to show yet.
 *
 * This adds two whole point counts the server produced (`balance_points` and
 * the preview's `points`). It is not a conversion: no cash is divided by a
 * rate anywhere on this page, which is why it has to wait for the quote
 * rather than doing the sum the moment digits are typed.
 */
const calculatedNewBalancePoints = computed(() => {
	if (currentBalancePoints.value === null) return null
	if (previewPoints.value === null) return currentBalancePoints.value
	return currentBalancePoints.value + previewPoints.value
})

const paymentMethodList = computed(() => [
	{
		id: "cash" as PaymentMethod,
		label: t("walletTopUps.paymentMethod.cash"),
		desc: "Collect cash at reception desk",
		icon: "carbon:money",
		iconBg: "bg-emerald-50 text-emerald-700"
	},
	{
		id: "syriatel" as PaymentMethod,
		label: t("walletTopUps.paymentMethod.syriatel"),
		desc: "Receive via Syriatel Cash wallet",
		icon: "carbon:wallet",
		iconBg: "bg-sky-50 text-sky-700"
	},
	{
		id: "sham" as PaymentMethod,
		label: t("walletTopUps.paymentMethod.sham"),
		desc: "Receive via Sham Cash wallet",
		icon: "carbon:wallet",
		iconBg: "bg-amber-50 text-amber-700"
	},
	{
		id: "mtn" as PaymentMethod,
		label: t("walletTopUps.paymentMethod.mtn"),
		desc: "Receive via MTN Cash wallet",
		icon: "carbon:wallet",
		iconBg: "bg-yellow-50 text-yellow-700"
	}
])

async function fetchBalance() {
	if (typeof getWalletBalance !== "function") return

	const ownerParams = recipientType.value === "user" && form.value.user_id !== null
		? (userBalanceScope.value === "company" && affiliatedCompany.value
			? { company_id: affiliatedCompany.value.id }
			: { user_id: form.value.user_id })
		: (recipientType.value === "company" && form.value.company_id !== null
			? { company_id: form.value.company_id }
			: null)

	if (!ownerParams) {
		currentBalance.value = null
		currentBalancePoints.value = null
		balanceData.value = null
		return
	}

	isLoadingBalance.value = true
	try {
		const res = await getWalletBalance({
			...ownerParams,
			currency: selectedCurrency.value
		})
		balanceData.value = res
		currentBalancePoints.value = res.balance_points
		const num = res.converted_balance !== null && res.converted_balance !== undefined
			? Number(res.converted_balance)
			: Number(res.general_balance)
		currentBalance.value = Number.isNaN(num) ? 0 : num
	} catch {
		currentBalance.value = 0
		currentBalancePoints.value = null
		balanceData.value = null
	} finally {
		isLoadingBalance.value = false
	}
}

watch([() => form.value.user_id, () => form.value.company_id, userBalanceScope, selectedCurrency], () => {
	fetchBalance()
})

/**
 * Currency is part of the quote, not just a label: the same digits buy a very
 * different number of points in SYP than in USD. The recipient matters too —
 * the preview is posted against a specific wallet.
 */
watch(
	[
		() => form.value.amount,
		selectedCurrency,
		() => form.value.payment_method,
		() => form.value.user_id,
		() => form.value.company_id,
		userBalanceScope
	],
	schedulePreview
)

onBeforeUnmount(cancelPendingPreview)

watch(selectedCurrency, () => {
	fieldErrors.value = {}
	formRef.value?.restoreValidation()
})

if (localesStore) {
	watch(() => localesStore.locale, () => {
		fieldErrors.value = {}
		formRef.value?.restoreValidation()
	})
}

watch(recipientType, type => {
	if (type === "user") {
		form.value.company_id = null
	} else {
		form.value.user_id = null
	}
	currentBalance.value = null
	currentBalancePoints.value = null
	balanceData.value = null
	userBalanceScope.value = "personal"
	resetPreview()
	fieldErrors.value = {}
	formRef.value?.restoreValidation()
})

function addPresetAmount(val: number) {
	const current = Number(form.value.amount) || 0
	form.value.amount = String(current + val)
}

function handleOpenHistory() {
	router?.push?.("/payments/transactions")
}

const rules = computed<FormRules>(() => ({
	amount: {
		required: true,
		trigger: ["blur", "input"],
		validator: (_rule, value: string) => {
			if (isValidAmount(value ?? "", selectedCurrency.value)) return true
			return new Error(t(selectedCurrency.value === "SYP" ? "walletTopUps.validation.amountFormatSyp" : "walletTopUps.validation.amountFormat"))
		}
	},
	...(recipientType.value === "user"
		? { user_id: { required: true, type: "number" as const, message: t("walletTopUps.validation.userRequired"), trigger: ["change"] } }
		: { company_id: { required: true, type: "number" as const, message: t("walletTopUps.validation.companyRequired"), trigger: ["change"] } })
}))

function buildRecipient(): { user_id: number } | { company_id: number } | null {
	if (recipientType.value === "user") {
		if (form.value.user_id === null) return null
		if (userBalanceScope.value === "company" && affiliatedCompany.value) {
			return { company_id: affiliatedCompany.value.id }
		}
		return { user_id: form.value.user_id }
	}
	return form.value.company_id === null ? null : { company_id: form.value.company_id }
}

async function submit() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	if (isSelectedCompanyInactive.value) {
		message.error(t("walletTopUps.cannotTopUpInactive"))
		return
	}

	const amount = form.value.amount.trim()
	const recipient = buildRecipient()
	if (!isValidAmount(amount, selectedCurrency.value) || recipient === null) return

	const description = form.value.description.trim()
		|| (recipientType.value === "user" && userBalanceScope.value === "company" && selectedUser.value
			? `Top-up via member ${selectedUser.value.name}`
			: null)

	const payload = {
		amount,
		currency: selectedCurrency.value,
		payment_method: form.value.payment_method,
		...recipient,
		description
	} as WalletTopUpPayload

	fieldErrors.value = {}
	isSubmitting.value = true
	try {
		const res = await createWalletTopUp(payload)
		lastReceipt.value = res
		receiptModalVisible.value = true
		message.success(t("walletTopUps.submit.success"))
		form.value = emptyForm()
		currentBalance.value = null
		currentBalancePoints.value = null
		balanceData.value = null
		resetPreview()
		formRef.value?.restoreValidation()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (caught.status === 422 && caught.data?.errors) fieldErrors.value = caught.data.errors
		// A 422 with a message but no field errors is the below-one-point
		// rejection: the rate can move between quoting and submitting, so the
		// preview passing is not a guarantee this will.
		else if (caught.status === 422) message.error(caught.data?.message ?? t("points.belowOnePoint"))
		else if (caught.status === 403) message.error(t("resourceCrud.mutations.permissionError"))
		else message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
	} finally {
		isSubmitting.value = false
	}
}

const receiptModalVisible = ref(false)
const lastReceipt = ref<WalletTopUp | null>(null)

function closeReceiptModal() {
	receiptModalVisible.value = false
}

function handlePrintReceipt() {
	window.print()
}

function formatReceiptDate(iso?: string): string {
	if (!iso) return new Date().toLocaleString()
	try {
		return new Date(iso).toLocaleString()
	} catch {
		return iso
	}
}

defineExpose({
	submit,
	form,
	recipientType,
	userBalanceScope,
	fieldErrors,
	selectedCurrency,
	receiptModalVisible,
	lastReceipt,
	closeReceiptModal,
	previewPoints,
	previewError,
	calculatedNewBalancePoints
})
</script>
