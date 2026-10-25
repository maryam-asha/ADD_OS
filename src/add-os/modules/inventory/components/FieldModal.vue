<!-- src/add-os/modules/inventory/components/FieldModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="field ? t('inventory.fields.edit') : t('inventory.fields.add')" size="md" icon="carbon:list-boxes">
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('inventory.fields.key')" :feedback="t('inventory.fields.keyHint')" required>
				<n-input v-model:value="form.key" dir="ltr" :maxlength="40" class="font-mono" :disabled="!!field" />
			</n-form-item>
			<n-form-item :label="t('inventory.fields.type')" required>
				<n-select v-model:value="form.type" :options="typeOptions" :disabled="!!field" />
			</n-form-item>
			<n-form-item :label="t('inventory.common.nameAr')" required>
				<n-input v-model:value="form.labelAr" dir="rtl" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('inventory.common.nameEn')">
				<n-input v-model:value="form.labelEn" dir="ltr" :maxlength="255" />
			</n-form-item>
			<n-form-item v-if="form.type === 'select'" :label="t('inventory.fields.options')" class="sm:col-span-2" required>
				<n-dynamic-tags v-model:value="form.options" />
			</n-form-item>
			<n-form-item :label="t('inventory.fields.unit')">
				<n-input v-model:value="form.unit" :maxlength="20" />
			</n-form-item>
			<n-form-item :label="t('inventory.catalog.order')">
				<n-input-number v-model:value="form.order" :min="0" :precision="0" class="w-full" />
			</n-form-item>
		</div>
		<n-checkbox v-model:checked="form.required">{{ t("inventory.fields.required") }}</n-checkbox>
		<p v-if="problem" class="mt-2 text-sm text-error">{{ problem }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("inventory.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!ready" @click="save">{{ t("inventory.common.save") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { AttributeDefinition, AttributeType } from "@/add-os/modules/inventory/types/inventory"
import { NButton, NCheckbox, NDynamicTags, NFormItem, NInput, NInputNumber, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { ATTRIBUTE_TYPES } from "@/add-os/modules/inventory/types/inventory"
import { addField, updateField } from "@/add-os/services/inventory"

/**
 * A field a category's items answer (a screen's resolution, a chair's
 * colour), and the items of every category below it too. Its key and type
 * are fixed once created: items already store answers under them.
 */
const props = defineProps<{ categoryId: number; field: AttributeDefinition | null }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()
const message = useMessage()

const form = ref({ key: "", type: "text" as AttributeType, labelAr: "", labelEn: "", options: [] as string[], unit: "", order: 0, required: false })
const saving = ref(false)
const problem = ref("")

const typeOptions = computed<SelectOption[]>(() => ATTRIBUTE_TYPES.map(type => ({ label: t(`inventory.fieldType.${type}`), value: type })))
const ready = computed(() => /^[a-z][a-z0-9_]*$/.test(form.value.key) && form.value.labelAr.trim() !== "" && (form.value.type !== "select" || form.value.options.length > 0))

watch(show, open => {
	if (!open) return
	const f = props.field
	form.value = f
		? { key: f.key, type: f.type, labelAr: f.label.ar, labelEn: f.label.en ?? "", options: [...(f.options ?? [])], unit: f.unit ?? "", order: f.order, required: f.is_required }
		: { key: "", type: "text", labelAr: "", labelEn: "", options: [], unit: "", order: 0, required: false }
	problem.value = ""
})

async function save() {
	saving.value = true
	problem.value = ""
	const f = form.value
	const common = {
		label: { ar: f.labelAr.trim(), en: f.labelEn.trim() || null },
		unit: f.unit.trim() || null,
		order: f.order,
		is_required: f.required,
		...(f.type === "select" ? { options: f.options } : {})
	}
	try {
		if (props.field) await updateField(props.field.id, common)
		else await addField(props.categoryId, { ...common, key: f.key, type: f.type })
		message.success(t("inventory.common.saved"))
		show.value = false
		emit("saved")
	} catch (e) {
		problem.value = apiErrorMessage(e, t("inventory.common.saveError"))
	} finally {
		saving.value = false
	}
}
</script>
