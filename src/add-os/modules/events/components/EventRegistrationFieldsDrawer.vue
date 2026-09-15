<!-- src/add-os/modules/events/components/EventRegistrationFieldsDrawer.vue -->
<template>
	<n-modal
		v-model:show="show"
		preset="card"
		:title="t('events.fields.title')"
		closable
		style="max-width: 44rem"
		content-style="max-height: 70vh; overflow-y: auto"
	>
		<n-spin :show="isLoading">
			<div class="flex flex-col gap-4">
				<n-alert type="info" :bordered="false">
					{{ t("events.fields.reservedKeyNote") }}
				</n-alert>

				<n-alert v-if="loadError" type="error" :title="t('events.fields.loadError')" />

				<n-empty v-else-if="!fields.length && !isEditing" :description="t('events.fields.empty')">
					<template #extra>
						<n-button size="small" @click="startCreate">
							{{ t("events.fields.add") }}
						</n-button>
					</template>
				</n-empty>

				<n-list v-else-if="fields.length" bordered clickable>
					<n-list-item v-for="field in fields" :key="field.id">
						<div class="flex items-center justify-between gap-3 w-full">
							<div class="flex flex-col gap-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<span class="font-medium truncate">{{ field.label }}</span>
									<n-tag size="small" round :bordered="false">
										{{ t(`events.fields.types.${field.type}`) }}
									</n-tag>
									<n-tag v-if="field.is_required" size="small" round type="warning" :bordered="false">
										{{ t("events.fields.required") }}
									</n-tag>
									<n-tag v-if="!field.is_active" size="small" round type="default" :bordered="false">
										{{ t("events.fields.inactive") }}
									</n-tag>
								</div>
								<span class="text-xs opacity-60 font-mono truncate">{{ field.key }}</span>
							</div>

							<div class="flex items-center gap-2 shrink-0">
								<n-button size="small" quaternary @click="startEdit(field)">
									<template #icon>
										<Icon name="carbon:edit" :size="16" />
									</template>
								</n-button>
								<n-popconfirm @positive-click="() => remove(field)">
									<template #trigger>
										<n-button size="small" quaternary type="error">
											<template #icon>
												<Icon name="carbon:trash-can" :size="16" />
											</template>
										</n-button>
									</template>
									{{ t("events.fields.deleteConfirm") }}
								</n-popconfirm>
							</div>
						</div>
					</n-list-item>
				</n-list>

				<div v-if="fields.length && !isEditing" class="flex justify-end">
					<n-button size="small" @click="startCreate">
						<template #icon>
							<Icon name="carbon:add" :size="16" />
						</template>
						{{ t("events.fields.add") }}
					</n-button>
				</div>

				<!-- Editor -->
				<n-card
					v-if="isEditing"
					:title="editingId === null ? t('events.fields.add') : t('events.fields.edit')"
					size="small"
					bordered
				>
					<n-form :model="draft" label-placement="top">
						<n-form-item
							:label="t('events.fields.key')"
							:feedback="errorFor('key') ?? t('events.fields.keyHint')"
							:validation-status="errorFor('key') ? 'error' : undefined"
						>
							<n-input v-model:value="draft.key" placeholder="dietary_needs" :disabled="editingId !== null" />
						</n-form-item>

						<n-form-item
							:label="t('events.fields.label')"
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

						<n-form-item :label="t('events.fields.placeholder')">
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
							:label="t('events.fields.type')"
							:feedback="errorFor('type')"
							:validation-status="errorFor('type') ? 'error' : undefined"
						>
							<n-select v-model:value="draft.type" :options="typeOptions" />
						</n-form-item>

						<!-- Choices: only meaningful for select/checkbox, and the API
						     refuses those two without at least one. -->
						<n-form-item
							v-if="needsOptions"
							:label="t('events.fields.options')"
							:feedback="errorFor('options')"
							:validation-status="errorFor('options') ? 'error' : undefined"
						>
							<div class="flex flex-col gap-2 w-full">
								<div v-for="(option, index) in draft.options" :key="index" class="flex gap-2 items-center">
									<n-input v-model:value="option.value" class="flex-1" placeholder="value" />
									<n-input v-model:value="option.label.ar" class="flex-1" :placeholder="t('resourceCrud.form.arabicPlaceholder')" />
									<n-input v-model:value="option.label.en" class="flex-1" :placeholder="t('resourceCrud.form.englishPlaceholder')" />
									<n-button quaternary type="error" size="small" @click="draft.options.splice(index, 1)">
										<template #icon>
											<Icon name="carbon:close" :size="16" />
										</template>
									</n-button>
								</div>
								<n-button size="tiny" dashed @click="addOption">
									{{ t("events.fields.addOption") }}
								</n-button>
							</div>
						</n-form-item>

						<div class="flex gap-4">
							<n-form-item :label="t('events.fields.required')">
								<n-switch v-model:value="draft.is_required" />
							</n-form-item>
							<n-form-item :label="t('events.fields.active')">
								<n-switch v-model:value="draft.is_active" />
							</n-form-item>
							<n-form-item :label="t('events.fields.order')" class="flex-1">
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
	EventFieldType,
	EventRegistrationField,
	EventRegistrationFieldPayload
} from "@/add-os/modules/events/types/event"
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
import { ApiError } from "@/add-os/services/api"
import {
	createRegistrationField,
	listRegistrationFields,
	removeRegistrationField,
	updateRegistrationField
} from "@/add-os/services/events"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{ eventId: number | null }>()
const emit = defineEmits<{ changed: [hasFields: boolean] }>()

const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()

const FIELD_TYPES: EventFieldType[] = ["text", "textarea", "select", "checkbox", "date", "number", "rating", "file"]

const fields = ref<EventRegistrationField[]>([])
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
	type: EventFieldType
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
	FIELD_TYPES.map(type => ({ label: t(`events.fields.types.${type}`), value: type }))
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
	if (props.eventId === null) return
	isLoading.value = true
	loadError.value = false
	try {
		fields.value = await listRegistrationFields(props.eventId)
	} catch {
		loadError.value = true
	} finally {
		isLoading.value = false
	}
}

watch(
	() => [show.value, props.eventId] as const,
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

function startEdit(field: EventRegistrationField) {
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
		is_active: field.is_active,
		order: field.order
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

function toPayload(): EventRegistrationFieldPayload {
	const payload: EventRegistrationFieldPayload = {
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
	generalError.value = t("events.fields.saveError")
}

async function save() {
	if (props.eventId === null) return
	isSaving.value = true
	fieldErrors.value = {}
	generalError.value = null

	try {
		if (editingId.value === null) {
			await createRegistrationField(props.eventId, toPayload())
			message.success(t("events.fields.created"))
		} else {
			await updateRegistrationField(props.eventId, editingId.value, toPayload())
			message.success(t("events.fields.updated"))
		}
		cancelEdit()
		await load()
		emit("changed", fields.value.some(f => f.is_active))
	} catch (error) {
		applyError(error)
	} finally {
		isSaving.value = false
	}
}

async function remove(field: EventRegistrationField) {
	if (props.eventId === null) return
	try {
		await removeRegistrationField(props.eventId, field.id)
		message.success(t("events.fields.deleted"))
		await load()
		emit("changed", fields.value.some(f => f.is_active))
	} catch {
		message.error(t("events.fields.saveError"))
	}
}
</script>
