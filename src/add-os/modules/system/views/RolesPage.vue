<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.roles") }}</h1>
			<p>{{ t("roles.description") }}</p>
		</div>

		<n-alert v-if="loadError" type="error" :title="t('roles.loadError')" />

		<div class="flex justify-end">
			<n-button v-if="canCreate" type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("roles.create.button") }}
			</n-button>
		</div>

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="roles" :loading :bordered="false" :row-key />
		</n-card>

		<n-modal
			v-model:show="modalVisible"
			preset="card"
			:title="mode === 'create' ? t('roles.create.title') : t('roles.edit.title')"
			closable
			style="max-width: 40rem"
			content-style="max-height: 60vh; overflow-y: auto"
		>
			<n-form label-placement="top">
				<n-form-item :label="t('roles.form.name')">
					<n-input v-model:value="form.name" :disabled="mode === 'edit' && editingRole?.protected" />
				</n-form-item>
				<n-form-item :label="t('roles.form.permissions')">
					<n-checkbox-group v-model:value="form.permissions" class="w-full">
						<div v-for="group in permissionModules" :key="group.module" class="rounded-lg border p-4 mb-3">
							<div class="flex items-center justify-between mb-2">
								<h3 class="font-medium">{{ group.module }}</h3>
								<n-checkbox
									:checked="isModuleFullySelected(group, form.permissions)"
									:indeterminate="isModulePartiallySelected(group, form.permissions)"
									@update:checked="checked => toggleModule(group, checked)"
								>
									{{ t("roles.form.selectAll") }}
								</n-checkbox>
							</div>
							<div class="grid grid-cols-2 gap-2">
								<n-checkbox v-for="action in group.actions" :key="action.name" :value="action.name" :label="action.action" />
							</div>
						</div>
					</n-checkbox-group>
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
import type { DataTableColumns } from "naive-ui"
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
import { displayRoleName, isModuleFullySelected, isModulePartiallySelected } from "@/add-os/modules/system/config/roles.config"
import { ApiError } from "@/add-os/services/api"
import { listPermissionModules } from "@/add-os/services/permissions"
import { createRole, listRoleRecords, removeRole, updateRole } from "@/add-os/services/roles"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const canCreate = computed(() => canManageRoles())

const roles = ref<RoleRecord[]>([])
const permissionModules = ref<PermissionModule[]>([])
const loading = ref(true)
const loadError = ref(false)

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
 * rename/delete rejection on.
 */
function renderActions(row: RoleRecord) {
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
		// Left empty on failure: the permission editor just has nothing to render —
		// the roles list itself (loadRoles' own loadError) is the primary content
		// of this page, same reasoning as UsersPage.vue's own loadRoles().
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
	modalVisible.value = true
}

function openEdit(role: RoleRecord) {
	mode.value = "edit"
	editingRole.value = role
	form.value = { name: role.name, permissions: [...role.permissions] }
	modalVisible.value = true
}

/**
 * `name` is always sent, even unchanged and even for a protected role: the
 * backend only rejects a rename when the new name actually differs from the
 * current one, so there's no false-rejection risk and no need to
 * conditionally omit it.
 */
async function submitCreate() {
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
