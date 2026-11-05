<!-- src/add-os/modules/inventory/components/ItemUnitsEditor.vue -->
<template>
	<section class="rounded-2xl border border-border-subtle p-4">
		<div class="flex items-center justify-between gap-2">
			<span class="text-sm font-semibold">{{ t("inventory.itemExtras.otherUnits") }}</span>
			<n-button size="small" secondary type="primary" :disabled="!mainUnitId" @click="rows = [...rows, { unitId: null, factor: null }]">
				<template #icon><Icon name="carbon:add" :size="14" /></template>{{ t("inventory.itemExtras.addUnit") }}
			</n-button>
		</div>
		<p class="mt-2 rounded-lg bg-surface-sunken p-2 text-xs text-secondary">{{ t("inventory.itemExtras.otherUnitsHint") }}</p>

		<p v-if="!rows.length" class="mt-3 rounded-lg border border-dashed border-border-subtle py-4 text-center text-sm text-secondary">{{ t("inventory.itemExtras.noUnits") }}</p>
		<div v-for="(row, index) in rows" :key="index" class="mt-3 grid grid-cols-[1fr_8rem_auto] items-center gap-2">
			<n-select :value="row.unitId" :options="packChoices(units, mainUnitId, rows, index)" :placeholder="t('inventory.operations.unit')" filterable @update:value="(v: number) => patch(index, { unitId: v })" />
			<n-input-number
				:value="row.factor"
				:min="0"
				:placeholder="t('inventory.itemExtras.factor')"
				:status="row.factor !== null && row.factor <= 0 ? 'error' : undefined"
				dir="ltr"
				@update:value="(v: number | null) => patch(index, { factor: v })"
			/>
			<n-button size="small" quaternary circle :aria-label="t('inventory.operations.removeLine')" @click="rows = rows.filter((_, i) => i !== index)">
				<template #icon><Icon name="carbon:trash-can" :size="16" /></template>
			</n-button>
		</div>
	</section>
</template>

<script setup lang="ts">
import type { Unit } from "@/add-os/modules/inventory/types/inventory"
import type { PackRow } from "@/add-os/modules/inventory/utils/itemUnits"
import { NButton, NInputNumber, NSelect } from "naive-ui"
import { useI18n } from "vue-i18n"
import { packChoices } from "@/add-os/modules/inventory/utils/itemUnits"
import Icon from "@/components/common/Icon.vue"

/**
 * An item's packs: units other than its main one, each holding `factor`
 * main units (box = 6). Stock is always counted in the main unit; a pack
 * only converts what staff type. ADD Core keeps a pack the ledger already
 * used, with its factor, and says so.
 */
defineProps<{ units: Unit[]; mainUnitId: number | null }>()
const rows = defineModel<PackRow[]>("rows", { required: true })
const { t } = useI18n()

function patch(index: number, change: Partial<PackRow>) {
	rows.value = rows.value.map((row, i) => (i === index ? { ...row, ...change } : row))
}
</script>
