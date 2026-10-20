<!-- src/add-os/modules/hr/views/training/TrainingSessionPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div>
			<n-button text @click="router.push({ name: 'hrTalent.hrTrainingSessions' })">
				<template #icon><Icon name="carbon:arrow-left" :size="16" class="rtl:rotate-180" /></template>
				{{ t("hr.common.back") }}
			</n-button>
		</div>

		<n-alert v-if="notFound" type="warning" :title="t('hrTraining.sessions.notFound')" />
		<n-alert v-else-if="loadError" type="error" :title="loadError" />
		<n-skeleton v-else-if="!session" text :repeat="6" />

		<template v-else>
			<HrPageHeader :title="courseLabel(session.course)" :description="sessionPeriod(session)">
				<template #actions>
					<div class="flex flex-wrap items-center gap-2">
						<TrainingStatusTag kind="session" :status="session.status" />
						<template v-if="mayManage && scheduled">
							<n-button @click="editVisible = true">
								<template #icon><Icon name="carbon:edit" :size="16" /></template>
								{{ t("hr.common.edit") }}
							</n-button>
							<n-button :disabled="full" :title="full ? t('hrTraining.sessions.full') : undefined" @click="enrollVisible = true">
								<template #icon><Icon name="carbon:user-follow" :size="16" /></template>
								{{ t("hrTraining.enroll.title") }}
							</n-button>
							<n-button type="primary" :disabled="!ended" :title="ended ? undefined : t('hrTraining.complete.afterEnd')" @click="completeVisible = true">
								<template #icon><Icon name="carbon:checkmark-outline" :size="16" /></template>
								{{ t("hrTraining.complete.title") }}
							</n-button>
							<n-button type="error" secondary :loading="busy" @click="confirmCancel">
								<template #icon><Icon name="carbon:close-outline" :size="16" /></template>
								{{ t("hrTraining.sessions.cancel") }}
							</n-button>
						</template>
					</div>
				</template>
			</HrPageHeader>

			<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<HrStatCard :label="t('hrTraining.sessions.seats')" :value="seatsLabel(session)" icon="carbon:user-multiple" :hint="session.capacity === null ? t('hrTraining.sessions.noLimit') : undefined" />
				<HrStatCard :label="t('hrTraining.sessions.location')" :value="session.location || EMPTY" icon="carbon:location" />
				<HrStatCard :label="t('hrTraining.sessions.trainer')" :value="session.trainer || EMPTY" icon="carbon:user" />
				<HrStatCard :label="t('hrTraining.sessions.selfEnrollmentShort')" :value="session.self_enrollment ? t('hr.common.yes') : t('hr.common.no')" icon="carbon:user-access" />
			</div>
			<n-alert v-if="certification" type="info" :title="t('hrTraining.sessions.grants', { name: certification })" />

			<HrPanel :title="t('hrTraining.enrollments.title')" icon="carbon:user-multiple" flush class="add-ledger-table">
				<n-data-table :columns :data="enrollments" :loading="enrollmentsLoading" :bordered="false" size="small" :scroll-x="640">
					<template #empty>
						<span class="text-secondary">{{ t("hrTraining.enrollments.empty") }}</span>
					</template>
				</n-data-table>
			</HrPanel>

			<template v-if="mayManage">
				<SessionModal v-model:show="editVisible" :session :courses="[]" @saved="reloadAll" />
				<EnrollModal v-model:show="enrollVisible" :session-id="session.id" :seats-left @enrolled="reloadAll" />
				<CompleteSessionModal v-model:show="completeVisible" :session-id="session.id" :enrollments :certifies="!!certification" @completed="reloadAll" />
			</template>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Course, Enrollment, TrainingSession } from "@/add-os/modules/hr/types/training"
import { NAlert, NButton, NDataTable, NSkeleton, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import { canManageTraining } from "@/add-os/config/permissions"
import CompleteSessionModal from "@/add-os/modules/hr/components/training/CompleteSessionModal.vue"
import EnrollModal from "@/add-os/modules/hr/components/training/EnrollModal.vue"
import SessionModal from "@/add-os/modules/hr/components/training/SessionModal.vue"
import TrainingStatusTag from "@/add-os/modules/hr/components/training/TrainingStatusTag.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import HrStatCard from "@/add-os/modules/hr/components/ui/HrStatCard.vue"
import { employeeCell } from "@/add-os/modules/hr/utils/cells"
import { apiErrorMessage, quietly, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { canCancelEnrollment, courseLabel, hasEnded, isFull, seatsLabel, sessionPeriod } from "@/add-os/modules/hr/utils/training"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { cancelEnrollment, cancelSession, getCourse, getSession, listSessionEnrollments } from "@/add-os/services/hr/training"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * One training session: its seats, place and trainer, and everyone
 * enrolled. While scheduled HR edits it, enrolls employees, cancels one
 * enrollment or the whole session (those enrolled are told), and — once
 * its last day has come — completes it, marking who did not come and
 * scoring the rest; a certifying course grants its certification then.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const mayManage = canManageTraining()
const today = todayIso()

const sessionId = computed(() => Number(route.params.id))
const session = ref<TrainingSession | null>(null)
const course = ref<Course | null>(null)
const loadError = ref("")
const notFound = ref(false)
const busy = ref(false)
const editVisible = ref(false)
const enrollVisible = ref(false)
const completeVisible = ref(false)

const scheduled = computed(() => session.value?.status === "scheduled")
const ended = computed(() => !!session.value && hasEnded(session.value, today))
const full = computed(() => !!session.value && isFull(session.value))
const seatsLeft = computed(() => (session.value && session.value.capacity !== null ? session.value.capacity - (session.value.seats_taken ?? 0) : null))
const certification = computed(() => translated(course.value?.certification_name) || "")

async function loadSession() {
	try {
		session.value = await getSession(sessionId.value)
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) notFound.value = true
		else loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	}
}

// ── Enrollments ─────────────────────────────────────────────────────────────
const enrollments = ref<Enrollment[]>([])
const enrollmentsLoading = ref(false)

async function loadEnrollments() {
	enrollmentsLoading.value = true
	try {
		enrollments.value = await listSessionEnrollments(sessionId.value)
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		enrollmentsLoading.value = false
	}
}

async function reloadAll() {
	await loadSession()
	await loadEnrollments()
}

onMounted(async () => {
	await reloadAll()
	const courseId = session.value?.course?.id
	if (courseId) void quietly(() => getCourse(courseId), c => (course.value = c))
})

function confirmCancel() {
	dialog.warning({
		title: t("hrTraining.sessions.cancel"),
		content: t("hrTraining.sessions.cancelConfirm", { n: formatNumber(enrollments.value.filter(e => e.status === "enrolled").length) }),
		positiveText: t("hrTraining.sessions.cancelYes"),
		negativeText: t("hr.common.back"),
		onPositiveClick: async () => {
			busy.value = true
			try {
				message.success(serverMessage(await cancelSession(sessionId.value), t("hrTraining.sessions.cancelled")))
				await reloadAll()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			} finally {
				busy.value = false
			}
		}
	})
}

function confirmCancelEnrollment(enrollment: Enrollment) {
	dialog.warning({
		title: t("hrTraining.enrollments.cancel"),
		content: t("hrTraining.enrollments.cancelConfirm", { name: translated(enrollment.employee?.name) }),
		positiveText: t("hrTraining.enrollments.cancel"),
		negativeText: t("hr.common.back"),
		onPositiveClick: async () => {
			try {
				message.success(serverMessage(await cancelEnrollment(enrollment.id), t("hrTraining.enrollments.cancelled")))
				await reloadAll()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

const columns = computed<DataTableColumns<Enrollment>>(() => [
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 200, render: row => employeeCell(row.employee) },
	{ title: t("hr.common.status"), key: "status", minWidth: 110, render: row => h(TrainingStatusTag, { kind: "enrollment", status: row.status }) },
	{ title: t("hrTraining.enrollments.completedOn"), key: "completed_on", minWidth: 110, render: row => (row.completed_on ? formatDate(row.completed_on) : EMPTY) },
	{ title: t("hrTraining.complete.score"), key: "score", minWidth: 80, render: row => h("span", { class: "add-numeric", dir: "ltr" }, row.score === null ? EMPTY : formatNumber(row.score)) },
	...(mayManage
		? [
				{
					title: "",
					key: "actions",
					width: 110,
					render: (row: Enrollment) =>
						session.value && canCancelEnrollment(row, session.value)
							? h(NButton, { size: "tiny", type: "error", secondary: true, onClick: () => confirmCancelEnrollment(row) }, () => t("hrTraining.enrollments.cancel"))
							: null
				}
			]
		: [])
])
</script>
