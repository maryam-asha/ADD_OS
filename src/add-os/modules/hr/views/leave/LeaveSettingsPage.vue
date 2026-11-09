<!-- src/add-os/modules/hr/views/leave/LeaveSettingsPage.vue -->
<template>
	<div class="flex flex-col gap-6">
		<!-- Top Breadcrumb & Page Title -->
		<div class="flex flex-col gap-1">
			<div class="flex items-center gap-1.5 text-xs text-slate-400">
				<span>{{ t("nav.sections.hrSettings", "إعدادات الموارد البشرية") }}</span>
				<Icon name="carbon:chevron-left" :size="12" class="rtl:rotate-0 rotate-180" />
				<span class="font-medium text-slate-700 dark:text-neutral-200">{{ t("nav.pages.hrLeaveSettings", "إعدادات الإجازات") }}</span>
			</div>
			<h1 class="text-2xl font-bold text-slate-900 dark:text-white">
				{{ t("nav.pages.hrLeaveSettings", "إعدادات الإجازات") }}
			</h1>
		</div>

		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" class="rounded-xl" />

		<!-- Quick Add Top Bar Card matching Image 5 -->
		<div class="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
			<h3 class="mb-3 text-sm font-bold text-slate-800 dark:text-neutral-200">
				{{ t("hrLeave.types.quickAddTitle", "إضافة نوع إجازة") }}
			</h3>
			<div class="flex flex-wrap items-center gap-4">
				<div class="min-w-[260px] flex-1">
					<n-input
						v-model:value="newTypeName"
						size="large"
						class="rounded-xl"
						:placeholder="t('hrLeave.types.namePlaceholder', 'مثال: الإجازة السنوية')"
						@keyup.enter="quickAddType"
					/>
				</div>

				<!-- Calendar Color Picker -->
				<div class="flex items-center gap-2">
					<span class="text-xs font-semibold text-slate-600 dark:text-neutral-400">
						{{ t("hrLeave.types.calendarColor", "لون التقويم") }}
					</span>
					<n-color-picker
						v-model:value="newTypeColor"
						:show-alpha="false"
						:swatches="['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#064E3B']"
						class="w-12 !h-10"
					/>
				</div>

				<!-- Add Type Button -->
				<button
					type="button"
					class="rounded-xl bg-[#064E3B] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#065F46] disabled:opacity-50"
					:disabled="adding || !newTypeName.trim()"
					@click="quickAddType"
				>
					{{ adding ? t("hr.common.saving", "جاري الإضافة...") : t("hrLeave.types.addBtn", "إضافة النوع") }}
				</button>
			</div>
		</div>

		<!-- Main 2-Column Master-Detail Layout matching Image 5 -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
			<!-- Main Detailed Leave Settings Card (8 cols) -->
			<div class="lg:col-span-8 flex flex-col gap-6">
				<div
					v-if="selectedType"
					class="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
				>
					<!-- Header: Type Name, Counter Badge (1 من 1), and Close/Delete Button -->
					<div class="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-neutral-800">
						<div class="flex items-center gap-3">
							<h2 class="text-lg font-bold text-slate-900 dark:text-white">
								{{ translated(selectedType.name) || selectedType.code }}
							</h2>
							<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">
								{{ selectedIndex + 1 }} {{ t("hr.common.of", "من") }} {{ leaveTypes.length }}
							</span>
						</div>

						<button
							type="button"
							class="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
							:title="t('hrLeave.types.delete', 'حذف نوع الإجازة')"
							@click="confirmDeleteType(selectedType)"
						>
							<Icon name="carbon:close" :size="18" />
						</button>
					</div>

					<!-- Form Content -->
					<div class="mt-6 flex flex-col gap-6">
						<!-- Leave Type Name Field with Color Square -->
						<div>
							<label class="mb-2 block text-xs font-semibold text-slate-600 dark:text-neutral-300">
								{{ t("hrLeave.types.typeName", "اسم نوع الإجازة") }}
							</label>
							<div class="flex items-center gap-3">
								<n-input
									v-model:value="editForm.name"
									size="large"
									class="flex-1 rounded-xl"
								/>
								<div
									class="h-10 w-10 shrink-0 rounded-xl border border-slate-200 shadow-xs"
									:style="{ backgroundColor: editForm.color || '#8B5CF6' }"
								/>
							</div>
						</div>

						<!-- 4 Grouped Configuration Cards (2x2 Grid) matching Image 5 -->
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<!-- 1. الرصيد والاستحقاق -->
							<div class="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-800/30">
								<h4 class="text-xs font-bold text-slate-800 dark:text-neutral-200">
									{{ t("hrLeave.settings.balanceAndAccrual", "الرصيد والاستحقاق") }}
								</h4>

								<div class="flex items-center justify-between gap-2">
									<span class="text-xs font-medium text-slate-700 dark:text-neutral-300">
										{{ t("hrLeave.types.tracksBalance", "هذا النوع له رصيد") }}
									</span>
									<n-switch v-model:value="editForm.tracksBalance" />
								</div>

								<div class="grid grid-cols-2 gap-2">
									<div>
										<label class="mb-1 block text-[11px] font-semibold text-slate-500">
											{{ t("hrLeave.policies.entitlementDays", "عدد الأيام المستحقة") }}
										</label>
										<n-input-number
											v-model:value="editForm.annualEntitlement"
											:min="0"
											:max="365"
											size="small"
											:disabled="!editForm.tracksBalance"
										>
											<template #suffix><span class="text-xs text-slate-400">يوم</span></template>
										</n-input-number>
									</div>
									<div>
										<label class="mb-1 block text-[11px] font-semibold text-slate-500">
											{{ t("hrLeave.policies.accrualMethod", "طريقة الاستحقاق") }}
										</label>
										<n-select
											v-model:value="editForm.accrualMethod"
											:options="accrualOptions"
											size="small"
											:disabled="!editForm.tracksBalance"
										/>
									</div>
								</div>

								<div class="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-neutral-800">
									<span class="text-xs font-medium text-slate-700 dark:text-neutral-300">
										{{ t("hrLeave.policies.allowNegativeWithAlert", "السماح بتجاوز الرصيد مع تنبيه") }}
									</span>
									<n-switch v-model:value="editForm.allowNegative" :disabled="!editForm.tracksBalance" />
								</div>
							</div>

							<!-- 2. احتساب مدة الإجازة -->
							<div class="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-800/30">
								<h4 class="text-xs font-bold text-slate-800 dark:text-neutral-200">
									{{ t("hrLeave.settings.durationCalculation", "احتساب مدة الإجازة") }}
								</h4>

								<div class="flex items-center justify-between gap-2">
									<span class="text-xs font-medium text-slate-700 dark:text-neutral-300">
										{{ t("hrLeave.types.countsHolidays", "احتساب العطل الرسمية ضمن الإجازة") }}
									</span>
									<n-switch v-model:value="editForm.countsCalendarDays" />
								</div>
							</div>

							<!-- 3. ضوابط الطلب -->
							<div class="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-800/30">
								<h4 class="text-xs font-bold text-slate-800 dark:text-neutral-200">
									{{ t("hrLeave.settings.requestControls", "ضوابط الطلب") }}
								</h4>

								<div class="flex items-center justify-between gap-2">
									<span class="text-xs font-medium text-slate-700 dark:text-neutral-300">
										{{ t("hrLeave.types.isPaid", "إجازة مدفوعة") }}
									</span>
									<n-switch v-model:value="editForm.isPaid" />
								</div>

								<div class="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-neutral-800">
									<span class="text-xs font-medium text-slate-700 dark:text-neutral-300">
										{{ t("hrLeave.types.attachmentRequired", "المرفق مطلوب") }}
									</span>
									<n-switch v-model:value="editForm.requiresAttachment" />
								</div>

								<div class="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-neutral-800">
									<div>
										<label class="mb-1 block text-[11px] font-semibold text-slate-500">
											{{ t("hrLeave.types.minDays", "الحد الأدنى للطلب") }}
										</label>
										<n-input-number v-model:value="editForm.minDays" :min="1" :max="90" size="small">
											<template #suffix><span class="text-xs text-slate-400">يوم</span></template>
										</n-input-number>
									</div>
									<div>
										<label class="mb-1 block text-[11px] font-semibold text-slate-500">
											{{ t("hrLeave.types.maxDays", "الحد الأقصى للطلب") }}
										</label>
										<n-input-number v-model:value="editForm.maxDays" :min="0" :max="365" size="small">
											<template #suffix><span class="text-xs text-slate-400">يوم</span></template>
										</n-input-number>
									</div>
								</div>
							</div>

							<!-- 4. ترحيل الرصيد -->
							<div class="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-800/30">
								<h4 class="text-xs font-bold text-slate-800 dark:text-neutral-200">
									{{ t("hrLeave.settings.carryForward", "ترحيل الرصيد") }}
								</h4>

								<div class="flex items-center justify-between gap-2">
									<span class="text-xs font-medium text-slate-700 dark:text-neutral-300">
										{{ t("hrLeave.policies.allowCarryOver", "السماح بترحيل الرصيد") }}
									</span>
									<n-switch v-model:value="editForm.allowCarryOver" />
								</div>
							</div>
						</div>

						<!-- Bottom Action Buttons -->
						<div class="flex items-center gap-3 border-t border-slate-100 pt-5 dark:border-neutral-800">
							<button
								type="button"
								class="rounded-xl bg-[#064E3B] px-7 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-[#065F46] disabled:opacity-50"
								:disabled="saving"
								@click="saveTypeSettings"
							>
								{{ saving ? t("hr.common.saving", "جاري الحفظ...") : t("hrLeave.settings.saveSettings", "حفظ الإعدادات") }}
							</button>
							<button
								type="button"
								class="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
								@click="resetEditForm"
							>
								{{ t("hr.common.cancel", "إلغاء") }}
							</button>
						</div>
					</div>
				</div>

				<div v-else class="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-400 dark:border-neutral-700">
					{{ t("hrLeave.types.selectOrCreatePrompt", "اختر نوع إجازة من القائمة أو أضف نوعاً جديداً") }}
				</div>
			</div>

			<!-- Leave Types List Sidebar Panel (4 cols) matching Image 5 -->
			<div class="lg:col-span-4 flex flex-col gap-4">
				<div class="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
					<!-- Sidebar Header -->
					<div class="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-neutral-800">
						<h3 class="text-base font-bold text-slate-900 dark:text-white">
							{{ t("hrLeave.types.title", "أنواع الإجازات") }}
						</h3>
						<span class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">
							{{ leaveTypes.length }}
						</span>
					</div>

					<!-- List of Leave Types Cards -->
					<div class="mt-4 flex flex-col gap-3">
						<div
							v-for="type in leaveTypes"
							:key="type.id"
							class="group flex items-center justify-between rounded-xl border p-3.5 transition-all cursor-pointer"
							:class="[
								selectedType?.id === type.id
									? 'border-emerald-600 bg-emerald-50/40 shadow-xs dark:bg-emerald-950/20'
									: 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-neutral-800 dark:bg-neutral-900'
							]"
							@click="selectType(type)"
						>
							<div class="flex items-center gap-3 min-w-0 flex-1">
								<span
									class="h-3 w-3 shrink-0 rounded-full"
									:style="{ backgroundColor: getTypeColor(type) }"
								/>
								<div class="min-w-0 flex-1">
									<h4 class="font-bold text-sm text-slate-900 dark:text-white truncate">
										{{ translated(type.name) || type.code }}
									</h4>
									<p class="text-xs text-slate-500 dark:text-neutral-400">
										{{ type.is_paid ? 'مدفوعة' : 'غير مدفوعة' }} • {{ getPolicyDays(type) }} يوم
									</p>
								</div>
							</div>

							<div class="text-slate-400 rtl:rotate-180">
								<Icon name="carbon:chevron-right" :size="16" />
							</div>
						</div>

						<div v-if="leaveTypes.length === 0 && !loading" class="py-8 text-center text-xs text-slate-400">
							{{ t("hrLeave.types.empty", "لا توجد أنواع إجازات مسجلة") }}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { LeavePolicy, LeaveType } from "@/add-os/modules/hr/types/leave"
import { NAlert, NColorPicker, NInput, NInputNumber, NSelect, NSwitch, useDialog, useMessage } from "naive-ui"
import { computed, onMounted, reactive, ref } from "vue"
import { useI18n } from "vue-i18n"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { toBilingual } from "@/add-os/modules/hr/utils/forms"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import {
	createLeavePolicy,
	createLeaveType,
	deleteLeaveType,
	listLeavePolicies,
	listLeaveTypes,
	updateLeavePolicy,
	updateLeaveType
} from "@/add-os/services/hr/leave"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const leaveTypes = ref<LeaveType[]>([])
const leavePolicies = ref<LeavePolicy[]>([])
const selectedType = ref<LeaveType | null>(null)
const loading = ref(false)
const adding = ref(false)
const saving = ref(false)
const loadError = ref(false)

const newTypeName = ref("")
const newTypeColor = ref("#8B5CF6")

const accrualOptions: SelectOption[] = [
	{ value: "annual_grant", label: "سنوي" },
	{ value: "monthly", label: "شهري" },
	{ value: "none", label: "بدون استحقاق" }
]

const editForm = reactive({
	name: "",
	color: "#8B5CF6",
	tracksBalance: true,
	annualEntitlement: 25,
	accrualMethod: "annual_grant",
	allowNegative: false,
	countsCalendarDays: false,
	isPaid: true,
	requiresAttachment: false,
	minDays: 1,
	maxDays: 0,
	allowCarryOver: false
})

const selectedIndex = computed(() => {
	if (!selectedType.value) return 0
	return leaveTypes.value.findIndex(t => t.id === selectedType.value?.id)
})

function getTypeColor(type: LeaveType): string {
	const colors = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"]
	return colors[type.id % colors.length]
}

function getPolicyDays(type: LeaveType): string | number {
	const policy = leavePolicies.value.find(p => p.leave_type_id === type.id)
	return policy?.annual_entitlement ? Math.round(Number(policy.annual_entitlement)) : 25
}

function selectType(type: LeaveType) {
	selectedType.value = type
	const policy = leavePolicies.value.find(p => p.leave_type_id === type.id)
	editForm.name = translated(type.name) || type.code
	editForm.color = getTypeColor(type)
	editForm.tracksBalance = type.tracks_balance ?? true
	editForm.countsCalendarDays = type.counts_calendar_days ?? false
	editForm.isPaid = type.is_paid ?? true
	editForm.requiresAttachment = type.requires_attachment ?? false
	editForm.annualEntitlement = policy ? Math.round(Number(policy.annual_entitlement)) : 25
	editForm.accrualMethod = policy?.accrual_method || "annual_grant"
	editForm.allowNegative = policy ? Number(policy.max_negative) > 0 : false
	editForm.allowCarryOver = policy ? Number(policy.carry_over_max) > 0 : false
}

function resetEditForm() {
	if (selectedType.value) selectType(selectedType.value)
}

async function loadData() {
	loading.value = true
	loadError.value = false
	try {
		const [typesRes, policiesRes] = await Promise.all([
			listLeaveTypes(),
			listLeavePolicies()
		])
		leaveTypes.value = typesRes
		leavePolicies.value = policiesRes
		if (typesRes.length > 0 && !selectedType.value) {
			selectType(typesRes[0])
		}
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

onMounted(loadData)

async function quickAddType() {
	if (!newTypeName.value.trim()) return
	adding.value = true
	try {
		const name = newTypeName.value.trim()
		const code = `leave-${Date.now().toString(36)}`
		const bilingualName = toBilingual({ ar: name, en: name })

		const created = await createLeaveType({
			code,
			name: bilingualName,
			unit: "day",
			is_paid: true,
			tracks_balance: true,
			allows_half_day: true,
			counts_calendar_days: false,
			hide_reason: false,
			attachment_document_type_id: null,
			is_active: true
		})

		// Also create a default policy for this leave type
		await createLeavePolicy({
			leave_type_id: created.id,
			name: bilingualName,
			effective_from: "2026-01-01",
			effective_to: null,
			accrual_method: "annual_grant",
			annual_entitlement: 25,
			service_tiers: null,
			carry_over_max: null,
			carry_over_expiry_months: null
		}).catch(() => {})

		message.success(t("hrLeave.types.created", "تمت إضافة نوع الإجازة بنجاح"))
		newTypeName.value = ""
		await loadData()
		selectType(created)
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError", "حدث خطأ أثناء الإضافة")))
	} finally {
		adding.value = false
	}
}

async function saveTypeSettings() {
	if (!selectedType.value) return
	saving.value = true
	try {
		const bilingualName = toBilingual({ ar: editForm.name, en: editForm.name })

		await updateLeaveType(selectedType.value.id, {
			name: bilingualName,
			is_paid: editForm.isPaid,
			tracks_balance: editForm.tracksBalance,
			counts_calendar_days: editForm.countsCalendarDays,
			attachment_document_type_id: editForm.requiresAttachment ? 1 : null,
			is_active: true
		})

		const existingPolicy = leavePolicies.value.find(p => p.leave_type_id === selectedType.value?.id)
		if (existingPolicy) {
			await updateLeavePolicy(existingPolicy.id, {
				annual_entitlement: editForm.annualEntitlement,
				accrual_method: editForm.accrualMethod as "monthly" | "annual_grant" | "none",
				carry_over_max: editForm.allowCarryOver ? 10 : null
			}).catch(() => {})
		}

		message.success(t("hrLeave.types.updated", "تم حفظ إعدادات الإجازة بنجاح"))
		await loadData()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError", "حدث خطأ أثناء الحفظ")))
	} finally {
		saving.value = false
	}
}

function confirmDeleteType(type: LeaveType) {
	dialog.warning({
		title: t("hrLeave.types.delete", "حذف نوع الإجازة"),
		content: t("hrLeave.types.deleteWarning", { name: translated(type.name) || type.code }, `هل أنت متأكد من حذف ${translated(type.name) || type.code}؟`),
		positiveText: t("hr.common.delete", "حذف"),
		negativeText: t("hr.common.cancel", "إلغاء"),
		onPositiveClick: async () => {
			try {
				await deleteLeaveType(type.id)
				message.success(t("hrLeave.types.deleted", "تم حذف نوع الإجازة"))
				selectedType.value = null
				await loadData()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}
</script>
