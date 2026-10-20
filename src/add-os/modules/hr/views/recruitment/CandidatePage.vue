<!-- src/add-os/modules/hr/views/recruitment/CandidatePage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div>
			<n-button text @click="router.push({ name: 'hrTalent.hrCandidates' })">
				<template #icon><Icon name="carbon:arrow-left" :size="16" class="rtl:rotate-180" /></template>
				{{ t("hr.common.back") }}
			</n-button>
		</div>

		<n-alert v-if="notFound" type="warning" :title="t('hrRecruitment.candidates.notFound')" />
		<n-alert v-else-if="loadError" type="error" :title="loadError" />
		<n-skeleton v-else-if="!candidate" text :repeat="5" />

		<template v-else>
			<HrPageHeader :title="candidate.name" :eyebrow="t(`hrRecruitment.source.${candidate.source}`)" :description="consentText">
				<template v-if="mayManage" #actions>
					<div class="flex flex-wrap gap-2">
						<n-button @click="editVisible = true">
							<template #icon><Icon name="carbon:edit" :size="16" /></template>
							{{ t("hr.common.edit") }}
						</n-button>
						<n-button type="error" secondary @click="confirmErase">
							<template #icon><Icon name="carbon:trash-can" :size="16" /></template>
							{{ t("hrRecruitment.candidates.erase") }}
						</n-button>
					</div>
				</template>
			</HrPageHeader>

			<HrPanel :title="t('hrRecruitment.applications.details')" icon="carbon:user">
				<n-descriptions :column="narrow ? 1 : 2" label-placement="left" size="small">
					<n-descriptions-item :label="t('hr.profile.fields.personalEmail')">
						<span dir="ltr">{{ candidate.email ?? none }}</span>
					</n-descriptions-item>
					<n-descriptions-item :label="t('hr.profile.fields.phone')">
						<span dir="ltr">{{ candidate.phone ?? none }}</span>
					</n-descriptions-item>
				</n-descriptions>
				<p v-if="candidate.notes" class="mt-3 whitespace-pre-line text-sm">{{ candidate.notes }}</p>
			</HrPanel>

			<HrPanel :title="t('hrRecruitment.applications.title')" icon="carbon:document" flush class="add-ledger-table">
				<n-data-table :columns :data="candidate.applications ?? []" :bordered="false" :row-props size="small" :scroll-x="560" />
			</HrPanel>

			<HrFormModal v-if="mayManage" v-model:show="editVisible" :title="t('hrRecruitment.candidates.edit')" icon="carbon:user-avatar">
				<n-form-item :label="t('hrRecruitment.candidates.name')">
					<n-input v-model:value="form.name" :maxlength="120" />
				</n-form-item>
				<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
					<n-form-item :label="t('hr.profile.fields.personalEmail')">
						<n-input v-model:value="form.email" dir="ltr" :maxlength="190" />
					</n-form-item>
					<n-form-item :label="t('hr.profile.fields.phone')">
						<n-input v-model:value="form.phone" dir="ltr" :maxlength="32" />
					</n-form-item>
				</div>
				<n-form-item :label="t('hrRecruitment.candidates.notes')">
					<n-input v-model:value="form.notes" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" :maxlength="5000" />
				</n-form-item>
				<template #footer>
					<div class="flex justify-end gap-2">
						<n-button @click="editVisible = false">{{ t("hr.common.cancel") }}</n-button>
						<n-button type="primary" :loading="saving" :disabled="!form.name.trim()" @click="save">{{ t("hr.common.save") }}</n-button>
					</div>
				</template>
			</HrFormModal>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Application, Candidate, PipelineStage } from "@/add-os/modules/hr/types/recruitment"
import { NAlert, NButton, NDataTable, NDescriptions, NDescriptionsItem, NFormItem, NInput, NSkeleton, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import { canManageRecruitment } from "@/add-os/config/permissions"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { useNarrowScreen } from "@/add-os/modules/hr/composables/useNarrowScreen"
import { apiErrorMessage, quietly, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { stageName } from "@/add-os/modules/hr/utils/recruitment"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { eraseCandidate, getCandidate, listStages, updateCandidate } from "@/add-os/services/hr/recruitment"
import { formatDate, formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * One candidate: how to reach them, HR's notes, and every application they
 * made. Erasing a candidate — a request to be forgotten — deletes them and
 * everything about them, CVs included; an employee record made from them
 * stays.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const narrow = useNarrowScreen()
const mayManage = canManageRecruitment()
const none = EMPTY

const candidateId = computed(() => Number(route.params.id))
const candidate = ref<Candidate | null>(null)
const stages = ref<PipelineStage[]>([])
const loadError = ref("")
const notFound = ref(false)
const saving = ref(false)
const editVisible = ref(false)
const form = ref({ name: "", email: "", phone: "", notes: "" })

async function load() {
	try {
		candidate.value = await getCandidate(candidateId.value)
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) notFound.value = true
		else loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	}
}

onMounted(() => {
	void load()
	void quietly(listStages, list => (stages.value = list))
})

watch(editVisible, open => {
	const c = candidate.value
	if (open && c) form.value = { name: c.name, email: c.email ?? "", phone: c.phone ?? "", notes: c.notes ?? "" }
})

const consentText = computed(() => (candidate.value?.consent_at ? t("hrRecruitment.candidates.consented", { date: formatDateTime(candidate.value.consent_at) }) : undefined))

async function save() {
	const f = form.value
	saving.value = true
	try {
		message.success(serverMessage(await updateCandidate(candidateId.value, { name: f.name.trim(), email: nullable(f.email), phone: nullable(f.phone), notes: nullable(f.notes) }), t("hrPayroll.run.done")))
		editVisible.value = false
		await load()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}

function confirmErase() {
	dialog.error({
		title: t("hrRecruitment.candidates.erase"),
		content: t("hrRecruitment.candidates.eraseConfirm", { name: candidate.value?.name ?? "" }),
		positiveText: t("hrRecruitment.candidates.erase"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			try {
				await eraseCandidate(candidateId.value)
				message.success(t("hrRecruitment.candidates.erased"))
				void router.push({ name: "hrTalent.hrCandidates" })
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

function rowProps(row: Application) {
	return { class: "cursor-pointer", onClick: () => void router.push({ name: "hrTalent.hrApplication", params: { id: row.id } }) }
}

const columns = computed<DataTableColumns<Application>>(() => [
	{ title: t("hrRecruitment.openings.title"), key: "opening", minWidth: 200, render: row => h("span", { class: "font-semibold" }, translated(row.opening?.title) || t("hrRecruitment.openings.untitled")) },
	{ title: t("hrRecruitment.applications.stage"), key: "stage", minWidth: 130, render: row => stageName(stages.value, row.stage) },
	{ title: t("hrRecruitment.applications.appliedOn"), key: "created_at", minWidth: 110, render: row => (row.created_at ? formatDate(row.created_at) : none) }
])
</script>
