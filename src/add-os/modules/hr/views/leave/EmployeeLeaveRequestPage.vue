<!-- src/add-os/modules/hr/views/leave/EmployeeLeaveRequestPage.vue -->
<template>
	<HrFormPage
		:title="t('nav.pages.employeeLeaveRequest')"
		:description="employee ? translated(employee.name) : undefined"
		:eyebrow="t('nav.pages.employees')"
		:back-to
		:back-label="t('hr.editEmployee.backToProfile')"
		:loading
		:error="loadError ? t('hr.common.loadError') : null"
	>
		<HrPanel :title="t('hrLeave.request.details')" :subtitle="t('hrLeave.request.forEmployeeHint')" icon="carbon:calendar-add">
			<p v-if="!requestTypes.length" class="text-secondary">{{ t("hrLeave.balances.empty") }}</p>
			<LeaveRequestForm v-else ref="formRef" :types="requestTypes" :submit="payload => submitLeaveForEmployee(id, payload)" @submitted="leave" />
		</HrPanel>

		<template #aside>
			<HrPanel :title="t('hrLeave.request.balances')" icon="carbon:chart-bar">
				<LeaveBalances :balances />
			</HrPanel>
		</template>

		<template #actions>
			<n-button @click="leave">{{ t("hr.common.cancel") }}</n-button>
			<n-button type="primary" :loading="formRef?.submitting" :disabled="!formRef?.ready" @click="formRef?.send()">
				<template #icon><Icon name="carbon:send" :size="16" /></template>
				{{ t("hrLeave.request.submit") }}
			</n-button>
		</template>
	</HrFormPage>
</template>

<script setup lang="ts">
import type { LeaveTypeChoice } from "@/add-os/modules/hr/components/leave/LeaveRequestForm.vue"
import type { Employee } from "@/add-os/modules/hr/types/hr"
import type { LeaveBalance, LeaveType } from "@/add-os/modules/hr/types/leave"
import { NButton } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import LeaveBalances from "@/add-os/modules/hr/components/leave/LeaveBalances.vue"
import LeaveRequestForm from "@/add-os/modules/hr/components/leave/LeaveRequestForm.vue"
import HrFormPage from "@/add-os/modules/hr/components/ui/HrFormPage.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { getEmployee } from "@/add-os/services/hr/core"
import { employeeLeaveBalances, listLeaveTypes, submitLeaveForEmployee } from "@/add-os/services/hr/leave"
import Icon from "@/components/common/Icon.vue"

/**
 * A leave request HR files for an employee (hr.leave.manage), on a page of
 * its own under the employee's file. There is no preview endpoint for HR,
 * so the server's answer on submit is the check; the request still goes
 * through the employee's approval flow. Their balances sit beside the form.
 * Sent or cancelled, it returns to the file on its leave tab.
 */
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const id = Number(route.params.id)
const backTo = { name: "hr.employeeProfile", params: { id }, query: { tab: "leave" } }

const formRef = ref<InstanceType<typeof LeaveRequestForm> | null>(null)
const employee = ref<Employee | null>(null)
const balances = ref<LeaveBalance[]>([])
const types = ref<LeaveType[]>([])
const loading = ref(true)
const loadError = ref(false)

onMounted(async () => {
	try {
		;[employee.value, balances.value, types.value] = await Promise.all([getEmployee(id), employeeLeaveBalances(id), listLeaveTypes()])
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
		loadError.value = true
	} finally {
		loading.value = false
	}
})

/** The types this employee can take, with what the settings know about each. */
const requestTypes = computed<LeaveTypeChoice[]>(() =>
	balances.value.map(b => {
		const full = types.value.find(type => type.id === b.leave_type.id)
		return { ...b.leave_type, allows_half_day: full?.allows_half_day, requires_attachment: full?.requires_attachment }
	})
)

function leave() {
	void router.push(backTo)
}
</script>
