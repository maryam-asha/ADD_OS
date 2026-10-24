<!-- src/add-os/modules/inventory/components/ItemModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="item ? t('inventory.items.edit') : t('inventory.items.add')" size="lg" icon="carbon:box">
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('inventory.common.nameAr')" required>
				<n-input v-model:value="form.nameAr" dir="rtl" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('inventory.common.nameEn')">
				<n-input v-model:value="form.nameEn" dir="ltr" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('inventory.common.category')" required>
				<n-select v-model:value="form.categoryId" :options="categoryOptions" filterable />
			</n-form-item>
			<n-form-item :label="t('inventory.items.unit')" required>
				<n-select v-model:value="form.unitId" :options="unitOptions" filterable />
			</n-form-item>
			<n-form-item :label="t('inventory.items.sku')" :feedback="item ? undefined : t('inventory.items.skuHint')">
				<n-input v-model:value="form.sku" dir="ltr" :maxlength="40" class="font-mono" />
			</n-form-item>
			<n-form-item :label="t('inventory.common.status')">
				<n-checkbox v-model:checked="form.active">{{ t("inventory.common.active") }}</n-checkbox>
			</n-form-item>
			<n-form-item :label="t('inventory.items.descriptionLabel')" class="sm:col-span-2">
				<n-input v-model:value="form.description" type="textarea" :maxlength="5000" :autosize="{ minRows: 2, maxRows: 4 }" />
			</n-form-item>
		</div>

		<template v-if="fields.length">
			<span class="mb-1 block text-sm font-semibold">{{ t("inventory.items.properties") }}</span>
			<p class="mb-3 text-sm text-secondary">{{ t("inventory.items.propertiesHint") }}</p>
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item v-for="field in fields" :key="field.key" :label="fieldLabel(field)" :required="field.is_required">
					<n-input-number v-if="field.type === 'number'" :value="numberOf(field.key)" clearable class="w-full" dir="ltr" @update:value="(v: number | null) => (properties[field.key] = v)" />
					<n-switch v-else-if="field.type === 'boolean'" :value="properties[field.key] === true" @update:value="(v: boolean) => (properties[field.key] = v)" />
					<n-date-picker v-else-if="field.type === 'date'" :formatted-value="stringOf(field.key)" value-format="yyyy-MM-dd" type="date" clearable class="w-full" @update:formatted-value="(v: string | null) => (properties[field.key] = v)" />
					<n-select v-else-if="field.type === 'select'" :value="stringOf(field.key)" :options="(field.options ?? []).map(o => ({ label: o, value: o }))" clearable @update:value="(v: string | null) => (properties[field.key] = v)" />
					<n-input v-else :value="stringOf(field.key) ?? ''" :maxlength="1000" @update:value="(v: string) => (properties[field.key] = v || null)" />
				</n-form-item>
			</div>
		</template>
		<p v-if="problem" class="text-sm text-error">{{ problem }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("inventory.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!form.nameAr.trim() || !form.categoryId || !form.unitId || fieldsLoading" @click="save">{{ t("inventory.common.save") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { AttributeDefinition, Category, Item, PropertyValue, Unit } from "@/add-os/modules/inventory/types/inventory"
import { NButton, NCheckbox, NDatePicker, NFormItem, NInput, NInputNumber, NSelect, NSwitch, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { localized } from "@/add-os/modules/inventory/utils/display"
import { createItem, getCategory, updateItem } from "@/add-os/services/inventory"

/**
 * A kind of thing in the catalog ("27-inch monitor", "A4 paper"). Whether
 * it is an asset or stock comes from its category; its properties answer
 * that category's fields, its own and its ancestors'. Sent whole, they
 * replace the stored ones; a field no longer in the category is dropped.
 */
const props = defineProps<{ item: Item | null; categories: Category[]; units: Unit[] }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()
const message = useMessage()

const form = ref({ nameAr: "", nameEn: "", categoryId: null as number | null, unitId: null as number | null, sku: "", description: "", active: true })
const properties = ref<Record<string, PropertyValue>>({})
const fields = ref<AttributeDefinition[]>([])
/** Saving waits for them: properties are sent whole, and sent before they load they would replace the stored ones with nothing. */
const fieldsLoading = ref(false)
const saving = ref(false)
const problem = ref("")

const categoryOptions = computed<SelectOption[]>(() => props.categories.map(c => ({ label: `${localized(c.name)} · ${t(`inventory.kind.${c.kind}`)}`, value: c.id })))
const unitOptions = computed<SelectOption[]>(() => props.units.map(u => ({ label: localized(u.name), value: u.id })))

const fieldLabel = (field: AttributeDefinition) => (field.unit ? `${localized(field.label)} (${field.unit})` : localized(field.label))
const numberOf = (key: string) => (typeof properties.value[key] === "number" ? (properties.value[key] as number) : properties.value[key] ? Number(properties.value[key]) : null)
const stringOf = (key: string) => (properties.value[key] === null || properties.value[key] === undefined ? null : String(properties.value[key]))

watch(
	() => form.value.categoryId,
	async id => {
		fields.value = []
		if (!id) return
		fieldsLoading.value = true
		await quietly(() => getCategory(id), category => (fields.value = category.fields ?? []))
		fieldsLoading.value = false
	}
)

watch(show, open => {
	if (!open) return
	const i = props.item
	form.value = i
		? { nameAr: i.name.ar, nameEn: i.name.en ?? "", categoryId: i.category.id, unitId: i.unit.id, sku: i.sku, description: i.description ?? "", active: i.is_active }
		: { nameAr: "", nameEn: "", categoryId: null, unitId: null, sku: "", description: "", active: true }
	properties.value = { ...(i?.properties ?? {}) }
	problem.value = ""
})

async function save() {
	saving.value = true
	problem.value = ""
	const f = form.value
	// Only the category's own fields, and only the ones answered.
	const answered = Object.fromEntries(fields.value.map(field => [field.key, properties.value[field.key] ?? null]).filter(([, value]) => value !== null && value !== ""))
	const payload = {
		name: { ar: f.nameAr.trim(), en: f.nameEn.trim() || null },
		category_id: f.categoryId!,
		unit_id: f.unitId!,
		description: f.description.trim() || null,
		is_active: f.active,
		properties: answered,
		...(f.sku.trim() ? { sku: f.sku.trim() } : {})
	}
	try {
		if (props.item) await updateItem(props.item.id, payload)
		else await createItem(payload)
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
