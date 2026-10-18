<!-- src/add-os/modules/hr/components/approvals/ApprovalStepsList.vue -->
<template>
	<ol class="flex flex-col gap-3">
		<li v-for="step in steps" :key="step.sort" class="flex flex-col gap-1 rounded-lg border border-[var(--add-border)] p-3">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<span class="font-semibold">{{ t("hrApprovals.step", { n: formatNumber(step.sort) }) }} · {{ approverLabel(step) }}</span>
				<ApprovalStatusTag :status="step.status" kind="step" />
			</div>
			<p v-if="step.decided_at" class="text-sm text-secondary">
				{{ t(`hrApprovals.decidedVia.${step.decided_via ?? "approver"}`) }} · {{ formatDateTime(step.decided_at) }}
			</p>
			<p v-else-if="step.status === 'pending' && step.due_at" class="text-sm text-secondary">
				{{ t("hrApprovals.dueAt", { date: formatDateTime(step.due_at) }) }}
				<template v-if="step.escalated_at"> · {{ t("hrApprovals.escalatedAt", { date: formatDateTime(step.escalated_at) }) }}</template>
			</p>
			<p v-if="step.comment" class="text-sm">{{ step.comment }}</p>
		</li>
	</ol>
</template>

<script setup lang="ts">
import type { ApprovalStep } from "@/add-os/modules/hr/types/approvals"
import { useI18n } from "vue-i18n"
import ApprovalStatusTag from "@/add-os/modules/hr/components/approvals/ApprovalStatusTag.vue"
import { abilityLabel } from "@/add-os/modules/hr/utils/approvalLabels"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { formatDateTime, formatNumber } from "@/add-os/utils/format"

/** A request's steps in order: who each waits for, what was decided, how, and by when. */
defineProps<{ steps: ApprovalStep[] }>()

const { t } = useI18n()

/** A resolved approver by name; a step that asks for an ability (or fell back to one) by that ability. */
function approverLabel(step: ApprovalStep): string {
	if (step.approver_employee) return `${t(`hrApprovals.approverType.${step.approver_type}`)}: ${translated(step.approver_employee.name)}`
	if (step.approver_ability) return t("hrApprovals.anyoneWith", { ability: abilityLabel(t, step.approver_ability) })
	return t(`hrApprovals.approverType.${step.approver_type}`)
}
</script>
