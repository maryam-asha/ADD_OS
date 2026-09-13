<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.roles") }}</h1>
			<p>{{ t("roles.description") }}</p>
		</div>

		<n-alert v-if="loadError" type="error" :title="t('roles.loadError')" />

		<!-- Action bar with generous spacing before table -->
		<div class="flex justify-end mb-4">
			<n-button v-if="canCreate" type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("roles.create.button") }}
			</n-button>
		</div>

		<!-- Roles Table -->
		<n-card class="add-ledger-table">
			<n-data-table :columns :data="roles" :loading :bordered="false" :row-key />
		</n-card>

		<!-- Role Create / Edit Modal -->
		<n-modal
			v-model:show="modalVisible"
			preset="card"
			:title="mode === 'create' ? t('roles.create.title') : t('roles.edit.title')"
			closable
			style="max-width: 46rem"
			content-style="max-height: 72vh; overflow-y: auto"
		>
			<n-form ref="formRef" :model="form" :rules label-placement="top">
				<n-form-item path="name" :label="t('roles.form.name')">
					<n-input
						v-model:value="form.name"
						:placeholder="t('roles.form.namePlaceholder')"
						:disabled="mode === 'edit' && editingRole?.protected"
					/>
				</n-form-item>

				<!-- Permissions Section -->
				<n-form-item :label="t('roles.form.permissions')">
					<div class="flex flex-col gap-3 w-full">
						<!-- Permissions Toolbar: count + select/clear all -->
						<div class="flex items-center justify-between gap-2 pb-1">
							<div class="flex items-center gap-2">
								<span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
									{{ t("roles.form.selectedCount", { selected: form.permissions.length, total: totalPermissionsCount }) }}
								</span>
							</div>
							<n-button
								size="tiny"
								quaternary
								type="primary"
								@click="toggleAllPermissions"
							>
								{{ allPermissionsSelected ? t("roles.form.deselectAll") : t("roles.form.selectAllPermissions") }}
							</n-button>
						</div>

						<!-- Filter search input -->
						<n-input
							v-if="permissionModules.length > 3"
							v-model:value="searchQuery"
							:placeholder="t('roles.form.searchModules')"
							clearable
							size="small"
							class="mb-1"
						>
							<template #prefix>
								<Icon name="carbon:search" :size="16" class="text-neutral-400" />
							</template>
						</n-input>

						<!-- Modules List -->
						<n-checkbox-group v-model:value="form.permissions" class="w-full">
							<div
								v-for="group in filteredModules"
								:key="group.module"
								class="rounded-xl border border-neutral-200/90 dark:border-neutral-800/90 bg-neutral-50/40 dark:bg-neutral-900/30 p-3.5 mb-3 transition-all hover:border-neutral-300 dark:hover:border-neutral-700"
							>
								<!-- Module Header with translated title and count badge -->
								<div class="flex items-center justify-between pb-2 mb-2.5 border-b border-neutral-200/60 dark:border-neutral-800/60">
									<div class="flex items-center gap-2">
										<h3 class="font-semibold text-sm sm:text-base text-neutral-800 dark:text-neutral-100">
											{{ displayModuleName(group.module, t, te) }}
										</h3>
										<span
											class="text-xs px-2 py-0.5 rounded-full font-medium transition-colors"
											:class="isModuleFullySelected(group, form.permissions)
												? 'bg-[#007F91]/15 text-[#007F91]'
												: isModulePartiallySelected(group, form.permissions)
													? 'bg-[#A97C57]/15 text-[#A97C57]'
													: 'bg-neutral-200/60 dark:bg-neutral-800 text-neutral-500'"
										>
											{{ getModuleSelectedCount(group) }}/{{ group.actions.length }}
										</span>
									</div>
									<n-checkbox
										:checked="isModuleFullySelected(group, form.permissions)"
										:indeterminate="isModulePartiallySelected(group, form.permissions)"
										@update:checked="checked => toggleModule(group, checked)"
									>
										<span class="text-xs sm:text-sm font-medium">{{ t("roles.form.selectAll") }}</span>
									</n-checkbox>
								</div>

								<!-- Module Actions in a responsive 4-column grid -->
								<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
									<div
										v-for="action in group.actions"
										:key="action.name"
										class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none"
										:class="form.permissions.includes(action.name)
											? 'border-[#007F91]/50 bg-[#007F91]/10 text-neutral-900 dark:text-neutral-100 font-medium'
											: 'border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/60 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700'"
										@click="toggleAction(action.name)"
									>
										<n-checkbox
											:value="action.name"
											:checked="form.permissions.includes(action.name)"
											@click.stop
											@update:checked="() => toggleAction(action.name)"
										/>
										<span class="text-xs sm:text-sm font-medium truncate" :title="displayActionName(action.action, t, te)">
											{{ displayActionName(action.action, t, te) }}
										</span>
									</div>
								</div>
							</div>

							<div v-if="filteredModules.length === 0" class="py-6 text-center text-neutral-400 text-sm">
								{{ t("roles.form.noModulesFound") }}
							</div>
						</n-checkbox-group>
					</div>
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="modalVisible = false">{{ t("roles.form.cancel") }}</n-button>
					<n-button type="primary" :loading="submitting" @click="mode === 'create' ? submitCreate() : submitEdit()">
						{{ t("roles.form.submit") }}
					</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, FormInst, FormRules } from "naive-ui"
import type { PermissionModule, RoleRecord } from "@/add-os/modules/system/types/role"
import {
	NAlert,
	NButton,
	NCard,
	NCheckbox,
	NCheckboxGroup,
	NDataTable,
	NForm,
	NFormItem,
	NInput,
	NModal,
	NTag,
	useDialog,
	useMessage
} from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageRoles } from "@/add-os/config/permissions"
import {
	displayActionName,
	displayModuleName,
	displayRoleName,
	isModuleFullySelected,
	isModulePartiallySelected
} from "@/add-os/modules/system/config/roles.config"
import { ApiError } from "@/add-os/services/api"
import { listPermissionModules } from "@/add-os/services/permissions"
import { createRole, listRoleRecords, removeRole, updateRole } from "@/add-os/services/roles"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t, te } = useI18n()
const message = useMessage()
const dialog = useDialog()

const canCreate = computed(() => canManageRoles())

const roles = ref<RoleRecord[]>([])
const permissionModules = ref<PermissionModule[]>([])
const loading = ref(true)
const loadError = ref(false)
const searchQuery = ref("")

function rowKey(row: RoleRecord): number {
	return row.id
}

function renderNameCell(row: RoleRecord) {
	const name = displayRoleName(row, t)
	if (!row.protected) return name

	return h("div", { class: "flex items-center gap-2" }, [
		name,
		h(NTag, { size: "small", round: true, bordered: true }, { default: () => t("roles.builtIn") })
	])
}

/**
 * Edit is hidden for `member` specifically (not just any `protected` role):
 * a protected role's permissions can still be edited (admin/operations),
 * but `member` has nothing editable at all — its name is protected AND the
 * backend rejects any `permissions` key sent for it with a 422 regardless of
 * protected status (`api.role.member_out_of_scope`). Delete stays gated on
 * `protected` alone, since that's the flag the backend actually keys its
 * rename/delete rejection on. Both are also gated on `canManageRoles()`,
 * same defense-in-depth the Create button already has.
 */
function renderActions(row: RoleRecord) {
	if (!canManageRoles()) return h("div", { class: "flex gap-2" })

	const editLabel = t("roles.edit.button")
	const deleteLabel = t("roles.delete.button")

	const buttons = []
	if (row.name !== "member") {
		buttons.push(
			h(
				NButton,
				{ text: true, type: "primary", "aria-label": editLabel, title: editLabel, onClick: () => openEdit(row) },
				{ icon: () => h(Icon, { name: "carbon:edit", size: 18 }) }
			)
		)
	}
	if (!row.protected) {
		buttons.push(
			h(
				NButton,
				{ text: true, type: "error", "aria-label": deleteLabel, title: deleteLabel, onClick: () => confirmDelete(row) },
				{ icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }
			)
		)
	}
	return h("div", { class: "flex gap-2" }, buttons)
}

const columns = computed<DataTableColumns<RoleRecord>>(() => [
	{ title: t("roles.columns.name"), key: "name", render: renderNameCell },
	{
		title: t("roles.columns.permissions"),
		key: "permissions",
		render: row => t("roles.columns.permissionCount", { count: row.permissions.length })
	},
	{ title: t("roles.columns.actions"), key: "actions", render: renderActions }
])

async function loadRoles() {
	loading.value = true
	loadError.value = false
	try {
		roles.value = await listRoleRecords()
	} catch (error) {
		loadError.value = true
		if (!(error instanceof ApiError)) throw error
	} finally {
		loading.value = false
	}
}

async function loadPermissionModules() {
	try {
		permissionModules.value = await listPermissionModules()
	} catch (error) {
		if (!(error instanceof ApiError)) throw error
	}
}

onMounted(() => {
	loadRoles()
	loadPermissionModules()
})

const modalVisible = ref(false)
const submitting = ref(false)
const mode = ref<"create" | "edit">("create")
const editingRole = ref<RoleRecord | null>(null)

function emptyForm(): { name: string; permissions: string[] } {
	return { name: "", permissions: [] }
}

const form = ref(emptyForm())
const formRef = ref<FormInst | null>(null)

const rules = computed<FormRules>(() => ({
	name: [{ required: true, message: t("roles.validation.nameRequired"), trigger: ["blur", "input"] }]
}))

const totalPermissionsCount = computed(() => {
	return permissionModules.value.reduce((acc, g) => acc + g.actions.length, 0)
})

const allPermissionsSelected = computed(() => {
	if (totalPermissionsCount.value === 0) return false
	return form.value.permissions.length === totalPermissionsCount.value
})

function getModuleSelectedCount(group: PermissionModule): number {
	return group.actions.filter(a => form.value.permissions.includes(a.name)).length
}

const filteredModules = computed(() => {
	const query = searchQuery.value.trim().toLowerCase()
	if (!query) return permissionModules.value

	return permissionModules.value
		.map(group => {
			const modLabel = displayModuleName(group.module, t, te).toLowerCase()
			const modRaw = group.module.toLowerCase()
			const matchMod = modLabel.includes(query) || modRaw.includes(query)

			if (matchMod) return group

			const matchingActions = group.actions.filter(a => {
				const actLabel = displayActionName(a.action, t, te).toLowerCase()
				return actLabel.includes(query) || a.action.toLowerCase().includes(query) || a.name.toLowerCase().includes(query)
			})

			if (matchingActions.length > 0) {
				return { ...group, actions: matchingActions }
			}
			return null
		})
		.filter((g): g is PermissionModule => g !== null)
})

function toggleAction(name: string) {
	const set = new Set(form.value.permissions)
	if (set.has(name)) {
		set.delete(name)
	} else {
		set.add(name)
	}
	form.value.permissions = [...set]
}

function toggleAllPermissions() {
	if (allPermissionsSelected.value) {
		form.value.permissions = []
	} else {
		const all: string[] = []
		for (const group of permissionModules.value) {
			for (const a of group.actions) {
				all.push(a.name)
			}
		}
		form.value.permissions = all
	}
}

/**
 * The module's own "select all" checkbox sits outside `n-checkbox-group`'s
 * value-collection contract (it isn't itself a permission), so it mutates
 * `form.permissions` directly. A Set dedupes the add case; the array is
 * always rebuilt fresh, so there's no path to a duplicated action name.
 */
function toggleModule(group: PermissionModule, checked: boolean) {
	const next = new Set(form.value.permissions)
	for (const action of group.actions) {
		if (checked) next.add(action.name)
		else next.delete(action.name)
	}
	form.value.permissions = [...next]
}

function openCreate() {
	mode.value = "create"
	editingRole.value = null
	form.value = emptyForm()
	searchQuery.value = ""
	modalVisible.value = true
}

function openEdit(role: RoleRecord) {
	mode.value = "edit"
	editingRole.value = role
	form.value = { name: role.name, permissions: [...role.permissions] }
	searchQuery.value = ""
	modalVisible.value = true
}

/**
 * `name` is always sent, even unchanged and even for a protected role: the
 * backend only rejects a rename when the new name actually differs from the
 * current one, so there's no false-rejection risk and no need to
 * conditionally omit it.
 */
async function submitCreate() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	submitting.value = true
	try {
		await createRole({ name: form.value.name, permissions: form.value.permissions })
		message.success(t("roles.create.success"))
		modalVisible.value = false
		await loadRoles()
	} catch (error) {
		if (!(error instanceof ApiError)) throw error
		message.error(error.data?.message ?? t("roles.loadError"))
	} finally {
		submitting.value = false
	}
}

async function submitEdit() {
	if (editingRole.value === null) return

	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	submitting.value = true
	try {
		await updateRole(editingRole.value.id, { name: form.value.name, permissions: form.value.permissions })
		message.success(t("roles.edit.success"))
		modalVisible.value = false
		await loadRoles()
	} catch (error) {
		if (!(error instanceof ApiError)) throw error
		message.error(error.data?.message ?? t("roles.loadError"))
	} finally {
		submitting.value = false
	}
}

/**
 * Centered `useDialog()` confirm, not `n-popconfirm` — same RTL-positioning
 * reason `ResourceTable.vue`'s own `confirmDelete` documents. Reuses the
 * shared `resourceCrud.table.delete*` copy directly rather than adding a
 * near-duplicate `roles.delete.*` confirm-text set: "Delete this record?" is
 * generic enough to fit a role with no oddness, and every other resource in
 * this app already confirms deletion with this exact wording.
 */
function confirmDelete(row: RoleRecord) {
	dialog.warning({
		title: t("resourceCrud.table.deleteAction"),
		content: t("resourceCrud.table.deleteConfirmTitle"),
		positiveText: t("resourceCrud.table.deleteConfirmOk"),
		negativeText: t("resourceCrud.table.deleteConfirmCancel"),
		onPositiveClick: () => doDelete(row)
	})
}

async function doDelete(row: RoleRecord) {
	try {
		await removeRole(row.id)
		message.success(t("roles.delete.success"))
		await loadRoles()
	} catch (error) {
		if (!(error instanceof ApiError)) throw error
		message.error(error.data?.message ?? t("roles.loadError"))
	}
}

defineExpose({
	roles,
	loading,
	loadError,
	form,
	mode,
	editingRole,
	modalVisible,
	openCreate,
	openEdit,
	submitCreate,
	submitEdit,
	toggleModule,
	loadRoles
})
</script>
