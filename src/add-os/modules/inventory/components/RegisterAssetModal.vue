<!-- src/add-os/modules/inventory/components/RegisterAssetModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="t('inventory.assets.register')" size="lg" icon="carbon:add">
		<!--
			Three groups rather than one grid of twelve: what it is and where,
			then what it cost, then how it wears. A field with a hint keeps its
			row partner on the same line (items-start), and the cost carries its
			currency beside it, so no field is left alone on a row.
		-->
		<div class="grid grid-cols-1 items-start gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('inventory.assets.item')" class="sm:col-span-2" required>
				<ItemSelect v-model:value="form.item_id" kind="asset" />
			</n-form-item>
			<n-form-item :label="t('inventory.assets.location')" class="sm:col-span-2" required>
				<PlacePicker v-model:value="form.location" />
			</n-form-item>
			<n-form-item :label="t('inventory.assets.count')" :feedback="t('inventory.assets.countHint')">
				<n-input-number v-model:value="form.count" :min="1" :max="100" :precision="0" class="w-full" />
			</n-form-item>
			<n-form-item :label="t('inventory.assets.serial')">
				<n-input v-model:value="form.serial_number" dir="ltr" :maxlength="100" :disabled="form.count > 1" />
			</n-form-item>
		</div>

		<h3 class="mb-2 mt-2 font-semibold">{{ t("inventory.assets.money") }}</h3>
		<div class="grid grid-cols-1 items-start gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('inventory.assets.purchasedOn')">
				<n-date-picker v-model:formatted-value="form.purchased_on" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
			</n-form-item>
			<n-form-item :label="t('inventory.assets.supplier')">
				<n-input v-model:value="form.supplier" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('inventory.assets.cost')">
				<div class="flex w-full gap-2">
					<n-input-number v-model:value="form.purchase_cost" :min="0" :precision="2" clearable class="min-w-0 flex-1" dir="ltr" />
					<!-- "!" because Naive's runtime CSS outranks Tailwind's layer (see PlacePicker). -->
					<CurrencySelect v-model:value="form.currency" clearable class="w-32! shrink-0" />
				</div>
			</n-form-item>
			<n-form-item :label="t('inventory.assets.warrantyUntil')">
				<n-date-picker v-model:formatted-value="form.warranty_until" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
			</n-form-item>
		</div>

		<h3 class="mb-2 mt-2 font-semibold">{{ t("inventory.assets.depreciation") }}</h3>
		<div class="grid grid-cols-1 items-start gap-x-4 sm:grid-cols-2">
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
				<n-button type="primary" :loading="saving" :disabled="!form.item_id || !form.location" @click="save">{{ t("inventory.assets.register") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { PlaceRef } from "@/add-os/modules/inventory/types/inventory"
import { NButton, NDatePicker, NFormItem, NInput, NInputNumber, useMessage } from "naive-ui"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import CurrencySelect from "@/add-os/modules/hr/components/payroll/CurrencySelect.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import ItemSelect from "@/add-os/modules/inventory/components/ItemSelect.vue"
import PlacePicker from "@/add-os/modules/inventory/components/PlacePicker.vue"
import { registerAssets } from "@/add-os/services/inventory"
import { countKey, formatNumber } from "@/add-os/utils/format"

const emit = defineEmits<{ saved: [] }>()
/**
 * Registering assets: an asset item at a place, one or several identical
 * ones bought together (each gets its own code and QR, so a serial number
 * is for one only). A cost needs its currency, and the salvage value cannot
 * exceed it — ADD Core says so when it does.
 */
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()
const message = useMessage()

function blank() {
	return {
		item_id: null as number | null,
		location: null as PlaceRef | null,
		count: 1,
		serial_number: "",
		purchased_on: null as string | null,
		supplier: "",
		purchase_cost: null as number | null,
		currency: null as string | null,
		useful_life_months: null as number | null,
		salvage_value: null as number | null,
		warranty_until: null as string | null,
		notes: ""
	}
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
	if (!form.value.item_id || !form.value.location) return
	saving.value = true
	problem.value = ""
	try {
		const f = form.value
		const assets = await registerAssets({
			item_id: f.item_id!,
			location: f.location!,
			count: f.count,
			serial_number: f.count > 1 ? null : f.serial_number || null,
			purchased_on: f.purchased_on,
			supplier: f.supplier || null,
			purchase_cost: f.purchase_cost,
			currency: f.purchase_cost === null ? null : f.currency,
			useful_life_months: f.useful_life_months,
			salvage_value: f.salvage_value,
			warranty_until: f.warranty_until,
			notes: f.notes || null
		})
		message.success(t(countKey("inventory.assets.registered", assets.length), { n: formatNumber(assets.length) }))
		show.value = false
		emit("saved")
	} catch (e) {
		problem.value = apiErrorMessage(e, t("inventory.common.saveError"))
	} finally {
		saving.value = false
	}
}
</script>
