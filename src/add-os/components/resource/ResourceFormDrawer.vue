<!-- src/add-os/components/resource/ResourceFormDrawer.vue -->
<template>
	<n-modal
		v-model:show="show"
		preset="card"
		:title
		closable
		style="max-width: 28rem"
		content-style="max-height: 60vh; overflow-y: auto"
	>
		<n-form ref="formRef" :model :rules label-placement="top">
			<n-form-item
				v-for="field in fields"
				:key="field.key"
				:path="field.key"
				:label="t(field.labelKey)"
				:feedback="fieldErrors[field.key]?.[0]"
				:validation-status="fieldErrors[field.key] ? 'error' : undefined"
			>
				<n-input v-if="field.type === 'text'" v-model:value="(model as Record<string, unknown>)[field.key] as string" />
				<div v-else-if="field.type === 'bilingual-text'" class="flex w-full gap-2">
					<div class="flex-1">
						<n-input
							v-model:value="((model as Record<string, unknown>)[field.key] as Bilingual).ar"
							:placeholder="t('resourceCrud.form.arabicPlaceholder')"
							:status="fieldErrors[`${field.key}.ar`] ? 'error' : undefined"
						/>
						<n-text v-if="fieldErrors[`${field.key}.ar`]" type="error" class="text-xs">
							{{ fieldErrors[`${field.key}.ar`]?.[0] }}
						</n-text>
					</div>
					<div class="flex-1">
						<n-input
							v-model:value="((model as Record<string, unknown>)[field.key] as Bilingual).en"
							:placeholder="t('resourceCrud.form.englishPlaceholder')"
							:status="fieldErrors[`${field.key}.en`] ? 'error' : undefined"
						/>
						<n-text v-if="fieldErrors[`${field.key}.en`]" type="error" class="text-xs">
							{{ fieldErrors[`${field.key}.en`]?.[0] }}
						</n-text>
					</div>
				</div>
				<n-input-number
					v-else-if="field.type === 'number'"
					v-model:value="(model as Record<string, unknown>)[field.key] as number | null"
					class="w-full"
				/>
				<n-select
					v-else-if="field.type === 'select'"
					v-model:value="(model as Record<string, unknown>)[field.key] as string | number | null"
					:options="field.options ?? dynamicOptions[field.key] ?? []"
					:disabled="field.disabledWhen?.(model) ?? false"
					clearable
				/>
				<n-switch v-else-if="field.type === 'switch'" v-model:value="(model as Record<string, unknown>)[field.key] as boolean" />
				<n-time-picker
					v-else-if="field.type === 'time'"
					:formatted-value="toPickerTimeValue((model as Record<string, unknown>)[field.key])"
					format="HH:mm"
					value-format="HH:mm"
					class="w-full"
					@update:formatted-value="(value: string | null) => setPickerValue(field.key, value)"
				/>
				<n-date-picker
					v-else-if="field.type === 'date'"
					:formatted-value="toPickerDateValue((model as Record<string, unknown>)[field.key])"
					format="yyyy-MM-dd"
					value-format="yyyy-MM-dd"
					class="w-full"
					@update:formatted-value="(value: string | null) => setPickerValue(field.key, value)"
				/>
			</n-form-item>
		</n-form>
		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("resourceCrud.form.cancel") }}</n-button>
				<n-button type="primary" :loading="submitting" @click="handleSubmit">{{ t("resourceCrud.form.submit") }}</n-button>
			</div>
		</template>
	</n-modal>
</template>

<script setup lang="ts" generic="TModel extends Record<string, unknown>">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { Bilingual, FieldDescriptor } from "./field-types"
import { NButton, NDatePicker, NForm, NFormItem, NInput, NInputNumber, NModal, NSelect, NSwitch, NText, NTimePicker } from "naive-ui"
import { computed, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import { buildPayload } from "./field-types"

const props = defineProps<{
	fields: FieldDescriptor<TModel>[]
	title: string
	submitting: boolean
	onSubmit: (payload: Record<string, unknown>) => Promise<void>
}>()

const show = defineModel<boolean>("show", { required: true })
const model = defineModel<TModel>("model", { required: true })

const { t } = useI18n()

const formRef = ref<FormInst | null>(null)
const fieldErrors = ref<Record<string, string[]>>({})
const dynamicOptions = reactive<Record<string, SelectOption[]>>({})

function dependsOnKeys(field: FieldDescriptor<TModel>): string[] {
	if (!field.dependsOn) return []
	return Array.isArray(field.dependsOn) ? field.dependsOn : [field.dependsOn]
}

/**
 * A "drawer session" is one open/close cycle. `n-modal` does not unmount its
 * content, so this component outlives every session and has to clear what the
 * last one left behind — otherwise "New X" opens showing the previous record's
 * 422 feedback, its invalid-field highlighting, and its dropdown options.
 *
 * The signal is the model's own object identity: every view starts a session by
 * assigning a brand-new object (`form.value = emptyXPayload()` /
 * `form.value = { ...row }`), and none of them mutate the existing object in
 * place.
 *
 * Clearing `dynamicOptions` here cannot race the cascade watchers below, in
 * either registration order: they only ever write their entry *after* an
 * `await`, which lands in a later microtask than this synchronous flush.
 */
watch(
	() => model.value,
	() => {
		fieldErrors.value = {}
		for (const key of Object.keys(dynamicOptions)) delete dynamicOptions[key]
		formRef.value?.restoreValidation()
	}
)

for (const field of props.fields) {
	const keys = dependsOnKeys(field)
	if (keys.length === 0 || !field.optionsFrom) continue

	watch(
		// The model's identity is watched alongside the declared dependencies so
		// the callback can tell apart the two reasons a dependency's value can
		// change. It also guarantees this fires on every session change, even one
		// whose ancestor value happens to match the previous session's — without
		// which the *next* interaction would still be read against a stale model.
		[() => model.value, ...keys.map(key => () => (model.value as Record<string, unknown>)[key])],
		async (current, previous) => {
			const [currentModel, ...values] = current as [TModel, ...unknown[]]
			/**
			 * Same object ⇒ the user moved a dropdown, so a child value the new
			 * options don't cover is genuinely stale and must be cleared.
			 *
			 * Different object ⇒ a new session just began. The ancestor "changing"
			 * is only the caller resetting it (several views legitimately open Edit
			 * with a virtual ancestor at `null`), and invalidating on that would
			 * wipe the real FK the row actually has — the row's own building_id
			 * cleared because a *previous* session had left a branch selected.
			 * Trust whatever the caller just set.
			 */
			const isNewSession = !previous || previous[0] !== currentModel

			const parentValues = Object.fromEntries(keys.map((key, i) => [key, values[i]]))
			const options = await field.optionsFrom!(parentValues, currentModel)
			dynamicOptions[field.key] = options

			if (isNewSession) return

			const target = currentModel as Record<string, unknown>
			const value = target[field.key]
			if (value !== null && value !== undefined && !options.some(option => option.value === value)) {
				target[field.key] = null
			}
		},
		{ immediate: true }
	)
}

const TIME_DISPLAY_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const DATE_DISPLAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * NTimePicker/NDatePicker strictly parse `formatted-value` (via date-fns)
 * into an internal timestamp, and only ever special-case `null` as "no
 * value" — every other string, including a plain empty one, gets run
 * through that parse and then `format()`. An unparseable string produces an
 * Invalid Date, and formatting one throws synchronously during setup —
 * confirmed by mounting both pickers directly: `open_time: ""` and
 * `date: ""`, which are exactly today's `emptyBusinessHourPayload` /
 * `emptyBusinessHourExceptionPayload` defaults, crash immediately, and so
 * does a genuinely malformed legacy value like `"25:00"`.
 *
 * These two functions are the pickers' own crash-avoidance shape check, not
 * the field's business rule — they only decide what is safe to hand the
 * picker without it throwing, so they stay this minimal. A value that fails
 * here still passes through to the picker as `null` (displays as empty)
 * while the model itself is left untouched: `field.rule` (TIME_PATTERN /
 * DATE_PATTERN in business-hours.config.ts) is the real validator and still
 * catches it at submit, exactly as it did when these fields were plain text.
 *
 * Time needs only the regex: hour/minute have fixed, context-independent
 * ranges. Date needs a further round-trip through `Date`'s local-component
 * constructor, because the shape regex alone accepts calendar-invalid dates
 * like `"2026-02-30"` that date-fns still fails to parse.
 */
function toPickerTimeValue(value: unknown): string | null {
	return typeof value === "string" && TIME_DISPLAY_PATTERN.test(value) ? value : null
}

function toPickerDateValue(value: unknown): string | null {
	if (typeof value !== "string") return null
	const match = DATE_DISPLAY_PATTERN.exec(value)
	if (!match) return null

	const [, yearStr, monthStr, dayStr] = match
	const year = Number(yearStr)
	const month = Number(monthStr)
	const day = Number(dayStr)
	const parsed = new Date(year, month - 1, day)
	const isRealCalendarDate = parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day

	return isRealCalendarDate ? value : null
}

/**
 * Writes the picker's own emitted value back to the model, never a
 * timestamp. A cleared picker emits `null`; mapped to `""` so a field the
 * user never touched, or clears, keeps today's empty-string representation
 * instead of introducing `null` as a second "empty" the payload never had.
 */
function setPickerValue(key: string, value: string | null) {
	const target = model.value as Record<string, unknown>
	target[key] = value ?? ""
}

/**
 * Both halves are required, not either: the dashboard renders whichever half
 * matches the active locale, so a branch named only in English is a blank row
 * in Arabic. Laravel validates `name.ar` and `name.en` separately for the same
 * reason.
 */
function isBilingualComplete(value: unknown): boolean {
	const bilingual = value as Partial<Bilingual> | null | undefined
	return Boolean(bilingual?.ar?.trim()) && Boolean(bilingual?.en?.trim())
}

/**
 * A bilingual value is an object, and async-validator cannot check one with its
 * built-in keywords: `required` alone never fires, because `isEmptyValue` counts
 * only undefined/null/""/[] as empty — and a rule carrying neither `type` nor
 * `validator` defaults to `type: "string"`, whose type check then rejects the
 * object even when both halves are filled. That was diagnosed for
 * `bilingual-text` first, because the failure there is loud: the object always
 * fails the forced string check, so the field became unsubmittable outright.
 *
 * Generalized afterward: the same forced `type: "string"` also rejects a
 * `number` field holding `0`, a `switch` holding `false`, and a `select` holding
 * a numeric id — all values async-validator's type check treats as the wrong
 * type, none of them actually empty. Those failures are quieter (the field still
 * submits once the user retypes something string-shaped into it) but wrong for
 * the same root-cause reason, so this replaces the bilingual-only check with one
 * emptiness rule for every field type rather than leaving two parallel paths.
 * Only null, undefined, and a whitespace-only string count as empty for
 * non-bilingual fields — `0` and `false` are real values.
 */
function isFieldValueEmpty(field: FieldDescriptor<TModel>, value: unknown): boolean {
	if (field.type === "bilingual-text") return !isBilingualComplete(value)
	if (value === null || value === undefined) return true
	return typeof value === "string" && value.trim().length === 0
}

const rules = computed<FormRules>(() => {
	const result: FormRules = {}
	for (const field of props.fields) {
		if (field.rule) {
			result[field.key] = field.rule
			continue
		}
		if (!field.required) continue

		const message = t("resourceCrud.validation.required", { field: t(field.labelKey) })

		/**
		 * A custom `validator` replaces the built-in keyword check outright
		 * (`getValidationMethod` prefers it, and `getType` stops forcing "string"
		 * once it is present). `required` is kept purely so naive-ui still marks
		 * the label with its asterisk.
		 */
		result[field.key] = {
			required: true,
			trigger: ["blur", "change", "input"],
			validator: (_rule, value) => (isFieldValueEmpty(field, value) ? new Error(message) : true)
		}
	}
	return result
})

/**
 * Laravel reports a bilingual field's errors under dotted sub-keys (`name.ar`,
 * `name.en`) and never the bare `name` the template looks up, so a 422 on those
 * fields used to show the user nothing at all — and 422s are deliberately not
 * toasted either, leaving no feedback anywhere. This used to fold every key onto
 * its root segment so at least something rendered, concatenating when more than
 * one sub-key of the same field failed.
 *
 * That folding was removed for bilingual-text: it collapsed two
 * independently-failing inputs into one message with no indication of which
 * half was wrong, and neither n-input ever got its own error styling. Those
 * dotted keys are kept as-is — `name.ar` and `name.en` stay distinct entries in
 * `fieldErrors` — and the bilingual-text template branch looks each one up
 * directly for its own `status` and feedback line.
 *
 * But the fold was doing a second job that has no replacement yet: a dotted key
 * whose root belongs to a field that is NOT bilingual-text (no other type
 * renders a per-segment breakdown) still needs to land *somewhere*, or the
 * message renders nowhere — the exact silent-422 failure this function exists
 * to prevent. So the fold is restored, but only for that case: a dotted key
 * folds onto its root iff a field with that key exists and its type isn't
 * `bilingual-text`. Everything else (an undotted key, or a dotted key whose
 * root is bilingual-text or matches no known field) passes through unchanged.
 */
function foldNonBilingualDottedErrors(errors: Record<string, string[]>): Record<string, string[]> {
	const result: Record<string, string[]> = {}
	for (const [key, messages] of Object.entries(errors)) {
		const dot = key.indexOf(".")
		const root = dot === -1 ? key : key.slice(0, dot)
		const rootField = dot === -1 ? undefined : props.fields.find(field => field.key === root)
		const target = rootField && rootField.type !== "bilingual-text" ? root : key
		result[target] = [...(result[target] ?? []), ...messages]
	}
	return result
}

async function handleSubmit() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	fieldErrors.value = {}
	try {
		await props.onSubmit(buildPayload(props.fields, model.value))
		show.value = false
	} catch (caught) {
		if (caught instanceof ApiError && caught.status === 422 && caught.data?.errors) {
			fieldErrors.value = foldNonBilingualDottedErrors(caught.data.errors)
		}
	}
}

defineExpose({ handleSubmit, fieldErrors, dynamicOptions })
</script>
