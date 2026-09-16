<!-- src/add-os/components/resource/FormFieldsBuilder.vue -->
<!--
	One form builder, used by both Events (registration questions) and
	Services (request fields). The two backends expose the same shape —
	App\Support\Forms is a single engine behind both — so the admin screen
	that edits them is one component, not two that drift apart.

	The caller supplies the four API calls; this component owns the editing,
	validation display and bilingual handling.
-->
<template>
	<n-modal
		v-model:show="show"
		preset="card"
		:title="title ?? t('formFields.title')"
		closable
		style="max-width: 44rem"
		content-style="max-height: 70vh; overflow-y: auto"
	>
		<n-spin :show="isLoading">
			<div class="flex flex-col gap-4">
				<n-alert v-if="reservedKeyNote" type="info" :bordered="false">
					{{ reservedKeyNote }}
				</n-alert>

				<n-alert v-if="loadError" type="error" :title="t('formFields.loadError')" />

				<!-- The add button lives here, above the list, so it keeps one
				     position whether the list is empty, long, or the editor is
				     open. Below the editor it scrolled out of reach after a
				     save and read as "there is no way to add another". -->
				<div v-if="!loadError" class="flex items-center justify-between gap-3">
					<span class="text-xs opacity-60">
						{{ t("formFields.count", { count: fields.length }) }}
					</span>
					<n-button size="small" type="primary" secondary :disabled="isEditing" @click="startCreate">
						<template #icon>
							<Icon name="carbon:add" :size="16" />
						</template>
						{{ t("formFields.add") }}
					</n-button>
				</div>

				<n-empty v-if="!loadError && !fields.length && !isEditing" :description="emptyText ?? t('formFields.empty')" />

				<n-list v-if="fields.length" bordered clickable>
					<n-list-item v-for="field in fields" :key="field.id">
						<div class="flex items-center justify-between gap-3 w-full">
							<div class="flex flex-col gap-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<span class="font-medium truncate">{{ field.label }}</span>
									<n-tag size="small" round :bordered="false" class="font-mono">
										{{ field.type }}
									</n-tag>
									<n-tag v-if="field.is_required" size="small" round type="warning" :bordered="false">
										{{ t("formFields.required") }}
									</n-tag>
									<n-tag v-if="field.is_active === false" size="small" round type="default" :bordered="false">
										{{ t("formFields.inactive") }}
									</n-tag>
								</div>
								<span class="text-xs opacity-60 font-mono truncate">{{ field.key }}</span>
							</div>

							<div class="flex items-center gap-2 shrink-0">
								<n-button
									size="small"
									quaternary
									:aria-label="t('formFields.edit')"
									:title="t('formFields.edit')"
									@click="startEdit(field)"
								>
									<template #icon>
										<Icon name="carbon:edit" :size="16" />
									</template>
								</n-button>
								<n-popconfirm @positive-click="() => remove(field)">
									<template #trigger>
										<n-button
											size="small"
											quaternary
											type="error"
											:aria-label="t('formFields.delete')"
											:title="t('formFields.delete')"
										>
											<template #icon>
												<Icon name="carbon:trash-can" :size="16" />
											</template>
										</n-button>
									</template>
									{{ deleteConfirm ?? t("formFields.deleteConfirm") }}
								</n-popconfirm>
							</div>
						</div>
					</n-list-item>
				</n-list>

				<!-- Editor -->
				<n-card
					v-if="isEditing"
					:title="editingId === null ? t('formFields.add') : t('formFields.edit')"
					size="small"
					bordered
				>
					<n-form :model="draft" label-placement="top">
						<n-form-item
							:label="t('formFields.key')"
							:feedback="errorFor('key') ?? t('formFields.keyHint')"
							:validation-status="errorFor('key') ? 'error' : undefined"
						>
							<n-input v-model:value="draft.key" placeholder="dietary_needs" :disabled="editingId !== null" />
						</n-form-item>

						<n-form-item
							:label="t('formFields.label')"
							:feedback="errorFor('label.ar') ?? errorFor('label.en')"
							:validation-status="errorFor('label.ar') || errorFor('label.en') ? 'error' : undefined"
						>
							<div class="flex w-full gap-2">
								<n-input
									v-model:value="draft.label.ar"
									class="flex-1"
									:placeholder="t('resourceCrud.form.arabicPlaceholder')"
								/>
								<n-input
									v-model:value="draft.label.en"
									class="flex-1"
									:placeholder="t('resourceCrud.form.englishPlaceholder')"
								/>
							</div>
						</n-form-item>

						<n-form-item :label="t('formFields.placeholder')">
							<div class="flex w-full gap-2">
								<n-input
									v-model:value="draft.placeholder.ar"
									class="flex-1"
									:placeholder="t('resourceCrud.form.arabicPlaceholder')"
								/>
								<n-input
									v-model:value="draft.placeholder.en"
									class="flex-1"
									:placeholder="t('resourceCrud.form.englishPlaceholder')"
								/>
							</div>
						</n-form-item>

						<n-form-item
							:label="t('formFields.type')"
							:feedback="errorFor('type')"
							:validation-status="errorFor('type') ? 'error' : undefined"
						>
							<n-select v-model:value="draft.type" :options="typeOptions" />
						</n-form-item>

						<!-- Choices: only meaningful for select/checkbox, and the API
						     refuses those two without at least one. -->
						<n-form-item
							v-if="needsOptions"
							:label="t('formFields.options')"
							:feedback="errorFor('options')"
							:validation-status="errorFor('options') ? 'error' : undefined"
						>
							<div class="flex flex-col gap-2 w-full">
								<div v-for="(option, index) in draft.options" :key="index" class="flex gap-2 items-center">
									<n-input v-model:value="option.value" class="flex-1" placeholder="value" />
									<n-input v-model:value="option.label.ar" class="flex-1" :placeholder="t('resourceCrud.form.arabicPlaceholder')" />
									<n-input v-model:value="option.label.en" class="flex-1" :placeholder="t('resourceCrud.form.englishPlaceholder')" />
									<n-button
										quaternary
										type="error"
										size="small"
										:aria-label="t('formFields.removeOption')"
										:title="t('formFields.removeOption')"
										@click="draft.options.splice(index, 1)"
									>
										<template #icon>
											<Icon name="carbon:close" :size="16" />
										</template>
									</n-button>
								</div>
								<n-button size="tiny" dashed @click="addOption">
									{{ t("formFields.addOption") }}
								</n-button>
							</div>
						</n-form-item>

						<!-- Per-type limits. Which controls appear is driven by the
						     shared vocabulary, so this cannot offer a constraint the
						     API would refuse. -->
						<n-form-item
							v-if="hasConstraints"
							:label="t('formFields.validation.title')"
							:feedback="rangeError ?? t('formFields.validation.hint')"
							:validation-status="rangeError ? 'error' : undefined"
						>
							<div class="flex w-full gap-2 flex-wrap">
								<!-- text / textarea: character counts -->
								<template v-if="draft.type === 'text' || draft.type === 'textarea'">
									<n-input-number
										v-model:value="draft.validation.min"
										class="flex-1 min-w-32"
										:min="0"
										:precision="0"
										clearable
										:placeholder="t('formFields.validation.minChars')"
									/>
									<n-input-number
										v-model:value="draft.validation.max"
										class="flex-1 min-w-32"
										:min="0"
										:precision="0"
										clearable
										:placeholder="t('formFields.validation.maxChars')"
									/>
								</template>

								<!-- number: a value bound, so fractions are allowed -->
								<template v-else-if="draft.type === 'number'">
									<n-input-number
										v-model:value="draft.validation.min"
										class="flex-1 min-w-32"
										clearable
										:placeholder="t('formFields.validation.minValue')"
									/>
									<n-input-number
										v-model:value="draft.validation.max"
										class="flex-1 min-w-32"
										clearable
										:placeholder="t('formFields.validation.maxValue')"
									/>
								</template>

								<!-- date: an absolute calendar range -->
								<template v-else-if="draft.type === 'date'">
									<n-date-picker
										v-model:value="draft.validation.min_date"
										class="flex-1 min-w-40"
										type="date"
										clearable
										:placeholder="t('formFields.validation.minDate')"
									/>
									<n-date-picker
										v-model:value="draft.validation.max_date"
										class="flex-1 min-w-40"
										type="date"
										clearable
										:placeholder="t('formFields.validation.maxDate')"
									/>
								</template>

								<!-- checkbox: how many boxes may be ticked -->
								<template v-else-if="draft.type === 'checkbox'">
									<n-input-number
										v-model:value="draft.validation.min"
										class="flex-1 min-w-32"
										:min="0"
										:precision="0"
										clearable
										:placeholder="t('formFields.validation.minSelections')"
									/>
									<n-input-number
										v-model:value="draft.validation.max"
										class="flex-1 min-w-32"
										:min="0"
										:precision="0"
										clearable
										:placeholder="t('formFields.validation.maxSelections')"
									/>
								</template>

								<!-- rating: the star range, 1..5 unless said otherwise -->
								<template v-else-if="draft.type === 'rating'">
									<n-input-number
										v-model:value="draft.validation.min"
										class="flex-1 min-w-32"
										:min="1"
										:precision="0"
										clearable
										:placeholder="t('formFields.validation.minStars')"
									/>
									<n-input-number
										v-model:value="draft.validation.max"
										class="flex-1 min-w-32"
										:min="1"
										:precision="0"
										clearable
										:placeholder="t('formFields.validation.maxStars')"
									/>
								</template>

								<!-- file: what may be uploaded, and how big -->
								<template v-else-if="draft.type === 'file'">
									<n-select
										:value="draft.validation.accept ?? ''"
										class="flex-1 min-w-40"
										:options="acceptOptions"
										@update:value="value => (draft.validation.accept = value || null)"
									/>
									<n-input-number
										v-model:value="draft.validation.max_kb"
										class="flex-1 min-w-32"
										:min="1"
										:precision="0"
										clearable
										:placeholder="t('formFields.validation.maxKb')"
									/>
								</template>

								<!-- An allowed format is a named pattern, never a raw
								     expression: the API refuses one. -->
								<n-select
									v-if="accepts('regex')"
									:value="draft.validation.regex ?? ''"
									class="w-full"
									:options="patternOptions"
									@update:value="value => (draft.validation.regex = value || null)"
								/>
							</div>
						</n-form-item>

						<div class="flex gap-4">
							<n-form-item :label="t('formFields.required')">
								<n-switch v-model:value="draft.is_required" />
							</n-form-item>
							<n-form-item :label="t('formFields.active')">
								<n-switch v-model:value="draft.is_active" />
							</n-form-item>
							<n-form-item :label="t('formFields.order')" class="flex-1">
								<n-input-number v-model:value="draft.order" :min="0" :precision="0" class="w-full" />
							</n-form-item>
						</div>

						<n-alert v-if="generalError" type="error" :bordered="false" class="mb-3">
							{{ generalError }}
						</n-alert>

						<div class="flex justify-end gap-2">
							<n-button size="small" @click="cancelEdit">
								{{ t("common.close") }}
							</n-button>
							<n-button size="small" type="primary" :loading="isSaving" @click="save">
								{{ t("common.save") }}
							</n-button>
						</div>
					</n-form>
				</n-card>
			</div>
		</n-spin>
	</n-modal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type {
	Bilingual
} from "@/add-os/components/resource/field-types"
import type {
	FieldPatternName,
	FieldValidation,
	FormFieldDefinition,
	FormFieldPayload,
	FormFieldType
} from "@/add-os/components/resource/form-fields"
import {
	NAlert,
	NButton,
	NCard,
	NDatePicker,
	NEmpty,
	NForm,
	NFormItem,
	NInput,
	NInputNumber,
	NList,
	NListItem,
	NModal,
	NPopconfirm,
	NSelect,
	NSpin,
	NSwitch,
	NTag,
	useMessage
} from "naive-ui"
import { computed, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import {
	FIELD_PATTERNS,
	FILE_ACCEPT_OPTIONS,
	FORM_FIELD_TYPES,
	VALIDATION_KEYS_BY_TYPE
} from "@/add-os/components/resource/form-fields"
import { ApiError } from "@/add-os/services/api"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	/** The row whose form is being edited; null closes the builder down. */
	ownerId: number | null
	/** The four calls that reach whichever API owns this form. */
	api: {
		list: (ownerId: number) => Promise<FormFieldDefinition[]>
		create: (ownerId: number, payload: FormFieldPayload) => Promise<unknown>
		update: (ownerId: number, fieldId: number, payload: FormFieldPayload) => Promise<unknown>
		remove: (ownerId: number, fieldId: number) => Promise<unknown>
	}
	/** Domain wording, where the shared default is not specific enough. */
	title?: string
	emptyText?: string
	reservedKeyNote?: string
	deleteConfirm?: string
}>()

const emit = defineEmits<{ changed: [hasFields: boolean] }>()

const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()

const fields = ref<FormFieldDefinition[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const loadError = ref(false)
const editingId = ref<number | null>(null)
const isEditing = ref(false)
const fieldErrors = ref<Record<string, string[]>>({})
const generalError = ref<string | null>(null)

/**
 * The constraint panel's working copy.
 *
 * Flat and holding every type's keys at once, rather than a per-type union:
 * the draft is a long-lived reactive object and the type dropdown changes
 * under it, so a union would have to be rebuilt on every type change. Keys
 * that do not apply to the current type are filtered out at serialisation
 * instead — see toPayload().
 *
 * Dates are epoch milliseconds here because n-date-picker binds a timestamp,
 * and are serialised to YYYY-MM-DD on the way out. They are never "" — an
 * unparseable string crashes the picker synchronously during setup.
 */
interface DraftValidation {
	min: number | null
	max: number | null
	min_date: number | null
	max_date: number | null
	regex: FieldPatternName | null
	accept: string | null
	max_kb: number | null
}

interface Draft {
	key: string
	label: Bilingual
	placeholder: Bilingual
	type: FormFieldType
	options: { value: string, label: Bilingual }[]
	is_required: boolean
	is_active: boolean
	order: number
	validation: DraftValidation
}

function emptyDraft(): Draft {
	return {
		key: "",
		label: { ar: "", en: "" },
		placeholder: { ar: "", en: "" },
		type: "text",
		options: [],
		is_required: false,
		is_active: true,
		order: fields.value.length,
		validation: emptyValidation()
	}
}

/** Always complete, never partial: a half-built object would leave stale keys. */
function emptyValidation(): DraftValidation {
	return {
		min: null,
		max: null,
		min_date: null,
		max_date: null,
		regex: null,
		accept: null,
		max_kb: null
	}
}

/**
 * Narrow what the API returned into the draft's shape.
 *
 * The response type is deliberately loose: a legacy row may hold a key this
 * vocabulary no longer describes, or a value of the wrong type entirely. Each
 * one is checked rather than trusted — a bad date here would otherwise reach
 * n-date-picker and crash it, and a legacy free-form regex would sit in a
 * select that has no such option.
 */
function fromApiValidation(stored: Record<string, unknown> | null | undefined): DraftValidation {
	const draftValidation = emptyValidation()

	if (!stored) return draftValidation

	for (const key of ["min", "max", "max_kb"] as const) {
		const value = Number(stored[key])
		if (stored[key] !== null && stored[key] !== undefined && Number.isFinite(value)) {
			draftValidation[key] = value
		}
	}

	for (const key of ["min_date", "max_date"] as const) {
		if (typeof stored[key] === "string") {
			const parsed = Date.parse(`${stored[key]}T00:00:00`)
			if (!Number.isNaN(parsed)) draftValidation[key] = parsed
		}
	}

	// Anything that is not a name we offer is dropped, matching what the
	// backend does with a legacy expression.
	if (typeof stored.regex === "string" && (FIELD_PATTERNS as readonly string[]).includes(stored.regex)) {
		draftValidation.regex = stored.regex as FieldPatternName
	}

	if (typeof stored.accept === "string" && stored.accept.trim() !== "") {
		draftValidation.accept = stored.accept
	}

	return draftValidation
}

/** An epoch timestamp as the API's YYYY-MM-DD, in the viewer's own day. */
function toIsoDate(timestamp: number): string {
	const date = new Date(timestamp)
	const month = `${date.getMonth() + 1}`.padStart(2, "0")
	const day = `${date.getDate()}`.padStart(2, "0")

	return `${date.getFullYear()}-${month}-${day}`
}

const draft = reactive<Draft>(emptyDraft())

const typeOptions = computed<SelectOption[]>(() =>
	FORM_FIELD_TYPES.map(type => ({ label: type, value: type }))
)

const needsOptions = computed(() => draft.type === "select" || draft.type === "checkbox")

/** The constraint keys the current type accepts, per the shared vocabulary. */
const constraintKeys = computed(() => VALIDATION_KEYS_BY_TYPE[draft.type] ?? [])

const hasConstraints = computed(() => constraintKeys.value.length > 0)

function accepts(key: keyof FieldValidation): boolean {
	return (constraintKeys.value as readonly string[]).includes(key)
}

const patternOptions = computed<SelectOption[]>(() => [
	{ label: t("formFields.validation.patternAny"), value: "" },
	...FIELD_PATTERNS.map(name => ({ label: t(`formFields.validation.patterns.${name}`), value: name }))
])

const ACCEPT_LABELS: Record<string, string> = {
	"image/*": "image",
	"video/*": "video",
	"audio/*": "audio",
	".pdf": "pdf",
	".docx": "word",
	".xlsx": "excel"
}

const acceptOptions = computed<SelectOption[]>(() => [
	{ label: t("formFields.validation.acceptAny"), value: "" },
	...FILE_ACCEPT_OPTIONS.map(value => ({
		label: t(`formFields.validation.accepts.${ACCEPT_LABELS[value]}`),
		value
	}))
])

/**
 * A lower bound above its upper one accepts nothing at all, which is never
 * what the admin meant. The server rejects it too; this says so next to the
 * two inputs rather than as a 422 keyed to a path the admin never typed.
 */
const rangeError = computed<string | null>(() => {
	const pairs: [number | null, number | null][] = [
		[draft.validation.min, draft.validation.max],
		[draft.validation.min_date, draft.validation.max_date]
	]

	for (const [lower, upper] of pairs) {
		if (lower !== null && upper !== null && lower > upper) {
			return t("formFields.validation.rangeError")
		}
	}

	return null
})

function errorFor(path: string): string | undefined {
	return fieldErrors.value[path]?.[0]
}

function resetDraft(next: Draft) {
	Object.assign(draft, next)
	fieldErrors.value = {}
	generalError.value = null
}

async function load() {
	if (props.ownerId === null) return
	isLoading.value = true
	loadError.value = false
	try {
		fields.value = await props.api.list(props.ownerId)
	} catch {
		loadError.value = true
	} finally {
		isLoading.value = false
	}
}

watch(
	() => [show.value, props.ownerId] as const,
	([visible]) => {
		if (visible) {
			cancelEdit()
			load()
		}
	},
	{ immediate: true }
)

function startCreate() {
	editingId.value = null
	resetDraft(emptyDraft())
	isEditing.value = true
}

function startEdit(field: FormFieldDefinition) {
	editingId.value = field.id
	resetDraft({
		key: field.key,
		// The list endpoint returns labels already resolved to one locale, so
		// the other half is only known once the admin retypes it. Seeding both
		// with what we have beats blanking a value that is already set.
		label: { ar: field.label, en: field.label },
		placeholder: { ar: field.placeholder ?? "", en: field.placeholder ?? "" },
		type: field.type,
		options: (field.options ?? []).map(o => ({ value: o.value, label: { ar: o.label, en: o.label } })),
		is_required: field.is_required,
		is_active: field.is_active ?? true,
		order: field.order ?? 0,
		validation: fromApiValidation(field.validation)
	})
	isEditing.value = true
}

function cancelEdit() {
	isEditing.value = false
	editingId.value = null
	fieldErrors.value = {}
	generalError.value = null
}

function addOption() {
	draft.options.push({ value: "", label: { ar: "", en: "" } })
}

function toPayload(): FormFieldPayload {
	const payload: FormFieldPayload = {
		key: draft.key.trim(),
		label: { ...draft.label },
		type: draft.type,
		is_required: draft.is_required,
		is_active: draft.is_active,
		order: draft.order
	}

	if (draft.placeholder.ar || draft.placeholder.en) {
		payload.placeholder = { ...draft.placeholder }
	}

	// Sent only for the types that use them: the API rejects an empty option
	// set on select/checkbox, and ignores options on everything else.
	if (needsOptions.value) {
		payload.options = draft.options
			.filter(o => o.value.trim() !== "")
			.map(o => ({ value: o.value.trim(), label: { ...o.label } }))
	}

	payload.validation = collectValidation()

	return payload
}

/**
 * The constraints, filtered to the keys the chosen type accepts.
 *
 * Filtering here rather than by watching the type is deliberate: an admin who
 * sets a character limit, switches the type to date and switches back should
 * find their limit still there. The server would reject a key that does not
 * belong to the type, so the filter is also what keeps a stale value from
 * causing a 422 the admin cannot explain.
 *
 * Always returned, `{}` included — omitting the key would leave an existing
 * constraint untouched, so clearing one would be impossible.
 */
function collectValidation(): FieldValidation {
	const collected: FieldValidation = {}

	for (const key of ["min", "max", "max_kb"] as const) {
		if (accepts(key) && draft.validation[key] !== null) {
			collected[key] = draft.validation[key] as number
		}
	}

	for (const key of ["min_date", "max_date"] as const) {
		const value = draft.validation[key]
		if (accepts(key) && value !== null) {
			collected[key] = toIsoDate(value)
		}
	}

	if (accepts("regex") && draft.validation.regex) {
		collected.regex = draft.validation.regex
	}

	if (accepts("accept") && draft.validation.accept) {
		collected.accept = draft.validation.accept
	}

	return collected
}

function applyError(error: unknown) {
	if (error instanceof ApiError && error.data) {
		fieldErrors.value = error.data.errors ?? {}
		generalError.value = Object.keys(fieldErrors.value).length ? null : (error.data.message ?? null)
		return
	}
	generalError.value = t("formFields.saveError")
}

async function save() {
	if (props.ownerId === null) return
	// An inverted range is caught here so the admin sees it beside the inputs
	// rather than as a server error keyed to a path they never typed.
	if (rangeError.value) return
	isSaving.value = true
	fieldErrors.value = {}
	generalError.value = null

	try {
		if (editingId.value === null) {
			await props.api.create(props.ownerId, toPayload())
			message.success(t("formFields.created"))
		} else {
			await props.api.update(props.ownerId, editingId.value, toPayload())
			message.success(t("formFields.updated"))
		}
		cancelEdit()
		await load()
		emit("changed", fields.value.some(f => f.is_active !== false))
	} catch (error) {
		applyError(error)
	} finally {
		isSaving.value = false
	}
}

async function remove(field: FormFieldDefinition) {
	if (props.ownerId === null) return
	try {
		await props.api.remove(props.ownerId, field.id)
		message.success(t("formFields.deleted"))
		await load()
		emit("changed", fields.value.some(f => f.is_active !== false))
	} catch {
		message.error(t("formFields.saveError"))
	}
}

defineExpose({ startCreate, startEdit, save, remove, draft, errorFor, rangeError })
</script>
