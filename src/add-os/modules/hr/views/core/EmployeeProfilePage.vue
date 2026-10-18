<!-- src/add-os/modules/hr/views/core/EmployeeProfilePage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div>
			<n-button text @click="router.push({ name: 'hr.employees' })">
				<template #icon><Icon name="carbon:arrow-left" :size="16" class="rtl:rotate-180" /></template>
				{{ t("hr.common.back") }}
			</n-button>
		</div>

		<n-alert v-if="notFound" type="warning" :title="t('hr.profile.notFound')" />
		<n-alert v-else-if="loadError" type="error" :title="t('hr.common.loadError')" />
		<n-skeleton v-else-if="loading && !employee" text :repeat="6" />

		<template v-else-if="employee">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex flex-wrap items-center gap-3">
					<h1 class="text-2xl font-bold">{{ translated(employee.name) }}</h1>
					<span class="font-mono text-secondary" dir="ltr">{{ employee.employee_number }}</span>
					<EmployeeStatusTag :status="employee.status" />
				</div>
				<div class="flex flex-wrap gap-2">
					<n-button v-if="mayUpdate" @click="editVisible = true">
						<template #icon><Icon name="carbon:edit" :size="16" /></template>
						{{ t("hr.editEmployee.title") }}
					</n-button>
					<n-button v-if="mayRecordEvents" type="primary" @click="eventVisible = true">
						<template #icon><Icon name="carbon:event-schedule" :size="16" /></template>
						{{ t("hr.events.title") }}
					</n-button>
				</div>
			</div>

			<n-tabs v-model:value="tab" type="line" animated>
				<n-tab-pane name="overview" :tab="t('hr.profile.tabs.overview')">
					<div class="flex flex-col gap-4">
						<n-card :title="t('hr.profile.personal')" size="small">
							<n-descriptions :column="2" label-placement="left" size="small">
								<n-descriptions-item :label="t('hr.profile.fields.employeeNumber')">
									<span dir="ltr">{{ employee.employee_number }}</span>
								</n-descriptions-item>
								<n-descriptions-item :label="t('hr.profile.fields.hiredOn')">{{ formatDate(employee.hired_on) }}</n-descriptions-item>
								<n-descriptions-item :label="t('hr.profile.fields.phone')">
									<span dir="ltr">{{ employee.phone || none }}</span>
								</n-descriptions-item>
								<n-descriptions-item :label="t('hr.profile.fields.workEmail')">{{ employee.work_email || none }}</n-descriptions-item>
								<n-descriptions-item :label="t('hr.profile.fields.personalEmail')">{{ employee.personal_email || none }}</n-descriptions-item>
								<n-descriptions-item :label="t('hr.editEmployee.gender')">{{ employee.gender ? t(`hr.gender.${employee.gender}`) : none }}</n-descriptions-item>
								<n-descriptions-item :label="t('hr.editEmployee.dateOfBirth')">
									{{ employee.date_of_birth ? formatDate(employee.date_of_birth) : none }}
								</n-descriptions-item>
								<n-descriptions-item :label="t('hr.editEmployee.nationality')">
									<span dir="ltr">{{ employee.nationality || none }}</span>
								</n-descriptions-item>
								<n-descriptions-item :label="t('hr.editEmployee.maritalStatus')">
									{{ employee.marital_status ? t(`hr.maritalStatus.${employee.marital_status}`) : none }}
								</n-descriptions-item>
								<n-descriptions-item :label="t('hr.editEmployee.address')">{{ employee.address || none }}</n-descriptions-item>
								<n-descriptions-item :label="t('hr.profile.fields.probationEndsOn')">
									{{ employee.probation_ends_on ? formatDate(employee.probation_ends_on) : none }}
								</n-descriptions-item>
								<n-descriptions-item :label="t('hr.profile.fields.confirmedOn')">
									{{ employee.confirmed_on ? formatDate(employee.confirmed_on) : none }}
								</n-descriptions-item>
								<n-descriptions-item v-if="employee.terminated_on" :label="t('hr.profile.fields.terminatedOn')">
									{{ formatDate(employee.terminated_on) }}
									<template v-if="employee.termination_reason">· {{ t(`hr.terminationReason.${employee.termination_reason}`) }}</template>
								</n-descriptions-item>
							</n-descriptions>
						</n-card>

						<JobDetails :assignment="employee.current_assignment" :contract="employee.current_contract" />

						<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
							<n-card :title="t('hr.profile.contacts')" size="small">
								<template v-if="mayUpdate" #header-extra>
									<n-button size="small" text type="primary" @click="contactsVisible = true">
										<template #icon><Icon name="carbon:edit" :size="16" /></template>
										{{ t("hr.common.edit") }}
									</n-button>
								</template>
								<n-descriptions v-if="employee.contacts.length" :column="1" label-placement="left" size="small">
									<n-descriptions-item v-for="contact in employee.contacts" :key="contact.id" :label="contact.name">
										{{ contact.relation }} · <span dir="ltr">{{ contact.phone }}</span>
									</n-descriptions-item>
								</n-descriptions>
								<p v-else class="text-secondary">{{ t("hr.profile.noContacts") }}</p>
							</n-card>

							<n-card :title="t('hr.profile.dependents')" size="small">
								<template v-if="mayUpdate" #header-extra>
									<n-button size="small" text type="primary" @click="dependentsVisible = true">
										<template #icon><Icon name="carbon:edit" :size="16" /></template>
										{{ t("hr.common.edit") }}
									</n-button>
								</template>
								<n-descriptions v-if="employee.dependents.length" :column="1" label-placement="left" size="small">
									<n-descriptions-item v-for="dependent in employee.dependents" :key="dependent.id" :label="dependent.name">
										{{ dependent.relation }}<template v-if="dependent.date_of_birth"> · {{ formatDate(dependent.date_of_birth) }}</template>
									</n-descriptions-item>
								</n-descriptions>
								<p v-else class="text-secondary">{{ t("hr.people.noDependents") }}</p>
							</n-card>
						</div>

						<SensitiveDetails :employee-id :has-national-id="employee.has_national_id" :has-bank-account="employee.has_bank_account" />
					</div>
				</n-tab-pane>

				<n-tab-pane name="career" :tab="t('hr.profile.tabs.career')" display-directive="show:lazy">
					<CareerTab ref="careerTab" :employee-id />
				</n-tab-pane>

				<n-tab-pane name="documents" :tab="t('hr.profile.tabs.documents')" display-directive="show:lazy">
					<EmployeeDocumentsTab v-if="mayViewDocuments" :employee-id />
					<n-alert v-else type="info" :title="t('hr.documents.noAccess')" />
				</n-tab-pane>

				<n-tab-pane v-if="mayViewLeave" name="leave" :tab="t('hrLeave.profile.tab')" display-directive="show:lazy">
					<EmployeeLeaveTab :employee-id />
				</n-tab-pane>

				<n-tab-pane v-if="mayManageChecklists" name="checklist" :tab="t('hr.profile.tabs.checklist')" display-directive="show:lazy">
					<ChecklistTab ref="checklistTab" :employee-id />
				</n-tab-pane>
			</n-tabs>

			<EditEmployeeDrawer v-if="mayUpdate" v-model:show="editVisible" :employee @saved="load" />
			<PeopleListModal
				v-if="mayUpdate"
				v-model:show="contactsVisible"
				kind="contacts"
				:contacts="employee.contacts"
				:save-contacts="rows => replaceEmployeeContacts(employeeId, rows)"
				@saved="load"
			/>
			<PeopleListModal
				v-if="mayUpdate"
				v-model:show="dependentsVisible"
				kind="dependents"
				:dependents="employee.dependents"
				:save-dependents="rows => replaceEmployeeDependents(employeeId, rows)"
				@saved="load"
			/>
			<RecordEventDrawer v-if="mayRecordEvents" v-model:show="eventVisible" :employee @recorded="onEventRecorded" />
		</template>
	</div>
</template>

<script setup lang="ts">
import type { Employee } from "@/add-os/modules/hr/types/hr"
import { NAlert, NButton, NCard, NDescriptions, NDescriptionsItem, NSkeleton, NTabPane, NTabs } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import { canManageChecklists, canRecordEmploymentEvents, canUpdateEmployees, canViewEmployeeDocuments, canViewLeave } from "@/add-os/config/permissions"
import CareerTab from "@/add-os/modules/hr/components/core/CareerTab.vue"
import ChecklistTab from "@/add-os/modules/hr/components/core/ChecklistTab.vue"
import EditEmployeeDrawer from "@/add-os/modules/hr/components/core/EditEmployeeDrawer.vue"
import EmployeeDocumentsTab from "@/add-os/modules/hr/components/core/EmployeeDocumentsTab.vue"
import PeopleListModal from "@/add-os/modules/hr/components/core/PeopleListModal.vue"
import RecordEventDrawer from "@/add-os/modules/hr/components/core/RecordEventDrawer.vue"
import SensitiveDetails from "@/add-os/modules/hr/components/core/SensitiveDetails.vue"
import EmployeeStatusTag from "@/add-os/modules/hr/components/EmployeeStatusTag.vue"
import JobDetails from "@/add-os/modules/hr/components/JobDetails.vue"
import EmployeeLeaveTab from "@/add-os/modules/hr/components/leave/EmployeeLeaveTab.vue"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { getEmployee, replaceEmployeeContacts, replaceEmployeeDependents } from "@/add-os/services/hr/core"
import { formatDate } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const mayViewDocuments = canViewEmployeeDocuments()
const mayUpdate = canUpdateEmployees()
const mayRecordEvents = canRecordEmploymentEvents()
const mayManageChecklists = canManageChecklists()
const mayViewLeave = canViewLeave()
const none = EMPTY

const employeeId = computed(() => Number(route.params.id))
const employee = ref<Employee | null>(null)
const loading = ref(true)
const loadError = ref(false)
const notFound = ref(false)
/** Each tab after the first loads the first time it opens (`show:lazy`). */
const tab = ref<"overview" | "career" | "documents" | "leave" | "checklist">("overview")

const editVisible = ref(false)
const contactsVisible = ref(false)
const dependentsVisible = ref(false)
const eventVisible = ref(false)
const careerTab = ref<InstanceType<typeof CareerTab> | null>(null)
const checklistTab = ref<InstanceType<typeof ChecklistTab> | null>(null)

/** A reload after an edit keeps the page on screen; only the first load shows the skeleton. */
async function load() {
	loading.value = true
	loadError.value = false
	notFound.value = false
	try {
		employee.value = await getEmployee(employeeId.value)
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
		if (e.status === 404) notFound.value = true
		else loadError.value = true
	} finally {
		loading.value = false
	}
}

onMounted(load)

/** An event changes status, job and contract, and a hire or termination creates checklist tasks. */
async function onEventRecorded() {
	await load()
	await careerTab.value?.load()
	await checklistTab.value?.load()
}
</script>
