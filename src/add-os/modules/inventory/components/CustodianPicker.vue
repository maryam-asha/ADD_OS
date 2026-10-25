<!-- src/add-os/modules/inventory/components/CustodianPicker.vue -->
<template>
	<div class="flex flex-col gap-2">
		<n-radio-group v-model:value="type" size="small">
			<n-radio-button v-for="option in CUSTODIAN_TYPES" :key="option" :value="option">{{ t(`inventory.custodianType.${option}`) }}</n-radio-button>
		</n-radio-group>
		<EmployeeSelect v-if="type === 'hr_employee'" v-model:value="employeeId" :placeholder="t('inventory.custody.pickEmployee')" />
		<n-select v-else v-model:value="otherId" :options="type === 'member' ? memberOptions : companyOptions" :loading filterable clearable :placeholder="t(`inventory.custody.pick.${type}`)" />
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { CustodianRef, CustodianType } from "@/add-os/modules/inventory/types/inventory"
import { NRadioButton, NRadioGroup, NSelect } from "naive-ui"
import { onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import { quietly } from "@/add-os/modules/hr/utils/errors"
import { CUSTODIAN_TYPES } from "@/add-os/modules/inventory/types/inventory"
import { listCompanies } from "@/add-os/services/companies"
import { listMembers } from "@/add-os/services/members"

/**
 * Who an asset is handed to: an HR employee (searched as you type, with
 * hr.employees.view), a member, or a company — the three custodians ADD
 * Core's resolver knows. The value is its `{type, id}`.
 */
const value = defineModel<CustodianRef | null>("value", { required: true })

const { t } = useI18n()

const type = ref<CustodianType>("hr_employee")
const employeeId = ref<number | null>(null)
const otherId = ref<number | null>(null)
const memberOptions = ref<SelectOption[]>([])
const companyOptions = ref<SelectOption[]>([])
const loading = ref(false)

onMounted(async () => {
	loading.value = true
	await Promise.all([
		quietly(listMembers, members => (memberOptions.value = members.map(m => ({ label: `${m.name} · ${m.phone}`, value: m.id })))),
		quietly(listCompanies, companies => (companyOptions.value = companies.map(c => ({ label: c.legal_name, value: c.id }))))
	])
	loading.value = false
})

watch(type, () => {
	employeeId.value = null
	otherId.value = null
})

watch([type, employeeId, otherId], () => {
	const id = type.value === "hr_employee" ? employeeId.value : otherId.value
	value.value = id ? { type: type.value, id } : null
})
</script>
