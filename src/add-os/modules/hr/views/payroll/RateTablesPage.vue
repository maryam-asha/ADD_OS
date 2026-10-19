<!-- src/add-os/modules/hr/views/payroll/RateTablesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrRateTables')" :description="t('hrPayroll.rateTables.description')">
			<template v-if="mayManage" #actions>
				<n-button type="primary" @click="openTable(null)">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrPayroll.rateTables.add") }}
				</n-button>
			</template>
		</HrPageHeader>

		<n-alert v-if="loadError" type="error" :title="loadError" />
		<n-skeleton v-else-if="loading && !tables.length" text :repeat="4" />
		<n-empty v-else-if="!tables.length" :description="t('hrPayroll.rateTables.empty')" />

		<HrPanel
			v-for="table in tables"
			:key="table.id"
			:title="`${table.code} · ${translated(table.name)}`"
			:subtitle="t(`hrPayroll.rateTables.kinds.${table.kind}`)"
			:icon="table.kind === 'brackets' ? 'carbon:chart-stepper' : 'carbon:percentage'"
			flush
			class="add-ledger-table"
		>
			<template v-if="mayManage" #extra>
				<div class="flex flex-wrap gap-2">
					<n-button size="small" type="primary" @click="openVersion(table)">
						<template #icon><Icon name="carbon:add" :size="16" /></template>
						{{ t("hrPayroll.rateTables.addVersion") }}
					</n-button>
					<n-button size="small" :aria-label="t('hr.common.edit')" :title="t('hr.common.edit')" @click="openTable(table)">
						<template #icon><Icon name="carbon:edit" :size="16" /></template>
					</n-button>
					<n-button size="small" type="error" secondary :aria-label="t('hr.common.delete')" :title="t('hr.common.delete')" @click="confirmDelete(table)">
						<template #icon><Icon name="carbon:trash-can" :size="16" /></template>
					</n-button>
				</div>
			</template>
			<n-data-table :columns="versionColumns(table)" :data="newestFirst(table)" :bordered="false" size="small" :scroll-x="720">
				<template #empty>
					<span class="text-secondary">{{ t("hrPayroll.rateTables.noVersions") }}</span>
				</template>
			</n-data-table>
		</HrPanel>

		<RateTableModal v-if="mayManage" v-model:show="tableVisible" :table="editing" @saved="load" />
		<RateVersionModal v-if="mayManage" v-model:show="versionVisible" :table="versionTable" @saved="load" />

		<HrFormModal v-if="mayManage" v-model:show="closeVisible" :title="t('hrPayroll.rateTables.closeVersion')" size="sm" icon="carbon:calendar">
			<p class="mb-3 text-sm text-secondary">{{ t("hrPayroll.rateTables.closeHint") }}</p>
			<n-form-item :label="t('hrPayroll.rateTables.to')">
				<n-date-picker v-model:formatted-value="closing.to" value-format="yyyy-MM-dd" type="date" class="w-full" />
			</n-form-item>
			<n-form-item :label="t('hrPayroll.rateTables.note')">
				<n-input v-model:value="closing.note" :maxlength="255" />
			</n-form-item>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="closeVisible = false">{{ t("hr.common.cancel") }}</n-button>
					<n-button type="primary" :loading="saving" :disabled="!closing.to || (!!closing.version && closing.to < closing.version.effective_from)" @click="closeVersion">
						{{ t("hr.common.save") }}
					</n-button>
				</div>
			</template>
		</HrFormModal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { RateTable, RateTableVersion } from "@/add-os/modules/hr/types/payroll"
import { NAlert, NButton, NDataTable, NDatePicker, NEmpty, NFormItem, NInput, NSkeleton, NTag, useDialog, useMessage } from "naive-ui"
import { h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageHrSettings } from "@/add-os/config/permissions"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import RateTableModal from "@/add-os/modules/hr/components/payroll/RateTableModal.vue"
import RateVersionModal from "@/add-os/modules/hr/components/payroll/RateVersionModal.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { closeRateVersion, deleteRateTable, listRateTables } from "@/add-os/services/hr/payroll"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The legal rates payroll reads — social insurance, income tax — each in
 * dated versions, so a past month is always worked out with the rate of its
 * own time. A run uses the version in force on the month's last day. Read
 * with hr.payroll.view, changed with hr.settings.manage; a table with
 * versions stays, as part of the payroll history.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const mayManage = canManageHrSettings()
const today = todayIso()

const tables = ref<RateTable[]>([])
const loading = ref(true)
const loadError = ref("")
const saving = ref(false)

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		tables.value = await listRateTables()
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

onMounted(load)

const tableVisible = ref(false)
const editing = ref<RateTable | null>(null)
function openTable(table: RateTable | null) {
	editing.value = table
	tableVisible.value = true
}

const versionVisible = ref(false)
const versionTable = ref<RateTable | null>(null)
function openVersion(table: RateTable) {
	versionTable.value = table
	versionVisible.value = true
}

function confirmDelete(table: RateTable) {
	dialog.warning({
		title: t("hrPayroll.rateTables.delete"),
		content: t("hrPayroll.rateTables.deleteConfirm", { code: table.code }),
		positiveText: t("hr.common.delete"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			try {
				await deleteRateTable(table.id)
				message.success(t("hrPayroll.rateTables.deleted"))
				await load()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

const closeVisible = ref(false)
const closing = ref({ version: null as RateTableVersion | null, to: null as string | null, note: "" })
function openClose(version: RateTableVersion) {
	closing.value = { version, to: version.effective_from > today ? version.effective_from : today, note: version.note ?? "" }
	closeVisible.value = true
}

async function closeVersion() {
	const c = closing.value
	if (!c.version || !c.to) return
	saving.value = true
	try {
		message.success(serverMessage(await closeRateVersion(c.version.id, c.to, nullable(c.note)), t("hrPayroll.rateTables.updated")))
		closeVisible.value = false
		await load()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}

function newestFirst(table: RateTable): RateTableVersion[] {
	return [...(table.versions ?? [])].sort((a, b) => b.effective_from.localeCompare(a.effective_from))
}

function inForce(v: RateTableVersion): boolean {
	return v.effective_from <= today && (!v.effective_to || v.effective_to >= today)
}

/** "15% up to 500,000" or "0–100,000: 0% · 100,000–…: 10%". */
function rateText(table: RateTable, v: RateTableVersion): string {
	const pct = (value: string | number) => `${formatNumber(value, { fractionDigits: 4, trimZeros: true })}%`
	if (table.kind === "percent") {
		const rate = v.rate === null ? EMPTY : pct(v.rate)
		return v.max_base ? t("hrPayroll.rateTables.upToCeiling", { rate, max: formatNumber(v.max_base) }) : rate
	}
	let from = "0"
	return (v.brackets ?? [])
		.map(band => {
			const text = `${formatNumber(from)}–${band.up_to === null ? "…" : formatNumber(band.up_to)}: ${pct(band.rate)}`
			from = band.up_to === null ? from : String(band.up_to)
			return text
		})
		.join(" · ")
}

function versionColumns(table: RateTable): DataTableColumns<RateTableVersion> {
	return [
		{ title: t("hrPayroll.rateTables.from"), key: "effective_from", minWidth: 110, render: row => formatDate(row.effective_from) },
		{ title: t("hrPayroll.rateTables.to"), key: "effective_to", minWidth: 110, render: row => (row.effective_to ? formatDate(row.effective_to) : EMPTY) },
		{ title: t("hrPayroll.rateTables.rate"), key: "rate", minWidth: 260, render: row => h("span", { class: "add-numeric", dir: "ltr" }, rateText(table, row)) },
		{ title: t("hrPayroll.rateTables.currency"), key: "currency", minWidth: 80, render: row => h("span", { dir: "ltr" }, row.currency ?? EMPTY) },
		{ title: t("hrPayroll.rateTables.note"), key: "note", minWidth: 140, ellipsis: { tooltip: true }, render: row => row.note || EMPTY },
		{
			title: "",
			key: "state",
			minWidth: 150,
			render: row =>
				h("div", { class: "flex items-center justify-end gap-2" }, [
					inForce(row) ? h(NTag, { type: "success", size: "small", round: true, bordered: true }, () => t("hrPayroll.rateTables.inForce")) : null,
					mayManage && (!row.effective_to || row.effective_to >= today)
						? h(NButton, { size: "tiny", onClick: () => openClose(row) }, () => t("hrPayroll.rateTables.closeVersion"))
						: null
				])
		}
	]
}
</script>
