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
import { toOffsetIso } from "@/add-os/utils/format/dates"
import Icon from "@/components/common/Icon.vue"

/** A sitting as the API carries it: two instants, each with its offset. */
export interface SessionValue {
	start_at: string
	end_at: string
}

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

	const pad = (n: number) => `${n}`.padStart(2, "0")

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

/** A sitting must end after it starts; the API refuses one that does not. */
const rowError = computed<string | null>(() => {
	const wrong = rows.value.some(r => r.start && r.end && r.end <= r.start)

	return wrong ? t("sessionsField.orderError") : null
})

function emitValue() {
	const complete = rows.value.filter(r => r.date && r.start && r.end)

	emit(
		"update:modelValue",
		complete.map(r => ({
			// An explicit offset, so the hours the admin sees are the hours
			// stored — a bare wall clock would be read as UTC and could move
			// a late sitting onto the next day.
			start_at: toOffsetIso(new Date(`${r.date}T${r.start}:00`)),
			end_at: toOffsetIso(new Date(`${r.date}T${r.end}:00`))
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
		const pad = (n: number) => `${n}`.padStart(2, "0")

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
