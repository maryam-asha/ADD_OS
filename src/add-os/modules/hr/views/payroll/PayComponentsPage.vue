<!-- src/add-os/modules/hr/views/payroll/PayComponentsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrPayComponents')" :description="t('hrPayroll.components.description')">
			<template v-if="mayManage" #actions>
				<n-button type="primary" @click="openEditor(null)">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrPayroll.components.add") }}
				</n-button>
			</template>
		</HrPageHeader>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="components" :loading :bordered="false" size="small" :scroll-x="900">
				<template #empty>
					<span class="text-secondary">{{ t("hrPayroll.components.empty") }}</span>
				</template>
			</n-data-table>
		</n-card>

		<PayComponentModal v-if="mayManage" v-model:show="editorVisible" :component="editing" :components :rate-tables :calculators @saved="load" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { PayComponent, RateTable } from "@/add-os/modules/hr/types/payroll"
import { NAlert, NButton, NCard, NDataTable, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageHrSettings } from "@/add-os/config/permissions"
import ActiveTag from "@/add-os/modules/hr/components/ActiveTag.vue"
import PayComponentModal from "@/add-os/modules/hr/components/payroll/PayComponentModal.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { calculatorLabel } from "@/add-os/modules/hr/utils/payroll"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { deletePayComponent, listCalculators, listPayComponents, listRateTables } from "@/add-os/services/hr/payroll"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * What a payslip is made of: each component's kind, how it is worked out
 * and in which order (earlier lines feed later ones — a tax on the gross,
 * an allowance as a percent of basic). Read with hr.payroll.view, changed
 * with hr.settings.manage. One that pay or payslips use cannot be deleted
 * (409); deactivate it instead.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const mayManage = canManageHrSettings()

const components = ref<PayComponent[]>([])
const rateTables = ref<RateTable[]>([])
const calculators = ref<string[]>([])
const loading = ref(true)
const loadError = ref("")
const editorVisible = ref(false)
const editing = ref<PayComponent | null>(null)

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		components.value = await listPayComponents()
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

onMounted(async () => {
	void load()
	if (!mayManage) return
	try {
		;[calculators.value, rateTables.value] = await Promise.all([listCalculators(), listRateTables()])
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
})

function openEditor(component: PayComponent | null) {
	editing.value = component
	editorVisible.value = true
}

function confirmDelete(component: PayComponent) {
	dialog.warning({
		title: t("hrPayroll.components.delete"),
		content: t("hrPayroll.components.deleteConfirm", { name: translated(component.name) }),
		positiveText: t("hr.common.delete"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			try {
				await deletePayComponent(component.id)
				message.success(t("hrPayroll.components.deleted"))
				await load()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

/** What else the component counts toward, in words: on every payslip, taxable, insurable. */
function flags(row: PayComponent): string {
	const list = [row.applies_to_all && t("hrPayroll.components.appliesToAllShort"), row.taxable && t("hrPayroll.components.taxable"), row.insurable && t("hrPayroll.components.insurable")]
	return list.filter(Boolean).join("، ") || EMPTY
}

const columns = computed<DataTableColumns<PayComponent>>(() => [
	{ title: t("hrPayroll.components.sort"), key: "sort", width: 70, render: row => h("span", { class: "add-numeric" }, formatNumber(row.sort, { grouping: false })) },
	{ title: t("hr.org.code"), key: "code", minWidth: 110, render: row => h("span", { class: "font-mono", dir: "ltr" }, row.code) },
	{ title: t("hrPayroll.components.name"), key: "name", minWidth: 170, render: row => translated(row.name) },
	{ title: t("hrPayroll.components.kind"), key: "kind", minWidth: 130, render: row => t(`hrPayroll.kind.${row.kind}`) },
	{ title: t("hrPayroll.components.calculator"), key: "calculator", minWidth: 150, render: row => calculatorLabel(t, row.calculator) },
	{ title: t("hrPayroll.components.countsToward"), key: "flags", minWidth: 180, render: flags },
	{ title: t("hr.common.status"), key: "is_active", minWidth: 100, render: row => h(ActiveTag, { active: row.is_active }) },
	...(mayManage
		? [
				{
					title: t("hr.employees.columns.actions"),
					key: "actions",
					width: 100,
					align: "center" as const,
					render: (row: PayComponent) =>
						h("div", { class: "flex justify-center gap-3" }, [
							h(NButton, { text: true, type: "primary", "aria-label": t("hr.common.edit"), title: t("hr.common.edit"), onClick: () => openEditor(row) }, { icon: () => h(Icon, { name: "carbon:edit", size: 18 }) }),
							h(
								NButton,
								{ text: true, type: "error", "aria-label": t("hr.common.delete"), title: t("hr.common.delete"), onClick: () => confirmDelete(row) },
								{ icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }
							)
						])
				}
			]
		: [])
])
</script>
