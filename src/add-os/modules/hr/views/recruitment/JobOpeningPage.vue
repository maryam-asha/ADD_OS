<!-- src/add-os/modules/hr/views/recruitment/JobOpeningPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div>
			<n-button text @click="router.push({ name: 'hrTalent.hrJobOpenings' })">
				<template #icon><Icon name="carbon:arrow-left" :size="16" class="rtl:rotate-180" /></template>
				{{ t("hr.common.back") }}
			</n-button>
		</div>

		<n-alert v-if="notFound" type="warning" :title="t('hrRecruitment.openings.notFound')" />
		<n-alert v-else-if="loadError" type="error" :title="loadError" />
		<n-skeleton v-else-if="!opening" text :repeat="6" />

		<template v-else>
			<HrPageHeader :title="translated(opening.title) || t('hrRecruitment.openings.untitled')" :eyebrow="t(`hrRecruitment.visibility.${opening.visibility}`)" :description="openingFacts">
				<template #actions>
					<div class="flex flex-wrap items-center gap-2">
						<RecruitmentStatusTag kind="opening" :status="opening.status" />
						<template v-if="mayManage">
							<n-button @click="editVisible = true">
								<template #icon><Icon name="carbon:edit" :size="16" /></template>
								{{ t("hr.common.edit") }}
							</n-button>
							<n-button v-if="opening.status !== 'open'" type="primary" :loading="busy" @click="setOpen(true)">{{ t("hrRecruitment.openings.open") }}</n-button>
							<n-button v-else :loading="busy" @click="setOpen(false)">{{ t("hrRecruitment.openings.close") }}</n-button>
							<n-button v-if="opening.status === 'open'" type="primary" @click="addVisible = true">
								<template #icon><Icon name="carbon:add" :size="16" /></template>
								{{ t("hrRecruitment.applications.add") }}
							</n-button>
						</template>
					</div>
				</template>
			</HrPageHeader>

			<n-alert v-if="loadedAll === false" type="info" :title="t('hrRecruitment.board.partial', { n: formatNumber(applications.length) })" />

			<div class="overflow-x-auto pb-2">
				<div class="flex min-w-max gap-3">
					<section v-for="column in columns" :key="column.code" class="flex w-64 shrink-0 flex-col gap-2 rounded-add-large border border-[var(--add-border)] bg-[var(--add-surface-sunken)] p-2">
						<header class="flex items-center justify-between gap-2 px-1">
							<span class="text-sm font-semibold">{{ translated(column.name) }}</span>
							<n-tag size="small" round>{{ formatNumber(byStage(column.code).length) }}</n-tag>
						</header>
						<n-skeleton v-if="applicationsLoading" text :repeat="2" />
						<RouterLink
							v-for="application in byStage(column.code)"
							v-else
							:key="application.id"
							:to="{ name: 'hrTalent.hrApplication', params: { id: application.id } }"
							class="flex flex-col gap-1 rounded-add-default border border-[var(--add-border)] bg-[var(--add-surface-raised)] p-3 transition-colors hover:border-[var(--add-primary)]"
						>
							<span class="text-sm font-semibold">{{ application.candidate?.name }}</span>
							<span class="text-xs text-secondary">{{ t(`hrRecruitment.source.${application.source}`) }}</span>
							<span v-if="application.stage_changed_at" class="text-xs text-secondary">{{ t("hrRecruitment.board.since", { date: formatDate(application.stage_changed_at) }) }}</span>
						</RouterLink>
						<p v-if="!applicationsLoading && !byStage(column.code).length" class="px-1 text-xs text-secondary">{{ t("hrRecruitment.board.emptyColumn") }}</p>
					</section>
				</div>
			</div>

			<OpeningModal v-if="mayManage" v-model:show="editVisible" :opening @saved="loadOpening" />
			<AddApplicationModal v-if="mayManage" v-model:show="addVisible" :opening-id="opening.id" @saved="loadApplications" />
		</template>
	</div>
</template>

<script setup lang="ts">
import type { Application, JobOpening, PipelineStage } from "@/add-os/modules/hr/types/recruitment"
import { NAlert, NButton, NSkeleton, NTag, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { RouterLink, useRoute, useRouter } from "vue-router"
import { canManageRecruitment } from "@/add-os/config/permissions"
import AddApplicationModal from "@/add-os/modules/hr/components/recruitment/AddApplicationModal.vue"
import OpeningModal from "@/add-os/modules/hr/components/recruitment/OpeningModal.vue"
import RecruitmentStatusTag from "@/add-os/modules/hr/components/recruitment/RecruitmentStatusTag.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { apiErrorMessage, quietly, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { boardColumns } from "@/add-os/modules/hr/utils/recruitment"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { closeOpening, getOpening, listApplications, listStages, openOpening } from "@/add-os/services/hr/recruitment"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * One job opening and its applicants on a board, a column per stage — the
 * open stages in their order, then offer, hired, rejected and withdrawn. A
 * card opens the application, where it is moved, interviewed, offered and
 * hired. The board reads up to 500 applications (ten pages); beyond that it
 * says how many it shows.
 */
defineProps<{ titleKey?: string }>()

/** Ten pages of fifty is more than any one opening here should draw. */
const MAX_PAGES = 10

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const message = useMessage()
const mayManage = canManageRecruitment()

const openingId = computed(() => Number(route.params.id))
const opening = ref<JobOpening | null>(null)
const stages = ref<PipelineStage[]>([])
const applications = ref<Application[]>([])
const applicationsLoading = ref(true)
const loadedAll = ref<boolean | null>(null)
const loadError = ref("")
const notFound = ref(false)
const busy = ref(false)
const editVisible = ref(false)
const addVisible = ref(false)

async function loadOpening() {
	try {
		opening.value = await getOpening(openingId.value)
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) notFound.value = true
		else loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	}
}

async function loadApplications() {
	applicationsLoading.value = true
	const all: Application[] = []
	try {
		for (let page = 1; page <= MAX_PAGES; page++) {
			const result = await listApplications({ job_opening_id: openingId.value, page })
			all.push(...result.data)
			loadedAll.value = page >= result.meta.last_page
			if (loadedAll.value) break
		}
		applications.value = all
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		applicationsLoading.value = false
	}
}

onMounted(() => {
	void loadOpening()
	void loadApplications()
	void quietly(listStages, list => (stages.value = list))
})

const columns = computed(() => boardColumns(stages.value))
const byStage = (code: string) => applications.value.filter(a => a.stage === code)

const openingFacts = computed(() => {
	const o = opening.value
	if (!o) return ""
	return [t(`hr.employmentType.${o.employment_type}`), translated(o.work_location?.name), o.closes_on ? t("hrRecruitment.openings.closesOnDate", { date: formatDate(o.closes_on) }) : ""]
		.filter(Boolean)
		.join(" · ")
})

async function setOpen(open: boolean) {
	busy.value = true
	try {
		message.success(serverMessage(open ? await openOpening(openingId.value) : await closeOpening(openingId.value), t("hrPayroll.run.done")))
		await loadOpening()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		busy.value = false
	}
}
</script>
