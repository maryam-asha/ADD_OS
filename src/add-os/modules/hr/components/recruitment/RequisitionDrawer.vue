<template>
	<HrDrawer v-model:show="show" :title="t('hrRecruitment.requisitions.detail')" size="lg">
		<div v-if="requisition" class="flex flex-col gap-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<span class="text-lg font-semibold">{{ translated(requisition.title) }}</span>
				<RecruitmentStatusTag kind="requisition" :status="requisition.status" />
			</div>
			<n-descriptions :column="1" label-placement="left" size="small" bordered>
				<n-descriptions-item :label="t('hr.employees.unitFilter')">{{ translated(requisition.org_unit?.name) || none }}</n-descriptions-item>
				<n-descriptions-item :label="t('hrRecruitment.requisitions.hiringManager')">{{ translated(requisition.hiring_manager?.name) || none }}</n-descriptions-item>
				<n-descriptions-item :label="t('hrRecruitment.requisitions.headcount')">
					<span class="add-numeric">{{ requisition.hired === undefined ? formatNumber(requisition.headcount) : t("hrRecruitment.requisitions.hiredOf", { hired: formatNumber(requisition.hired), n: formatNumber(requisition.headcount) }) }}</span>
				</n-descriptions-item>
				<n-descriptions-item :label="t('hrRecruitment.employmentType')">{{ t(`hr.employmentType.${requisition.employment_type}`) }}</n-descriptions-item>
				<n-descriptions-item :label="t('hrRecruitment.requisitions.reason')">{{ t(`hrRecruitment.reason.${requisition.reason}`) }}</n-descriptions-item>
				<n-descriptions-item v-if="budget" :label="t('hrRecruitment.requisitions.budget')">
					<span class="add-numeric">{{ budget }}</span>
				</n-descriptions-item>
				<n-descriptions-item :label="t('hrApprovals.summary.justification')">{{ requisition.justification || none }}</n-descriptions-item>
			</n-descriptions>
			<p v-if="requisition.status === 'pending'" class="text-sm text-secondary">{{ t("hrRecruitment.requisitions.decidedWhere") }}</p>

			<HrPanel :title="t('hrRecruitment.openings.title')" icon="carbon:document" flush class="add-ledger-table">
				<template v-if="mayManage && requisition.status === 'approved'" #extra>
					<n-button size="small" type="primary" @click="openingVisible = true">
						<template #icon><Icon name="carbon:add" :size="16" /></template>
						{{ t("hrRecruitment.openings.add") }}
					</n-button>
				</template>
				<n-data-table :columns :data="openings" :loading="openingsLoading" :bordered="false" :row-props size="small">
					<template #empty>
						<span class="text-secondary">{{ requisition.status === "approved" ? t("hrRecruitment.openings.noneYet") : t("hrRecruitment.openings.afterApproval") }}</span>
					</template>
				</n-data-table>
			</HrPanel>
		</div>

		<template v-if="requisition && mayManage && (canCancel || requisition.status === 'approved')" #footer>
			<div class="flex flex-wrap justify-end gap-2">
				<n-button v-if="requisition.status === 'approved'" :loading="busy === 'close'" @click="confirm('close')">{{ t("hrRecruitment.requisitions.close") }}</n-button>
				<n-button v-if="canCancel" type="error" secondary :loading="busy === 'cancel'" @click="confirm('cancel')">{{ t("hrRecruitment.requisitions.cancel") }}</n-button>
			</div>
		</template>

		<OpeningModal v-if="mayManage && requisition" v-model:show="openingVisible" :requisition-id="requisition.id" @saved="loadOpenings" />
	</HrDrawer>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { JobOpening, Requisition } from "@/add-os/modules/hr/types/recruitment"
import { NButton, NDataTable, NDescriptions, NDescriptionsItem, useDialog, useMessage } from "naive-ui"
import { computed, h, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import HrDrawer from "@/add-os/modules/hr/components/HrDrawer.vue"
import OpeningModal from "@/add-os/modules/hr/components/recruitment/OpeningModal.vue"
import RecruitmentStatusTag from "@/add-os/modules/hr/components/recruitment/RecruitmentStatusTag.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { money } from "@/add-os/modules/hr/utils/money"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { cancelRequisition, closeRequisition, listOpenings } from "@/add-os/services/hr/recruitment"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * One requisition: what it asks for and why, how many are hired against
 * it, and its job openings. Approved, it takes openings and can be closed;
 * pending, or approved with nobody hired yet, it can be cancelled.
 */
const props = defineProps<{ requisition: Requisition | null; mayManage: boolean }>()
const emit = defineEmits<{ changed: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const none = EMPTY

const openings = ref<JobOpening[]>([])
const openingsLoading = ref(false)
const openingVisible = ref(false)
const busy = ref<"cancel" | "close" | null>(null)

async function loadOpenings() {
	if (!props.requisition) return
	openingsLoading.value = true
	try {
		openings.value = (await listOpenings({ requisition_id: props.requisition.id })).data
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		openingsLoading.value = false
	}
}

watch(
	() => [show.value, props.requisition?.id] as const,
	([open]) => {
		if (open) void loadOpenings()
	}
)

const canCancel = computed(() => props.requisition?.status === "pending" || (props.requisition?.status === "approved" && !props.requisition.hired))

const budget = computed(() => {
	const r = props.requisition
	if (!r || !r.budget_currency || (r.budget_min === null && r.budget_max === null)) return ""
	return `${r.budget_min === null ? none : money(r.budget_min, r.budget_currency)} – ${r.budget_max === null ? none : money(r.budget_max, r.budget_currency)}`
})

function confirm(action: "cancel" | "close") {
	dialog.warning({
		title: t(`hrRecruitment.requisitions.${action}`),
		content: t(`hrRecruitment.requisitions.confirm.${action}`),
		positiveText: t(`hrRecruitment.requisitions.${action}`),
		negativeText: t("hr.common.back"),
		onPositiveClick: async () => {
			if (!props.requisition) return
			busy.value = action
			try {
				const result = action === "cancel" ? await cancelRequisition(props.requisition.id) : await closeRequisition(props.requisition.id)
				message.success(serverMessage(result, t("hrPayroll.run.done")))
				show.value = false
				emit("changed")
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			} finally {
				busy.value = null
			}
		}
	})
}

function rowProps(row: JobOpening) {
	return { class: "cursor-pointer", onClick: () => void router.push({ name: "hrTalent.hrJobOpening", params: { id: row.id } }) }
}

const columns = computed<DataTableColumns<JobOpening>>(() => [
	{ title: t("hrRecruitment.requisitions.title"), key: "title", minWidth: 160, render: row => translated(row.title) || translated(props.requisition?.title) },
	{ title: t("hrRecruitment.openings.visibility"), key: "visibility", minWidth: 100, render: row => t(`hrRecruitment.visibility.${row.visibility}`) },
	{ title: t("hrRecruitment.applications.title"), key: "applications_count", minWidth: 90, render: row => h("span", { class: "add-numeric" }, formatNumber(row.applications_count ?? 0)) },
	{ title: t("hr.common.status"), key: "status", minWidth: 100, render: row => h(RecruitmentStatusTag, { kind: "opening", status: row.status }) }
])
</script>
