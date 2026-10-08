<template>
	<n-modal
		v-model:show="show"
		mask-closable
		class="!p-0"
	>
		<div class="bg-white rounded-2xl shadow-xl overflow-hidden border border-neutral-200/80 w-[92vw] max-w-[680px] flex flex-col max-h-[85vh]">
			<!-- Header -->
			<div class="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between bg-white shrink-0">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-lg bg-[#f0f7ee] text-[#4d783f] border border-[#d6e8d2] flex items-center justify-center shrink-0">
						<Icon :name="couponId ? 'carbon:edit' : 'carbon:add'" :size="16" />
					</div>
					<div class="flex flex-col">
						<h2 class="text-sm md:text-base font-bold text-neutral-800 leading-tight">
							{{ title }}
						</h2>
					</div>
				</div>
				<button type="button" class="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 flex items-center justify-center transition-colors cursor-pointer shrink-0" @click="show = false">
					<Icon name="carbon:close" :size="16" />
				</button>
			</div>

			<!-- Tabs -->
			<div class="flex items-center justify-start gap-6 border-b border-neutral-100 px-5 pt-1.5 bg-white shrink-0 overflow-x-auto">
				<button type="button" class="pb-2.5 px-1 text-xs md:text-sm font-semibold transition-all cursor-pointer border-b-2 whitespace-nowrap" :class="[activeTab === 'basic' ? 'border-[#557e46] text-[#557e46]' : 'border-transparent text-neutral-500 hover:text-neutral-800']" @click="activeTab = 'basic'">
					{{ t('coupons.form.basics') }}
				</button>
				<button type="button" class="pb-2.5 px-1 text-xs md:text-sm font-semibold transition-all cursor-pointer border-b-2 whitespace-nowrap" :class="[activeTab === 'conditions' ? 'border-[#557e46] text-[#557e46]' : 'border-transparent text-neutral-500 hover:text-neutral-800']" @click="activeTab = 'conditions'">
					{{ t('coupons.form.conditions') }} & {{ t('coupons.form.limits') }}
				</button>
				<button type="button" class="pb-2.5 px-1 text-xs md:text-sm font-semibold transition-all cursor-pointer border-b-2 flex items-center gap-1.5 whitespace-nowrap" :class="[activeTab === 'targets' ? 'border-[#557e46] text-[#557e46]' : 'border-transparent text-neutral-500 hover:text-neutral-800']" @click="activeTab = 'targets'">
					<span>{{ t('coupons.form.targets') }}</span>
					<span class="px-2 py-0.5 text-[11px] rounded-full bg-[#eef7ec] text-[#47743b] font-bold leading-none">{{ form.targets.length }}</span>
				</button>
			</div>

			<div class="overflow-y-auto flex-1 p-4 md:p-5 bg-[#faf9f8] flex flex-col gap-3.5">
				<n-spin :show="loading">
					<n-alert v-if="grouped.other.length || loadFailed" type="error" :bordered="false" class="mb-4">
						<div v-if="loadFailed">{{ t('coupons.form.loadError') }}</div>
						<div v-for="text in grouped.other" :key="text">{{ text }}</div>
					</n-alert>

					<!-- Tab: Basic -->
					<div v-show="activeTab === 'basic'" class="flex flex-col gap-3.5">
						<div class="border border-neutral-200/70 rounded-xl p-3.5 bg-white flex flex-col gap-3 shadow-2xs">
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-2 text-xs md:text-sm font-bold text-neutral-800">
									<div class="w-6 h-6 rounded-md bg-[#eef7ec] text-[#4d783f] flex items-center justify-center shrink-0">
										<Icon name="carbon:tag" :size="14" />
									</div>
									<span>{{ t('coupons.form.basics') }}</span>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-xs font-semibold text-neutral-600">{{ t('coupons.form.isActive') }}</span>
									<n-switch v-model:value="form.is_active" size="small" />
								</div>
							</div>

							<!-- An offer has no code: it applies itself. -->
							<div v-if="!form.is_automatic" class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('coupons.form.code') }} *</span>
								<n-input-group>
									<n-input :value="form.code" :maxlength="40" dir="ltr" :status="grouped.fields.code ? 'error' : undefined" @update:value="(v: string) => (form.code = v.toUpperCase())" />
									<n-button @click="form.code = generateCouponCode()">
										<template #icon><Icon name="carbon:shuffle" :size="16" /></template>
										{{ t('coupons.form.generateCode') }}
									</n-button>
								</n-input-group>
								<span class="text-xs text-neutral-400">{{ t('coupons.form.codeHint') }}</span>
								<span v-if="grouped.fields.code" class="text-xs text-red-500">{{ grouped.fields.code[0] }}</span>
							</div>

							<div v-for="key in BILINGUAL" :key class="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div class="flex flex-col gap-1">
									<span class="text-xs font-semibold text-neutral-600">{{ t(`coupons.form.${key}`) }} (عربي)</span>
									<n-input v-model:value="form[key]!.ar" :type="key === 'description' ? 'textarea' : 'text'" dir="rtl" :status="grouped.fields[`${key}.ar`] ? 'error' : undefined" />
									<span v-if="grouped.fields[`${key}.ar`]" class="text-xs text-red-500">{{ grouped.fields[`${key}.ar`][0] }}</span>
								</div>
								<div class="flex flex-col gap-1">
									<span class="text-xs font-semibold text-neutral-600">{{ t(`coupons.form.${key}`) }} (English)</span>
									<n-input v-model:value="form[key]!.en" :type="key === 'description' ? 'textarea' : 'text'" dir="ltr" :status="grouped.fields[`${key}.en`] ? 'error' : undefined" />
									<span v-if="grouped.fields[`${key}.en`]" class="text-xs text-red-500">{{ grouped.fields[`${key}.en`][0] }}</span>
								</div>
							</div>
						</div>

						<div class="border border-neutral-200/70 rounded-xl p-3.5 bg-white flex flex-col gap-3 shadow-2xs">
							<div class="flex items-center gap-2 text-xs md:text-sm font-bold text-neutral-800">
								<div class="w-6 h-6 rounded-md bg-[#eef2fb] text-[#3f5b8f] flex items-center justify-center shrink-0">
									<Icon name="carbon:time" :size="14" />
								</div>
								<span>{{ t('coupons.form.validity') }}</span>
							</div>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div class="flex flex-col gap-1">
									<span class="text-xs font-semibold text-neutral-600">{{ t('coupons.form.startsAt') }}</span>
									<DateTimeInput v-model="form.starts_at" />
									<span v-if="grouped.fields.starts_at" class="text-xs text-red-500">{{ grouped.fields.starts_at[0] }}</span>
								</div>
								<div class="flex flex-col gap-1">
									<span class="text-xs font-semibold text-neutral-600">{{ t('coupons.form.endsAt') }}</span>
									<DateTimeInput v-model="form.ends_at" />
									<span v-if="grouped.fields.ends_at" class="text-xs text-red-500">{{ grouped.fields.ends_at[0] }}</span>
								</div>
							</div>
						</div>
						<div class="border border-neutral-200/70 rounded-xl p-3.5 bg-white flex flex-col gap-3 shadow-2xs">
							<div class="flex items-center gap-2 text-xs md:text-sm font-bold text-neutral-800">
								<div class="w-6 h-6 rounded-md bg-[#fdf3e9] text-[#cf7024] flex items-center justify-center shrink-0">
									<Icon name="carbon:percentage" :size="14" />
								</div>
								<span>{{ t('coupons.form.discount') }}</span>
							</div>

							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('coupons.form.discountType') }}</span>
								<n-radio-group v-model:value="form.discount_type">
									<n-radio value="percentage">{{ t('coupons.form.percentage') }}</n-radio>
									<n-radio value="amount_off">{{ t('coupons.form.amountOff') }}</n-radio>
									<n-radio v-if="form.is_automatic" value="fixed_price" data-test="coupon-fixed-price">{{ t('coupons.form.fixedPrice') }}</n-radio>
								</n-radio-group>
								<span v-if="form.discount_type === 'fixed_price'" class="text-xs text-neutral-400">{{ t('coupons.form.fixedPriceHint') }}</span>
								<span v-if="grouped.fields.discount_type" class="text-xs text-red-500">{{ grouped.fields.discount_type[0] }}</span>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
								<div class="flex flex-col gap-1">
									<span class="text-xs font-semibold text-neutral-600">{{ t('coupons.form.discountValue') }}</span>
									<n-input-number v-model:value="form.discount_value" :min="1" :max="form.discount_type === 'percentage' ? 100 : undefined" :precision="0" :status="grouped.fields.discount_value ? 'error' : undefined" />
									<span v-if="grouped.fields.discount_value" class="text-xs text-red-500">{{ grouped.fields.discount_value[0] }}</span>
								</div>
								<div v-if="form.discount_type === 'percentage'" class="flex flex-col gap-1">
									<span class="text-xs font-semibold text-neutral-600">{{ t('coupons.form.maxDiscount') }}</span>
									<n-input-number v-model:value="form.max_discount_points" :min="1" :precision="0" clearable :status="grouped.fields.max_discount_points ? 'error' : undefined" />
									<span v-if="grouped.fields.max_discount_points" class="text-xs text-red-500">{{ grouped.fields.max_discount_points[0] }}</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Tab: Conditions -->
					<div v-show="activeTab === 'conditions'" class="flex flex-col gap-3.5">
						<div class="border border-neutral-200/70 rounded-xl p-3.5 bg-white flex flex-col gap-3 shadow-2xs">
							<div class="flex items-center gap-2 text-xs md:text-sm font-bold text-neutral-800">
								<div class="w-6 h-6 rounded-md bg-[#ebf3fd] text-[#2c75d8] flex items-center justify-center shrink-0">
									<Icon name="carbon:rule" :size="14" />
								</div>
								<span>{{ t('coupons.form.conditions') }} & {{ t('coupons.form.limits') }}</span>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div class="flex flex-col gap-1">
									<span class="text-xs font-semibold text-neutral-600">{{ t('coupons.form.minAmount') }}</span>
									<n-input-number v-model:value="form.min_amount_points" :min="0" :precision="0" clearable :status="grouped.fields.min_amount_points ? 'error' : undefined" />
									<span class="text-[11px] text-neutral-500">{{ grouped.fields.min_amount_points ? grouped.fields.min_amount_points[0] : t('coupons.form.minAmountHint') }}</span>
								</div>
							</div>

							<!-- Whether it stacks on an offer means nothing for an offer itself. -->
							<div v-if="!form.is_automatic" class="flex items-center justify-between gap-2 p-2 px-3 bg-neutral-50 rounded-lg border border-neutral-100 mt-2">
								<span class="text-xs font-semibold text-neutral-700">{{ t('coupons.form.combinable') }}</span>
								<n-switch v-model:value="form.combinable_with_offers" size="small" />
							</div>

							<n-button v-if="!limitsShown" text type="primary" size="small" class="mt-4 self-start" data-test="coupon-limits-toggle" @click="limitsShown = true">
								<template #icon><Icon name="carbon:add" :size="14" /></template>
								{{ t('coupons.form.limitsToggle') }}
							</n-button>
							<div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
								<div class="flex flex-col gap-1 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
									<div class="flex items-center justify-between mb-2">
										<span class="text-xs font-semibold text-neutral-700">{{ t('coupons.form.usageLimit') }}</span>
										<n-checkbox v-model:checked="form.usage_unlimited" size="small">{{ t('coupons.form.unlimited') }}</n-checkbox>
									</div>
									<n-input-number v-model:value="form.usage_limit" :min="1" :precision="0" :disabled="form.usage_unlimited" :status="grouped.fields.usage_limit ? 'error' : undefined" />
									<span v-if="grouped.fields.usage_limit" class="text-xs text-red-500">{{ grouped.fields.usage_limit[0] }}</span>
								</div>

								<div class="flex flex-col gap-1 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
									<div class="flex items-center justify-between mb-2">
										<span class="text-xs font-semibold text-neutral-700">{{ t('coupons.form.perUserLimit') }}</span>
										<n-checkbox v-model:checked="form.per_user_unlimited" size="small">{{ t('coupons.form.unlimited') }}</n-checkbox>
									</div>
									<n-input-number v-model:value="form.per_user_limit" :min="1" :precision="0" :disabled="form.per_user_unlimited" :status="grouped.fields.per_user_limit ? 'error' : undefined" />
									<span v-if="grouped.fields.per_user_limit" class="text-xs text-red-500">{{ grouped.fields.per_user_limit[0] }}</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Tab: Targets -->
					<div v-show="activeTab === 'targets'" class="flex flex-col gap-3.5">
						<div class="border border-neutral-200/70 rounded-xl p-3.5 bg-white flex flex-col gap-3 shadow-2xs">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2 text-xs md:text-sm font-bold text-neutral-800">
									<div class="w-6 h-6 rounded-md bg-[#fef1f1] text-[#e04545] flex items-center justify-center shrink-0">
										<Icon name="carbon:bullseye" :size="14" />
									</div>
									<span>{{ t('coupons.form.targets') }}</span>
								</div>
								<button type="button" class="h-8 px-3 text-xs font-semibold rounded-lg bg-[#f0f7ee] hover:bg-[#e4f1e1] text-[#4d783f] border border-[#d6e8d2] flex items-center gap-1.5 transition-colors" @click="form.targets.push({ purpose: null, itemKey: null, itemValue: null })">
									<Icon name="carbon:add" :size="14" />
									<span>{{ t('coupons.form.addTarget') }}</span>
								</button>
							</div>

							<span v-if="grouped.fields.targets" class="text-xs text-red-500" data-test="coupon-targets-error">{{ grouped.fields.targets[0] }}</span>

							<div v-if="!form.targets.length" class="py-10 text-center text-neutral-400 bg-white rounded-xl border border-dashed border-neutral-200 text-xs">
								{{ t('coupons.form.targetsEmpty') }}
							</div>

							<div v-for="(row, index) in form.targets" :key="index" class="flex flex-col gap-2 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
								<div class="flex items-center justify-between mb-1">
									<span class="text-xs font-semibold text-neutral-600">Target {{ index + 1 }}</span>
									<button type="button" class="w-6 h-6 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors" @click="form.targets.splice(index, 1)">
										<Icon name="carbon:trash-can" :size="14" />
									</button>
								</div>
								<div class="grid grid-cols-1 md:grid-cols-3 gap-2">
									<n-select :value="row.purpose" :options="purposeOptions" :placeholder="t('coupons.form.purpose')" size="small" @update:value="(v: PricingPurpose) => setPurpose(row, v)" />
									<n-select :value="row.itemKey" :options="itemKindOptions(row)" :placeholder="t('coupons.form.itemKind')" :disabled="!row.purpose" size="small" clearable @update:value="(v: TargetItemKey | null) => setItemKey(row, v)" />
									<n-select v-model:value="row.itemValue" :options="row.itemKey ? pickers.optionsFor(row.itemKey) : []" :placeholder="t('coupons.form.item')" :disabled="!row.itemKey" filterable size="small" />
								</div>
								<span v-if="grouped.targets[index]" class="text-xs text-red-500">
									<div v-for="text in grouped.targets[index]" :key="text">{{ text }}</div>
								</span>
							</div>
						</div>

						<div class="border border-neutral-200/70 rounded-xl p-3.5 bg-white flex flex-col gap-3 shadow-2xs">
							<div class="flex items-center gap-2 text-xs md:text-sm font-bold text-neutral-800">
								<div class="w-6 h-6 rounded-md bg-[#fdf3e9] text-[#cf7024] flex items-center justify-center shrink-0">
									<Icon name="carbon:user-multiple" :size="14" />
								</div>
								<span>{{ t('coupons.form.eligibility') }}</span>
							</div>

							<div class="flex items-center justify-between gap-2 p-2 px-3 bg-neutral-50 rounded-lg border border-neutral-100">
								<span class="text-xs font-semibold text-neutral-700">{{ t('coupons.form.newMembersOnly') }}</span>
								<n-switch v-model:value="form.new_members_only" size="small" />
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
								<div class="flex flex-col gap-1">
									<span class="text-xs font-semibold text-neutral-600">{{ t('coupons.form.company') }}</span>
									<n-select v-model:value="form.company_id" :options="pickers.companies.value" filterable clearable :status="grouped.fields.company_id ? 'error' : undefined" />
									<span v-if="grouped.fields.company_id" class="text-xs text-red-500">{{ grouped.fields.company_id[0] }}</span>
								</div>
								<div class="flex flex-col gap-1">
									<span class="text-xs font-semibold text-neutral-600">{{ t('coupons.form.users') }}</span>
									<n-select v-model:value="form.user_ids" :options="pickers.users.value" multiple filterable clearable :status="grouped.fields.user_ids ? 'error' : undefined" />
									<span class="text-[11px] text-neutral-500">{{ grouped.fields.user_ids ? grouped.fields.user_ids[0] : t('coupons.form.usersHint') }}</span>
								</div>
							</div>
						</div>
					</div>
				</n-spin>
			</div>

			<!-- Footer -->
			<div class="p-3.5 px-5 border-t border-neutral-100 bg-white flex items-center justify-between gap-3 shrink-0">
				<button type="button" class="h-9 px-5 rounded-lg border border-neutral-200 text-xs md:text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors" @click="show = false">
					{{ t('coupons.form.cancel') }}
				</button>
				<button type="button" :disabled="saving" class="h-9 px-6 rounded-lg bg-[#557e46] hover:bg-[#476a3a] text-white text-xs md:text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2 min-w-[130px]" @click="submit">
					<Icon v-if="saving" name="carbon:circle-dash" class="animate-spin" :size="16" />
					<span>{{ t('coupons.form.save') }}</span>
				</button>
			</div>
		</div>
	</n-modal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { PricingPurpose, TargetItemKey } from "@/add-os/modules/pricing/types/coupon"
import type { CouponForm, TargetRow } from "@/add-os/modules/pricing/utils/coupon-form"
import { NAlert, NButton, NCheckbox, NInput, NInputGroup, NInputNumber, NModal, NRadio, NRadioGroup, NSelect, NSpin, NSwitch, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import DateTimeInput from "@/add-os/components/form/DateTimeInput.vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { usePricingPickers } from "@/add-os/modules/pricing/composables/usePricingPickers"
import { ITEM_KEYS_BY_PURPOSE, PRICING_PURPOSES } from "@/add-os/modules/pricing/types/coupon"
import { generateCouponCode } from "@/add-os/modules/pricing/utils/coupon-code"
import { couponToForm, emptyCouponForm, formToPayload, groupErrors, hasLimits, missingLimits } from "@/add-os/modules/pricing/utils/coupon-form"
import { ApiError } from "@/add-os/services/api"
import { createCoupon, getCoupon, updateCoupon } from "@/add-os/services/coupons"
import Icon from "@/components/common/Icon.vue"

/** `automatic`: a new one is an offer. Editing reads it from the coupon itself. */
const props = withDefaults(defineProps<{ couponId: number | null, automatic?: boolean }>(), { automatic: false })
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const pickers = usePricingPickers()

const BILINGUAL = ["name", "description"] as const
const KNOWN = ["code", "name.ar", "name.en", "description.ar", "description.en", "discount_type", "discount_value", "max_discount_points", "min_amount_points", "usage_limit", "per_user_limit", "company_id", "user_ids", "starts_at", "ends_at", "targets"]

const activeTab = ref<'basic' | 'conditions' | 'targets'>('basic')

const form = ref<CouponForm>(emptyCouponForm())
const errors = ref<Record<string, string[]>>({})
const grouped = computed(() => groupErrors(errors.value, KNOWN))
const loading = ref(false)
/**
 * Whether the limits are on screen. An offer is usually just a window, so a
 * new one keeps them folded behind a toggle; one already limited shows them.
 * A typed coupon always shows them.
 */
const limitsShown = ref(true)
const loadFailed = ref(false)
const saving = ref(false)

/** A coupon is titled by its code; an offer, which has none, by its name. */
const title = computed(() => {
	if (!form.value.is_automatic) return props.couponId ? t("coupons.form.editTitle", { code: form.value.code }) : t("coupons.form.createTitle")
	return props.couponId ? t("coupons.form.editOfferTitle", { name: pickLocalized(form.value.name ?? { ar: "", en: "" }, currentLocale.value) }) : t("coupons.form.createOfferTitle")
})

const purposeOptions = computed<SelectOption[]>(() => PRICING_PURPOSES.map(value => ({ label: t(`pricing.purpose.${value}`), value })))
function itemKindOptions(row: TargetRow): SelectOption[] {
	return row.purpose ? ITEM_KEYS_BY_PURPOSE[row.purpose].map(key => ({ label: t(`pricing.item.${key}`), value: key })) : []
}
function setPurpose(row: TargetRow, purpose: PricingPurpose): void {
	row.purpose = purpose
	row.itemKey = null
	row.itemValue = null
}
function setItemKey(row: TargetRow, key: TargetItemKey | null): void {
	row.itemKey = key
	row.itemValue = null
}

async function open(): Promise<void> {
	activeTab.value = 'basic'
	errors.value = {}
	loadFailed.value = false
	form.value = emptyCouponForm(props.automatic)
	loading.value = true
	try {
		await pickers.load()
		if (props.couponId !== null) form.value = couponToForm(await getCoupon(props.couponId))
		limitsShown.value = !form.value.is_automatic || hasLimits(form.value)
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		loadFailed.value = true
	} finally {
		loading.value = false
	}
}

watch(show, (visible) => {
	if (visible) void open()
}, { immediate: true })

async function submit(): Promise<void> {
	errors.value = {}
	const missing = missingLimits(form.value)
	if (missing.length) {
		errors.value = Object.fromEntries(missing.map(key => [key, [t("coupons.form.limitRequired")]]))
		return
	}
	saving.value = true
	try {
		const payload = formToPayload(form.value)
		if (props.couponId === null) {
			await createCoupon(payload)
			message.success(t("coupons.form.saved"))
		} else {
			message.success((await updateCoupon(props.couponId, payload)).message)
		}
		emit("saved")
		show.value = false
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		errors.value = caught.status === 422 && caught.data?.errors ? caught.data.errors : { _: [caught.data?.message ?? t("coupons.form.loadError")] }
	} finally {
		saving.value = false
	}
}

defineExpose({ form, submit })
</script>
