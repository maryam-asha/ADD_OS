<!-- src/add-os/modules/hr/views/core/HrAlertsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrAlerts')" :description="t('hr.alerts.description')" />

		<div v-if="!loadError && alerts.length" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<HrStatCard v-for="card in statCards" :key="card.label" :label="card.label" :value="formatNumber(card.value)" :icon="card.icon" :hint="card.hint" :loading />
		</div>

		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />

		<HrToolbar>
			<n-select v-model:value="filters.type" :placeholder="t('hr.alerts.typeFilter')" :options="typeOptions" clearable class="max-w-xs" />
		</HrToolbar>

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="rows" :loading :bordered="false" :row-props size="small" :scroll-x="820">
				<template #empty>
					<span class="text-secondary">{{ applied.type ? t("hr.alerts.emptyFiltered") : t("hr.alerts.empty") }}</span>
				</template>
			</n-data-table>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { AlertType, HrAlert } from "@/add-os/modules/hr/types/hr"
import { NAlert, NCard, NDataTable, NSelect, NTag } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { canViewEmployees } from "@/add-os/config/permissions"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrStatCard from "@/add-os/modules/hr/components/ui/HrStatCard.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { ALERT_TYPES } from "@/add-os/modules/hr/types/hr"
import { employeeCell } from "@/add-os/modules/hr/utils/cells"
import { ApiError } from "@/add-os/services/api"
import { listHrAlerts } from "@/add-os/services/hr/core"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * What HR must decide soon — contracts and probations ending, documents
 * expiring, expired or missing, certifications (with the training module) —
 * computed by the server for everyone employed today, soonest first. The
 * list is small and unpaginated, and the endpoint takes no filter, so the
 * type filter runs here; it still lives in the URL.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()
const mayOpenEmployees = canViewEmployees()

const alerts = ref<HrAlert[]>([])
const loading = ref(true)
const loadError = ref(false)

async function load() {
	loading.value = true
	loadError.value = false
	try {
		alerts.value = await listHrAlerts()
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

let loaded = false
const { filters, applied } = useRouteFilters({ type: "string" }, () => {
	if (loaded) return
	loaded = true
	void load()
})

const rows = computed(() => (applied.value.type ? alerts.value.filter(a => a.type === applied.value.type) : alerts.value))

const typeOptions = computed<SelectOption[]>(() =>
	ALERT_TYPES.map(type => ({ label: `${t(`hr.alertType.${type}`)} (${formatNumber(alerts.value.filter(a => a.type === type).length)})`, value: type }))
)

const statCards = computed(() => [
	{ label: t("hr.alerts.stats.overdue"), value: alerts.value.filter(a => a.days_left < 0).length, icon: STATUS_ICONS.danger, hint: t("hr.alerts.stats.overdueHint") },
	{ label: t("hr.alerts.stats.week"), value: alerts.value.filter(a => a.days_left >= 0 && a.days_left <= 7).length, icon: STATUS_ICONS.warning, hint: t("hr.alerts.stats.weekHint") },
	{ label: t("hr.alerts.stats.total"), value: alerts.value.length, icon: "carbon:notification", hint: t("hr.alerts.stats.totalHint") }
])

/** Past due or due today reads as danger, within a week as warning, the rest as information. */
function urgency(alert: HrAlert): "error" | "warning" | "info" {
	const always: AlertType[] = ["document_expired", "document_missing", "certification_expired"]
	if (alert.days_left <= 0 || always.includes(alert.type)) return "error"
	return alert.days_left <= 7 ? "warning" : "info"
}

const URGENCY_ICON = { error: STATUS_ICONS.danger, warning: STATUS_ICONS.warning, info: STATUS_ICONS.info } as const

function whenLabel(alert: HrAlert): string {
	if (alert.type === "document_missing") return t("hr.alerts.now")
	if (alert.days_left === 0) return t("hr.alerts.today")
	return alert.days_left > 0
		? t("hr.alerts.inDays", { n: formatNumber(alert.days_left) }, alert.days_left)
		: t("hr.alerts.daysAgo", { n: formatNumber(-alert.days_left) }, -alert.days_left)
}

function openEmployee(alert: HrAlert) {
	void router.push({ name: "hr.employeeProfile", params: { id: alert.employee.id } })
}

function rowProps(row: HrAlert) {
	return mayOpenEmployees ? { class: "cursor-pointer", onClick: () => openEmployee(row) } : {}
}

const columns = computed<DataTableColumns<HrAlert>>(() => [
	{
		title: t("hr.alerts.columns.type"),
		key: "type",
		minWidth: 200,
		render: row => {
			const level = urgency(row)
			return h(
				NTag,
				{ type: level, size: "small", round: true, bordered: true },
				{ icon: () => h(Icon, { name: URGENCY_ICON[level], size: 14 }), default: () => t(`hr.alertType.${row.type}`) }
			)
		}
	},
	{
		title: t("hr.employees.columns.employee"),
		key: "employee",
		minWidth: 220,
		render: row => employeeCell(row.employee)
	},
	{ title: t("hr.alerts.columns.dueOn"), key: "due_on", minWidth: 120, render: row => formatDate(row.due_on) },
	{ title: t("hr.alerts.columns.when"), key: "days_left", minWidth: 130, render: whenLabel },
	{
		title: t("hr.alerts.columns.detail"),
		key: "meta",
		minWidth: 140,
		render: row => (typeof row.meta.document_type === "string" ? h("span", { class: "font-mono", dir: "ltr" }, row.meta.document_type) : "")
	}
])
</script>
