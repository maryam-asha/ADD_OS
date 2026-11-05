<!-- src/add-os/modules/inventory/components/StockOperationPicker.vue -->
<template>
	<HrFormModal v-model:show="show" :title="t('inventory.operations.pickTitle')" size="lg" icon="carbon:arrows-vertical">
		<p class="-mt-2 mb-4 text-sm text-secondary">{{ t("inventory.operations.pickHint") }}</p>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<button
				v-for="kind in kinds"
				:key="kind"
				type="button"
				class="rounded-2xl border border-border-subtle bg-surface p-4 text-start transition hover:border-primary hover:shadow-xs"
				@click="pick(kind)"
			>
				<span class="flex items-center gap-2 font-semibold">
					<Icon :name="ICONS[kind]" :size="18" />
					{{ t(`inventory.operations.kind.${kind}.title`) }}
				</span>
				<span class="mt-1 block text-sm text-secondary">{{ t(`inventory.operations.kind.${kind}.hint`) }}</span>
			</button>
		</div>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { StockOperationKind } from "@/add-os/modules/inventory/types/inventory"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { canCountStock, canIssueStock, canReceiveStock, canTransferStock } from "@/add-os/config/permissions"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { STOCK_OPERATION_KINDS } from "@/add-os/modules/inventory/types/inventory"
import Icon from "@/components/common/Icon.vue"

/** The five stock movements staff record; each shows only with its permission. */
const emit = defineEmits<{ picked: [kind: StockOperationKind] }>()
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()

const ICONS: Record<StockOperationKind, string> = {
	transfer: "carbon:arrows-horizontal",
	adjust: "carbon:list-checked",
	writeOff: "carbon:trash-can",
	receive: "carbon:download",
	issue: "carbon:upload"
}

const allowed: Record<StockOperationKind, boolean> = {
	transfer: canTransferStock(),
	adjust: canCountStock(),
	writeOff: canIssueStock(),
	receive: canReceiveStock(),
	issue: canIssueStock()
}

const kinds = computed(() => STOCK_OPERATION_KINDS.filter(kind => allowed[kind]))

function pick(kind: StockOperationKind) {
	show.value = false
	emit("picked", kind)
}
</script>
