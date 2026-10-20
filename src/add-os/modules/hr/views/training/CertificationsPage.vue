<!-- src/add-os/modules/hr/views/training/CertificationsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrCertifications')" :description="t('hrTraining.certifications.description')">
			<template v-if="mayManage" #actions>
				<n-button type="primary" :disabled="!filters.employee_id" :title="filters.employee_id ? undefined : t('hrTraining.certifications.pickEmployee')" @click="openEditor(null)">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrTraining.certifications.add") }}
				</n-button>
			</template>
		</HrPageHeader>

		<HrToolbar>
			<EmployeeSelect v-model:value="filters.employee_id" include-former :placeholder="t('hrApprovals.requests.employeeFilter')" class="max-w-xs" />
			<n-date-picker v-model:formatted-value="filters.expires_before" value-format="yyyy-MM-dd" type="date" clearable :placeholder="t('hrTraining.certifications.expiringBy')" class="max-w-xs" />
		</HrToolbar>
		<p v-if="mayManage && !filters.employee_id" class="-mt-2 text-sm text-secondary">{{ t("hrTraining.certifications.pickEmployee") }}</p>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<CertificationsTable :certifications="rows" :loading :names :on-edit="mayManage ? openEditor : undefined" :on-delete="mayManage ? confirmDelete : undefined" />
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<CertificationModal v-if="mayManage" v-model:show="editorVisible" :employee-id="editorEmployee ?? 0" :certification="editing" :courses @saved="load" />
	</div>
</template>

<script setup lang="ts">
import type { Certification, Course } from "@/add-os/modules/hr/types/training"
import { NAlert, NButton, NCard, NDatePicker, NPagination, useDialog, useMessage } from "naive-ui"
import { onMounted, reactive, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageTraining } from "@/add-os/config/permissions"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import CertificationModal from "@/add-os/modules/hr/components/training/CertificationModal.vue"
import CertificationsTable from "@/add-os/modules/hr/components/training/CertificationsTable.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { getEmployee } from "@/add-os/services/hr/core"
import { deleteCertification, listCertifications, listCourses } from "@/add-os/services/hr/training"
import Icon from "@/components/common/Icon.vue"

/**
 * Every certification on file, latest first, by employee and by expiry —
 * "expiring by" a day shows what needs renewing. Choosing an employee
 * lets HR record one earned outside; any may be corrected or removed.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const mayManage = canManageTraining()

const rows = ref<Certification[]>([])
const courses = ref<Course[]>([])
const names = reactive(new Map<number, string>())
const loading = ref(true)
const loadError = ref("")
const lastPage = ref(1)
const editorVisible = ref(false)
const editing = ref<Certification | null>(null)
const editorEmployee = ref<number | null>(null)

const { filters, applied, page } = useRouteFilters({ employee_id: "number", expires_before: "string" }, () => void load())

async function load() {
	loading.value = true
	loadError.value = ""
	const a = applied.value
	try {
		const result = await listCertifications({ page: page.value, employee_id: a.employee_id, expires_before: a.expires_before })
		rows.value = result.data
		lastPage.value = result.meta.last_page
		for (const id of new Set(result.data.map(c => c.employee_id))) {
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

onMounted(() => {
	if (mayManage) void quietly(() => listCourses(), list => (courses.value = list))
})

function openEditor(certification: Certification | null) {
	editing.value = certification
	editorEmployee.value = certification?.employee_id ?? filters.value.employee_id
	editorVisible.value = true
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
				await load()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}
</script>
