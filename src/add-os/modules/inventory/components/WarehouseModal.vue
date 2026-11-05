<!-- src/add-os/modules/inventory/components/WarehouseModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="warehouse ? t('inventory.warehouses.edit') : t('inventory.warehouses.add')" size="lg" icon="carbon:inventory-management">
		<p class="-mt-2 mb-4 text-sm text-secondary">{{ t("inventory.warehouses.dialogHint") }}</p>

		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('inventory.common.nameAr')" required>
				<n-input v-model:value="form.nameAr" dir="rtl" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('inventory.common.nameEn')">
				<n-input v-model:value="form.nameEn" dir="ltr" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('inventory.warehouses.manager')">
				<StaffSelect v-model:value="form.managerId" :placeholder="t('inventory.warehouses.noManager')" />
			</n-form-item>
			<n-form-item :label="t('inventory.warehouses.code')">
				<n-input v-model:value="form.code" dir="ltr" :maxlength="40" class="font-mono" />
			</n-form-item>
			<n-form-item :label="t('inventory.warehouses.address')">
				<n-input v-model:value="form.address" :placeholder="t('inventory.warehouses.addressPlaceholder')" :maxlength="2000" />
			</n-form-item>
			<n-form-item :label="t('inventory.warehouses.locationUrl')">
				<n-input v-model:value="form.locationUrl" :placeholder="t('inventory.warehouses.locationUrlPlaceholder')" dir="ltr" :maxlength="2048" />
			</n-form-item>
			<n-form-item :label="t('inventory.warehouses.notes')" class="sm:col-span-2">
				<n-input v-model:value="form.notes" type="textarea" :placeholder="t('inventory.warehouses.notesPlaceholder')" :maxlength="2000" :autosize="{ minRows: 2, maxRows: 4 }" />
			</n-form-item>
			<n-form-item :label="t('inventory.warehouses.branch')">
				<n-select v-model:value="form.branchId" :options="branchOptions" :placeholder="t('inventory.warehouses.noBranch')" filterable clearable />
			</n-form-item>
			<n-form-item :label="t('inventory.warehouses.primaryLabel')" :feedback="t('inventory.warehouses.primaryHint')">
				<n-switch v-model:value="form.isPrimary" :disabled="!canBePrimary(form)" />
			</n-form-item>
		</div>

		<section class="mt-2 rounded-xl border border-border-subtle bg-surface-sunken p-4">
			<span class="block text-sm font-semibold">{{ t("inventory.warehouses.scope") }}</span>
			<n-radio-group v-model:value="form.scope" class="mt-2">
				<n-radio value="all">{{ t("inventory.warehouses.scopeAll") }}</n-radio>
				<n-radio value="selected">{{ t("inventory.warehouses.scopeSelected") }}</n-radio>
			</n-radio-group>

			<template v-if="form.scope === 'selected'">
				<n-input v-model:value="term" :placeholder="t('inventory.warehouses.scopeSearch')" clearable class="mt-3" @update:value="search">
					<template #prefix><Icon name="carbon:search" :size="16" /></template>
				</n-input>
				<div class="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border-subtle bg-surface p-2">
					<p v-if="!choices.length" class="py-4 text-center text-sm text-secondary">{{ t("inventory.warehouses.scopeNone") }}</p>
					<n-checkbox-group v-else v-model:value="form.itemIds">
						<div class="flex flex-col gap-1.5">
							<n-checkbox v-for="choice in choices" :key="choice.id" :value="choice.id">
								<span>{{ choice.label }}</span>
								<span class="ms-2 font-mono text-xs text-secondary" dir="ltr">{{ choice.sku }}</span>
							</n-checkbox>
						</div>
					</n-checkbox-group>
				</div>
				<p class="mt-1 text-xs text-secondary">{{ t("inventory.warehouses.itemsCount", { n: form.itemIds.length }) }}</p>
			</template>
		</section>

		<section class="mt-3 flex items-start justify-between gap-3 rounded-xl border border-border-subtle p-4">
			<div>
				<span class="block text-sm font-semibold">{{ t("inventory.warehouses.allowsSales") }}</span>
				<span class="text-xs text-secondary">{{ t("inventory.warehouses.allowsSalesHint") }}</span>
			</div>
			<n-checkbox v-model:checked="form.allowsSales" />
		</section>

		<p v-if="problem" class="mt-3 text-sm text-error">{{ problem }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("inventory.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!form.nameAr.trim() || (form.scope === 'selected' && !form.itemIds.length)" @click="save">
					{{ t("inventory.warehouses.save") }}
				</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { Warehouse } from "@/add-os/modules/inventory/types/inventory"
import type { WarehouseForm } from "@/add-os/modules/inventory/utils/warehouses"
import { NButton, NCheckbox, NCheckboxGroup, NFormItem, NInput, NRadio, NRadioGroup, NSelect, NSwitch, useMessage } from "naive-ui"
import { onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import StaffSelect from "@/add-os/modules/inventory/components/StaffSelect.vue"
import { localized } from "@/add-os/modules/inventory/utils/display"
import { blankWarehouseForm, canBePrimary, warehouseForm, warehousePayload } from "@/add-os/modules/inventory/utils/warehouses"
import { listBranches } from "@/add-os/services/branches"
import { createWarehouse, listItems, updateWarehouse } from "@/add-os/services/inventory"
import Icon from "@/components/common/Icon.vue"

/**
 * Adding or editing a warehouse: who runs it, where it is, which items it
 * may hold (every stock item, or the ones ticked here) and whether
 * reception may sell from it. One per branch is primary — where reception
 * takes stock by default — so primary needs a branch and sales allowed.
 * Rules that depend on its stock (narrowing past what it holds) are ADD
 * Core's; its message shows here.
 */
const props = defineProps<{ warehouse: Warehouse | null }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()
const message = useMessage()

const form = ref<WarehouseForm>(blankWarehouseForm())
const branchOptions = ref<SelectOption[]>([])
const term = ref("")
/** The ticked items stay listed while a search shows others. */
const choices = ref<{ id: number; label: string; sku: string }[]>([])
const saving = ref(false)
const problem = ref("")

onMounted(() => void quietly(listBranches, branches => (branchOptions.value = branches.map(b => ({ label: localized(b.name), value: b.id })))))

watch(show, open => {
	if (!open) return
	form.value = props.warehouse ? warehouseForm(props.warehouse) : blankWarehouseForm()
	choices.value = (props.warehouse?.items ?? []).map(item => ({ id: item.id, label: localized(item.name), sku: item.sku }))
	term.value = ""
	problem.value = ""
	if (form.value.scope === "selected") void search("")
})

watch(
	() => form.value.scope,
	scope => {
		if (scope === "selected" && !choices.value.length) void search("")
	}
)

// Losing its branch or its sales, a warehouse stops being primary.
watch(
	() => canBePrimary(form.value),
	may => {
		if (!may) form.value.isPrimary = false
	}
)

async function search(text: string) {
	await quietly(
		() => listItems({ kind: "stock", search: text.trim() || null, active: true, per_page: 25 }),
		result => {
			const ticked = choices.value.filter(choice => form.value.itemIds.includes(choice.id))
			const found = result.data.filter(item => !form.value.itemIds.includes(item.id)).map(item => ({ id: item.id, label: localized(item.name), sku: item.sku }))
			choices.value = [...ticked, ...found]
		}
	)
}

async function save() {
	problem.value = ""
	saving.value = true
	try {
		const payload = warehousePayload(form.value)
		if (props.warehouse) await updateWarehouse(props.warehouse.id, payload)
		else await createWarehouse(payload)
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
