<!-- src/add-os/modules/payments/views/CashRegisterPage.vue -->
<template>
	<div class="flex flex-col gap-6">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.cashRegister") }}</h1>
			<p class="text-secondary">{{ t("cashRegister.description") }}</p>
		</div>

		<!-- Current Session Status Card -->
		<n-card :bordered="true" class="shadow-sm">
			<div v-if="loadingCurrent" class="py-4 text-center">
				<n-spin size="medium" />
			</div>

			<div v-else-if="currentSession" class="flex flex-col gap-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<n-tag type="success" round bordered>
							{{ t("cashRegister.status.open") }}
						</n-tag>
						<span class="text-lg font-semibold">{{ currentSession.branch_name || currentSession.branch_id }}</span>
					</div>
					<n-button type="error" @click="openCloseModal">
						{{ t("cashRegister.closeButton") }}
					</n-button>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border-subtle">
					<div>
						<div class="text-xs text-secondary">{{ t("cashRegister.columns.operator") }}</div>
						<div class="font-medium">{{ currentSession.operator_name || '—' }}</div>
					</div>
					<div>
						<div class="text-xs text-secondary">{{ t("cashRegister.columns.openedAt") }}</div>
						<div class="font-medium">{{ formatIsoDate(currentSession.opened_at) }}</div>
					</div>
					<div>
						<div class="text-xs text-secondary">{{ t("cashRegister.columns.openingBalance") }}</div>
						<div class="font-medium text-primary">{{ formatAmount(currentSession.opening_balance) }}</div>
					</div>
				</div>
			</div>

			<div v-else class="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
				<div class="flex items-center gap-3">
					<n-tag type="default" round bordered>
						{{ t("cashRegister.status.closed") }}
					</n-tag>
					<span class="text-base text-secondary">{{ t("cashRegister.noOpenSession") }}</span>
				</div>
				<n-button
					type="primary"
					class="!bg-[var(--add-primary)] hover:!bg-[var(--add-primary-hover)] !text-white"
					@click="openOpenModal"
				>
					<template #icon><Icon name="carbon:add" :size="18" color="#ffffff" /></template>
					{{ t("cashRegister.openButton") }}
				</n-button>
			</div>
		</n-card>

		<!-- Sessions History -->
		<div class="flex flex-col gap-3">
			<h2 class="text-xl font-bold">{{ t("cashRegister.historyTitle") }}</h2>
			<n-data-table
				:columns
				:data="sessions"
				:loading="loadingHistory"
				:bordered="false"
				class="bg-surface-raised rounded-lg shadow-sm"
			/>
		</div>

		<!-- Open Session Modal -->
		<n-modal v-model:show="openModalVisible" preset="card" :title="t('cashRegister.openModal.title')" class="max-w-md">
			<n-form ref="openFormRef" :model="openForm" :rules="openRules" label-placement="top">
				<n-form-item path="opening_balance" :label="t('cashRegister.openModal.openingBalance')">
					<n-input v-model:value="openForm.opening_balance" placeholder="0.00" inputmode="decimal" />
				</n-form-item>
				<n-form-item path="notes" :label="t('cashRegister.openModal.notes')">
					<n-input v-model:value="openForm.notes" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="openModalVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="submittingOpen" @click="handleOpenSubmit">{{ t("resourceCrud.form.submit") }}</n-button>
				</div>
			</template>
		</n-modal>

		<!-- Close Session Modal -->
		<n-modal v-model:show="closeModalVisible" preset="card" :title="t('cashRegister.closeModal.title')" class="max-w-md">
			<n-form ref="closeFormRef" :model="closeForm" :rules="closeRules" label-placement="top">
				<n-form-item path="closing_balance" :label="t('cashRegister.closeModal.closingBalance')">
					<n-input v-model:value="closeForm.closing_balance" placeholder="0.00" inputmode="decimal" />
				</n-form-item>
				<n-form-item path="notes" :label="t('cashRegister.closeModal.notes')">
					<n-input v-model:value="closeForm.notes" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="closeModalVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="submittingClose" @click="handleCloseSubmit">{{ t("resourceCrud.form.submit") }}</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, FormInst, FormRules } from "naive-ui"
import type { CashRegisterSession } from "@/add-os/modules/payments/types/cash-register"
import { NButton, NCard, NDataTable, NForm, NFormItem, NInput, NModal, NSpin, NTag, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { currentLocale } from "@/add-os/lang/currentLocale"
import {
	closeCashRegisterSession,
	getCurrentSession,
	listCashRegisterSessions,
	openCashRegisterSession
} from "@/add-os/services/cash-register"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()

const currentSession = ref<CashRegisterSession | null>(null)
const sessions = ref<CashRegisterSession[]>([])

const loadingCurrent = ref(false)
const loadingHistory = ref(false)

const openModalVisible = ref(false)
const submittingOpen = ref(false)
const openFormRef = ref<FormInst | null>(null)
const openForm = ref<{ opening_balance: string; notes: string }>({
	opening_balance: "0.00",
	notes: ""
})

const closeModalVisible = ref(false)
const submittingClose = ref(false)
const closeFormRef = ref<FormInst | null>(null)
const closeForm = ref<{ closing_balance: string; notes: string }>({
	closing_balance: "",
	notes: ""
})

function formatIsoDate(iso: string | null | undefined): string {
	if (!iso) return "—"
	return iso.replace("T", " ").substring(0, 16)
}

function formatAmount(val: string | null | undefined): string {
	if (val === null || val === undefined || val === "") return "—"
	const num = Number(val)
	return isNaN(num) ? val : formatNumber(num)
}

const columns = computed<DataTableColumns<CashRegisterSession>>(() => [
	{ title: t("cashRegister.columns.id"), key: "id", width: 70 },
	{ title: t("cashRegister.columns.operator"), key: "operator_name", render: row => row.operator_name || "—" },
	{
		title: t("cashRegister.columns.branch"),
		key: "branch_name",
		render: row => (typeof row.branch_name === "string" ? row.branch_name : row.branch_name ? pickLocalized(row.branch_name, currentLocale.value) : "—")
	},
	{
		title: t("cashRegister.columns.status"),
		key: "status",
		render: row =>
			h(
				NTag,
				{ type: row.status === "open" ? "success" : "default", round: true, bordered: true },
				{ default: () => t(`cashRegister.status.${row.status}`) }
			)
	},
	{ title: t("cashRegister.columns.openedAt"), key: "opened_at", render: row => formatIsoDate(row.opened_at) },
	{ title: t("cashRegister.columns.closedAt"), key: "closed_at", render: row => formatIsoDate(row.closed_at) },
	{ title: t("cashRegister.columns.openingBalance"), key: "opening_balance", render: row => formatAmount(row.opening_balance) },
	{ title: t("cashRegister.columns.expectedBalance"), key: "expected_balance", render: row => formatAmount(row.expected_balance) },
	{ title: t("cashRegister.columns.closingBalance"), key: "closing_balance", render: row => formatAmount(row.closing_balance) },
	{
		title: t("cashRegister.columns.difference"),
		key: "difference",
		render: row => {
			if (row.difference === null) return "—"
			const diff = Number(row.difference)
			const type = diff === 0 ? "default" : diff > 0 ? "success" : "error"
			return h(NTag, { type, size: "small" }, { default: () => formatAmount(row.difference) })
		}
	}
])

const openRules: FormRules = {
	opening_balance: { required: true, trigger: ["blur", "input"] }
}

const closeRules: FormRules = {
	closing_balance: { required: true, trigger: ["blur", "input"] }
}

async function fetchCurrent() {
	loadingCurrent.value = true
	try {
		currentSession.value = await getCurrentSession()
	} catch (err) {
		console.error("Failed to load current register session", err)
	} finally {
		loadingCurrent.value = false
	}
}

async function fetchHistory() {
	loadingHistory.value = true
	try {
		const res = await listCashRegisterSessions()
		sessions.value = res.data
	} catch (err) {
		console.error("Failed to load sessions history", err)
	} finally {
		loadingHistory.value = false
	}
}

function openOpenModal() {
	openForm.value = {
		opening_balance: "0.00",
		notes: ""
	}
	openModalVisible.value = true
}

function openCloseModal() {
	closeForm.value = {
		closing_balance: "",
		notes: ""
	}
	closeModalVisible.value = true
}

async function handleOpenSubmit() {
	try {
		await openFormRef.value?.validate()
	} catch {
		return
	}
	submittingOpen.value = true
	try {
		await openCashRegisterSession({
			opening_balance: openForm.value.opening_balance,
			notes: openForm.value.notes
		})
		message.success(t("cashRegister.openSuccess"))
		openModalVisible.value = false
		await Promise.all([fetchCurrent(), fetchHistory()])
	} catch (err) {
		message.error(t("cashRegister.openError"))
	} finally {
		submittingOpen.value = false
	}
}

async function handleCloseSubmit() {
	try {
		await closeFormRef.value?.validate()
	} catch {
		return
	}
	if (!currentSession.value) return
	submittingClose.value = true
	try {
		await closeCashRegisterSession(currentSession.value.id, {
			closing_balance: closeForm.value.closing_balance,
			notes: closeForm.value.notes
		})
		message.success(t("cashRegister.closeSuccess"))
		closeModalVisible.value = false
		await Promise.all([fetchCurrent(), fetchHistory()])
	} catch (err) {
		message.error(t("cashRegister.closeError"))
	} finally {
		submittingClose.value = false
	}
}

onMounted(() => {
	fetchCurrent()
	fetchHistory()
})
</script>
