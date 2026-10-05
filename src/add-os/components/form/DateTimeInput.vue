<!-- src/add-os/components/form/DateTimeInput.vue -->
<!--
	One instant as two controls, date then time. The combined Naive panel
	hides the clock inside the calendar popup, so picking a day and closing it
	saved midnight nobody chose. The value is written with an explicit offset
	(`toOffsetIso`) so the server never has to guess whose clock it is.
-->
<template>
	<div class="flex w-full gap-2">
		<n-date-picker
			:formatted-value="datePart"
			type="date"
			format="yyyy-MM-dd"
			value-format="yyyy-MM-dd"
			clearable
			class="flex-1"
			@update:formatted-value="setDate"
		/>
		<n-time-picker
			:formatted-value="timePart"
			format="hh:mm a"
			use-12-hours
			value-format="HH:mm"
			class="w-36"
			@update:formatted-value="setTime"
		/>
	</div>
</template>

<script setup lang="ts">
import { NDatePicker, NTimePicker } from "naive-ui"
import { computed } from "vue"
import { toOffsetIso } from "@/add-os/utils/format"

const model = defineModel<string | null>({ default: null })

function asDate(value: unknown): Date | null {
	// Epoch millis too: the drawer this was lifted from accepted them.
	if (typeof value === "number" && !Number.isNaN(value)) return new Date(value)
	if (typeof value !== "string" || !value.trim()) return null
	const str = value.trim()
	const ts = Date.parse(str.includes("T") ? str : str.replace(" ", "T"))
	return Number.isNaN(ts) ? null : new Date(ts)
}

const pad = (n: number) => String(n).padStart(2, "0")
const current = computed(() => asDate(model.value))
const datePart = computed(() => (current.value ? `${current.value.getFullYear()}-${pad(current.value.getMonth() + 1)}-${pad(current.value.getDate())}` : null))
const timePart = computed(() => (current.value ? `${pad(current.value.getHours())}:${pad(current.value.getMinutes())}` : null))

function setDate(value: string | null): void {
	if (!value) {
		model.value = null
		return
	}
	const [year, month, day] = value.split("-").map(Number)
	// Keep the time already chosen; 09:00 rather than midnight otherwise.
	model.value = toOffsetIso(new Date(year, month - 1, day, current.value?.getHours() ?? 9, current.value?.getMinutes() ?? 0, 0))
}

function setTime(value: string | null): void {
	if (!value) return
	const [hours, minutes] = value.split(":").map(Number)
	// A time cannot invent a day, so an untouched date means today.
	const base = current.value ?? new Date()
	model.value = toOffsetIso(new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes, 0))
}
</script>
