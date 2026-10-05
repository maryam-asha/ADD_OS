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
			<template v-for="field in fields" :key="field.key">
				<n-form-item
					v-if="!field.hiddenWhen?.(model)"
					:path="field.key"
					:label="t(field.labelKey)"
					:feedback="fieldErrors[field.key]?.[0]"
					:validation-status="fieldErrors[field.key] ? 'error' : undefined"
				>
					<n-input
						v-if="field.type === 'text' || field.type === 'textarea'"
						v-model:value="(model as Record<string, unknown>)[field.key] as string"
						:type="isLongTextField(field) ? 'textarea' : 'text'"
						:autosize="isLongTextField(field) ? { minRows: 3, maxRows: 8 } : undefined"
					/>
					<div
						v-else-if="field.type === 'bilingual-text' || field.type === 'bilingual-textarea'"
						:class="isLongTextField(field) ? 'flex flex-col w-full gap-3' : 'flex w-full gap-2'"
					>
						<div :class="isLongTextField(field) ? 'w-full' : 'flex-1'">
							<n-input
								v-model:value="((model as Record<string, unknown>)[field.key] as Bilingual).ar"
								:placeholder="t('resourceCrud.form.arabicPlaceholder')"
								:status="fieldErrors[`${field.key}.ar`] ? 'error' : undefined"
								:type="isLongTextField(field) ? 'textarea' : 'text'"
								:autosize="isLongTextField(field) ? { minRows: 4, maxRows: 10 } : undefined"
							/>
							<n-text v-if="fieldErrors[`${field.key}.ar`]" type="error" class="text-xs">
								{{ fieldErrors[`${field.key}.ar`]?.[0] }}
							</n-text>
						</div>
						<div :class="isLongTextField(field) ? 'w-full' : 'flex-1'">
							<n-input
								v-model:value="((model as Record<string, unknown>)[field.key] as Bilingual).en"
								:placeholder="t('resourceCrud.form.englishPlaceholder')"
								:status="fieldErrors[`${field.key}.en`] ? 'error' : undefined"
								:type="isLongTextField(field) ? 'textarea' : 'text'"
								:autosize="isLongTextField(field) ? { minRows: 4, maxRows: 10 } : undefined"
							/>
							<n-text v-if="fieldErrors[`${field.key}.en`]" type="error" class="text-xs">
								{{ fieldErrors[`${field.key}.en`]?.[0] }}
							</n-text>
						</div>
					</div>
					<div v-else-if="field.type === 'number'" class="w-full">
						<n-input-number
							v-model:value="(model as Record<string, unknown>)[field.key] as number | null"
							:step="field.step"
							:min="field.min"
							:precision="field.integer ? 0 : undefined"
							class="w-full"
						/>
						<!--
						Read-only, and supplied by the field descriptor — never computed
						by this drawer. A point field's currency equivalent comes from
						the server, which owns the rate.
					-->
						<n-text v-if="field.hint?.(model)" depth="3" class="text-xs">
							{{ field.hint(model) }}
						</n-text>
					</div>
					<n-select
						v-else-if="field.type === 'select'"
						v-model:value="(model as Record<string, unknown>)[field.key] as string | number | null"
						:options="field.options ?? dynamicOptions[field.key] ?? []"
						:disabled="field.disabledWhen?.(model) ?? false"
						clearable
					/>
					<n-switch v-else-if="field.type === 'switch'" v-model:value="(model as Record<string, unknown>)[field.key] as boolean" />
					<div v-else-if="field.type === 'switch-group'" class="flex flex-col gap-1 w-full">
						<div
							v-for="option in (field.options ?? dynamicOptions[field.key] ?? [])"
							:key="String(option.value)"
							class="flex items-center justify-between gap-3 py-1"
						>
							<span class="text-sm">{{ option.label }}</span>
							<n-switch
								:value="((model as Record<string, unknown>)[field.key] as unknown[]).includes(option.value)"
								@update:value="(checked: boolean) => toggleSwitchGroupValue(field.key, option.value as string | number, checked)"
							/>
						</div>
					</div>
					<n-time-picker
						v-else-if="field.type === 'time'"
						:formatted-value="toPickerTimeValue((model as Record<string, unknown>)[field.key])"
						format="hh:mm a" use-12-hours
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
					<!--
						Date and time as two controls, not one `type="datetime"` panel. In
						the combined panel the clock is a secondary control inside the
						calendar popup, so picking a day and closing it saves midnight
						without ever showing a time — which reads as a real start nobody
						chose. Both halves write the one model value.
					-->
					<!--
						A schedule replaces a single start/end pair: an event whose
						hours differ per day cannot be described by two pickers.
					-->
					<SessionsField
						v-else-if="field.type === 'sessions'"
						:model-value="(model as Record<string, unknown>)[field.key] as SessionValue[] | null"
						@update:model-value="value => writeField(field.key, value)"
					/>

					<!-- An empty pair is stored as "", as it always was here. -->
					<DateTimeInput
						v-else-if="field.type === 'datetime'"
						:model-value="(model as Record<string, unknown>)[field.key] as string | null"
						@update:model-value="value => writeField(field.key, value ?? '')"
					/>
					<div v-else-if="field.type === 'color'" class="flex items-center gap-3 w-full">
						<input
							type="color"
							:value="((model as Record<string, unknown>)[field.key] as string) || '#3b82f6'"
							class="w-9 h-9 p-0.5 border rounded cursor-pointer bg-transparent shrink-0"
							@input="e => { (model as Record<string, unknown>)[field.key] = (e.target as HTMLInputElement).value }"
						/>
						<n-input
							v-model:value="(model as Record<string, unknown>)[field.key] as string"
							placeholder="#3B82F6"
							class="flex-1 font-mono"
						/>
					</div>
					<div v-else-if="field.type === 'multi-image' || (field.type === 'image' && field.multiple)" class="flex flex-col gap-3 w-full">
						<!-- Existing images grid -->
						<div
							v-if="Array.isArray((model as Record<string, unknown>)[field.key]) && ((model as Record<string, unknown>)[field.key] as string[]).length > 0"
							class="w-full flex flex-col gap-3 p-3 border rounded-xl bg-surface-sunken"
						>
							<div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
								<div
									v-for="(imgUrl, idx) in ((model as Record<string, unknown>)[field.key] as string[])"
									:key="imgUrl + idx"
									class="group relative rounded-lg overflow-hidden border bg-black/5 aspect-video flex items-center justify-center"
								>
									<img
										:src="imgUrl"
										alt="Uploaded preview"
										class="w-full h-full object-cover"
									/>

									<!-- Primary badge for first image -->
									<div
										v-if="idx === 0"
										class="absolute top-1.5 right-1.5 rtl:right-auto rtl:left-1.5 flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-medium px-2 py-0.5 rounded-full shadow-md backdrop-blur-sm z-10"
									>
										<Icon name="carbon:star-filled" :size="12" />
										<span>{{ t("resourceCrud.form.primaryImage") }}</span>
									</div>

									<!-- Action overlay on hover -->
									<div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1 z-20">
										<n-button
											v-if="idx > 0"
											size="tiny"
											type="primary"
											secondary
											:title="t('resourceCrud.form.setPrimary')"
											@click.stop="() => setPrimaryImage(field.key, idx)"
										>
											<template #icon><Icon name="carbon:star" :size="14" /></template>
										</n-button>
										<n-button
											size="tiny"
											type="error"
											secondary
											:title="t('resourceCrud.form.removeImage')"
											@click.stop="() => removeMultiImage(field.key, idx)"
										>
											<template #icon><Icon name="carbon:trash-can" :size="14" /></template>
										</n-button>
									</div>
								</div>
							</div>

							<!-- Add more button & counter -->
							<div class="flex items-center justify-between gap-2 pt-2 border-t border-black/5">
								<n-upload
									accept="image/*"
									:show-file-list="false"
									:multiple="true"
									:custom-request="options => handleMultiImageUpload(field.key, options, field.folder)"
								>
									<n-button size="small" secondary type="primary">
										<template #icon><Icon name="carbon:add" :size="14" /></template>
										{{ t("resourceCrud.form.addImages") }}
									</n-button>
								</n-upload>

								<span class="text-xs text-secondary font-medium">
									{{ ((model as Record<string, unknown>)[field.key] as string[]).length }} {{ t("resourceCrud.form.imagesCount") }}
								</span>
							</div>
						</div>

						<!-- Uploading in progress state -->
						<div
							v-if="uploadingFields[field.key]"
							class="w-full py-6 px-4 border-2 border-dashed border-[var(--add-primary)]/50 rounded-xl flex flex-col items-center justify-center gap-2 bg-surface-sunken"
						>
							<n-spin size="small" />
							<span class="text-xs font-medium text-secondary">{{ t("resourceCrud.form.uploading") }}</span>
						</div>

						<!-- Empty state: Full-width drag-and-drop uploader -->
						<n-upload
							v-if="!Array.isArray((model as Record<string, unknown>)[field.key]) || ((model as Record<string, unknown>)[field.key] as string[]).length === 0"
							class="w-full"
							accept="image/*"
							:show-file-list="false"
							:multiple="true"
							:custom-request="options => handleMultiImageUpload(field.key, options, field.folder)"
						>
							<n-upload-dragger class="w-full !p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[var(--add-primary)] transition-colors">
								<div class="p-3 rounded-full bg-primary/10 text-primary">
									<Icon name="carbon:cloud-upload" :size="30" />
								</div>
								<div class="flex flex-col items-center text-center gap-1">
									<span class="text-sm font-semibold text-primary">{{ t("resourceCrud.form.uploadImagesPrompt") }}</span>
									<span class="text-xs text-secondary">{{ t("resourceCrud.form.uploadImagesHint") }}</span>
								</div>
							</n-upload-dragger>
						</n-upload>
					</div>
					<div v-else-if="field.type === 'image'" class="flex flex-col gap-3 w-full">
						<!-- Uploaded state: preview container with success badge and action buttons -->
						<div
							v-if="(model as Record<string, unknown>)[field.key]"
							class="w-full flex flex-col gap-3 p-3 border rounded-xl bg-surface-sunken"
						>
							<div class="relative w-full rounded-lg overflow-hidden border bg-black/5 aspect-video max-h-56 flex items-center justify-center">
								<img
									:src="(model as Record<string, unknown>)[field.key] as string"
									alt="Uploaded preview"
									class="w-full h-full object-cover"
								/>
								<div class="absolute top-2 right-2 rtl:right-auto rtl:left-2 flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-medium px-3 py-1 rounded-full shadow-md backdrop-blur-sm">
									<Icon name="carbon:checkmark-filled" :size="15" />
									<span>{{ t("resourceCrud.form.uploadSuccess") }}</span>
								</div>
							</div>

							<div class="flex items-center justify-between gap-2">
								<n-upload
									accept="image/*"
									:show-file-list="false"
									:custom-request="options => handleImageUpload(field.key, options, field.folder)"
								>
									<n-button size="small" secondary type="primary">
										<template #icon><Icon name="carbon:renew" :size="14" /></template>
										{{ t("resourceCrud.form.changeImage") }}
									</n-button>
								</n-upload>

								<n-button size="small" secondary type="error" @click="() => removeImage(field.key)">
									<template #icon><Icon name="carbon:trash-can" :size="14" /></template>
									{{ t("resourceCrud.form.removeImage") }}
								</n-button>
							</div>
						</div>

						<!-- Uploading in progress state -->
						<div
							v-else-if="uploadingFields[field.key]"
							class="w-full py-10 px-4 border-2 border-dashed border-[var(--add-primary)]/50 rounded-xl flex flex-col items-center justify-center gap-3 bg-surface-sunken"
						>
							<n-spin size="medium" />
							<span class="text-sm font-medium text-secondary">{{ t("resourceCrud.form.uploading") }}</span>
						</div>

						<!-- Empty state: Full-width drag-and-drop uploader -->
						<n-upload
							v-else
							class="w-full"
							accept="image/*"
							:show-file-list="false"
							:custom-request="options => handleImageUpload(field.key, options, field.folder)"
						>
							<n-upload-dragger class="w-full !p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[var(--add-primary)] transition-colors">
								<div class="p-3 rounded-full bg-primary/10 text-primary">
									<Icon name="carbon:cloud-upload" :size="30" />
								</div>
								<div class="flex flex-col items-center text-center gap-1">
									<span class="text-sm font-semibold text-primary">{{ t("resourceCrud.form.uploadImagePrompt") }}</span>
									<span class="text-xs text-secondary">{{ t("resourceCrud.form.uploadImageHint") }}</span>
								</div>
							</n-upload-dragger>
						</n-upload>
					</div>
				</n-form-item>
			</template>
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
import type { FormInst, FormRules, SelectOption, UploadCustomRequestOptions } from "naive-ui"
import type { Bilingual, FieldDescriptor } from "./field-types"
import type { SessionValue } from "@/add-os/components/resource/SessionsField.vue"
import { NButton, NDatePicker, NForm, NFormItem, NInput, NInputNumber, NModal, NSelect, NSpin, NSwitch, NText, NTimePicker, NUpload, NUploadDragger } from "naive-ui"
import { computed, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import DateTimeInput from "@/add-os/components/form/DateTimeInput.vue"
import SessionsField from "@/add-os/components/resource/SessionsField.vue"
import { ApiError } from "@/add-os/services/api"
import { uploadMedia } from "@/add-os/services/media"
import Icon from "@/components/common/Icon.vue"
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
			// A switch-group field holds an array (every value that's "on"), not a
			// single scalar — a stale entry the new options don't cover gets
			// filtered out, never the whole selection nulled like a select's does.
			if (Array.isArray(value)) {
				const filtered = value.filter(v => options.some(option => option.value === v))
				if (filtered.length !== value.length) {
					target[field.key] = filtered
				}
			} else if (value !== null && value !== undefined && !options.some(option => option.value === value)) {
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

/** Write a value the field owns outright, such as a schedule. */
function writeField(key: string, value: unknown) {
	const target = model.value as Record<string, unknown>
	target[key] = value
}

/** Adds/removes one option's value from a switch-group field's array. */
function toggleSwitchGroupValue(key: string, value: string | number, checked: boolean) {
	const target = model.value as Record<string, unknown>
	const current = Array.isArray(target[key]) ? [...(target[key] as (string | number)[])] : []
	const index = current.indexOf(value)
	if (checked && index === -1) {
		current.push(value)
	} else if (!checked && index !== -1) {
		current.splice(index, 1)
	}
	target[key] = current
}

function removeImage(fieldKey: string) {
	const target = model.value as Record<string, unknown>
	target[fieldKey] = ""
}

function removeMultiImage(fieldKey: string, index: number) {
	const target = model.value as Record<string, unknown>
	if (Array.isArray(target[fieldKey])) {
		;(target[fieldKey] as string[]).splice(index, 1)
	}
}

function setPrimaryImage(fieldKey: string, index: number) {
	const target = model.value as Record<string, unknown>
	if (Array.isArray(target[fieldKey]) && index > 0 && index < (target[fieldKey] as string[]).length) {
		const list = target[fieldKey] as string[]
		const [chosen] = list.splice(index, 1)
		list.unshift(chosen)
	}
}

const uploadingFields = reactive<Record<string, boolean>>({})

async function handleImageUpload(fieldKey: string, options: UploadCustomRequestOptions, folder?: string) {
	const { file, onFinish, onError } = options
	if (!file.file) return
	uploadingFields[fieldKey] = true
	try {
		const res = await uploadMedia(file.file, folder)
		const target = model.value as Record<string, unknown>
		target[fieldKey] = res.url
		onFinish()
	} catch (err) {
		onError()
	} finally {
		uploadingFields[fieldKey] = false
	}
}

async function handleMultiImageUpload(fieldKey: string, options: UploadCustomRequestOptions, folder?: string) {
	const { file, onFinish, onError } = options
	if (!file.file) return
	uploadingFields[fieldKey] = true
	try {
		const res = await uploadMedia(file.file, folder)
		const target = model.value as Record<string, unknown>
		if (!Array.isArray(target[fieldKey])) {
			target[fieldKey] = []
		}
		const list = target[fieldKey] as string[]
		if (!list.includes(res.url)) {
			list.push(res.url)
		}
		onFinish()
	} catch (err) {
		onError()
	} finally {
		uploadingFields[fieldKey] = false
	}
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
function isLongTextField(field: FieldDescriptor<TModel>): boolean {
	if (field.type === "textarea" || field.type === "bilingual-textarea") return true
	const key = field.key.toLowerCase()
	return (
		key === "description" ||
		key.endsWith("_description") ||
		key.includes("description") ||
		key === "bio" ||
		key === "notes" ||
		key === "message" ||
		key === "details"
	)
}

function isFieldValueEmpty(field: FieldDescriptor<TModel>, value: unknown): boolean {
	if (field.type === "bilingual-text" || field.type === "bilingual-textarea") return !isBilingualComplete(value)
	if (value === null || value === undefined) return true
	if (Array.isArray(value)) return value.length === 0
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
