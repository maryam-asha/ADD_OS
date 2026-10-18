<!-- src/add-os/modules/hr/views/core/HrAlertsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.hrAlerts") }}</h1>
			<p>{{ t("hr.alerts.description") }}</p>
		</div>

		<ResourceStatCards v-if="!loadError && !loading && alerts.length" :cards="statCards" />

		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />

		<div class="flex flex-wrap items-center gap-3">
			<n-select v-model:value="filters.type" :placeholder="t('hr.alerts.typeFilter')" :options="typeOptions" clearable class="max-w-xs" />
		</div>

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
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { AlertType, HrAlert } from "@/add-os/modules/hr/types/hr"
import { NAlert, NCard, NDataTable, NSelect, NTag } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import { canViewEmployees } from "@/add-os/config/permissions"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { ALERT_TYPES } from "@/add-os/modules/hr/types/hr"
import { translated } from "@/add-os/modules/hr/utils/translated"
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

const statCards = computed<StatCard[]>(() => [
	{ label: t("hr.alerts.stats.overdue"), value: alerts.value.filter(a => a.days_left < 0).length },
	{ label: t("hr.alerts.stats.week"), value: alerts.value.filter(a => a.days_left >= 0 && a.days_left <= 7).length },
	{ label: t("hr.alerts.stats.total"), value: alerts.value.length }
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
		render: row =>
			h("div", { class: "flex flex-col gap-0.5 py-1" }, [
				h("span", { class: "font-semibold text-sm" }, translated(row.employee.name)),
				row.employee.employee_number ? h("span", { class: "text-xs text-secondary font-mono", dir: "ltr" }, row.employee.employee_number) : null
			])
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
