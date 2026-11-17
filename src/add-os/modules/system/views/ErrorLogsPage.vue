<!-- src/add-os/modules/system/views/ErrorLogsPage.vue -->
<!--
	Errors and crashes the member app reported, newest first. The app sends
	them to `POST /api/v1/errors` without a session (a crash can happen on the
	login screen itself); this page reads them back from the admin side,
	`GET /api/v1/admin/error-logs`, 25 to a page. A row opens a drawer with the
	stack trace and the app's own context; deleting one needs its own permission.
-->
<template>
	<div class="flex flex-col gap-5">
		<PageHeader :title="t(titleKey || 'nav.pages.errorLogs')" :description="t('errorLogs.description')" />

		<n-alert v-if="error" type="error" :title="t('errorLogs.loadError')" />

		<FilterToolbar>
			<n-input
				v-model:value="typeInput"
				clearable
				class="sm:w-72!"
				:placeholder="t('errorLogs.filters.type')"
				@change="applyType"
				@clear="clearType"
			/>
			<n-select v-model:value="platform" :options="platformOptions" clearable class="sm:w-48!" :placeholder="t('errorLogs.filters.platform')" />
			<n-date-picker v-model:formatted-value="range" type="daterange" value-format="yyyy-MM-dd" clearable />
			<template #actions>
				<TableRefreshButton :loading="isLoading" @refresh="refetch" />
			</template>
		</FilterToolbar>

		<Panel flush>
			<n-data-table :columns :data="rows" :loading="isLoading" :bordered="false" :row-key="(row: ErrorLog) => row.id" size="small" :scroll-x="1100">
				<template #empty>
					<div class="py-10 text-center text-secondary">{{ t("errorLogs.empty") }}</div>
				</template>
			</n-data-table>
		</Panel>

		<div v-if="meta && meta.last_page > 1" class="flex justify-end">
			<n-pagination v-model:page="page" :page-count="meta.last_page" :disabled="isLoading" />
		</div>

		<DetailDrawer v-model:show="drawerOpen" :title="t('errorLogs.detail.title')" size="lg">
			<div v-if="selected" class="flex flex-col gap-5">
				<n-descriptions :column="1" label-placement="left" bordered size="small">
					<n-descriptions-item v-for="field in detailFields" :key="field.key" :label="field.label">
						<bdi v-if="field.ltr" dir="ltr">{{ field.value }}</bdi>
						<template v-else>{{ field.value }}</template>
					</n-descriptions-item>
				</n-descriptions>

				<section class="flex flex-col gap-2">
					<h3 class="text-sm font-semibold">{{ t("errorLogs.detail.message") }}</h3>
					<p dir="ltr" class="whitespace-pre-wrap break-words text-sm">{{ selected.message }}</p>
				</section>

				<section class="flex flex-col gap-2">
					<h3 class="text-sm font-semibold">{{ t("errorLogs.detail.stackTrace") }}</h3>
					<pre
						v-if="selected.stack_trace"
						dir="ltr"
						class="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-add-default bg-[var(--add-surface-sunken)] p-3 font-mono text-xs"
					>{{ selected.stack_trace }}</pre>
					<p v-else class="text-sm text-secondary">{{ t("errorLogs.detail.noStackTrace") }}</p>
				</section>

				<section v-if="metadataText" class="flex flex-col gap-2">
					<h3 class="text-sm font-semibold">{{ t("errorLogs.detail.metadata") }}</h3>
					<pre dir="ltr" class="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-add-default bg-[var(--add-surface-sunken)] p-3 font-mono text-xs">{{ metadataText }}</pre>
				</section>
			</div>

			<template v-if="selected && canDelete" #footer>
				<n-button type="error" ghost :loading="deleting" @click="confirmDelete(selected)">
					{{ t("errorLogs.actions.delete") }}
				</n-button>
			</template>
		</DetailDrawer>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { RowAction } from "@/add-os/components/page/row-actions"
import type { ErrorLog, ErrorLogPlatform } from "@/add-os/modules/system/types/error-log"
import {
	NAlert,
	NButton,
	NDataTable,
	NDatePicker,
	NDescriptions,
	NDescriptionsItem,
	NInput,
	NPagination,
	NSelect,
	NTag,
	useDialog,
	useMessage
} from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import DetailDrawer from "@/add-os/components/page/DetailDrawer.vue"
import FilterToolbar from "@/add-os/components/page/FilterToolbar.vue"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import Panel from "@/add-os/components/page/Panel.vue"
import RowActions from "@/add-os/components/page/RowActions.vue"
import TableRefreshButton from "@/add-os/components/resource/TableRefreshButton.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { canDeleteErrorLogs } from "@/add-os/config/permissions"
import { ApiError } from "@/add-os/services/api"
import { listErrorLogs, removeErrorLog } from "@/add-os/services/error-logs"
import { formatDateTime } from "@/add-os/utils/format"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

// The backend matches `error_type` exactly, so the typed text is applied on
// Enter or blur rather than on every keystroke.
const typeInput = ref("")
const errorType = ref<string | null>(null)
function applyType() {
	const value = typeInput.value.trim()
	errorType.value = value === "" ? null : value
}
function clearType() {
	typeInput.value = ""
	errorType.value = null
}

const platform = ref<ErrorLogPlatform | null>(null)
const range = ref<[string, string] | null>(null)
const query = computed<Record<string, unknown>>(() => ({
	error_type: errorType.value,
	platform: platform.value,
	from: range.value?.[0] ?? null,
	to: range.value?.[1] ?? null
}))

const page = ref(1)
const { data: rows, isLoading, error, meta, refetch } = useResourceList<ErrorLog>(listErrorLogs, query, page)

const PLATFORMS: ErrorLogPlatform[] = ["android", "ios"]
const platformOptions = computed(() => PLATFORMS.map(value => ({ label: t(`errorLogs.platform.${value}`), value })))

const canDelete = computed(() => canDeleteErrorLogs())

const dash = "—"
const ltr = (text: string | null | undefined) => (text ? h("bdi", { dir: "ltr" }, text) : dash)
const occurredAt = (row: ErrorLog) => formatDateTime(row.occurred_at ?? row.created_at)
const platformLabel = (value: ErrorLogPlatform | null) => (value ? t(`errorLogs.platform.${value}`) : dash)
const versionOf = (row: ErrorLog) => (row.app_version ? (row.build_number ? `${row.app_version} (${row.build_number})` : row.app_version) : null)
const deviceOf = (row: ErrorLog) => [row.device, row.os].filter(Boolean).join(" · ") || null

const selected = ref<ErrorLog | null>(null)
const drawerOpen = ref(false)
function openDetail(row: ErrorLog) {
	selected.value = row
	drawerOpen.value = true
}

function rowActions(row: ErrorLog): RowAction[] {
	const actions: RowAction[] = [{ key: "view", label: t("errorLogs.actions.view"), icon: "carbon:view", onClick: () => openDetail(row) }]
	if (canDelete.value) {
		actions.push({
			key: "delete",
			label: t("errorLogs.actions.delete"),
			icon: "carbon:trash-can",
			danger: true,
			confirm: t("errorLogs.actions.deleteConfirm"),
			onClick: () => remove(row)
		})
	}
	return actions
}

const columns = computed<DataTableColumns<ErrorLog>>(() => [
	{ title: t("errorLogs.columns.at"), key: "occurred_at", width: 170, render: occurredAt },
	{ title: t("errorLogs.columns.type"), key: "error_type", width: 180, render: row => ltr(row.error_type) },
	{ title: t("errorLogs.columns.message"), key: "message", minWidth: 260, ellipsis: { tooltip: true } },
	{
		title: t("errorLogs.columns.platform"),
		key: "platform",
		width: 110,
		render: row => (row.platform ? h(NTag, { size: "small", round: true, bordered: false }, { default: () => platformLabel(row.platform) }) : dash)
	},
	{ title: t("errorLogs.columns.version"), key: "app_version", width: 120, render: row => ltr(versionOf(row)) },
	{ title: t("errorLogs.columns.device"), key: "device", width: 180, render: row => ltr(deviceOf(row)) },
	{ title: t("errorLogs.columns.screen"), key: "screen", width: 160, render: row => ltr(row.screen) },
	{ title: t("errorLogs.columns.actions"), key: "actions", width: 100, align: "center", render: row => h(RowActions, { actions: rowActions(row) }) }
])

const detailFields = computed(() => {
	const row = selected.value
	if (!row) return []
	return [
		{ key: "occurredAt", label: t("errorLogs.detail.occurredAt"), value: occurredAt(row), ltr: false },
		{ key: "receivedAt", label: t("errorLogs.detail.receivedAt"), value: formatDateTime(row.created_at), ltr: false },
		{ key: "type", label: t("errorLogs.detail.type"), value: row.error_type, ltr: true },
		{ key: "platform", label: t("errorLogs.detail.platform"), value: platformLabel(row.platform), ltr: false },
		{ key: "appVersion", label: t("errorLogs.detail.appVersion"), value: row.app_version ?? dash, ltr: true },
		{ key: "buildNumber", label: t("errorLogs.detail.buildNumber"), value: row.build_number ?? dash, ltr: true },
		{ key: "os", label: t("errorLogs.detail.os"), value: row.os ?? dash, ltr: true },
		{ key: "device", label: t("errorLogs.detail.device"), value: row.device ?? dash, ltr: true },
		{ key: "screen", label: t("errorLogs.detail.screen"), value: row.screen ?? dash, ltr: true },
		{ key: "user", label: t("errorLogs.detail.user"), value: row.user_id ? `#${row.user_id}` : t("errorLogs.detail.noUser"), ltr: Boolean(row.user_id) },
		{ key: "session", label: t("errorLogs.detail.session"), value: row.session_id ?? dash, ltr: true }
	]
})

const metadataText = computed(() => {
	const metadata = selected.value?.metadata
	return metadata && Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : ""
})

const deleting = ref(false)
function confirmDelete(row: ErrorLog) {
	dialog.warning({
		title: t("errorLogs.actions.delete"),
		content: t("errorLogs.actions.deleteConfirm"),
		positiveText: t("errorLogs.actions.delete"),
		negativeText: t("resourceCrud.table.deleteConfirmCancel"),
		onPositiveClick: () => remove(row)
	})
}

async function remove(row: ErrorLog) {
	deleting.value = true
	try {
		await removeErrorLog(row.id)
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		message.error(t("errorLogs.actions.deleteError"))
		return
	} finally {
		deleting.value = false
	}
	message.success(t("errorLogs.actions.deleteSuccess"))
	if (selected.value?.id === row.id) drawerOpen.value = false
	// The last row of the last page: step back rather than land on an empty page.
	if (rows.value.length === 1 && page.value > 1) page.value -= 1
	else await refetch()
}
</script>
