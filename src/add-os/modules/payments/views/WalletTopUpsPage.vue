<!-- src/add-os/modules/payments/views/WalletTopUpsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.walletTopUps") }}</h1>
			<p>{{ t("walletTopUps.description") }}</p>
		</div>

		<n-alert v-if="loadError" type="error" :title="t('walletTopUps.loadError')" />

		<n-card class="max-w-md">
			<n-form ref="formRef" :model="form" :rules label-placement="top">
				<n-form-item :label="t('walletTopUps.form.recipientType')">
					<n-radio-group v-model:value="recipientType">
						<n-radio-button value="user">{{ t("walletTopUps.recipientType.user") }}</n-radio-button>
						<n-radio-button value="company">{{ t("walletTopUps.recipientType.company") }}</n-radio-button>
					</n-radio-group>
				</n-form-item>

				<n-form-item
					v-if="recipientType === 'user'"
					path="user_id"
					:label="t('walletTopUps.form.user')"
					:feedback="fieldErrors.user_id?.[0]"
					:validation-status="fieldErrors.user_id ? 'error' : undefined"
				>
					<n-select v-model:value="form.user_id" :options="userOptions" :loading="isLoadingUsers" filterable clearable />
				</n-form-item>

				<n-form-item
					v-else
					path="company_id"
					:label="t('walletTopUps.form.company')"
					:feedback="fieldErrors.company_id?.[0]"
					:validation-status="fieldErrors.company_id ? 'error' : undefined"
				>
					<n-select v-model:value="form.company_id" :options="companyOptions" :loading="isLoadingCompanies" filterable clearable />
				</n-form-item>

				<n-form-item
					path="amount"
					:label="t('walletTopUps.form.amount')"
					:feedback="fieldErrors.amount?.[0]"
					:validation-status="fieldErrors.amount ? 'error' : undefined"
				>
					<n-input v-model:value="form.amount" :placeholder="AMOUNT_PLACEHOLDER" inputmode="decimal" />
				</n-form-item>

				<n-form-item
					path="payment_method"
					:label="t('walletTopUps.form.paymentMethod')"
					:feedback="fieldErrors.payment_method?.[0]"
					:validation-status="fieldErrors.payment_method ? 'error' : undefined"
				>
					<n-select v-model:value="form.payment_method" :options="paymentMethodOptions" />
				</n-form-item>

				<n-form-item
					path="description"
					:label="t('walletTopUps.form.description')"
					:feedback="fieldErrors.description?.[0]"
					:validation-status="fieldErrors.description ? 'error' : undefined"
				>
					<n-input v-model:value="form.description" :maxlength="DESCRIPTION_MAX_LENGTH" show-count />
				</n-form-item>
			</n-form>

			<div class="flex justify-end">
				<n-button type="primary" :loading="isSubmitting" @click="submit">
					<template #icon><Icon name="carbon:money" :size="16" /></template>
					{{ t("walletTopUps.submit.button") }}
				</n-button>
			</div>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { PaymentMethod, WalletTopUpPayload } from "@/add-os/modules/payments/types/wallet-top-up"
import { NAlert, NButton, NCard, NForm, NFormItem, NInput, NRadioButton, NRadioGroup, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { PAYMENT_METHODS } from "@/add-os/modules/payments/types/wallet-top-up"
import { ApiError } from "@/add-os/services/api"
import { listCompanies } from "@/add-os/services/companies"
import { listUsers } from "@/add-os/services/users"
import { createWalletTopUp } from "@/add-os/services/wallet-top-ups"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()

/** Server-side `max:255` on `description`, mirrored so the input stops there. */
const DESCRIPTION_MAX_LENGTH = 255

/**
 * A format hint, not a translated string: it is the literal wire shape the
 * DECIMAL column accepts, identical in both languages, and the ar/en
 * translation-content guard would (correctly) reject an Arabic bundle value
 * carrying no Arabic script. Kept out of i18n for that reason.
 */
const AMOUNT_PLACEHOLDER = "0.00"

/**
 * Amount is held and sent as a string. `n-input-number` would bind a JS
 * `number`, and `utils/format/numbers.ts` is explicit that converting a DECIMAL
 * to a `number` is the lossy step — it happens before any formatter can help.
 * Two decimals maximum, matching the column; `min="0.01"` from the task becomes
 * the `>= 0.01` check below rather than an attribute, because a text input has
 * no `min`.
 */
const AMOUNT_PATTERN = /^\d+(?:\.\d{1,2})?$/
const MINIMUM_AMOUNT = 0.01

function isValidAmount(value: string): boolean {
	const trimmed = value.trim()
	return AMOUNT_PATTERN.test(trimmed) && Number(trimmed) >= MINIMUM_AMOUNT
}

type RecipientType = "user" | "company"

const recipientType = ref<RecipientType>("user")

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

const { data: users, isLoading: isLoadingUsers, error: usersError } = useResourceList(listUsers)
const { data: companies, isLoading: isLoadingCompanies, error: companiesError } = useResourceList(listCompanies)

const loadError = computed(() => usersError.value !== null || companiesError.value !== null)

/**
 * Both pickers filter client-side over the full list, which is what
 * `AddCompanyMemberDialog` already does for users. There is no search-by-name
 * endpoint for either resource — `listCompanies()` takes no query at all — so
 * `filterable` over the loaded list is the whole capability here, not a
 * stand-in for a remote search that exists somewhere else.
 */
const userOptions = computed<SelectOption[]>(() => users.value.map(user => ({ label: `${user.name} — ${user.phone}`, value: user.id })))

const companyOptions = computed<SelectOption[]>(() =>
	companies.value.map(company => ({ label: `${company.legal_name} — ${company.contract_ref}`, value: company.id }))
)

const paymentMethodOptions = computed<SelectOption[]>(() =>
	PAYMENT_METHODS.map(method => ({ label: t(`walletTopUps.paymentMethod.${method}`), value: method }))
)

/**
 * Switching the toggle drops the other arm's selection outright.
 *
 * Hiding the inactive `n-select` is not the same as clearing it: the value stays
 * in the model, and a top-up meant for a member would carry the company id the
 * operator picked a moment earlier. `buildRecipient()` below never reads the
 * inactive arm either, so this is belt-and-braces — but it is also what the
 * operator sees, and a field still holding a stale selection when you toggle
 * back is its own bug.
 */
watch(recipientType, type => {
	if (type === "user") form.value.company_id = null
	else form.value.user_id = null
	fieldErrors.value = {}
	formRef.value?.restoreValidation()
})

const rules = computed<FormRules>(() => ({
	amount: {
		required: true,
		trigger: ["blur", "input"],
		validator: (_rule, value: string) => (isValidAmount(value ?? "") ? true : new Error(t("walletTopUps.validation.amountFormat")))
	},
	...(recipientType.value === "user"
		? { user_id: { required: true, type: "number" as const, message: t("walletTopUps.validation.userRequired"), trigger: ["change"] } }
		: { company_id: { required: true, type: "number" as const, message: t("walletTopUps.validation.companyRequired"), trigger: ["change"] } })
}))

/** The one place the exactly-one-of rule is applied. Returns null when unselected. */
function buildRecipient(): { user_id: number } | { company_id: number } | null {
	if (recipientType.value === "user") {
		return form.value.user_id === null ? null : { user_id: form.value.user_id }
	}
	return form.value.company_id === null ? null : { company_id: form.value.company_id }
}

async function submit() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	const amount = form.value.amount.trim()
	const recipient = buildRecipient()
	if (!isValidAmount(amount) || recipient === null) return

	const payload = {
		amount,
		payment_method: form.value.payment_method,
		...recipient,
		description: form.value.description.trim() || null
	} as WalletTopUpPayload

	fieldErrors.value = {}
	isSubmitting.value = true
	try {
		await createWalletTopUp(payload)
		message.success(t("walletTopUps.submit.success"))
		// Repeatable action screen: back to a blank slate, same recipient mode.
		form.value = emptyForm()
		formRef.value?.restoreValidation()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		// A 422 with field errors lands on the fields themselves and is
		// deliberately not toasted — the same split ResourceFormDrawer and
		// useResourceMutations already use. A 422 without them still needs to say
		// something, or the click looks like it did nothing.
		if (caught.status === 422 && caught.data?.errors) fieldErrors.value = caught.data.errors
		else if (caught.status === 403) message.error(t("resourceCrud.mutations.permissionError"))
		else message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
	} finally {
		isSubmitting.value = false
	}
}

defineExpose({ submit, form, recipientType, fieldErrors })
</script>
