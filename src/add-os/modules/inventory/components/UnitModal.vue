<!-- src/add-os/modules/inventory/components/UnitModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="unit ? t('inventory.units.edit') : t('inventory.units.add')" size="sm" icon="carbon:ruler">
		<n-form-item :label="t('inventory.units.code')" :feedback="t('inventory.units.codeHint')" required>
			<n-input v-model:value="form.code" dir="ltr" :maxlength="20" class="font-mono" />
		</n-form-item>
		<n-form-item :label="t('inventory.common.nameAr')" required>
			<n-input v-model:value="form.nameAr" dir="rtl" :maxlength="255" />
		</n-form-item>
		<n-form-item :label="t('inventory.common.nameEn')">
			<n-input v-model:value="form.nameEn" dir="ltr" :maxlength="255" />
		</n-form-item>
		<n-checkbox v-model:checked="form.fractions">{{ t("inventory.units.fractions") }}</n-checkbox>
		<p v-if="problem" class="mt-2 text-sm text-error">{{ problem }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("inventory.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!/^[a-z0-9_]+$/.test(form.code) || !form.nameAr.trim()" @click="save">{{ t("inventory.common.save") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { Unit } from "@/add-os/modules/inventory/types/inventory"
import { NButton, NCheckbox, NFormItem, NInput, useMessage } from "naive-ui"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { createUnit, updateUnit } from "@/add-os/services/inventory"

/** What an item is counted in; a unit that does not allow fractions takes whole quantities only. */
const props = defineProps<{ unit: Unit | null }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()
const message = useMessage()

const form = ref({ code: "", nameAr: "", nameEn: "", fractions: false })
const saving = ref(false)
const problem = ref("")

watch(show, open => {
	if (!open) return
	const u = props.unit
	form.value = u ? { code: u.code, nameAr: u.name.ar, nameEn: u.name.en ?? "", fractions: u.allows_fractions } : { code: "", nameAr: "", nameEn: "", fractions: false }
	problem.value = ""
})

async function save() {
	saving.value = true
	problem.value = ""
	const payload = { code: form.value.code, name: { ar: form.value.nameAr.trim(), en: form.value.nameEn.trim() || null }, allows_fractions: form.value.fractions }
	try {
		if (props.unit) await updateUnit(props.unit.id, payload)
		else await createUnit(payload)
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
