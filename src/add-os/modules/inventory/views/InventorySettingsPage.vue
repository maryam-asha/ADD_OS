<!-- src/add-os/modules/inventory/views/InventorySettingsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.inventorySettings')" :description="t('inventory.settings.description')">
			<template #actions>
				<n-button type="primary" :loading="saving" :disabled="!changedCount" @click="save">
					<template #icon><Icon name="carbon:save" :size="16" /></template>{{ t("inventory.settings.save") }}
				</n-button>
			</template>
		</HrPageHeader>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card v-for="group in groups" :key="group.name" class="rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800 dark:bg-slate-900" :bordered="false" :title="t(`inventory.settings.groups.${group.name}`)">
			<div class="grid grid-cols-1 items-start gap-x-6 gap-y-4 md:grid-cols-2">
				<div v-for="row in group.rows" :key="row.key" class="flex flex-col gap-1">
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium">{{ label(row) }}</span>
						<n-tag v-if="row.locked" size="small" :bordered="false">
							<template #icon><Icon name="carbon:locked" :size="12" /></template>{{ t("inventory.settings.locked") }}
						</n-tag>
					</div>

					<n-select v-if="row.type === 'enum'" :value="draft[row.key] as string" :options="optionsOf(row)" :disabled="row.locked" @update:value="(v: string) => set(row, v)" />
					<n-select v-else-if="row.type === 'list'" :value="draft[row.key] as string[]" :options="optionsOf(row)" multiple :disabled="row.locked" @update:value="(v: string[]) => set(row, v)" />
					<n-switch v-else-if="row.type === 'boolean'" :value="draft[row.key] as boolean" :disabled="row.locked" @update:value="(v: boolean) => set(row, v)" />
					<n-input-number v-else-if="row.type === 'integer'" :value="draft[row.key] as number" :precision="0" :disabled="row.locked" dir="ltr" class="w-full" @update:value="(v: number | null) => set(row, v)" />
					<n-input v-else :value="(draft[row.key] as string | null) ?? ''" :disabled="row.locked" dir="ltr" @update:value="(v: string) => set(row, v)" />

					<span v-if="row.locked && row.locked_reason" class="text-xs text-warning">{{ row.locked_reason }}</span>
					<span v-else-if="row.locked_options.length" class="text-xs text-warning">{{ t("inventory.settings.optionsInUse") }}</span>
					<span v-else-if="te(fieldKey(row, 'hint'))" class="text-xs text-secondary">{{ t(fieldKey(row, "hint")) }}</span>
					<span v-if="errors[row.key]" class="text-xs text-error">{{ errors[row.key] }}</span>
				</div>
			</div>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { ManagedSetting } from "@/add-os/modules/inventory/types/inventory"
import { NAlert, NButton, NCard, NInput, NInputNumber, NSelect, NSwitch, NTag, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { ApiError } from "@/add-os/services/api"
import { listManagedSettings, saveSettings } from "@/add-os/services/inventory"
import Icon from "@/components/common/Icon.vue"

/**
 * The inventory package's settings, laid over its config file: set when
 * the package is first used, each locked once data depends on it (the
 * server says why, and the field shows it). Saving sends only what changed.
 */
defineProps<{ titleKey?: string }>()
const { t, te } = useI18n()
const message = useMessage()

const GROUP_ORDER = ["items", "assets", "depreciation", "stock"]

const rows = ref<ManagedSetting[]>([])
const draft = ref<Record<string, unknown>>({})
const errors = ref<Record<string, string>>({})
const loadError = ref("")
const saving = ref(false)

const groups = computed(() =>
	GROUP_ORDER.map(name => ({ name, rows: rows.value.filter(row => row.group === name) })).filter(group => group.rows.length)
)

const changed = computed(() => Object.fromEntries(rows.value.filter(row => JSON.stringify(draft.value[row.key]) !== JSON.stringify(row.value)).map(row => [row.key, draft.value[row.key]])))
const changedCount = computed(() => Object.keys(changed.value).length)

/** vue-i18n reads dots as nesting, so `items.sku_prefix` is `items_sku_prefix` in the lang files. */
function fieldKey(row: ManagedSetting, part: "label" | "hint"): string {
	return `inventory.settings.fields.${row.key.replace(/\./g, "_")}.${part}`
}

function label(row: ManagedSetting): string {
	return te(fieldKey(row, "label")) ? t(fieldKey(row, "label")) : row.key
}

function optionsOf(row: ManagedSetting): SelectOption[] {
	const base = `inventory.settings.options.${row.key.replace(/\./g, "_")}`
	// An option in use cannot be removed: Naive draws its tag without a close button.
	return row.options.map(option => ({ value: option, label: te(`${base}.${option}`) ? t(`${base}.${option}`) : option, disabled: row.locked_options.includes(option) }))
}

function set(row: ManagedSetting, value: unknown) {
	draft.value = { ...draft.value, [row.key]: value }
	delete errors.value[row.key]
}

async function load() {
	loadError.value = ""
	try {
		rows.value = await listManagedSettings()
		draft.value = Object.fromEntries(rows.value.map(row => [row.key, row.value]))
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("inventory.settings.loadError"))
	}
}

async function save() {
	saving.value = true
	errors.value = {}
	try {
		const result = await saveSettings(changed.value)
		message.success(result.message ?? t("inventory.settings.saved"))
		await load()
	} catch (e) {
		const fieldErrors = e instanceof ApiError ? e.data?.errors : undefined
		if (fieldErrors) errors.value = Object.fromEntries(Object.entries(fieldErrors).map(([field, messages]) => [field.replace(/^values\./, ""), messages[0] ?? ""]))
		message.error(apiErrorMessage(e, t("inventory.common.saveError")))
	} finally {
		saving.value = false
	}
}

onMounted(load)
</script>
