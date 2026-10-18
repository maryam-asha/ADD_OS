<!-- src/add-os/modules/hr/views/core/MyHrPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />
		<n-skeleton v-else-if="loading && !profile" text :repeat="6" />

		<template v-else-if="profile">
			<EmployeeHero :name="profile.name" :employee-number="profile.employee_number" :status="profile.status" :assignment="profile.current_assignment">
				<template #actions>
					<n-button @click="router.push({ name: 'myHr.hrMyCertificate', params: { kind: 'employment' } })">
						<template #icon><Icon name="carbon:certificate" :size="16" /></template>
						{{ t("hr.certificate.employmentTitle") }}
					</n-button>
					<n-button @click="router.push({ name: 'myHr.hrMyCertificate', params: { kind: 'salary' } })">
						<template #icon><Icon name="carbon:receipt" :size="16" /></template>
						{{ t("hr.certificate.salaryTitle") }}
					</n-button>
				</template>
			</EmployeeHero>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<HrStatCard
					:label="t('hr.me.stats.approvals')"
					:value="formatNumber(pendingApprovals)"
					icon="carbon:task-approved"
					:hint="pendingApprovals ? t('hr.me.stats.approvalsHint') : t('hr.me.stats.approvalsNone')"
					:to="{ name: 'myHr.hrMyApprovals' }"
					:cta="t('hr.me.stats.open')"
					:loading="pendingLoading"
				/>
				<HrStatCard
					:label="leaveCard ? translated(leaveCard.leave_type.name) : t('hr.me.stats.leave')"
					:value="leaveCard ? leaveAmount(t, leaveCard.available, leaveCard.leave_type.unit) : none"
					icon="carbon:calendar"
					:hint="leaveCard ? t('hr.me.stats.leaveHint') : t('hr.me.stats.leaveNone')"
					:to="{ name: 'myHr.hrMyLeave' }"
					:cta="t('hr.me.stats.open')"
					:loading="leaveLoading"
				/>
				<HrStatCard
					:label="t('hr.me.stats.today')"
					:value="todayLabel"
					icon="carbon:time"
					:hint="todayHint"
					:to="{ name: 'myHr.hrMyAttendance' }"
					:cta="t('hr.me.stats.open')"
					:loading="todayLoading"
				/>
				<HrStatCard
					:label="t('hr.me.stats.documents')"
					:value="profile.compliance.complete ? t('hr.me.stats.documentsComplete') : formatNumber(profile.compliance.missing.length + profile.compliance.expired_count)"
					icon="carbon:document"
					:hint="profile.compliance.complete ? t('hr.me.stats.documentsCompleteHint') : t('hr.me.stats.documentsHint')"
				/>
			</div>

			<n-alert v-if="!profile.compliance.complete" type="warning" :title="t('hr.me.compliance')">
				<p v-if="profile.compliance.missing.length">
					{{ t("hr.me.complianceMissing", { list: profile.compliance.missing.map(d => translated(d.name)).join("، ") }) }}
				</p>
				<p v-if="profile.compliance.expired_count">
					{{ t("hr.me.complianceExpired", { n: formatNumber(profile.compliance.expired_count) }) }}
				</p>
			</n-alert>

			<HrPanel :title="t('hr.profile.personal')" icon="carbon:user">
				<n-descriptions :column="narrow ? 1 : 2" label-placement="left" size="small">
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
			</HrPanel>

			<JobDetails :assignment="profile.current_assignment" :contract="profile.current_contract" />

			<HrPanel :title="t('hr.profile.contacts')" icon="carbon:phone">
				<template #extra>
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
			</HrPanel>

			<HrPanel :title="t('hr.me.career')" icon="carbon:events">
				<n-data-table :columns="eventColumns" :data="events" :loading="eventsLoading" :bordered="false" size="small" :scroll-x="480">
					<template #empty>
						<span class="text-secondary">{{ t("hr.profile.career.empty") }}</span>
					</template>
				</n-data-table>
			</HrPanel>

			<HrPanel :title="t('hr.me.documents')" icon="carbon:document">
				<DocumentsTable :documents :loading="documentsLoading" :open="myDocumentLink" />
			</HrPanel>

			<HrPanel v-if="team.length" :title="t('hr.me.team')" icon="carbon:group">
				<n-data-table :columns="teamColumns" :data="team" :bordered="false" size="small" />
			</HrPanel>

			<PeopleListModal v-model:show="contactsVisible" kind="contacts" :contacts="profile.contacts" :save-contacts="replaceMyContacts" @saved="load" />
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { EmployeeDocument, MyEmploymentEvent, MyProfile, TeamMember } from "@/add-os/modules/hr/types/hr"
import type { LeaveBalance } from "@/add-os/modules/hr/types/leave"
import type { MyScheduleDay } from "@/add-os/modules/hr/types/time"
import { NAlert, NButton, NDataTable, NDescriptions, NDescriptionsItem, NSkeleton } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import PeopleListModal from "@/add-os/modules/hr/components/core/PeopleListModal.vue"
import DocumentsTable from "@/add-os/modules/hr/components/DocumentsTable.vue"
import EmployeeStatusTag from "@/add-os/modules/hr/components/EmployeeStatusTag.vue"
import JobDetails from "@/add-os/modules/hr/components/JobDetails.vue"
import EmployeeHero from "@/add-os/modules/hr/components/ui/EmployeeHero.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import HrStatCard from "@/add-os/modules/hr/components/ui/HrStatCard.vue"
import { useNarrowScreen } from "@/add-os/modules/hr/composables/useNarrowScreen"
import { employeeCell } from "@/add-os/modules/hr/utils/cells"
import { quietly } from "@/add-os/modules/hr/utils/errors"
import { leaveAmount, todayIso } from "@/add-os/modules/hr/utils/leave"
import { orgClock } from "@/add-os/modules/hr/utils/time"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { listMyApprovals } from "@/add-os/services/hr/approvals"
import { getMyProfile, listMyDocuments, listMyEvents, listMyTeam, myDocumentLink, replaceMyContacts } from "@/add-os/services/hr/core"
import { myLeaveBalances } from "@/add-os/services/hr/leave"
import { mySchedule } from "@/add-os/services/hr/time"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The signed-in employee's own file (hr/me): whoever they are — operations,
 * sales or the café — and whatever their dashboard role.
 */
defineProps<{ titleKey?: string }>()

const { t, te } = useI18n()
/** One column of details on a phone, two from `sm` up. */
const narrow = useNarrowScreen()
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

// ── At a glance: each figure from its own module, and simply left out if that module refuses ──
/** How many requests wait for this employee's decision: the inbox's total. */
const pendingApprovals = ref(0)
const pendingLoading = ref(true)
/** The first leave type kept against a balance — usually annual leave. */
const leaveCard = ref<LeaveBalance | null>(null)
const leaveLoading = ref(true)
const today = ref<MyScheduleDay | null>(null)
const todayLoading = ref(true)

async function loadPendingApprovals() {
	await quietly(
		() => listMyApprovals(1),
		page => (pendingApprovals.value = page.meta.total)
	)
	pendingLoading.value = false
}

async function loadGlance() {
	await Promise.all([
		quietly(myLeaveBalances, rows => (leaveCard.value = rows.find(b => b.tracks_balance) ?? null)),
		quietly(
			() => mySchedule(todayIso(), todayIso()),
			days => (today.value = days[0] ?? null)
		)
	])
	leaveLoading.value = false
	todayLoading.value = false
}

const todayLabel = computed(() => {
	if (!today.value) return none
	return today.value.shift ? translated(today.value.shift.name) : t(`hrAttendance.dayKind.${today.value.kind}`)
})
const todayHint = computed(() => {
	const shift = today.value?.shift
	return shift ? `${orgClock(shift.starts_at)} – ${orgClock(shift.ends_at)}` : t("hr.me.stats.todayHint")
})

onMounted(() => {
	void load()
	void loadDocuments()
	void loadEvents()
	void loadTeam()
	void loadPendingApprovals()
	void loadGlance()
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
		render: row => employeeCell(row)
	},
	{ title: t("hr.employees.columns.jobTitle"), key: "job_title", minWidth: 160, render: row => translated(row.job_title) || EMPTY },
	{ title: t("hr.employees.columns.unit"), key: "unit", minWidth: 140, render: row => translated(row.org_unit?.name) || EMPTY },
	{ title: t("hr.employees.columns.status"), key: "status", minWidth: 130, render: row => h(EmployeeStatusTag, { status: row.status }) }
])
</script>
