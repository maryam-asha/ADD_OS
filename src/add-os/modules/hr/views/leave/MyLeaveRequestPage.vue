<!-- src/add-os/modules/hr/views/leave/MyLeaveRequestPage.vue -->
<template>
	<HrFormPage
		:title="t('hrLeave.me.request')"
		:description="t('hrLeave.request.pageDescription')"
		:eyebrow="t('nav.pages.hrMyLeave')"
		:back-to="{ name: 'myHr.hrMyLeave' }"
		:back-label="t('hrLeave.request.backToMyLeave')"
		:loading
		:error="loadError ? t('hr.common.loadError') : null"
	>
		<HrPanel :title="t('hrLeave.request.details')" icon="carbon:calendar-add">
			<p v-if="!types.length" class="text-secondary">{{ t("hrLeave.balances.empty") }}</p>
			<LeaveRequestForm v-else ref="formRef" :types :submit="submitMyLeave" :quote="quoteMyLeave" @submitted="leave" />
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
import type { LeaveBalance, LeaveTypeRef } from "@/add-os/modules/hr/types/leave"
import { NButton } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import LeaveBalances from "@/add-os/modules/hr/components/leave/LeaveBalances.vue"
import LeaveRequestForm from "@/add-os/modules/hr/components/leave/LeaveRequestForm.vue"
import HrFormPage from "@/add-os/modules/hr/components/ui/HrFormPage.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { ApiError } from "@/add-os/services/api"
import { myLeaveBalances, quoteMyLeave, submitMyLeave } from "@/add-os/services/hr/leave"
import Icon from "@/components/common/Icon.vue"

/**
 * The signed-in employee's own leave request, on a page of its own: the
 * form on one side, previewing what the request takes as it is filled in,
 * and what they have to take it from on the other. The types they may
 * request are the ones their balances list. Sent, it goes to their
 * approval flow and the page returns to My leave.
 */
const { t } = useI18n()
const router = useRouter()

const formRef = ref<InstanceType<typeof LeaveRequestForm> | null>(null)
const balances = ref<LeaveBalance[]>([])
const loading = ref(true)
const loadError = ref(false)

const types = computed<LeaveTypeRef[]>(() => balances.value.map(b => b.leave_type))

onMounted(async () => {
	try {
		balances.value = await myLeaveBalances()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
		loadError.value = true
	} finally {
		loading.value = false
	}
})

function leave() {
	void router.push({ name: "myHr.hrMyLeave" })
}
</script>
