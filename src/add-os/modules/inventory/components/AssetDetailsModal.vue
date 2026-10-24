<!-- src/add-os/modules/inventory/components/AssetDetailsModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="t('inventory.assets.editDetails')" size="lg" icon="carbon:edit">
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('inventory.assets.serial')">
				<n-input v-model:value="form.serial_number" dir="ltr" :maxlength="100" />
			</n-form-item>
			<n-form-item :label="t('inventory.assets.supplier')">
				<n-input v-model:value="form.supplier" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('inventory.assets.purchasedOn')">
				<n-date-picker v-model:formatted-value="form.purchased_on" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
			</n-form-item>
			<n-form-item :label="t('inventory.assets.warrantyUntil')">
				<n-date-picker v-model:formatted-value="form.warranty_until" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
			</n-form-item>
			<n-form-item :label="t('inventory.assets.cost')">
				<n-input-number v-model:value="form.purchase_cost" :min="0" :precision="2" clearable class="w-full" dir="ltr" />
			</n-form-item>
			<n-form-item :label="t('inventory.assets.currency')">
				<CurrencySelect v-model:value="form.currency" clearable />
			</n-form-item>
			<n-form-item :label="t('inventory.assets.life')" :feedback="t('inventory.assets.lifeHint')">
				<n-input-number v-model:value="form.useful_life_months" :min="1" :max="1200" :precision="0" clearable class="w-full" />
			</n-form-item>
			<n-form-item :label="t('inventory.assets.salvage')">
				<n-input-number v-model:value="form.salvage_value" :min="0" :precision="2" clearable class="w-full" dir="ltr" />
			</n-form-item>
			<n-form-item :label="t('inventory.assets.notes')" class="sm:col-span-2">
				<n-input v-model:value="form.notes" type="textarea" :maxlength="5000" :autosize="{ minRows: 2, maxRows: 4 }" />
			</n-form-item>
		</div>
		<p v-if="problem" class="text-sm text-error">{{ problem }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("inventory.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" @click="save">{{ t("inventory.common.save") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { Asset } from "@/add-os/modules/inventory/types/inventory"
import { NButton, NDatePicker, NFormItem, NInput, NInputNumber, useMessage } from "naive-ui"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import CurrencySelect from "@/add-os/modules/hr/components/payroll/CurrencySelect.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { updateAsset } from "@/add-os/services/inventory"

/** An asset's details and money; where it is, who holds it and its status each have their own action. */
const props = defineProps<{ asset: Asset }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()
const message = useMessage()

const num = (value: string | null) => (value === null ? null : Number(value))

function fromAsset(asset: Asset) {
	return {
		serial_number: asset.serial_number ?? "",
		supplier: asset.supplier ?? "",
		purchased_on: asset.purchased_on,
		warranty_until: asset.warranty_until,
		purchase_cost: num(asset.purchase_cost),
		currency: asset.currency,
		useful_life_months: asset.useful_life_months,
		salvage_value: num(asset.salvage_value),
		notes: asset.notes ?? ""
	}
}

const form = ref(fromAsset(props.asset))
const saving = ref(false)
const problem = ref("")

watch(show, open => {
	if (open) {
		form.value = fromAsset(props.asset)
		problem.value = ""
	}
})

async function save() {
	saving.value = true
	problem.value = ""
	try {
		const f = form.value
		const result = await updateAsset(props.asset.id, {
			...f,
			serial_number: f.serial_number || null,
			supplier: f.supplier || null,
			notes: f.notes || null,
			currency: f.purchase_cost === null ? null : f.currency
		})
		message.success(serverMessage(result, t("inventory.common.saved")))
		show.value = false
		emit("saved")
	} catch (e) {
		problem.value = apiErrorMessage(e, t("inventory.common.saveError"))
	} finally {
		saving.value = false
	}
}
</script>
