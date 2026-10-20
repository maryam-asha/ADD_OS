<template>
	<div class="flex w-full flex-col gap-2">
		<EmployeeSelect v-model:value="picking" :include-former :exclude="value" :placeholder class="w-full" @update:value="add" />
		<div v-if="chosen.length" class="flex flex-wrap gap-2">
			<n-tag v-for="employee in chosen" :key="employee.id" closable round @close="remove(employee.id)">
				{{ employee.label }}
			</n-tag>
		</div>
	</div>
</template>

<script setup lang="ts">
import { NTag } from "naive-ui"
import { ref, watch } from "vue"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import { quietly } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { getEmployee } from "@/add-os/services/hr/core"

/**
 * Several employees, picked one at a time through the same search as
 * EmployeeSelect: each choice becomes a tag with the employee's name and
 * number, and the picker clears for the next. A tag's close takes it off.
 */
defineProps<{ includeFormer?: boolean; placeholder?: string }>()
const value = defineModel<number[]>("value", { required: true })

const picking = ref<number | null>(null)
const chosen = ref<{ id: number; label: string }[]>([])

/** Names for ids that arrive from outside (an edit, a reset), read once each. */
watch(
	value,
	ids => {
		chosen.value = ids.map(id => chosen.value.find(c => c.id === id) ?? { id, label: `#${id}` })
		for (const entry of chosen.value.filter(c => c.label === `#${c.id}`)) {
			void quietly(
				() => getEmployee(entry.id),
				employee => {
					chosen.value = chosen.value.map(c => (c.id === entry.id ? { id: c.id, label: `${translated(employee.name)} · ${employee.employee_number}` } : c))
				}
			)
		}
	},
	{ immediate: true }
)

function add(id: number | null) {
	if (id === null) return
	picking.value = null
	if (!value.value.includes(id)) value.value = [...value.value, id]
}

function remove(id: number) {
	value.value = value.value.filter(v => v !== id)
}
</script>
