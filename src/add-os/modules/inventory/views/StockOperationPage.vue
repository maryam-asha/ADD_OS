<!-- src/add-os/modules/inventory/views/StockOperationPage.vue -->
<template>
	<div class="mx-auto flex w-full max-w-5xl flex-col gap-4">
		<n-alert v-if="!kind" type="error" :title="t('inventory.operations.invalidKind')" />

		<template v-else>
			<!-- Header -->
			<div class="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border-subtle bg-surface p-4">
				<div>
					<h1 class="text-xl font-bold">{{ t("inventory.operations.pageTitle", { kind: t(`inventory.operations.kind.${kind}.title`) }) }}</h1>
					<p class="mt-1 text-sm text-secondary">{{ t("inventory.operations.pageHint") }}</p>
				</div>
				<div class="flex gap-2">
					<n-button @click="leave">{{ t("inventory.common.cancel") }}</n-button>
					<n-button type="primary" :loading="saving" :disabled="problem !== null" @click="save">{{ t("inventory.operations.record") }}</n-button>
				</div>
			</div>

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
				<div class="mt-2 flex flex-wrap items-center gap-3">
					<label class="cursor-pointer">
						<span class="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-sunken px-3 py-1.5 text-sm">
							<Icon name="carbon:attachment" :size="16" />{{ uploading ? "…" : t("inventory.operations.chooseFile") }}
						</span>
						<input type="file" accept="image/*,application/pdf" class="hidden" @change="upload" />
					</label>
					<template v-if="attachment">
						<a :href="attachment.url" target="_blank" rel="noopener noreferrer" class="text-sm text-primary underline">{{ attachment.name }}</a>
						<n-button size="tiny" quaternary @click="attachment = null">{{ t("inventory.operations.removeAttachment") }}</n-button>
					</template>
				</div>
				<p class="mt-1 text-xs text-secondary">{{ t("inventory.operations.attachmentHint") }}</p>
			</section>

			<p v-if="shownProblem" class="text-sm text-error">{{ shownProblem }}</p>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { CostMethod, ManualIssueReason, StockOperationKind, Warehouse } from "@/add-os/modules/inventory/types/inventory"
import type { LineDraft } from "@/add-os/modules/inventory/utils/stockLines"
import { NAlert, NButton, NDatePicker, NFormItem, NInput, NRadioButton, NRadioGroup, NSelect, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import StockLinesEditor from "@/add-os/modules/inventory/components/StockLinesEditor.vue"
import { STOCK_OPERATION_KINDS } from "@/add-os/modules/inventory/types/inventory"
import { localized } from "@/add-os/modules/inventory/utils/display"
import { linesPayload, operationProblem } from "@/add-os/modules/inventory/utils/stockLines"
import { listWarehouses, submitStockOperation } from "@/add-os/services/inventory"
import { uploadMedia } from "@/add-os/services/media"
import Icon from "@/components/common/Icon.vue"

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
const route = useRoute()
const router = useRouter()

const REASONS: Partial<Record<StockOperationKind, ManualIssueReason[]>> = {
	writeOff: ["damaged", "expired"],
	issue: ["internal_use", "other"]
}
const MAX_ATTACHMENT = 2 * 1024 * 1024

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
const costMethod = ref<CostMethod>("average")
const note = ref("")
const lines = ref<LineDraft[]>([])
const attachment = ref<{ url: string; name: string } | null>(null)
const uploading = ref(false)
const saving = ref(false)
const serverProblem = ref("")

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

onMounted(() => {
	reason.value = reasons.value[0] ?? null
	void quietly(
		() => listWarehouses({ active: true, per_page: 100 }),
		result => {
			warehouses.value = result.data
			warehouseId.value = result.data.find(w => w.is_primary)?.id ?? null
			fromId.value = warehouseId.value
		}
	)
})

function isFuture(timestamp: number): boolean {
	return localDay(new Date(timestamp)) > today()
}

async function upload(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	input.value = ""
	if (!file) return
	serverProblem.value = ""
	if (file.size > MAX_ATTACHMENT) {
		serverProblem.value = t("inventory.operations.attachmentTooLarge")
		return
	}
	if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
		serverProblem.value = t("inventory.operations.attachmentType")
		return
	}
	uploading.value = true
	try {
		attachment.value = { url: (await uploadMedia(file, "inventory")).url, name: file.name }
	} catch (e) {
		serverProblem.value = apiErrorMessage(e, t("inventory.common.saveError"))
	} finally {
		uploading.value = false
	}
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
			attachment_url: attachment.value?.url ?? null,
			lines: linesPayload(kind.value, lines.value, costMethod.value)
		})
		message.success("message" in result && result.message ? result.message : t("inventory.operations.saved"))
		leave()
	} catch (e) {
		serverProblem.value = apiErrorMessage(e, t("inventory.common.saveError"))
	} finally {
		saving.value = false
	}
}
</script>
