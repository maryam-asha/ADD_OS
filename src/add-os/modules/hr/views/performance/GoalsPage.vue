<!-- src/add-os/modules/hr/views/performance/GoalsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrGoals')" :description="t('hrPerformance.goals.description')">
			<template v-if="mayManage" #actions>
				<n-button type="primary" :disabled="!filters.employee_id" :title="filters.employee_id ? undefined : t('hrPerformance.goals.pickEmployee')" @click="openEditor(null)">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrPerformance.goals.add") }}
				</n-button>
			</template>
		</HrPageHeader>

		<HrToolbar>
			<EmployeeSelect v-model:value="filters.employee_id" include-former :placeholder="t('hrApprovals.requests.employeeFilter')" class="max-w-xs" />
			<n-select v-model:value="filters.review_cycle_id" :options="cycleOptions" :placeholder="t('hrPerformance.goals.cycle')" clearable class="max-w-xs" />
			<n-select v-model:value="filters.status" :options="statusOptions" :placeholder="t('hr.common.status')" clearable class="max-w-xs" />
		</HrToolbar>
		<p v-if="mayManage && !filters.employee_id" class="-mt-2 text-sm text-secondary">{{ t("hrPerformance.goals.pickEmployee") }}</p>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<GoalsTable :goals :loading :cycles :names :on-edit="mayManage ? openEditor : undefined" :on-delete="mayManage ? confirmDelete : undefined" />
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<GoalModal v-if="mayManage" v-model:show="editorVisible" :goal="editing" mode="admin" :employee-id="filters.employee_id" :cycles @saved="load" />
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { Goal, GoalStatus, ReviewCycle } from "@/add-os/modules/hr/types/performance"
import { NAlert, NButton, NCard, NPagination, NSelect, useDialog, useMessage } from "naive-ui"
import { computed, onMounted, reactive, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManagePerformance } from "@/add-os/config/permissions"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import GoalModal from "@/add-os/modules/hr/components/performance/GoalModal.vue"
import GoalsTable from "@/add-os/modules/hr/components/performance/GoalsTable.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { GOAL_STATUSES } from "@/add-os/modules/hr/types/performance"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { getEmployee } from "@/add-os/services/hr/core"
import { deleteGoal, listCycles, listGoals } from "@/add-os/services/hr/performance"
import Icon from "@/components/common/Icon.vue"

/**
 * Every goal, by employee, cycle and status. Choosing an employee lets HR
 * set a goal for them; a goal's definition stays fixed once its cycle leaves
 * goal setting, and the cycle's goals weigh 100 at most together.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const mayManage = canManagePerformance()

const goals = ref<Goal[]>([])
const cycles = ref<ReviewCycle[]>([])
const names = reactive(new Map<number, string>())
const loading = ref(true)
const loadError = ref("")
const lastPage = ref(1)
const editorVisible = ref(false)
const editing = ref<Goal | null>(null)

const { filters, applied, page } = useRouteFilters({ employee_id: "number", review_cycle_id: "number", status: "string" }, () => void load())

async function load() {
	loading.value = true
	loadError.value = ""
	const a = applied.value
	try {
		const result = await listGoals({ page: page.value, employee_id: a.employee_id, review_cycle_id: a.review_cycle_id, status: a.status as GoalStatus | null })
		goals.value = result.data
		lastPage.value = result.meta.last_page
		for (const id of new Set(result.data.map(g => g.employee_id))) {
			if (!names.has(id)) {
				names.set(id, `#${id}`)
				void quietly(() => getEmployee(id), e => names.set(id, translated(e.name)))
			}
		}
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

onMounted(() => void quietly(() => listCycles(), result => (cycles.value = result.data)))

const cycleOptions = computed<SelectOption[]>(() => cycles.value.map(c => ({ label: translated(c.name), value: c.id })))
const statusOptions = computed<SelectOption[]>(() => GOAL_STATUSES.map(s => ({ label: t(`hrPerformance.status.goal.${s}`), value: s })))

function openEditor(goal: Goal | null) {
	editing.value = goal
	editorVisible.value = true
}

function confirmDelete(goal: Goal) {
	dialog.warning({
		title: t("hrPerformance.goals.delete"),
		content: t("hrPerformance.goals.deleteConfirm", { title: goal.title }),
		positiveText: t("hr.common.delete"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			try {
				await deleteGoal(goal.id)
				message.success(t("hrPerformance.goals.deleted"))
				await load()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}
</script>
