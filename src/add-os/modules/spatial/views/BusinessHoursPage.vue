<!-- src/add-os/modules/spatial/views/BusinessHoursPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.businessHours") }}</h1>
		</div>

		<n-select
			v-model:value="selectedBranchId"
			class="max-w-sm"
			:placeholder="t('businessHours.branchPlaceholder')"
			:options="branchOptions"
		/>

		<n-tabs v-if="selectedBranchId !== null" type="line">
			<n-tab-pane name="weekly" :tab="t('businessHours.tabs.weeklySchedule')">
				<div class="flex flex-col gap-5">
					<n-alert v-if="hoursError" type="error" :title="t('businessHours.loadError')" />

					<div class="flex justify-end">
						<n-button type="primary" @click="openCreateHour">
							<template #icon><Icon name="carbon:add" :size="16" /></template>
							{{ t("businessHours.create.button") }}
						</n-button>
					</div>

					<ResourceTable
						:columns="hourColumns"
						:data="hours"
						:loading="hoursLoading"
						:on-edit="openEditHour"
						:on-delete="canDeleteHours ? (async row => { await hourMutations.remove(row.id) }) : undefined"
					/>
				</div>

				<ResourceFormDrawer
					v-model:show="hourDrawerVisible"
					v-model:model="hourForm"
					:fields="businessHourFields(t)"
					:title="hourMode === 'create' ? t('businessHours.create.title') : t('businessHours.edit.title')"
					:submitting="hourMutations.isSubmitting.value"
					:on-submit="submitHour"
				/>
			</n-tab-pane>

			<n-tab-pane name="exceptions" :tab="t('businessHours.tabs.exceptions')">
				<div class="flex flex-col gap-5">
					<n-alert v-if="exceptionsError" type="error" :title="t('businessHours.loadError')" />

					<div class="flex justify-end">
						<n-button type="primary" @click="openCreateException">
							<template #icon><Icon name="carbon:add" :size="16" /></template>
							{{ t("businessHours.exceptions.create.button") }}
						</n-button>
					</div>

					<ResourceTable
						:columns="exceptionColumns"
						:data="exceptions"
						:loading="exceptionsLoading"
						:on-edit="openEditException"
						:on-delete="canDeleteHours ? (async row => { await exceptionMutations.remove(row.id) }) : undefined"
					/>
				</div>

				<ResourceFormDrawer
					v-model:show="exceptionDrawerVisible"
					v-model:model="exceptionForm"
					:fields="exceptionFieldsComputed"
					:title="exceptionMode === 'create' ? t('businessHours.exceptions.create.title') : t('businessHours.exceptions.edit.title')"
					:submitting="exceptionMutations.isSubmitting.value"
					:on-submit="submitException"
				/>
			</n-tab-pane>
		</n-tabs>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { BusinessHour, BusinessHourPayload } from "@/add-os/modules/spatial/types/business-hour"
import type { BusinessHourException, BusinessHourExceptionPayload } from "@/add-os/modules/spatial/types/business-hour-exception"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { canDeleteBusinessHours } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import {
	buildBusinessHourColumns,
	buildBusinessHourExceptionColumns,
	businessHourExceptionFields,
	businessHourFields,
	emptyBusinessHourExceptionPayload,
	emptyBusinessHourPayload
} from "@/add-os/modules/spatial/config/business-hours.config"
import { listBranches } from "@/add-os/services/branches"
import {
	createBusinessHourException,
	listBusinessHourExceptions,
	removeBusinessHourException,
	updateBusinessHourException
} from "@/add-os/services/business-hour-exceptions"
import { createBusinessHour, listBusinessHours, removeBusinessHour, updateBusinessHour } from "@/add-os/services/business-hours"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const canDeleteHours = computed(() => canDeleteBusinessHours())

const branches = ref<Branch[]>([])
const selectedBranchId = ref<number | null>(null)
const branchOptions = computed<SelectOption[]>(() =>
	branches.value.map(branch => ({ label: pickLocalized(branch.name, currentLocale.value), value: branch.id }))
)

listBranches().then(result => {
	branches.value = result
	selectedBranchId.value = result[0]?.id ?? null
})

const branchQuery = computed(() => (selectedBranchId.value === null ? undefined : { branch_id: selectedBranchId.value }))

// ── Weekly schedule ──────────────────────────────────────────────────────
const {
	data: hours,
	isLoading: hoursLoading,
	error: hoursError,
	refetch: refetchHours
} = useResourceList<BusinessHour>(listBusinessHours, branchQuery)
const hourColumns = computed(() => buildBusinessHourColumns(t))

const hourMutations = useResourceMutations(
	{ create: createBusinessHour, update: updateBusinessHour, remove: removeBusinessHour },
	refetchHours,
	{ createSuccess: t("businessHours.create.success"), updateSuccess: t("businessHours.edit.success"), deleteSuccess: t("businessHours.delete.success") }
)

const hourDrawerVisible = ref(false)
const hourMode = ref<"create" | "edit">("create")
const editingHourId = ref<number | null>(null)
const hourForm = ref<BusinessHourPayload>(emptyBusinessHourPayload(selectedBranchId.value ?? 0))

function openCreateHour() {
	hourMode.value = "create"
	editingHourId.value = null
	hourForm.value = emptyBusinessHourPayload(selectedBranchId.value ?? 0)
	hourDrawerVisible.value = true
}

function openEditHour(row: BusinessHour) {
	hourMode.value = "edit"
	editingHourId.value = row.id
	hourForm.value = { branch_id: row.branch_id, day_of_week: row.day_of_week, open_time: row.open_time, close_time: row.close_time }
	hourDrawerVisible.value = true
}

async function submitHour(payload: Record<string, unknown>) {
	const withBranch = { ...payload, branch_id: selectedBranchId.value ?? 0 }
	if (hourMode.value === "create") {
		await hourMutations.create(withBranch as unknown as BusinessHourPayload)
	} else if (editingHourId.value !== null) {
		await hourMutations.update(editingHourId.value, withBranch as unknown as BusinessHourPayload)
	}
}

// ── Exceptions ───────────────────────────────────────────────────────────
const {
	data: exceptions,
	isLoading: exceptionsLoading,
	error: exceptionsError,
	refetch: refetchExceptions
} = useResourceList<BusinessHourException>(listBusinessHourExceptions, branchQuery)
const exceptionColumns = computed(() => buildBusinessHourExceptionColumns(t))

const exceptionMutations = useResourceMutations(
	{ create: createBusinessHourException, update: updateBusinessHourException, remove: removeBusinessHourException },
	refetchExceptions,
	{
		createSuccess: t("businessHours.exceptions.create.success"),
		updateSuccess: t("businessHours.exceptions.edit.success"),
		deleteSuccess: t("businessHours.exceptions.delete.success")
	}
)

const exceptionDrawerVisible = ref(false)
const exceptionMode = ref<"create" | "edit">("create")
const editingExceptionId = ref<number | null>(null)
const exceptionForm = ref<BusinessHourExceptionPayload>(emptyBusinessHourExceptionPayload(selectedBranchId.value ?? 0))
const exceptionFieldsComputed = computed(() => businessHourExceptionFields(t, Boolean(exceptionForm.value.is_closed)))

function openCreateException() {
	exceptionMode.value = "create"
	editingExceptionId.value = null
	exceptionForm.value = emptyBusinessHourExceptionPayload(selectedBranchId.value ?? 0)
	exceptionDrawerVisible.value = true
}

function openEditException(row: BusinessHourException) {
	exceptionMode.value = "edit"
	editingExceptionId.value = row.id
	exceptionForm.value = {
		branch_id: row.branch_id,
		date: row.date,
		is_closed: row.is_closed,
		open_time: row.open_time,
		close_time: row.close_time,
		reason: row.reason
	}
	exceptionDrawerVisible.value = true
}

async function submitException(payload: Record<string, unknown>) {
	const withBranch: Record<string, unknown> = { ...payload, branch_id: selectedBranchId.value ?? 0 }
	// is_closed=true requires open_time/close_time omitted (confirmed live) — disabledWhen
	// only disables the control, so stale input must be cleared here regardless.
	if (withBranch.is_closed) {
		withBranch.open_time = null
		withBranch.close_time = null
	}
	if (exceptionMode.value === "create") {
		await exceptionMutations.create(withBranch as unknown as BusinessHourExceptionPayload)
	} else if (editingExceptionId.value !== null) {
		await exceptionMutations.update(editingExceptionId.value, withBranch as unknown as BusinessHourExceptionPayload)
	}
}

// Both tabs' branch-scoped lists refetch when the branch changes — refetch() (not the
// composable's own query watcher) is called explicitly because both hourForm/exceptionForm
// also need their branch_id reset for the next "New" click.
watch(selectedBranchId, () => {
	hourForm.value = emptyBusinessHourPayload(selectedBranchId.value ?? 0)
	exceptionForm.value = emptyBusinessHourExceptionPayload(selectedBranchId.value ?? 0)
})
</script>
