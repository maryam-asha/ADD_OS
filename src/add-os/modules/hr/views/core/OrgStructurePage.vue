<!-- src/add-os/modules/hr/views/core/OrgStructurePage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.orgStructure')" :description="t('hr.org.description')" />

		<n-tabs v-model:value="tab" type="line" animated>
			<n-tab-pane name="units" :tab="t('hr.org.tabs.units')" display-directive="show:lazy">
				<div class="flex flex-col gap-4">
					<div v-if="mayManage" class="flex justify-end">
						<n-button type="primary" @click="openCreate(null)">
							<template #icon><Icon name="carbon:add" :size="16" /></template>
							{{ t("hr.org.addUnit") }}
						</n-button>
					</div>

					<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />

					<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
						<HrPanel class="lg:col-span-1" :title="t('hr.org.tabs.units')" icon="carbon:tree-view">
							<n-spin :show="loading">
								<n-tree
									v-if="treeData.length"
									:data="treeData"
									:selected-keys="selectedId === null ? [] : [selectedId]"
									block-line
									default-expand-all
									@update:selected-keys="onSelect"
								/>
								<p v-else-if="!loading" class="text-secondary">{{ mayManage ? t("hr.org.emptyManage") : t("hr.org.empty") }}</p>
							</n-spin>
						</HrPanel>

						<HrPanel class="lg:col-span-2">
							<template v-if="selected">
								<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
									<div class="flex flex-wrap items-center gap-3">
										<h2 class="text-lg font-semibold">{{ translated(selected.name) }}</h2>
										<span v-if="selected.code" class="font-mono text-secondary" dir="ltr">{{ selected.code }}</span>
										<ActiveTag :active="selected.is_active" />
									</div>
									<div v-if="mayManage" class="flex flex-wrap gap-2">
										<n-button size="small" @click="openCreate(selected.id)">
											<template #icon><Icon name="carbon:add" :size="16" /></template>
											{{ t("hr.org.addChild") }}
										</n-button>
										<n-button size="small" @click="openEdit(selected)">
											<template #icon><Icon name="carbon:edit" :size="16" /></template>
											{{ t("hr.common.edit") }}
										</n-button>
										<n-button size="small" type="error" secondary :loading="deletingUnit" @click="confirmDeleteUnit(selected)">
											<template #icon><Icon name="carbon:trash-can" :size="16" /></template>
											{{ t("hr.common.delete") }}
										</n-button>
									</div>
								</div>

								<div class="mb-2 flex items-center justify-between gap-3">
									<h3 class="font-semibold">{{ t("hr.org.positions") }}</h3>
									<n-button v-if="mayManage" size="small" @click="openPosition(null)">
										<template #icon><Icon name="carbon:add" :size="16" /></template>
										{{ t("hr.positions.add") }}
									</n-button>
								</div>
								<n-data-table :columns="positionColumns" :data="positions" :loading="positionsLoading" :bordered="false" size="small" :scroll-x="560">
									<template #empty>
										<span class="text-secondary">{{ mayManage ? t("hr.org.noPositionsManage") : t("hr.org.noPositions") }}</span>
									</template>
								</n-data-table>
							</template>
							<p v-else class="text-secondary">{{ t("hr.org.selectUnit") }}</p>
						</HrPanel>
					</div>
				</div>
			</n-tab-pane>

			<n-tab-pane name="grades" :tab="t('hr.org.tabs.grades')" display-directive="show:lazy">
				<HrResourcePanel
					:api="gradesApi"
					:columns="gradeColumns"
					:fields="gradeFields"
					:empty-form="emptyJobGradeForm"
					:to-form="gradeToForm"
					:to-payload="gradeToPayload"
					:can-manage="mayManage"
					:description="t('hr.grades.description')"
					:labels="{
						add: t('hr.grades.add'),
						createTitle: t('hr.grades.add'),
						editTitle: t('hr.grades.edit'),
						created: t('hr.grades.created'),
						updated: t('hr.grades.updated'),
						deleted: t('hr.grades.deleted')
					}"
				/>
			</n-tab-pane>
		</n-tabs>

		<HrFormModal v-model:show="formVisible" :title="editingId === null ? t('hr.org.addUnit') : t('hr.org.editUnit')" size="md" icon="carbon:tree-view">
			<n-form ref="formRef" :model="form" :rules label-placement="top">
				<n-form-item path="code" :label="t('hr.org.code')">
					<n-input v-model:value="form.code" dir="ltr" />
				</n-form-item>
				<n-form-item path="nameAr" :label="t('hr.org.nameAr')">
					<n-input v-model:value="form.nameAr" />
				</n-form-item>
				<n-form-item path="nameEn" :label="t('hr.org.nameEn')">
					<n-input v-model:value="form.nameEn" />
				</n-form-item>
				<n-form-item path="parentId" :label="t('hr.org.parent')">
					<n-select v-model:value="form.parentId" :options="parentOptions" :placeholder="t('hr.org.noParent')" clearable filterable />
				</n-form-item>
				<n-form-item v-if="editingId !== null" path="isActive" :label="t('hr.org.isActive')">
					<n-switch v-model:value="form.isActive" />
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="formVisible = false">{{ t("hr.common.cancel") }}</n-button>
					<n-button type="primary" :loading="saving" @click="save">
						<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
						{{ t("hr.common.save") }}
					</n-button>
				</div>
			</template>
		</HrFormModal>

		<PositionFormModal
			v-if="mayManage"
			v-model:show="positionVisible"
			:position="editingPosition"
			:org-unit-id="selectedId"
			:units="flatUnits"
			:grades
			@saved="reloadPositions"
		/>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, FormInst, FormRules, SelectOption, TreeOption } from "naive-ui"
import type { JobGradeForm } from "@/add-os/modules/hr/config/core.config"
import type { JobGrade, JobGradePayload, OrgUnit, Position } from "@/add-os/modules/hr/types/hr"
import { NAlert, NButton, NDataTable, NForm, NFormItem, NInput, NSelect, NSpin, NSwitch, NTabPane, NTabs, NTree, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canManageOrgStructure } from "@/add-os/config/permissions"
import ActiveTag from "@/add-os/modules/hr/components/ActiveTag.vue"
import HrResourcePanel from "@/add-os/modules/hr/components/core/HrResourcePanel.vue"
import PositionFormModal from "@/add-os/modules/hr/components/core/PositionFormModal.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { buildJobGradeColumns, buildJobGradeFields, emptyJobGradeForm } from "@/add-os/modules/hr/config/core.config"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable, toBilingual, toTranslatable } from "@/add-os/modules/hr/utils/forms"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import {
	createJobGrade,
	createOrgUnit,
	deleteJobGrade,
	deleteOrgUnit,
	deletePosition,
	listJobGrades,
	listPositions,
	orgTree,
	updateJobGrade,
	updateOrgUnit
} from "@/add-os/services/hr/core"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const mayManage = canManageOrgStructure()
const tab = ref<"units" | "grades">("units")

// ── Tree ────────────────────────────────────────────────────────────────────
const tree = ref<OrgUnit[]>([])
const loading = ref(true)
const loadError = ref(false)
const selectedId = ref<number | null>(null)
const grades = ref<JobGrade[]>([])

async function load() {
	loading.value = true
	loadError.value = false
	try {
		tree.value = await orgTree()
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

/** Grades name a position's level in its table and form. */
async function loadGrades() {
	try {
		grades.value = await listJobGrades()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
}

onMounted(() => {
	void load()
	void loadGrades()
})

// A grade edited on its tab shows in the positions table on the way back.
watch(tab, current => {
	if (current === "units") void loadGrades()
})

/** Every unit, flattened, so a selection and the parent picker can find any of them. */
const flatUnits = computed<OrgUnit[]>(() => {
	const out: OrgUnit[] = []
	const walk = (units: OrgUnit[]) =>
		units.forEach(unit => {
			out.push(unit)
			walk(unit.children ?? [])
		})
	walk(tree.value)
	return out
})

function toTreeOption(unit: OrgUnit): TreeOption {
	const children = (unit.children ?? []).map(toTreeOption)
	return {
		key: unit.id,
		label: unit.is_active ? translated(unit.name) : `${translated(unit.name)} (${t("hr.common.inactive")})`,
		children: children.length ? children : undefined
	}
}

const treeData = computed<TreeOption[]>(() => tree.value.map(toTreeOption))
const selected = computed(() => flatUnits.value.find(u => u.id === selectedId.value) ?? null)

// ── Positions of the selected unit ──────────────────────────────────────────
const positions = ref<Position[]>([])
const positionsLoading = ref(false)

async function onSelect(keys: Array<string | number>) {
	selectedId.value = keys.length ? Number(keys[0]) : null
	await reloadPositions()
}

async function reloadPositions() {
	positions.value = []
	if (selectedId.value === null) return
	positionsLoading.value = true
	try {
		positions.value = await listPositions(selectedId.value)
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		positionsLoading.value = false
	}
}

const positionVisible = ref(false)
const editingPosition = ref<Position | null>(null)

function openPosition(position: Position | null) {
	editingPosition.value = position
	positionVisible.value = true
}

function confirmDeletePosition(position: Position) {
	dialog.warning({
		title: t("hr.positions.delete"),
		content: t("hr.positions.deleteConfirm", { name: translated(position.title) }),
		positiveText: t("hr.common.delete"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			try {
				await deletePosition(position.id)
				message.success(t("hr.positions.deleted"))
				await reloadPositions()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

function gradeLabel(id: number | null): string {
	const grade = grades.value.find(g => g.id === id)
	return grade ? `${grade.code} · ${translated(grade.name)}` : EMPTY
}

function iconButton(label: string, icon: string, type: "primary" | "error", onClick: () => void) {
	return h(NButton, { text: true, type, "aria-label": label, title: label, onClick }, { icon: () => h(Icon, { name: icon, size: 18 }) })
}

const positionColumns = computed<DataTableColumns<Position>>(() => [
	{ title: t("hr.org.code"), key: "code", minWidth: 100, render: row => (row.code ? h("span", { class: "font-mono", dir: "ltr" }, row.code) : EMPTY) },
	{
		title: t("hr.org.positionTitle"),
		key: "title",
		minWidth: 180,
		render: row => (row.is_active ? translated(row.title) : `${translated(row.title)} (${t("hr.common.inactive")})`)
	},
	{ title: t("hr.hire.jobGrade"), key: "job_grade_id", minWidth: 140, render: row => gradeLabel(row.job_grade_id) },
	{ title: t("hr.org.headcount"), key: "headcount", minWidth: 80, align: "center", render: row => formatNumber(row.headcount) },
	{ title: t("hr.org.occupied"), key: "occupied", minWidth: 80, align: "center", render: row => formatNumber(row.occupied) },
	...(mayManage
		? [
				{
					title: t("hr.employees.columns.actions"),
					key: "actions",
					width: 100,
					align: "center" as const,
					render: (row: Position) =>
						h("div", { class: "flex justify-center gap-3" }, [
							iconButton(t("hr.common.edit"), "carbon:edit", "primary", () => openPosition(row)),
							iconButton(t("hr.common.delete"), "carbon:trash-can", "error", () => confirmDeletePosition(row))
						])
				}
			]
		: [])
])

// ── Unit create / edit / delete ─────────────────────────────────────────────
interface UnitForm {
	code: string
	nameAr: string
	nameEn: string
	parentId: number | null
	isActive: boolean
}

const formRef = ref<FormInst | null>(null)
const formVisible = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const deletingUnit = ref(false)
const form = ref<UnitForm>({ code: "", nameAr: "", nameEn: "", parentId: null, isActive: true })

const required = { required: true, message: () => t("hr.common.required"), trigger: ["blur", "input"] }
const rules: FormRules = { nameAr: required }

/** A unit cannot sit under itself; the server also refuses a unit under its own descendants. */
const parentOptions = computed<SelectOption[]>(() =>
	flatUnits.value.filter(u => u.id !== editingId.value).map(u => ({ label: translated(u.name), value: u.id }))
)

function openCreate(parentId: number | null) {
	editingId.value = null
	form.value = { code: "", nameAr: "", nameEn: "", parentId, isActive: true }
	formVisible.value = true
}

function openEdit(unit: OrgUnit) {
	editingId.value = unit.id
	form.value = { code: unit.code ?? "", nameAr: unit.name.ar, nameEn: unit.name.en ?? "", parentId: unit.parent_id, isActive: unit.is_active }
	formVisible.value = true
}

async function save() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	const f = form.value
	const payload = { code: nullable(f.code), name: { ar: f.nameAr.trim(), en: nullable(f.nameEn) }, parent_id: f.parentId }
	saving.value = true
	try {
		if (editingId.value === null) {
			const unit = await createOrgUnit(payload)
			selectedId.value = unit.id
			message.success(t("hr.org.saved"))
		} else {
			message.success(serverMessage(await updateOrgUnit(editingId.value, { ...payload, is_active: f.isActive }), t("hr.org.saved")))
		}
		formVisible.value = false
		await load()
		await reloadPositions()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}

/** The server refuses (409) while the unit has sub-units, positions or anyone ever assigned to it. */
function confirmDeleteUnit(unit: OrgUnit) {
	dialog.warning({
		title: t("hr.org.deleteUnit"),
		content: t("hr.org.deleteUnitConfirm", { name: translated(unit.name) }),
		positiveText: t("hr.common.delete"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			deletingUnit.value = true
			try {
				await deleteOrgUnit(unit.id)
				message.success(t("hr.org.deleted"))
				selectedId.value = null
				positions.value = []
				await load()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			} finally {
				deletingUnit.value = false
			}
		}
	})
}

// ── Grades (work locations are ADD's branches, managed under Branches) ──────
const gradesApi = {
	list: listJobGrades,
	create: createJobGrade,
	update: updateJobGrade,
	remove: deleteJobGrade
}
const gradeColumns = computed(() => buildJobGradeColumns(t))
const gradeFields = computed(() => buildJobGradeFields(t))
const gradeToForm = (row: JobGrade): JobGradeForm => ({ name: toBilingual(row.name), code: row.code, rank: row.rank })
const gradeToPayload = (f: JobGradeForm): JobGradePayload => ({ name: toTranslatable(f.name), code: f.code.trim(), rank: f.rank ?? 0 })
</script>
