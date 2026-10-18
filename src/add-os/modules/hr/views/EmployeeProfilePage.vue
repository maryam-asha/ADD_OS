<!-- src/add-os/modules/hr/views/EmployeeProfilePage.vue -->
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
		<n-skeleton v-else-if="loading" text :repeat="6" />

		<template v-else-if="employee">
			<div class="flex flex-wrap items-center gap-3">
				<h1 class="text-2xl font-bold">{{ translated(employee.name) }}</h1>
				<span class="font-mono text-secondary" dir="ltr">{{ employee.employee_number }}</span>
				<EmployeeStatusTag :status="employee.status" />
			</div>

			<n-tabs v-model:value="tab" type="line" animated>
				<n-tab-pane name="overview" :tab="t('hr.profile.tabs.overview')">
					<div class="flex flex-col gap-4">
						<n-card :title="t('hr.profile.personal')" size="small">
							<n-descriptions :column="2" label-placement="left" size="small">
								<n-descriptions-item :label="t('hr.profile.fields.employeeNumber')">{{ employee.employee_number }}</n-descriptions-item>
								<n-descriptions-item :label="t('hr.profile.fields.hiredOn')">{{ formatDate(employee.hired_on) }}</n-descriptions-item>
								<n-descriptions-item :label="t('hr.profile.fields.phone')">
									<span dir="ltr">{{ employee.phone || none }}</span>
								</n-descriptions-item>
								<n-descriptions-item :label="t('hr.profile.fields.workEmail')">{{ employee.work_email || none }}</n-descriptions-item>
								<n-descriptions-item :label="t('hr.profile.fields.personalEmail')">{{ employee.personal_email || none }}</n-descriptions-item>
								<n-descriptions-item :label="t('hr.profile.fields.probationEndsOn')">
									{{ employee.probation_ends_on ? formatDate(employee.probation_ends_on) : none }}
								</n-descriptions-item>
								<n-descriptions-item :label="t('hr.profile.fields.confirmedOn')">
									{{ employee.confirmed_on ? formatDate(employee.confirmed_on) : none }}
								</n-descriptions-item>
								<n-descriptions-item v-if="employee.terminated_on" :label="t('hr.profile.fields.terminatedOn')">
									{{ formatDate(employee.terminated_on) }}
								</n-descriptions-item>
							</n-descriptions>
						</n-card>

						<JobDetails :assignment="employee.current_assignment" :contract="employee.current_contract" />

						<n-card :title="t('hr.profile.contacts')" size="small">
							<n-descriptions v-if="employee.contacts.length" :column="1" label-placement="left" size="small">
								<n-descriptions-item v-for="contact in employee.contacts" :key="contact.id" :label="contact.name">
									{{ contact.relation }} · <span dir="ltr">{{ contact.phone }}</span>
								</n-descriptions-item>
							</n-descriptions>
							<p v-else class="text-secondary">{{ t("hr.profile.noContacts") }}</p>
						</n-card>
					</div>
				</n-tab-pane>

				<n-tab-pane name="career" :tab="t('hr.profile.tabs.career')">
					<n-card size="small">
						<n-data-table :columns="eventColumns" :data="events" :loading="eventsLoading" :bordered="false" size="small">
							<template #empty>
								<span class="text-secondary">{{ t("hr.profile.career.empty") }}</span>
							</template>
						</n-data-table>
					</n-card>
				</n-tab-pane>

				<n-tab-pane name="documents" :tab="t('hr.profile.tabs.documents')">
					<n-card size="small">
						<DocumentsTable v-if="mayViewDocuments" :documents :loading="documentsLoading" :open="documentLink" />
						<n-alert v-else type="info" :title="t('hr.documents.noAccess')" />
					</n-card>
				</n-tab-pane>
			</n-tabs>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Employee, EmployeeDocument, EmploymentEvent } from "@/add-os/modules/hr/types/hr"
import { NAlert, NButton, NCard, NDataTable, NDescriptions, NDescriptionsItem, NSkeleton, NTabPane, NTabs } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import { canViewEmployeeDocuments } from "@/add-os/config/permissions"
import DocumentsTable from "@/add-os/modules/hr/components/DocumentsTable.vue"
import EmployeeStatusTag from "@/add-os/modules/hr/components/EmployeeStatusTag.vue"
import JobDetails from "@/add-os/modules/hr/components/JobDetails.vue"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { documentLink, getEmployee, listEmployeeDocuments, listEmploymentEvents } from "@/add-os/services/hr"
import { formatDate } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t, te } = useI18n()
const route = useRoute()
const router = useRouter()
const mayViewDocuments = canViewEmployeeDocuments()
const none = EMPTY

const employeeId = computed(() => Number(route.params.id))
const employee = ref<Employee | null>(null)
const loading = ref(true)
const loadError = ref(false)
const notFound = ref(false)
const tab = ref<"overview" | "career" | "documents">("overview")

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

// ── Career and documents load the first time their tab opens ────────────────
const events = ref<EmploymentEvent[]>([])
const eventsLoading = ref(false)
const eventsLoaded = ref(false)
const documents = ref<EmployeeDocument[]>([])
const documentsLoading = ref(false)
const documentsLoaded = ref(false)

watch(tab, async current => {
	if (current === "career" && !eventsLoaded.value) {
		eventsLoading.value = true
		try {
			events.value = await listEmploymentEvents(employeeId.value)
			eventsLoaded.value = true
		} catch (e) {
			if (!(e instanceof ApiError)) throw e
		} finally {
			eventsLoading.value = false
		}
	}
	if (current === "documents" && mayViewDocuments && !documentsLoaded.value) {
		documentsLoading.value = true
		try {
			documents.value = await listEmployeeDocuments(employeeId.value)
			documentsLoaded.value = true
		} catch (e) {
			if (!(e instanceof ApiError)) throw e
		} finally {
			documentsLoading.value = false
		}
	}
})

function eventLabel(type: string): string {
	return te(`hr.eventType.${type}`) ? t(`hr.eventType.${type}`) : type
}

const eventColumns = computed<DataTableColumns<EmploymentEvent>>(() => [
	{ title: t("hr.profile.career.type"), key: "type", minWidth: 160, render: row => eventLabel(row.type) },
	{ title: t("hr.profile.career.effectiveOn"), key: "effective_on", minWidth: 120, render: row => formatDate(row.effective_on) },
	{ title: t("hr.profile.career.reason"), key: "reason", minWidth: 200, render: row => row.reason || EMPTY }
])
</script>
