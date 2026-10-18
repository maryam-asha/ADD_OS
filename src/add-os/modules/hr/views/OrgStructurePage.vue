<!-- src/add-os/modules/hr/views/OrgStructurePage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.orgStructure") }}</h1>
				<p>{{ t("hr.org.description") }}</p>
			</div>
			<n-button v-if="mayManage" type="primary" @click="openCreate(null)">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("hr.org.addUnit") }}
			</n-button>
		</div>

		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />

		<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<n-card size="small" class="lg:col-span-1">
				<n-spin :show="loading">
					<n-tree
						v-if="treeData.length"
						:data="treeData"
						:selected-keys="selectedId === null ? [] : [selectedId]"
						block-line
						default-expand-all
						@update:selected-keys="onSelect"
					/>
					<p v-else-if="!loading" class="text-secondary">{{ t("hr.org.empty") }}</p>
				</n-spin>
			</n-card>

			<n-card size="small" class="lg:col-span-2">
				<template v-if="selected">
					<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
						<div class="flex flex-wrap items-center gap-3">
							<h2 class="text-lg font-semibold">{{ translated(selected.name) }}</h2>
							<span class="font-mono text-secondary" dir="ltr">{{ selected.code }}</span>
							<n-tag :type="selected.is_active ? 'success' : 'default'" size="small" round>
								{{ selected.is_active ? t("hr.common.active") : t("hr.common.inactive") }}
							</n-tag>
						</div>
						<div v-if="mayManage" class="flex gap-2">
							<n-button size="small" @click="openCreate(selected.id)">
								<template #icon><Icon name="carbon:add" :size="16" /></template>
								{{ t("hr.org.addChild") }}
							</n-button>
							<n-button size="small" @click="openEdit(selected)">
								<template #icon><Icon name="carbon:edit" :size="16" /></template>
								{{ t("hr.common.edit") }}
							</n-button>
						</div>
					</div>

					<h3 class="mb-2 font-semibold">{{ t("hr.org.positions") }}</h3>
					<n-data-table :columns="positionColumns" :data="positions" :loading="positionsLoading" :bordered="false" size="small">
						<template #empty>
							<span class="text-secondary">{{ t("hr.org.noPositions") }}</span>
						</template>
					</n-data-table>
				</template>
				<p v-else class="text-secondary">{{ t("hr.org.selectUnit") }}</p>
			</n-card>
		</div>

		<n-modal v-model:show="formVisible" preset="card" :title="editingId === null ? t('hr.org.addUnit') : t('hr.org.editUnit')" closable class="max-w-lg">
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
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, FormInst, FormRules, SelectOption, TreeOption } from "naive-ui"
import type { OrgUnit, Position } from "@/add-os/modules/hr/types/hr"
import { NAlert, NButton, NCard, NDataTable, NForm, NFormItem, NInput, NModal, NSelect, NSpin, NSwitch, NTag, NTree, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageOrgStructure } from "@/add-os/config/permissions"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { createOrgUnit, listPositions, orgTree, updateOrgUnit } from "@/add-os/services/hr"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const mayManage = canManageOrgStructure()

// ── Tree ────────────────────────────────────────────────────────────────────
const tree = ref<OrgUnit[]>([])
const loading = ref(true)
const loadError = ref(false)
const selectedId = ref<number | null>(null)

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

onMounted(load)

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
	const id = keys.length ? Number(keys[0]) : null
	selectedId.value = id
	positions.value = []
	if (id === null) return
	positionsLoading.value = true
	try {
		positions.value = await listPositions(id)
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		positionsLoading.value = false
	}
}

const positionColumns = computed<DataTableColumns<Position>>(() => [
	{ title: t("hr.org.code"), key: "code", minWidth: 100 },
	{ title: t("hr.org.positionTitle"), key: "title", minWidth: 180, render: row => translated(row.title) },
	{ title: t("hr.org.headcount"), key: "headcount", minWidth: 90, align: "center", render: row => formatNumber(row.headcount) },
	{ title: t("hr.org.occupied"), key: "occupied", minWidth: 90, align: "center", render: row => formatNumber(row.occupied) }
])

// ── Create / edit ───────────────────────────────────────────────────────────
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
const form = ref<UnitForm>({ code: "", nameAr: "", nameEn: "", parentId: null, isActive: true })

const required = { required: true, message: () => t("hr.common.required"), trigger: ["blur", "input"] }
const rules: FormRules = { code: required, nameAr: required }

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
	form.value = { code: unit.code, nameAr: unit.name.ar, nameEn: unit.name.en ?? "", parentId: unit.parent_id, isActive: unit.is_active }
	formVisible.value = true
}

async function save() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	const f = form.value
	const payload = { code: f.code.trim(), name: { ar: f.nameAr.trim(), en: f.nameEn.trim() || null }, parent_id: f.parentId }
	saving.value = true
	try {
		if (editingId.value === null) {
			const unit = await createOrgUnit(payload)
			selectedId.value = unit.id
		} else {
			await updateOrgUnit(editingId.value, { ...payload, is_active: f.isActive })
		}
		message.success(t("hr.org.saved"))
		formVisible.value = false
		await load()
		if (selectedId.value !== null) await onSelect([selectedId.value])
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
		const firstError = e.data?.errors ? Object.values(e.data.errors)[0]?.[0] : undefined
		message.error(firstError ?? e.data?.message ?? t("hr.common.loadError"))
	} finally {
		saving.value = false
	}
}
</script>
