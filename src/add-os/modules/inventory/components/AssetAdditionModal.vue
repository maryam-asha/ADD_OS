<!-- src/add-os/modules/inventory/components/AssetAdditionModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="t('inventory.additions.add')" icon="carbon:add">
		<p class="mb-3 text-xs text-secondary">{{ t("inventory.additions.hint") }}</p>
		<div class="grid grid-cols-1 items-start gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('inventory.additions.date')" required>
				<n-date-picker v-model:formatted-value="form.added_on" value-format="yyyy-MM-dd" type="date" class="w-full" />
			</n-form-item>
			<n-form-item :label="`${t('inventory.additions.amount')} (${currency ?? ''})`" required>
				<n-input-number v-model:value="form.amount" :min="0.01" :precision="2" class="w-full" dir="ltr" />
			</n-form-item>
			<n-form-item :label="t('inventory.additions.description')" class="sm:col-span-2" required>
				<n-input v-model:value="form.description" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('inventory.operations.reference')">
				<n-input v-model:value="form.reference" :placeholder="t('inventory.operations.optional')" :maxlength="60" />
			</n-form-item>
			<n-form-item :label="t('inventory.operations.attachment')" class="sm:col-span-2">
				<AttachmentsField v-model:value="form.attachments" />
			</n-form-item>
		</div>
		<p v-if="problem" class="text-sm text-error">{{ problem }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("inventory.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!form.added_on || !form.amount || !form.description.trim()" @click="save">{{ t("inventory.additions.add") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import { NButton, NDatePicker, NFormItem, NInput, NInputNumber, useMessage } from "naive-ui"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import AttachmentsField from "@/add-os/modules/inventory/components/AttachmentsField.vue"
import { addAssetAddition } from "@/add-os/services/inventory"

/**
 * A capital addition on an asset: money spent on it that raises its cost,
 * in the asset's currency, dated within its life so far (ADD Core says so
 * when it is not).
 */
const props = defineProps<{ assetId: number; currency: string | null }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()
const message = useMessage()

function blank() {
	return { added_on: null as string | null, amount: null as number | null, description: "", reference: "", attachments: [] as string[] }
}

const form = ref(blank())
const saving = ref(false)
const problem = ref("")

watch(show, open => {
	if (open) {
		form.value = blank()
		problem.value = ""
	}
})

async function save() {
	const f = form.value
	if (!f.added_on || !f.amount) return
	saving.value = true
	problem.value = ""
	try {
		await addAssetAddition(props.assetId, {
			added_on: f.added_on,
			amount: f.amount,
			description: f.description.trim(),
			reference: f.reference.trim() || null,
			attachments: f.attachments
		})
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
