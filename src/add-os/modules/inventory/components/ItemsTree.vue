<!-- src/add-os/modules/inventory/components/ItemsTree.vue -->
<template>
	<n-tree v-if="data.length" :data block-line default-expand-all :selectable="false" :render-label :node-props />
	<div v-else class="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
		<Icon name="carbon:tree-view" :size="40" class="mb-2 opacity-50" />
		<span>{{ t("inventory.items.empty") }}</span>
	</div>
</template>

<script setup lang="ts">
import type { TreeOption } from "naive-ui"
import type { Category, Item } from "@/add-os/modules/inventory/types/inventory"
import type { ItemTreeNode } from "@/add-os/modules/inventory/utils/itemsTree"
import { NTag, NTree } from "naive-ui"
import { computed, h } from "vue"
import { useI18n } from "vue-i18n"
import { localized } from "@/add-os/modules/inventory/utils/display"
import { buildItemTree } from "@/add-os/modules/inventory/utils/itemsTree"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The items as the catalog holds them: each category, its sub-categories
 * and its own items, with how many items sit below it. Only branches that
 * hold an item of the current filter show. Clicking an item opens it.
 */
const props = defineProps<{ items: Item[]; categories: Category[] }>()
const emit = defineEmits<{ open: [item: Item] }>()
const { t } = useI18n()

type Option = TreeOption & { item?: Item; count?: number }

const data = computed<Option[]>(() => {
	const toOption = (node: ItemTreeNode): Option => ({
		key: `c-${node.category.id}`,
		label: localized(node.category.name),
		count: node.count,
		children: [...node.children.map(toOption), ...node.items.map(item => ({ key: `i-${item.id}`, label: localized(item.name), item, isLeaf: true }))]
	})
	return buildItemTree(props.categories, props.items).map(toOption)
})

function renderLabel({ option }: { option: TreeOption }) {
	const node = option as Option
	if (!node.item) {
		return h("span", { class: "inline-flex items-center gap-2 py-1 font-semibold" }, [
			h(Icon, { name: "carbon:folder", size: 16, class: "text-amber-500" }),
			node.label,
			h("span", { class: "rounded-full bg-slate-100 px-2 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400" }, formatNumber(node.count ?? 0))
		])
	}
	const item = node.item
	return h("span", { class: "inline-flex flex-wrap items-center gap-2 py-1" }, [
		h(Icon, { name: item.kind === "asset" ? "carbon:box" : "carbon:layers", size: 15, class: item.kind === "asset" ? "text-blue-500" : "text-purple-500" }),
		h("span", { class: "font-medium" }, node.label),
		h("span", { class: "font-mono text-xs text-secondary", dir: "ltr" }, item.sku),
		h(NTag, { size: "tiny", bordered: false, type: item.kind === "asset" ? "info" : "default" }, () => t(`inventory.kind.${item.kind}`)),
		item.unit ? h("span", { class: "text-xs text-secondary" }, localized(item.unit.name)) : null,
		item.is_active ? null : h(NTag, { size: "tiny", bordered: false, type: "warning" }, () => t("inventory.common.inactive"))
	])
}

function nodeProps({ option }: { option: TreeOption }) {
	const item = (option as Option).item
	return item ? { class: "cursor-pointer", onClick: () => emit("open", item) } : {}
}
</script>
