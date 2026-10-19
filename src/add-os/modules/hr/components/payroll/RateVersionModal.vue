<template>
	<HrFormModal v-model:show="show" :title="t('hrPayroll.rateTables.addVersion')" :size="table?.kind === 'brackets' ? 'lg' : 'md'" icon="carbon:version">
		<template v-if="table">
			<p class="mb-3 text-sm text-secondary">{{ t("hrPayroll.rateTables.versionHint", { code: table.code }) }}</p>
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item :label="t('hrPayroll.rateTables.from')">
					<n-date-picker v-model:formatted-value="form.from" value-format="yyyy-MM-dd" type="date" class="w-full" />
				</n-form-item>
				<n-form-item :label="t('hrPayroll.rateTables.to')">
					<n-date-picker v-model:formatted-value="form.to" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
				</n-form-item>
			</div>

			<div v-if="table.kind === 'percent'" class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item :label="t('hrPayroll.rateTables.rate')">
					<n-input-number v-model:value="form.rate" :min="0" :max="1000" :precision="4" class="w-full">
						<template #suffix>%</template>
					</n-input-number>
				</n-form-item>
				<n-form-item :label="t('hrPayroll.rateTables.maxBase')">
					<n-input-number v-model:value="form.maxBase" :min="0" :show-button="false" clearable class="w-full" />
				</n-form-item>
			</div>

			<div v-else class="mb-4 flex flex-col gap-2">
				<span class="text-sm font-semibold">{{ t("hrPayroll.rateTables.brackets") }}</span>
				<div v-for="(bracket, index) in form.brackets" :key="bracket.key" class="flex flex-wrap items-center gap-2">
					<span class="text-sm text-secondary">{{ t("hrPayroll.rateTables.upTo") }}</span>
					<n-input-number
						v-model:value="bracket.upTo"
						:min="0"
						:show-button="false"
						:placeholder="t('hrPayroll.rateTables.noLimit')"
						:aria-label="t('hrPayroll.rateTables.upTo')"
						clearable
						class="min-w-0 flex-1"
					/>
					<n-input-number v-model:value="bracket.rate" :min="0" :max="100" :precision="4" :show-button="false" :aria-label="t('hrPayroll.rateTables.rate')" class="w-32">
						<template #suffix>%</template>
					</n-input-number>
					<n-button text type="error" :disabled="form.brackets.length === 1" :aria-label="t('hr.common.delete')" :title="t('hr.common.delete')" @click="form.brackets.splice(index, 1)">
						<template #icon><Icon name="carbon:trash-can" :size="18" /></template>
					</n-button>
				</div>
				<div>
					<n-button size="small" :disabled="form.brackets.length >= 30" @click="addBracket">
						<template #icon><Icon name="carbon:add" :size="16" /></template>
						{{ t("hrPayroll.rateTables.addBracket") }}
					</n-button>
				</div>
				<p v-if="bracketProblem" class="text-sm text-error">{{ bracketProblem }}</p>
				<p v-else class="text-xs text-secondary">{{ t("hrPayroll.rateTables.bracketsHint") }}</p>
			</div>

			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item :label="t('hrPayroll.rateTables.currency')">
					<CurrencySelect v-model:value="form.currency" clearable />
				</n-form-item>
				<n-form-item :label="t('hrPayroll.rateTables.note')">
					<n-input v-model:value="form.note" :maxlength="255" />
				</n-form-item>
			</div>
			<p class="text-xs text-secondary">{{ t("hrPayroll.rateTables.currencyHint") }}</p>
		</template>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!ready" @click="save">{{ t("hr.common.save") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { RateTable, RateVersionPayload } from "@/add-os/modules/hr/types/payroll"
import { NButton, NDatePicker, NFormItem, NInput, NInputNumber, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import CurrencySelect from "@/add-os/modules/hr/components/payroll/CurrencySelect.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { addRateVersion } from "@/add-os/services/hr/payroll"
import Icon from "@/components/common/Icon.vue"

/**
 * A dated version of a rate table: a rate up to a ceiling, or progressive
 * brackets, each band's upper bound in the version's currency (the run's
 * when none) and the last band open-ended. Versions never overlap — the
 * server refuses one that does and says so; close the one in force first.
 */
const props = defineProps<{ table: RateTable | null }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)

interface Bracket {
	key: number
	upTo: number | null
	rate: number | null
}

let nextKey = 0
function emptyForm() {
	return {
		from: todayIso() as string | null,
		to: null as string | null,
		rate: null as number | null,
		maxBase: null as number | null,
		brackets: [{ key: ++nextKey, upTo: null, rate: null }] as Bracket[],
		currency: null as string | null,
		note: ""
	}
}
const form = ref(emptyForm())

watch(show, open => {
	if (open) form.value = emptyForm()
})

function addBracket() {
	// A new band goes before the open-ended top one.
	form.value.brackets.splice(Math.max(form.value.brackets.length - 1, 0), 0, { key: ++nextKey, upTo: null, rate: null })
}

/** Bands rise, every band but the last has an upper bound, and each has a rate. */
const bracketProblem = computed(() => {
	if (props.table?.kind !== "brackets") return ""
	const b = form.value.brackets
	if (b.some(band => band.rate === null)) return t("hrPayroll.rateTables.problems.rate")
	if (b.slice(0, -1).some(band => !band.upTo)) return t("hrPayroll.rateTables.problems.openMiddle")
	const bounds = b.map(band => band.upTo).filter((v): v is number => v !== null)
	if (bounds.some((v, i) => i > 0 && v <= bounds[i - 1])) return t("hrPayroll.rateTables.problems.order")
	return ""
})

const ready = computed(() => {
	const f = form.value
	if (!f.from || (f.to && f.to < f.from)) return false
	return props.table?.kind === "brackets" ? !bracketProblem.value : f.rate !== null
})

async function save() {
	if (!props.table) return
	const f = form.value
	const payload: RateVersionPayload = {
		effective_from: f.from as string,
		effective_to: f.to,
		currency: f.currency,
		note: nullable(f.note),
		...(props.table.kind === "brackets"
			? { brackets: f.brackets.map(band => ({ up_to: band.upTo || null, rate: band.rate as number })) }
			: { rate: f.rate as number, max_base: f.maxBase || null })
	}
	saving.value = true
	try {
		await addRateVersion(props.table.id, payload)
		message.success(t("hrPayroll.rateTables.versionAdded"))
		show.value = false
		emit("saved")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
