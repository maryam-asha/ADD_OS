<!-- src/add-os/modules/inventory/components/StockOperationModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="t(`inventory.operations.kind.${kind}.title`)" size="lg" icon="carbon:arrows-vertical">
		<p class="-mt-2 mb-4 text-sm text-secondary">{{ t(`inventory.operations.kind.${kind}.hint`) }}</p>

		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<template v-if="kind === 'transfer'">
				<n-form-item :label="t('inventory.operations.from')" required>
					<n-select v-model:value="fromId" :options="warehouseOptions" filterable />
				</n-form-item>
				<n-form-item :label="t('inventory.operations.to')" required>
					<n-select v-model:value="toId" :options="warehouseOptions" filterable />
				</n-form-item>
			</template>
			<n-form-item v-else :label="t('inventory.operations.warehouse')" required>
				<n-select v-model:value="warehouseId" :options="warehouseOptions" filterable />
			</n-form-item>
			<n-form-item v-if="reasons.length" :label="t('inventory.operations.reason')" required>
				<n-select v-model:value="reason" :options="reasons.map(r => ({ label: t(`inventory.issueReason.${r}`), value: r }))" />
			</n-form-item>
		</div>

		<span class="mb-2 block text-sm font-semibold">{{ t("inventory.operations.lines") }}</span>
		<StockLinesEditor v-model:lines="lines" :kind :warehouse-id="kind === 'transfer' ? fromId : warehouseId" />

		<n-form-item :label="t('inventory.operations.note')" class="mt-3">
			<n-input v-model:value="note" type="textarea" :maxlength="2000" :autosize="{ minRows: 1, maxRows: 3 }" />
		</n-form-item>

		<p v-if="shownProblem" class="text-sm text-error">{{ shownProblem }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("inventory.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="problem !== null" @click="save">{{ t("inventory.operations.submit") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { ManualIssueReason, StockOperationKind, Warehouse } from "@/add-os/modules/inventory/types/inventory"
import type { LineDraft } from "@/add-os/modules/inventory/utils/stockLines"
import { NButton, NFormItem, NInput, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import StockLinesEditor from "@/add-os/modules/inventory/components/StockLinesEditor.vue"
import { localized } from "@/add-os/modules/inventory/utils/display"
import { linesPayload, operationProblem } from "@/add-os/modules/inventory/utils/stockLines"
import { submitStockOperation } from "@/add-os/services/inventory"

/**
 * Recording one stock operation of several lines: into, out of, between or
 * counted in active warehouses. A write-off is an issue for damaged or
 * expired goods; a manual issue is for internal use. ADD Core refuses an
 * item outside a warehouse's scope, a shelf short, or a pack that would
 * split a whole unit — all lines or none — and its message shows here.
 */
const props = defineProps<{ kind: StockOperationKind; warehouses: Warehouse[] }>()
const emit = defineEmits<{ done: [] }>()
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()
const message = useMessage()

const REASONS: Partial<Record<StockOperationKind, ManualIssueReason[]>> = {
	writeOff: ["damaged", "expired"],
	issue: ["internal_use", "other"]
}

const warehouseId = ref<number | null>(null)
const fromId = ref<number | null>(null)
const toId = ref<number | null>(null)
const reason = ref<ManualIssueReason | null>(null)
const lines = ref<LineDraft[]>([])
const note = ref("")
const saving = ref(false)
const serverProblem = ref("")

const reasons = computed(() => REASONS[props.kind] ?? [])
const warehouseOptions = computed<SelectOption[]>(() => props.warehouses.filter(w => w.is_active).map(w => ({ label: localized(w.name), value: w.id })))
const problem = computed(() => {
	if (reasons.value.length && !reason.value) return "needLine" as const
	return operationProblem(props.kind, { warehouse: warehouseId.value, from: fromId.value, to: toId.value, lines: lines.value })
})
/** Only a problem worth saying out loud: two equal warehouses; the rest just keeps the button off. */
const shownProblem = computed(() => serverProblem.value || (problem.value === "sameWarehouse" ? t("inventory.operations.sameWarehouse") : ""))

watch(show, open => {
	if (!open) return
	warehouseId.value = props.warehouses.find(w => w.is_active && w.is_primary)?.id ?? null
	fromId.value = warehouseId.value
	toId.value = null
	reason.value = reasons.value[0] ?? null
	lines.value = []
	note.value = ""
	serverProblem.value = ""
})

async function save() {
	serverProblem.value = ""
	saving.value = true
	try {
		const result = await submitStockOperation(props.kind, {
			...(props.kind === "transfer" ? { from_warehouse_id: fromId.value!, to_warehouse_id: toId.value! } : { warehouse_id: warehouseId.value! }),
			...(reason.value && reasons.value.length ? { reason: reason.value } : {}),
			lines: linesPayload(props.kind, lines.value),
			note: note.value.trim() || null
		})
		message.success(!Array.isArray(result) && result.message ? result.message : t("inventory.operations.saved"))
		show.value = false
		emit("done")
	} catch (e) {
		serverProblem.value = apiErrorMessage(e, t("inventory.common.saveError"))
	} finally {
		saving.value = false
	}
}
</script>
