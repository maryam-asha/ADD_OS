<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.users") }}</h1>
			<p>{{ t("users.description") }}</p>
		</div>

		<n-alert v-if="loadError" type="error" :title="t('users.loadError')" />

		<div class="flex flex-wrap items-center gap-3">
			<n-input v-model:value="search" :placeholder="t('users.searchPlaceholder')" clearable class="max-w-xs" />
			<n-select
				v-model:value="roleFilter"
				:placeholder="t('users.roleFilterPlaceholder')"
				:options="roleFilterOptions"
				clearable
				class="max-w-xs"
			/>
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("users.create.button") }}
			</n-button>
		</div>

		<n-data-table :columns :data="filteredUsers" :loading :bordered="false" :row-key />

		<n-drawer v-model:show="drawerVisible" :width="420">
			<n-drawer-content :title="mode === 'create' ? t('users.create.title') : t('users.edit.title')" closable>
				<n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
					<n-form-item path="name" :label="t('users.form.name')">
						<n-input v-model:value="form.name" />
					</n-form-item>
					<n-form-item path="phone" :label="t('users.form.phone')">
						<n-input v-model:value="form.phone" :placeholder="t('users.form.phonePlaceholder')" />
					</n-form-item>
					<n-form-item path="email" :label="t('users.form.email')">
						<n-input v-model:value="form.email" />
					</n-form-item>
					<template v-if="mode === 'create'">
						<n-form-item path="password" :label="t('users.form.password')">
							<n-input v-model:value="form.password" type="password" show-password-on="click" />
						</n-form-item>
						<n-form-item path="password_confirmation" :label="t('users.form.passwordConfirmation')">
							<n-input v-model:value="form.password_confirmation" type="password" show-password-on="click" />
						</n-form-item>
					</template>
					<n-form-item v-if="mode === 'create'" path="role" :label="t('users.form.role')">
						<n-select v-model:value="form.role" :placeholder="t('users.form.rolePlaceholder')" :options="createRoleOptions" />
					</n-form-item>
				</n-form>
				<template #footer>
					<div class="flex justify-end gap-2">
						<n-button @click="drawerVisible = false">{{ t("users.form.cancel") }}</n-button>
						<n-button type="primary" :loading="submitting" @click="mode === 'create' ? submitCreate() : submitEdit()">{{ t("users.form.submit") }}</n-button>
					</div>
				</template>
			</n-drawer-content>
		</n-drawer>

		<n-modal v-model:show="statusModalVisible" preset="card" :title="t('users.changeStatus.title')" class="max-w-md">
			<n-alert type="warning" :title="t('users.changeStatus.warning')" class="mb-4" />
			<n-form>
				<n-form-item :label="t('users.columns.status')">
					<n-select v-model:value="statusForm.status" :options="statusOptions" />
				</n-form-item>
				<n-form-item :label="t('users.changeStatus.reasonLabel')">
					<n-input
						v-model:value="statusForm.reason"
						type="textarea"
						:placeholder="t('users.changeStatus.reasonPlaceholder')"
						maxlength="500"
					/>
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="statusModalVisible = false">{{ t("users.form.cancel") }}</n-button>
					<n-button type="primary" :loading="submittingStatus" @click="submitStatusChange">{{ t("users.form.submit") }}</n-button>
				</div>
			</template>
		</n-modal>

		<n-modal v-model:show="roleModalVisible" preset="card" :title="t('users.changeRole.title')" class="max-w-md">
			<n-form>
				<n-form-item :label="t('users.columns.role')">
					<n-select v-model:value="roleForm" :options="roleFilterOptions" />
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="roleModalVisible = false">{{ t("users.form.cancel") }}</n-button>
					<n-button type="primary" :loading="submittingRole" @click="submitRoleChange">{{ t("users.form.submit") }}</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, FormInst, FormRules, SelectOption } from "naive-ui"
import type {
	CreateUserPayload,
	UpdateUserProfilePayload,
	UpdateUserStatusPayload,
	User,
	UserRole,
	UserStatus
} from "@/add-os/modules/system/types/user"
import { NAlert, NButton, NDataTable, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NModal, NSelect, NTag, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { isValidPassword, isValidSyrianPhone } from "@/add-os/modules/system/utils/validation"
import { ApiError } from "@/add-os/services/api"
import { assignRole, createUser, listUsers, updateUserProfile, updateUserStatus } from "@/add-os/services/users"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

/**
 * Fixed by the backend's own validation (`AssignRoleRequest`/`StoreUserRequest`
 * both hardcode this exact list), not fetched from `listRoles()` — a role the
 * assign-role endpoint would reject is not a useful filter/select option here,
 * even if the roles table ever grew a fourth row. `RolesPage.vue` is the one
 * screen that legitimately reflects whatever the roles table contains.
 */
const ROLES: UserRole[] = ["member", "operations", "admin"]

const STATUS_ICON: Record<UserStatus, string> = {
	active: STATUS_ICONS.success,
	deactivated: STATUS_ICONS.warning,
	blocked: STATUS_ICONS.danger
}

const STATUS_TYPE: Record<UserStatus, "success" | "warning" | "error"> = {
	active: "success",
	deactivated: "warning",
	blocked: "error"
}

const users = ref<User[]>([])
const loading = ref(true)
const loadError = ref(false)
const search = ref("")
const roleFilter = ref<UserRole | null>(null)

const roleFilterOptions = computed<SelectOption[]>(() => ROLES.map(role => ({ label: t(`roles.names.${role}`), value: role })))

const filteredUsers = computed(() => {
	const term = search.value.trim().toLowerCase()

	return users.value.filter(user => {
		if (roleFilter.value && !user.roles.includes(roleFilter.value)) return false
		if (!term) return true
		return (
			user.name.toLowerCase().includes(term) ||
			user.phone.toLowerCase().includes(term) ||
			user.email.toLowerCase().includes(term)
		)
	})
})

function rowKey(row: User): number {
	return row.id
}

function renderRoleTag(row: User) {
	return h(
		NTag,
		{ round: true, bordered: true },
		{ default: () => row.roles.map(role => t(`roles.names.${role}`)).join(", ") }
	)
}

function renderStatusTag(row: User) {
	return h(
		NTag,
		{ type: STATUS_TYPE[row.status], round: true, bordered: true },
		{
			default: () => [
				h(Icon, { name: STATUS_ICON[row.status], size: 14 }),
				` ${t(`users.status.${row.status}`)}`
			]
		}
	)
}

function renderActions(row: User) {
	return h("div", { class: "flex gap-2" }, [
		h(NButton, { text: true, type: "primary", onClick: () => openEdit(row) }, { default: () => t("users.edit.button") }),
		h(NButton, { text: true, type: "warning", onClick: () => openStatusModal(row) }, { default: () => t("users.changeStatus.button") }),
		h(NButton, { text: true, onClick: () => openRoleModal(row) }, { default: () => t("users.changeRole.button") })
	])
}

const columns = computed<DataTableColumns<User>>(() => [
	{ title: t("users.columns.name"), key: "name" },
	{ title: t("users.columns.phone"), key: "phone" },
	{ title: t("users.columns.email"), key: "email" },
	{ title: t("users.columns.role"), key: "roles", render: renderRoleTag },
	{ title: t("users.columns.status"), key: "status", render: renderStatusTag },
	{ title: t("users.columns.actions"), key: "actions", render: renderActions }
])

async function loadUsers() {
	loading.value = true
	loadError.value = false
	try {
		users.value = await listUsers()
	} catch (error) {
		loadError.value = true
		if (!(error instanceof ApiError)) throw error
	} finally {
		loading.value = false
	}
}

onMounted(loadUsers)

const message = useMessage()

const drawerVisible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInst | null>(null)
const mode = ref<"create" | "edit">("create")
const editingUserId = ref<number | null>(null)

function emptyForm(): CreateUserPayload {
	return { name: "", phone: "", email: "", password: "", password_confirmation: "", role: "operations" }
}

const form = ref<CreateUserPayload>(emptyForm())

/** StoreUserRequest allows only these two — member accounts self-register from the app. */
const createRoleOptions = computed<SelectOption[]>(() => [
	{ label: t("roles.names.operations"), value: "operations" },
	{ label: t("roles.names.admin"), value: "admin" }
])

const rules = computed<FormRules>(() => ({
	name: [{ required: true, message: t("users.validation.nameRequired"), trigger: ["blur", "input"] }],
	phone: [
		{ required: true, message: t("users.validation.phoneRequired"), trigger: ["blur", "input"] },
		{
			validator: (_rule, value: string) => isValidSyrianPhone(value),
			message: t("users.validation.phoneInvalid"),
			trigger: ["blur", "input"]
		}
	],
	email: [
		{ required: true, message: t("users.validation.emailRequired"), trigger: ["blur", "input"] },
		{
			validator: (_rule, value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
			message: t("users.validation.emailInvalid"),
			trigger: ["blur", "input"]
		}
	],
	...(mode.value === "create"
		? {
				password: [
					{ required: true, message: t("users.validation.passwordRequired"), trigger: ["blur", "input"] },
					{
						validator: (_rule, value: string) => isValidPassword(value),
						message: t("users.validation.passwordTooShort"),
						trigger: ["blur", "input"]
					}
				],
				password_confirmation: [
					{ required: true, message: t("users.validation.passwordRequired"), trigger: ["blur", "input"] },
					{
						validator: (_rule, value: string) => value === form.value.password,
						message: t("users.validation.passwordConfirmationMismatch"),
						trigger: ["blur", "input"]
					}
				],
				role: [{ required: true, message: t("users.validation.roleRequired"), trigger: ["change", "blur"] }]
			}
		: {})
}))

function openCreate() {
	mode.value = "create"
	editingUserId.value = null
	form.value = emptyForm()
	drawerVisible.value = true
}

function openEdit(user: User) {
	mode.value = "edit"
	editingUserId.value = user.id
	form.value = { ...emptyForm(), name: user.name, phone: user.phone, email: user.email }
	drawerVisible.value = true
}

async function submitCreate() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	submitting.value = true
	try {
		await createUser(form.value)
		message.success(t("users.create.success"))
		drawerVisible.value = false
		await loadUsers()
	} catch (error) {
		if (!(error instanceof ApiError)) throw error
		message.error(error.data?.message ?? t("users.loadError"))
	} finally {
		submitting.value = false
	}
}

async function submitEdit() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	if (editingUserId.value === null) return

	const payload: UpdateUserProfilePayload = { name: form.value.name, phone: form.value.phone, email: form.value.email }

	submitting.value = true
	try {
		await updateUserProfile(editingUserId.value, payload)
		message.success(t("users.edit.success"))
		drawerVisible.value = false
		await loadUsers()
	} catch (error) {
		if (!(error instanceof ApiError)) throw error
		message.error(error.data?.message ?? t("users.loadError"))
	} finally {
		submitting.value = false
	}
}

const statusModalVisible = ref(false)
const submittingStatus = ref(false)
const statusTargetId = ref<number | null>(null)
const statusForm = ref<UpdateUserStatusPayload>({ status: "active", reason: "" })

const statusOptions = computed<SelectOption[]>(() =>
	(["active", "deactivated", "blocked"] as const).map(status => ({ label: t(`users.status.${status}`), value: status }))
)

function openStatusModal(user: User) {
	statusTargetId.value = user.id
	statusForm.value = { status: user.status, reason: "" }
	statusModalVisible.value = true
}

async function submitStatusChange() {
	if (statusTargetId.value === null) return

	submittingStatus.value = true
	try {
		await updateUserStatus(statusTargetId.value, statusForm.value)
		message.success(t("users.changeStatus.success"))
		statusModalVisible.value = false
		await loadUsers()
	} catch (error) {
		if (!(error instanceof ApiError)) throw error
		message.error(error.data?.message ?? t("users.loadError"))
	} finally {
		submittingStatus.value = false
	}
}

const roleModalVisible = ref(false)
const submittingRole = ref(false)
const roleTargetId = ref<number | null>(null)
const roleForm = ref<UserRole>("member")

function openRoleModal(user: User) {
	roleTargetId.value = user.id
	roleForm.value = user.roles[0] ?? "member"
	roleModalVisible.value = true
}

async function submitRoleChange() {
	if (roleTargetId.value === null) return

	submittingRole.value = true
	try {
		await assignRole(roleTargetId.value, roleForm.value)
		message.success(t("users.changeRole.success"))
		roleModalVisible.value = false
		await loadUsers()
	} catch (error) {
		if (!(error instanceof ApiError)) throw error
		message.error(error.data?.message ?? t("users.loadError"))
	} finally {
		submittingRole.value = false
	}
}
</script>
