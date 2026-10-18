<!-- src/add-os/modules/hr/components/time/EmployeeAttendanceTab.vue -->
<template>
	<div class="flex flex-col gap-4">
		<HrPanel :title="t('hrAttendance.card.title')" icon="carbon:qr-code">
			<template v-if="mayManageCards && card" #extra>
				<div class="flex gap-2">
					<n-button v-if="card.has_card" size="small" type="error" secondary :loading="revoking" @click="confirmRevoke">
						{{ t("hrAttendance.card.revoke") }}
					</n-button>
					<n-button size="small" type="primary" :loading="issuing" @click="confirmIssue">
						<template #icon><Icon name="carbon:qr-code" :size="16" /></template>
						{{ card.has_card ? t("hrAttendance.card.reissue") : t("hrAttendance.card.issue") }}
					</n-button>
				</div>
			</template>
			<n-skeleton v-if="cardLoading" text :repeat="1" />
			<p v-else-if="card?.has_card">{{ t("hrAttendance.card.active", { date: card.issued_at ? formatDateTime(card.issued_at) : none }) }}</p>
			<p v-else class="text-secondary">{{ t("hrAttendance.card.none") }}</p>
		</HrPanel>

		<HrPanel :title="t('hrAttendance.punches.title')" icon="carbon:fingerprint-recognition">
			<template #extra>
				<n-button v-if="mayCorrect" size="small" @click="punchVisible = true">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrAttendance.punches.add") }}
				</n-button>
			</template>
			<div class="mb-3">
				<n-date-picker v-model:formatted-value="range" value-format="yyyy-MM-dd" type="daterange" :clearable="false" class="max-w-sm" />
			</div>
			<n-alert v-if="punchesError" type="error" :title="punchesError" class="mb-3" />
			<n-data-table :columns :data="punches" :loading="punchesLoading" :bordered="false" size="small" :scroll-x="640">
				<template #empty>
					<span class="text-secondary">{{ t("hrAttendance.punches.empty") }}</span>
				</template>
			</n-data-table>
		</HrPanel>

		<HrFormModal v-model:show="qrVisible" :title="t('hrAttendance.card.printTitle')" size="sm" icon="carbon:qr-code" @after-leave="qrValue = null">
			<div class="add-print-page flex flex-col items-center gap-4 p-4">
				<span class="text-lg font-semibold">{{ employeeName }}</span>
				<n-qr-code v-if="qrValue" :value="qrValue" :size="220" error-correction-level="M" />
				<p class="text-center text-sm text-secondary print:hidden">{{ t("hrAttendance.card.printHint") }}</p>
			</div>
			<template #footer>
				<div class="flex justify-end gap-2 print:hidden">
					<n-button @click="qrVisible = false">{{ t("hr.common.cancel") }}</n-button>
					<n-button type="primary" @click="print">
						<template #icon><Icon name="carbon:printer" :size="16" /></template>
						{{ t("hr.certificate.print") }}
					</n-button>
				</div>
			</template>
		</HrFormModal>

		<HrFormModal v-model:show="punchVisible" :title="t('hrAttendance.punches.add')" size="sm" icon="carbon:fingerprint-recognition">
			<p class="mb-3 text-sm text-secondary">{{ t("hrAttendance.punches.addHint") }}</p>
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item :label="t('hrAttendance.days.date')">
					<n-date-picker v-model:formatted-value="punchDate" value-format="yyyy-MM-dd" type="date" class="w-full" />
				</n-form-item>
				<n-form-item :label="t('hrAttendance.punches.time')">
					<n-time-picker v-model:formatted-value="punchTime" value-format="HH:mm" format="hh:mm a" use-12-hours class="w-full" />
				</n-form-item>
			</div>
			<n-form-item :label="t('hrAttendance.punches.reason')">
				<n-input v-model:value="punchReason" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" :maxlength="500" />
			</n-form-item>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="punchVisible = false">{{ t("hr.common.cancel") }}</n-button>
					<n-button type="primary" :disabled="!punchDate || !punchTime || !punchReason.trim()" :loading="punchSaving" @click="addPunch">
						{{ t("hrAttendance.punches.save") }}
					</n-button>
				</div>
			</template>
		</HrFormModal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { AttendanceCardStatus, Punch } from "@/add-os/modules/hr/types/time"
import { NAlert, NButton, NDataTable, NDatePicker, NFormItem, NInput, NQrCode, NSkeleton, NTimePicker, useDialog, useMessage } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canCorrectAttendance, canManageAttendanceCards } from "@/add-os/config/permissions"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { addDays, orgClock, orgDate } from "@/add-os/modules/hr/utils/time"
import { EMPTY } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { addManualPunch, getAttendanceCard, issueAttendanceCard, listPunches, revokeAttendanceCard } from "@/add-os/services/hr/time"
import { formatDate, formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * An employee's attendance on their file: their staff card — the QR the
 * kiosk scans — and their raw punches. A card's value is shown once, when
 * issued, to print; issuing again revokes the old card. HR adds a punch the
 * employee missed with a reason, which is audited.
 */
const props = defineProps<{ employeeId: number; employeeName: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const mayManageCards = canManageAttendanceCards()
const mayCorrect = canCorrectAttendance()
const none = EMPTY

// ── Card ────────────────────────────────────────────────────────────────────
const card = ref<AttendanceCardStatus | null>(null)
const cardLoading = ref(true)
const issuing = ref(false)
const revoking = ref(false)
const qrVisible = ref(false)
/** The card's value: kept only while its print dialog is open. */
const qrValue = ref<string | null>(null)

async function loadCard() {
	try {
		card.value = await getAttendanceCard(props.employeeId)
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		cardLoading.value = false
	}
}

function confirmIssue() {
	if (!card.value?.has_card) return issue()
	dialog.warning({
		title: t("hrAttendance.card.reissue"),
		content: t("hrAttendance.card.reissueConfirm"),
		positiveText: t("hrAttendance.card.reissue"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: issue
	})
}

async function issue() {
	issuing.value = true
	try {
		qrValue.value = await issueAttendanceCard(props.employeeId)
		qrVisible.value = true
		message.success(t("hrAttendance.card.issued"))
		await loadCard()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		issuing.value = false
	}
}

function confirmRevoke() {
	dialog.warning({
		title: t("hrAttendance.card.revoke"),
		content: t("hrAttendance.card.revokeConfirm"),
		positiveText: t("hrAttendance.card.revoke"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			revoking.value = true
			try {
				await revokeAttendanceCard(props.employeeId)
				message.success(t("hrAttendance.card.revoked"))
				await loadCard()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			} finally {
				revoking.value = false
			}
		}
	})
}

function print() {
	window.print()
}

// ── Punches ─────────────────────────────────────────────────────────────────
const range = ref<[string, string]>([addDays(todayIso(), -6), todayIso()])
const punches = ref<Punch[]>([])
const punchesLoading = ref(true)
const punchesError = ref("")

async function loadPunches() {
	punchesLoading.value = true
	punchesError.value = ""
	try {
		punches.value = await listPunches(props.employeeId, range.value[0], range.value[1])
	} catch (e) {
		punchesError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		punchesLoading.value = false
	}
}

onMounted(() => {
	void loadCard()
	void loadPunches()
})
watch(range, loadPunches)

const columns = computed<DataTableColumns<Punch>>(() => [
	{ title: t("hrAttendance.days.date"), key: "date", minWidth: 110, render: row => formatDate(orgDate(row.punched_at) ?? row.punched_at) },
	{ title: t("hrAttendance.punches.time"), key: "punched_at", minWidth: 90, render: row => orgClock(row.punched_at) },
	{ title: t("hrAttendance.punches.source"), key: "source", minWidth: 120, render: row => t(`hrAttendance.punchSource.${row.source}`) },
	{ title: t("hrAttendance.punches.reason"), key: "reason", minWidth: 200, ellipsis: { tooltip: true }, render: row => row.reason || EMPTY }
])

const punchVisible = ref(false)
const punchDate = ref<string | null>(todayIso())
const punchTime = ref<string | null>(null)
const punchReason = ref("")
const punchSaving = ref(false)

/** The organisation's wall clock, as the API reads `punched_at`. */
async function addPunch() {
	if (!punchDate.value || !punchTime.value) return
	punchSaving.value = true
	try {
		await addManualPunch(props.employeeId, `${punchDate.value} ${punchTime.value}`, punchReason.value.trim())
		message.success(t("hrAttendance.punches.saved"))
		punchVisible.value = false
		punchTime.value = null
		punchReason.value = ""
		await loadPunches()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		punchSaving.value = false
	}
}
</script>
