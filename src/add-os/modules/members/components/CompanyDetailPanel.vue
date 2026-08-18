<!-- src/add-os/modules/members/components/CompanyDetailPanel.vue -->
<template>
	<n-drawer v-model:show="show" :width="480">
		<n-drawer-content :title="company?.legal_name ?? t('companies.detail.title')" closable>
			<n-spin v-if="isLoadingCompany" size="small" />
			<n-alert v-else-if="companyError" type="error" :title="t('companies.detail.loadError')" />
			<div v-else-if="company" class="flex flex-col gap-4">
				<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
					<dt class="text-secondary">{{ t("companies.columns.contractRef") }}</dt>
					<dd>{{ company.contract_ref }}</dd>
					<dt class="text-secondary">{{ t("companies.columns.status") }}</dt>
					<dd>{{ t(`companies.status.${company.status}`) }}</dd>
				</dl>

				<div class="flex justify-end">
					<n-button size="small" type="primary" @click="addDialogShow = true">
						<template #icon><Icon name="carbon:add" :size="16" /></template>
						{{ t("companyMembers.add.button") }}
					</n-button>
				</div>

				<n-data-table :columns="memberColumns" :data="members" :loading="isLoadingMembers" :bordered="false" :row-key="memberRowKey" />
			</div>
		</n-drawer-content>
	</n-drawer>

	<AddCompanyMemberDialog v-model:show="addDialogShow" :company-id @added="refetchMembers" />
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { CompanyMember } from "@/add-os/modules/members/types/company-member"
import { NAlert, NButton, NDataTable, NDrawer, NDrawerContent, NSpin, NSwitch, useDialog, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useCompanyDetail } from "@/add-os/modules/members/composables/useCompanyDetail"
import { ApiError } from "@/add-os/services/api"
import Icon from "@/components/common/Icon.vue"
import AddCompanyMemberDialog from "./AddCompanyMemberDialog.vue"

const props = defineProps<{ companyId: number }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const { company, isLoadingCompany, companyError, members, isLoadingMembers, refetchMembers, setDoorAccess, setAdminFlag, removeMember, refetchCompany } =
	useCompanyDetail(props.companyId)

const addDialogShow = ref(false)

function memberRowKey(row: CompanyMember) {
	return row.user_id
}

function toastFailure(caught: unknown) {
	if (!(caught instanceof ApiError)) throw caught
	message.error(caught.status === 403 ? t("resourceCrud.mutations.permissionError") : t("resourceCrud.mutations.genericError"))
}

async function onToggleDoorAccess(row: CompanyMember, value: boolean) {
	const previous = row.door_access_enabled
	row.door_access_enabled = value
	try {
		await setDoorAccess(row.user_id, { door_access_enabled: value })
	} catch (caught) {
		row.door_access_enabled = previous
		toastFailure(caught)
		await refetchMembers()
	}
}

async function onToggleAdmin(row: CompanyMember, value: boolean) {
	const previous = row.is_admin
	row.is_admin = value
	try {
		await setAdminFlag(row.user_id, { is_admin: value })
	} catch (caught) {
		row.is_admin = previous
		toastFailure(caught)
		await refetchMembers()
	}
}

async function performRemove(row: CompanyMember) {
	try {
		await removeMember(row.user_id)
		message.success(t("companyMembers.remove.success"))
	} catch (caught) {
		toastFailure(caught)
	}
}

function confirmRemove(row: CompanyMember) {
	dialog.warning({
		title: t("companyMembers.remove.confirmTitle"),
		positiveText: t("companyMembers.remove.confirmOk"),
		negativeText: t("companyMembers.remove.confirmCancel"),
		onPositiveClick: () => performRemove(row)
	})
}

const memberColumns = computed<DataTableColumns<CompanyMember>>(() => [
	{ title: t("companyMembers.columns.userId"), key: "user_id" },
	{
		title: t("companyMembers.columns.doorAccess"),
		key: "door_access_enabled",
		render: row => h(NSwitch, { value: row.door_access_enabled, "onUpdate:value": (value: boolean) => onToggleDoorAccess(row, value) })
	},
	{
		title: t("companyMembers.columns.isAdmin"),
		key: "is_admin",
		render: row => h(NSwitch, { value: row.is_admin, "onUpdate:value": (value: boolean) => onToggleAdmin(row, value) })
	},
	{
		title: t("resourceCrud.table.actionsColumn"),
		key: "actions",
		render: row =>
			h(
				NButton,
				{ text: true, type: "error", "aria-label": t("resourceCrud.table.deleteAction"), onClick: () => confirmRemove(row) },
				{ icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }
			)
	}
])

defineExpose({ refetchCompany, onToggleDoorAccess, onToggleAdmin, confirmRemove, members })
</script>
