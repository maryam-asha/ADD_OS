<template>
	<div class="flex flex-col gap-4">
		<HrPanel :title="t('hrTraining.certifications.title')" :subtitle="t('hrTraining.profile.certificationsSubtitle')" icon="carbon:certificate" flush class="add-ledger-table">
			<template v-if="mayManage" #extra>
				<n-button size="small" type="primary" @click="openCertification(null)">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrTraining.certifications.add") }}
				</n-button>
			</template>
			<n-alert v-if="certError" type="error" :title="certError" class="m-3" />
			<CertificationsTable :certifications :loading="certLoading" :on-edit="mayManage ? openCertification : undefined" :on-delete="mayManage ? confirmDelete : undefined" />
		</HrPanel>

		<HrPanel :title="t('hrTraining.budgets.title')" :subtitle="t('hrTraining.profile.budgetSubtitle')" icon="carbon:wallet">
			<template #extra>
				<div class="flex flex-wrap items-center gap-2">
					<n-input-number v-model:value="year" :min="2000" :max="2100" :precision="0" size="small" class="w-28" dir="ltr" :aria-label="t('hrTraining.budgets.year')" />
					<n-button v-if="mayManage" size="small" @click="adjustVisible = true">
						<template #icon><Icon name="carbon:edit" :size="16" /></template>
						{{ t("hrTraining.budgets.adjust") }}
					</n-button>
				</div>
			</template>
			<n-alert v-if="budgetError" type="error" :title="budgetError" class="mb-3" />
			<BudgetLedger :budget :loading="budgetLoading" />
		</HrPanel>

		<HrPanel :title="t('hrTraining.requests.title')" icon="carbon:money" flush class="add-ledger-table">
			<LearningRequestsTable :requests :loading="requestsLoading" />
		</HrPanel>

		<template v-if="mayManage">
			<CertificationModal v-model:show="certVisible" :employee-id :certification="editing" :courses @saved="loadCertifications" />
			<AdjustBudgetModal v-model:show="adjustVisible" :employee-id :year="year ?? thisYear" :currency="budget?.currency ?? null" @adjusted="loadBudget" />
		</template>
	</div>
</template>

<script setup lang="ts">
import type { Certification, Course, LearningBudget, LearningRequest } from "@/add-os/modules/hr/types/training"
import { NAlert, NButton, NInputNumber, useDialog, useMessage } from "naive-ui"
import { onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canManageTraining } from "@/add-os/config/permissions"
import AdjustBudgetModal from "@/add-os/modules/hr/components/training/AdjustBudgetModal.vue"
import BudgetLedger from "@/add-os/modules/hr/components/training/BudgetLedger.vue"
import CertificationModal from "@/add-os/modules/hr/components/training/CertificationModal.vue"
import CertificationsTable from "@/add-os/modules/hr/components/training/CertificationsTable.vue"
import LearningRequestsTable from "@/add-os/modules/hr/components/training/LearningRequestsTable.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { deleteCertification, getEmployeeBudget, listCertifications, listCourses, listLearningRequests } from "@/add-os/services/hr/training"
import Icon from "@/components/common/Icon.vue"

/**
 * An employee's training on their file: their certifications (HR records
 * one earned outside), their learning budget for a year with its ledger
 * and adjustments, and their requests to spend it.
 */
const props = defineProps<{ employeeId: number }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const mayManage = canManageTraining()
const thisYear = new Date().getFullYear()

// ── Certifications ──────────────────────────────────────────────────────────
const certifications = ref<Certification[]>([])
const certLoading = ref(true)
const certError = ref("")
const courses = ref<Course[]>([])
const certVisible = ref(false)
const editing = ref<Certification | null>(null)

async function loadCertifications() {
	certLoading.value = true
	certError.value = ""
	try {
		certifications.value = (await listCertifications({ employee_id: props.employeeId })).data
	} catch (e) {
		certError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		certLoading.value = false
	}
}

function openCertification(certification: Certification | null) {
	editing.value = certification
	certVisible.value = true
}

function confirmDelete(certification: Certification) {
	dialog.warning({
		title: t("hrTraining.certifications.delete"),
		content: t("hrTraining.certifications.deleteConfirm", { name: translated(certification.name) }),
		positiveText: t("hr.common.delete"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			try {
				await deleteCertification(certification.id)
				message.success(t("hrTraining.certifications.deleted"))
				await loadCertifications()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

// ── Budget ──────────────────────────────────────────────────────────────────
const year = ref<number | null>(thisYear)
const budget = ref<LearningBudget | null>(null)
const budgetLoading = ref(true)
const budgetError = ref("")
const adjustVisible = ref(false)

async function loadBudget() {
	budgetLoading.value = true
	budgetError.value = ""
	try {
		budget.value = await getEmployeeBudget(props.employeeId, year.value ?? thisYear)
	} catch (e) {
		budgetError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		budgetLoading.value = false
	}
}

watch(year, value => {
	if (value) void loadBudget()
})

// ── Requests ────────────────────────────────────────────────────────────────
const requests = ref<LearningRequest[]>([])
const requestsLoading = ref(true)

onMounted(() => {
	void loadCertifications()
	void loadBudget()
	void quietly(
		() => listLearningRequests({ employee_id: props.employeeId }),
		result => (requests.value = result.data)
	).finally(() => (requestsLoading.value = false))
	if (mayManage) void quietly(() => listCourses(), list => (courses.value = list))
})
</script>
