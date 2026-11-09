<!-- src/add-os/modules/hr/views/approvals/ApprovalFlowsPage.vue -->
<template>
	<div class="flex flex-col gap-6">
		<!-- Header / Breadcrumb matching Image 4 -->
		<div class="flex flex-col gap-1">
			<div class="flex items-center gap-1.5 text-xs text-slate-400">
				<span>{{ t("nav.sections.hrSettings", "إعدادات الموارد البشرية") }}</span>
				<Icon name="carbon:chevron-left" :size="12" class="rtl:rotate-0 rotate-180" />
				<span class="font-medium text-slate-700 dark:text-neutral-200">{{ t("nav.pages.hrApprovalFlows", "سلسلة الموافقات") }}</span>
			</div>
			<h1 class="text-2xl font-bold text-slate-900 dark:text-white">
				{{ t("nav.pages.hrApprovalFlows", "سلسلة الموافقات") }}
			</h1>
		</div>

		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" class="rounded-xl" />

		<!-- Request Type Selector Card matching Image 4 -->
		<div class="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
			<h3 class="text-sm font-semibold text-slate-500 dark:text-neutral-400">
				{{ t("hrApprovals.flows.selectTypePrompt", "اختر نوع الطلب لتعيين سلسلة موافقاته") }}
			</h3>

			<!-- Chips / Pills with round dot -->
			<div class="mt-3.5 flex flex-wrap gap-2.5">
				<button
					v-for="type in availableTypes"
					:key="type.key"
					type="button"
					class="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all shadow-xs"
					:class="[
						selectedType === type.key
							? 'bg-[#4F46E5] text-white shadow-indigo-500/20 font-semibold'
							: 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
					]"
					@click="switchType(type.key)"
				>
					<span
						class="h-2 w-2 rounded-full"
						:class="selectedType === type.key ? 'bg-white' : 'bg-indigo-500'"
					/>
					<span>{{ type.label }}</span>
				</button>
			</div>
		</div>

		<!-- Main Approval Chain Flow Card matching Image 4 -->
		<div class="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
			<!-- Header with Request Type & Steps Count Badge -->
			<div class="flex items-center justify-between border-b border-slate-100 pb-5 dark:border-neutral-800">
				<div class="flex items-center gap-3">
					<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
						<Icon name="carbon:document" :size="18" />
					</div>
					<h2 class="text-lg font-bold text-slate-900 dark:text-white">
						{{ currentTypeLabel }}
					</h2>
				</div>

				<div class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
					{{ t("hrApprovals.flows.stagesCount", { n: currentSteps.length }, `${currentSteps.length} مراحل`) }}
				</div>
			</div>

			<!-- Interactive Step Flow Hierarchy -->
			<div class="my-8 flex flex-col items-center">
				<div
					v-for="(step, index) in currentSteps"
					:key="step.id"
					class="flex flex-col items-center w-full max-w-xl"
				>
					<!-- Step Card Container -->
					<div class="w-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-slate-300 dark:border-neutral-800 dark:bg-neutral-900">
						<!-- Step Header -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2.5">
								<span class="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-300">
									{{ index + 1 }}
								</span>
								<span class="text-sm font-bold text-slate-800 dark:text-neutral-200">
									{{ t("hrApprovals.flows.stageTitle", { n: index + 1 }, `مرحلة الموافقة ${index + 1}`) }}
								</span>
							</div>

							<!-- Delete Step Button (disabled if only 1 step) -->
							<button
								v-if="currentSteps.length > 1"
								type="button"
								class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
								:title="t('hrApprovals.flows.removeStep', 'حذف المرحلة')"
								@click="removeStep(index)"
							>
								<Icon name="carbon:close" :size="16" />
							</button>
						</div>

						<!-- Segmented Control: Manager vs Other Person -->
						<div class="mt-4">
							<div class="grid grid-cols-2 rounded-xl border border-slate-200 p-1 dark:border-neutral-700 dark:bg-neutral-800/40">
								<button
									type="button"
									class="rounded-lg py-2.5 text-xs font-bold transition-all text-center"
									:class="[
										step.approverCategory === 'manager'
											? 'bg-[#4F46E5] text-white shadow-sm'
											: 'text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white'
									]"
									@click="setApproverCategory(step, 'manager')"
								>
									{{ t("hrApprovals.approverType.direct_manager", "المدير المباشر") }}
								</button>
								<button
									type="button"
									class="rounded-lg py-2.5 text-xs font-bold transition-all text-center"
									:class="[
										step.approverCategory === 'other'
											? 'bg-[#4F46E5] text-white shadow-sm'
											: 'text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white'
									]"
									@click="setApproverCategory(step, 'other')"
								>
									{{ t("hrApprovals.flows.otherPerson", "شخص آخر") }}
								</button>
							</div>

							<!-- Other Person details dropdown if 'other' is selected -->
							<div v-if="step.approverCategory === 'other'" class="mt-3 flex flex-col gap-2">
								<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
									<n-select
										v-model:value="step.specificType"
										size="small"
										:options="otherTypeOptions"
										:placeholder="t('hrApprovals.flows.selectRoleType', 'نوع الصلاحية')"
									/>
									<n-select
										v-if="step.specificType === 'ability'"
										v-model:value="step.ability"
										size="small"
										:options="abilityOptions"
										filterable
										:placeholder="t('hrApprovals.flows.ability', 'حدد الصلاحية المطلوبة')"
									/>
									<EmployeeSelect
										v-else-if="step.specificType === 'employee'"
										v-model:value="step.employeeId"
										size="small"
										:placeholder="t('hrApprovals.flows.selectEmployee', 'اختر موظفاً')"
									/>
								</div>
							</div>
						</div>
					</div>

					<!-- Visual Connector Line with (+) Circle Button -->
					<div class="relative my-2 flex flex-col items-center">
						<div class="h-6 w-0.5 bg-indigo-200 dark:bg-indigo-900/60" />
						<button
							type="button"
							class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-indigo-500 bg-white text-indigo-600 shadow-sm transition-all hover:bg-indigo-50 hover:scale-110 dark:bg-neutral-900 dark:text-indigo-400"
							:title="t('hrApprovals.flows.insertStep', 'إضافة مرحلة موافقة')"
							@click="insertStep(index + 1)"
						>
							<Icon name="carbon:add" :size="14" />
						</button>
						<div class="h-6 w-0.5 bg-indigo-200 dark:bg-indigo-900/60" />
					</div>
				</div>
			</div>

			<!-- Bottom Save Button matching Image 4 -->
			<div class="flex justify-start border-t border-slate-100 pt-5 dark:border-neutral-800">
				<button
					type="button"
					class="inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-7 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-[#4338CA] disabled:opacity-50"
					:disabled="saving"
					@click="saveFlow"
				>
					<Icon name="carbon:checkmark" :size="18" />
					<span>{{ saving ? t("hr.common.saving", "جاري الحفظ...") : t("hrApprovals.flows.saveChain", "حفظ سلسلة الموافقات") }}</span>
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { ApprovalFlow, FlowStep } from "@/add-os/modules/hr/types/approvals"
import { NAlert, NSelect, useMessage } from "naive-ui"
import { computed, onMounted, reactive, ref } from "vue"
import { useI18n } from "vue-i18n"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import { HR_ABILITIES } from "@/add-os/modules/hr/types/approvals"
import { abilityLabel } from "@/add-os/modules/hr/utils/approvalLabels"
import { requestTypeLabel } from "@/add-os/modules/hr/utils/approvalSummary"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { toBilingual } from "@/add-os/modules/hr/utils/forms"
import { ApiError } from "@/add-os/services/api"
import {
	createApprovalFlow,
	listApprovalFlows,
	listApprovalTypes,
	updateApprovalFlow
} from "@/add-os/services/hr/approvals"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()

const flows = ref<ApprovalFlow[]>([])
const rawTypes = ref<string[]>([])
const selectedType = ref<string>("loan")
const loading = ref(false)
const saving = ref(false)
const loadError = ref(false)

interface StepUi {
	id: string
	approverCategory: "manager" | "other"
	specificType: "unit_head" | "ability" | "employee"
	ability: string | null
	employeeId: number | null
	timeoutHours: number | null
}

const stepsByType = reactive<Record<string, StepUi[]>>({})

const DEFAULT_TYPES = [
	{ key: "loan", label: "طلب سلفة" },
	{ key: "leave", label: "طلب إجازة" },
	{ key: "custody", label: "طلب عهدة" },
	{ key: "resignation", label: "طلب استقالة" }
]

const availableTypes = computed(() => {
	const map = new Map<string, string>()
	for (const dt of DEFAULT_TYPES) {
		map.set(dt.key, dt.label)
	}
	for (const rt of rawTypes.value) {
		if (!map.has(rt)) {
			map.set(rt, requestTypeLabel(t, rt))
		}
	}
	return Array.from(map.entries()).map(([key, label]) => ({ key, label }))
})

const currentTypeLabel = computed(() => {
	const found = availableTypes.value.find(t => t.key === selectedType.value)
	return found?.label || requestTypeLabel(t, selectedType.value)
})

const currentSteps = computed(() => {
	if (!stepsByType[selectedType.value]) {
		stepsByType[selectedType.value] = [
			{ id: "1", approverCategory: "manager", specificType: "ability", ability: "hr.approvals.manage", employeeId: null, timeoutHours: null },
			{ id: "2", approverCategory: "manager", specificType: "ability", ability: "hr.approvals.manage", employeeId: null, timeoutHours: null }
		]
	}
	return stepsByType[selectedType.value]
})

const otherTypeOptions: SelectOption[] = [
	{ value: "ability", label: "صاحب صلاحية محددة" },
	{ value: "unit_head", label: "رئيس القسم" },
	{ value: "employee", label: "موظف محدد" }
]

const abilityOptions = computed<SelectOption[]>(() =>
	HR_ABILITIES.map(ability => ({ value: ability, label: abilityLabel(t, ability) }))
)

function setApproverCategory(step: StepUi, cat: "manager" | "other") {
	step.approverCategory = cat
}

function switchType(typeKey: string) {
	selectedType.value = typeKey
}

function insertStep(index: number) {
	const list = stepsByType[selectedType.value]
	list.splice(index, 0, {
		id: String(Date.now()),
		approverCategory: "manager",
		specificType: "ability",
		ability: "hr.approvals.manage",
		employeeId: null,
		timeoutHours: null
	})
}

function removeStep(index: number) {
	const list = stepsByType[selectedType.value]
	if (list.length > 1) {
		list.splice(index, 1)
	}
}

async function load() {
	loading.value = true
	loadError.value = false
	try {
		const [flowsRes, typesRes] = await Promise.all([
			listApprovalFlows(),
			listApprovalTypes()
		])
		flows.value = flowsRes
		rawTypes.value = typesRes

		// Populate steps from existing flows
		for (const flow of flowsRes) {
			stepsByType[flow.request_type] = flow.steps.map(s => ({
				id: String(s.id),
				approverCategory: s.approver_type === "direct_manager" ? "manager" : "other",
				specificType: (s.approver_type === "direct_manager" ? "ability" : s.approver_type) as "unit_head" | "ability" | "employee",
				ability: s.required_ability || null,
				employeeId: s.approver_employee_id || null,
				timeoutHours: s.timeout_hours || null
			}))
		}
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

onMounted(load)

async function saveFlow() {
	saving.value = true
	try {
		const steps = currentSteps.value.map((s, idx) => ({
			order: idx + 1,
			approver_type: s.approverCategory === "manager" ? "direct_manager" : s.specificType,
			required_ability: s.approverCategory === "other" && s.specificType === "ability" ? s.ability : null,
			approver_employee_id: s.approverCategory === "other" && s.specificType === "employee" ? s.employeeId : null,
			timeout_hours: s.timeoutHours,
			on_timeout: "escalate" as const
		}))

		const existing = flows.value.find(f => f.request_type === selectedType.value)
		const label = currentTypeLabel.value
		const bilingualName = toBilingual({ ar: `سلسلة موافقات ${label}`, en: `${label} Approval Flow` })

		if (existing) {
			await updateApprovalFlow(existing.id, {
				name: bilingualName,
				is_active: true,
				steps
			})
		} else {
			await createApprovalFlow({
				request_type: selectedType.value,
				name: bilingualName,
				is_active: true,
				steps
			})
		}

		message.success(t("hrApprovals.flows.savedSuccess", "تم حفظ سلسلة الموافقات بنجاح"))
		await load()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError", "حدث خطأ أثناء الحفظ")))
	} finally {
		saving.value = false
	}
}
</script>
