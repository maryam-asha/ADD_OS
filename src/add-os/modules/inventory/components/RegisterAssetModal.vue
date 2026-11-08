<!-- src/add-os/modules/inventory/components/RegisterAssetModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="t('inventory.assets.register')" size="lg" icon="carbon:add">
		<!--
			A room at a time: the place and what the purchase shares are given
			once, then a card per asset item in it, with its count and what
			differs between them. Opened from a list filtered on a place, it
			starts on that place. An intangible item (a licence) sits nowhere:
			only its lines are registered without the place.
		-->
		<n-form-item :label="t('inventory.assets.location')" :required="needsPlace" :feedback="needsPlace ? undefined : t('inventory.assets.noPlaceNeeded')">
			<AssetPlacePicker :key="opened" v-model:value="form.location" :chain="placeChain" />
		</n-form-item>

		<h3 class="mb-1 mt-2 font-semibold">{{ t("inventory.assets.lines") }}</h3>
		<p class="mb-3 text-xs text-secondary">{{ t("inventory.assets.linesHint") }}</p>
		<ItemSelect v-model:value="picking" kind="asset" :placeholder="t('inventory.assets.addLine')" @picked="add" />

		<div class="mt-3 flex flex-col gap-3">
			<div v-for="(line, index) in lines" :key="line.uid" class="rounded-xl border border-border-subtle bg-surface-sunken p-3">
				<div class="mb-2 flex items-start gap-2">
					<div class="min-w-0 flex-1">
						<span class="block font-medium">{{ localized(line.item.name) }}</span>
						<span class="font-mono text-xs text-secondary" dir="ltr">{{ line.item.sku }}</span>
						<n-tag v-if="line.item.category.intangible" size="tiny" :bordered="false" class="ms-2">{{ t("inventory.assets.intangible") }}</n-tag>
					</div>
					<n-button size="small" quaternary circle :aria-label="t('inventory.assets.removeLine')" @click="lines.splice(index, 1)">
						<template #icon><Icon name="carbon:trash-can" :size="16" /></template>
					</n-button>
				</div>
				<div class="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
					<label>
						<span class="mb-1 block text-xs text-secondary">{{ t("inventory.assets.count") }} *</span>
						<n-input-number v-model:value="line.count" :min="1" :max="100" :precision="0" size="small" dir="ltr" />
					</label>
					<label>
						<span class="mb-1 block text-xs text-secondary">{{ t("inventory.assets.serial") }}</span>
						<n-input v-model:value="line.serial_number" size="small" dir="ltr" :maxlength="100" :disabled="(line.count ?? 1) > 1" />
					</label>
					<label>
						<span class="mb-1 block text-xs text-secondary">{{ t("inventory.assets.unitCost") }}</span>
						<n-input-number v-model:value="line.purchase_cost" :min="0" :precision="2" size="small" clearable dir="ltr" />
					</label>
					<label>
						<span class="mb-1 block text-xs text-secondary">{{ t("inventory.assets.warrantyUntil") }}</span>
						<n-date-picker v-model:formatted-value="line.warranty_until" value-format="yyyy-MM-dd" type="date" size="small" clearable class="w-full" />
					</label>
					<label class="col-span-2">
						<span class="mb-1 block text-xs text-secondary">{{ t("inventory.assets.life") }}</span>
						<n-input-number v-model:value="line.useful_life_months" :min="1" :max="1200" :precision="0" size="small" clearable dir="ltr" />
					</label>
					<label v-if="!line.item.category.intangible" class="col-span-2">
						<span class="mb-1 block text-xs text-secondary">{{ t("inventory.assets.salvage") }}</span>
						<n-input-number v-model:value="line.salvage_value" :min="0" :precision="2" size="small" clearable dir="ltr" />
					</label>
					<label v-if="methodOptions.length > 1 && !line.item.category.intangible" class="col-span-2">
						<span class="mb-1 block text-xs text-secondary">{{ t("inventory.assets.method") }}</span>
						<n-select v-model:value="line.depreciation_method" :options="methodOptions" size="small" />
					</label>
				</div>
			</div>
		</div>

		<h3 class="mb-1 mt-4 font-semibold">{{ t("inventory.assets.purchase") }}</h3>
		<p class="mb-3 text-xs text-secondary">{{ t("inventory.assets.purchaseHint") }}</p>
		<div class="grid grid-cols-1 items-start gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('inventory.assets.purchasedOn')">
				<n-date-picker v-model:formatted-value="form.purchased_on" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
			</n-form-item>
			<n-form-item :label="t('inventory.assets.inServiceOn')" :feedback="t('inventory.assets.inServiceHint')">
				<n-date-picker v-model:formatted-value="form.in_service_on" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
			</n-form-item>
			<n-form-item :label="t('inventory.assets.supplier')">
				<n-input v-model:value="form.supplier" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('inventory.operations.reference')">
				<n-input v-model:value="form.reference" :placeholder="t('inventory.operations.optional')" :maxlength="60" />
			</n-form-item>
			<n-form-item :label="t('inventory.assets.currency')" :required="costed">
				<CurrencySelect v-model:value="form.currency" clearable class="w-full" />
			</n-form-item>
			<n-form-item :label="t('inventory.operations.attachment')" class="sm:col-span-2">
				<AttachmentsField v-model:value="form.attachments" />
			</n-form-item>
			<n-form-item :label="t('inventory.assets.notes')" class="sm:col-span-2">
				<n-input v-model:value="form.notes" type="textarea" :maxlength="5000" :autosize="{ minRows: 2, maxRows: 4 }" />
			</n-form-item>
		</div>
		<p v-if="problem" class="text-sm text-error">{{ problem }}</p>

		<template #footer>
			<div class="flex items-center justify-end gap-2">
				<span v-if="total" class="me-auto text-sm text-secondary">{{ t(countKey("inventory.assets.toRegister", total), { n: formatNumber(total) }) }}</span>
				<n-button @click="show = false">{{ t("inventory.common.cancel") }}</n-button>
				<template v-if="settings?.asset_drafts">
					<n-button :type="mayApprove ? 'default' : 'primary'" :loading="saving" :disabled="!ready" @click="save(true)">{{ t("inventory.assets.saveDraft") }}</n-button>
					<n-button v-if="mayApprove" type="primary" :loading="saving" :disabled="!ready" @click="save(false)">{{ t("inventory.assets.saveApprove") }}</n-button>
				</template>
				<n-button v-else type="primary" :loading="saving" :disabled="!ready" @click="save(false)">{{ t("inventory.assets.register") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { DepreciationMethod, Item, PlaceChain, PlaceRef } from "@/add-os/modules/inventory/types/inventory"
import type { InventorySettings } from "@/add-os/services/inventory"
import { NButton, NDatePicker, NFormItem, NInput, NInputNumber, NSelect, NTag, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canApproveAssets } from "@/add-os/config/permissions"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import CurrencySelect from "@/add-os/modules/hr/components/payroll/CurrencySelect.vue"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import AssetPlacePicker from "@/add-os/modules/inventory/components/AssetPlacePicker.vue"
import AttachmentsField from "@/add-os/modules/inventory/components/AttachmentsField.vue"
import ItemSelect from "@/add-os/modules/inventory/components/ItemSelect.vue"
import { localized } from "@/add-os/modules/inventory/utils/display"
import { inventorySettings, registerAssetBatch } from "@/add-os/services/inventory"
import { countKey, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{ place?: PlaceRef | null; placeChain?: PlaceChain | null }>()
const emit = defineEmits<{ saved: [] }>()
/**
 * Registering assets the way a room is gone through: one place, then each
 * asset item in it with its count (each asset gets its own code and QR, so
 * a serial number is for a line of one). What the purchase shares — date,
 * supplier, its invoice, the currency — is given once for them all. ADD
 * Core takes it all or none, and names the line it refuses.
 *
 * Follows the package's settings: a choice of depreciation method when more
 * than one is on, and — with drafts on — saving as a draft, or approving
 * at once for whoever may approve.
 */
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()
const message = useMessage()
const mayApprove = canApproveAssets()

interface LineDraft {
	uid: number
	item: Item
	count: number | null
	serial_number: string
	purchase_cost: number | null
	useful_life_months: number | null
	salvage_value: number | null
	warranty_until: string | null
	depreciation_method: DepreciationMethod
}

function blank() {
	return {
		location: (props.place ?? null) as PlaceRef | null,
		purchased_on: null as string | null,
		in_service_on: null as string | null,
		supplier: "",
		reference: "",
		attachments: [] as string[],
		currency: null as string | null,
		notes: ""
	}
}

const form = ref(blank())
const lines = ref<LineDraft[]>([])
const picking = ref<number | null>(null)
const saving = ref(false)
const problem = ref("")
const settings = ref<InventorySettings | null>(null)
/** Bumped on every opening, so the place picker starts again from the list's place. */
const opened = ref(0)
let nextUid = 1

const costed = computed(() => lines.value.some(line => line.purchase_cost !== null))
const total = computed(() => lines.value.reduce((sum, line) => sum + (line.count ?? 1), 0))
/** Every line but an intangible one sits at the place. */
const needsPlace = computed(() => !lines.value.length || lines.value.some(line => !line.item.category.intangible))
const ready = computed(() => lines.value.length > 0 && (!needsPlace.value || !!form.value.location) && !(costed.value && !form.value.currency))
const methodOptions = computed<SelectOption[]>(() => (settings.value?.depreciation_methods ?? ["straight_line"]).map(method => ({ value: method, label: t(`inventory.assets.methods.${method}`) })))

watch(show, open => {
	if (open) {
		form.value = blank()
		lines.value = []
		problem.value = ""
		opened.value++
		void quietly(inventorySettings, next => (settings.value = next))
	}
})

function add(item: Item | null) {
	if (!item) return
	const method = settings.value?.depreciation_methods[0] ?? "straight_line"
	lines.value.push({ uid: nextUid++, item, count: 1, serial_number: "", purchase_cost: null, useful_life_months: null, salvage_value: null, warranty_until: null, depreciation_method: method })
	picking.value = null
}

async function save(draft: boolean) {
	if (!ready.value) return
	saving.value = true
	problem.value = ""
	try {
		const f = form.value
		const assets = await registerAssetBatch({
			...(f.location ? { location: f.location } : {}),
			purchased_on: f.purchased_on,
			supplier: f.supplier.trim() || null,
			reference: f.reference.trim() || null,
			attachments: f.attachments,
			in_service_on: f.in_service_on,
			currency: costed.value ? f.currency : null,
			notes: f.notes.trim() || null,
			...(settings.value?.asset_drafts ? { draft } : {}),
			lines: lines.value.map(line => {
				const count = line.count ?? 1
				const intangible = !!line.item.category.intangible
				return {
					item_id: line.item.id,
					count,
					serial_number: count > 1 ? null : line.serial_number.trim() || null,
					purchase_cost: line.purchase_cost,
					useful_life_months: line.useful_life_months,
					salvage_value: intangible ? null : line.salvage_value,
					warranty_until: line.warranty_until,
					...(methodOptions.value.length > 1 && !intangible ? { depreciation_method: line.depreciation_method } : {})
				}
			})
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
