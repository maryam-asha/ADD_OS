<!-- src/add-os/modules/hr/views/core/MyHrPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />
		<n-skeleton v-else-if="loading && !profile" text :repeat="6" />

		<template v-else-if="profile">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div class="flex flex-col gap-1">
					<div class="flex flex-wrap items-center gap-3">
						<h1 class="text-2xl font-bold">{{ translated(profile.name) }}</h1>
						<span class="font-mono text-secondary" dir="ltr">{{ profile.employee_number }}</span>
						<EmployeeStatusTag :status="profile.status" />
					</div>
					<p>{{ t("hr.me.description") }}</p>
				</div>
				<div class="flex flex-wrap gap-2">
					<n-button @click="router.push({ name: 'myHr.hrMyCertificate', params: { kind: 'employment' } })">
						<template #icon><Icon name="carbon:certificate" :size="16" /></template>
						{{ t("hr.certificate.employmentTitle") }}
					</n-button>
					<n-button @click="router.push({ name: 'myHr.hrMyCertificate', params: { kind: 'salary' } })">
						<template #icon><Icon name="carbon:receipt" :size="16" /></template>
						{{ t("hr.certificate.salaryTitle") }}
					</n-button>
				</div>
			</div>

			<n-alert v-if="!profile.compliance.complete" type="warning" :title="t('hr.me.compliance')">
				<p v-if="profile.compliance.missing.length">
					{{ t("hr.me.complianceMissing", { list: profile.compliance.missing.map(d => translated(d.name)).join("، ") }) }}
				</p>
				<p v-if="profile.compliance.expired_count">
					{{ t("hr.me.complianceExpired", { n: formatNumber(profile.compliance.expired_count) }) }}
				</p>
			</n-alert>

			<n-card :title="t('hr.profile.personal')" size="small">
				<n-descriptions :column="2" label-placement="left" size="small">
					<n-descriptions-item :label="t('hr.profile.fields.hiredOn')">{{ formatDate(profile.hired_on) }}</n-descriptions-item>
					<n-descriptions-item :label="t('hr.profile.fields.phone')">
						<span dir="ltr">{{ profile.phone || none }}</span>
					</n-descriptions-item>
					<n-descriptions-item :label="t('hr.profile.fields.workEmail')">{{ profile.work_email || none }}</n-descriptions-item>
					<n-descriptions-item :label="t('hr.profile.fields.personalEmail')">{{ profile.personal_email || none }}</n-descriptions-item>
					<n-descriptions-item v-if="profile.probation_ends_on && !profile.confirmed_on" :label="t('hr.profile.fields.probationEndsOn')">
						{{ formatDate(profile.probation_ends_on) }}
					</n-descriptions-item>
				</n-descriptions>
			</n-card>

			<JobDetails :assignment="profile.current_assignment" :contract="profile.current_contract" />

			<n-card :title="t('hr.profile.contacts')" size="small">
				<template #header-extra>
					<n-button size="small" text type="primary" @click="contactsVisible = true">
						<template #icon><Icon name="carbon:edit" :size="16" /></template>
						{{ t("hr.common.edit") }}
					</n-button>
				</template>
				<n-descriptions v-if="profile.contacts.length" :column="1" label-placement="left" size="small">
					<n-descriptions-item v-for="contact in profile.contacts" :key="contact.id" :label="contact.name">
						{{ contact.relation }} · <span dir="ltr">{{ contact.phone }}</span>
					</n-descriptions-item>
				</n-descriptions>
				<p v-else class="text-secondary">{{ t("hr.me.noContacts") }}</p>
			</n-card>

			<n-card :title="t('hr.me.career')" size="small">
				<n-data-table :columns="eventColumns" :data="events" :loading="eventsLoading" :bordered="false" size="small" :scroll-x="480">
					<template #empty>
						<span class="text-secondary">{{ t("hr.profile.career.empty") }}</span>
					</template>
				</n-data-table>
			</n-card>

			<n-card :title="t('hr.me.documents')" size="small">
				<DocumentsTable :documents :loading="documentsLoading" :open="myDocumentLink" />
			</n-card>

			<n-card v-if="team.length" :title="t('hr.me.team')" size="small">
				<n-data-table :columns="teamColumns" :data="team" :bordered="false" size="small" />
			</n-card>

			<PeopleListModal v-model:show="contactsVisible" kind="contacts" :contacts="profile.contacts" :save-contacts="replaceMyContacts" @saved="load" />
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { EmployeeDocument, MyEmploymentEvent, MyProfile, TeamMember } from "@/add-os/modules/hr/types/hr"
import { NAlert, NButton, NCard, NDataTable, NDescriptions, NDescriptionsItem, NSkeleton } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import PeopleListModal from "@/add-os/modules/hr/components/core/PeopleListModal.vue"
import DocumentsTable from "@/add-os/modules/hr/components/DocumentsTable.vue"
import EmployeeStatusTag from "@/add-os/modules/hr/components/EmployeeStatusTag.vue"
import JobDetails from "@/add-os/modules/hr/components/JobDetails.vue"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { getMyProfile, listMyDocuments, listMyEvents, listMyTeam, myDocumentLink, replaceMyContacts } from "@/add-os/services/hr/core"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The signed-in employee's own file (hr/me): whoever they are — operations,
 * sales or the café — and whatever their dashboard role.
 */
defineProps<{ titleKey?: string }>()

const { t, te } = useI18n()
const router = useRouter()
const none = EMPTY
const contactsVisible = ref(false)

const profile = ref<MyProfile | null>(null)
const loading = ref(true)
const loadError = ref(false)
const documents = ref<EmployeeDocument[]>([])
const documentsLoading = ref(true)
const team = ref<TeamMember[]>([])

async function load() {
	loading.value = true
	loadError.value = false
	try {
		profile.value = await getMyProfile()
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

async function loadDocuments() {
	try {
		documents.value = await listMyDocuments()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		documentsLoading.value = false
	}
}

async function loadTeam() {
	try {
		team.value = await listMyTeam()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
}

const events = ref<MyEmploymentEvent[]>([])
const eventsLoading = ref(true)

async function loadEvents() {
	try {
		events.value = await listMyEvents()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		eventsLoading.value = false
	}
}

onMounted(() => {
	void load()
	void loadDocuments()
	void loadEvents()
	void loadTeam()
})

function reasonLabel(row: MyEmploymentEvent): string {
	if (!row.reason) return EMPTY
	if (row.type === "termination" && te(`hr.terminationReason.${row.reason}`)) return t(`hr.terminationReason.${row.reason}`)
	return row.reason
}

const eventColumns = computed<DataTableColumns<MyEmploymentEvent>>(() => [
	{ title: t("hr.profile.career.type"), key: "type", minWidth: 150, render: row => t(`hr.eventType.${row.type}`) },
	{ title: t("hr.profile.career.effectiveOn"), key: "effective_on", minWidth: 120, render: row => formatDate(row.effective_on) },
	{ title: t("hr.profile.career.reason"), key: "reason", minWidth: 160, render: reasonLabel }
])

const teamColumns = computed<DataTableColumns<TeamMember>>(() => [
	{
		title: t("hr.employees.columns.employee"),
		key: "name",
		minWidth: 200,
		render: row =>
			h("div", { class: "flex flex-col gap-0.5" }, [
				h("span", { class: "font-semibold text-sm" }, translated(row.name)),
				h("span", { class: "text-xs text-secondary font-mono", dir: "ltr" }, row.employee_number)
			])
	},
	{ title: t("hr.employees.columns.jobTitle"), key: "job_title", minWidth: 160, render: row => translated(row.job_title) || EMPTY },
	{ title: t("hr.employees.columns.unit"), key: "unit", minWidth: 140, render: row => translated(row.org_unit?.name) || EMPTY },
	{ title: t("hr.employees.columns.status"), key: "status", minWidth: 130, render: row => h(EmployeeStatusTag, { status: row.status }) }
])
</script>
