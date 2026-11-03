<!-- src/add-os/modules/plans/components/PlanPreviewCard.vue -->
<template>
	<div class="border border-neutral-200 rounded-2xl bg-white p-4 flex flex-col gap-3 shadow-2xs" data-test="plan-preview">
		<div class="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500">
			<Icon name="carbon:mobile" :size="13" />
			{{ t('packages.preview.title') }}
		</div>

		<div class="flex flex-col gap-0.5">
			<span class="text-sm font-bold text-neutral-800">{{ name }}</span>
			<span class="text-sm font-bold text-[#557e46] add-numeric">
				{{ t('packages.preview.price', { points: formatNumber(model.price_points || 0), days: formatNumber(model.duration_days || 0) }) }}
			</span>
		</div>

		<div class="grid grid-cols-2 gap-2">
			<div v-for="stat in stats" :key="stat.key" class="flex flex-col items-center gap-1 rounded-xl bg-neutral-50 border border-neutral-100 p-2 text-center">
				<svg v-if="stat.display === 'ring'" viewBox="0 0 36 36" class="w-12 h-12 -rotate-90">
					<circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e5e5" stroke-width="3.5" />
					<circle cx="18" cy="18" r="15.9" fill="none" stroke="#557e46" stroke-width="3.5" :stroke-dasharray="`${stat.percent ?? 0} 100`" stroke-linecap="round" />
				</svg>
				<span v-else class="w-12 h-12 rounded-full border-[3.5px] border-[#c9a227] flex items-center justify-center">
					<Icon name="carbon:infinity-symbol" :size="18" class="text-[#c9a227]" />
				</span>
				<span class="text-[11px] font-semibold text-neutral-700 leading-tight">{{ stat.title }}</span>
				<span class="text-[10px] text-neutral-500 add-numeric">
					{{ stat.total === null ? t('packages.preview.unlimited') : `${formatNumber(stat.used)} / ${formatNumber(stat.total)}` }}
				</span>
			</div>
		</div>

		<span class="text-[10px] text-neutral-400">{{ t('packages.preview.sample') }}</span>
	</div>
</template>

<script setup lang="ts">
import type { PlanPayload } from "@/add-os/modules/plans/types/plan"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { previewStats } from "@/add-os/modules/plans/utils/previewStats"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{ model: PlanPayload }>()

const { t } = useI18n()

const name = computed(() => pickLocalized(props.model.name, currentLocale.value) || t("packages.preview.untitled"))
const stats = computed(() => previewStats(props.model, t))
</script>
