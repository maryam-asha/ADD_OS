<!-- src/add-os/modules/reception/components/QuickBookingModal.vue -->
<!--
	Booking a space for a member from the reception desk, without leaving it:
	member, space, from–to, and how it is paid — the same three choices the
	calendar's booking form offers. What it costs is quoted by the server as the
	fields change; every availability rule is the server's, checked on submit,
	and a refusal comes back as its own message.
-->
<template>
	<n-modal
		:show
		preset="card"
		:title="t('bookingCalendar.create.title')"
		class="max-w-lg rounded-2xl shadow-xl"
		closable
		@update:show="emit('update:show', $event)"
	>
		<n-form ref="formRef" :model="form" :rules label-placement="top" class="flex flex-col gap-3">
			<n-form-item :label="t('bookingCalendar.create.member')" path="user_id">
				<n-select
					v-model:value="form.user_id"
					:options="userOptions"
					:loading="isLoading"
					filterable
					clearable
					:placeholder="t('bookingCalendar.create.memberPlaceholder')"
				/>
			</n-form-item>

			<n-form-item :label="t('bookingCalendar.create.space')" path="space_id">
				<n-select
					v-model:value="form.space_id"
					:options="spaceOptions"
					:loading="isLoading"
					filterable
					clearable
					:placeholder="t('bookingCalendar.create.spacePlaceholder')"
				/>
			</n-form-item>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<n-form-item :label="t('reception.quickBooking.start')" path="start_at">
					<n-date-picker v-model:value="form.start_at" type="datetime" format="yyyy-MM-dd HH:mm" class="w-full" />
				</n-form-item>

				<n-form-item :label="t('reception.quickBooking.end')" path="end_at">
					<n-date-picker v-model:value="form.end_at" type="datetime" format="yyyy-MM-dd HH:mm" class="w-full" />
				</n-form-item>
			</div>

			<n-spin :show="isLoadingQuote">
				<div v-if="quote" class="flex flex-col gap-1.5 p-3 rounded-xl border border-stone-200 bg-stone-50 text-xs">
					<div class="flex items-center justify-between text-stone-700">
						<span>{{ t("reception.quickBooking.duration") }}</span>
						<span class="font-bold">{{ t("reception.quickBooking.minutes", { minutes: formatNumber(quote.minutes) }) }}</span>
					</div>
					<div class="flex items-center justify-between text-stone-700">
						<span>{{ t("bookingCalendar.create.quoteTitle") }}</span>
						<span class="font-extrabold text-stone-900 text-sm">{{ t("bookingCalendar.create.quotePoints", { points: formatNumber(quote.total_points) }) }}</span>
					</div>
					<div v-if="quote.amounts.length" class="flex items-center justify-between text-stone-500 pt-1 border-t border-stone-200">
						<span>{{ t("reception.quickBooking.inCash") }}</span>
						<span class="flex gap-2 font-bold">
							<bdi v-for="amount in quote.amounts" :key="amount.currency" dir="ltr">{{ formatAmount(amount) }}</bdi>
						</span>
					</div>
				</div>
			</n-spin>

			<n-form-item :label="t('bookingCalendar.create.payment')" path="payment">
				<n-radio-group v-model:value="form.payment">
					<div class="flex flex-col gap-2">
						<n-radio value="cash_now">{{ t("bookingCalendar.create.paymentCashNow") }}</n-radio>
						<n-radio value="cash_later">{{ t("bookingCalendar.create.paymentCashLater") }}</n-radio>
						<n-radio value="wallet">{{ t("bookingCalendar.create.paymentWallet") }}</n-radio>
					</div>
				</n-radio-group>
			</n-form-item>

			<n-form-item :label="t('bookingCalendar.create.note')" path="note">
				<n-input v-model:value="form.note" type="textarea" :rows="2" :placeholder="t('bookingCalendar.create.notePlaceholder')" />
			</n-form-item>
		</n-form>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button :disabled="isSubmitting" @click="emit('update:show', false)">
					{{ t("resourceCrud.form.cancel") }}
				</n-button>
				<n-button type="primary" :disabled="!canSubmit || isSubmitting" :loading="isSubmitting" @click="submit">
					<template #icon><Icon name="carbon:calendar-add" :size="16" /></template>
					{{ t("bookingCalendar.create.submit") }}
				</n-button>
			</div>
		</template>
	</n-modal>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { CreateReceptionBookingPayload, ReceptionBookingPayment, ReceptionBookingQuote } from "@/add-os/modules/booking/types/reception"
import type { Space } from "@/add-os/modules/spatial/types/space"
import type { User } from "@/add-os/modules/system/types/user"
import { NButton, NDatePicker, NForm, NFormItem, NInput, NModal, NRadio, NRadioGroup, NSelect, NSpin, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { spaceTypeLabel } from "@/add-os/modules/booking/config/space-type-label"
import { ApiError } from "@/add-os/services/api"
import { createReceptionBooking, quoteReceptionBooking, toOffsetIso } from "@/add-os/services/reception"
import { listSpaces } from "@/add-os/services/spaces"
import { listUsers } from "@/add-os/services/users"
import { formatCurrency, formatNumber, isCurrencyCode } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	show: boolean
	preselectedUserId?: number | null
}>()

const emit = defineEmits<{
	"update:show": [value: boolean]
	"success": []
}>()

const { t } = useI18n()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const isSubmitting = ref(false)

/** Starting in five minutes, for an hour: the commonest ask at the desk. */
function emptyForm() {
	const start = Date.now() + 5 * 60_000
	return {
		user_id: null as number | null,
		space_id: null as number | null,
		start_at: start,
		end_at: start + 60 * 60_000,
		payment: "cash_now" as ReceptionBookingPayment,
		note: ""
	}
}

const form = ref(emptyForm())

const users = ref<User[]>([])
const spaces = ref<Space[]>([])
const isLoading = ref(false)

async function load(): Promise<void> {
	isLoading.value = true
	try {
		const [loadedUsers, loadedSpaces] = await Promise.all([listUsers({ role: "member" }), listSpaces()])
		users.value = loadedUsers
		spaces.value = loadedSpaces
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
	} finally {
		isLoading.value = false
	}
}

const userOptions = computed<SelectOption[]>(() =>
	users.value.map(user => ({ label: `${user.name} — ${user.phone}`, value: user.id }))
)

const spaceOptions = computed<SelectOption[]>(() =>
	spaces.value
		.filter(space => space.status === "active")
		.map(space => ({
			label: `${(space.name ? pickLocalized(space.name, currentLocale.value) : "") || `#${space.id}`} · ${spaceTypeLabel(t, space.space_type)}`,
			value: space.id
		}))
)

const quote = ref<ReceptionBookingQuote | null>(null)
const isLoadingQuote = ref(false)

const hasTimes = computed(() => form.value.end_at > form.value.start_at)

/** What the booking would cost: re-asked as the fields change; books nothing. */
async function updateQuote(): Promise<void> {
	const { user_id: userId, space_id: spaceId, start_at: startAt, end_at: endAt } = form.value
	if (userId === null || spaceId === null || !hasTimes.value) {
		quote.value = null
		return
	}

	isLoadingQuote.value = true
	try {
		quote.value = await quoteReceptionBooking({
			user_id: userId,
			space_id: spaceId,
			start_at: toOffsetIso(new Date(startAt)),
			end_at: toOffsetIso(new Date(endAt))
		})
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		quote.value = null
	} finally {
		isLoadingQuote.value = false
	}
}

watch(() => props.show, async (open) => {
	if (!open) return
	form.value = emptyForm()
	quote.value = null
	formRef.value?.restoreValidation()
	await load()
	if (props.preselectedUserId) form.value.user_id = props.preselectedUserId
})

watch([() => form.value.user_id, () => form.value.space_id, () => form.value.start_at, () => form.value.end_at], () => void updateQuote())

const canSubmit = computed(() => form.value.user_id !== null && form.value.space_id !== null && hasTimes.value)

const rules = computed<FormRules>(() => ({
	user_id: [{ required: true, type: "number", message: t("resourceCrud.form.required"), trigger: ["change"] }],
	space_id: [{ required: true, type: "number", message: t("resourceCrud.form.required"), trigger: ["change"] }]
}))

/** The server's decimal string, at the decimals it was sent with. */
function formatAmount(amount: { currency: string, value: string }): string {
	const fractionDigits = amount.value.split(".")[1]?.length ?? 0
	return formatCurrency(amount.value, isCurrencyCode(amount.currency) ? { currency: amount.currency, fractionDigits } : { fractionDigits })
}

async function submit(): Promise<void> {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	const { user_id: userId, space_id: spaceId, start_at: startAt, end_at: endAt, payment, note } = form.value
	if (userId === null || spaceId === null || !hasTimes.value) return

	const payload: CreateReceptionBookingPayload = {
		user_id: userId,
		space_id: spaceId,
		start_at: toOffsetIso(new Date(startAt)),
		end_at: toOffsetIso(new Date(endAt)),
		payment_method: payment === "wallet" ? "wallet" : "cash",
		...(payment === "wallet" ? {} : { cash_collected: payment === "cash_now" }),
		...(note.trim() ? { note: note.trim() } : {})
	}

	isSubmitting.value = true
	try {
		await createReceptionBooking(payload)
		message.success(t("bookingCalendar.create.success"))
		emit("success")
		emit("update:show", false)
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		message.error(caught.status === 403 ? t("resourceCrud.mutations.permissionError") : caught.data?.message ?? t("resourceCrud.mutations.genericError"))
	} finally {
		isSubmitting.value = false
	}
}
</script>
