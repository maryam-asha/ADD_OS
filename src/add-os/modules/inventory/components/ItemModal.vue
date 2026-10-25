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
				<n-input v-model:value="form.sku" dir="ltr" :maxlength="40" :class="{ 'font-mono': form.sku }" />
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
				<n-form-item
					v-for="field in fields"
					:key="field.key"
					:label="fieldLabel(field)"
					:required="field.is_required"
					:validation-status="propertyErrors[field.key] ? 'error' : undefined"
					:feedback="propertyErrors[field.key]"
				>
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
import { categoryPaths, localized } from "@/add-os/modules/inventory/utils/display"
import { ApiError } from "@/add-os/services/api"
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
/** Per field key: shown under that field — a required one left empty, or one ADD Core refused. */
const propertyErrors = ref<Record<string, string>>({})

const categoryOptions = computed<SelectOption[]>(() => categoryPaths(props.categories).map(({ category, path }) => ({ label: `${path} · ${t(`inventory.kind.${category.kind}`)}`, value: category.id })))
const unitOptions = computed<SelectOption[]>(() => props.units.map(u => ({ label: localized(u.name), value: u.id })))

const fieldLabel = (field: AttributeDefinition) => (field.unit ? `${localized(field.label)} (${field.unit})` : localized(field.label))
const numberOf = (key: string) => (typeof properties.value[key] === "number" ? (properties.value[key] as number) : properties.value[key] ? Number(properties.value[key]) : null)
const stringOf = (key: string) => (properties.value[key] === null || properties.value[key] === undefined ? null : String(properties.value[key]))
const answered = (key: string) => properties.value[key] !== null && properties.value[key] !== undefined && properties.value[key] !== ""

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

// Changing an answer clears that field's error; the next save checks again.
watch(
	() => ({ ...properties.value }),
	(now, before) => {
		for (const key of Object.keys(propertyErrors.value)) {
			if (now[key] !== before[key]) delete propertyErrors.value[key]
		}
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
	propertyErrors.value = {}
})

async function save() {
	problem.value = ""
	propertyErrors.value = Object.fromEntries(fields.value.filter(field => field.is_required && !answered(field.key)).map(field => [field.key, t("inventory.items.propertyRequired")]))
	if (Object.keys(propertyErrors.value).length) return
	saving.value = true
	const f = form.value
	// Only the category's own fields, and only the ones answered.
	const answers = Object.fromEntries(fields.value.filter(field => answered(field.key)).map(field => [field.key, properties.value[field.key]]))
	const payload = {
		name: { ar: f.nameAr.trim(), en: f.nameEn.trim() || null },
		category_id: f.categoryId!,
		unit_id: f.unitId!,
		description: f.description.trim() || null,
		is_active: f.active,
		properties: answers,
		...(f.sku.trim() ? { sku: f.sku.trim() } : {})
	}
	try {
		if (props.item) await updateItem(props.item.id, payload)
		else await createItem(payload)
		message.success(t("inventory.common.saved"))
		show.value = false
		emit("saved")
	} catch (e) {
		// ADD Core names a property by its key ("properties.ram_gb"), which means nothing to the
		// person filling the form: the error goes under that field, in our words.
		const errors = e instanceof ApiError ? (e.data?.errors ?? {}) : {}
		const refused = Object.keys(errors).filter(key => key.startsWith("properties.")).map(key => key.slice("properties.".length))
		propertyErrors.value = Object.fromEntries(refused.map(key => [key, t("inventory.items.propertyInvalid")]))
		const other = Object.entries(errors).find(([key]) => !key.startsWith("properties."))
		if (other) problem.value = other[1][0] ?? t("inventory.common.saveError")
		else if (!refused.length) problem.value = apiErrorMessage(e, t("inventory.common.saveError"))
	} finally {
		saving.value = false
	}
}
</script>
