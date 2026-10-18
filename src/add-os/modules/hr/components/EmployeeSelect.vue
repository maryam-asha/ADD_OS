<!-- src/add-os/modules/hr/components/EmployeeSelect.vue -->
<template>
	<n-select
		v-model:value="value"
		:options
		:loading="searching"
		:placeholder="placeholder ?? (mayFind ? t('hr.hire.managerPlaceholder') : undefined)"
		:disabled
		:status
		:remote="mayFind"
		filterable
		clearable
		@search="search"
	/>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import { NSelect } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canViewEmployees } from "@/add-os/config/permissions"
import { quietly } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { getEmployee, listEmployees } from "@/add-os/services/hr/core"

/**
 * Choosing an employee. With hr.employees.view it searches every employee as
 * you type (`GET employees?q=`); without it, it offers only `options` — the
 * choices the caller already has, such as a manager's own team. A value
 * that arrives with no label (from the URL, a saved flow) is named once
 * from its record when the account may read it.
 */
const props = defineProps<{
	/** Choices offered before and beside a search. */
	options?: SelectOption[]
	/** Ids never offered, e.g. the employee themselves. */
	exclude?: number[]
	/** Leave former employees in the results: a filter over history, not a choice of a person to act. */
	includeFormer?: boolean
	placeholder?: string
	disabled?: boolean
	status?: "error" | "warning"
}>()
const value = defineModel<number | null>("value", { required: true })

const { t } = useI18n()
const mayFind = canViewEmployees()

const found = ref<SelectOption[]>([])
const named = ref<SelectOption[]>([])
const searching = ref(false)

const label = (e: { name: { ar: string; en?: string | null }; employee_number: string }) => `${translated(e.name)} · ${e.employee_number}`

const options = computed<SelectOption[]>(() => {
	const seen = new Set<unknown>()
	return [...found.value, ...(props.options ?? []), ...named.value].filter(o => !props.exclude?.includes(o.value as number) && !seen.has(o.value) && seen.add(o.value))
})

async function search(term: string) {
	if (!mayFind || !term.trim()) return
	searching.value = true
	await quietly(
		() => listEmployees({ q: term.trim() }),
		result => {
			found.value = result.data.filter(e => props.includeFormer || e.status !== "terminated").map(e => ({ label: label(e), value: e.id }))
		}
	)
	searching.value = false
}

watch(
	value,
	id => {
		if (id === null || !mayFind || options.value.some(o => o.value === id)) return
		void quietly(
			() => getEmployee(id),
			e => {
				named.value = [{ label: label(e), value: e.id }]
			}
		)
	},
	{ immediate: true }
)
</script>
