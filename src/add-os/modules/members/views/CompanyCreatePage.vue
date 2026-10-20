<!-- src/add-os/modules/members/views/CompanyCreatePage.vue -->
<template>
	<div class="flex flex-col gap-6 max-w-6xl mx-auto w-full">
		<!-- Header -->
		<header class="flex items-start gap-3">
			<n-button circle secondary class="shrink-0 mt-1" :aria-label="t('common.back')" :title="t('common.back')" @click="leave">
				<template #icon>
					<Icon name="carbon:arrow-left" :size="18" class="rtl:rotate-180" />
				</template>
			</n-button>
			<div class="flex flex-col gap-1 min-w-0">
				<h1 class="text-2xl font-bold m-0">{{ t("officeLeases.create.title") }}</h1>
				<p class="text-sm text-secondary m-0 max-w-3xl">{{ t("companies.createPage.subtitle") }}</p>
			</div>
		</header>

		<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
			<!-- The wizard -->
			<n-card class="lg:col-span-8 rounded-xl">
				<!-- Steps, joined by a line that fills in as each is passed -->
				<ol class="list-none m-0 p-0 flex items-center pb-5 mb-6 border-b border-stone-200" data-test="steps">
					<li
						v-for="(s, index) in STEPS"
						:key="s"
						class="flex items-center min-w-0"
						:class="{ 'flex-1': index < STEPS.length - 1 }"
					>
						<button
							type="button"
							class="flex items-center gap-2.5 shrink-0 bg-transparent border-0 p-0"
							:class="index < step ? 'cursor-pointer' : 'cursor-default'"
							:disabled="index >= step"
							:aria-current="index === step ? 'step' : undefined"
							@click="goTo(index)"
						>
							<span
								class="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 transition-colors"
								:class="index < step
									? 'bg-[var(--add-primary)] border-[var(--add-primary)] text-white'
									: index === step
										? 'bg-[var(--add-primary)]/10 border-[var(--add-primary)] text-[var(--add-primary)]'
										: 'bg-white border-stone-200 text-stone-400'"
							>
								<Icon v-if="index < step" name="carbon:checkmark" :size="16" />
								<span v-else>{{ formatNumber(index + 1) }}</span>
							</span>
							<!-- On a phone only the current step is named; the circles carry the rest. -->
							<span
								class="text-sm font-semibold whitespace-nowrap"
								:class="index === step ? 'text-stone-900' : index < step ? 'text-stone-700 hidden md:inline' : 'text-stone-400 hidden md:inline'"
							>
								{{ t(`companies.createPage.steps.${s}`) }}
							</span>
						</button>
						<span
							v-if="index < STEPS.length - 1"
							class="flex-1 h-0.5 mx-3 rounded-full transition-colors"
							:class="index < step ? 'bg-[var(--add-primary)]' : 'bg-stone-200'"
							aria-hidden="true"
						></span>
					</li>
				</ol>

				<!-- Which step this is, and what it asks for -->
				<div class="flex items-start gap-3 mb-6">
					<span class="w-10 h-10 rounded-xl bg-[var(--add-primary)]/10 text-[var(--add-primary)] flex items-center justify-center shrink-0">
						<Icon :name="STEP_ICONS[currentStep]" :size="20" />
					</span>
					<div class="flex flex-col gap-0.5 min-w-0">
						<span class="text-xs font-semibold text-[var(--add-primary)]">
							{{ t("companies.createPage.stepOf", { current: formatNumber(step + 1), total: formatNumber(STEPS.length) }) }}
						</span>
						<h2 class="text-lg font-bold m-0">{{ t(`companies.createPage.steps.${currentStep}`) }}</h2>
						<p class="text-sm text-secondary m-0">{{ t(`companies.createPage.stepHints.${currentStep}`) }}</p>
					</div>
				</div>

				<n-spin :show="isLoading">
					<!--
						One form, holding only the step on screen: Naive UI validates the
						items that are mounted, so "Next" checks this step and no other.
					-->
					<n-form ref="formRef" :model="form" :rules label-placement="top">
						<!-- Step 1: the request and the company -->
						<template v-if="currentStep === 'company'">
							<n-form-item path="private_office_request_id" :label="t('officeLeases.create.request')" v-bind="serverFeedback('private_office_request_id')">
								<n-select
									v-model:value="form.private_office_request_id"
									:options="requestOptions"
									:placeholder="t('officeLeases.create.selectRequest')"
									filterable
									@update:value="onRequestSelected"
								/>
							</n-form-item>

							<div v-if="selectedRequest" class="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 mb-6 rounded-xl bg-stone-50 border border-stone-200/80">
								<div class="flex flex-col gap-0.5 min-w-0">
									<span class="text-xs text-secondary">{{ t("companies.createPage.request.contact") }}</span>
									<span class="text-sm font-medium break-words">{{ selectedRequest.contact || "—" }}</span>
								</div>
								<div class="flex flex-col gap-0.5 min-w-0">
									<span class="text-xs text-secondary">{{ t("companies.createPage.request.quoteRef") }}</span>
									<span class="text-sm font-medium break-words">{{ selectedRequest.quote_ref || "—" }}</span>
								</div>
								<div class="flex flex-col gap-0.5 min-w-0">
									<span class="text-xs text-secondary">{{ t("companies.createPage.request.provider") }}</span>
									<span class="text-sm font-medium break-words">{{ selectedRequest.provider?.name ?? t("companies.createPage.request.direct") }}</span>
								</div>
							</div>

							<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
								<n-form-item path="legal_name" :label="t('officeLeases.create.legalName')" v-bind="serverFeedback('legal_name')">
									<n-input v-model:value="form.legal_name" :placeholder="t('companies.createPage.legalNamePlaceholder')" />
								</n-form-item>
								<n-form-item path="contract_ref" :label="t('officeLeases.create.contractRef')" v-bind="serverFeedback('contract_ref')">
									<n-input v-model:value="form.contract_ref" :placeholder="t('companies.createPage.contractRefPlaceholder')" />
								</n-form-item>
							</div>
							<p class="text-xs text-secondary m-0">{{ t("companies.createPage.contractRefHint") }}</p>
						</template>

						<!-- Step 2: the office -->
						<template v-else-if="currentStep === 'office'">
							<n-form-item path="space_id" :label="t('officeLeases.create.space')" v-bind="serverFeedback('space_id')">
								<n-select
									v-model:value="form.space_id"
									:options="officeOptions"
									:placeholder="t('officeLeases.create.selectSpace')"
									filterable
								/>
							</n-form-item>

							<div
								class="flex items-center gap-4 p-4 rounded-xl border"
								:class="selectedSpace ? 'bg-emerald-50/60 border-emerald-100' : 'border-dashed border-stone-200'"
							>
								<span
									class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
									:class="selectedSpace ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-400'"
								>
									<Icon name="carbon:building" :size="22" />
								</span>
								<div class="flex flex-col gap-0.5 min-w-0">
									<span class="text-sm font-semibold truncate" :class="selectedSpace ? '' : 'text-stone-400'">
										{{ selectedSpaceName || t("officeLeases.create.selectSpace") }}
									</span>
									<span class="text-xs text-secondary">{{ selectedSpaceCapacity || t("officeLeases.create.branchAuto") }}</span>
								</div>
							</div>
						</template>

						<!-- Step 3: term, price and renewal -->
						<template v-else>
							<h3 class="text-sm font-bold text-stone-700 m-0 mb-3">{{ t("companies.createPage.termsPeriod") }}</h3>
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
								<n-form-item path="starts_on" :label="t('officeLeases.create.startsOn')" v-bind="serverFeedback('starts_on')">
									<n-date-picker v-model:formatted-value="form.starts_on" value-format="yyyy-MM-dd" type="date" class="w-full" />
								</n-form-item>
								<n-form-item path="duration_months" :label="t('officeLeases.create.durationMonths')" v-bind="serverFeedback('duration_months')">
									<n-input-number
										v-model:value="form.duration_months"
										:min="1"
										:max="120"
										button-placement="both"
										class="w-full"
										@update:value="onDurationChanged"
									/>
								</n-form-item>
							</div>
							<n-form-item path="billing_cycle_months" :label="t('officeLeases.create.billingCycleMonths')" v-bind="serverFeedback('billing_cycle_months')">
								<n-select v-model:value="form.billing_cycle_months" :options="billingCycleOptions" />
							</n-form-item>

							<h3 class="text-sm font-bold text-stone-700 m-0 mb-3 pt-5 border-t border-stone-200">{{ t("companies.createPage.termsPrice") }}</h3>
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
								<n-form-item path="monthly_amount" :label="t('officeLeases.create.monthlyAmount')" v-bind="serverFeedback('monthly_amount')">
									<n-input
										v-model:value="form.monthly_amount"
										:input-props="{ inputmode: 'decimal' }"
										data-test="monthly-amount"
									>
										<template #prefix>
											<span class="text-xs text-secondary me-1">{{ selectedCurrencySymbol }}</span>
										</template>
									</n-input>
								</n-form-item>
								<n-form-item path="currency" :label="t('officeLeases.create.currency')" v-bind="serverFeedback('currency')">
									<n-select v-model:value="form.currency" :options="currencyOptions" />
								</n-form-item>
							</div>

							<!-- Only a request that came through a provider has a choice of payer. -->
							<n-form-item v-if="selectedRequest?.provider_id" path="billed_to" :label="t('officeLeases.create.billedTo')" v-bind="serverFeedback('billed_to')">
								<n-select v-model:value="form.billed_to" :options="payerOptions" />
							</n-form-item>

							<div class="flex items-center justify-between gap-4 p-4 rounded-xl border border-stone-200">
								<div class="flex flex-col gap-0.5 min-w-0">
									<span class="text-sm font-semibold">{{ t("officeLeases.create.autoRenew") }}</span>
									<span class="text-xs text-secondary">{{ t("companies.createPage.autoRenewHint") }}</span>
								</div>
								<n-switch v-model:value="form.auto_renew" class="shrink-0" />
							</div>
						</template>
					</n-form>
				</n-spin>

				<template #action>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<n-button quaternary :disabled="isSubmitting" @click="leave">{{ t("resourceCrud.form.cancel") }}</n-button>
						<div class="flex items-center gap-2">
							<n-button v-if="step > 0" secondary :disabled="isSubmitting" @click="goTo(step - 1)">
								<template #icon><Icon name="carbon:arrow-left" :size="16" class="rtl:rotate-180" /></template>
								{{ t("companies.createPage.back") }}
							</n-button>
							<n-button v-if="!isLastStep" type="primary" :disabled="isLoading" icon-placement="right" @click="next">
								<template #icon><Icon name="carbon:arrow-right" :size="16" class="rtl:rotate-180" /></template>
								{{ t("companies.createPage.next") }}
							</n-button>
							<n-button v-else type="primary" :loading="isSubmitting" :disabled="isLoading" @click="submit">
								<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
								{{ t("companies.createPage.submit") }}
							</n-button>
						</div>
					</div>
				</template>
			</n-card>

			<!-- What has been chosen so far, by step -->
			<n-card class="lg:col-span-4 lg:sticky lg:top-6 rounded-xl" data-test="summary">
				<template #header>
					<div class="flex items-center gap-2">
						<Icon name="carbon:list-checked" :size="18" class="text-[var(--add-primary)]" />
						<span class="text-base font-semibold">{{ t("companies.createPage.summary") }}</span>
					</div>
				</template>
				<!-- Side by side under the wizard on a tablet; stacked beside it on a desktop. -->
				<div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 sm:gap-x-6">
					<section
						v-for="(group, index) in summaryGroups"
						:key="group.step"
						class="flex flex-col gap-3 pb-4"
						:class="{ 'border-t border-stone-200 pt-4 sm:border-t-0 sm:pt-0 lg:border-t lg:pt-4': index > 0 }"
					>
						<div class="flex items-center justify-between gap-2">
							<h3 class="text-sm font-bold m-0">{{ t(`companies.createPage.steps.${group.step}`) }}</h3>
							<Icon v-if="group.done" name="carbon:checkmark-filled" :size="16" class="text-[var(--add-primary)]" />
						</div>
						<dl class="m-0 flex flex-col gap-2.5">
							<div v-for="row in group.rows" :key="row.key" class="flex flex-col gap-0.5">
								<dt class="text-xs font-normal text-secondary">{{ row.label }}</dt>
								<dd class="m-0 text-sm font-semibold break-words" :class="row.value ? '' : 'text-stone-300 font-normal'">{{ row.value || "—" }}</dd>
							</div>
						</dl>
					</section>
				</div>
			</n-card>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { CompanyPayload } from "@/add-os/modules/members/types/company"
import type { PrivateOfficeRequest } from "@/add-os/modules/members/types/private-office-request"
import type { Currency } from "@/add-os/modules/payments/types/currency"
import type { Space } from "@/add-os/modules/spatial/types/space"
import { NButton, NCard, NDatePicker, NForm, NFormItem, NInput, NInputNumber, NSelect, NSpin, NSwitch, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { ApiError } from "@/add-os/services/api"
import { createCompany } from "@/add-os/services/companies"
import { listCurrencies } from "@/add-os/services/currencies"
import { listPrivateOfficeRequests } from "@/add-os/services/private-office-requests"
import { listSpaces } from "@/add-os/services/spaces"
import { formatCurrency, formatDate, formatNumber, isCurrencyCode } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

type Step = "company" | "office" | "terms"

const STEPS: readonly Step[] = ["company", "office", "terms"]

const STEP_ICONS: Record<Step, string> = {
	company: "carbon:enterprise",
	office: "carbon:building",
	terms: "carbon:document"
}

/** Which step asks for each field — where a refusal from the server sends the user back to. */
const FIELD_STEP: Record<string, Step> = {
	private_office_request_id: "company",
	legal_name: "company",
	contract_ref: "company",
	space_id: "office",
	starts_on: "terms",
	duration_months: "terms",
	billing_cycle_months: "terms",
	monthly_amount: "terms",
	currency: "terms",
	billed_to: "terms",
	auto_renew: "terms"
}

const { t } = useI18n()
const router = useRouter()
const message = useMessage()
const formRef = ref<FormInst | null>(null)

const requests = ref<PrivateOfficeRequest[]>([])
const spaces = ref<Space[]>([])
const currencies = ref<Currency[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const step = ref(0)
const serverErrors = ref<Record<string, string[]>>({})

const currentStep = computed(() => STEPS[step.value]!)
const isLastStep = computed(() => step.value === STEPS.length - 1)

const form = ref<CompanyPayload>({
	private_office_request_id: null,
	legal_name: "",
	contract_ref: "",
	space_id: null,
	// The staff member's own calendar day, not UTC's — the two differ in the
	// first hours of a Damascus morning.
	starts_on: formatDate(new Date(), { style: "iso" }),
	duration_months: 12,
	billing_cycle_months: 3,
	monthly_amount: "",
	currency: "USD",
	billed_to: "provider",
	auto_renew: true
})

const selectedRequest = computed(() => requests.value.find(r => r.id === form.value.private_office_request_id))
const selectedSpace = computed(() => spaces.value.find(s => s.id === form.value.space_id))

/** Only a quoted request that has not already become a company can be signed. */
const requestOptions = computed<SelectOption[]>(() =>
	requests.value
		.filter(r => r.status === "quoted" && !r.company_id)
		.map(r => ({
			label: [r.prospect_name, r.quote_ref ?? `#${r.id}`, r.provider?.name].filter(Boolean).join(" · "),
			value: r.id
		}))
)

function spaceName(s: Space): string {
	return pickLocalized(s.name ?? { ar: "", en: "" }, currentLocale.value) || t("companies.createPage.officeFallback", { id: s.id })
}

const officeOptions = computed<SelectOption[]>(() =>
	spaces.value
		.filter(s => s.space_type === "business")
		.map(s => ({
			label: s.status === "active" ? spaceName(s) : `${spaceName(s)} · ${t(`operationalStatus.${s.status}`)}`,
			value: s.id
		}))
)

const selectedSpaceName = computed(() => (selectedSpace.value ? spaceName(selectedSpace.value) : ""))
const selectedSpaceCapacity = computed(() =>
	selectedSpace.value ? t("companies.createPage.officeCapacity", { seats: formatNumber(selectedSpace.value.capacity || 1) }) : ""
)

const currencyOptions = computed<SelectOption[]>(() =>
	currencies.value
		.filter(c => c.is_active)
		.map(c => ({
			label: [c.code, c.symbol ? `(${c.symbol})` : "", pickLocalized(c.name, currentLocale.value)].filter(Boolean).join(" "),
			value: c.code
		}))
)

const selectedCurrencySymbol = computed(() => {
	const currency = currencies.value.find(c => c.code === form.value.currency)
	return currency?.symbol || form.value.currency || ""
})

const payerOptions = computed<SelectOption[]>(() => [
	{ label: t("officeLeases.create.payerProvider"), value: "provider" },
	{ label: t("officeLeases.create.payerCompany"), value: "company" }
])

/** A cycle has to divide the term evenly: monthly, quarterly, half-yearly, or all at once. */
function validCycles(duration: number): number[] {
	return [...new Set([1, 3, 6, duration])].filter(c => c <= duration && duration % c === 0)
}

const billingCycleOptions = computed<SelectOption[]>(() => {
	const duration = Number(form.value.duration_months) || 12
	return validCycles(duration).map(c => ({
		label: c === 1 || c === 3 || c === 6
			? t(`officeLeases.create.cycleOptions.${c}`)
			: t("officeLeases.create.cycleOptions.full", { months: formatNumber(c) }),
		value: c
	}))
})

function onDurationChanged(value: number | null) {
	if (!value) return
	const valid = validCycles(value)
	if (!valid.includes(Number(form.value.billing_cycle_months))) {
		form.value.billing_cycle_months = valid[0] ?? 1
	}
}

function onRequestSelected(id: number | null) {
	const request = requests.value.find(r => r.id === id)
	if (!request) return
	if (!form.value.legal_name) form.value.legal_name = request.prospect_name
	if (!form.value.contract_ref && request.contract_ref) form.value.contract_ref = request.contract_ref
	form.value.billed_to = request.provider_id ? (request.payer ?? "provider") : null
}

function money(amount: string, code: string | undefined): string {
	if (!amount || Number.isNaN(Number(amount))) return ""
	return code && isCurrencyCode(code) ? formatCurrency(amount, { currency: code }) : `${formatNumber(Number(amount))} ${code ?? ""}`.trim()
}

/** What each step has collected, for the summary beside the wizard. */
const summaryGroups = computed(() => {
	const f = form.value
	const cycle = billingCycleOptions.value.find(o => o.value === f.billing_cycle_months)
	const request = selectedRequest.value
	return [
		{
			step: "company" as Step,
			done: step.value > 0,
			rows: [
				{ key: "request", label: t("officeLeases.create.request"), value: request ? [request.prospect_name, request.quote_ref].filter(Boolean).join(" · ") : "" },
				{ key: "legal_name", label: t("officeLeases.create.legalName"), value: f.legal_name.trim() },
				{ key: "contract_ref", label: t("officeLeases.create.contractRef"), value: f.contract_ref.trim() }
			]
		},
		{
			step: "office" as Step,
			done: step.value > 1,
			rows: [
				{ key: "space", label: t("officeLeases.create.space"), value: selectedSpaceName.value }
			]
		},
		{
			step: "terms" as Step,
			done: false,
			rows: [
				{ key: "starts_on", label: t("officeLeases.create.startsOn"), value: f.starts_on ? formatDate(f.starts_on, { style: "medium" }) : "" },
				{ key: "duration", label: t("officeLeases.create.durationMonths"), value: f.duration_months ? formatNumber(f.duration_months) : "" },
				{ key: "cycle", label: t("officeLeases.create.billingCycleMonths"), value: cycle ? String(cycle.label) : "" },
				{ key: "monthly", label: t("officeLeases.create.monthlyAmount"), value: money(String(f.monthly_amount ?? ""), f.currency) },
				...(request?.provider_id
					? [{ key: "payer", label: t("officeLeases.create.billedTo"), value: f.billed_to ? String(payerOptions.value.find(o => o.value === f.billed_to)?.label ?? "") : "" }]
					: []),
				{ key: "auto_renew", label: t("officeLeases.create.autoRenew"), value: f.auto_renew ? t("common.yes") : t("common.no") }
			]
		}
	]
})

const rules: FormRules = {
	private_office_request_id: { type: "number", required: true, message: t("companies.createPage.required", { field: t("officeLeases.create.request") }), trigger: ["blur", "change"] },
	legal_name: { required: true, whitespace: true, message: t("companies.createPage.required", { field: t("officeLeases.create.legalName") }), trigger: ["blur", "input"] },
	contract_ref: { required: true, whitespace: true, message: t("companies.createPage.required", { field: t("officeLeases.create.contractRef") }), trigger: ["blur", "input"] },
	space_id: { type: "number", required: true, message: t("companies.createPage.required", { field: t("officeLeases.create.space") }), trigger: ["blur", "change"] },
	starts_on: { required: true, message: t("companies.createPage.required", { field: t("officeLeases.create.startsOn") }), trigger: ["blur", "change"] },
	duration_months: { type: "number", required: true, message: t("companies.createPage.required", { field: t("officeLeases.create.durationMonths") }), trigger: ["blur", "change"] },
	billing_cycle_months: { type: "number", required: true, message: t("companies.createPage.required", { field: t("officeLeases.create.billingCycleMonths") }), trigger: ["blur", "change"] },
	monthly_amount: {
		required: true,
		trigger: ["blur", "input"],
		validator: (_rule, value: string) => {
			if (!String(value ?? "").trim()) return new Error(t("companies.createPage.required", { field: t("officeLeases.create.monthlyAmount") }))
			const amount = Number(value)
			return (!Number.isNaN(amount) && amount > 0) || new Error(t("companies.createPage.amountInvalid"))
		}
	},
	currency: { required: true, message: t("companies.createPage.required", { field: t("officeLeases.create.currency") }), trigger: ["blur", "change"] }
}

/** A field the server refused, shown on the field itself rather than in a toast. */
function serverFeedback(field: string) {
	const error = serverErrors.value[field]?.[0]
	return error ? { feedback: error, validationStatus: "error" as const } : {}
}

async function validateStep(): Promise<boolean> {
	try {
		await formRef.value?.validate()
		return true
	} catch {
		return false
	}
}

async function next() {
	if (await validateStep()) step.value++
}

/** Back to any step already passed; never forward past one not yet checked. */
function goTo(index: number) {
	if (index >= 0 && index < step.value) step.value = index
}

function leave() {
	router.push({ name: "members.companies" })
}

async function submit() {
	if (!(await validateStep())) return

	isSubmitting.value = true
	serverErrors.value = {}
	try {
		const payload: CompanyPayload = {
			private_office_request_id: form.value.private_office_request_id,
			legal_name: form.value.legal_name.trim(),
			contract_ref: form.value.contract_ref.trim(),
			space_id: form.value.space_id,
			starts_on: form.value.starts_on,
			duration_months: Number(form.value.duration_months),
			billing_cycle_months: Number(form.value.billing_cycle_months),
			monthly_amount: String(form.value.monthly_amount).trim(),
			currency: form.value.currency,
			auto_renew: Boolean(form.value.auto_renew)
		}
		if (selectedRequest.value?.provider_id && form.value.billed_to) {
			payload.billed_to = form.value.billed_to
		}

		const company = await createCompany(payload)
		message.success(t("officeLeases.create.success"))
		router.push({ name: "members.companyProfile", params: { id: company.id } })
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		const errors = (caught.status === 422 ? caught.data?.errors : undefined) as Record<string, string[]> | undefined
		if (errors && Object.keys(errors).length) {
			serverErrors.value = errors
			// Back to the earliest step holding a refused field, where it is shown.
			const steps = Object.keys(errors).map(field => STEPS.indexOf(FIELD_STEP[field] ?? "terms"))
			step.value = Math.min(...steps)
		} else {
			message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		}
	} finally {
		isSubmitting.value = false
	}
}

onMounted(async () => {
	isLoading.value = true
	try {
		const [loadedRequests, loadedSpaces, loadedCurrencies] = await Promise.all([
			listPrivateOfficeRequests(),
			listSpaces(),
			listCurrencies()
		])
		requests.value = loadedRequests
		spaces.value = loadedSpaces
		currencies.value = loadedCurrencies
		form.value.currency = loadedCurrencies.find(c => c.is_base)?.code ?? form.value.currency
	} catch {
		// The lists feed the selects: an empty select with no word would read as "no offices".
		message.error(t("companies.createPage.loadError"))
	} finally {
		isLoading.value = false
	}
})
</script>
