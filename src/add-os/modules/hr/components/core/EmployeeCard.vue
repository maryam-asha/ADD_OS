<!-- src/add-os/modules/hr/components/core/EmployeeCard.vue -->
<template>
	<article
		class="relative flex flex-col overflow-hidden rounded-add-large border bg-[var(--add-surface-raised)] transition-shadow hover:shadow-md"
		:class="[
			employee.status === 'probation'
				? 'border-[color-mix(in_srgb,var(--add-warning)_45%,var(--add-border))] bg-[color-mix(in_srgb,var(--add-warning)_8%,var(--add-surface-raised))]'
				: 'border-[var(--add-border)]',
			selected ? 'ring-2 ring-[var(--add-primary)]' : ''
		]"
		data-test="employee-card"
	>
		<n-checkbox
			v-model:checked="selected"
			class="absolute start-3 top-3"
			:aria-label="t('hr.employees.select', { name: translated(employee.name) })"
		/>

		<div class="flex flex-col items-center gap-2 px-4 pb-4 pt-6 text-center">
			<EmployeeAvatar :name="employee.name" size="xl" shape="disc" />
			<router-link
				:to="{ name: 'hr.employeeProfile', params: { id: employee.id } }"
				class="text-base font-semibold text-[var(--add-text-primary)] hover:text-primary hover:underline"
			>
				{{ translated(employee.name) }}
			</router-link>
			<EmployeeStatusTag :status="employee.status" />
			<span class="font-mono text-xs text-secondary" dir="ltr">#{{ employee.employee_number }}</span>
		</div>

		<dl class="flex flex-1 flex-col gap-3 border-t border-[var(--add-border)] px-5 py-4 text-start">
			<div v-for="field in fields" :key="field.label" class="flex flex-col gap-0.5">
				<dt class="text-xs font-normal text-secondary">{{ field.label }}</dt>
				<dd class="text-sm font-medium">{{ field.value }}</dd>
			</div>
		</dl>

		<footer class="flex items-center justify-center gap-1 border-t border-[var(--add-border)] px-4 py-2">
			<n-button quaternary circle size="small" type="primary" :aria-label="t('hr.common.view')" :title="t('hr.common.view')" @click="emit('view')">
				<template #icon><Icon name="carbon:view" :size="18" /></template>
			</n-button>
			<n-button quaternary circle size="small" type="primary" :aria-label="t('hr.employees.print')" :title="t('hr.employees.print')" @click="emit('print')">
				<template #icon><Icon name="carbon:printer" :size="18" /></template>
			</n-button>
			<n-button v-if="mayEdit" quaternary circle size="small" type="primary" :aria-label="t('hr.common.edit')" :title="t('hr.common.edit')" @click="emit('edit')">
				<template #icon><Icon name="carbon:edit" :size="18" /></template>
			</n-button>
		</footer>
	</article>
</template>

<script setup lang="ts">
import type { EmployeeSummary } from "@/add-os/modules/hr/types/hr"
import { NButton, NCheckbox } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import EmployeeStatusTag from "@/add-os/modules/hr/components/EmployeeStatusTag.vue"
import EmployeeAvatar from "@/add-os/modules/hr/components/ui/EmployeeAvatar.vue"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import Icon from "@/components/common/Icon.vue"

/**
 * One employee in the card view of the employee list: who they are and
 * where they sit (job title, unit, direct manager), a box to choose them for
 * a download, and the same actions as a table row. Someone on probation is
 * tinted, so the people whose probation is running stand out in the list.
 */
const props = defineProps<{ employee: EmployeeSummary; mayEdit: boolean }>()
const emit = defineEmits<{ view: []; print: []; edit: [] }>()
const selected = defineModel<boolean>("selected", { required: true })

const { t } = useI18n()

const fields = computed(() => [
	{ label: t("hr.employees.columns.jobTitle"), value: translated(props.employee.job_title) || EMPTY },
	{ label: t("hr.employees.columns.unit"), value: translated(props.employee.org_unit?.name) || EMPTY },
	{ label: t("hr.employees.columns.manager"), value: translated(props.employee.manager?.name) || t("hr.employees.noManager") }
])
</script>
