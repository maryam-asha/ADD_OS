<!-- src/add-os/components/resource/SessionsField.vue -->
<!--
	A schedule: one row per sitting, each with its own date and hours.

	This replaces a single start/end pair on the form. An event whose hours
	differ per day could not be entered at all through two pickers, and
	tucking the schedule behind a side button left the admin looking at two
	fields that seemed to be the whole story.

	The date and the two times are separate controls on purpose. Naive's
	`datetime` picker puts the clock inside the calendar popup, so choosing a
	day and closing it silently saves 00:00 — midnight then reads back as a
	deliberate start time rather than an omission.
-->
<template>
	<div class="flex flex-col gap-2 w-full">
		<div
			v-for="(row, index) in rows"
			:key="index"
			class="flex items-center gap-2 flex-wrap"
		>
			<n-date-picker
				:formatted-value="row.date"
				type="date"
				format="yyyy-MM-dd"
				value-format="yyyy-MM-dd"
				class="flex-1 min-w-36"
				:placeholder="t('sessionsField.date')"
				@update:formatted-value="value => setDate(index, value)"
			/>
			<n-time-picker
				:formatted-value="row.start"
				format="HH:mm"
				value-format="HH:mm"
				class="flex-1 min-w-28"
				:placeholder="t('sessionsField.from')"
				@update:formatted-value="value => setTime(index, 'start', value)"
			/>
			<n-time-picker
				:formatted-value="row.end"
				format="HH:mm"
				value-format="HH:mm"
				class="flex-1 min-w-28"
				:placeholder="t('sessionsField.to')"
				@update:formatted-value="value => setTime(index, 'end', value)"
			/>

			<n-button
				v-if="rows.length > 1"
				quaternary
				type="error"
				size="small"
				:aria-label="t('sessionsField.remove')"
				:title="t('sessionsField.remove')"
				@click="removeRow(index)"
			>
				<template #icon>
					<Icon name="carbon:close" :size="16" />
				</template>
			</n-button>
		</div>

		<div class="flex items-center justify-between gap-2">
			<n-button size="tiny" dashed @click="addRow">
				<template #icon>
					<Icon name="carbon:add" :size="14" />
				</template>
				{{ t("sessionsField.add") }}
			</n-button>

			<span v-if="rowError" class="text-xs text-error">{{ rowError }}</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { NButton, NDatePicker, NTimePicker } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import Icon from "@/components/common/Icon.vue"

/** A sitting as the API carries it: two instants, each with its offset. */
export interface SessionValue {
	start_at: string
	end_at: string
}

const pad = (n: number) => `${n}`.padStart(2, "0")

/** A sitting as the editor holds it: a day and two wall clocks. */
interface Row {
	date: string | null
	start: string | null
	end: string | null
}

const props = defineProps<{ modelValue?: SessionValue[] | null }>()
const emit = defineEmits<{ "update:modelValue": [value: SessionValue[]] }>()

const { t } = useI18n()

const rows = ref<Row[]>([blankRow()])

function blankRow(): Row {
	return { date: null, start: "09:00", end: "11:00" }
}

/** Split an instant into the day and wall clock the admin sees. */
function toRow(session: SessionValue): Row {
	const start = new Date(session.start_at)
	const end = new Date(session.end_at)

	if (Number.isNaN(start.getTime())) return blankRow()


	// An overnight sitting is stored with its end on the following day; it
	// belongs to the row of the day it began.
	return {
		date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
		start: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
		end: Number.isNaN(end.getTime()) ? null : `${pad(end.getHours())}:${pad(end.getMinutes())}`
	}
}

// Only adopt an incoming value when it describes a different schedule, or
// every keystroke would be overwritten by the round-trip through the parent.
watch(
	() => props.modelValue,
	incoming => {
		const next = (incoming ?? []).map(toRow)
		const current = JSON.stringify(rows.value)

		if (next.length && JSON.stringify(next) !== current) {
			rows.value = next
		}
	},
	{ immediate: true }
)

/**
 * Only an exactly-equal pair is an error now: 22:30 to 04:00 is a sitting
 * that runs past midnight, which the emitted end date accounts for.
 */
const rowError = computed<string | null>(() => {
	const wrong = rows.value.some(r => r.start && r.end && r.end === r.start)

	return wrong ? t("sessionsField.orderError") : null
})

/** A sitting that ends earlier than it begins runs past midnight. */
function crossesMidnight(row: Row): boolean {
	return Boolean(row.start && row.end && row.end <= row.start)
}

/** The day after `date`, as YYYY-MM-DD. */
function nextDay(date: string): string {
	const d = new Date(`${date}T12:00:00`)
	d.setDate(d.getDate() + 1)

	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function emitValue() {
	const complete = rows.value.filter(r => r.date && r.start && r.end)

	emit(
		"update:modelValue",
		complete.map(r => ({
			// A bare wall clock, deliberately. These hours mean the district's
			// clock, which only the server knows — building an instant here
			// would stamp the BROWSER's offset, so an admin working from
			// another timezone would store hours they never typed. The Form
			// Request interprets it, as it does every other typed time.
			start_at: `${r.date} ${r.start}:00`,
			// 22:30 to 04:00 is one sitting that runs past midnight, not a
			// sitting that ends eighteen hours before it starts.
			end_at: `${crossesMidnight(r) ? nextDay(r.date as string) : r.date} ${r.end}:00`
		}))
	)
}

function setDate(index: number, value: string | null) {
	rows.value[index].date = value
	emitValue()
}

function setTime(index: number, field: "start" | "end", value: string | null) {
	rows.value[index][field] = value
	emitValue()
}

function addRow() {
	// A multi-day event usually runs consecutive days at the same hours, so
	// offer that rather than an empty row.
	const last = rows.value.at(-1)

	if (last?.date) {
		const next = new Date(`${last.date}T00:00:00`)
		next.setDate(next.getDate() + 1)

		rows.value.push({
			date: `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`,
			start: last.start,
			end: last.end
		})
	} else {
		rows.value.push(blankRow())
	}

	emitValue()
}

function removeRow(index: number) {
	rows.value.splice(index, 1)
	emitValue()
}

defineExpose({ rows, addRow, removeRow, rowError })
</script>
