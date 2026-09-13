<!-- src/add-os/modules/members/views/IndividualMembersPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.individuals") }}</h1>
			<p>{{ t("members.description") }}</p>
		</div>

		<ResourceStatCards v-if="!loadError && !loading" :cards="statCards" />

		<n-alert v-if="loadError" type="error" :title="t('members.loadError')" />

		<!-- Search bar -->
		<div class="flex items-center gap-3">
			<n-input
				v-model:value="search"
				:placeholder="t('members.searchPlaceholder')"
				clearable
				class="flex-1"
			>
				<template #prefix>
					<Icon name="carbon:search" :size="16" />
				</template>
			</n-input>
			<n-select
				v-model:value="statusFilter"
				:placeholder="t('members.statusFilterPlaceholder')"
				:options="statusFilterOptions"
				clearable
				class="max-w-[200px]"
			/>
		</div>

		<!-- Members table -->
		<n-card class="add-ledger-table">
			<n-data-table
				:columns
				:data="filteredMembers"
				:loading
				:bordered="false"
				:row-key
			/>
		</n-card>

		<!-- Detail panel (wallet + sessions) -->
		<MemberDetailPanel
			v-if="detailMember !== null"
			v-model:show="detailPanelVisible"
			:member="detailMember"
		/>

		<!-- Quick Wallet Top-up Dialog -->
		<WalletTopUpDialog
			v-if="topUpMember !== null"
			v-model:show="topUpDialogVisible"
			:member="topUpMember"
			@success="onTopUpSuccess"
		/>

		<!-- Change status modal -->
		<n-modal
			v-model:show="statusModalVisible"
			preset="card"
			:title="t('members.changeStatus.title')"
			closable
			style="max-width: 28rem"
		>
			<n-alert type="warning" :title="t('members.changeStatus.warning')" class="mb-4" />
			<n-form>
				<n-form-item :label="t('members.columns.status')">
					<n-select v-model:value="statusForm.status" :options="statusOptions" />
				</n-form-item>
				<n-form-item :label="t('members.changeStatus.reasonLabel')">
					<n-input
						v-model:value="statusForm.reason"
						type="textarea"
						:placeholder="t('members.changeStatus.reasonPlaceholder')"
						maxlength="500"
					/>
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="statusModalVisible = false">{{ t("users.form.cancel") }}</n-button>
					<n-button type="primary" :loading="submittingStatus" @click="submitStatusChange">
						<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
						{{ t("users.form.submit") }}
					</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { Member, MemberStatus, UpdateMemberStatusPayload } from "@/add-os/modules/members/types/member"
import { NAlert, NAvatar, NButton, NCard, NDataTable, NForm, NFormItem, NInput, NModal, NSelect, NTag, useMessage } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import MemberDetailPanel from "@/add-os/modules/members/components/MemberDetailPanel.vue"
import WalletTopUpDialog from "@/add-os/modules/members/components/WalletTopUpDialog.vue"
import { listMembers, updateMemberStatus } from "@/add-os/services/members"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import { ApiError } from "@/add-os/services/api"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()

// ── Data ────────────────────────────────────────────────────────────────────
const members = ref<Member[]>([])
const loading = ref(true)
const loadError = ref(false)

async function loadMembers() {
	loading.value = true
	loadError.value = false
	try {
		members.value = await listMembers()
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

onMounted(loadMembers)

// ── Filters ─────────────────────────────────────────────────────────────────
const search = ref("")
const statusFilter = ref<MemberStatus | null>(null)

const statusFilterOptions = computed<SelectOption[]>(() =>
	(["active", "deactivated", "blocked"] as MemberStatus[]).map(s => ({
		label: t(`members.status.${s}`),
		value: s
	}))
)

const filteredMembers = computed(() => {
	const term = search.value.trim().toLowerCase()
	return members.value.filter(m => {
		if (statusFilter.value && m.status !== statusFilter.value) return false
		if (!term) return true
		return (
			m.name.toLowerCase().includes(term) ||
			m.phone.toLowerCase().includes(term) ||
			(m.email && m.email.toLowerCase().includes(term))
		)
	})
})

// ── Stat cards ───────────────────────────────────────────────────────────────
const statCards = computed<StatCard[]>(() => [
	{ label: t("members.stats.total"), value: members.value.length },
	{ label: t("members.status.active"), value: members.value.filter(m => m.status === "active").length },
	{ label: t("members.status.deactivated"), value: members.value.filter(m => m.status === "deactivated").length },
	{ label: t("members.status.blocked"), value: members.value.filter(m => m.status === "blocked").length }
])

function rowKey(row: Member): number {
	return row.id
}

// ── Status display helpers ───────────────────────────────────────────────────
const STATUS_ICON: Record<MemberStatus, string> = {
	active: STATUS_ICONS.success,
	deactivated: STATUS_ICONS.warning,
	blocked: STATUS_ICONS.danger
}

const STATUS_TYPE: Record<MemberStatus, "success" | "warning" | "error"> = {
	active: "success",
	deactivated: "warning",
	blocked: "error"
}

function renderStatusTag(row: Member) {
	return h(
		NTag,
		{ type: STATUS_TYPE[row.status], round: true, bordered: true },
		{
			default: () => [
				h(Icon, { name: STATUS_ICON[row.status], size: 14 }),
				` ${t(`members.status.${row.status}`)}`
			]
		}
	)
}

function renderCompany(row: Member) {
	const company = row.companies?.[0]
	if (!company) return h("span", { class: "text-secondary text-sm" }, "—")
	return h("span", { class: "text-sm" }, company.legal_name)
}

// ── Detail panel ─────────────────────────────────────────────────────────────
const detailMember = ref<Member | null>(null)
const detailPanelVisible = ref(false)

watch(detailPanelVisible, visible => {
	if (!visible) detailMember.value = null
})

function openDetail(row: Member) {
	detailMember.value = row
	detailPanelVisible.value = true
}

// ── Quick Wallet Top-up ──────────────────────────────────────────────────────
const topUpMember = ref<Member | null>(null)
const topUpDialogVisible = ref(false)

watch(topUpDialogVisible, visible => {
	if (!visible) topUpMember.value = null
})

function openTopUp(row: Member) {
	topUpMember.value = row
	topUpDialogVisible.value = true
}

function onTopUpSuccess() {
	if (detailPanelVisible.value && detailMember.value) {
		// refresh detail panel if open
		const curr = detailMember.value
		detailMember.value = null
		detailMember.value = curr
	}
}

// ── Status change ────────────────────────────────────────────────────────────
const statusModalVisible = ref(false)
const submittingStatus = ref(false)
const statusTargetId = ref<number | null>(null)
const statusForm = ref<UpdateMemberStatusPayload>({ status: "active", reason: "" })

const statusOptions = computed<SelectOption[]>(() =>
	(["active", "deactivated", "blocked"] as const).map(s => ({
		label: t(`members.status.${s}`),
		value: s
	}))
)

function openStatusModal(row: Member) {
	statusTargetId.value = row.id
	statusForm.value = { status: row.status, reason: "" }
	statusModalVisible.value = true
}

async function submitStatusChange() {
	if (statusTargetId.value === null) return
	submittingStatus.value = true
	try {
		await updateMemberStatus(statusTargetId.value, statusForm.value)
		message.success(t("members.changeStatus.success"))
		statusModalVisible.value = false
		await loadMembers()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
		message.error(e.data?.message ?? t("members.loadError"))
	} finally {
		submittingStatus.value = false
	}
}

// ── Table columns ─────────────────────────────────────────────────────────────
function renderActions(row: Member) {
	const detailLabel = t("members.detail.button")
	const topUpLabel = t("members.topUp.button")
	const statusLabel = t("members.changeStatus.button")

	return h("div", { class: "flex gap-2" }, [
		h(
			NButton,
			{
				text: true,
				type: "primary",
				"aria-label": detailLabel,
				title: detailLabel,
				onClick: () => openDetail(row)
			},
			{ icon: () => h(Icon, { name: "carbon:view", size: 18 }) }
		),
		h(
			NButton,
			{
				text: true,
				type: "info",
				"aria-label": topUpLabel,
				title: topUpLabel,
				onClick: () => openTopUp(row)
			},
			{ icon: () => h(Icon, { name: "carbon:wallet", size: 18 }) }
		),
		h(
			NButton,
			{
				text: true,
				type: "warning",
				"aria-label": statusLabel,
				title: statusLabel,
				onClick: () => openStatusModal(row)
			},
			{ icon: () => h(Icon, { name: "carbon:status-change", size: 18 }) }
		)
	])
}

const columns = computed<DataTableColumns<Member>>(() => [
	{
		title: t("members.columns.member"),
		key: "name",
		render: row => {
			const avatar = row.personal_profile?.avatar_url
			const initials = row.name.trim().split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase() || "M"

			return h("div", { class: "flex items-center gap-3 py-1" }, [
				avatar
					? h(NAvatar, { round: true, size: 36, src: avatar, class: "shrink-0 ring-1 ring-emerald-600/20" })
					: h(NAvatar, { round: true, size: 36, class: "shrink-0 bg-emerald-700 text-white font-bold text-xs" }, { default: () => initials }),
				h("div", { class: "flex flex-col gap-0.5" }, [
					h("span", { class: "font-semibold text-sm leading-snug text-stone-900" }, row.name),
					h("span", { class: "text-xs text-secondary leading-snug font-mono" }, row.phone)
				])
			])
		}
	},
	{ title: t("members.columns.email"), key: "email" },
	{ title: t("members.columns.company"), key: "company", render: renderCompany },
	{ title: t("members.columns.status"), key: "status", render: renderStatusTag },
	{ title: t("resourceCrud.table.actionsColumn"), key: "actions", render: renderActions, width: 100 }
])
</script>
