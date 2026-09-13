<!-- src/add-os/modules/plans/components/PlanStepper.vue -->
<template>
	<div class="flex items-center border border-neutral-200 rounded-lg bg-white overflow-hidden h-9 shadow-2xs hover:border-neutral-300 focus-within:border-[#557e46] focus-within:ring-1 focus-within:ring-[#557e46]/20 transition-all w-full">
		<button
			type="button"
			class="w-8 h-full flex items-center justify-center text-neutral-400 hover:text-neutral-800 hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer select-none text-base font-bold border-e border-neutral-100 shrink-0"
			@click="decrement"
			aria-label="Decrement"
		>
			-
		</button>
		<input
			type="number"
			:value="currentValue"
			:min="min"
			:max="max"
			:step="step"
			class="w-full text-center text-xs md:text-sm font-semibold text-neutral-800 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-1 font-mono"
			@input="onInput"
		/>
		<button
			type="button"
			class="w-8 h-full flex items-center justify-center text-neutral-400 hover:text-neutral-800 hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer select-none text-base font-bold border-s border-neutral-100 shrink-0"
			@click="increment"
			aria-label="Increment"
		>
			+
		</button>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = withDefaults(
	defineProps<{
		modelValue?: number
		min?: number
		max?: number
		step?: number
	}>(),
	{
		modelValue: 0,
		min: 0,
		max: undefined,
		step: 1
	}
)

const emit = defineEmits<{
	(e: "update:modelValue", val: number): void
}>()

const currentValue = computed(() => Number(props.modelValue) || 0)

function clamp(val: number): number {
	let next = val
	if (props.min !== undefined && next < props.min) next = props.min
	if (props.max !== undefined && next > props.max) next = props.max
	return next
}

function decrement() {
	const next = clamp(currentValue.value - props.step)
	emit("update:modelValue", next)
}

function increment() {
	const next = clamp(currentValue.value + props.step)
	emit("update:modelValue", next)
}

function onInput(event: Event) {
	const input = event.target as HTMLInputElement
	const parsed = parseFloat(input.value)
	if (isNaN(parsed)) {
		emit("update:modelValue", props.min ?? 0)
	} else {
		emit("update:modelValue", clamp(parsed))
	}
}
</script>
