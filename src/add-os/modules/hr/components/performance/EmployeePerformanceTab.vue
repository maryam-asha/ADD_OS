<template>
	<HrPanel :title="t('hrPerformance.goals.title')" :subtitle="t('hrPerformance.profile.subtitle')" icon="carbon:task-star" flush class="add-ledger-table">
		<template v-if="mayManage" #extra>
			<n-button size="small" type="primary" @click="openEditor(null)">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("hrPerformance.goals.add") }}
			</n-button>
		</template>
		<n-alert v-if="loadError" type="error" :title="loadError" class="m-3" />
		<GoalsTable :goals :loading :cycles :on-edit="mayManage ? openEditor : undefined" />
		<GoalModal v-if="mayManage" v-model:show="editorVisible" :goal="editing" mode="admin" :employee-id :cycles @saved="load" />
	</HrPanel>
</template>

<script setup lang="ts">
import type { Goal, ReviewCycle } from "@/add-os/modules/hr/types/performance"
import { NAlert, NButton } from "naive-ui"
import { onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManagePerformance } from "@/add-os/config/permissions"
import GoalModal from "@/add-os/modules/hr/components/performance/GoalModal.vue"
import GoalsTable from "@/add-os/modules/hr/components/performance/GoalsTable.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { listCycles, listGoals } from "@/add-os/services/hr/performance"
import Icon from "@/components/common/Icon.vue"

/** An employee's goals across cycles; HR sets and updates them with hr.performance.manage. */
const props = defineProps<{ employeeId: number }>()

const { t } = useI18n()
const mayManage = canManagePerformance()

const goals = ref<Goal[]>([])
const cycles = ref<ReviewCycle[]>([])
const loading = ref(true)
const loadError = ref("")
const editorVisible = ref(false)
const editing = ref<Goal | null>(null)

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		goals.value = (await listGoals({ employee_id: props.employeeId })).data
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

onMounted(() => {
	void load()
	void quietly(() => listCycles(), result => (cycles.value = result.data))
})

function openEditor(goal: Goal | null) {
	editing.value = goal
	editorVisible.value = true
}
</script>
