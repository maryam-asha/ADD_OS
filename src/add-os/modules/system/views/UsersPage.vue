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
		</div>

		<n-data-table :columns :data="filteredUsers" :loading :bordered="false" :row-key />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { User, UserRole, UserStatus } from "@/add-os/modules/system/types/user"
import { NAlert, NDataTable, NInput, NSelect, NTag } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import { listUsers } from "@/add-os/services/users"
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

const columns = computed<DataTableColumns<User>>(() => [
	{ title: t("users.columns.name"), key: "name" },
	{ title: t("users.columns.phone"), key: "phone" },
	{ title: t("users.columns.email"), key: "email" },
	{ title: t("users.columns.role"), key: "roles", render: renderRoleTag },
	{ title: t("users.columns.status"), key: "status", render: renderStatusTag }
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
</script>
