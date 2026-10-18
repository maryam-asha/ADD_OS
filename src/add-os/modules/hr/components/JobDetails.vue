<!-- src/add-os/modules/hr/components/JobDetails.vue -->
<template>
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<n-card :title="t('hr.profile.job')" size="small">
			<n-descriptions v-if="assignment" :column="1" label-placement="left" size="small">
				<n-descriptions-item :label="t('hr.profile.fields.jobTitle')">{{ translated(assignment.job_title) || none }}</n-descriptions-item>
				<n-descriptions-item :label="t('hr.profile.fields.orgUnit')">{{ translated(assignment.org_unit?.name) || none }}</n-descriptions-item>
				<n-descriptions-item :label="t('hr.profile.fields.position')">{{ translated(assignment.position?.title) || none }}</n-descriptions-item>
				<n-descriptions-item :label="t('hr.profile.fields.jobGrade')">
					{{ assignment.job_grade ? `${assignment.job_grade.code} · ${translated(assignment.job_grade.name)}` : none }}
				</n-descriptions-item>
				<n-descriptions-item :label="t('hr.profile.fields.manager')">{{ translated(assignment.manager?.name) || none }}</n-descriptions-item>
				<n-descriptions-item :label="t('hr.profile.fields.workLocation')">{{ translated(assignment.work_location?.name) || none }}</n-descriptions-item>
				<n-descriptions-item :label="t('hr.profile.fields.employmentType')">{{ t(`hr.employmentType.${assignment.employment_type}`) }}</n-descriptions-item>
				<n-descriptions-item :label="t('hr.profile.fields.workMode')">{{ t(`hr.workMode.${assignment.work_mode}`) }}</n-descriptions-item>
			</n-descriptions>
			<p v-else class="text-secondary">{{ t("hr.profile.noAssignment") }}</p>
		</n-card>

		<n-card :title="t('hr.profile.contract')" size="small">
			<n-descriptions v-if="contract" :column="1" label-placement="left" size="small">
				<n-descriptions-item :label="t('hr.profile.fields.contractType')">{{ t(`hr.contractType.${contract.type}`) }}</n-descriptions-item>
				<n-descriptions-item :label="t('hr.profile.fields.startsOn')">{{ formatDate(contract.starts_on) }}</n-descriptions-item>
				<n-descriptions-item :label="t('hr.profile.fields.endsOn')">{{ contract.ends_on ? formatDate(contract.ends_on) : none }}</n-descriptions-item>
				<n-descriptions-item :label="t('hr.profile.fields.noticePeriod')">
					{{ contract.notice_period_days ? t("hr.profile.fields.noticeDays", { n: formatNumber(contract.notice_period_days) }, contract.notice_period_days) : none }}
				</n-descriptions-item>
			</n-descriptions>
			<p v-else class="text-secondary">{{ t("hr.profile.noContract") }}</p>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { Assignment, Contract } from "@/add-os/modules/hr/types/hr"
import { NCard, NDescriptions, NDescriptionsItem } from "naive-ui"
import { useI18n } from "vue-i18n"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { formatDate, formatNumber } from "@/add-os/utils/format"

/** The current job and contract, shared by the employee profile and My HR. */
defineProps<{ assignment: Assignment | null; contract: Contract | null }>()

const { t } = useI18n()
const none = EMPTY
</script>
