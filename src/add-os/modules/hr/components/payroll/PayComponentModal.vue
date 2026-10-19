<template>
	<HrFormModal v-model:show="show" :title="component ? t('hrPayroll.components.edit') : t('hrPayroll.components.add')" size="lg" icon="carbon:money">
		<n-form ref="formRef" :model="form" :rules label-placement="top">
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item :label="t('hrPayroll.components.nameAr')" path="nameAr">
					<n-input v-model:value="form.nameAr" dir="rtl" :maxlength="255" />
				</n-form-item>
				<n-form-item :label="t('hrPayroll.components.nameEn')" path="nameEn">
					<n-input v-model:value="form.nameEn" dir="ltr" :maxlength="255" />
				</n-form-item>
				<n-form-item :label="t('hr.org.code')" path="code">
					<n-input v-model:value="form.code" dir="ltr" :maxlength="32" class="font-mono" />
				</n-form-item>
				<n-form-item :label="t('hrPayroll.components.kind')" path="kind">
					<n-select v-model:value="form.kind" :options="kindOptions" />
				</n-form-item>
				<n-form-item :label="t('hrPayroll.components.calculator')" path="calculator">
					<n-select v-model:value="form.calculator" :options="calculatorOptions" @update:value="onCalculator" />
				</n-form-item>
				<n-form-item :label="t('hrPayroll.components.sort')">
					<n-input-number v-model:value="form.sort" :min="0" :max="65000" :precision="0" class="w-full" />
				</n-form-item>
			</div>
			<p v-if="form.calculator" class="-mt-2 mb-4 text-sm text-secondary">{{ calculatorHint }}</p>

			<HrPanel v-if="form.calculator && hasSettings" :title="t('hrPayroll.components.settings')" icon="carbon:settings-adjust" class="mb-4">
				<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
					<template v-if="form.calculator === 'fixed'">
						<n-form-item :label="t('hrPayroll.config.prorate')" class="sm:col-span-2">
							<n-switch v-model:value="config.prorate" />
							<span class="ms-3 text-sm text-secondary">{{ t("hrPayroll.config.prorateHint") }}</span>
						</n-form-item>
					</template>

					<template v-if="form.calculator === 'percent_of'">
						<n-form-item :label="t('hrPayroll.config.percent')">
							<n-input-number v-model:value="config.percent" :min="0" :max="1000" :precision="4" class="w-full">
								<template #suffix>%</template>
							</n-input-number>
						</n-form-item>
						<n-form-item :label="t('hrPayroll.config.components')">
							<n-select v-model:value="config.components" :options="codeOptions" multiple filterable tag />
						</n-form-item>
					</template>

					<template v-if="form.calculator === 'rate_table'">
						<n-form-item :label="t('hrPayroll.config.table')">
							<n-select v-model:value="config.table" :options="tableOptions" filterable />
						</n-form-item>
						<n-form-item :label="t('hrPayroll.config.base')">
							<n-select v-model:value="config.base" :options="baseOptions" />
						</n-form-item>
						<n-form-item v-if="config.base === 'components'" :label="t('hrPayroll.config.components')">
							<n-select v-model:value="config.components" :options="codeOptions" multiple filterable tag />
						</n-form-item>
						<n-form-item :label="t('hrPayroll.config.less')">
							<n-select v-model:value="config.less" :options="codeOptions" multiple filterable tag clearable />
						</n-form-item>
					</template>

					<template v-if="form.calculator === 'overtime' || form.calculator === 'unpaid_days'">
						<n-form-item :label="t('hrPayroll.config.baseComponents')" class="sm:col-span-2">
							<n-select v-model:value="config.base_components" :options="codeOptions" multiple filterable tag />
						</n-form-item>
					</template>

					<template v-if="form.calculator === 'overtime'">
						<n-form-item :label="t('hrPayroll.config.hoursPerMonth')">
							<n-input-number v-model:value="config.hours_per_month" :min="1" :max="744" class="w-full" />
						</n-form-item>
						<n-form-item :label="t('hrPayroll.config.multiplier')">
							<n-input-number v-model:value="config.multiplier" :min="0" :max="10" :step="0.25" class="w-full" />
						</n-form-item>
						<n-form-item :label="t('hrPayroll.config.multiplierTable')" class="sm:col-span-2">
							<n-select v-model:value="config.multiplier_table" :options="percentTableOptions" filterable clearable />
						</n-form-item>
					</template>

					<template v-if="form.calculator === 'unpaid_days'">
						<n-form-item :label="t('hrPayroll.config.daysPerMonth')">
							<n-input-number v-model:value="config.days_per_month" :min="1" :max="31" class="w-full" />
						</n-form-item>
					</template>

					<template v-if="!isKnownCalculator(form.calculator)">
						<n-form-item :label="t('hrPayroll.config.raw')" :feedback="rawError" :validation-status="rawError ? 'error' : undefined" class="sm:col-span-2">
							<n-input v-model:value="rawConfig" type="textarea" dir="ltr" :autosize="{ minRows: 3, maxRows: 10 }" class="font-mono" />
						</n-form-item>
					</template>
				</div>
			</HrPanel>

			<div class="flex flex-wrap gap-x-6 gap-y-2">
				<n-checkbox v-model:checked="form.applies_to_all">{{ t("hrPayroll.components.appliesToAll") }}</n-checkbox>
				<n-checkbox v-model:checked="form.taxable">{{ t("hrPayroll.components.taxable") }}</n-checkbox>
				<n-checkbox v-model:checked="form.insurable">{{ t("hrPayroll.components.insurable") }}</n-checkbox>
				<n-checkbox v-model:checked="form.is_active">{{ t("hr.common.active") }}</n-checkbox>
			</div>
			<p class="mt-2 text-xs text-secondary">{{ t("hrPayroll.components.appliesToAllHint") }}</p>
		</n-form>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!!rawError" @click="save">{{ t("hr.common.save") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { ComponentConfig, PayComponent, PayComponentKind, PayComponentPayload, RateTable } from "@/add-os/modules/hr/types/payroll"
import { NButton, NCheckbox, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { PAY_COMPONENT_KINDS } from "@/add-os/modules/hr/types/payroll"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { calculatorLabel, isKnownCalculator } from "@/add-os/modules/hr/utils/payroll"
import { createPayComponent, updatePayComponent } from "@/add-os/services/hr/payroll"

/**
 * A pay component: what it is (earning, deduction, employer contribution,
 * in kind), how it is worked out (its calculator) and that calculator's
 * settings, as each built-in calculator reads them. A calculator the server
 * added on its own is set up as JSON. Rules mirror StorePayComponentRequest.
 */
const props = defineProps<{ component: PayComponent | null; components: PayComponent[]; rateTables: RateTable[]; calculators: string[] }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const saving = ref(false)

/** Laravel's `alpha_dash`, 32 at most. */
const CODE_PATTERN = /^[\p{L}\p{N}_-]{1,32}$/u

/** The keys the built-in calculators read (see each class in src/Payroll/Calculators). */
interface KnownConfig {
	prorate: boolean
	percent: number | null
	components: string[]
	table: string | null
	base: "gross" | "taxable" | "insurable" | "components"
	less: string[]
	base_components: string[]
	hours_per_month: number | null
	multiplier: number | null
	multiplier_table: string | null
	days_per_month: number | null
}

function emptyForm() {
	return {
		nameAr: "",
		nameEn: "",
		code: "",
		kind: "earning" as PayComponentKind,
		calculator: "fixed",
		sort: 0 as number | null,
		applies_to_all: false,
		taxable: false,
		insurable: false,
		is_active: true
	}
}

/** The server's own defaults where a calculator has one, so the form shows what will happen. */
function readConfig(raw: ComponentConfig | null): KnownConfig {
	const c = raw ?? {}
	const list = (v: unknown, fallback: string[] = []) => (Array.isArray(v) ? v.map(String) : fallback)
	const num = (v: unknown, fallback: number | null) => (v === undefined || v === null || v === "" ? fallback : Number(v))
	return {
		prorate: c.prorate === undefined ? true : Boolean(c.prorate),
		percent: num(c.percent, null),
		components: list(c.components),
		table: typeof c.table === "string" ? c.table : null,
		base: (["gross", "taxable", "insurable", "components"] as const).find(b => b === c.base) ?? "gross",
		less: list(c.less),
		base_components: list(c.base_components, ["basic"]),
		hours_per_month: num(c.hours_per_month, 208),
		multiplier: num(c.multiplier, 1.5),
		multiplier_table: typeof c.multiplier_table === "string" ? c.multiplier_table : null,
		days_per_month: num(c.days_per_month, 30)
	}
}

const form = ref(emptyForm())
const config = ref<KnownConfig>(readConfig(null))
const rawConfig = ref("")

watch(show, open => {
	if (!open) return
	const c = props.component
	form.value = c
		? {
				nameAr: c.name.ar ?? "",
				nameEn: c.name.en ?? "",
				code: c.code,
				kind: c.kind,
				calculator: c.calculator,
				sort: c.sort,
				applies_to_all: c.applies_to_all,
				taxable: c.taxable,
				insurable: c.insurable,
				is_active: c.is_active
			}
		: emptyForm()
	config.value = readConfig(c?.config ?? null)
	rawConfig.value = c?.config && !isKnownCalculator(c.calculator) ? JSON.stringify(c.config, null, 2) : ""
})

/** Another calculator reads other settings: start them from its defaults. */
function onCalculator() {
	config.value = readConfig(null)
	rawConfig.value = ""
}

const NO_SETTINGS = ["per_attendance_day", "loan_installment", "benefit_allowance"]
const hasSettings = computed(() => !NO_SETTINGS.includes(form.value.calculator))
const calculatorHint = computed(() => (isKnownCalculator(form.value.calculator) ? t(`hrPayroll.calculators.${form.value.calculator}.hint`) : t("hrPayroll.calculators.custom")))

const rawError = computed(() => {
	if (isKnownCalculator(form.value.calculator) || !rawConfig.value.trim()) return ""
	try {
		const parsed: unknown = JSON.parse(rawConfig.value)
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? "" : t("hrPayroll.config.rawObject")
	} catch {
		return t("hrPayroll.config.rawInvalid")
	}
})

/** Only the keys the chosen calculator reads go to the server; none at all is null. */
function buildConfig(): ComponentConfig | null {
	const c = config.value
	switch (form.value.calculator) {
		case "fixed":
			return { prorate: c.prorate }
		case "percent_of":
			return { percent: c.percent, components: c.components }
		case "rate_table":
			return { table: c.table, base: c.base, ...(c.base === "components" ? { components: c.components } : {}), ...(c.less.length ? { less: c.less } : {}) }
		case "overtime":
			return {
				base_components: c.base_components,
				hours_per_month: c.hours_per_month,
				multiplier: c.multiplier,
				...(c.multiplier_table ? { multiplier_table: c.multiplier_table } : {})
			}
		case "unpaid_days":
			return { base_components: c.base_components, days_per_month: c.days_per_month }
		default:
			if (isKnownCalculator(form.value.calculator)) return null
			return rawConfig.value.trim() ? (JSON.parse(rawConfig.value) as ComponentConfig) : null
	}
}

const kindOptions = computed<SelectOption[]>(() => PAY_COMPONENT_KINDS.map(k => ({ label: t(`hrPayroll.kind.${k}`), value: k })))
const calculatorOptions = computed<SelectOption[]>(() => {
	const keys = props.calculators.length ? props.calculators : [form.value.calculator]
	return keys.map(key => ({ label: calculatorLabel(t, key), value: key }))
})
/** Earlier lines a calculator may build on, by code — any other component, or a code typed in. */
const codeOptions = computed<SelectOption[]>(() =>
	props.components.filter(c => c.id !== props.component?.id).map(c => ({ label: c.code, value: c.code }))
)
const tableOptions = computed<SelectOption[]>(() => props.rateTables.map(r => ({ label: r.code, value: r.code })))
const percentTableOptions = computed<SelectOption[]>(() => props.rateTables.filter(r => r.kind === "percent").map(r => ({ label: r.code, value: r.code })))
const baseOptions = computed<SelectOption[]>(() => ["gross", "taxable", "insurable", "components"].map(b => ({ label: t(`hrPayroll.config.bases.${b}`), value: b })))

const rules = computed<FormRules>(() => ({
	nameAr: { required: true, trigger: ["blur", "input"], validator: (_r: unknown, v: string) => !!v?.trim(), message: t("hr.common.arabicRequired", { field: t("hrPayroll.components.name") }) },
	code: { required: true, trigger: ["blur", "input"], validator: (_r: unknown, v: string) => CODE_PATTERN.test((v ?? "").trim()), message: t("hrPayroll.codeRule") },
	kind: { required: true, message: t("hr.common.required") },
	calculator: { required: true, message: t("hr.common.required") }
}))

async function save() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}
	const f = form.value
	const payload: PayComponentPayload = {
		code: f.code.trim(),
		name: { ar: f.nameAr.trim(), en: f.nameEn.trim() || null },
		kind: f.kind,
		calculator: f.calculator,
		config: buildConfig(),
		applies_to_all: f.applies_to_all,
		taxable: f.taxable,
		insurable: f.insurable,
		sort: f.sort ?? 0,
		is_active: f.is_active
	}
	saving.value = true
	try {
		if (props.component) {
			message.success(serverMessage(await updatePayComponent(props.component.id, payload), t("hrPayroll.components.updated")))
		} else {
			await createPayComponent(payload)
			message.success(t("hrPayroll.components.created"))
		}
		show.value = false
		emit("saved")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
