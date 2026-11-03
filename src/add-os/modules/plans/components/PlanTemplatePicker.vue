<!-- src/add-os/modules/plans/components/PlanTemplatePicker.vue -->
<template>
	<div class="flex flex-col gap-3" data-test="plan-template-picker">
		<div class="flex flex-col gap-0.5">
			<h3 class="text-sm md:text-base font-bold text-neutral-800">{{ t('packages.templates.title') }}</h3>
			<span class="text-xs text-neutral-500">{{ t('packages.templates.subtitle') }}</span>
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
					selected === key ? 'border-[#557e46] bg-[#f0f7ee]' : 'border-neutral-200 bg-white hover:border-neutral-300',
					key === 'noSeat' ? 'opacity-80' : ''
				]"
				@click="pick(key)"
			>
				<span class="flex items-center gap-1.5 text-xs md:text-sm font-bold text-neutral-800">
					<Icon :name="icons[key]" :size="16" />
					{{ t(`packages.templates.${key}.title`) }}
				</span>
				<span class="text-[11px] text-neutral-500">{{ t(`packages.templates.${key}.hint`) }}</span>
				<span v-if="key === 'monthlyUnlimited'" class="mt-1 inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full bg-[#eef7ec] text-[#47743b] text-[11px] font-bold">
					<Icon name="carbon:star-filled" :size="11" />
					{{ t('packages.templates.mostUsed') }}
				</span>
			</button>
		</div>

		<div class="flex justify-end">
			<button
				type="button"
				data-test="plan-template-continue"
				class="h-9 px-6 rounded-lg bg-[#557e46] hover:bg-[#476a3a] text-white text-xs md:text-sm font-bold transition-colors cursor-pointer"
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
