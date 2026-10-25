<!-- src/add-os/modules/inventory/components/ItemSelect.vue -->
<template>
	<n-select v-model:value="value" :options :loading="searching" :placeholder="placeholder ?? t('inventory.items.pick')" :disabled remote filterable clearable @search="search" @focus="search('')" />
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { Item, ItemKind } from "@/add-os/modules/inventory/types/inventory"
import { NSelect } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { quietly } from "@/add-os/modules/hr/utils/errors"
import { localized } from "@/add-os/modules/inventory/utils/display"
import { listItems } from "@/add-os/services/inventory"

/**
 * Choosing a catalog item, searched by name or SKU as you type — of one
 * `kind` when given (assets register only asset items, stock moves only
 * stock ones), active ones only. Emits the whole item beside its id, so a
 * caller can read its unit.
 */
const props = defineProps<{ kind?: ItemKind; placeholder?: string; disabled?: boolean }>()
const emit = defineEmits<{ picked: [item: Item | null] }>()
const value = defineModel<number | null>("value", { required: true })
const { t } = useI18n()
const found = ref<Item[]>([])
const searching = ref(false)

const options = computed<SelectOption[]>(() => found.value.map(item => ({ label: `${localized(item.name)} · ${item.sku}`, value: item.id })))

async function search(term: string) {
	searching.value = true
	await quietly(
		() => listItems({ kind: props.kind ?? null, search: term.trim() || null, active: true, per_page: 25 }),
		result => (found.value = result.data)
	)
	searching.value = false
}

watch(value, id => emit("picked", found.value.find(item => item.id === id) ?? null))
</script>
