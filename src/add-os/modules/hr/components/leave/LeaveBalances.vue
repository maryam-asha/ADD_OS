<!-- src/add-os/modules/hr/components/leave/LeaveBalances.vue -->
<template>
	<n-alert v-if="error" type="error" :title="t('hr.common.loadError')" />
	<n-skeleton v-else-if="loading" text :repeat="3" />
	<p v-else-if="!balances.length" class="text-secondary">{{ t("hrLeave.balances.empty") }}</p>
	<div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
		<n-card v-for="row in balances" :key="row.leave_type.id" size="small">
			<div class="flex flex-col gap-1">
				<span class="font-semibold">{{ translated(row.leave_type.name) }}</span>
				<template v-if="row.tracks_balance">
					<span class="add-numeric text-2xl font-bold">{{ leaveAmount(t, row.available, row.leave_type.unit) }}</span>
					<span class="text-sm text-secondary">{{ t("hrLeave.balances.available") }}</span>
					<span class="text-sm">
						{{ t("hrLeave.balances.detail", { balance: leaveAmount(t, row.balance, row.leave_type.unit), pending: leaveAmount(t, row.pending, row.leave_type.unit) }) }}
					</span>
					<span v-if="row.max_negative && Number(row.max_negative) > 0" class="text-sm text-secondary">
						{{ t("hrLeave.balances.maxNegative", { n: leaveAmount(t, row.max_negative, row.leave_type.unit) }) }}
					</span>
				</template>
				<template v-else>
					<span class="text-sm text-secondary">{{ t("hrLeave.balances.untracked") }}</span>
					<span v-if="Number(row.pending) > 0" class="text-sm">{{ t("hrLeave.balances.pendingOnly", { pending: leaveAmount(t, row.pending, row.leave_type.unit) }) }}</span>
				</template>
			</div>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { LeaveBalance } from "@/add-os/modules/hr/types/leave"
import { NAlert, NCard, NSkeleton } from "naive-ui"
import { useI18n } from "vue-i18n"
import { leaveAmount } from "@/add-os/modules/hr/utils/leave"
import { translated } from "@/add-os/modules/hr/utils/translated"

/** One card per leave type the employee can take: what is available now, what is booked, what waits. */
defineProps<{ balances: LeaveBalance[]; loading?: boolean; error?: boolean }>()

const { t } = useI18n()
</script>
