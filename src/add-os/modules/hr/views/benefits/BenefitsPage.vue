<!-- src/add-os/modules/hr/views/benefits/BenefitsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrBenefits')" :description="t('hrBenefits.benefits.description')">
			<template v-if="mayManage" #actions>
				<n-button type="primary" @click="openEditor(null)">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrBenefits.benefits.add") }}
				</n-button>
			</template>
		</HrPageHeader>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="benefits" :loading :bordered="false" :row-props size="small" :scroll-x="900">
				<template #empty>
					<span class="text-secondary">{{ t("hrBenefits.benefits.empty") }}</span>
				</template>
			</n-data-table>
		</n-card>

		<BenefitModal v-if="mayManage" v-model:show="editorVisible" :benefit="editing" :pay-components @saved="load" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Benefit } from "@/add-os/modules/hr/types/benefits"
import type { PayComponent } from "@/add-os/modules/hr/types/payroll"
import { NAlert, NButton, NCard, NDataTable, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { canManageBenefits } from "@/add-os/config/permissions"
import ActiveTag from "@/add-os/modules/hr/components/ActiveTag.vue"
import BenefitModal from "@/add-os/modules/hr/components/benefits/BenefitModal.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { benefitValue } from "@/add-os/modules/hr/utils/benefits"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { deleteBenefit, listBenefits } from "@/add-os/services/hr/benefits"
import { listPayComponents } from "@/add-os/services/hr/payroll"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Every benefit: what it is, how often it is granted and what it is worth,
 * and how many assignments give it. A benefit opens on its own page, where
 * it is given to employees, grades and units. Read with hr.benefits.view,
 * changed with hr.benefits.manage; one already granted cannot be deleted
 * (409) — deactivate it instead.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const mayManage = canManageBenefits()

const benefits = ref<Benefit[]>([])
const payComponents = ref<PayComponent[]>([])
const loading = ref(true)
const loadError = ref("")
const editorVisible = ref(false)
const editing = ref<Benefit | null>(null)

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		benefits.value = await listBenefits()
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

onMounted(() => {
	void load()
	// A cash allowance names its pay component; reading them needs hr.payroll.view, so this may stay empty.
	if (mayManage) void quietly(listPayComponents, list => (payComponents.value = list))
})

function openEditor(benefit: Benefit | null) {
	editing.value = benefit
	editorVisible.value = true
}

function confirmDelete(benefit: Benefit) {
	dialog.warning({
		title: t("hrBenefits.benefits.delete"),
		content: t("hrBenefits.benefits.deleteConfirm", { name: translated(benefit.name) }),
		positiveText: t("hr.common.delete"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			try {
				await deleteBenefit(benefit.id)
				message.success(t("hrBenefits.benefits.deleted"))
				await load()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

function rowProps(row: Benefit) {
	return { class: "cursor-pointer", onClick: () => void router.push({ name: "hrPay.hrBenefit", params: { id: row.id } }) }
}

/** Buttons inside a clickable row act on their own. */
function stop(event: Event, action: () => void) {
	event.stopPropagation()
	action()
}

const columns = computed<DataTableColumns<Benefit>>(() => [
	{ title: t("hr.org.code"), key: "code", minWidth: 110, render: row => h("span", { class: "font-mono", dir: "ltr" }, row.code) },
	{ title: t("hrPayroll.components.name"), key: "name", minWidth: 180, render: row => h("span", { class: "font-semibold" }, translated(row.name)) },
	{ title: t("hrBenefits.kindLabel"), key: "kind", minWidth: 130, render: row => t(`hrBenefits.kind.${row.kind}`) },
	{ title: t("hrBenefits.frequencyLabel"), key: "frequency", minWidth: 110, render: row => t(`hrBenefits.frequency.${row.frequency}`) },
	{ title: t("hrBenefits.amount"), key: "amount", minWidth: 120, render: row => h("span", { class: "add-numeric" }, benefitValue(t, row.amount, row.currency, row.unit)) },
	{ title: t("hrBenefits.assignments.title"), key: "assignments_count", minWidth: 100, render: row => h("span", { class: "add-numeric" }, formatNumber(row.assignments_count ?? 0)) },
	{ title: t("hr.common.status"), key: "is_active", minWidth: 100, render: row => h(ActiveTag, { active: row.is_active }) },
	...(mayManage
		? [
				{
					title: t("hr.employees.columns.actions"),
					key: "actions",
					width: 100,
					align: "center" as const,
					render: (row: Benefit) =>
						h("div", { class: "flex justify-center gap-3" }, [
							h(
								NButton,
								{ text: true, type: "primary", "aria-label": t("hr.common.edit"), title: t("hr.common.edit"), onClick: (e: Event) => stop(e, () => openEditor(row)) },
								{ icon: () => h(Icon, { name: "carbon:edit", size: 18 }) }
							),
							h(
								NButton,
								{ text: true, type: "error", "aria-label": t("hr.common.delete"), title: t("hr.common.delete"), onClick: (e: Event) => stop(e, () => confirmDelete(row)) },
								{ icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }
							)
						])
				}
			]
		: [])
])
</script>
