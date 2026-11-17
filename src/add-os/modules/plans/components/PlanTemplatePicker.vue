<!-- src/add-os/modules/plans/components/PlanTemplatePicker.vue -->
<template>
	<div class="flex flex-col gap-3" data-test="plan-template-picker">
		<div class="flex flex-col gap-0.5">
			<h3 class="text-sm md:text-base font-bold text-[var(--add-text-primary)]">{{ t('packages.templates.title') }}</h3>
			<span class="text-xs text-[var(--add-text-secondary)]">{{ t('packages.templates.subtitle') }}</span>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
			<button
				v-for="key in planTemplateKeys"
				:key
				type="button"
				:data-test="`plan-template-${key}`"
				:aria-pressed="selected === key"
				class="text-start rounded-xl border p-3.5 flex flex-col gap-1.5 transition-colors cursor-pointer"
				:class="[
					selected === key ? 'border-[var(--add-primary)] bg-[color-mix(in_srgb,var(--add-primary)_10%,transparent)]' : 'border-[var(--add-border)] bg-white hover:border-[var(--add-border-strong)]',
					key === 'noSeat' ? 'opacity-80' : ''
				]"
				@click="pick(key)"
			>
				<span class="flex items-center gap-1.5 text-xs md:text-sm font-bold text-[var(--add-text-primary)]">
					<Icon :name="icons[key]" :size="16" />
					{{ t(`packages.templates.${key}.title`) }}
				</span>
				<span class="text-[11px] text-[var(--add-text-secondary)]">{{ t(`packages.templates.${key}.hint`) }}</span>
				<span v-if="key === 'monthlyUnlimited'" class="mt-1 inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--add-primary)_10%,transparent)] text-[var(--add-primary-text)] text-[11px] font-bold">
					<Icon name="carbon:star-filled" :size="11" />
					{{ t('packages.templates.mostUsed') }}
				</span>
			</button>
		</div>

		<div class="flex justify-end">
			<button
				type="button"
				data-test="plan-template-continue"
				class="h-9 px-6 rounded-lg bg-[var(--add-primary)] hover:bg-[var(--add-primary-hover)] text-white text-xs md:text-sm font-bold transition-colors cursor-pointer"
				@click="emit('choose', selected)"
			>
				{{ t('packages.templates.continue') }}
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PlanTemplateKey } from "@/add-os/modules/plans/config/plans.config"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { planTemplateKeys } from "@/add-os/modules/plans/config/plans.config"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{ modelValue: PlanTemplateKey | null }>()
const emit = defineEmits<{
	"update:modelValue": [key: PlanTemplateKey]
	"choose": [key: PlanTemplateKey]
}>()

const { t } = useI18n()

/** Nothing picked yet reads as the plan most are. */
const selected = computed<PlanTemplateKey>(() => props.modelValue ?? "monthlyUnlimited")

const icons: Record<PlanTemplateKey, string> = {
	monthlyUnlimited: "carbon:calendar",
	setHours: "carbon:hourglass",
	dedicatedDesk: "carbon:workspace",
	noSeat: "carbon:percentage"
}

function pick(key: PlanTemplateKey): void {
	emit("update:modelValue", key)
}
</script>
