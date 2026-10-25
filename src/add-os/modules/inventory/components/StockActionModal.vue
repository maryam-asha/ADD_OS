<!-- src/add-os/modules/inventory/components/StockActionModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="t(`inventory.stockAction.${mode}.title`)" size="md" :icon="ICONS[mode]">
		<p class="mb-3 text-sm text-secondary">{{ t(`inventory.stockAction.${mode}.hint`) }}</p>
		<n-form-item :label="t('inventory.stock.item')" required>
			<ItemSelect v-model:value="itemId" kind="stock" @picked="picked = $event" />
		</n-form-item>
		<n-form-item :label="mode === 'transfer' ? t('inventory.stock.from') : t('inventory.stock.location')" required>
			<PlacePicker v-model:value="place" />
		</n-form-item>
		<n-form-item v-if="mode === 'transfer'" :label="t('inventory.stock.to')" required>
			<PlacePicker v-model:value="to" />
		</n-form-item>
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="mode === 'count' ? t('inventory.stock.counted') : t('inventory.stock.quantity')" required>
				<n-input-number v-model:value="amount" :min="mode === 'count' ? 0 : 0.001" :precision="fractions ? 3 : 0" class="w-full" dir="ltr">
					<template v-if="picked" #suffix>{{ localized(picked.unit.name) }}</template>
				</n-input-number>
			</n-form-item>
			<n-form-item v-if="mode === 'receive' || mode === 'count'" :label="t('inventory.stock.unitCost')" :feedback="mode === 'count' ? t('inventory.stock.unitCostCountHint') : undefined">
				<n-input-number v-model:value="unitCost" :min="0" :precision="4" clearable class="w-full" dir="ltr" />
			</n-form-item>
			<n-form-item v-if="mode === 'issue'" :label="t('inventory.stock.reason')" required>
				<n-select v-model:value="reason" :options="reasonOptions" />
			</n-form-item>
		</div>
		<n-form-item :label="t('inventory.common.note')">
			<n-input v-model:value="note" type="textarea" :maxlength="2000" :autosize="{ minRows: 1, maxRows: 4 }" />
		</n-form-item>
		<p v-if="problem" class="text-sm text-error">{{ problem }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("inventory.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!ready" @click="save">{{ t(`inventory.stockAction.${mode}.confirm`) }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { Item, ManualIssueReason, PlaceRef, StockMode } from "@/add-os/modules/inventory/types/inventory"
import { NButton, NFormItem, NInput, NInputNumber, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import ItemSelect from "@/add-os/modules/inventory/components/ItemSelect.vue"
import PlacePicker from "@/add-os/modules/inventory/components/PlacePicker.vue"
import { MANUAL_ISSUE_REASONS } from "@/add-os/modules/inventory/types/inventory"
import { localized } from "@/add-os/modules/inventory/utils/display"
import { countStock, issueStock, receiveStock, transferStock } from "@/add-os/services/inventory"

/**
 * Moving stock by hand: receiving it (a unit cost re-averages its cost),
 * issuing it (internal use, damaged, expired), transferring it between two
 * places, or recording a physical count. Stock never goes below zero: ADD
 * Core refuses more than is there and says what is left.
 */
const props = defineProps<{ mode: StockMode }>()
const emit = defineEmits<{ done: [] }>()
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()
const message = useMessage()

const ICONS: Record<StockMode, string> = { receive: "carbon:download", issue: "carbon:upload", transfer: "carbon:arrows-horizontal", count: "carbon:list-checked" }

const itemId = ref<number | null>(null)
const picked = ref<Item | null>(null)
const place = ref<PlaceRef | null>(null)
const to = ref<PlaceRef | null>(null)
const amount = ref<number | null>(null)
const unitCost = ref<number | null>(null)
const reason = ref<ManualIssueReason>("internal_use")
const note = ref("")
const saving = ref(false)
const problem = ref("")

const fractions = computed(() => picked.value?.unit.allows_fractions ?? false)
const reasonOptions = computed<SelectOption[]>(() => MANUAL_ISSUE_REASONS.map(r => ({ label: t(`inventory.issueReason.${r}`), value: r })))
const ready = computed(() => itemId.value !== null && place.value !== null && amount.value !== null && (props.mode !== "transfer" || to.value !== null))

watch(show, open => {
	if (!open) return
	itemId.value = null
	picked.value = null
	place.value = null
	to.value = null
	amount.value = null
	unitCost.value = null
	reason.value = "internal_use"
	note.value = ""
	problem.value = ""
})

async function save() {
	saving.value = true
	problem.value = ""
	const base = { item_id: itemId.value!, note: note.value || null }
	try {
		let done = t(`inventory.stockAction.${props.mode}.success`)
		switch (props.mode) {
			case "receive":
				await receiveStock({ ...base, location: place.value!, quantity: amount.value!, unit_cost: unitCost.value })
				break
			case "issue":
				await issueStock({ ...base, location: place.value!, quantity: amount.value!, reason: reason.value })
				break
			case "transfer":
				await transferStock({ ...base, from: place.value!, to: to.value!, quantity: amount.value! })
				break
			case "count": {
				const result = await countStock({ ...base, location: place.value!, counted: amount.value!, unit_cost: unitCost.value })
				if ("message" in result && result.message) done = result.message
				break
			}
		}
		message.success(done)
		show.value = false
		emit("done")
	} catch (e) {
		problem.value = apiErrorMessage(e, t("inventory.common.saveError"))
	} finally {
		saving.value = false
	}
}
</script>
