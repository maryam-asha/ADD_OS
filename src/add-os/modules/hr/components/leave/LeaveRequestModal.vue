<!-- src/add-os/modules/hr/components/leave/LeaveRequestModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title icon="carbon:calendar-add">
		<n-form ref="formRef" :model="form" :rules label-placement="top">
			<n-form-item path="typeId" :label="t('hrLeave.request.type')">
				<n-select v-model:value="form.typeId" :options="typeOptions" />
			</n-form-item>

			<template v-if="selected">
				<n-form-item v-if="selected.unit === 'hour'" path="startsOn" :label="t('hrLeave.request.day')">
					<n-date-picker v-model:formatted-value="form.startsOn" value-format="yyyy-MM-dd" type="date" class="w-full" />
				</n-form-item>
				<n-form-item v-else path="range" :label="t('hrLeave.request.dates')">
					<n-date-picker v-model:formatted-value="form.range" value-format="yyyy-MM-dd" type="daterange" class="w-full" />
				</n-form-item>

				<n-form-item v-if="selected.unit === 'hour'" path="hours" :label="t('hrLeave.request.hours')">
					<n-input-number v-model:value="form.hours" :min="0.25" :max="24" :step="0.5" class="w-full" />
				</n-form-item>
				<n-form-item v-else-if="halfDayOffered" path="halfDay" :label="t('hrLeave.request.halfDay')" :feedback="singleDay ? undefined : t('hrLeave.request.halfDayHint')">
					<n-select v-model:value="form.halfDay" :options="halfDayOptions" :disabled="!singleDay" clearable :placeholder="t('hrLeave.request.fullDay')" />
				</n-form-item>

				<n-alert v-if="quote" type="info" class="mb-4" :title="t('hrLeave.quote.title', { amount: leaveAmount(t, quote.amount, quote.unit) })">
					<template v-if="quote.available !== null">
						{{ t("hrLeave.quote.balance", { available: leaveAmount(t, quote.available, quote.unit), after: leaveAmount(t, quote.remaining_after, quote.unit) }) }}
					</template>
				</n-alert>
				<n-alert v-else-if="quoteError" type="warning" class="mb-4" :title="quoteError" />

				<n-form-item path="reason" :label="t('hrLeave.request.reason')">
					<n-input v-model:value="form.reason" type="textarea" :autosize="{ minRows: 2, maxRows: 5 }" :maxlength="1000" />
				</n-form-item>
				<n-form-item
					path="attachment"
					:label="t('hrLeave.request.attachment')"
					:feedback="selected.requires_attachment ? t('hrLeave.request.attachmentRequired') : t('hrLeave.request.attachmentHint')"
				>
					<n-upload :default-upload="false" :max="1" accept=".pdf,.jpg,.jpeg,.png" :file-list @update:file-list="onFiles">
						<n-button>
							<template #icon><Icon name="carbon:document-add" :size="16" /></template>
							{{ t("hr.upload.choose") }}
						</n-button>
					</n-upload>
				</n-form-item>
			</template>
		</n-form>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="submitting" :disabled="!selected" @click="send">
					<template #icon><Icon name="carbon:send" :size="16" /></template>
					{{ t("hrLeave.request.submit") }}
				</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { FormInst, FormItemRule, FormRules, SelectOption, UploadFileInfo } from "naive-ui"
import type { Translatable } from "@/add-os/modules/hr/types/hr"
import type { HalfDay, LeaveQuote, LeaveRequest, LeaveUnit, SubmitLeavePayload } from "@/add-os/modules/hr/types/leave"
import { NAlert, NButton, NDatePicker, NForm, NFormItem, NInput, NInputNumber, NSelect, NUpload, useMessage } from "naive-ui"
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { HALF_DAYS } from "@/add-os/modules/hr/types/leave"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { leaveAmount } from "@/add-os/modules/hr/utils/leave"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import Icon from "@/components/common/Icon.vue"

/**
 * A leave request (SubmitLeaveRequest): a range of days — or one day, with a
 * half or, for an hourly type, the hours — a reason and an attachment. The
 * employee's own form previews what it would take from their balance
 * (`quote`, `POST me/leave/quote`) as they fill it in; HR filing for an
 * employee has no preview endpoint, so the server's answer on submit is the
 * check. Every request then goes through the employee's approval flow.
 */
export interface LeaveTypeChoice {
	id: number
	name: Translatable
	unit: LeaveUnit
	/** Unknown to the employee's own form (it reads only balances): the server decides. */
	allows_half_day?: boolean
	requires_attachment?: boolean
}

const props = defineProps<{
	types: LeaveTypeChoice[]
	title: string
	submit: (payload: SubmitLeavePayload) => Promise<LeaveRequest>
	quote?: (payload: Omit<SubmitLeavePayload, "attachment" | "reason">) => Promise<LeaveQuote>
}>()
const emit = defineEmits<{ submitted: [request: LeaveRequest] }>()
const show = defineModel<boolean>("show", { required: true })

const QUOTE_DELAY_MS = 400

const { t } = useI18n()
const message = useMessage()

interface LeaveForm {
	typeId: number | null
	range: [string, string] | null
	startsOn: string | null
	hours: number | null
	halfDay: HalfDay | null
	reason: string
	attachment: File | null
}

const formRef = ref<FormInst | null>(null)
const form = ref<LeaveForm>(blank())
const fileList = ref<UploadFileInfo[]>([])
const submitting = ref(false)
const quote = ref<LeaveQuote | null>(null)
const quoteError = ref("")

function blank(): LeaveForm {
	return { typeId: null, range: null, startsOn: null, hours: null, halfDay: null, reason: "", attachment: null }
}

watch(show, visible => {
	if (!visible) return
	form.value = blank()
	fileList.value = []
	quote.value = null
	quoteError.value = ""
})

const selected = computed(() => props.types.find(type => type.id === form.value.typeId) ?? null)
const typeOptions = computed<SelectOption[]>(() => props.types.map(type => ({ label: translated(type.name), value: type.id })))
const halfDayOptions = computed<SelectOption[]>(() => HALF_DAYS.map(h => ({ label: t(`hrApprovals.halfDay.${h}`), value: h })))
const halfDayOffered = computed(() => selected.value?.unit === "day" && selected.value.allows_half_day !== false)
const singleDay = computed(() => Boolean(form.value.range && form.value.range[0] === form.value.range[1]))

watch(singleDay, single => {
	if (!single) form.value.halfDay = null
})

/** The dates and amount as the API takes them, or null while incomplete. */
const timing = computed<Omit<SubmitLeavePayload, "attachment" | "reason"> | null>(() => {
	const type = selected.value
	const f = form.value
	if (!type) return null
	if (type.unit === "hour") {
		if (!f.startsOn || !f.hours) return null
		return { leave_type_id: type.id, starts_on: f.startsOn, ends_on: f.startsOn, half_day: null, hours: f.hours }
	}
	if (!f.range) return null
	return { leave_type_id: type.id, starts_on: f.range[0], ends_on: f.range[1], half_day: singleDay.value ? f.halfDay : null, hours: null }
})

// ── Preview ─────────────────────────────────────────────────────────────────
let quoteTimer: ReturnType<typeof setTimeout> | undefined
let quoteSeq = 0

watch(
	timing,
	value => {
		clearTimeout(quoteTimer)
		quote.value = null
		quoteError.value = ""
		if (!value || !props.quote) return
		const seq = ++quoteSeq
		quoteTimer = setTimeout(async () => {
			try {
				const result = await props.quote!(value)
				if (seq === quoteSeq) quote.value = result
			} catch (e) {
				if (!(e instanceof ApiError)) throw e
				if (seq === quoteSeq) quoteError.value = apiErrorMessage(e, t("hrLeave.quote.failed"))
			}
		}, QUOTE_DELAY_MS)
	},
	{ deep: true }
)

onBeforeUnmount(() => clearTimeout(quoteTimer))

// ── Submit ──────────────────────────────────────────────────────────────────
function onFiles(files: UploadFileInfo[]) {
	fileList.value = files
	form.value.attachment = files[0]?.file ?? null
}

const required = { required: true, message: () => t("hr.common.required"), trigger: ["blur", "change"] }
const rules = computed<FormRules>(() => {
	const result: Record<string, FormItemRule> = { typeId: { ...required, type: "number" } }
	if (selected.value?.unit === "hour") {
		result.startsOn = required
		result.hours = { ...required, type: "number" }
	} else {
		result.range = { ...required, type: "array" }
	}
	if (selected.value?.requires_attachment) {
		result.attachment = { required: true, trigger: ["change"], validator: () => (form.value.attachment ? true : new Error(t("hrLeave.request.attachmentRequired"))) }
	}
	return result
})

async function send() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}
	const when = timing.value
	if (!when) return
	submitting.value = true
	try {
		const created = await props.submit({ ...when, reason: nullable(form.value.reason), attachment: form.value.attachment })
		message.success(t("hrLeave.request.submitted"))
		show.value = false
		emit("submitted", created)
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		submitting.value = false
	}
}
</script>
