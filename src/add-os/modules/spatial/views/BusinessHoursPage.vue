<!-- src/add-os/modules/spatial/views/BusinessHoursPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.businessHours") }}</h1>
		</div>

		<n-alert v-if="branchesError" type="error" :title="t('businessHours.loadError')" />

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

					<div class="flex justify-end mb-4">
						<n-button type="primary" @click="openBulkCreate">
							<template #icon><Icon name="carbon:add" :size="16" /></template>
							{{ t("businessHours.create.button") }}
						</n-button>
					</div>

					<ResourceTable
						:columns="groupedHourColumns"
						:data="groupedHours"
						:loading="hoursLoading"
						:on-edit="openEditGroupedHour"
						:on-delete="canDeleteHours ? (async row => { await hourMutations.remove(row.id) }) : undefined"
					/>
				</div>

				<!-- Bulk create / edit modal -->
				<n-modal
					v-model:show="bulkDrawerVisible"
					preset="card"
					:title="t('businessHours.bulkCreate.title')"
					closable
					style="max-width: 32rem"
					content-style="max-height: 70vh; overflow-y: auto"
				>
					<n-form label-placement="top">
						<!-- Days header row with full width & generous space -->
						<div class="flex items-center justify-between w-full mb-3">
							<span class="text-sm font-semibold" style="color: #A97C57">
								{{ t("businessHours.bulkCreate.days") }} *
							</span>
							<div class="flex items-center gap-2">
								<n-button
									size="tiny"
									quaternary
									type="primary"
									@click="selectWorkDays"
								>
									{{ t("businessHours.bulkCreate.workDays") }}
								</n-button>
								<n-button
									size="tiny"
									quaternary
									type="primary"
									@click="toggleSelectAllDays"
								>
									{{ allDaysSelected ? t("businessHours.bulkCreate.clearAll") : t("businessHours.bulkCreate.selectAll") }}
								</n-button>
							</div>
						</div>

						<!-- Day cards grid -->
						<div class="grid grid-cols-4 gap-2 mb-2">
							<div
								v-for="day in DAYS_OF_WEEK_ORDERED"
								:key="day"
								class="border rounded-lg p-2 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[52px] select-none"
								:class="bulkForm.days.includes(day)
									? 'border-[#007F91] bg-[#007F91]/10 text-[#007F91]'
									: 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 text-neutral-700 dark:text-neutral-300'"
								@click="toggleBulkDay(day)"
							>
								<span
									class="text-xs font-semibold"
									style="color: #A97C57"
								>
									{{ t(`businessHours.days.${day}`) }}
								</span>
								<Icon
									v-if="bulkForm.days.includes(day)"
									name="carbon:checkmark-filled"
									:size="14"
									class="text-[#007F91] mt-0.5"
								/>
							</div>
						</div>
						<p v-if="bulkDaysError" class="text-xs text-red-500 mb-3">{{ bulkDaysError }}</p>

						<!-- Times row: side by side -->
						<div class="grid grid-cols-2 gap-4 mb-3">
							<n-form-item
								:label="t('businessHours.form.openTime')"
								:validation-status="bulkOpenTimeError ? 'error' : undefined"
								:feedback="bulkOpenTimeError ?? undefined"
							>
								<n-time-picker
									:formatted-value="toPickerTime(bulkForm.open_time)"
									value-format="HH:mm"
									format="HH:mm"
									class="w-full"
									@update:formatted-value="v => { bulkForm.open_time = v ?? ''; bulkOpenTimeError = null }"
								/>
							</n-form-item>
							<n-form-item
								:label="t('businessHours.form.closeTime')"
								:validation-status="bulkCloseTimeError ? 'error' : undefined"
								:feedback="bulkCloseTimeError ?? undefined"
							>
								<n-time-picker
									:formatted-value="toPickerTime(bulkForm.close_time)"
									value-format="HH:mm"
									format="HH:mm"
									class="w-full"
									@update:formatted-value="v => { bulkForm.close_time = v ?? ''; bulkCloseTimeError = null }"
								/>
							</n-form-item>
						</div>
					</n-form>

					<template #footer>
						<div class="flex justify-end gap-2">
							<n-button @click="bulkDrawerVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
							<n-button type="primary" :loading="bulkSubmitting" @click="submitBulkHour">
								{{ t("resourceCrud.form.save") }}
							</n-button>
						</div>
					</template>
				</n-modal>

				<!-- Single-day drawer fallback -->
				<ResourceFormDrawer
					v-model:show="hourDrawerVisible"
					v-model:model="hourForm"
					:fields="businessHourFields(t)"
					:title="hourMode === 'create' ? t('businessHours.create.title') : t('businessHours.edit.title')"
					:submitting="hourMutations.isSubmitting.value"
					:on-submit="(payload: Record<string, unknown>) => submitHour(payload as unknown as BusinessHourPayload)"
				/>
			</n-tab-pane>

			<n-tab-pane name="exceptions" :tab="t('businessHours.tabs.exceptions')">
				<div class="flex flex-col gap-5">
					<n-alert v-if="exceptionsError" type="error" :title="t('businessHours.loadError')" />

					<div class="flex justify-end mb-4">
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

				<!-- Custom exceptions modal -->
				<n-modal
					v-model:show="exceptionModalVisible"
					preset="card"
					:title="exceptionMode === 'create' ? t('businessHours.exceptions.create.title') : t('businessHours.exceptions.edit.title')"
					closable
					style="max-width: 32rem"
					content-style="max-height: 70vh; overflow-y: auto"
				>
					<n-form label-placement="top">
						<!-- Date Picker -->
						<n-form-item
							:label="t('businessHours.exceptions.form.date')"
							:validation-status="exceptionDateError ? 'error' : undefined"
							:feedback="exceptionDateError ?? undefined"
						>
							<n-date-picker
								:value="toPickerDate(exceptionForm.date)"
								type="date"
								value-format="yyyy-MM-dd"
								class="w-full"
								@update:formatted-value="v => { exceptionForm.date = v ?? ''; exceptionDateError = null }"
							/>
						</n-form-item>

						<!-- Closed switch -->
						<n-form-item :label="t('businessHours.exceptions.form.isClosed')">
							<n-switch v-model:value="exceptionForm.is_closed" />
						</n-form-item>

						<!-- Time pickers: side by side when not closed -->
						<div v-if="!exceptionForm.is_closed" class="grid grid-cols-2 gap-4 mb-3">
							<n-form-item
								:label="t('businessHours.exceptions.form.openTime')"
								:validation-status="exceptionOpenTimeError ? 'error' : undefined"
								:feedback="exceptionOpenTimeError ?? undefined"
							>
								<n-time-picker
									:formatted-value="toPickerTime(exceptionForm.open_time ?? '')"
									value-format="HH:mm"
									format="HH:mm"
									class="w-full"
									@update:formatted-value="v => { exceptionForm.open_time = v; exceptionOpenTimeError = null }"
								/>
							</n-form-item>
							<n-form-item
								:label="t('businessHours.exceptions.form.closeTime')"
								:validation-status="exceptionCloseTimeError ? 'error' : undefined"
								:feedback="exceptionCloseTimeError ?? undefined"
							>
								<n-time-picker
									:formatted-value="toPickerTime(exceptionForm.close_time ?? '')"
									value-format="HH:mm"
									format="HH:mm"
									class="w-full"
									@update:formatted-value="v => { exceptionForm.close_time = v; exceptionCloseTimeError = null }"
								/>
							</n-form-item>
						</div>

						<!-- Reason input -->
						<n-form-item :label="t('businessHours.exceptions.form.reason')">
							<n-input
								v-model:value="exceptionForm.reason"
								type="textarea"
								:rows="2"
								class="w-full"
							/>
						</n-form-item>
					</n-form>

					<template #footer>
						<div class="flex justify-end gap-2">
							<n-button @click="exceptionModalVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
							<n-button type="primary" :loading="exceptionSubmitting" @click="handleExceptionSubmit">
								{{ t("resourceCrud.form.save") }}
							</n-button>
						</div>
					</template>
				</n-modal>
			</n-tab-pane>
		</n-tabs>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { BusinessHour, BusinessHourPayload, DayOfWeek } from "@/add-os/modules/spatial/types/business-hour"
import type { BusinessHourException, BusinessHourExceptionPayload } from "@/add-os/modules/spatial/types/business-hour-exception"
import type { BulkHourForm } from "@/add-os/modules/spatial/config/business-hours.config"
import { NAlert, NButton, NDatePicker, NForm, NFormItem, NInput, NModal, NSelect, NSwitch, NTabs, NTabPane, NTimePicker, useMessage } from "naive-ui"
import { computed, h, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { canDeleteBusinessHours } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import {
	DAYS_OF_WEEK_ORDERED,
	WORK_DAYS,
	buildBusinessHourExceptionColumns,
	businessHourFields,
	emptyBulkHourForm,
	emptyBusinessHourExceptionPayload,
	emptyBusinessHourPayload
} from "@/add-os/modules/spatial/config/business-hours.config"
import { listBranches } from "@/add-os/services/branches"
import {
	createBusinessHour,
	listBusinessHours,
	removeBusinessHour,
	updateBusinessHour
} from "@/add-os/services/business-hours"
import {
	createBusinessHourException,
	listBusinessHourExceptions,
	removeBusinessHourException,
	updateBusinessHourException
} from "@/add-os/services/business-hour-exceptions"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()

const canDeleteHours = computed(() => canDeleteBusinessHours())

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// ── Branches ───────────────────────────────────────────────────────────────
const { data: branches, error: branchesError } = useResourceList<Branch>(listBranches)
const selectedBranchId = ref<number | null>(null)

const branchOptions = computed<SelectOption[]>(() =>
	branches.value.map(branch => ({
		label: pickLocalized(branch.name, currentLocale.value) || branch.id.toString(),
		value: branch.id
	}))
)

watch(
	branches,
	list => {
		if (list.length > 0 && selectedBranchId.value === null) {
			selectedBranchId.value = list[0].id
		}
	},
	{ immediate: true }
)

const branchQuery = computed<Record<string, unknown>>(() => ({
	branch_id: selectedBranchId.value ?? 0
}))

function listBusinessHoursForBranch(query?: Record<string, unknown>) {
	return selectedBranchId.value === null ? Promise.resolve([]) : listBusinessHours(query)
}

function listBusinessHourExceptionsForBranch(query?: Record<string, unknown>) {
	return selectedBranchId.value === null ? Promise.resolve([]) : listBusinessHourExceptions(query)
}

// ── Weekly schedule ───────────────────────────────────────────────────────
const {
	data: hours,
	isLoading: hoursLoading,
	error: hoursError,
	refetch: refetchHours,
} = useResourceList<BusinessHour>(listBusinessHoursForBranch, branchQuery)

export interface GroupedBusinessHour {
	id: number
	branch_id: number
	days: DayOfWeek[]
	daysLabel: string
	open_time: string
	close_time: string
	itemIds: number[]
}

function formatDaysLabel(sortedDays: DayOfWeek[]): string {
	if (sortedDays.length === 0) return ""
	if (sortedDays.length === 1) {
		return t(`businessHours.days.${sortedDays[0]}`)
	}

	if (sortedDays.length === DAYS_OF_WEEK_ORDERED.length) {
		return `${t(`businessHours.days.${DAYS_OF_WEEK_ORDERED[0]}`)} – ${t(`businessHours.days.${DAYS_OF_WEEK_ORDERED[DAYS_OF_WEEK_ORDERED.length - 1]}`)}`
	}

	const segments: DayOfWeek[][] = []
	let currentSegment: DayOfWeek[] = [sortedDays[0]]

	for (let i = 1; i < sortedDays.length; i++) {
		const prevDay = sortedDays[i - 1]
		const currDay = sortedDays[i]
		const prevIdx = DAYS_OF_WEEK_ORDERED.indexOf(prevDay)
		const currIdx = DAYS_OF_WEEK_ORDERED.indexOf(currDay)

		if (currIdx === prevIdx + 1) {
			currentSegment.push(currDay)
		} else {
			segments.push(currentSegment)
			currentSegment = [currDay]
		}
	}
	segments.push(currentSegment)

	const separator = currentLocale.value === "ar" ? "، " : ", "

	return segments
		.map(seg => {
			if (seg.length === 1) {
				return t(`businessHours.days.${seg[0]}`)
			}
			const startName = t(`businessHours.days.${seg[0]}`)
			const endName = t(`businessHours.days.${seg[seg.length - 1]}`)
			return `${startName} – ${endName}`
		})
		.join(separator)
}

function groupHoursByTime(rawHours: BusinessHour[]): GroupedBusinessHour[] {
	if (rawHours.length === 0) return []

	const timeMap = new Map<
		string,
		{
			days: DayOfWeek[]
			open_time: string
			close_time: string
			itemIds: number[]
			branch_id: number
			firstId: number
		}
	>()

	for (const hour of rawHours) {
		const key = `${hour.open_time}-${hour.close_time}`
		const existing = timeMap.get(key)
		if (existing) {
			if (!existing.days.includes(hour.day_of_week)) {
				existing.days.push(hour.day_of_week)
			}
			existing.itemIds.push(hour.id)
		} else {
			timeMap.set(key, {
				days: [hour.day_of_week],
				open_time: hour.open_time,
				close_time: hour.close_time,
				itemIds: [hour.id],
				branch_id: hour.branch_id,
				firstId: hour.id,
			})
		}
	}

	const groups: GroupedBusinessHour[] = []

	for (const entry of timeMap.values()) {
		entry.days.sort((a, b) => DAYS_OF_WEEK_ORDERED.indexOf(a) - DAYS_OF_WEEK_ORDERED.indexOf(b))
		groups.push({
			id: entry.firstId,
			branch_id: entry.branch_id,
			days: entry.days,
			daysLabel: formatDaysLabel(entry.days),
			open_time: entry.open_time,
			close_time: entry.close_time,
			itemIds: entry.itemIds,
		})
	}

	groups.sort((a, b) => {
		const idxA = DAYS_OF_WEEK_ORDERED.indexOf(a.days[0])
		const idxB = DAYS_OF_WEEK_ORDERED.indexOf(b.days[0])
		if (idxA !== idxB) return idxA - idxB
		return (a.open_time || "").localeCompare(b.open_time || "")
	})

	return groups
}

const groupedHours = computed<GroupedBusinessHour[]>(() => groupHoursByTime(hours.value))

const groupedHourColumns = computed<DataTableColumns<GroupedBusinessHour>>(() => [
	{
		title: t("businessHours.columns.period"),
		key: "daysLabel",
		render: row =>
			h("div", { class: "flex items-center gap-2" }, [
				h("span", { class: "font-semibold text-neutral-800 dark:text-neutral-100" }, row.daysLabel),
				row.days.length > 1
					? h(
							"span",
							{
								class: "text-xs px-2.5 py-0.5 rounded-full bg-[#007F91]/10 text-[#007F91] font-semibold",
							},
							`${row.days.length} ${currentLocale.value === "ar" ? "أيام" : "days"}`
					  )
					: null,
			]),
	},
	{
		title: t("businessHours.columns.openTime"),
		key: "open_time",
		render: row => h("span", { class: "font-mono font-medium" }, row.open_time),
	},
	{
		title: t("businessHours.columns.closeTime"),
		key: "close_time",
		render: row => h("span", { class: "font-mono font-medium" }, row.close_time),
	},
])

async function removeGroupedHour(id: number) {
	const group = groupedHours.value.find(g => g.id === id || g.itemIds.includes(id))
	if (group && group.itemIds.length > 1) {
		for (const otherId of group.itemIds) {
			if (otherId !== id) {
				await removeBusinessHour(otherId)
			}
		}
	}
	return removeBusinessHour(id)
}

function openEditGroupedHour(row: GroupedBusinessHour) {
	bulkForm.branch_id = row.branch_id
	bulkForm.days = [...row.days]
	bulkForm.open_time = row.open_time
	bulkForm.close_time = row.close_time
	resetBulkErrors()
	bulkDrawerVisible.value = true
}

const hourMutations = useResourceMutations(
	{ create: createBusinessHour, update: updateBusinessHour, remove: removeGroupedHour },
	refetchHours,
	{ createSuccess: t("businessHours.create.success"), updateSuccess: t("businessHours.edit.success"), deleteSuccess: t("businessHours.delete.success") }
)

// ── Bulk create modal ─────────────────────────────────────────────────────
const bulkDrawerVisible = ref(false)
const bulkSubmitting = ref(false)
const bulkForm = reactive<BulkHourForm>(emptyBulkHourForm(selectedBranchId.value ?? 0))
const bulkDaysError = ref<string | null>(null)
const bulkOpenTimeError = ref<string | null>(null)
const bulkCloseTimeError = ref<string | null>(null)

function toPickerTime(value: string): string | null {
	return TIME_PATTERN.test(value) ? value : null
}

function resetBulkErrors() {
	bulkDaysError.value = null
	bulkOpenTimeError.value = null
	bulkCloseTimeError.value = null
}

const allDaysSelected = computed(() => bulkForm.days.length === DAYS_OF_WEEK_ORDERED.length)

function toggleBulkDay(day: DayOfWeek) {
	const idx = bulkForm.days.indexOf(day)
	if (idx >= 0) bulkForm.days.splice(idx, 1)
	else bulkForm.days.push(day)
	bulkDaysError.value = null
}

function selectWorkDays() {
	bulkForm.days = [...WORK_DAYS]
	bulkDaysError.value = null
}

function toggleSelectAllDays() {
	if (allDaysSelected.value) {
		bulkForm.days = []
	} else {
		bulkForm.days = [...DAYS_OF_WEEK_ORDERED]
	}
	bulkDaysError.value = null
}

function openBulkCreate() {
	const fresh = emptyBulkHourForm(selectedBranchId.value ?? 0)
	bulkForm.branch_id = fresh.branch_id
	bulkForm.days = []
	bulkForm.open_time = ""
	bulkForm.close_time = ""
	resetBulkErrors()
	bulkDrawerVisible.value = true
}

function validateBulkForm(): boolean {
	let valid = true
	resetBulkErrors()

	if (bulkForm.days.length === 0) {
		bulkDaysError.value = t("businessHours.bulkCreate.daysRequired")
		valid = false
	}
	if (!TIME_PATTERN.test(bulkForm.open_time)) {
		bulkOpenTimeError.value = t("businessHours.validation.timeFormat")
		valid = false
	}
	if (!TIME_PATTERN.test(bulkForm.close_time)) {
		bulkCloseTimeError.value = t("businessHours.validation.timeFormat")
		valid = false
	}
	return valid
}

async function submitBulkHour() {
	if (!validateBulkForm()) return
	bulkSubmitting.value = true
	try {
		for (const day of bulkForm.days) {
			const existing = hours.value.filter(h => h.day_of_week === day)
			const payload = {
				branch_id: selectedBranchId.value ?? 0,
				day_of_week: day,
				open_time: bulkForm.open_time,
				close_time: bulkForm.close_time,
			}

			if (existing.length === 0) {
				await createBusinessHour(payload)
			} else {
				await updateBusinessHour(existing[0].id, payload)
				for (const extra of existing.slice(1)) {
					await removeBusinessHour(extra.id)
				}
			}
		}
		message.success(t("businessHours.bulkCreate.success", { count: bulkForm.days.length }))
		bulkDrawerVisible.value = false
		await refetchHours()
	} catch {
		message.error(t("resourceCrud.mutations.genericError"))
	} finally {
		bulkSubmitting.value = false
	}
}

// ── Edit single-day drawer ────────────────────────────────────────────────
const hourDrawerVisible = ref(false)
const editingHourId = ref<number | null>(null)
const hourForm = ref<BusinessHourPayload>(emptyBusinessHourPayload(selectedBranchId.value ?? 0))

const hourMode = computed<"create" | "edit">(() => (editingHourId.value === null ? "create" : "edit"))

function openCreateHour() {
	openBulkCreate()
}

function openEditHour(row: BusinessHour) {
	editingHourId.value = row.id
	hourForm.value = {
		branch_id: row.branch_id,
		day_of_week: row.day_of_week,
		open_time: row.open_time,
		close_time: row.close_time
	}
	hourDrawerVisible.value = true
}

defineExpose({ openCreateHour, openEditHour })

async function submitHour(payload: BusinessHourPayload) {
	const withBranch = { ...payload, branch_id: selectedBranchId.value ?? 0 }
	if (hourMode.value === "create") {
		await hourMutations.create(withBranch)
	} else if (editingHourId.value !== null) {
		await hourMutations.update(editingHourId.value, withBranch)
	}
}

// ── Exceptions ────────────────────────────────────────────────────────────
const {
	data: exceptions,
	isLoading: exceptionsLoading,
	error: exceptionsError,
	refetch: refetchExceptions,
} = useResourceList<BusinessHourException>(listBusinessHourExceptionsForBranch, branchQuery)

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

const exceptionModalVisible = ref(false)
const exceptionSubmitting = ref(false)
const editingExceptionId = ref<number | null>(null)
const exceptionForm = reactive<BusinessHourExceptionPayload>(
	emptyBusinessHourExceptionPayload(selectedBranchId.value ?? 0)
)
const exceptionDateError = ref<string | null>(null)
const exceptionOpenTimeError = ref<string | null>(null)
const exceptionCloseTimeError = ref<string | null>(null)

const exceptionMode = computed<"create" | "edit">(() =>
	editingExceptionId.value === null ? "create" : "edit"
)

function toPickerDate(dateStr: string): number | null {
	if (!DATE_PATTERN.test(dateStr)) return null
	const ts = Date.parse(dateStr)
	return Number.isNaN(ts) ? null : ts
}

function resetExceptionErrors() {
	exceptionDateError.value = null
	exceptionOpenTimeError.value = null
	exceptionCloseTimeError.value = null
}

function openCreateException() {
	editingExceptionId.value = null
	const fresh = emptyBusinessHourExceptionPayload(selectedBranchId.value ?? 0)
	exceptionForm.branch_id = fresh.branch_id
	exceptionForm.date = fresh.date
	exceptionForm.is_closed = fresh.is_closed
	exceptionForm.open_time = fresh.open_time
	exceptionForm.close_time = fresh.close_time
	exceptionForm.reason = fresh.reason
	resetExceptionErrors()
	exceptionModalVisible.value = true
}

function openEditException(row: BusinessHourException) {
	editingExceptionId.value = row.id
	exceptionForm.branch_id = row.branch_id
	exceptionForm.date = row.date
	exceptionForm.is_closed = row.is_closed
	exceptionForm.open_time = row.open_time
	exceptionForm.close_time = row.close_time
	exceptionForm.reason = row.reason
	resetExceptionErrors()
	exceptionModalVisible.value = true
}

function validateExceptionForm(): boolean {
	let valid = true
	resetExceptionErrors()

	if (!DATE_PATTERN.test(exceptionForm.date)) {
		exceptionDateError.value = t("resourceCrud.validation.required")
		valid = false
	}
	if (!exceptionForm.is_closed) {
		if (!exceptionForm.open_time || !TIME_PATTERN.test(exceptionForm.open_time)) {
			exceptionOpenTimeError.value = t("businessHours.validation.timeFormat")
			valid = false
		}
		if (!exceptionForm.close_time || !TIME_PATTERN.test(exceptionForm.close_time)) {
			exceptionCloseTimeError.value = t("businessHours.validation.timeFormat")
			valid = false
		}
	}
	return valid
}

async function handleExceptionSubmit() {
	if (!validateExceptionForm()) return
	exceptionSubmitting.value = true
	try {
		const withBranch = {
			...exceptionForm,
			branch_id: selectedBranchId.value ?? 0
		}
		if (withBranch.is_closed) {
			withBranch.open_time = null
			withBranch.close_time = null
		}
		if (exceptionMode.value === "create") {
			await exceptionMutations.create(withBranch)
		} else if (editingExceptionId.value !== null) {
			await exceptionMutations.update(editingExceptionId.value, withBranch)
		}
		exceptionModalVisible.value = false
	} finally {
		exceptionSubmitting.value = false
	}
}

watch(selectedBranchId, () => {
	hourDrawerVisible.value = false
	bulkDrawerVisible.value = false
	exceptionModalVisible.value = false
	editingHourId.value = null
	editingExceptionId.value = null
})
</script>

