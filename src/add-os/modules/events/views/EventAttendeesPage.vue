<!-- src/add-os/modules/events/views/EventAttendeesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex items-start justify-between gap-4">
			<div class="flex flex-col gap-1 min-w-0">
				<n-button text class="self-start" @click="router.push('/community/events')">
					<template #icon>
						<Icon name="carbon:arrow-left" :size="16" />
					</template>
					{{ t("nav.pages.events") }}
				</n-button>
				<h1 class="text-2xl font-bold truncate">{{ t("events.approval.title") }}</h1>
				<span v-if="eventTitle" class="opacity-70 truncate">{{ eventTitle }}</span>
			</div>

			<n-popconfirm v-if="pendingCount > 0" @positive-click="rejectAllPending">
				<template #trigger>
					<n-button type="warning" secondary :loading="isBulkRejecting">
						{{ t("events.approval.rejectAll") }}
					</n-button>
				</template>
				{{ t("events.approval.rejectAllConfirm") }}
			</n-popconfirm>
		</div>

		<n-alert type="info" :bordered="false">
			{{ t("events.approval.seatNote") }}
		</n-alert>

		<n-alert v-if="error" type="error" :title="t('events.approval.loadError')" />

		<n-tabs v-model:value="statusFilter" type="line" @update:value="() => load()">
			<n-tab name="all" :tab="t('events.approval.all')" />
			<n-tab name="pending" :tab="t('events.approval.pending')" />
			<n-tab name="approved" :tab="t('events.approval.approved')" />
			<n-tab name="rejected" :tab="t('events.approval.rejected')" />
		</n-tabs>

		<n-spin :show="isLoading" class="add-ledger-table">
			<n-empty v-if="!attendees.length && !isLoading" :description="t('events.approval.empty')" />

			<n-data-table
				v-else
				size="small"
				:scroll-x="1100"
				:columns
				:data="attendees"
				:bordered="false"
				:row-key="(row: EventAttendee) => row.id"
			/>
		</n-spin>

		<div v-if="meta.last_page > 1" class="flex justify-end">
			<n-pagination
				v-model:page="page"
				:page-count="meta.last_page"
				:page-size="meta.per_page"
				@update:page="() => load()"
			/>
		</div>

		<!-- Rejection always states a reason: the API refuses an empty one. -->
		<n-modal
			v-model:show="rejectVisible"
			preset="card"
			:title="t('events.approval.reject')"
			style="max-width: 26rem"
		>
			<n-form-item
				:label="t('events.approval.rejectReason')"
				:feedback="rejectError ?? undefined"
				:validation-status="rejectError ? 'error' : undefined"
			>
				<n-input
					v-model:value="rejectReason"
					type="textarea"
					:autosize="{ minRows: 2, maxRows: 5 }"
				/>
			</n-form-item>
			<div class="flex justify-end gap-2">
				<n-button size="small" @click="rejectVisible = false">
					{{ t("common.close") }}
				</n-button>
				<n-button size="small" type="error" :loading="isRejecting" @click="confirmReject">
					{{ t("events.approval.reject") }}
				</n-button>
			</div>
		</n-modal>

		<!-- What the member answered, when the event asked anything. -->
		<n-modal
			v-model:show="answersVisible"
			preset="card"
			:title="t('events.approval.answers')"
			style="max-width: 32rem"
		>
			<n-empty v-if="!viewingAnswers.length" :description="t('events.approval.noAnswers')" />
			<n-descriptions v-else :column="1" bordered label-placement="left">
				<n-descriptions-item
					v-for="answer in viewingAnswers"
					:key="answer.field_key"
					:label="answer.label || answer.field_key"
				>
					{{ formatAnswer(answer.value) }}
				</n-descriptions-item>
			</n-descriptions>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type {
	EventAttendee,
	EventAttendeeAnswer,
	EventRegistrationStatus
} from "@/add-os/modules/events/types/event"
import {
	NAlert,
	NButton,
	NDataTable,
	NDescriptions,
	NDescriptionsItem,
	NEmpty,
	NFormItem,
	NInput,
	NModal,
	NPagination,
	NPopconfirm,
	NSpin,
	NTab,
	NTabs,
	NTag,
	useMessage
} from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import { currentLocale } from "@/add-os/lang/currentLocale"
import AppliedDiscountList from "@/add-os/modules/pricing/components/AppliedDiscountList.vue"
import {
	approveAttendee,
	getEvent,
	listAttendees,
	rejectAttendee,
	rejectPendingAttendees
} from "@/add-os/services/events"
import { formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const message = useMessage()

const eventId = Number(route.params.eventId)

const STATUS_TAG: Record<EventRegistrationStatus, "warning" | "success" | "error"> = {
	pending: "warning",
	approved: "success",
	rejected: "error"
}

const attendees = ref<EventAttendee[]>([])
const meta = ref({ current_page: 1, last_page: 1, per_page: 20, total: 0 })
const page = ref(1)
const statusFilter = ref<"all" | EventRegistrationStatus>("all")
const isLoading = ref(false)
const error = ref(false)
const eventTitle = ref("")

const rejectVisible = ref(false)
const rejectReason = ref("")
const rejectError = ref<string | null>(null)
const rejectingId = ref<number | null>(null)
const isRejecting = ref(false)
const isBulkRejecting = ref(false)

const answersVisible = ref(false)
const viewingAnswers = ref<EventAttendeeAnswer[]>([])

const pendingCount = computed(() => attendees.value.filter(a => a.status === "pending").length)

function formatAnswer(value: unknown): string {
	if (Array.isArray(value)) return value.join("، ")
	if (value === null || value === undefined) return "—"
	return String(value)
}

async function load() {
	isLoading.value = true
	error.value = false
	try {
		const result = await listAttendees(eventId, {
			page: page.value,
			...(statusFilter.value === "all" ? {} : { status: statusFilter.value })
		})
		attendees.value = result.data
		meta.value = result.meta
	} catch {
		error.value = true
	} finally {
		isLoading.value = false
	}
}

async function loadEvent() {
	try {
		const event = await getEvent(eventId)
		eventTitle.value = event.title[currentLocale.value] || event.title.en
	} catch {
		// The roster is still usable without the event's name above it.
	}
}

onMounted(() => {
	loadEvent()
	load()
})

async function approve(row: EventAttendee) {
	try {
		await approveAttendee(eventId, row.id)
		message.success(t("events.approval.approvedToast"))
		await load()
	} catch (caught) {
		// 422 (the member's balance dropped) and 409 (the event filled up, or
		// someone already decided this) both carry a message worth reading —
		// the registration is deliberately left pending either way.
		const body = (caught as { data?: { message?: string } }).data
		message.error(body?.message ?? t("events.approval.actionError"))
	}
}

function openReject(row: EventAttendee) {
	rejectingId.value = row.id
	rejectReason.value = ""
	rejectError.value = null
	rejectVisible.value = true
}

async function confirmReject() {
	if (!rejectReason.value.trim()) {
		rejectError.value = t("events.approval.rejectReasonRequired")
		return
	}
	if (rejectingId.value === null) return

	isRejecting.value = true
	try {
		await rejectAttendee(eventId, rejectingId.value, rejectReason.value.trim())
		message.success(t("events.approval.rejectedToast"))
		rejectVisible.value = false
		await load()
	} catch (caught) {
		const body = (caught as { data?: { message?: string } }).data
		rejectError.value = body?.message ?? t("events.approval.actionError")
	} finally {
		isRejecting.value = false
	}
}

async function rejectAllPending() {
	isBulkRejecting.value = true
	try {
		const result = await rejectPendingAttendees(eventId, t("events.approval.bulkReason"))
		message.success(result.message ?? t("events.approval.rejectedToast"))
		await load()
	} catch (caught) {
		const body = (caught as { data?: { message?: string } }).data
		message.error(body?.message ?? t("events.approval.actionError"))
	} finally {
		isBulkRejecting.value = false
	}
}

function openAnswers(row: EventAttendee) {
	viewingAnswers.value = row.answers ?? []
	answersVisible.value = true
}

const columns = computed<DataTableColumns<EventAttendee>>(() => [
	{ title: t("events.approval.columns.name"), key: "name", minWidth: 140, align: "center" },
	{ title: t("events.approval.columns.email"), key: "email", minWidth: 180, align: "center" },
	{
		title: t("events.approval.columns.phone"),
		key: "phone",
		minWidth: 130,
		align: "center",
		render: row => h("span", { class: "font-mono" }, row.phone || "—")
	},
	{
		title: t("events.approval.columns.status"),
		key: "status",
		width: 120,
		align: "center",
		render: row =>
			h(
				NTag,
				{ type: STATUS_TAG[row.status], round: true, bordered: false, size: "small" },
				{ default: () => t(`events.approval.${row.status}`) }
			)
	},
	{
		title: t("events.approval.columns.registeredAt"),
		key: "registered_at",
		minWidth: 160,
		align: "center",
		render: row => (row.registered_at ? h("span", { class: "font-mono text-xs" }, formatDateTime(row.registered_at, { locale: currentLocale.value })) : "—")
	},
	{
		title: t("events.approval.columns.reason"),
		key: "rejection_reason",
		minWidth: 160,
		align: "center",
		render: row => row.rejection_reason || "—"
	},
	{
		title: t("events.approval.columns.discounts"),
		key: "discounts",
		minWidth: 130,
		align: "center",
		render: row => h(AppliedDiscountList, { discounts: row.discounts })
	},
	{
		title: t("resourceCrud.table.actionsColumn"),
		key: "actions",
		width: 120,
		align: "center",
		render: row => {
			const buttons = []

			if (row.answers?.length) {
				buttons.push(
					h(
						NButton,
						{ text: true, type: "info", title: t("events.approval.answers"), onClick: () => openAnswers(row) },
						{ icon: () => h(Icon, { name: "carbon:document", size: 18 }) }
					)
				)
			}

			// Only a pending registration can be decided; the API returns 409
			// for anything else, so offering the buttons would be a lie.
			if (row.status === "pending") {
				buttons.push(
					h(
						NButton,
						{ text: true, type: "success", title: t("events.approval.approve"), onClick: () => approve(row) },
						{ icon: () => h(Icon, { name: "carbon:checkmark", size: 18 }) }
					),
					h(
						NButton,
						{ text: true, type: "error", title: t("events.approval.reject"), onClick: () => openReject(row) },
						{ icon: () => h(Icon, { name: "carbon:close", size: 18 }) }
					)
				)
			}

			return h("div", { class: "inline-flex items-center justify-center gap-2" }, buttons)
		}
	}
])
</script>
