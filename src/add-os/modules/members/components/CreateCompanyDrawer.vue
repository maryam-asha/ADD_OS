<!-- src/add-os/modules/members/components/CreateCompanyDrawer.vue -->
<template>
	<n-modal
		v-model:show="show"
		preset="card"
		:title="t('officeLeases.create.title')"
		closable
		class="max-w-4xl w-full !rounded-2xl shadow-xl my-6"
		:segmented="{ content: 'soft', footer: 'soft' }"
	>
		<!-- Horizontal Stepper Header -->
		<div class="flex items-center justify-center gap-2 sm:gap-6 py-3 px-4 mb-5 border-b border-slate-100 dark:border-slate-800">
			<div class="flex items-center gap-2">
				<span class="w-6 h-6 rounded-full bg-[#134e2c] text-white flex items-center justify-center text-xs font-bold shrink-0">1</span>
				<span class="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">{{ t("companies.createDrawer.steps.company") }}</span>
			</div>
			<div class="w-6 sm:w-16 h-0.5 bg-emerald-200 dark:bg-emerald-800"></div>
			<div class="flex items-center gap-2">
				<span class="w-6 h-6 rounded-full bg-[#134e2c] text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
				<span class="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">{{ t("companies.createDrawer.steps.office") }}</span>
			</div>
			<div class="w-6 sm:w-16 h-0.5 bg-emerald-200 dark:bg-emerald-800"></div>
			<div class="flex items-center gap-2">
				<span class="w-6 h-6 rounded-full bg-[#134e2c] text-white flex items-center justify-center text-xs font-bold shrink-0">3</span>
				<span class="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">{{ t("companies.createDrawer.steps.terms") }}</span>
			</div>
		</div>

		<n-form ref="formRef" :model="form" :rules label-placement="top">
			<!-- 2-Column Responsive Layout -->
			<div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
				<!-- Right Column: Request Info & Space Assignment (7 cols) -->
				<div class="lg:col-span-7 flex flex-col gap-5">
					<!-- Card 1: the request and the company -->
					<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-4">
						<div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
							<div class="flex items-center gap-2">
								<span class="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
								<span class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ t("companies.createDrawer.cards.request") }}</span>
							</div>
							<span class="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
								{{ t("companies.createDrawer.cards.requestBadge") }}
							</span>
						</div>

						<n-form-item path="private_office_request_id" class="!mb-0">
							<template #label>
								<div class="flex items-center justify-between w-full">
									<span class="text-xs font-semibold text-slate-700 dark:text-slate-300">
										{{ t('officeLeases.create.request') }} <span class="text-rose-500">*</span>
									</span>
									<span class="text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
										{{ t("companies.createDrawer.required") }}
									</span>
								</div>
							</template>
							<n-select
								v-model:value="form.private_office_request_id"
								:options="requestOptions"
								:loading="isLoadingRequests"
								:placeholder="t('officeLeases.create.selectRequest')"
								filterable
								class="!rounded-xl"
								@update:value="onRequestSelected"
							/>
							<div v-if="!form.private_office_request_id" class="flex items-center gap-1.5 text-xs text-rose-500 mt-1.5">
								<Icon name="carbon:warning-alt-filled" :size="14" class="shrink-0" />
								<span>{{ t("companies.createDrawer.pickRequestHint") }}</span>
							</div>
						</n-form-item>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
							<n-form-item path="legal_name" :label="t('officeLeases.create.legalName')" class="!mb-0">
								<n-input
									v-model:value="form.legal_name"
									:placeholder="t('companies.createDrawer.legalNamePlaceholder')"
									class="!rounded-xl"
								/>
							</n-form-item>

							<n-form-item path="contract_ref" class="!mb-0">
								<template #label>
									<div class="flex items-center justify-between w-full">
										<span class="text-xs font-semibold text-slate-700 dark:text-slate-300">
											{{ t('officeLeases.create.contractRef') }} <span class="text-rose-500">*</span>
										</span>
										<span class="text-[10px] text-slate-400 font-medium">{{ t("companies.createDrawer.contractRefHint") }}</span>
									</div>
								</template>
								<n-input
									v-model:value="form.contract_ref"
									placeholder="ADD-C-2026-084"
									class="!rounded-xl font-mono"
								/>
							</n-form-item>
						</div>
					</div>

					<!-- Card 2: the office -->
					<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-4">
						<div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
							<div class="flex items-center gap-2">
								<span class="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
								<span class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ t("companies.createDrawer.cards.office") }}</span>
							</div>
							<span class="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
								{{ t("companies.createDrawer.cards.officeBadge") }}
							</span>
						</div>

						<n-form-item path="space_id" :label="t('officeLeases.create.space')" class="!mb-0">
							<n-select
								v-model:value="form.space_id"
								:options="officeOptions"
								:loading="isLoadingSpaces"
								:placeholder="t('officeLeases.create.selectSpace')"
								filterable
								class="!rounded-xl"
							/>
						</n-form-item>

						<!-- Dynamic Space & Building Banner -->
						<div class="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3.5 flex items-center justify-between gap-3">
							<div class="flex flex-col gap-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<span class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
										{{ selectedSpaceName || t('officeLeases.create.selectSpace') }}
									</span>
								</div>
								<span class="text-[11px] text-slate-500 dark:text-slate-400">
									{{ selectedSpaceFloorInfo || t('officeLeases.create.branchAuto') }}
								</span>
							</div>
							<div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
								<Icon name="carbon:building" :size="20" />
							</div>
						</div>
					</div>
				</div>

				<!-- Left Column: Financials, Terms & Auto-Renew (5 cols) -->
				<div class="lg:col-span-5 flex flex-col gap-5">
					<!-- Card 3: money and term -->
					<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-4">
						<div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
							<div class="flex items-center gap-2">
								<span class="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
								<span class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ t("companies.createDrawer.cards.terms") }}</span>
							</div>
							<span class="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
								{{ t("companies.createDrawer.cards.termsBadge") }}
							</span>
						</div>

						<n-form-item path="starts_on" :label="t('officeLeases.create.startsOn')" class="!mb-0">
							<n-date-picker
								v-model:formatted-value="form.starts_on"
								value-format="yyyy-MM-dd"
								type="date"
								class="w-full !rounded-xl"
							/>
						</n-form-item>

						<n-form-item path="duration_months" :label="t('officeLeases.create.durationMonths')" class="!mb-0">
							<n-input-number
								v-model:value="form.duration_months"
								:min="1"
								:max="120"
								button-placement="both"
								class="w-full !rounded-xl text-center"
								@update:value="onDurationChanged"
							/>
						</n-form-item>

						<n-form-item path="billing_cycle_months" :label="t('officeLeases.create.billingCycleMonths')" class="!mb-0">
							<n-select
								v-model:value="form.billing_cycle_months"
								:options="billingCycleOptions"
								class="w-full !rounded-xl"
							/>
						</n-form-item>

						<div class="grid grid-cols-2 gap-3">
							<n-form-item path="monthly_amount" :label="t('officeLeases.create.monthlyAmount')" class="!mb-0">
								<n-input
									v-model:value="form.monthly_amount"
									placeholder="500"
									class="!rounded-xl font-mono"
								>
									<template #prefix>
										<span class="text-xs text-slate-400 font-mono me-1">{{ selectedCurrencySymbol }}</span>
									</template>
								</n-input>
							</n-form-item>

							<n-form-item path="currency" :label="t('officeLeases.create.currency')" class="!mb-0">
								<n-select
									v-model:value="form.currency"
									:options="currencyOptions"
									:loading="isLoadingCurrencies"
									class="!rounded-xl"
								/>
							</n-form-item>
						</div>

						<!-- Billed To (Payer) - visible if request has provider -->
						<n-form-item v-if="selectedRequest?.provider_id" path="billed_to" :label="t('officeLeases.create.billedTo')" class="!mb-0">
							<n-select
								v-model:value="form.billed_to"
								:options="payerOptions"
								class="!rounded-xl"
							/>
						</n-form-item>
					</div>

					<!-- Card 4: auto-renewal -->
					<div class="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/50 rounded-2xl p-4 flex items-center justify-between gap-3">
						<div class="flex flex-col gap-1 min-w-0">
							<div class="flex items-center gap-2">
								<span class="text-xs font-bold text-slate-900 dark:text-slate-100">
									{{ t('officeLeases.create.autoRenew') }}
								</span>
								<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#134e2c] text-white">
									{{ t("companies.createDrawer.autoBadge") }}
								</span>
							</div>
							<p class="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
								{{ t("companies.createDrawer.autoRenewHint") }}
							</p>
						</div>
						<n-switch v-model:value="form.auto_renew" class="shrink-0" />
					</div>
				</div>
			</div>
		</n-form>

		<template #footer>
			<div class="flex justify-end gap-3">
				<n-button @click="show = false">{{ t('resourceCrud.form.cancel') }}</n-button>
				<n-button type="primary" :loading="isSubmitting" @click="handleSubmit">
					<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
					{{ t('resourceCrud.form.submit') }}
				</n-button>
			</div>
		</template>
	</n-modal>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { CompanyPayload } from "../types/company"
import type { PrivateOfficeRequest } from "../types/private-office-request"
import type { Currency } from "@/add-os/modules/payments/types/currency"
import type { Space } from "@/add-os/modules/spatial/types/space"
import { NButton, NDatePicker, NForm, NFormItem, NInput, NInputNumber, NModal, NSelect, NSwitch, useMessage } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { ApiError } from "@/add-os/services/api"
import { createCompany } from "@/add-os/services/companies"
import { listCurrencies } from "@/add-os/services/currencies"
import { listPrivateOfficeRequests } from "@/add-os/services/private-office-requests"
import { listSpaces } from "@/add-os/services/spaces"
import Icon from "@/components/common/Icon.vue"

const emit = defineEmits<{ (e: "created"): void }>()
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()
const message = useMessage()
const formRef = ref<FormInst | null>(null)

const requests = ref<PrivateOfficeRequest[]>([])
const spaces = ref<Space[]>([])
const currencies = ref<Currency[]>([])
const isLoadingRequests = ref(false)
const isLoadingSpaces = ref(false)
const isLoadingCurrencies = ref(false)
const isSubmitting = ref(false)

function todayStr() {
	const d = new Date()
	return d.toISOString().slice(0, 10)
}

const form = ref<CompanyPayload>({
	private_office_request_id: null,
	legal_name: "",
	contract_ref: "",
	space_id: null,
	starts_on: todayStr(),
	duration_months: 12,
	billing_cycle_months: 3,
	monthly_amount: "",
	currency: "USD",
	billed_to: "provider",
	auto_renew: true
})

const selectedRequest = computed(() =>
	requests.value.find(r => r.id === form.value.private_office_request_id)
)

const requestOptions = computed<SelectOption[]>(() =>
	requests.value
		.filter(r => r.status === "quoted" && !r.company_id)
		.map(r => ({
			label: `${r.prospect_name} (${r.quote_ref ?? `#${r.id}`})${r.provider ? ` - [${r.provider.name}]` : ""}`,
			value: r.id
		}))
)

const officeOptions = computed<SelectOption[]>(() =>
	spaces.value
		.filter(s => s.space_type === "business")
		.map(s => ({
			label: `${pickLocalized(s.name ?? { ar: "", en: "" }, currentLocale.value) || `Space #${s.id}`}${s.status !== "active" ? ` (${s.status})` : ""}`,
			value: s.id
		}))
)

const selectedSpace = computed(() => spaces.value.find(s => s.id === form.value.space_id))
const selectedCurrencySymbol = computed(() => {
	const currency = currencies.value.find(c => c.code === form.value.currency)
	return currency?.symbol || currency?.code || form.value.currency || ""
})

const selectedSpaceName = computed(() => {
	if (!selectedSpace.value) return ""
	return pickLocalized(selectedSpace.value.name ?? { ar: "", en: "" }, currentLocale.value) || t("companies.createDrawer.officeFallback", { id: selectedSpace.value.id })
})

const selectedSpaceFloorInfo = computed(() => {
	if (!selectedSpace.value) return ""
	return t("companies.createDrawer.officeCapacity", { seats: selectedSpace.value.capacity || 1 })
})

const currencyOptions = computed<SelectOption[]>(() =>
	currencies.value
		.filter(c => c.is_active)
		.map(c => ({
			label: `${c.code} (${c.symbol}) - ${c.name}`,
			value: c.code
		}))
)

const payerOptions = computed<SelectOption[]>(() => [
	{ label: t("officeLeases.create.payerProvider"), value: "provider" },
	{ label: t("officeLeases.create.payerCompany"), value: "company" }
])

function computeValidCycles(duration: number): number[] {
	const valid: number[] = []
	for (const cycle of [1, 3, 6, duration]) {
		if (cycle <= duration && duration % cycle === 0) {
			if (!valid.includes(cycle)) valid.push(cycle)
		}
	}
	return valid
}

const billingCycleOptions = computed<SelectOption[]>(() => {
	const duration = Number(form.value.duration_months) || 12
	const cycles = computeValidCycles(duration)
	return cycles.map(c => {
		if (c === duration && c > 6) {
			return {
				label: t("officeLeases.create.cycleOptions.full", { months: c }),
				value: c
			}
		}
		if (c === 1) return { label: t("officeLeases.create.cycleOptions.1"), value: 1 }
		if (c === 3) return { label: t("officeLeases.create.cycleOptions.3"), value: 3 }
		if (c === 6) return { label: t("officeLeases.create.cycleOptions.6"), value: 6 }
		return { label: `${c} Months`, value: c }
	})
})

function onDurationChanged(val: number | null) {
	if (!val) return
	const valid = computeValidCycles(val)
	if (!valid.includes(Number(form.value.billing_cycle_months))) {
		form.value.billing_cycle_months = valid[0] ?? 1
	}
}

function onRequestSelected(val: number | null) {
	if (!val) return
	const req = requests.value.find(r => r.id === val)
	if (req) {
		if (!form.value.legal_name) {
			form.value.legal_name = req.prospect_name
		}
		if (req.provider_id) {
			form.value.billed_to = req.payer ?? "provider"
		} else {
			form.value.billed_to = null
		}
	}
}

async function loadDependencies() {
	isLoadingRequests.value = true
	isLoadingSpaces.value = true
	isLoadingCurrencies.value = true
	try {
		const [reqs, sps, currs] = await Promise.all([
			listPrivateOfficeRequests(),
			listSpaces(),
			listCurrencies()
		])
		requests.value = reqs
		spaces.value = sps
		currencies.value = currs
	} catch {
		// The lists feed the selects: an empty select with no word would look like "no offices".
		message.error(t("companies.createDrawer.loadError"))
	} finally {
		isLoadingRequests.value = false
		isLoadingSpaces.value = false
		isLoadingCurrencies.value = false
	}
}

watch(show, visible => {
	if (visible) {
		loadDependencies()
		form.value = {
			private_office_request_id: null,
			legal_name: "",
			contract_ref: "",
			space_id: null,
			starts_on: todayStr(),
			duration_months: 12,
			billing_cycle_months: 3,
			monthly_amount: "",
			currency: currencies.value.find(c => c.is_base)?.code || "USD",
			billed_to: "provider",
			auto_renew: true
		}
	}
})

onMounted(() => {
	if (show.value) loadDependencies()
})

const rules: FormRules = {
	private_office_request_id: { type: "number", required: true, message: t("officeLeases.create.selectRequest"), trigger: ["blur", "change"] },
	legal_name: { required: true, message: t("officeLeases.create.legalName"), trigger: ["blur", "input"] },
	contract_ref: { required: true, message: t("officeLeases.create.contractRef"), trigger: ["blur", "input"] },
	space_id: { type: "number", required: true, message: t("officeLeases.create.selectSpace"), trigger: ["blur", "change"] },
	starts_on: { required: true, message: t("officeLeases.create.startsOn"), trigger: ["blur", "change"] },
	duration_months: { type: "number", required: true, message: t("officeLeases.create.durationMonths"), trigger: ["blur", "change"] },
	billing_cycle_months: { type: "number", required: true, message: t("officeLeases.create.billingCycleMonths"), trigger: ["blur", "change"] },
	monthly_amount: { required: true, message: t("officeLeases.create.monthlyAmount"), trigger: ["blur", "input"] },
	currency: { required: true, message: t("officeLeases.create.currency"), trigger: ["blur", "change"] }
}

async function handleSubmit() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	isSubmitting.value = true
	try {
		const payload: CompanyPayload = {
			private_office_request_id: form.value.private_office_request_id,
			legal_name: form.value.legal_name,
			contract_ref: form.value.contract_ref,
			space_id: form.value.space_id,
			starts_on: form.value.starts_on,
			duration_months: Number(form.value.duration_months),
			billing_cycle_months: Number(form.value.billing_cycle_months),
			monthly_amount: String(form.value.monthly_amount),
			currency: form.value.currency,
			auto_renew: Boolean(form.value.auto_renew)
		}
		if (selectedRequest.value?.provider_id && form.value.billed_to) {
			payload.billed_to = form.value.billed_to
		}

		await createCompany(payload)
		message.success(t("officeLeases.create.success"))
		show.value = false
		emit("created")
	} catch (caught) {
		if (caught instanceof ApiError) {
			message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		} else if (caught instanceof Error) {
			message.error(caught.message)
		}
	} finally {
		isSubmitting.value = false
	}
}
</script>
