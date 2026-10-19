<template>
	<div class="flex flex-wrap items-center gap-2">
		<n-button-group>
			<n-button :disabled="!week" :aria-label="t('hrTimesheets.weekPicker.previous')" :title="t('hrTimesheets.weekPicker.previous')" @click="move(-7)">
				<template #icon><Icon name="carbon:chevron-left" :size="16" class="rtl:rotate-180" /></template>
			</n-button>
			<n-button :disabled="!week" :aria-label="t('hrTimesheets.weekPicker.next')" :title="t('hrTimesheets.weekPicker.next')" @click="move(7)">
				<template #icon><Icon name="carbon:chevron-right" :size="16" class="rtl:rotate-180" /></template>
			</n-button>
		</n-button-group>
		<n-date-picker
			:formatted-value="week"
			value-format="yyyy-MM-dd"
			type="date"
			:clearable
			:placeholder="t('hrTimesheets.week')"
			class="w-44"
			@update:formatted-value="pick"
		/>
		<span v-if="week" class="text-sm text-secondary">{{ t("hrTimesheets.weekPicker.range", { from: formatDate(week), to: formatDate(addDays(week, 6)) }) }}</span>
		<n-button v-if="week !== thisWeek" text type="primary" @click="week = thisWeek">{{ t("hrTimesheets.weekPicker.thisWeek") }}</n-button>
	</div>
</template>

<script setup lang="ts">
import { NButton, NButtonGroup, NDatePicker } from "naive-ui"
import { useI18n } from "vue-i18n"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { addDays } from "@/add-os/modules/hr/utils/time"
import { weekStartOf } from "@/add-os/modules/hr/utils/timesheets"
import { formatDate } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * A timesheet week, held as its first day. Any date picked lands on the
 * start of its week — the server refuses any other day — and the arrows
 * step a week back or on.
 */
defineProps<{ clearable?: boolean }>()
const week = defineModel<string | null>("week", { required: true })

const { t } = useI18n()
const thisWeek = weekStartOf(todayIso())

function pick(value: string | null) {
	week.value = value ? weekStartOf(value) : null
}

function move(days: number) {
	if (week.value) week.value = addDays(week.value, days)
}
</script>
