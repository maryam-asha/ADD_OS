<template>
	<HrFormModal v-model:show="show" :title="table ? t('hrPayroll.rateTables.edit') : t('hrPayroll.rateTables.add')" icon="carbon:table">
		<n-form ref="formRef" :model="form" :rules label-placement="top">
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item :label="t('hrPayroll.components.nameAr')" path="nameAr">
					<n-input v-model:value="form.nameAr" dir="rtl" :maxlength="255" />
				</n-form-item>
				<n-form-item :label="t('hrPayroll.components.nameEn')">
					<n-input v-model:value="form.nameEn" dir="ltr" :maxlength="255" />
				</n-form-item>
				<n-form-item :label="t('hr.org.code')" path="code">
					<n-input v-model:value="form.code" dir="ltr" :maxlength="32" class="font-mono" />
				</n-form-item>
				<n-form-item :label="t('hrPayroll.rateTables.kind')">
					<n-select v-model:value="form.kind" :options="kindOptions" :disabled="!!table" />
				</n-form-item>
			</div>
			<p class="text-sm text-secondary">{{ table ? t("hrPayroll.rateTables.kindFixed") : t(`hrPayroll.rateTables.kindHint.${form.kind}`) }}</p>
		</n-form>
		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" @click="save">{{ t("hr.common.save") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { RateTable, RateTableKind } from "@/add-os/modules/hr/types/payroll"
import { NButton, NForm, NFormItem, NInput, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { createRateTable, updateRateTable } from "@/add-os/services/hr/payroll"

/**
 * A legal rate table — social insurance, income tax. A percent table holds
 * one rate (up to a ceiling); a brackets table is progressive. The kind is
 * fixed once the table exists; the rates live in dated versions.
 */
const props = defineProps<{ table: RateTable | null }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const saving = ref(false)
const CODE_PATTERN = /^[\p{L}\p{N}_-]{1,32}$/u

const form = ref({ nameAr: "", nameEn: "", code: "", kind: "percent" as RateTableKind })

watch(show, open => {
	if (!open) return
	const r = props.table
	form.value = r ? { nameAr: r.name.ar ?? "", nameEn: r.name.en ?? "", code: r.code, kind: r.kind } : { nameAr: "", nameEn: "", code: "", kind: "percent" }
})

const kindOptions = computed<SelectOption[]>(() => (["percent", "brackets"] as const).map(k => ({ label: t(`hrPayroll.rateTables.kinds.${k}`), value: k })))
const rules = computed<FormRules>(() => ({
	nameAr: { required: true, trigger: ["blur", "input"], validator: (_r: unknown, v: string) => !!v?.trim(), message: t("hr.common.arabicRequired", { field: t("hrPayroll.components.name") }) },
	code: { required: true, trigger: ["blur", "input"], validator: (_r: unknown, v: string) => CODE_PATTERN.test((v ?? "").trim()), message: t("hrPayroll.codeRule") }
}))

async function save() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}
	const f = form.value
	const base = { code: f.code.trim(), name: { ar: f.nameAr.trim(), en: f.nameEn.trim() || null } }
	saving.value = true
	try {
		if (props.table) {
			message.success(serverMessage(await updateRateTable(props.table.id, base), t("hrPayroll.rateTables.updated")))
		} else {
			await createRateTable({ ...base, kind: f.kind })
			message.success(t("hrPayroll.rateTables.created"))
		}
		show.value = false
		emit("saved")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
