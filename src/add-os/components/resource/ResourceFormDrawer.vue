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
					<n-input
						v-model:value="((model as Record<string, unknown>)[field.key] as Bilingual).ar"
						:placeholder="t('resourceCrud.form.arabicPlaceholder')"
					/>
					<n-input
						v-model:value="((model as Record<string, unknown>)[field.key] as Bilingual).en"
						:placeholder="t('resourceCrud.form.englishPlaceholder')"
					/>
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
import { NButton, NForm, NFormItem, NInput, NInputNumber, NModal, NSelect, NSwitch } from "naive-ui"
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

const rules = computed<FormRules>(() => {
	const result: FormRules = {}
	for (const field of props.fields) {
		if (field.rule) {
			result[field.key] = field.rule
			continue
		}
		if (!field.required) continue

		const message = t("resourceCrud.validation.required", { field: t(field.labelKey) })

		if (field.type === "bilingual-text") {
			/**
			 * A bilingual value is an object, and async-validator cannot check one
			 * with its built-in keywords: `required` alone never fires, because
			 * `isEmptyValue` counts only undefined/null/""/[] as empty — and a rule
			 * carrying neither `type` nor `validator` defaults to `type: "string"`,
			 * whose type check then rejects the object even when both halves are
			 * filled. So the bare-keyword rule made these fields unsubmittable
			 * rather than under-validated.
			 *
			 * A custom `validator` replaces the built-in check outright
			 * (`getValidationMethod` prefers it, and `getType` stops forcing
			 * "string" once it is present). `required` is kept purely so naive-ui
			 * still marks the label with its asterisk.
			 */
			result[field.key] = {
				required: true,
				trigger: ["blur", "change", "input"],
				validator: (_rule, value) => isBilingualComplete(value) || new Error(message)
			}
			continue
		}

		result[field.key] = {
			required: true,
			message,
			trigger: ["blur", "change", "input"]
		}
	}
	return result
})

/**
 * Laravel reports a bilingual field's errors under dotted sub-keys (`name.ar`,
 * `name.en`) and never the bare `name` the template looks up, so a 422 on those
 * fields used to show the user nothing at all — and 422s are deliberately not
 * toasted either, leaving no feedback anywhere. Fold every key onto its root
 * segment, concatenating when more than one sub-key of the same field failed.
 */
function foldFieldErrors(errors: Record<string, string[]>): Record<string, string[]> {
	const folded: Record<string, string[]> = {}
	for (const [key, messages] of Object.entries(errors)) {
		const root = key.split(".")[0]
		const list = Array.isArray(messages) ? messages : [String(messages)]
		folded[root] = [...(folded[root] ?? []), ...list]
	}
	return folded
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
			fieldErrors.value = foldFieldErrors(caught.data.errors)
		}
	}
}

defineExpose({ handleSubmit, fieldErrors, dynamicOptions })
</script>
