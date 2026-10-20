<template>
	<HrDrawer v-model:show="show" :title="t('hrTraining.budgets.ledgerTitle', { name, year })" size="lg">
		<n-alert v-if="loadError" type="error" :title="loadError" />
		<BudgetLedger v-else :budget :loading />

		<template v-if="mayManage && employeeId" #footer>
			<div class="flex justify-end">
				<n-button type="primary" @click="adjustVisible = true">
					<template #icon><Icon name="carbon:edit" :size="16" /></template>
					{{ t("hrTraining.budgets.adjust") }}
				</n-button>
			</div>
		</template>

		<AdjustBudgetModal v-if="mayManage && employeeId" v-model:show="adjustVisible" :employee-id :year :currency="budget?.currency ?? null" @adjusted="onAdjusted" />
	</HrDrawer>
</template>

<script setup lang="ts">
import type { LearningBudget } from "@/add-os/modules/hr/types/training"
import { NAlert, NButton } from "naive-ui"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canManageTraining } from "@/add-os/config/permissions"
import HrDrawer from "@/add-os/modules/hr/components/HrDrawer.vue"
import AdjustBudgetModal from "@/add-os/modules/hr/components/training/AdjustBudgetModal.vue"
import BudgetLedger from "@/add-os/modules/hr/components/training/BudgetLedger.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { getEmployeeBudget } from "@/add-os/services/hr/training"
import Icon from "@/components/common/Icon.vue"

/** One employee's year: balance, what is available, every entry — and an adjustment with hr.training.manage. */
const props = defineProps<{ employeeId: number | null; year: number; name: string }>()
const emit = defineEmits<{ changed: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const mayManage = canManageTraining()

const budget = ref<LearningBudget | null>(null)
const loading = ref(false)
const loadError = ref("")
const adjustVisible = ref(false)

async function load() {
	if (!props.employeeId) return
	loading.value = true
	loadError.value = ""
	try {
		budget.value = await getEmployeeBudget(props.employeeId, props.year)
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

watch(show, open => {
	if (!open) return
	budget.value = null
	void load()
})

function onAdjusted() {
	void load()
	emit("changed")
}
</script>
