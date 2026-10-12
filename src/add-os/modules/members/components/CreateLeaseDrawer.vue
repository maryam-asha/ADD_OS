<!-- src/add-os/modules/members/components/CreateLeaseDrawer.vue -->
<template>
	<n-drawer v-model:show="show" :width="540" placement="right">
		<n-drawer-content :title="t('privateOfficeRequests.createLease.title')" closable>
			<div v-if="request" class="flex flex-col gap-4">
				<!-- Context banner -->
				<div class="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border border-black/5 dark:border-white/5 text-xs flex flex-col gap-1">
					<div class="flex items-center justify-between">
						<span class="text-neutral-500">{{ t('privateOfficeRequests.columns.company') }}:</span>
						<span class="font-semibold">{{ request.company?.legal_name || request.prospect_name }}</span>
					</div>
					<div v-if="request.quote_ref" class="flex items-center justify-between">
						<span class="text-neutral-500">{{ t('privateOfficeRequests.markAsQuoted.quoteRefLabel') }}:</span>
						<span class="font-semibold">{{ request.quote_ref }}</span>
					</div>
					<div v-if="request.provider" class="flex items-center justify-between">
						<span class="text-neutral-500">{{ t('officeLeases.detail.provider') }}:</span>
						<span class="font-semibold">{{ request.provider.name }}</span>
					</div>
				</div>

				<n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
					<n-form-item path="contract_ref" :label="t('officeLeases.create.contractRef')">
						<n-input v-model:value="form.contract_ref" placeholder="C-2026-..." />
					</n-form-item>

					<!-- Office Selection: any branch -->
					<n-form-item path="space_id" :label="t('officeLeases.create.space')">
						<n-select
							v-model:value="form.space_id"
							:options="officeOptions"
							:loading="isLoadingSpaces"
							:placeholder="t('officeLeases.create.selectSpace')"
							filterable
						/>
					</n-form-item>

					<!-- Dates and duration -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<n-form-item path="starts_on" :label="t('officeLeases.create.startsOn')">
							<n-date-picker
								v-model:formatted-value="form.starts_on"
								value-format="yyyy-MM-dd"
								type="date"
								class="w-full"
							/>
						</n-form-item>

						<n-form-item path="duration_months" :label="t('officeLeases.create.durationMonths')">
							<n-input-number
								v-model:value="form.duration_months"
								:min="1"
								:max="120"
								class="w-full"
								@update:value="onDurationChanged"
							/>
						</n-form-item>
					</div>

					<!-- Billing Cycle -->
					<n-form-item path="billing_cycle_months" :label="t('officeLeases.create.billingCycleMonths')">
						<n-select
							v-model:value="form.billing_cycle_months"
							:options="billingCycleOptions"
						/>
					</n-form-item>

					<!-- Pricing: Monthly Amount & Currency -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<n-form-item path="monthly_amount" :label="t('officeLeases.create.monthlyAmount')">
							<n-input v-model:value="form.monthly_amount" placeholder="500.00" />
						</n-form-item>

						<n-form-item path="currency" :label="t('officeLeases.create.currency')">
							<n-select
								v-model:value="form.currency"
								:options="currencyOptions"
								:loading="isLoadingCurrencies"
							/>
						</n-form-item>
					</div>

					<!-- Billed To (Payer) - only for provider's company -->
					<n-form-item v-if="request.provider_id" path="billed_to" :label="t('officeLeases.create.billedTo')">
						<n-select
							v-model:value="form.billed_to"
							:options="payerOptions"
						/>
					</n-form-item>

					<!-- Auto-renew -->
					<div class="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border border-black/5 dark:border-white/5 mt-2">
						<div class="flex flex-col gap-0.5">
							<span class="text-sm font-semibold">{{ t('officeLeases.create.autoRenew') }}</span>
							<span class="text-xs text-neutral-500">{{ form.auto_renew ? t('officeLeases.detail.autoRenewYes') : t('officeLeases.detail.autoRenewNo') }}</span>
						</div>
						<n-switch v-model:value="form.auto_renew" />
					</div>
				</n-form>
			</div>

			<template #footer>
				<div class="flex justify-end gap-3">
					<n-button @click="show = false">{{ t('resourceCrud.form.cancel') }}</n-button>
					<n-button type="primary" :loading="isSubmitting" @click="handleSubmit">
						{{ t('resourceCrud.form.submit') }}
					</n-button>
				</div>
			</template>
		</n-drawer-content>
	</n-drawer>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { PrivateOfficeRequest } from "../types/private-office-request"
import type { CreateLeaseFromRequestPayload } from "../types/office-lease"
import type { Space } from "@/add-os/modules/spatial/types/space"
import type { Currency } from "@/add-os/modules/payments/types/currency"
import { NButton, NDatePicker, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch, useMessage } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { createLeaseFromRequest } from "@/add-os/services/office-leases"
import { listCurrencies } from "@/add-os/services/currencies"
import { listSpaces } from "@/add-os/services/spaces"
import { ApiError } from "@/add-os/services/api"

const props = defineProps<{ request: PrivateOfficeRequest | null }>()
const show = defineModel<boolean>("show", { required: true })
const emit = defineEmits<{ (e: "created"): void }>()

const { t } = useI18n()
const message = useMessage()
const formRef = ref<FormInst | null>(null)

const spaces = ref<Space[]>([])
const currencies = ref<Currency[]>([])
const isLoadingSpaces = ref(false)
const isLoadingCurrencies = ref(false)
const isSubmitting = ref(false)

const todayStr = () => new Date().toISOString().slice(0, 10)

const form = ref<CreateLeaseFromRequestPayload>({
	contract_ref: "",
	space_id: null as any,
	starts_on: todayStr(),
	duration_months: 12,
	billing_cycle_months: 3,
	monthly_amount: "",
	currency: "USD",
	billed_to: "provider",
	auto_renew: true
})

const officeOptions = computed<SelectOption[]>(() =>
	spaces.value
		.filter(s => s.space_type === "business")
		.map(s => ({
			label: `${pickLocalized(s.name, currentLocale.value) || `Space #${s.id}`}${s.status !== "active" ? ` (${s.status})` : ""}`,
			value: s.id
		}))
)

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

async function loadDependencies() {
	isLoadingSpaces.value = true
	isLoadingCurrencies.value = true
	try {
		const [sps, currs] = await Promise.all([listSpaces(), listCurrencies()])
		spaces.value = sps
		currencies.value = currs
	} catch {
		// silent
	} finally {
		isLoadingSpaces.value = false
		isLoadingCurrencies.value = false
	}
}

watch(show, visible => {
	if (visible && props.request) {
		loadDependencies()
		form.value = {
			contract_ref: "",
			space_id: null as any,
			starts_on: todayStr(),
			duration_months: 12,
			billing_cycle_months: 3,
			monthly_amount: "",
			currency: currencies.value.find(c => c.is_base)?.code || "USD",
			billed_to: props.request.payer ?? "provider",
			auto_renew: true
		}
	}
})

onMounted(() => {
	if (show.value) loadDependencies()
})

const rules: FormRules = {
	contract_ref: { required: true, message: t("officeLeases.create.contractRef"), trigger: ["blur", "input"] },
	space_id: { type: "number", required: true, message: t("officeLeases.create.selectSpace"), trigger: ["blur", "change"] },
	starts_on: { required: true, message: t("officeLeases.create.startsOn"), trigger: ["blur", "change"] },
	duration_months: { type: "number", required: true, message: t("officeLeases.create.durationMonths"), trigger: ["blur", "change"] },
	billing_cycle_months: { type: "number", required: true, message: t("officeLeases.create.billingCycleMonths"), trigger: ["blur", "change"] },
	monthly_amount: { required: true, message: t("officeLeases.create.monthlyAmount"), trigger: ["blur", "input"] },
	currency: { required: true, message: t("officeLeases.create.currency"), trigger: ["blur", "change"] }
}

async function handleSubmit() {
	if (!props.request) return
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	isSubmitting.value = true
	try {
		const payload: CreateLeaseFromRequestPayload = {
			contract_ref: form.value.contract_ref,
			space_id: form.value.space_id,
			starts_on: form.value.starts_on,
			duration_months: Number(form.value.duration_months),
			billing_cycle_months: Number(form.value.billing_cycle_months),
			monthly_amount: String(form.value.monthly_amount),
			currency: form.value.currency,
			auto_renew: Boolean(form.value.auto_renew)
		}
		if (props.request.provider_id && form.value.billed_to) {
			payload.billed_to = form.value.billed_to
		}

		await createLeaseFromRequest(props.request.id, payload)
		message.success(t("privateOfficeRequests.createLease.success"))
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
