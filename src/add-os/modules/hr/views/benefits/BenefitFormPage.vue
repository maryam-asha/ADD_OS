<!-- src/add-os/modules/hr/views/benefits/BenefitFormPage.vue -->
<template>
	<HrFormPage
		:title="isEdit ? t('hrBenefits.benefits.edit') : t('hrBenefits.benefits.add')"
		:description="isEdit && benefit ? `${translated(benefit.name)} · ${benefit.code}` : t('hrBenefits.benefits.formDescription')"
		:eyebrow="t('nav.pages.hrBenefits')"
		:back-to="{ name: 'hrPay.hrBenefits' }"
		:back-label="t('hrBenefits.benefits.backToList')"
		:loading
		:error="loadError"
	>
		<n-form ref="formRef" :model="form" :rules label-placement="top" class="flex flex-col gap-5">
			<HrPanel :title="t('hrBenefits.benefits.basics')" :subtitle="benefit ? t('hrBenefits.benefits.fixedOnceCreated') : t(`hrBenefits.kindHint.${form.kind}`)" icon="carbon:gift">
				<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
					<n-form-item :label="t('hrPayroll.components.nameAr')" path="nameAr">
						<n-input v-model:value="form.nameAr" dir="rtl" :maxlength="255" />
					</n-form-item>
					<n-form-item :label="t('hrPayroll.components.nameEn')">
						<n-input v-model:value="form.nameEn" dir="ltr" :maxlength="255" />
					</n-form-item>
					<n-form-item :label="t('hrBenefits.benefits.descriptionAr')" path="descriptionAr">
						<n-input v-model:value="form.descriptionAr" type="textarea" dir="rtl" :maxlength="255" :autosize="{ minRows: 2, maxRows: 4 }" />
					</n-form-item>
					<n-form-item :label="t('hrBenefits.benefits.descriptionEn')">
						<n-input v-model:value="form.descriptionEn" type="textarea" dir="ltr" :maxlength="255" :autosize="{ minRows: 2, maxRows: 4 }" />
					</n-form-item>
					<n-form-item :label="t('hr.org.code')" path="code">
						<n-input v-model:value="form.code" dir="ltr" :maxlength="32" class="font-mono" :disabled="!!benefit" />
					</n-form-item>
					<n-form-item :label="t('hrBenefits.kindLabel')">
						<n-select v-model:value="form.kind" :options="kindOptions" :disabled="!!benefit" />
					</n-form-item>
				</div>
			</HrPanel>

			<HrPanel :title="t('hrBenefits.benefits.valuePanel')" icon="carbon:currency">
				<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
					<n-form-item :label="t('hrBenefits.frequencyLabel')">
						<n-select v-model:value="form.frequency" :options="frequencyOptions" :disabled="!!benefit" />
					</n-form-item>
					<n-form-item v-if="form.frequency === 'yearly'" :label="t('hrBenefits.benefits.grantMonth')">
						<n-select v-model:value="form.grantMonth" :options="monthOptions" clearable :placeholder="monthName(1)" />
					</n-form-item>
					<n-form-item :label="inKind ? t('hrBenefits.benefits.points') : t('hrBenefits.amount')" path="amount">
						<n-input-number v-model:value="form.amount" :min="inKind ? 1 : 0.01" :max="9999999999" :precision="inKind ? 0 : undefined" :show-button="false" class="w-full" />
					</n-form-item>
					<n-form-item v-if="!inKind" :label="t('hrPayroll.currency')" path="currency">
						<CurrencySelect v-model:value="form.currency" />
					</n-form-item>
					<n-form-item v-if="form.kind === 'cash_allowance'" :label="t('hrBenefits.benefits.payComponent')" path="payComponentId" :feedback="t('hrBenefits.benefits.payComponentHint')" class="@xl:col-span-2">
						<n-select v-model:value="form.payComponentId" :options="allowanceOptions" :disabled="!!benefit" />
					</n-form-item>
					<template v-if="inKind">
						<n-form-item :label="t('hrBenefits.benefits.walletPocket')">
							<n-select v-model:value="form.category" :options="categoryOptions" />
						</n-form-item>
						<n-form-item v-if="form.category !== 'general'" :label="t('hrBenefits.benefits.expiresAfter')">
							<n-input-number v-model:value="form.expiresAfterDays" :min="1" :max="366" :precision="0" clearable class="w-full" :placeholder="t('hrBenefits.benefits.endOfPeriod')" />
						</n-form-item>
						<p class="text-xs text-secondary @xl:col-span-2">{{ t("hrBenefits.benefits.walletHint") }}</p>
					</template>
				</div>
			</HrPanel>

			<HrPanel :title="t('hrBenefits.benefits.eligibilityPanel')" icon="carbon:user-certification">
				<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
					<template v-if="form.kind !== 'cash_allowance'">
						<n-form-item :label="t('hrBenefits.employerCost')">
							<n-input-number v-model:value="form.employerCost" :min="0" :max="9999999999" :show-button="false" clearable class="w-full" />
						</n-form-item>
						<n-form-item :label="t('hrBenefits.benefits.costCurrency')" path="costCurrency">
							<CurrencySelect v-model:value="form.costCurrency" clearable />
						</n-form-item>
					</template>
					<n-form-item :label="t('hrBenefits.benefits.eligibleAfter')">
						<n-input-number v-model:value="form.eligibleAfterDays" :min="0" :max="3650" :precision="0" class="w-full">
							<template #suffix>{{ t("hrBenefits.benefits.days") }}</template>
						</n-input-number>
					</n-form-item>
					<n-form-item :label="t('hr.common.status')">
						<n-checkbox v-model:checked="form.isActive">{{ t("hr.common.active") }}</n-checkbox>
					</n-form-item>
				</div>
			</HrPanel>
		</n-form>

		<template #actions>
			<n-button @click="leave">{{ t("hr.common.cancel") }}</n-button>
			<n-button type="primary" :loading="saving" @click="save">
				<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
				{{ t("hr.common.save") }}
			</n-button>
		</template>
	</HrFormPage>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { Benefit, BenefitFrequency, BenefitKind, BenefitPayload, WalletCategory } from "@/add-os/modules/hr/types/benefits"
import type { PayComponent } from "@/add-os/modules/hr/types/payroll"
import { NButton, NCheckbox, NForm, NFormItem, NInput, NInputNumber, NSelect, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import { currentLocale } from "@/add-os/lang/currentLocale"
import CurrencySelect from "@/add-os/modules/hr/components/payroll/CurrencySelect.vue"
import HrFormPage from "@/add-os/modules/hr/components/ui/HrFormPage.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { BENEFIT_FREQUENCIES, BENEFIT_KINDS, IN_KIND_UNIT, WALLET_CATEGORIES } from "@/add-os/modules/hr/types/benefits"
import { apiErrorMessage, quietly, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { centerName } from "@/add-os/modules/hr/utils/timesheets"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { createBenefit, getBenefit, updateBenefit } from "@/add-os/services/hr/benefits"
import { listPayComponents } from "@/add-os/services/hr/payroll"
import { MONTHS } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * A benefit: what it is (a cash allowance paid through payroll, wallet
 * points, or an entitlement recorded for its cost), how often it is granted
 * and what it is worth. Its code, kind, frequency, currency and pay
 * component are fixed once it exists. Rules mirror StoreBenefitRequest; the
 * in-kind fields follow ADD's wallet fulfiller (whole points, a pocket, an
 * optional expiry), which the server checks again.
 *
 * A page of its own (hr.benefits.manage): `:id` edits one, without it a new
 * one. A cash allowance names its pay component; reading them needs
 * hr.payroll.view, so that list may stay empty. Until 2026-11-09 this was
 * BenefitModal: see docs/hr/FORMS-AS-PAGES.md.
 */
const { t } = useI18n()
const message = useMessage()
const route = useRoute()
const router = useRouter()

const editId = route.params.id === undefined ? null : Number(route.params.id)
const isEdit = editId !== null
const benefit = ref<Benefit | null>(null)
const payComponents = ref<PayComponent[]>([])
const loading = ref(isEdit)
const loadError = ref<string | null>(null)
const formRef = ref<FormInst | null>(null)
const saving = ref(false)
const CODE_PATTERN = /^[\p{L}\p{N}_-]{1,32}$/u

function emptyForm() {
	return {
		nameAr: "",
		nameEn: "",
		descriptionAr: "",
		descriptionEn: "",
		code: "",
		kind: "cash_allowance" as BenefitKind,
		frequency: "monthly" as BenefitFrequency,
		grantMonth: null as number | null,
		amount: null as number | null,
		currency: null as string | null,
		payComponentId: null as number | null,
		category: "general" as WalletCategory,
		expiresAfterDays: null as number | null,
		employerCost: null as number | null,
		costCurrency: null as string | null,
		eligibleAfterDays: 0 as number | null,
		isActive: true
	}
}
const form = ref(emptyForm())

function fill(b: Benefit) {
	form.value = {
				nameAr: b.name.ar ?? "",
				nameEn: b.name.en ?? "",
				descriptionAr: b.description?.ar ?? "",
				descriptionEn: b.description?.en ?? "",
				code: b.code,
				kind: b.kind,
				frequency: b.frequency,
				grantMonth: b.grant_month,
				amount: Number.parseFloat(b.amount),
				currency: b.currency,
				payComponentId: b.pay_component_id,
				category: b.fulfillment?.category ?? "general",
				expiresAfterDays: b.fulfillment?.expires_after_days ?? null,
				employerCost: b.employer_cost === null ? null : Number.parseFloat(b.employer_cost),
				costCurrency: b.cost_currency,
				eligibleAfterDays: b.eligible_after_days,
				isActive: b.is_active
			}
}

onMounted(async () => {
	void quietly(listPayComponents, list => (payComponents.value = list))
	if (editId === null) return
	try {
		benefit.value = await getBenefit(editId)
		fill(benefit.value)
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
})

function leave() {
	void router.push({ name: "hrPay.hrBenefits" })
}

const inKind = computed(() => form.value.kind === "in_kind_credit")

const kindOptions = computed<SelectOption[]>(() => BENEFIT_KINDS.map(k => ({ label: t(`hrBenefits.kind.${k}`), value: k })))
const frequencyOptions = computed<SelectOption[]>(() => BENEFIT_FREQUENCIES.map(f => ({ label: t(`hrBenefits.frequency.${f}`), value: f })))
const monthName = (m: number) => MONTHS[currentLocale.value][m - 1]
const monthOptions = computed<SelectOption[]>(() => MONTHS[currentLocale.value].map((name, i) => ({ label: name, value: i + 1 })))
const categoryOptions = computed<SelectOption[]>(() => WALLET_CATEGORIES.map(c => ({ label: t(`packages.balances.categories.${c}`), value: c })))
/** The server accepts only an earning paid by the benefit-allowance calculator on every payslip. */
const allowanceOptions = computed<SelectOption[]>(() =>
	payComponents.value
		.filter(c => c.id === form.value.payComponentId || (c.kind === "earning" && c.calculator === "benefit_allowance" && c.applies_to_all))
		.map(c => ({ label: centerName(c), value: c.id }))
)

const rules = computed<FormRules>(() => ({
	nameAr: { required: true, trigger: ["blur", "input"], validator: (_r: unknown, v: string) => !!v?.trim(), message: t("hr.common.arabicRequired", { field: t("hrPayroll.components.name") }) },
	code: { required: true, trigger: ["blur", "input"], validator: (_r: unknown, v: string) => CODE_PATTERN.test((v ?? "").trim()), message: t("hrPayroll.codeRule") },
	descriptionAr: {
		trigger: ["blur", "input"],
		validator: () => !form.value.descriptionEn.trim() || !!form.value.descriptionAr.trim(),
		message: t("hr.common.arabicRequired", { field: t("hrBenefits.benefits.description") })
	},
	amount: { required: true, trigger: ["blur", "change"], validator: () => !!form.value.amount, message: t("hr.common.required") },
	currency: { required: true, trigger: ["blur", "change"], validator: () => inKind.value || !!form.value.currency, message: t("hr.common.required") },
	payComponentId: { required: true, trigger: ["blur", "change"], validator: () => form.value.kind !== "cash_allowance" || !!form.value.payComponentId, message: t("hr.common.required") },
	costCurrency: { trigger: ["blur", "change"], validator: () => form.value.employerCost === null || !!form.value.costCurrency, message: t("hrBenefits.benefits.costCurrencyNeeded") }
}))

/** No Arabic text means no description: the English alone is refused by the rule above. */
function description() {
	const f = form.value
	return f.descriptionAr.trim() ? { ar: f.descriptionAr.trim(), en: f.descriptionEn.trim() || null } : null
}

/** What the kind allows: a currency and pay component for cash, points and a pocket in kind, a cost for anything not paid in cash. */
function payload(): BenefitPayload {
	const f = form.value
	const base: BenefitPayload = {
		name: { ar: f.nameAr.trim(), en: f.nameEn.trim() || null },
		description: description(),
		amount: f.amount as number,
		eligible_after_days: f.eligibleAfterDays ?? 0,
		is_active: f.isActive
	}
	if (f.frequency === "yearly") base.grant_month = f.grantMonth
	if (f.kind !== "cash_allowance") {
		base.employer_cost = f.employerCost
		base.cost_currency = f.employerCost === null ? null : f.costCurrency
	}
	if (f.kind === "in_kind_credit") base.fulfillment = { category: f.category, ...(f.category !== "general" ? { expires_after_days: f.expiresAfterDays } : {}) }
	// An update takes a description or leaves it out; it cannot be sent empty.
	if (benefit.value) {
		if (base.description === null) delete base.description
		return base
	}
	return {
		...base,
		code: f.code.trim(),
		kind: f.kind,
		frequency: f.frequency,
		...(f.kind === "in_kind_credit" ? { unit: IN_KIND_UNIT } : { currency: f.currency }),
		...(f.kind === "cash_allowance" ? { pay_component_id: f.payComponentId } : {})
	}
}

async function save() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}
	saving.value = true
	try {
		if (editId !== null) {
			message.success(serverMessage(await updateBenefit(editId, payload()), t("hrBenefits.benefits.updated")))
		} else {
			await createBenefit(payload())
			message.success(t("hrBenefits.benefits.created"))
		}
		leave()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
