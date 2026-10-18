<!-- src/add-os/modules/hr/views/MyHrPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />
		<n-skeleton v-else-if="loading" text :repeat="6" />

		<template v-else-if="profile">
			<div class="flex flex-col gap-1">
				<div class="flex flex-wrap items-center gap-3">
					<h1 class="text-2xl font-bold">{{ translated(profile.name) }}</h1>
					<span class="font-mono text-secondary" dir="ltr">{{ profile.employee_number }}</span>
					<EmployeeStatusTag :status="profile.status" />
				</div>
				<p>{{ t("hr.me.description") }}</p>
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

			<n-card :title="t('hr.me.documents')" size="small">
				<DocumentsTable :documents :loading="documentsLoading" :open="myDocumentLink" />
			</n-card>

			<n-card v-if="team.length" :title="t('hr.me.team')" size="small">
				<n-data-table :columns="teamColumns" :data="team" :bordered="false" size="small" />
			</n-card>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { EmployeeDocument, MyProfile, TeamMember } from "@/add-os/modules/hr/types/hr"
import { NAlert, NCard, NDataTable, NDescriptions, NDescriptionsItem, NSkeleton } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import DocumentsTable from "@/add-os/modules/hr/components/DocumentsTable.vue"
import EmployeeStatusTag from "@/add-os/modules/hr/components/EmployeeStatusTag.vue"
import JobDetails from "@/add-os/modules/hr/components/JobDetails.vue"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { getMyProfile, listMyDocuments, listMyTeam, myDocumentLink } from "@/add-os/services/hr"
import { formatDate, formatNumber } from "@/add-os/utils/format"

/**
 * The signed-in employee's own file (hr/me): whoever they are — operations,
 * sales or the café — and whatever their dashboard role.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const none = EMPTY

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

onMounted(() => {
	void load()
	void loadDocuments()
	void loadTeam()
})

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
