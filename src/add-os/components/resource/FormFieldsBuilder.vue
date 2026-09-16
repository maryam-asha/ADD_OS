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
	FormFieldDefinition,
	FormFieldPayload,
	FormFieldType
} from "@/add-os/components/resource/form-fields"
import {
	NAlert,
	NButton,
	NCard,
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
import { FORM_FIELD_TYPES } from "@/add-os/components/resource/form-fields"
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

interface Draft {
	key: string
	label: Bilingual
	placeholder: Bilingual
	type: FormFieldType
	options: { value: string, label: Bilingual }[]
	is_required: boolean
	is_active: boolean
	order: number
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
		order: fields.value.length
	}
}

const draft = reactive<Draft>(emptyDraft())

const typeOptions = computed<SelectOption[]>(() =>
	FORM_FIELD_TYPES.map(type => ({ label: type, value: type }))
)

const needsOptions = computed(() => draft.type === "select" || draft.type === "checkbox")

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
		order: field.order ?? 0
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

	return payload
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

defineExpose({ startCreate, startEdit, save, remove, draft, errorFor })
</script>
