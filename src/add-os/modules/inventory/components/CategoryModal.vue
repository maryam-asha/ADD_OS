<!-- src/add-os/modules/inventory/components/CategoryModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="category ? t('inventory.catalog.editCategory') : t('inventory.catalog.addCategory')" size="md" icon="carbon:tree-view">
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('inventory.common.nameAr')" required>
				<n-input v-model:value="form.nameAr" dir="rtl" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('inventory.common.nameEn')">
				<n-input v-model:value="form.nameEn" dir="ltr" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('inventory.catalog.parent')" :feedback="t('inventory.catalog.parentHint')">
				<n-select v-model:value="form.parentId" :options="parentOptions" clearable filterable />
			</n-form-item>
			<n-form-item :label="t('inventory.catalog.kind')" :feedback="form.parentId ? t('inventory.catalog.kindFollowsParent') : t('inventory.catalog.kindHint')">
				<n-radio-group v-model:value="form.kind" :disabled="!!form.parentId">
					<n-radio-button value="asset">{{ t("inventory.kind.asset") }}</n-radio-button>
					<n-radio-button value="stock">{{ t("inventory.kind.stock") }}</n-radio-button>
				</n-radio-group>
			</n-form-item>
			<n-form-item :label="t('inventory.catalog.icon')">
				<n-input v-model:value="form.icon" dir="ltr" :maxlength="40" />
			</n-form-item>
			<n-form-item :label="t('inventory.catalog.order')">
				<n-input-number v-model:value="form.order" :min="0" :precision="0" class="w-full" />
			</n-form-item>
		</div>
		<n-checkbox v-model:checked="form.showToMembers">{{ t("inventory.catalog.showToMembers") }}</n-checkbox>
		<p class="mt-1 text-xs text-secondary">{{ t("inventory.catalog.showToMembersHint") }}</p>
		<p v-if="problem" class="mt-2 text-sm text-error">{{ problem }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("inventory.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!form.nameAr.trim()" @click="save">{{ t("inventory.common.save") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { Category, ItemKind } from "@/add-os/modules/inventory/types/inventory"
import { NButton, NCheckbox, NFormItem, NInput, NInputNumber, NRadioButton, NRadioGroup, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { categoryPaths } from "@/add-os/modules/inventory/utils/display"
import { createCategory, updateCategory } from "@/add-os/services/inventory"

/**
 * A node of the catalog tree. A root category names its kind — assets
 * tracked one by one, or stock counted by quantity — and every category
 * below it takes the same; ADD Core refuses a move that would mix them.
 */
const props = defineProps<{ category: Category | null; categories: Category[]; parentId?: number | null }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()
const message = useMessage()

const form = ref({ nameAr: "", nameEn: "", parentId: null as number | null, kind: "asset" as ItemKind, icon: "", order: 0, showToMembers: false })
const saving = ref(false)
const problem = ref("")

/** Not itself, nor anything below it: a category cannot move under its own branch. */
const parentOptions = computed<SelectOption[]>(() => {
	const blocked = new Set<number>()
	if (props.category) {
		const walk = (id: number) => {
			blocked.add(id)
			props.categories.filter(c => c.parent_id === id).forEach(c => walk(c.id))
		}
		walk(props.category.id)
	}
	return categoryPaths(props.categories)
		.filter(({ category }) => !blocked.has(category.id))
		.map(({ category, path }) => ({ label: `${path} · ${t(`inventory.kind.${category.kind}`)}`, value: category.id }))
})

watch(
	() => form.value.parentId,
	id => {
		const parent = props.categories.find(c => c.id === id)
		if (parent) form.value.kind = parent.kind
	}
)

watch(show, open => {
	if (!open) return
	const c = props.category
	form.value = c
		? { nameAr: c.name.ar, nameEn: c.name.en ?? "", parentId: c.parent_id, kind: c.kind, icon: c.icon ?? "", order: c.order, showToMembers: c.show_to_members }
		: { nameAr: "", nameEn: "", parentId: props.parentId ?? null, kind: "asset", icon: "", order: 0, showToMembers: false }
	problem.value = ""
})

async function save() {
	saving.value = true
	problem.value = ""
	const f = form.value
	const payload = {
		name: { ar: f.nameAr.trim(), en: f.nameEn.trim() || null },
		parent_id: f.parentId,
		icon: f.icon.trim() || null,
		order: f.order,
		show_to_members: f.showToMembers,
		...(f.parentId ? {} : { kind: f.kind })
	}
	try {
		if (props.category) {
			message.success(serverMessage(await updateCategory(props.category.id, payload), t("inventory.common.saved")))
		} else {
			await createCategory(payload)
			message.success(t("inventory.common.saved"))
		}
		show.value = false
		emit("saved")
	} catch (e) {
		problem.value = apiErrorMessage(e, t("inventory.common.saveError"))
	} finally {
		saving.value = false
	}
}
</script>
