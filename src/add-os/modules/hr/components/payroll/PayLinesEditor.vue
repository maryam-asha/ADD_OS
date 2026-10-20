<template>
	<div class="flex flex-col gap-2">
		<div v-for="(line, index) in lines" :key="line.key" class="flex flex-wrap items-center gap-2">
			<n-select
				v-model:value="line.pay_component_id"
				:options="optionsFor(line.pay_component_id)"
				:placeholder="t('hrPayroll.pay.component')"
				:aria-label="t('hrPayroll.pay.component')"
				filterable
				class="min-w-0 flex-1"
			/>
			<n-input-number v-model:value="line.amount" :min="0" :max="9999999999" :show-button="false" :aria-label="t('hrPayroll.pay.amount')" class="w-36" />
			<div class="w-36">
				<CurrencySelect v-model:value="line.currency" />
			</div>
			<n-button text type="error" :aria-label="t('hr.common.delete')" :title="t('hr.common.delete')" @click="lines.splice(index, 1)">
				<template #icon><Icon name="carbon:trash-can" :size="18" /></template>
			</n-button>
		</div>
		<div>
			<n-button size="small" :disabled="lines.length >= max" @click="add">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("hrPayroll.pay.addLine") }}
			</n-button>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { PayComponent } from "@/add-os/modules/hr/types/payroll"
import { NButton, NInputNumber, NSelect } from "naive-ui"
import { useI18n } from "vue-i18n"
import CurrencySelect from "@/add-os/modules/hr/components/payroll/CurrencySelect.vue"
import { centerName } from "@/add-os/modules/hr/utils/timesheets"
import Icon from "@/components/common/Icon.vue"

/** One line of pay: a component, its monthly amount and currency. `key` keeps the rows apart while editing. */
export interface PayLine {
	key: number
	pay_component_id: number | null
	amount: number | null
	currency: string | null
}

/**
 * Pay lines as a pay change or a job offer states them: each active
 * component once, with its amount and currency. A new line takes the
 * currency the others use.
 */
const props = withDefaults(defineProps<{ components: PayComponent[]; max?: number }>(), { max: 30 })
const lines = defineModel<PayLine[]>("lines", { required: true })

const { t } = useI18n()

function add() {
	const key = Math.max(0, ...lines.value.map(l => l.key)) + 1
	lines.value.push({ key, pay_component_id: null, amount: null, currency: lines.value.find(l => l.currency)?.currency ?? null })
}

function optionsFor(own: number | null): SelectOption[] {
	const taken = new Set(lines.value.map(l => l.pay_component_id).filter(id => id !== own))
	return props.components.filter(c => c.is_active && !taken.has(c.id)).map(c => ({ label: `${centerName(c)} · ${t(`hrPayroll.kind.${c.kind}`)}`, value: c.id }))
}
</script>
