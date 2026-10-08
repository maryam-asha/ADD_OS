<template>
	<div class="page page-wrapped flex flex-col gap-8">
		<div class="flex items-center justify-between">
			<h1 class="text-2xl font-bold tracking-tight text-slate-900">{{ t('nav.pages.planPurchases', 'شحن الخطط') }}</h1>
		</div>

		<div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
			<n-card class="lg:col-span-8" :title="t('Plan Details', 'تفاصيل الباقة')">
				<n-form ref="formRef" :model="form" :rules size="large">
					<n-form-item :label="t('Recipient Type', 'المالك')" path="recipientType">
						<n-radio-group v-model:value="recipientType" name="recipient_type">
							<n-radio-button value="user">{{ t('Member', 'عضو') }}</n-radio-button>
							<n-radio-button value="company">{{ t('Company', 'شركة') }}</n-radio-button>
						</n-radio-group>
					</n-form-item>

					<n-form-item v-if="recipientType === 'user'" :label="t('Member', 'عضو')" path="user_id">
						<n-select
							v-model:value="form.user_id"
							:options="userOptions"
							filterable
							:placeholder="t('Select member', 'اختر العضو')"
							:loading="isLoadingUsers"
							clearable
						/>
					</n-form-item>

					<n-form-item v-if="recipientType === 'company'" :label="t('Company', 'شركة')" path="company_id">
						<n-select
							v-model:value="form.company_id"
							:options="companyOptions"
							filterable
							:placeholder="t('Select company', 'اختر الشركة')"
							:loading="isLoadingCompanies"
							clearable
						/>
					</n-form-item>

					<n-form-item :label="t('Plan', 'الباقة')" path="plan_id">
						<n-select
							v-model:value="form.plan_id"
							:options="planOptions"
							filterable
							:placeholder="t('Select plan', 'اختر الباقة')"
							:loading="isLoadingPlans"
							clearable
						/>
					</n-form-item>

					<n-form-item :label="t('Payment Method', 'طريقة الدفع')" path="payment_method">
						<n-radio-group v-model:value="form.payment_method" name="payment_method">
							<n-radio-button value="cash">{{ t('Cash', 'كاش') }}</n-radio-button>
							<n-radio-button value="wallet" :disabled="!walletCovers">{{ t('From Points', 'من رصيد النقاط') }}</n-radio-button>
						</n-radio-group>
					</n-form-item>

					<n-form-item
						v-if="recipientType === 'user'"
						:label="t('Coupon Code', 'كود الخصم')"
						:feedback="couponError ?? undefined"
						:validation-status="couponError ? 'error' : undefined"
					>
						<div class="flex w-full gap-2">
							<n-input
								v-model:value="couponInput"
								:placeholder="t('Code the member brought (optional)', 'الكود الذي أحضره العضو (اختياري)')"
								:disabled="appliedCoupon !== null"
								data-test="coupon-input"
								@keyup.enter="applyCoupon"
							/>
							<n-button v-if="appliedCoupon === null" :disabled="!couponInput.trim() || !isValid" data-test="coupon-apply" @click="applyCoupon">
								{{ t('Apply', 'تطبيق') }}
							</n-button>
							<n-button v-else data-test="coupon-remove" @click="removeCoupon">
								{{ t('Remove', 'إزالة') }}
							</n-button>
						</div>
					</n-form-item>

					<n-form-item v-if="form.payment_method === 'cash'" :label="t('Currency', 'العملة')" path="currency">
						<n-select
							v-model:value="form.currency"
							:options="currencyOptions"
							:placeholder="t('Select currency', 'اختر العملة')"
							:loading="isLoadingCurrencies"
						/>
					</n-form-item>
				</n-form>
			</n-card>

			<div class="flex flex-col gap-6 lg:col-span-4">
				<n-card :title="t('Summary', 'ملخص الطلب')">
					<div class="flex flex-col gap-4">
						<div class="flex items-center justify-between">
							<span class="text-slate-500">{{ t('Current Balance', 'الرصيد الحالي') }}</span>
							<span class="font-medium">
								<template v-if="isLoadingBalance">...</template>
								<template v-else>{{ currentBalancePoints !== null ? `${currentBalancePoints} points` : '-' }}</template>
							</span>
						</div>

						<div v-if="previewData" class="flex flex-col gap-3 rounded-lg bg-slate-50 p-4 border border-slate-200">
							<div class="flex items-center justify-between text-sm">
								<span class="text-slate-500">{{ t('Plan Price', 'سعر الباقة') }}</span>
								<span class="font-medium" :class="{ 'line-through text-slate-400': previewData.points < previewData.list_points }">
									{{ previewData.list_points }} points
								</span>
							</div>
							<div v-if="previewData.offer" class="flex flex-col gap-1 rounded-md bg-emerald-50 p-2 text-sm text-emerald-700" data-test="plan-offer">
								<div class="flex items-center justify-between gap-2">
									<span class="font-semibold">{{ previewData.offer.name || t('Offer', 'عرض') }}</span>
									<span class="font-semibold" dir="ltr">−{{ previewData.offer.saved_points }} points</span>
								</div>
								<div class="flex items-center justify-between gap-2 text-xs">
									<span>{{ offerTerms(previewData.offer) }}</span>
									<span v-if="previewData.offer.ends_at">{{ t('Ends', 'ينتهي') }} {{ formatDate(previewData.offer.ends_at) }}</span>
								</div>
							</div>
							<div v-if="previewData.coupon" data-test="plan-coupon">
								<div v-if="previewData.coupon.applied" class="flex items-center justify-between rounded-md bg-emerald-50 p-2 text-sm text-emerald-700">
									<span class="font-semibold">{{ t('Coupon', 'كوبون') }} {{ previewData.coupon.code }}</span>
									<span class="font-semibold" dir="ltr">−{{ previewData.coupon.points_discounted }} points</span>
								</div>
								<div v-else class="rounded-md bg-amber-50 p-2 text-xs text-amber-700">
									{{ t('Coupon', 'كوبون') }} {{ previewData.coupon.code }}: {{ previewData.coupon.message }}
								</div>
							</div>
							<div v-if="previewData.points < previewData.list_points" class="flex items-center justify-between text-sm font-semibold text-emerald-600">
								<span>{{ t('Final Price', 'السعر النهائي') }}</span>
								<span class="font-bold">{{ previewData.points }} points</span>
							</div>
							<div v-if="form.payment_method === 'cash'" class="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 font-semibold">
								<span>{{ t('Required Amount (Cash)', 'المبلغ المطلوب استلامه (كاش)') }}</span>
								<span class="text-lg text-emerald-600">
									{{ formatCurrency(previewData.payment_amount, previewData.payment_currency) }}
								</span>
							</div>
							<template v-else>
								<div class="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 font-semibold">
									<span>{{ t('Deducted from Points', 'يُخصم من رصيد النقاط') }}</span>
									<span class="text-lg text-emerald-600">{{ previewData.points }} points</span>
								</div>
								<div class="flex items-center justify-between text-sm">
									<span class="text-slate-500">{{ t('Balance After', 'الرصيد بعد الشراء') }}</span>
									<span class="font-medium">{{ previewData.balance_points - previewData.points }} points</span>
								</div>
							</template>
							<div v-if="!previewData.wallet_covers" class="text-xs text-slate-500">
								{{ t('Points do not cover this plan — cash only.', 'رصيد النقاط لا يكفي لهذه الباقة — الدفع كاش فقط.') }}
							</div>
						</div>
						<div v-else-if="previewError" class="rounded-lg bg-red-50 p-4 text-sm text-red-700">
							{{ previewError }}
						</div>

						<n-button
							type="primary"
							size="large"
							block
							:loading="isSubmitting"
							:disabled="!isValid || !!previewError"
							@click="submit"
						>
							{{ t('Purchase Plan', 'تفعيل الباقة') }}
						</n-button>
					</div>
				</n-card>
			</div>
		</div>

		<!-- Receipt Modal -->
		<n-modal v-model:show="receiptModalVisible" preset="card" class="max-w-md" :title="t('Receipt', 'إيصال')">
			<div v-if="lastReceipt" class="flex flex-col gap-4 p-4">
				<div class="text-center font-bold text-xl mb-4">{{ t('Payment Receipt', 'إيصال دفع') }}</div>

				<div class="flex justify-between border-b pb-2">
					<span class="text-slate-500">{{ t('Transaction Code', 'رقم الحركة') }}</span>
					<span class="font-medium">{{ lastReceipt.transaction_code }}</span>
				</div>

				<div class="flex justify-between border-b pb-2">
					<span class="text-slate-500">{{ t('Plan', 'الباقة') }}</span>
					<span class="font-medium">{{ lastReceipt.plan_name }}</span>
				</div>

				<div class="flex justify-between border-b pb-2">
					<span class="text-slate-500">{{ t('Amount Paid', 'المبلغ المدفوع') }}</span>
					<span class="font-bold">
						<template v-if="lastReceipt.payment_amount !== null && lastReceipt.payment_currency">
							{{ formatCurrency(lastReceipt.payment_amount, lastReceipt.payment_currency) }}
						</template>
						<template v-else>{{ t('Paid from Points', 'مدفوع من رصيد النقاط') }}</template>
					</span>
				</div>

				<div v-if="lastReceipt.discounts?.length" class="flex justify-between gap-4 border-b pb-2" data-test="receipt-discounts">
					<span class="text-slate-500">{{ t('Discounts', 'الحسومات') }}</span>
					<AppliedDiscountList :discounts="lastReceipt.discounts" />
				</div>

				<div class="flex justify-between border-b pb-2">
					<span class="text-slate-500">{{ t('Points Charged', 'النقاط المشحونة') }}</span>
					<span class="font-medium">{{ lastReceipt.points_charged }}</span>
				</div>

				<div class="flex justify-between border-b pb-2">
					<span class="text-slate-500">{{ t('Recipient', 'المستلم') }}</span>
					<span class="font-medium">{{ lastReceipt.recipient_name }}</span>
				</div>

				<div class="flex justify-between border-b pb-2">
					<span class="text-slate-500">{{ t('Performed By', 'تمت بواسطة') }}</span>
					<span class="font-medium">{{ lastReceipt.performed_by_name }}</span>
				</div>

				<div class="flex justify-between border-b pb-2">
					<span class="text-slate-500">{{ t('Previous Balance', 'الرصيد السابق') }}</span>
					<span class="font-medium">{{ lastReceipt.previous_balance_points }}</span>
				</div>

				<div class="flex justify-between border-b pb-2">
					<span class="text-slate-500">{{ t('New Balance', 'الرصيد الجديد') }}</span>
					<span class="font-medium">{{ lastReceipt.new_balance_points }}</span>
				</div>

				<div class="flex justify-between pt-4">
					<n-button @click="closeReceiptModal">{{ t('Close', 'إغلاق') }}</n-button>
					<n-button type="primary" @click="handlePrintReceipt">{{ t('Print', 'طباعة') }}</n-button>
				</div>
			</div>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { FormInst, FormRules } from "naive-ui"
import type { PlanPurchaseOffer, PlanPurchasePaymentMethod, PlanPurchasePreview, PlanPurchasePreviewPayload, PlanPurchaseReceipt } from "@/add-os/services/reception"
import { NButton, NCard, NForm, NFormItem, NInput, NModal, NRadioButton, NRadioGroup, NSelect, useMessage } from "naive-ui"
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import AppliedDiscountList from "@/add-os/modules/pricing/components/AppliedDiscountList.vue"
import { ApiError } from "@/add-os/services/api"
import { listCompanies } from "@/add-os/services/companies"
import { listCurrencies } from "@/add-os/services/currencies"
import { listPlans } from "@/add-os/services/plans"
import { executePlanPurchase, previewPlanPurchase } from "@/add-os/services/reception"
import { listUsers } from "@/add-os/services/users"
import { getWalletBalance } from "@/add-os/services/wallet-top-ups"
import { DEFAULT_CURRENCY } from "@/add-os/utils/format/currency"
import { formatDate } from "@/add-os/utils/format/dates"
import { useCurrencyStore } from "@/stores/currency"

function formatCurrency(amount: number, currency: string) {
    return `${amount.toLocaleString()} ${currency}`
}

const { t, locale } = useI18n()
const message = useMessage()
const currencyStore = useCurrencyStore()

const formRef = ref<FormInst | null>(null)

const recipientType = ref<"user" | "company">("user")

const form = ref({
    user_id: null as number | null,
    company_id: null as number | null,
    plan_id: null as number | null,
    currency: currencyStore.currency || DEFAULT_CURRENCY,
    payment_method: "cash" as PlanPurchasePaymentMethod
})

const rules = computed<FormRules>(() => ({
    user_id: { required: recipientType.value === 'user', type: 'number', message: 'Required', trigger: ['change'] },
    company_id: { required: recipientType.value === 'company', type: 'number', message: 'Required', trigger: ['change'] },
    plan_id: { required: true, type: 'number', message: 'Required', trigger: ['change'] },
    currency: { required: form.value.payment_method === 'cash', message: 'Required', trigger: ['change'] }
}))

const isValid = computed(() => {
    if (!form.value.plan_id) return false
    if (form.value.payment_method === 'cash' && !form.value.currency) return false
    if (recipientType.value === 'user' && !form.value.user_id) return false
    if (recipientType.value === 'company' && !form.value.company_id) return false
    return true
})

const userOptions = ref<{ label: string, value: number }[]>([])
const companyOptions = ref<{ label: string, value: number }[]>([])
const planOptions = ref<{ label: string, value: number }[]>([])
const currencyOptions = ref<{ label: string, value: string }[]>([])

const isLoadingUsers = ref(false)
const isLoadingCompanies = ref(false)
const isLoadingPlans = ref(false)
const isLoadingCurrencies = ref(false)

const currentBalancePoints = ref<number | null>(null)
const isLoadingBalance = ref(false)

const previewData = ref<PlanPurchasePreview | null>(null)
const previewError = ref<string | null>(null)
let previewTimeout: ReturnType<typeof setTimeout> | null = null

// Points are offered only when they pay for the whole plan — never mixed
// with cash (the backend refuses a short wallet anyway).
const walletCovers = computed(() => previewData.value?.wallet_covers === true)

// The code typed, and the one sent: a code is sent only once "Apply" is
// pressed, so the preview is not re-run on every keystroke.
const couponInput = ref("")
const appliedCoupon = ref<string | null>(null)
const couponError = ref<string | null>(null)

/** The request body for both preview and purchase; currency is cash's only. */
function buildPayload(): PlanPurchasePreviewPayload {
    return {
        plan_id: form.value.plan_id!,
        payment_method: form.value.payment_method,
        ...(form.value.payment_method === "cash" ? { currency: form.value.currency } : {}),
        ...(recipientType.value === "user" ? { user_id: form.value.user_id } : { company_id: form.value.company_id }),
        // A coupon is the member's own: never sent for a company.
        ...(recipientType.value === "user" && appliedCoupon.value !== null ? { coupon_code: appliedCoupon.value } : {})
    }
}

function applyCoupon() {
    const code = couponInput.value.trim()
    if (!code || !isValid.value) return
    appliedCoupon.value = code
    couponError.value = null
    schedulePreview()
}

function clearCoupon() {
    couponInput.value = ""
    appliedCoupon.value = null
    couponError.value = null
}

function removeCoupon() {
    clearCoupon()
    schedulePreview()
}

/** `Discount 20%`, `Discount 50 points` or `Special Price 400 points` — the offer's terms. */
function offerTerms(offer: PlanPurchaseOffer): string {
    switch (offer.discount_type) {
        case "percentage":
            return `${t("Discount", "خصم")} ${offer.discount_value}%`
        case "amount_off":
            return `${t("Discount", "خصم")} ${offer.discount_value} points`
        default:
            return `${t("Special Price", "سعر خاص")} ${offer.discount_value} points`
    }
}

const isSubmitting = ref(false)
const receiptModalVisible = ref(false)
const lastReceipt = ref<PlanPurchaseReceipt | null>(null)

onMounted(() => {
    fetchUsers()
    fetchCompanies()
    fetchPlans()
    fetchCurrencies()
})

async function fetchUsers() {
    isLoadingUsers.value = true
    try {
        const users = await listUsers({ role: "member" })
        userOptions.value = users.map(u => ({ label: u.name, value: u.id }))
    } catch {
        // Handle error quietly
    } finally {
        isLoadingUsers.value = false
    }
}

async function fetchCompanies() {
    isLoadingCompanies.value = true
    try {
        const companies = await listCompanies()
        companyOptions.value = companies
            .filter(c => c.status === "active")
            .map(c => ({ label: c.legal_name, value: c.id }))
    } catch {
        // Handle error quietly
    } finally {
        isLoadingCompanies.value = false
    }
}

async function fetchPlans() {
    isLoadingPlans.value = true
    try {
        const plans = await listPlans({ per_page: 100 })
        const list = Array.isArray(plans) ? plans : (plans as any).data || []
        planOptions.value = list
            .filter((p: any) => p.is_active && p.is_subscription)
            .map((p: any) => ({ label: p.name[locale.value as 'ar' | 'en'] || p.name.ar || p.name.en, value: p.id }))
    } catch (e) {
        console.error(e)
    } finally {
        isLoadingPlans.value = false
    }
}

async function fetchCurrencies() {
    isLoadingCurrencies.value = true
    try {
        const currencies = await listCurrencies()
        currencyOptions.value = currencies.map(c => ({ label: c.code, value: c.code }))
    } catch {
        // Handle error quietly
    } finally {
        isLoadingCurrencies.value = false
    }
}

async function fetchBalance() {
    if ((recipientType.value === 'user' && !form.value.user_id) ||
        (recipientType.value === 'company' && !form.value.company_id)) {
        currentBalancePoints.value = null
        return
    }

    const params = recipientType.value === "user"
        ? { user_id: form.value.user_id! }
        : { company_id: form.value.company_id! }

    isLoadingBalance.value = true
    try {
        const res = await getWalletBalance(params)
        currentBalancePoints.value = res.balance_points
    } catch {
        currentBalancePoints.value = null
    } finally {
        isLoadingBalance.value = false
    }
}

function cancelPendingPreview() {
    if (previewTimeout) clearTimeout(previewTimeout)
    previewTimeout = null
}

function resetPreview() {
    cancelPendingPreview()
    previewData.value = null
    previewError.value = null
}

function schedulePreview() {
    resetPreview()
    if (!isValid.value) return

    previewTimeout = setTimeout(async () => {
        try {
            previewData.value = await previewPlanPurchase(buildPayload())
        } catch (caught) {
            // A coupon that cannot be used (`reason` set): said beside the
            // code, which is dropped, and the price shown again without it.
            const reason = caught instanceof ApiError ? (caught.data as { reason?: string } | undefined)?.reason : undefined
            if (reason && appliedCoupon.value !== null) {
                couponError.value = caught instanceof ApiError ? (caught.data?.message ?? null) : null
                appliedCoupon.value = null
                schedulePreview()
                return
            }
            if (caught instanceof ApiError) {
                previewError.value = caught.data?.message || caught.message
            } else {
                previewError.value = "Failed to load preview"
            }
        }
    }, 500)
}

watch([() => form.value.user_id, () => form.value.company_id], () => {
    fetchBalance()
})

watch([() => form.value.plan_id, () => form.value.currency, () => form.value.user_id, () => form.value.company_id], () => {
    schedulePreview()
})

// A new owner or plan may leave points that no longer cover it: back to cash.
watch(walletCovers, (covers) => {
    if (!covers && form.value.payment_method === "wallet") form.value.payment_method = "cash"
})

watch(recipientType, (type) => {
    clearCoupon()
    if (type === "user") form.value.company_id = null
    else form.value.user_id = null
    resetPreview()
    formRef.value?.restoreValidation()
})

onBeforeUnmount(cancelPendingPreview)

async function submit() {
    try {
        await formRef.value?.validate()
    } catch {
        return
    }

    if (!isValid.value) return

    isSubmitting.value = true
    try {
        const res = await executePlanPurchase(buildPayload())
        lastReceipt.value = res
        receiptModalVisible.value = true
        message.success(t('walletTopUps.submit.success', 'Purchased successfully'))

        form.value.plan_id = null
        form.value.payment_method = "cash"
        clearCoupon()
        resetPreview()
        fetchBalance()
    } catch (caught) {
        if (caught instanceof ApiError) {
            message.error(caught.data?.message || caught.message)
        } else {
            message.error("Failed to purchase plan")
        }
    } finally {
        isSubmitting.value = false
    }
}

function closeReceiptModal() {
    receiptModalVisible.value = false
}

function handlePrintReceipt() {
    window.print()
}
</script>
