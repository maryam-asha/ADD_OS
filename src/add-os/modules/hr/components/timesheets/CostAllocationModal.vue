<template>
	<HrFormModal v-model:show="show" :title="t('hrTimesheets.allocation.change')" size="lg" icon="carbon:chart-pie">
		<p class="mb-3 text-sm text-secondary">{{ t("hrTimesheets.allocation.hint") }}</p>
		<n-form-item :label="t('hrTimesheets.allocation.effectiveFrom')" class="max-w-xs">
			<n-date-picker
				v-model:formatted-value="effectiveFrom"
				value-format="yyyy-MM-dd"
				type="date"
				class="w-full"
				:is-date-disabled="(ts: number) => !!latestFrom && toIso(ts) <= latestFrom"
			/>
		</n-form-item>

		<div class="flex flex-col gap-2">
			<div v-for="(line, index) in lines" :key="line.key" class="flex flex-wrap items-center gap-2">
				<n-select
					v-model:value="line.cost_center_id"
					:options="optionsFor(line.cost_center_id)"
					:placeholder="t('hrTimesheets.costCenter')"
					filterable
					class="min-w-0 flex-1"
					:aria-label="t('hrTimesheets.costCenter')"
				/>
				<n-input-number
					v-model:value="line.percent"
					:min="0.01"
					:max="100"
					:precision="2"
					:show-button="false"
					class="w-32"
					:aria-label="t('hrTimesheets.allocation.percent')"
				>
					<template #suffix>%</template>
				</n-input-number>
				<n-button text type="error" :disabled="lines.length === 1" :aria-label="t('hr.common.delete')" :title="t('hr.common.delete')" @click="removeLine(index)">
					<template #icon><Icon name="carbon:trash-can" :size="18" /></template>
				</n-button>
			</div>
		</div>

		<div class="mt-3 flex flex-wrap items-center justify-between gap-3">
			<n-button size="small" :disabled="lines.length >= MAX_LINES || lines.length >= centers.length" @click="addLine">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("hrTimesheets.allocation.addLine") }}
			</n-button>
			<n-tag :type="complete ? 'success' : 'warning'" size="small" round bordered>
				<span class="add-numeric">{{ t("hrTimesheets.allocation.total", { n: formatNumber(total, { fractionDigits: 2, trimZeros: true }) }) }}</span>
			</n-tag>
		</div>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :disabled="!ready" :loading="saving" @click="save">{{ t("hr.common.save") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { CostAllocation, CostCenter } from "@/add-os/modules/hr/types/timesheets"
import { NButton, NDatePicker, NFormItem, NInputNumber, NSelect, NTag, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { addDays } from "@/add-os/modules/hr/utils/time"
import { centerName } from "@/add-os/modules/hr/utils/timesheets"
import { replaceCostAllocations } from "@/add-os/services/hr/timesheets"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * A new cost split from a date: active cost centers, each once, adding up
 * to 100%. The split before it ends the day before. A new split must start
 * after the latest one does, so the date opens on today or the day after
 * that start, whichever is later; the server refuses an earlier one and
 * says so. Opens on the split in force, to adjust rather than retype.
 */
const props = defineProps<{ employeeId: number; centers: CostCenter[]; current: CostAllocation[]; latestFrom: string | null }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

/** ReplaceCostAllocationRequest takes 20 lines at most. */
const MAX_LINES = 20

const { t } = useI18n()
const message = useMessage()

interface Line {
	key: number
	cost_center_id: number | null
	percent: number | null
}

let nextKey = 0
const effectiveFrom = ref<string | null>(todayIso())
const lines = ref<Line[]>([])
const saving = ref(false)

watch(show, open => {
	if (!open) return
	const earliest = props.latestFrom ? addDays(props.latestFrom, 1) : todayIso()
	effectiveFrom.value = earliest > todayIso() ? earliest : todayIso()
	lines.value = props.current.length
		? props.current.map(a => ({ key: ++nextKey, cost_center_id: a.cost_center.id, percent: Number.parseFloat(a.percent) }))
		: [{ key: ++nextKey, cost_center_id: null, percent: 100 }]
})

/** Active centers, less those another line already took. */
function optionsFor(own: number | null): SelectOption[] {
	const taken = new Set(lines.value.map(l => l.cost_center_id).filter(id => id !== own))
	return props.centers.filter(c => c.is_active && !taken.has(c.id)).map(c => ({ label: centerName(c), value: c.id }))
}

/** A picker's timestamp as the local `yyyy-MM-dd` it shows. */
function toIso(ts: number): string {
	const d = new Date(ts)
	const pad = (n: number) => String(n).padStart(2, "0")
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addLine() {
	lines.value.push({ key: ++nextKey, cost_center_id: null, percent: null })
}

function removeLine(index: number) {
	lines.value.splice(index, 1)
}

const total = computed(() => lines.value.reduce((sum, l) => sum + (l.percent ?? 0), 0))
/** The server's own tolerance: exactly 100, give or take float rounding. */
const complete = computed(() => Math.abs(total.value - 100) <= 0.001)
const ready = computed(() => !!effectiveFrom.value && complete.value && lines.value.every(l => l.cost_center_id !== null && (l.percent ?? 0) > 0))

async function save() {
	saving.value = true
	try {
		const result = await replaceCostAllocations(
			props.employeeId,
			effectiveFrom.value as string,
			lines.value.map(l => ({ cost_center_id: l.cost_center_id as number, percent: l.percent as number }))
		)
		message.success(serverMessage(result, t("hrTimesheets.allocation.saved")))
		show.value = false
		emit("saved")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
