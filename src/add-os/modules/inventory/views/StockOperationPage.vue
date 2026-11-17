<!-- src/add-os/modules/inventory/views/StockOperationPage.vue -->
<template>
	<div class="mx-auto flex w-full max-w-5xl flex-col gap-4">
		<n-alert v-if="!kind" type="error" :title="t('inventory.operations.invalidKind')" />

		<template v-else>
			<!-- Header -->
			<PageHeader :title="t('inventory.operations.pageTitle', { kind: t(`inventory.operations.kind.${kind}.title`) })" :description="t('inventory.operations.pageHint')">
				<template #actions>
					<div class="flex gap-2">
						<n-button @click="leave">{{ t("inventory.common.cancel") }}</n-button>
						<n-button type="primary" :loading="saving" :disabled="problem !== null" @click="save">{{ t("inventory.operations.record") }}</n-button>
					</div>
				</template>
			</PageHeader>

			<!-- The operation -->
			<section class="rounded-2xl border border-border-subtle bg-surface p-4">
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
					<n-form-item :label="t('inventory.operations.date')" required>
						<n-date-picker v-model:formatted-value="operationDate" type="date" value-format="yyyy-MM-dd" :is-date-disabled="isFuture" class="w-full" />
					</n-form-item>
					<n-form-item :label="t('inventory.operations.reference')">
						<n-input v-model:value="reference" :placeholder="t('inventory.operations.optional')" :maxlength="60" />
					</n-form-item>
					<n-form-item v-if="reasons.length" :label="t('inventory.operations.reason')" required>
						<n-select v-model:value="reason" :options="reasons.map(r => ({ label: t(`inventory.issueReason.${r}`), value: r }))" />
					</n-form-item>
					<n-form-item v-if="kind === 'receive'" :label="t('inventory.operations.costMethod')" required class="sm:col-span-2">
						<n-radio-group v-model:value="costMethod">
							<n-radio-button value="average">{{ t("inventory.operations.costAverage") }}</n-radio-button>
							<n-radio-button value="entered">{{ t("inventory.operations.costEntered") }}</n-radio-button>
						</n-radio-group>
					</n-form-item>
					<n-form-item :label="t(`inventory.operations.reasonText.${kind}`)" :required="kind !== 'transfer'" class="sm:col-span-2">
						<n-input v-model:value="note" type="textarea" :maxlength="2000" :autosize="{ minRows: 2, maxRows: 4 }" />
					</n-form-item>
				</div>
			</section>

			<!-- Items and quantities -->
			<section class="rounded-2xl border border-border-subtle bg-surface p-4">
				<h2 class="font-semibold">{{ t("inventory.operations.linesTitle") }}</h2>
				<p class="mb-3 text-xs text-secondary">{{ linesHint }}</p>
				<StockLinesEditor v-model:lines="lines" :kind :warehouse-id="kind === 'transfer' ? fromId : warehouseId" :cost-method />
			</section>

			<!-- Attachment -->
			<section class="rounded-2xl border border-border-subtle bg-surface p-4">
				<span class="block text-sm font-semibold">{{ t("inventory.operations.attachment") }}</span>
				<AttachmentField v-model:value="attachment" class="mt-2" />
			</section>

			<p v-if="shownProblem" class="text-sm text-error">{{ shownProblem }}</p>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { CostMethod, ManualIssueReason, StockOperationKind, Warehouse } from "@/add-os/modules/inventory/types/inventory"
import type { LineDraft } from "@/add-os/modules/inventory/utils/stockLines"
import { NAlert, NButton, NDatePicker, NFormItem, NInput, NRadioButton, NRadioGroup, NSelect, useDialog, useMessage } from "naive-ui"
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import AttachmentField from "@/add-os/modules/inventory/components/AttachmentField.vue"
import StockLinesEditor from "@/add-os/modules/inventory/components/StockLinesEditor.vue"
import { STOCK_OPERATION_KINDS } from "@/add-os/modules/inventory/types/inventory"
import { localized } from "@/add-os/modules/inventory/utils/display"
import { linesPayload, operationProblem } from "@/add-os/modules/inventory/utils/stockLines"
import { listWarehouses, submitStockOperation } from "@/add-os/services/inventory"

/**
 * Recording one stock operation of several lines, on its own page: into,
 * out of, between or counted in active warehouses, with the day it
 * happened (today by default, never later), a reference, why, and an
 * optional scanned document. It is recorded when saved — there are no
 * drafts. ADD Core refuses an item outside a warehouse's scope, a shelf
 * short, or a pack that would split a whole unit — all lines or none —
 * and its message shows here.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const route = useRoute()
const router = useRouter()

const REASONS: Partial<Record<StockOperationKind, ManualIssueReason[]>> = {
	writeOff: ["damaged", "expired"],
	issue: ["internal_use", "other"]
}

const kind = computed<StockOperationKind | null>(() => {
	const value = String(route.params.kind ?? "")
	return (STOCK_OPERATION_KINDS as readonly string[]).includes(value) ? (value as StockOperationKind) : null
})

/** A day as yyyy-MM-dd in the viewer's own time zone (toISOString would give UTC's). */
function localDay(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

const today = () => localDay(new Date())

const warehouses = ref<Warehouse[]>([])
const warehouseId = ref<number | null>(null)
const fromId = ref<number | null>(null)
const toId = ref<number | null>(null)
const operationDate = ref<string | null>(today())
const reference = ref("")
const reason = ref<ManualIssueReason | null>(null)
// Entered by default: "the current average" needs the item to have one in the warehouse.
const costMethod = ref<CostMethod>("entered")
const note = ref("")
const lines = ref<LineDraft[]>([])
const attachment = ref<string | null>(null)
const saving = ref(false)
const serverProblem = ref("")
/** Set once recorded, so leaving afterwards asks nothing. */
const recorded = ref(false)

const reasons = computed(() => (kind.value ? (REASONS[kind.value] ?? []) : []))
const warehouseOptions = computed<SelectOption[]>(() => warehouses.value.filter(w => w.is_active).map(w => ({ label: localized(w.name), value: w.id })))

const linesHint = computed(() => {
	if (kind.value === "issue" || kind.value === "writeOff" || kind.value === "transfer") return t("inventory.operations.linesHint.fromStock")
	if (kind.value === "adjust") return t("inventory.operations.linesHint.adjust")
	return t(`inventory.operations.linesHint.${costMethod.value}`)
})

/** What keeps the button off; only two equal warehouses is said out loud. */
const problem = computed(() => {
	if (!kind.value || !operationDate.value) return "needLine" as const
	if (kind.value !== "transfer" && !note.value.trim()) return "needLine" as const
	if (reasons.value.length && !reason.value) return "needLine" as const
	if (kind.value === "receive" && costMethod.value === "entered" && lines.value.some(line => line.unitCost === null)) return "needLine" as const
	return operationProblem(kind.value, { warehouse: warehouseId.value, from: fromId.value, to: toId.value, lines: lines.value })
})
const shownProblem = computed(() => serverProblem.value || (problem.value === "sameWarehouse" ? t("inventory.operations.sameWarehouse") : ""))

/** Something typed that leaving would lose: there are no drafts. */
const dirty = computed(() => !recorded.value && Boolean(lines.value.length || note.value.trim() || reference.value.trim() || attachment.value))

/** A fresh form for the current kind: the page is reused when only the kind in the address changes. */
function reset() {
	const primary = warehouses.value.find(w => w.is_primary)?.id ?? null
	warehouseId.value = primary
	fromId.value = primary
	toId.value = null
	operationDate.value = today()
	reference.value = ""
	reason.value = reasons.value[0] ?? null
	costMethod.value = "entered"
	note.value = ""
	lines.value = []
	attachment.value = null
	serverProblem.value = ""
	recorded.value = false
}

onMounted(() => {
	reset()
	void quietly(
		() => listWarehouses({ active: true, per_page: 100 }),
		result => {
			warehouses.value = result.data
			warehouseId.value = result.data.find(w => w.is_primary)?.id ?? null
			fromId.value = warehouseId.value
		}
	)
})

watch(kind, reset)

onBeforeRouteLeave(() => {
	if (!dirty.value) return true
	return new Promise<boolean>(resolve => {
		dialog.warning({
			title: t("inventory.operations.leaveTitle"),
			content: t("inventory.operations.leaveBody"),
			positiveText: t("inventory.operations.leaveConfirm"),
			negativeText: t("inventory.operations.stay"),
			onPositiveClick: () => resolve(true),
			onNegativeClick: () => resolve(false),
			onClose: () => resolve(false),
			onMaskClick: () => resolve(false)
		})
	})
})

/** Closing the tab or reloading with something typed asks the browser's own question. */
function warnBeforeUnload(event: BeforeUnloadEvent) {
	if (!dirty.value) return
	event.preventDefault()
	event.returnValue = ""
}

onMounted(() => window.addEventListener("beforeunload", warnBeforeUnload))
onBeforeUnmount(() => window.removeEventListener("beforeunload", warnBeforeUnload))

function isFuture(timestamp: number): boolean {
	return localDay(new Date(timestamp)) > today()
}

function leave() {
	void router.push({ name: "inventory.inventoryStock", query: { tab: "operations" } })
}

async function save() {
	if (!kind.value) return
	serverProblem.value = ""
	saving.value = true
	try {
		const result = await submitStockOperation(kind.value, {
			...(kind.value === "transfer" ? { from_warehouse_id: fromId.value!, to_warehouse_id: toId.value! } : { warehouse_id: warehouseId.value! }),
			...(reason.value && reasons.value.length ? { reason: reason.value } : {}),
			...(kind.value === "receive" ? { cost_method: costMethod.value } : {}),
			operation_date: operationDate.value,
			reference: reference.value.trim() || null,
			note: note.value.trim() || null,
			attachment_url: attachment.value,
			lines: linesPayload(kind.value, lines.value, costMethod.value)
		})
		message.success("message" in result && result.message ? result.message : t("inventory.operations.saved"))
		recorded.value = true
		leave()
	} catch (e) {
		serverProblem.value = apiErrorMessage(e, t("inventory.common.saveError"))
	} finally {
		saving.value = false
	}
}
</script>
