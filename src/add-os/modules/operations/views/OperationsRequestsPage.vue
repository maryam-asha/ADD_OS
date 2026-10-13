<!-- src/add-os/modules/operations/views/OperationsRequestsPage.vue -->
<template>
	<div class="flex flex-col gap-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
		<!-- Header -->
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-4">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold text-stone-900">{{ t("operationsRequests.title") }}</h1>
				<p class="text-sm text-stone-500">{{ t("operationsRequests.subtitle") }}</p>
			</div>
			<div class="flex items-center gap-3 shrink-0">
				<n-button
					v-if="selectedTab === 'catalog'"
					type="primary"
					@click="openServiceTypeForm(null)"
				>
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("operationsRequests.actions.addService") }}
				</n-button>
				<n-button
					secondary
					circle
					:loading="isLoadingRequests || isLoadingTypes"
					@click="handleRefresh"
				>
					<template #icon><Icon name="carbon:renew" :size="16" /></template>
				</n-button>
			</div>
		</div>

		<!-- Category Navigation Tabs -->
		<div class="flex border-b border-stone-200 gap-8 overflow-x-auto text-sm font-semibold">
			<button
				class="pb-3 flex items-center gap-2 transition-colors whitespace-nowrap border-b-2 font-bold text-base cursor-pointer"
				:class="selectedTab === 'requests' ? 'border-teal-700 text-teal-800' : 'border-transparent text-stone-500 hover:text-stone-700'"
				@click="selectedTab = 'requests'"
			>
				<Icon name="carbon:portfolio" :size="20" />
				<span>{{ t("operationsRequests.allRequests") }}</span>
			</button>
			<button
				class="pb-3 flex items-center gap-2 transition-colors whitespace-nowrap border-b-2 font-bold text-base cursor-pointer"
				:class="selectedTab === 'catalog' ? 'border-teal-700 text-teal-800' : 'border-transparent text-stone-500 hover:text-stone-700'"
				@click="selectedTab = 'catalog'"
			>
				<Icon name="carbon:settings" :size="20" />
				<span>{{ t("operationsRequests.serviceCatalog") }}</span>
			</button>
		</div>

		<!-- ── Tab 1: Service Requests ────────────────────────────────────────── -->
		<div v-if="selectedTab === 'requests'" class="flex flex-col gap-6">
			<!-- Filter Status Chips, Branch & Counter -->
			<div class="flex flex-wrap items-center justify-between gap-3 bg-stone-50/80 p-3 rounded-2xl border border-stone-200/70">
				<div class="flex items-center gap-2 overflow-x-auto py-1">
					<button
						v-for="status in statusFilterOptions"
						:key="status.value"
						class="px-4 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap cursor-pointer"
						:class="
							activeStatus === status.value
								? 'bg-teal-800 text-white border-teal-800 shadow-sm'
								: 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
						"
						@click="activeStatus = status.value"
					>
						{{ status.label }}
					</button>
				</div>

				<div class="flex items-center gap-3">
					<n-select
						v-model:value="selectedBranchId"
						size="small"
						:options="branchOptions"
						placeholder="Filter by Branch"
						class="w-44"
						clearable
					/>
					<span class="font-bold text-stone-700 text-xs sm:text-sm whitespace-nowrap px-1">
						{{ requests.length }} {{ t("operationsRequests.allRequests") }}
					</span>
				</div>
			</div>

			<!-- Loading indicator -->
			<div v-if="isLoadingRequests" class="flex justify-center p-16">
				<n-spin size="large" />
			</div>

			<!-- Empty State -->
			<div
				v-else-if="requests.length === 0"
				class="flex flex-col items-center justify-center p-16 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200 gap-3 text-stone-400"
			>
				<Icon name="carbon:document" :size="36" />
				<span class="text-sm font-medium">{{ t("operationsRequests.noRequests") }}</span>
			</div>

			<!-- Requests Grid Cards (Responsive 1/2/3 Columns) -->
			<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<n-card
					v-for="req in requests"
					:key="req.id"
					size="small"
					class="shadow-sm border border-stone-200 hover:border-stone-300 transition-all rounded-2xl flex flex-col justify-between"
				>
					<div class="flex flex-col gap-4 h-full justify-between">
						<div class="flex flex-col gap-3">
							<div class="flex items-start justify-between gap-3">
								<div class="flex items-start gap-3">
									<div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-teal-50 text-teal-700">
										<Icon :name="resolveServiceIcon(req.service_type?.icon)" :size="24" />
									</div>
									<div class="flex flex-col">
										<h3 class="text-base font-bold text-stone-900 leading-snug">
											{{ req.service_type?.name || 'Service Request' }}
										</h3>
										<span class="text-xs text-stone-500 font-medium mt-0.5">
											<span class="font-mono text-stone-600">REQ-{{ req.id }}</span>
										</span>
									</div>
								</div>

								<!-- Status Badge -->
								<div class="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
									<n-tag :type="statusTagType(req.status)" size="small" round class="font-bold">
										{{ statusLabel(req.status) }}
									</n-tag>
								</div>
							</div>

							<!-- Details info box -->
							<div class="flex flex-col gap-2 text-xs text-stone-600 bg-stone-50/80 p-3 rounded-xl border border-stone-100">
								<div class="flex items-center gap-2">
									<Icon name="carbon:location" :size="16" class="text-stone-400 shrink-0" />
									<span class="truncate">
										{{ req.branch?.name ? `${req.branch.name}${req.space?.name ? ` – ${req.space.name}` : ''}` : 'No branch specified' }}
									</span>
								</div>
								<div class="flex items-center gap-2">
									<Icon name="carbon:time" :size="16" class="text-stone-400 shrink-0" />
									<span class="truncate">{{ formatDate(req.submitted_at) }}</span>
								</div>
								<div v-if="req.resolution_note" class="flex items-start gap-2 text-teal-800 font-medium pt-1 border-t border-stone-200/50">
									<Icon name="carbon:checkmark" :size="16" class="text-teal-600 shrink-0 mt-0.5" />
									<span class="line-clamp-2 text-xs">{{ req.resolution_note }}</span>
								</div>
							</div>
						</div>

						<!-- Action Buttons -->
						<div class="flex items-center gap-2.5 pt-2 border-t border-stone-100">
							<n-button
								secondary
								size="small"
								class="flex-1 rounded-lg font-semibold border-stone-200"
								@click="openDetails(req)"
							>
								{{ t("operationsRequests.viewDetails") }}
							</n-button>
							<n-button
								v-if="req.status === 'pending'"
								type="primary"
								size="small"
								class="flex-1 rounded-lg font-bold shadow-sm"
								@click="quickUpdateStatus(req, 'in_progress')"
							>
								{{ t("operationsRequests.actions.start") }}
							</n-button>
							<n-button
								v-else-if="req.status === 'in_progress'"
								type="success"
								size="small"
								class="flex-1 rounded-lg font-bold shadow-sm"
								@click="openStatusModal(req)"
							>
								{{ t("operationsRequests.actions.resolve") }}
							</n-button>
						</div>
					</div>
				</n-card>
			</div>
		</div>

		<!-- ── Tab 2: Service Catalog Management ─────────────────────────────── -->
		<div v-else-if="selectedTab === 'catalog'" class="flex flex-col gap-6">
			<!-- Loading indicator -->
			<div v-if="isLoadingTypes" class="flex justify-center p-16">
				<n-spin size="large" />
			</div>

			<!-- Empty State -->
			<div
				v-else-if="serviceTypes.length === 0"
				class="flex flex-col items-center justify-center p-16 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200 gap-3 text-stone-400"
			>
				<Icon name="carbon:portfolio" :size="36" />
				<span class="text-sm font-medium">{{ t("operationsRequests.noServices") }}</span>
			</div>

			<!-- Service Types Cards -->
			<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<n-card
					v-for="st in serviceTypes"
					:key="st.id"
					size="small"
					class="shadow-sm border border-stone-200 hover:border-stone-300 transition-all rounded-2xl flex flex-col justify-between"
				>
					<div class="flex flex-col gap-4 h-full justify-between">
						<div class="flex flex-col gap-3">
							<div class="flex items-start justify-between gap-3">
								<div class="flex items-start gap-3">
									<div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-stone-100 text-stone-700">
										<Icon :name="resolveServiceIcon(st.icon)" :size="24" />
									</div>
									<div class="flex flex-col">
										<h3 class="text-base font-bold text-stone-900 leading-snug">{{ st.name }}</h3>
										<span class="text-xs text-stone-500 font-mono">{{ st.slug }}</span>
									</div>
								</div>

								<div class="flex flex-wrap items-center justify-end gap-1.5 max-w-[50%]">
									<n-tag size="small" round :type="st.is_active ? 'success' : 'default'">
										{{ st.is_active ? t('operationsRequests.catalog.active') : t('operationsRequests.catalog.inactive') }}
									</n-tag>
									<n-tag size="small" round :type="st.is_coming_soon ? 'warning' : 'info'">
										{{ st.is_coming_soon ? t('operationsRequests.catalog.comingSoon') : t('operationsRequests.catalog.available') }}
									</n-tag>
									<n-tag v-if="st.show_on_home" size="small" round type="primary">
										{{ t('operationsRequests.catalog.onHome') }}
									</n-tag>
								</div>
							</div>

							<p v-if="st.description" class="text-xs text-stone-500 line-clamp-2">
								{{ st.description }}
							</p>

							<!-- Configuration meta -->
							<div class="flex flex-col gap-1.5 p-3 bg-stone-50/80 rounded-xl border border-stone-100 text-xs text-stone-600">
								<div class="flex items-center justify-between">
									<span class="text-stone-400">{{ t('operationsRequests.catalog.method') }}:</span>
									<span class="font-semibold uppercase tracking-wider text-teal-800">{{ st.request_method }}</span>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-stone-400">{{ t('operationsRequests.catalog.locationRequired') }}:</span>
									<span class="font-medium">{{ st.requires_location ? 'Yes' : 'No' }}</span>
								</div>
							</div>
						</div>

						<!-- Actions -->
						<div class="flex items-center justify-between pt-3 border-t border-stone-100">
							<n-button
								v-if="st.request_method === 'form'"
								secondary
								size="small"
								class="rounded-lg font-semibold"
								@click="openFieldsDrawer(st)"
							>
								<template #icon><Icon name="carbon:license-draft" :size="16" /></template>
								{{ t('operationsRequests.catalog.fields') }}
							</n-button>
							<div v-else class="text-xs text-stone-400 italic">
								Non-form service
							</div>

							<div class="flex items-center gap-2">
								<n-button
									size="small"
									quaternary
									:title="t('operationsRequests.actions.editService')"
									@click="openServiceTypeForm(st)"
								>
									<template #icon><Icon name="carbon:edit" :size="16" /></template>
								</n-button>
								<n-button
									size="small"
									secondary
									:type="st.is_coming_soon ? 'info' : 'warning'"
									@click="confirmToggleComingSoon(st)"
								>
									<template #icon>
										<Icon :name="st.is_coming_soon ? 'carbon:checkmark' : 'carbon:time'" :size="14" />
									</template>
									{{ st.is_coming_soon ? t('operationsRequests.catalog.makeAvailable') : t('operationsRequests.catalog.setComingSoon') }}
								</n-button>
								<n-button
									size="small"
									quaternary
									type="error"
									@click="confirmDeleteServiceType(st)"
								>
									<template #icon><Icon name="carbon:trash-can" :size="16" /></template>
								</n-button>
							</div>
						</div>
					</div>
				</n-card>
			</div>
		</div>

		<!-- ── Modals & Drawers ──────────────────────────────────────────────── -->
		<ServiceRequestDetailModal
			v-model:show="showDetailModal"
			:request="selectedRequest"
			@open-status-modal="openStatusModal"
		/>

		<ServiceStatusUpdateModal
			v-model:show="showStatusModal"
			:request="selectedRequest"
			:is-submitting="isUpdatingStatus"
			@submit="handleStatusSubmit"
		/>

		<ServiceTypeFieldsDrawer
			v-model:show="showFieldsDrawer"
			:service-type="selectedServiceType"
		/>

		<ServiceTypeFormModal
			v-model:show="showServiceTypeForm"
			:service-type="editingServiceType"
			@saved="fetchServiceTypes"
		/>
	</div>
</template>

<script setup lang="ts">
import type { ServiceRequest, ServiceRequestQueryParams, ServiceRequestStatus, ServiceType } from "../types/service"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import { NButton, NCard, NSelect, NSpin, NTag, useDialog, useMessage } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { listBranches } from "@/add-os/services/branches"
import { listServiceRequests, updateServiceRequestStatus } from "@/add-os/services/service-requests"
import { listServiceTypes, removeServiceType, updateServiceType } from "@/add-os/services/service-types"
import Icon from "@/components/common/Icon.vue"
import ServiceRequestDetailModal from "../components/ServiceRequestDetailModal.vue"
import ServiceStatusUpdateModal from "../components/ServiceStatusUpdateModal.vue"
import ServiceTypeFieldsDrawer from "../components/ServiceTypeFieldsDrawer.vue"
import ServiceTypeFormModal from "../components/ServiceTypeFormModal.vue"

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

// State
const selectedTab = ref<"requests" | "catalog">("requests")
const activeStatus = ref<string>("all")
const selectedBranchId = ref<number | null>(null)

const requests = ref<ServiceRequest[]>([])
const serviceTypes = ref<ServiceType[]>([])
const branches = ref<Branch[]>([])

const isLoadingRequests = ref(false)
const isLoadingTypes = ref(false)
const isUpdatingStatus = ref(false)

// Modals
const showDetailModal = ref(false)
const showStatusModal = ref(false)
const showFieldsDrawer = ref(false)
const showServiceTypeForm = ref(false)
/** The service the form edits; null when it creates one. */
const editingServiceType = ref<ServiceType | null>(null)

const selectedRequest = ref<ServiceRequest | null>(null)
const selectedServiceType = ref<ServiceType | null>(null)

// Status filter chips
const statusFilterOptions = computed(() => [
	{ value: "all", label: t("operationsRequests.status.all") },
	{ value: "pending", label: t("operationsRequests.status.pending") },
	{ value: "in_progress", label: t("operationsRequests.status.in_progress") },
	{ value: "resolved", label: t("operationsRequests.status.resolved") },
	{ value: "rejected", label: t("operationsRequests.status.rejected") }
])

const branchOptions = computed(() => [
	{ value: null, label: t("operationsRequests.allBranches") },
	...branches.value.map(b => ({
		value: b.id,
		label: typeof b.name === "string" ? b.name : (b.name as { en: string }).en || String(b.id)
	}))
])

// ── API Fetchers ─────────────────────────────────────────────────────────────

async function fetchRequests() {
	isLoadingRequests.value = true
	try {
		const query: ServiceRequestQueryParams = {}
		if (activeStatus.value !== "all") {
			query.status = activeStatus.value
		}
		if (selectedBranchId.value) {
			query.branch_id = selectedBranchId.value
		}
		requests.value = await listServiceRequests(query)
	} catch {
		message.error("Failed to fetch service requests")
	} finally {
		isLoadingRequests.value = false
	}
}

async function fetchServiceTypes() {
	isLoadingTypes.value = true
	try {
		serviceTypes.value = await listServiceTypes()
	} catch {
		message.error("Failed to fetch service catalog")
	} finally {
		isLoadingTypes.value = false
	}
}

async function fetchBranches() {
	try {
		branches.value = await listBranches()
	} catch {
		// optional non-fatal
	}
}

function handleRefresh() {
	if (selectedTab.value === "requests") {
		fetchRequests()
	} else {
		fetchServiceTypes()
	}
}

watch([activeStatus, selectedBranchId], () => {
	if (selectedTab.value === "requests") {
		fetchRequests()
	}
})

watch(selectedTab, newTab => {
	if (newTab === "requests") {
		fetchRequests()
	} else {
		fetchServiceTypes()
	}
})

onMounted(() => {
	fetchRequests()
	fetchBranches()
})

// ── Status updates ───────────────────────────────────────────────────────────

function openDetails(req: ServiceRequest) {
	selectedRequest.value = req
	showDetailModal.value = true
}

function openStatusModal(req: ServiceRequest) {
	selectedRequest.value = req
	showDetailModal.value = false
	showStatusModal.value = true
}

async function quickUpdateStatus(req: ServiceRequest, newStatus: ServiceRequestStatus) {
	try {
		await updateServiceRequestStatus(req.id, { status: newStatus })
		message.success(t("operationsRequests.actions.updateStatus"))
		await fetchRequests()
	} catch {
		message.error("Failed to update status")
	}
}

async function handleStatusSubmit(payload: { status: ServiceRequestStatus; resolution_note?: { en?: string; ar?: string } }) {
	if (!selectedRequest.value) return
	isUpdatingStatus.value = true
	try {
		await updateServiceRequestStatus(selectedRequest.value.id, payload)
		message.success(t("operationsRequests.actions.updateStatus"))
		showStatusModal.value = false
		await fetchRequests()
	} catch {
		message.error("Failed to update status")
	} finally {
		isUpdatingStatus.value = false
	}
}

// ── Catalog Actions ──────────────────────────────────────────────────────────

function openServiceTypeForm(type: ServiceType | null) {
	editingServiceType.value = type
	showServiceTypeForm.value = true
}

function openFieldsDrawer(type: ServiceType) {
	selectedServiceType.value = type
	showFieldsDrawer.value = true
}

function confirmToggleComingSoon(st: ServiceType) {
	const willBeComingSoon = !st.is_coming_soon
	const title = t("operationsRequests.catalog.confirmStatusChangeTitle")
	const content = willBeComingSoon
		? t("operationsRequests.catalog.confirmSetComingSoon", { name: st.name })
		: t("operationsRequests.catalog.confirmMakeAvailable", { name: st.name })

	dialog.info({
		title,
		content,
		positiveText: t("operationsRequests.catalog.confirmOk"),
		negativeText: t("operationsRequests.catalog.confirmCancel"),
		onPositiveClick: async () => {
			try {
				await updateServiceType(st.id, { is_coming_soon: willBeComingSoon })
				message.success(t("operationsRequests.catalog.statusUpdated"))
				await fetchServiceTypes()
			} catch {
				message.error("Failed to update service")
			}
		}
	})
}

function confirmDeleteServiceType(st: ServiceType) {
	dialog.warning({
		title: t("resourceCrud.table.deleteAction"),
		content: `${t("resourceCrud.table.deleteConfirmTitle")} (${st.name})`,
		positiveText: t("resourceCrud.table.deleteConfirmOk"),
		negativeText: t("resourceCrud.table.deleteConfirmCancel"),
		onPositiveClick: async () => {
			try {
				await removeServiceType(st.id)
				message.success(t("resourceCrud.table.deleteAction"))
				await fetchServiceTypes()
			} catch {
				message.error("Failed to delete service")
			}
		}
	})
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusTagType(status: ServiceRequestStatus): "default" | "info" | "success" | "warning" | "error" {
	switch (status) {
		case "pending":
			return "warning"
		case "in_progress":
			return "info"
		case "resolved":
			return "success"
		case "rejected":
			return "error"
		default:
			return "default"
	}
}

function statusLabel(status: ServiceRequestStatus): string {
	return t(`operationsRequests.status.${status}`) || status
}

function formatDate(dateStr: string): string {
	if (!dateStr) return "—"
	try {
		const d = new Date(dateStr)
		return d.toLocaleDateString()
	} catch {
		return dateStr
	}
}

function resolveServiceIcon(iconName?: string): string {
	if (!iconName) return "carbon:portfolio"
	const map: Record<string, string> = {
		"grid-dots": "carbon:category",
		"tool": "carbon:tools",
		"tools": "carbon:tools",
		"map-pin": "carbon:location",
		"coffee": "carbon:cafe",
		"users": "carbon:user-multiple",
		"printer": "carbon:document"
	}
	return map[iconName] || "carbon:portfolio"
}
</script>
