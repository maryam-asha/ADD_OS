<!-- src/add-os/modules/hr/components/leave/EmployeeLeaveTab.vue -->
<template>
	<div class="flex flex-col gap-4">
		<div v-if="mayManage" class="flex flex-wrap justify-end gap-2">
			<n-button :disabled="!trackedTypes.length" @click="adjustVisible = true">
				<template #icon><Icon name="carbon:calculator" :size="16" /></template>
				{{ t("hrLeave.adjust.title") }}
			</n-button>
			<n-button type="primary" @click="requestVisible = true">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("hrLeave.profile.requestFor") }}
			</n-button>
		</div>

		<LeaveBalances :balances :loading :error />

		<n-card :title="t('hrLeave.me.tabs.ledger')" size="small">
			<LeaveLedgerTable ref="ledger" :load="loadLedger" :types="allTypes" />
		</n-card>

		<template v-if="mayManage">
			<AdjustBalanceModal v-model:show="adjustVisible" :employee-id :types="trackedTypes" @saved="reload" />
			<LeaveRequestDrawer
				v-model:show="requestVisible"
				:types="requestTypes"
				:title="t('hrLeave.profile.requestFor')"
				:submit="payload => submitLeaveForEmployee(employeeId, payload)"
				@submitted="reload"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { LeaveTypeChoice } from "@/add-os/modules/hr/components/leave/LeaveRequestDrawer.vue"
import type { LeaveBalance, LeaveType, LeaveTypeRef } from "@/add-os/modules/hr/types/leave"
import { NButton, NCard } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageLeave } from "@/add-os/config/permissions"
import AdjustBalanceModal from "@/add-os/modules/hr/components/leave/AdjustBalanceModal.vue"
import LeaveBalances from "@/add-os/modules/hr/components/leave/LeaveBalances.vue"
import LeaveLedgerTable from "@/add-os/modules/hr/components/leave/LeaveLedgerTable.vue"
import LeaveRequestDrawer from "@/add-os/modules/hr/components/leave/LeaveRequestDrawer.vue"
import { ApiError } from "@/add-os/services/api"
import { employeeLeaveBalances, employeeLeaveLedger, listLeaveTypes, submitLeaveForEmployee } from "@/add-os/services/hr/leave"
import Icon from "@/components/common/Icon.vue"

/**
 * An employee's leave on their file: balances and ledger (hr.leave.view),
 * and — with hr.leave.manage — a balance adjustment or a request filed for
 * them, which still goes through their approval flow.
 */
const props = defineProps<{ employeeId: number }>()

const { t } = useI18n()
const mayManage = canManageLeave()

const balances = ref<LeaveBalance[]>([])
const types = ref<LeaveType[]>([])
const loading = ref(true)
const error = ref(false)
const adjustVisible = ref(false)
const requestVisible = ref(false)
const ledger = ref<InstanceType<typeof LeaveLedgerTable> | null>(null)

async function loadBalances() {
	error.value = false
	try {
		balances.value = await employeeLeaveBalances(props.employeeId)
	} catch (e) {
		error.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

onMounted(async () => {
	void loadBalances()
	try {
		types.value = await listLeaveTypes()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
})

async function reload() {
	await Promise.all([loadBalances(), ledger.value?.reload()])
}

const loadLedger = (filters: { page: number; leave_type_id: number | null }) => employeeLeaveLedger(props.employeeId, filters)

/** Every type, so the ledger names entries of a type no longer active. */
const allTypes = computed<LeaveTypeRef[]>(() => (types.value.length ? types.value : balances.value.map(b => b.leave_type)))
const trackedTypes = computed<LeaveTypeRef[]>(() => types.value.filter(type => type.tracks_balance))
/** The types this employee can take, with what the settings know about each. */
const requestTypes = computed<LeaveTypeChoice[]>(() =>
	balances.value.map(b => {
		const full = types.value.find(type => type.id === b.leave_type.id)
		return { ...b.leave_type, allows_half_day: full?.allows_half_day, requires_attachment: full?.requires_attachment }
	})
)
</script>
