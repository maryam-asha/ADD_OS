<!-- src/add-os/components/resource/ResourceFormDrawer.vue -->
<template>
	<n-drawer v-model:show="show" :width="420">
		<n-drawer-content :title closable>
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
		</n-drawer-content>
	</n-drawer>
</template>

<script setup lang="ts" generic="TModel extends Record<string, unknown>">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { Bilingual, FieldDescriptor } from "./field-types"
import { NButton, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch } from "naive-ui"
import { computed, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import { buildPayload } from "./field-types"

const props = defineProps<{
	fields: FieldDescriptor<TModel>[]
	mode: "create" | "edit"
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

for (const field of props.fields) {
	const keys = dependsOnKeys(field)
	if (keys.length === 0 || !field.optionsFrom) continue

	watch(
		keys.map(key => () => (model.value as Record<string, unknown>)[key]),
		async values => {
			const parentValues = Object.fromEntries(keys.map((key, i) => [key, values[i]]))
			const options = await field.optionsFrom!(parentValues, model.value)
			dynamicOptions[field.key] = options

			const current = (model.value as Record<string, unknown>)[field.key]
			if (current !== null && current !== undefined && !options.some(option => option.value === current)) {
				(model.value as Record<string, unknown>)[field.key] = null
			}
		},
		{ immediate: true }
	)
}

const rules = computed<FormRules>(() => {
	const result: FormRules = {}
	for (const field of props.fields) {
		if (field.rule) {
			result[field.key] = field.rule
		} else if (field.required) {
			result[field.key] = {
				required: true,
				message: t("resourceCrud.validation.required", { field: t(field.labelKey) }),
				trigger: ["blur", "change", "input"]
			}
		}
	}
	return result
})

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
			fieldErrors.value = caught.data.errors
		}
	}
}

defineExpose({ handleSubmit, fieldErrors, dynamicOptions })
</script>
