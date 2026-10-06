<!-- src/add-os/modules/pricing/components/CouponFormDrawer.vue -->
<!--
	Create or edit one coupon. Every save sends the whole coupon — the server
	requires code, type and value on an update too — and edit mode is seeded
	from the detail endpoint, the only read that carries the member list.
-->
<template>
	<!-- The same card dialog every other create/edit form opens in; wider, for the rule rows. -->
	<n-modal
		v-model:show="show"
		preset="card"
		:title
		closable
		style="max-width: 40rem"
		content-style="max-height: 60vh; overflow-y: auto"
	>
		<n-spin :show="loading">
			<n-alert v-if="grouped.other.length || loadFailed" type="error" :bordered="false" class="mb-4" data-test="coupon-form-other-errors">
				<div v-if="loadFailed">{{ t("coupons.form.loadError") }}</div>
				<div v-for="text in grouped.other" :key="text">{{ text }}</div>
			</n-alert>

			<n-form label-placement="top" class="flex flex-col gap-2">
				<h3 class="font-semibold">{{ t("coupons.form.basics") }}</h3>
				<!-- An offer has no code: it applies itself. -->
				<n-form-item v-if="!form.is_automatic" :label="t('coupons.form.code')" v-bind="fieldState('code')">
					<!-- Typed by hand, or generated: either way the server judges it. -->
					<n-input-group>
						<n-input :value="form.code" :maxlength="40" dir="ltr" @update:value="(value: string) => (form.code = value.toUpperCase())" />
						<n-button data-test="coupon-code-generate" @click="form.code = generateCouponCode()">
							<template #icon><Icon name="carbon:shuffle" :size="16" /></template>
							{{ t("coupons.form.generateCode") }}
						</n-button>
					</n-input-group>
				</n-form-item>
				<n-text v-if="!form.is_automatic" depth="3" class="text-xs -mt-2 mb-2">{{ t("coupons.form.codeHint") }}</n-text>
				<n-form-item v-for="key in BILINGUAL" :key :label="t(`coupons.form.${key}`)">
					<div class="flex w-full flex-col gap-1">
						<div class="flex w-full gap-2">
							<n-input v-model:value="form[key]!.ar" :placeholder="t('resourceCrud.form.arabicPlaceholder')" :status="grouped.fields[`${key}.ar`] ? 'error' : undefined" :type="key === 'description' ? 'textarea' : 'text'" dir="rtl" />
							<n-input v-model:value="form[key]!.en" :placeholder="t('resourceCrud.form.englishPlaceholder')" :status="grouped.fields[`${key}.en`] ? 'error' : undefined" :type="key === 'description' ? 'textarea' : 'text'" dir="ltr" />
						</div>
						<n-text v-for="locale in ['ar', 'en']" v-show="grouped.fields[`${key}.${locale}`]" :key="locale" type="error" class="text-xs">
							{{ grouped.fields[`${key}.${locale}`]?.[0] }}
						</n-text>
					</div>
				</n-form-item>
				<n-form-item :label="t('coupons.form.isActive')"><n-switch v-model:value="form.is_active" /></n-form-item>

				<h3 class="font-semibold">{{ t("coupons.form.discount") }}</h3>
				<n-form-item :label="t('coupons.form.discountType')" v-bind="fieldState('discount_type')">
					<n-radio-group v-model:value="form.discount_type">
						<n-radio value="percentage">{{ t("coupons.form.percentage") }}</n-radio>
						<n-radio value="amount_off">{{ t("coupons.form.amountOff") }}</n-radio>
						<n-radio v-if="form.is_automatic" value="fixed_price" data-test="coupon-fixed-price">{{ t("coupons.form.fixedPrice") }}</n-radio>
					</n-radio-group>
				</n-form-item>
				<n-text v-if="form.discount_type === 'fixed_price'" depth="3" class="text-xs -mt-2 mb-2">{{ t("coupons.form.fixedPriceHint") }}</n-text>
				<div class="grid grid-cols-2 gap-3">
					<n-form-item :label="t('coupons.form.discountValue')" v-bind="fieldState('discount_value')">
						<n-input-number v-model:value="form.discount_value" :min="1" :max="form.discount_type === 'percentage' ? 100 : undefined" :precision="0" class="w-full" />
					</n-form-item>
					<n-form-item v-if="form.discount_type === 'percentage'" :label="t('coupons.form.maxDiscount')" v-bind="fieldState('max_discount_points')">
						<n-input-number v-model:value="form.max_discount_points" :min="1" :precision="0" clearable class="w-full" />
					</n-form-item>
				</div>

				<h3 class="font-semibold">{{ t("coupons.form.conditions") }}</h3>
				<n-form-item :label="t('coupons.form.minAmount')" :feedback="fieldState('min_amount_points').feedback ?? t('coupons.form.minAmountHint')" :validation-status="fieldState('min_amount_points')['validation-status']">
					<n-input-number v-model:value="form.min_amount_points" :min="0" :precision="0" clearable class="w-full" />
				</n-form-item>
				<!-- Whether it stacks on an offer means nothing for an offer itself. -->
				<n-form-item v-if="!form.is_automatic" :label="t('coupons.form.combinable')"><n-switch v-model:value="form.combinable_with_offers" /></n-form-item>

				<h3 class="font-semibold">{{ t("coupons.form.limits") }}</h3>
				<!-- An offer is usually just a window: its limits wait behind a toggle. -->
				<n-button v-if="!limitsShown" text type="primary" class="self-start" data-test="coupon-limits-toggle" @click="limitsShown = true">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("coupons.form.limitsToggle") }}
				</n-button>
				<div v-else class="grid grid-cols-2 gap-3">
					<n-form-item :label="t('coupons.form.usageLimit')" v-bind="fieldState('usage_limit')">
						<div class="flex w-full flex-col gap-1">
							<n-input-number v-model:value="form.usage_limit" :min="1" :precision="0" :disabled="form.usage_unlimited" class="w-full" />
							<n-checkbox v-model:checked="form.usage_unlimited">{{ t("coupons.form.unlimited") }}</n-checkbox>
						</div>
					</n-form-item>
					<n-form-item :label="t('coupons.form.perUserLimit')" v-bind="fieldState('per_user_limit')">
						<div class="flex w-full flex-col gap-1">
							<n-input-number v-model:value="form.per_user_limit" :min="1" :precision="0" :disabled="form.per_user_unlimited" class="w-full" />
							<n-checkbox v-model:checked="form.per_user_unlimited">{{ t("coupons.form.unlimited") }}</n-checkbox>
						</div>
					</n-form-item>
				</div>

				<h3 class="font-semibold">{{ t("coupons.form.eligibility") }}</h3>
				<n-form-item :label="t('coupons.form.newMembersOnly')"><n-switch v-model:value="form.new_members_only" /></n-form-item>
				<n-form-item :label="t('coupons.form.company')" v-bind="fieldState('company_id')">
					<n-select v-model:value="form.company_id" :options="pickers.companies.value" filterable clearable />
				</n-form-item>
				<n-form-item :label="t('coupons.form.users')" :feedback="fieldState('user_ids').feedback ?? t('coupons.form.usersHint')" :validation-status="fieldState('user_ids')['validation-status']">
					<n-select v-model:value="form.user_ids" :options="pickers.users.value" multiple filterable clearable />
				</n-form-item>

				<h3 class="font-semibold">{{ t("coupons.form.validity") }}</h3>
				<n-form-item :label="t('coupons.form.startsAt')" v-bind="fieldState('starts_at')"><DateTimeInput v-model="form.starts_at" /></n-form-item>
				<n-form-item :label="t('coupons.form.endsAt')" v-bind="fieldState('ends_at')"><DateTimeInput v-model="form.ends_at" /></n-form-item>

				<h3 class="font-semibold">{{ t("coupons.form.targets") }}</h3>
				<n-text v-if="grouped.fields.targets" type="error" class="text-xs" data-test="coupon-targets-error">{{ grouped.fields.targets[0] }}</n-text>
				<n-text v-if="!form.targets.length" depth="3" class="text-sm">{{ t("coupons.form.targetsEmpty") }}</n-text>
				<div v-for="(row, index) in form.targets" :key="index" class="flex flex-col gap-1 rounded-lg border border-[var(--border-color)] p-2">
					<div class="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
						<n-select :value="row.purpose" :options="purposeOptions" :placeholder="t('coupons.form.purpose')" size="small" @update:value="(value: PricingPurpose) => setPurpose(row, value)" />
						<n-select :value="row.itemKey" :options="itemKindOptions(row)" :placeholder="t('coupons.form.itemKind')" :disabled="!row.purpose" size="small" clearable @update:value="(value: TargetItemKey | null) => setItemKey(row, value)" />
						<n-select v-model:value="row.itemValue" :options="row.itemKey ? pickers.optionsFor(row.itemKey) : []" :placeholder="t('coupons.form.item')" :disabled="!row.itemKey" filterable size="small" />
						<n-button quaternary circle size="small" :aria-label="t('coupons.form.removeTarget')" @click="form.targets.splice(index, 1)">
							<template #icon><Icon name="carbon:close" :size="16" /></template>
						</n-button>
					</div>
					<n-text v-if="grouped.targets[index]" type="error" class="text-xs" :data-test="`coupon-target-error-${index}`">
						<div v-for="text in grouped.targets[index]" :key="text">{{ text }}</div>
					</n-text>
				</div>
				<n-button dashed size="small" @click="form.targets.push({ purpose: null, itemKey: null, itemValue: null })">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("coupons.form.addTarget") }}
				</n-button>
			</n-form>
		</n-spin>
		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("coupons.form.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" data-test="coupon-form-save" @click="submit">{{ t("coupons.form.save") }}</n-button>
			</div>
		</template>
	</n-modal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { PricingPurpose, TargetItemKey } from "@/add-os/modules/pricing/types/coupon"
import type { CouponForm, TargetRow } from "@/add-os/modules/pricing/utils/coupon-form"
import { NAlert, NButton, NCheckbox, NForm, NFormItem, NInput, NInputGroup, NInputNumber, NModal, NRadio, NRadioGroup, NSelect, NSpin, NSwitch, NText, useMessage } from "naive-ui"
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
/** Error keys this form has a place for; anything else goes to the top alert. */
const KNOWN = ["code", "name.ar", "name.en", "description.ar", "description.en", "discount_type", "discount_value", "max_discount_points", "min_amount_points", "usage_limit", "per_user_limit", "company_id", "user_ids", "starts_at", "ends_at", "targets"]

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

function fieldState(key: string): { "feedback"?: string, "validation-status"?: "error" } {
	const list = grouped.value.fields[key]
	return list?.length ? { "feedback": list[0], "validation-status": "error" } : {}
}

/** A coupon is titled by its code; an offer, which has none, by its name. */
const title = computed(() => {
	if (!form.value.is_automatic) return props.couponId ? t("coupons.form.editTitle", { code: form.value.code }) : t("coupons.form.createTitle")
	return props.couponId ? t("coupons.form.editOfferTitle", { name: pickLocalized(form.value.name ?? { ar: "", en: "" }, currentLocale.value) }) : t("coupons.form.createOfferTitle")
})

const purposeOptions = computed<SelectOption[]>(() => PRICING_PURPOSES.map(value => ({ label: t(`pricing.purpose.${value}`), value })))
function itemKindOptions(row: TargetRow): SelectOption[] {
	return row.purpose ? ITEM_KEYS_BY_PURPOSE[row.purpose].map(key => ({ label: t(`pricing.item.${key}`), value: key })) : []
}
/** A new purpose clears the item: the old one may not be something it buys. */
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
		// A 422 lands field by field; anything else is shown as the server worded it.
		errors.value = caught.status === 422 && caught.data?.errors ? caught.data.errors : { _: [caught.data?.message ?? t("coupons.form.loadError")] }
	} finally {
		saving.value = false
	}
}

defineExpose({ form, submit })
</script>
