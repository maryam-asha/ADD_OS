<!-- src/add-os/modules/hr/components/leave/LeaveBalances.vue -->
<template>
	<n-alert v-if="error" type="error" :title="t('hr.common.loadError')" />
	<div v-else-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<HrStatCard v-for="n in 2" :key="n" :label="t('hrLeave.balances.available')" value="" icon="carbon:calendar" loading />
	</div>
	<p v-else-if="!balances.length" class="text-secondary">{{ t("hrLeave.balances.empty") }}</p>
	<div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<HrStatCard
			v-for="row in balances"
			:key="row.leave_type.id"
			:label="translated(row.leave_type.name)"
			:value="row.tracks_balance ? leaveAmount(t, row.available, row.leave_type.unit) : t('hrLeave.balances.untrackedShort')"
			:icon="row.leave_type.unit === 'hour' ? 'carbon:time' : 'carbon:calendar'"
		>
			<div class="flex flex-col gap-0.5">
				<template v-if="row.tracks_balance">
					<span class="text-secondary">
						{{ t("hrLeave.balances.detail", { balance: leaveAmount(t, row.balance, row.leave_type.unit), pending: leaveAmount(t, row.pending, row.leave_type.unit) }) }}
					</span>
					<span v-if="row.max_negative && Number(row.max_negative) > 0" class="text-secondary">
						{{ t("hrLeave.balances.maxNegative", { n: leaveAmount(t, row.max_negative, row.leave_type.unit) }) }}
					</span>
				</template>
				<template v-else>
					<span class="text-secondary">{{ t("hrLeave.balances.untracked") }}</span>
					<span v-if="Number(row.pending) > 0" class="text-secondary">{{ t("hrLeave.balances.pendingOnly", { pending: leaveAmount(t, row.pending, row.leave_type.unit) }) }}</span>
				</template>
			</div>
		</HrStatCard>
	</div>
</template>

<script setup lang="ts">
import type { LeaveBalance } from "@/add-os/modules/hr/types/leave"
import { NAlert } from "naive-ui"
import { useI18n } from "vue-i18n"
import HrStatCard from "@/add-os/modules/hr/components/ui/HrStatCard.vue"
import { leaveAmount } from "@/add-os/modules/hr/utils/leave"
import { translated } from "@/add-os/modules/hr/utils/translated"

/** One card per leave type the employee can take: what is available now, what is booked, what waits. */
defineProps<{ balances: LeaveBalance[]; loading?: boolean; error?: boolean }>()

const { t } = useI18n()
</script>
