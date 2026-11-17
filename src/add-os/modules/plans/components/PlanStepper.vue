<!-- src/add-os/modules/plans/components/PlanStepper.vue -->
<template>
	<div class="flex items-center border border-[var(--add-border)] rounded-lg bg-white overflow-hidden h-9 shadow-2xs hover:border-[var(--add-border-strong)] focus-within:border-[var(--add-primary)] focus-within:ring-1 focus-within:ring-[var(--add-primary)]/20 transition-all w-full">
		<button
			type="button"
			class="w-8 h-full flex items-center justify-center text-[var(--add-text-muted)] hover:text-[var(--add-text-primary)] hover:bg-[var(--add-surface-sunken)] active:bg-[var(--add-surface-sunken)] transition-colors cursor-pointer select-none text-base font-bold border-e border-[var(--add-border)] shrink-0"
			aria-label="Decrement"
			@click="decrement"
		>
			-
		</button>
		<input
			type="number"
			:value="currentValue"
			:min
			:max
			:step
			:inputmode="integer ? 'numeric' : 'decimal'"
			class="w-full text-center text-xs md:text-sm font-semibold text-[var(--add-text-primary)] bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-1 font-mono"
			@input="onInput"
		/>
		<button
			type="button"
			class="w-8 h-full flex items-center justify-center text-[var(--add-text-muted)] hover:text-[var(--add-text-primary)] hover:bg-[var(--add-surface-sunken)] active:bg-[var(--add-surface-sunken)] transition-colors cursor-pointer select-none text-base font-bold border-s border-[var(--add-border)] shrink-0"
			aria-label="Increment"
			@click="increment"
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
		/**
		 * Constrain the value to a whole number.
		 *
		 * Point fields need this: the backend validates `integer` and rejects a
		 * fractional price with a 422, so a `12.5` the user can still type into
		 * a `type="number"` box (`step` is only a hint browsers apply to the
		 * spinners, not a parse rule) has to be truncated before it becomes the
		 * model value. Off by default — the stepper's other users are decimal.
		 */
		integer?: boolean
	}>(),
	{
		modelValue: 0,
		min: 0,
		max: undefined,
		step: 1,
		integer: false
	}
)

const emit = defineEmits<{
	(e: "update:modelValue", val: number): void
}>()

const currentValue = computed(() => Number(props.modelValue) || 0)

function clamp(val: number): number {
	// Truncate toward zero before clamping, so an integer field can never hand
	// its parent a fraction the API would reject.
	let next = props.integer ? Math.trunc(val) : val
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
	const parsed = Number.parseFloat(input.value)
	if (isNaN(parsed)) {
		emit("update:modelValue", props.min ?? 0)
	} else {
		emit("update:modelValue", clamp(parsed))
	}
}
</script>
