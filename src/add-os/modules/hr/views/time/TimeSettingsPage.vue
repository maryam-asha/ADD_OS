<!-- src/add-os/modules/hr/views/time/TimeSettingsPage.vue -->
<template>
	<div class="flex flex-col gap-6">
		<!-- Top Breadcrumb & Title matching Image 2 & 3 -->
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<div class="flex items-center gap-1.5 text-xs text-slate-400">
					<span>{{ t("nav.sections.hrTime", "الحضور والانصراف") }}</span>
					<Icon name="carbon:chevron-left" :size="12" class="rtl:rotate-0 rotate-180" />
					<span class="font-medium text-slate-700 dark:text-neutral-200">{{ t("nav.pages.hrTimeSettings", "نماذج الدوام") }}</span>
				</div>
				<h1 class="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
					{{ t("nav.pages.hrTimeSettings", "نماذج الدوام") }}
				</h1>
			</div>

			<!-- Shift Type Selector Tabs matching Image 2 & 3 -->
			<div class="flex items-center gap-2">
				<button
					type="button"
					class="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-sm"
					:class="[
						modelType === 'fixed'
							? 'bg-[#064E3B] text-white shadow-emerald-950/20'
							: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
					]"
					@click="setModelType('fixed')"
				>
					{{ t("hrAttendance.shifts.fixedModel", "نموذج دوام محدد") }}
				</button>
				<button
					type="button"
					class="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-sm"
					:class="[
						modelType === 'flexible'
							? 'bg-[#064E3B] text-white shadow-emerald-950/20'
							: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
					]"
					@click="setModelType('flexible')"
				>
					{{ t("hrAttendance.shifts.flexibleModel", "نموذج عمل مرن") }}
				</button>
			</div>
		</div>

		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" class="rounded-xl" />

		<!-- Main 2-column layout: Form on the main side, Approved Templates on the side -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
			<!-- Main Form Panel (8 cols) -->
			<div class="lg:col-span-8 flex flex-col gap-6">
				<div class="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
					<!-- Form Header with Type Badge and Daily Net Work Hours Badge -->
					<div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5 dark:border-neutral-800">
						<div class="flex items-center gap-3">
							<span
								class="rounded-lg px-2.5 py-1 text-xs font-semibold"
								:class="modelType === 'fixed' ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'"
							>
								{{ modelType === "fixed" ? t("hrAttendance.shifts.fixedBadge", "دوام محدد") : t("hrAttendance.shifts.flexibleBadge", "عمل مرن") }}
							</span>
							<h2 class="text-xl font-bold text-slate-900 dark:text-white">
								{{ selectedShift ? t("hrAttendance.shifts.editTitle", "تعديل النموذج") : t("hrAttendance.shifts.newModel", "نموذج جديد") }}
							</h2>
						</div>

						<div class="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-2 text-center text-xs text-slate-600 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-300">
							<span class="block text-slate-400 dark:text-neutral-400">{{ t("hrAttendance.shifts.netWork", "صافي العمل اليومي") }}</span>
							<span class="text-sm font-bold text-slate-800 dark:text-white">{{ netHoursDisplay }} {{ t("hrAttendance.shifts.hours", "ساعات") }}</span>
						</div>
					</div>

					<!-- Form Content -->
					<div class="mt-6 flex flex-col gap-6">
						<!-- Model Name -->
						<div>
							<label class="mb-2 block text-sm font-semibold text-slate-800 dark:text-neutral-200">
								{{ t("hrAttendance.shifts.name", "اسم النموذج") }} <span class="text-red-500">*</span>
							</label>
							<n-input
								v-model:value="form.name"
								size="large"
								class="rounded-xl"
								:placeholder="modelType === 'fixed' ? 'مثال: الدوام الإداري' : 'مثال: العمل المرن'"
							/>
						</div>

						<!-- Work Days -->
						<div>
							<label class="mb-2.5 block text-sm font-semibold text-slate-800 dark:text-neutral-200">
								{{ t("hrAttendance.shifts.workDays", "أيام العمل") }} <span class="text-red-500">*</span>
							</label>
							<div class="flex flex-wrap gap-2">
								<button
									v-for="day in DAYS_OF_WEEK"
									:key="day.iso"
									type="button"
									class="min-w-[72px] flex-1 rounded-xl py-2.5 text-center text-sm font-medium transition-all shadow-xs"
									:class="[
										form.days.includes(day.iso)
											? 'bg-[#064E3B] text-white font-semibold'
											: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
									]"
									@click="toggleDay(day.iso)"
								>
									{{ day.label }}
								</button>
							</div>
						</div>

						<!-- Fixed Shift Specifics -->
						<template v-if="modelType === 'fixed'">
							<!-- Daily Shift Periods -->
							<div class="flex flex-col gap-3">
								<div class="flex items-center justify-between">
									<div>
										<h3 class="text-sm font-bold text-slate-800 dark:text-neutral-200">
											{{ t("hrAttendance.shifts.dailyPeriods", "فترات الدوام اليومية") }}
										</h3>
										<p class="text-xs text-slate-400 dark:text-neutral-400">
											{{ t("hrAttendance.shifts.multiplePeriodsHint", "يمكن إضافة أكثر من فترة لليوم نفسه.") }}
										</p>
									</div>
									<n-button size="small" secondary type="primary" class="rounded-lg" @click="addPeriod">
										<template #icon><Icon name="carbon:add" :size="16" /></template>
										{{ t("hrAttendance.shifts.addPeriod", "إضافة فترة") }}
									</n-button>
								</div>

								<!-- Period Cards -->
								<div
									v-for="(period, pIndex) in form.periods"
									:key="pIndex"
									class="relative rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 transition-all dark:border-neutral-800 dark:bg-neutral-800/40"
								>
									<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
										<div>
											<label class="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-neutral-300">
												<Icon name="carbon:time" :size="14" class="text-slate-400" />
												{{ t("hrAttendance.shifts.periodStarts", { n: pIndex + 1 }, `الحضور - الفترة ${pIndex + 1}`) }}
											</label>
											<n-time-picker
												v-model:formatted-value="period.starts_at"
												value-format="HH:mm"
												format="hh:mm A"
												size="medium"
												class="w-full"
											/>
										</div>

										<div>
											<div class="mb-1.5 flex items-center justify-between">
												<label class="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-neutral-300">
													<Icon name="carbon:time" :size="14" class="text-slate-400" />
													{{ t("hrAttendance.shifts.periodEnds", "الانصراف") }}
												</label>
												<button
													v-if="form.periods.length > 1"
													type="button"
													class="text-xs font-medium text-rose-500 hover:text-rose-700 transition-colors"
													@click="removePeriod(pIndex)"
												>
													{{ t("hr.common.delete", "حذف") }}
												</button>
											</div>
											<n-time-picker
												v-model:formatted-value="period.ends_at"
												value-format="HH:mm"
												format="hh:mm A"
												size="medium"
												class="w-full"
											/>
										</div>
									</div>
								</div>
							</div>

							<!-- Durations Row (Break, Grace, Early Leave, Overtime) -->
							<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
								<div>
									<label class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-neutral-300">
										{{ t("hrAttendance.shifts.breakDuration", "مدة الاستراحة") }}
									</label>
									<n-input-number v-model:value="form.breakMinutes" :min="0" :max="360" size="medium" class="w-full">
										<template #suffix><span class="text-xs text-slate-400">دقيقة</span></template>
									</n-input-number>
								</div>
								<div>
									<label class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-neutral-300">
										{{ t("hrAttendance.policies.graceMinutes", "سماح التأخير") }}
									</label>
									<n-input-number v-model:value="form.graceMinutes" :min="0" :max="180" size="medium" class="w-full">
										<template #suffix><span class="text-xs text-slate-400">دقيقة</span></template>
									</n-input-number>
								</div>
								<div>
									<label class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-neutral-300">
										{{ t("hrAttendance.policies.earlyLeaveGraceMinutes", "سماح الخروج المبكر") }}
									</label>
									<n-input-number v-model:value="form.earlyLeaveGraceMinutes" :min="0" :max="180" size="medium" class="w-full">
										<template #suffix><span class="text-xs text-slate-400">دقيقة</span></template>
									</n-input-number>
								</div>
								<div>
									<label class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-neutral-300">
										{{ t("hrAttendance.policies.minOvertimeMinutes", "بدء احتساب الإضافي بعد") }}
									</label>
									<n-input-number v-model:value="form.minOvertimeMinutes" :min="0" :max="360" size="medium" class="w-full">
										<template #suffix><span class="text-xs text-slate-400">دقيقة</span></template>
									</n-input-number>
								</div>
							</div>

							<!-- Switches Row -->
							<div class="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-800/30">
								<div class="flex items-center justify-between gap-4">
									<span class="text-sm font-medium text-slate-800 dark:text-neutral-200">
										{{ t("hrAttendance.shifts.deductBreak", "خصم الاستراحة من ساعات العمل") }}
									</span>
									<n-switch v-model:value="form.deductBreak" />
								</div>
								<div class="flex items-center justify-between gap-4 border-t border-slate-100/80 pt-3 dark:border-neutral-800">
									<span class="text-sm font-medium text-slate-800 dark:text-neutral-200">
										{{ t("hrAttendance.shifts.allowOvertime", "السماح بالعمل الإضافي") }}
									</span>
									<n-switch v-model:value="form.allowOvertime" />
								</div>
								<div class="flex items-center justify-between gap-4 border-t border-slate-100/80 pt-3 dark:border-neutral-800">
									<span class="text-sm font-medium text-slate-800 dark:text-neutral-200">
										{{ t("hrAttendance.shifts.allowFlexiblePunch", "السماح للموظف باختيار وقت التسجيل") }}
									</span>
									<n-switch v-model:value="form.allowFlexiblePunch" />
								</div>
							</div>
						</template>

						<!-- Flexible Shift Specifics -->
						<template v-else>
							<!-- Durations Row for Flexible Work -->
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div>
									<label class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-neutral-300">
										{{ t("hrAttendance.shifts.requiredDailyHours", "الساعات اليومية المطلوبة") }}
									</label>
									<n-input-number v-model:value="form.dailyHours" :min="1" :max="24" size="medium" class="w-full">
										<template #suffix><span class="text-xs text-slate-400">ساعة</span></template>
									</n-input-number>
								</div>
								<div>
									<label class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-neutral-300">
										{{ t("hrAttendance.shifts.breakDuration", "مدة الاستراحة") }}
									</label>
									<n-input-number v-model:value="form.breakMinutes" :min="0" :max="240" size="medium" class="w-full">
										<template #suffix><span class="text-xs text-slate-400">دقيقة</span></template>
									</n-input-number>
								</div>
							</div>

							<!-- Flexible Switches with Explanatory Hint -->
							<div class="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-800/30">
								<div class="flex items-center justify-between gap-4">
									<span class="text-sm font-medium text-slate-800 dark:text-neutral-200">
										{{ t("hrAttendance.shifts.deductBreak", "خصم الاستراحة من ساعات العمل") }}
									</span>
									<n-switch v-model:value="form.deductBreak" />
								</div>

								<div class="flex flex-col gap-1.5 border-t border-slate-100/80 pt-3 dark:border-neutral-800">
									<div class="flex items-center justify-between gap-4">
										<span class="text-sm font-medium text-slate-800 dark:text-neutral-200">
											{{ t("hrAttendance.shifts.allowFlexiblePunch", "السماح للموظف باختيار وقت التسجيل") }}
										</span>
										<n-switch v-model:value="form.allowFlexiblePunch" />
									</div>
									<p class="text-xs text-slate-400 dark:text-neutral-400">
										{{ t("hrAttendance.shifts.flexibleHint", "لا تظهر في العمل المرن حالات التأخير أو الخروج المبكر: يعتمد الحساب على مجموع الساعات الفعلية.") }}
									</p>
								</div>
							</div>
						</template>

						<!-- Form Action Buttons -->
						<div class="flex items-center gap-3 border-t border-slate-100 pt-5 dark:border-neutral-800">
							<button
								type="button"
								class="rounded-xl bg-[#064E3B] px-7 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-[#065F46] disabled:opacity-50"
								:disabled="saving || !form.name.trim()"
								@click="saveModel"
							>
								{{ saving ? t("hr.common.saving", "جاري الحفظ...") : t("hrAttendance.shifts.applyModel", "تطبيق النموذج") }}
							</button>
							<button
								type="button"
								class="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
								@click="resetForm"
							>
								{{ t("hr.common.cancel", "إلغاء") }}
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Approved Models Sidebar Panel (4 cols) matching Image 2 & 3 -->
			<div class="lg:col-span-4 flex flex-col gap-4">
				<div class="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
					<!-- Sidebar Header -->
					<div class="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-neutral-800">
						<h3 class="text-base font-bold text-slate-900 dark:text-white">
							{{ t("hrAttendance.shifts.approvedModels", "النماذج المعتمدة") }}
						</h3>
						<span class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">
							{{ shifts.length }}
						</span>
					</div>

					<!-- List of Approved Shift Cards -->
					<div class="mt-4 flex flex-col gap-3">
						<div
							v-for="shift in shifts"
							:key="shift.id"
							class="group flex flex-col justify-between rounded-xl border p-4 transition-all cursor-pointer"
							:class="[
								selectedShift?.id === shift.id
									? 'border-emerald-600 bg-emerald-50/40 shadow-xs dark:bg-emerald-950/20'
									: 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-neutral-800 dark:bg-neutral-900'
							]"
							@click="selectShift(shift)"
						>
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0 flex-1">
									<h4 class="font-bold text-sm text-slate-900 dark:text-white truncate">
										{{ translated(shift.name) || shift.code }}
									</h4>
									<p class="mt-1 text-xs text-slate-500 dark:text-neutral-400">
										{{ shift.crosses_midnight ? 'دوام ليلي' : 'دوام محدد' }} • {{ formatShiftHours(shift) }}
									</p>
								</div>
							</div>

							<div class="mt-3 flex items-center justify-between border-t border-slate-100/80 pt-2.5 dark:border-neutral-800/80">
								<span class="text-xs text-slate-400 font-mono">{{ shift.starts_at }} - {{ shift.ends_at }}</span>
								<button
									type="button"
									class="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
									@click.stop="confirmDelete(shift)"
								>
									{{ t("hrAttendance.shifts.deleteModel", "حذف النموذج") }}
								</button>
							</div>
						</div>

						<div v-if="shifts.length === 0 && !loading" class="py-8 text-center text-xs text-slate-400">
							{{ t("hrAttendance.shifts.empty", "لا توجد نماذج دوام مسجلة حالياً") }}
						</div>
					</div>

					<!-- New Model Button in Sidebar -->
					<div class="mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800">
						<button
							type="button"
							class="w-full rounded-xl border border-dashed border-emerald-600/40 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50/50 transition-all dark:text-emerald-400 dark:hover:bg-emerald-950/30"
							@click="resetForm"
						>
							+ {{ t("hrAttendance.shifts.newModel", "إضافة نموذج جديد") }}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { ShiftTemplate, WorkPattern } from "@/add-os/modules/hr/types/time"
import { NAlert, NButton, NInput, NInputNumber, NSwitch, NTimePicker, useDialog, useMessage } from "naive-ui"
import { computed, onMounted, reactive, ref } from "vue"
import { useI18n } from "vue-i18n"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { toBilingual } from "@/add-os/modules/hr/utils/forms"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import {
	createAttendancePolicy,
	createShiftTemplate,
	createWorkPattern,
	deleteShiftTemplate,
	listAttendancePolicies,
	listShiftTemplates,
	listWorkPatterns,
	updateShiftTemplate
} from "@/add-os/services/hr/time"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const modelType = ref<"fixed" | "flexible">("fixed")
const shifts = ref<ShiftTemplate[]>([])
const patterns = ref<WorkPattern[]>([])
const selectedShift = ref<ShiftTemplate | null>(null)
const loading = ref(false)
const saving = ref(false)
const loadError = ref(false)

const DAYS_OF_WEEK = [
	{ iso: 7, label: "الأحد" },
	{ iso: 1, label: "الاثنين" },
	{ iso: 2, label: "الثلاثاء" },
	{ iso: 3, label: "الأربعاء" },
	{ iso: 4, label: "الخميس" },
	{ iso: 5, label: "الجمعة" },
	{ iso: 6, label: "السبت" }
]

interface PeriodForm {
	starts_at: string
	ends_at: string
}

const form = reactive({
	name: "",
	days: [7, 1, 2, 3, 4] as number[], // Sunday to Thursday selected by default
	periods: [
		{ starts_at: "08:00", ends_at: "17:00" }
	] as PeriodForm[],
	breakMinutes: 60,
	graceMinutes: 0,
	earlyLeaveGraceMinutes: 0,
	minOvertimeMinutes: 0,
	dailyHours: 8,
	deductBreak: true,
	allowOvertime: true,
	allowFlexiblePunch: false
})

function setModelType(type: "fixed" | "flexible") {
	modelType.value = type
	if (type === "flexible" && !form.name) {
		form.name = "العمل المرن"
	}
}

function toggleDay(isoDay: number) {
	const index = form.days.indexOf(isoDay)
	if (index > -1) {
		if (form.days.length > 1) {
			form.days.splice(index, 1)
		}
	} else {
		form.days.push(isoDay)
	}
}

function addPeriod() {
	form.periods.push({ starts_at: "18:00", ends_at: "22:00" })
}

function removePeriod(index: number) {
	if (form.periods.length > 1) {
		form.periods.splice(index, 1)
	}
}

const netHoursDisplay = computed(() => {
	if (modelType.value === "flexible") {
		return form.dailyHours || 8
	}
	let totalMinutes = 0
	for (const p of form.periods) {
		if (p.starts_at && p.ends_at) {
			const [sh, sm] = p.starts_at.split(":").map(Number)
			const [eh, em] = p.ends_at.split(":").map(Number)
			let mins = (eh * 60 + em) - (sh * 60 + sm)
			if (mins < 0) mins += 24 * 60
			totalMinutes += mins
		}
	}
	if (form.deductBreak && form.breakMinutes) {
		totalMinutes = Math.max(0, totalMinutes - form.breakMinutes)
	}
	return Math.round((totalMinutes / 60) * 10) / 10 || 8
})

function formatShiftHours(shift: ShiftTemplate): string {
	const hours = Math.round(((shift.planned_minutes || 480) / 60) * 10) / 10
	return `${hours} ساعات`
}

function selectShift(shift: ShiftTemplate) {
	selectedShift.value = shift
	modelType.value = "fixed"
	form.name = translated(shift.name) || shift.code
	form.periods = [{ starts_at: shift.starts_at || "08:00", ends_at: shift.ends_at || "17:00" }]
	form.breakMinutes = shift.break_minutes ?? 60
}

function resetForm() {
	selectedShift.value = null
	form.name = ""
	form.days = [7, 1, 2, 3, 4]
	form.periods = [{ starts_at: "08:00", ends_at: "17:00" }]
	form.breakMinutes = 60
	form.graceMinutes = 0
	form.earlyLeaveGraceMinutes = 0
	form.minOvertimeMinutes = 0
	form.dailyHours = 8
	form.deductBreak = true
	form.allowOvertime = true
	form.allowFlexiblePunch = false
}

async function loadData() {
	loading.value = true
	loadError.value = false
	try {
		const [shiftsRes, patternsRes] = await Promise.all([
			listShiftTemplates(),
			listWorkPatterns()
		])
		shifts.value = shiftsRes
		patterns.value = patternsRes
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

onMounted(loadData)

async function saveModel() {
	if (!form.name.trim()) return
	saving.value = true
	try {
		const bilingualName = toBilingual({ ar: form.name, en: form.name })
		const code = form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `shift-${Date.now()}`

		if (modelType.value === "fixed") {
			const primaryPeriod = form.periods[0] || { starts_at: "08:00", ends_at: "17:00" }
			if (selectedShift.value) {
				await updateShiftTemplate(selectedShift.value.id, {
					name: bilingualName,
					starts_at: primaryPeriod.starts_at,
					ends_at: primaryPeriod.ends_at,
					break_minutes: form.breakMinutes
				})
				message.success(t("hrAttendance.shifts.updated", "تم تحديث النموذج بنجاح"))
			} else {
				await createShiftTemplate({
					code,
					name: bilingualName,
					starts_at: primaryPeriod.starts_at,
					ends_at: primaryPeriod.ends_at,
					break_minutes: form.breakMinutes,
					is_active: true
				})
				message.success(t("hrAttendance.shifts.created", "تم حفظ النموذج بنجاح"))
			}
		} else {
			// Flexible shift pattern
			await createWorkPattern({
				code: `flex-${Date.now()}`,
				name: bilingualName,
				kind: "flexible",
				weekly: null,
				weekly_hours: (form.dailyHours || 8) * form.days.length,
				is_active: true
			})
			message.success(t("hrAttendance.shifts.created", "تم حفظ نموذج العمل المرن بنجاح"))
		}

		await loadData()
		resetForm()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError", "حدث خطأ أثناء الحفظ")))
	} finally {
		saving.value = false
	}
}

function confirmDelete(shift: ShiftTemplate) {
	dialog.warning({
		title: t("hrAttendance.shifts.delete", "حذف نموذج الدوام"),
		content: t("hrAttendance.shifts.deleteConfirm", { name: translated(shift.name) || shift.code }, `هل أنت متأكد من حذف ${translated(shift.name) || shift.code}؟`),
		positiveText: t("hr.common.delete", "حذف"),
		negativeText: t("hr.common.cancel", "إلغاء"),
		onPositiveClick: async () => {
			try {
				await deleteShiftTemplate(shift.id)
				message.success(t("hrAttendance.shifts.deleted", "تم حذف النموذج"))
				if (selectedShift.value?.id === shift.id) resetForm()
				await loadData()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}
</script>
