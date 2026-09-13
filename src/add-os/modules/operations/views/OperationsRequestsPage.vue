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
				<n-select v-model:value="sortBy" size="small" :options="sortOptions" class="w-44" />
				<n-button circle size="small" secondary>
					<template #icon><Icon name="carbon:filter" :size="16" /></template>
				</n-button>
			</div>
		</div>

		<!-- Category Navigation Tabs -->
		<div class="flex border-b border-stone-200 gap-8 overflow-x-auto text-sm font-semibold">
			<button
				v-for="tab in tabs"
				:key="tab.id"
				class="pb-3 flex items-center gap-2 transition-colors whitespace-nowrap border-b-2 font-bold text-base"
				:class="selectedTab === tab.id ? 'border-teal-700 text-teal-800' : 'border-transparent text-stone-500 hover:text-stone-700'"
				@click="selectedTab = tab.id"
			>
				<Icon :name="tab.icon" :size="20" />
				<span>{{ tab.label }}</span>
			</button>
		</div>

		<!-- Filter Status Chips & Requests Count -->
		<div class="flex flex-wrap items-center justify-between gap-3 bg-stone-50/80 p-3 rounded-2xl border border-stone-200/70">
			<div class="flex items-center gap-2 overflow-x-auto py-1">
				<button
					v-for="status in statusFilterOptions"
					:key="status.value"
					class="px-4 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap"
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
			<span class="font-bold text-stone-700 text-xs sm:text-sm px-2">{{ filteredRequests.length }} requests found</span>
		</div>

		<!-- Requests Grid Cards (Responsive 1/2/3 Columns) -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<n-card
				v-for="req in filteredRequests"
				:key="req.id"
				size="small"
				class="shadow-sm border border-stone-200 hover:border-stone-300 transition-all rounded-2xl flex flex-col justify-between"
			>
				<div class="flex flex-col gap-4 h-full justify-between">
					<div class="flex flex-col gap-3">
						<div class="flex items-start justify-between gap-3">
							<div class="flex items-start gap-3">
								<div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" :class="req.iconBgClass">
									<Icon :name="req.icon" :size="24" :class="req.iconClass" />
								</div>
								<div class="flex flex-col">
									<h3 class="text-base font-bold text-stone-900 leading-snug">{{ req.title }}</h3>
									<span class="text-xs text-stone-500 font-medium mt-0.5">
										{{ req.typeLabel }} • <span class="font-mono text-stone-600">{{ req.reference }}</span>
									</span>
								</div>
							</div>

							<!-- Status & Priority Badges -->
							<div class="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
								<n-tag :type="req.statusType" size="small" round class="font-bold">
									{{ req.statusLabel }}
								</n-tag>
								<n-tag :type="req.priorityType" size="small" round class="font-semibold">
									{{ req.priorityLabel }}
								</n-tag>
							</div>
						</div>

						<!-- Details info box -->
						<div class="flex flex-col gap-2 text-xs text-stone-600 bg-stone-50/80 p-3 rounded-xl border border-stone-100">
							<div class="flex items-center gap-2">
								<Icon name="carbon:location" :size="16" class="text-stone-400 shrink-0" />
								<span class="truncate">{{ req.location }}</span>
							</div>
							<div class="flex items-center gap-2">
								<Icon name="carbon:user" :size="16" class="text-stone-400 shrink-0" />
								<span class="truncate">{{ req.requester }}</span>
							</div>
							<div class="flex items-center gap-2">
								<Icon name="carbon:time" :size="16" class="text-stone-400 shrink-0" />
								<span class="truncate">{{ req.timeText }}</span>
							</div>
						</div>
					</div>

					<!-- Action Buttons -->
					<div class="flex items-center gap-2.5 pt-2 border-t border-stone-100">
						<n-button secondary size="small" class="flex-1 rounded-lg font-semibold border-stone-200" @click="handleAction(req, 'view')">
							{{ t("operationsRequests.viewDetails") }}
						</n-button>
						<n-button type="primary" size="small" class="flex-1 rounded-lg font-bold shadow-sm" @click="handleAction(req, 'primary')">
							{{ req.primaryActionLabel }}
						</n-button>
					</div>
				</div>
			</n-card>
		</div>
	</div>
</template>

<script setup lang="ts">
import { NButton, NCard, NSelect, NTag, useMessage } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const message = useMessage()

const selectedTab = ref("booking")
const activeStatus = ref("all")
const sortBy = ref("newest")

const tabs = [
	{ id: "booking", label: "Booking Requests", icon: "carbon:calendar" },
	{ id: "service", label: "Service Requests", icon: "carbon:portfolio" },
	{ id: "technical", label: "Technical Issues", icon: "carbon:tools" }
]

const statusFilterOptions = [
	{ value: "all", label: "All" },
	{ value: "pending", label: "Pending" },
	{ value: "needs_documents", label: "Needs Documents" },
	{ value: "approved", label: "Approved" },
	{ value: "rejected", label: "Rejected" }
]

const sortOptions = [
	{ label: "Sort by: Newest", value: "newest" },
	{ label: "Sort by: Oldest", value: "oldest" }
]

const allRequests = [
	{
		id: 1,
		category: "booking",
		title: "Event Hall Grande",
		typeLabel: "Booking Request",
		reference: "REQ-20250527-1024",
		location: "Main Branch – Event Hall",
		requester: "Lina Samer",
		timeText: "May 27, 2025 • 2:00 PM – 6:00 PM",
		status: "pending",
		statusLabel: "Pending",
		statusType: "info" as const,
		priority: "normal",
		priorityLabel: "Normal",
		priorityType: "default" as const,
		icon: "carbon:calendar",
		iconBgClass: "bg-teal-50 text-teal-700",
		iconClass: "text-teal-700",
		primaryActionLabel: "Review Request"
	},
	{
		id: 2,
		category: "booking",
		title: "Meeting Room B",
		typeLabel: "Booking Request",
		reference: "REQ-20250527-1023",
		location: "Main Branch – Floor 2",
		requester: "Omar Hadi",
		timeText: "May 27, 2025 • 10:00 AM – 11:30 AM",
		status: "needs_documents",
		statusLabel: "Needs Documents",
		statusType: "warning" as const,
		priority: "normal",
		priorityLabel: "Normal",
		priorityType: "default" as const,
		icon: "carbon:document",
		iconBgClass: "bg-amber-50 text-amber-700",
		iconClass: "text-amber-700",
		primaryActionLabel: "Request Documents"
	},
	{
		id: 3,
		category: "technical",
		title: "Wi-Fi Not Working",
		typeLabel: "Technical Issue",
		reference: "TCK-20250527-2015",
		location: "Main Branch – Co-working Area",
		requester: "Ahmad Alali",
		timeText: "Reported: May 27, 2025 • 9:15 AM",
		status: "pending",
		statusLabel: "Pending",
		statusType: "info" as const,
		priority: "high",
		priorityLabel: "High",
		priorityType: "error" as const,
		icon: "carbon:tools",
		iconBgClass: "bg-rose-50 text-rose-700",
		iconClass: "text-rose-700",
		primaryActionLabel: "Assign Technician"
	},
	{
		id: 4,
		category: "service",
		title: "Cleaning Service",
		typeLabel: "Service Request",
		reference: "SRV-20250527-3011",
		location: "Main Branch – Meeting Room A",
		requester: "Sara Nasser",
		timeText: "Requested: May 27, 2025 • 8:40 AM",
		status: "approved",
		statusLabel: "Approved",
		statusType: "success" as const,
		priority: "normal",
		priorityLabel: "Normal",
		priorityType: "default" as const,
		icon: "carbon:portfolio",
		iconBgClass: "bg-emerald-50 text-emerald-700",
		iconClass: "text-emerald-700",
		primaryActionLabel: "Mark as Completed"
	},
	{
		id: 5,
		category: "technical",
		title: "Air Conditioning Not Cold",
		typeLabel: "Technical Issue",
		reference: "TCK-20250527-2009",
		location: "Main Branch – Office 3.12",
		requester: "Mohannad Jaber",
		timeText: "Reported: May 26, 2025 • 4:20 PM",
		status: "rejected",
		statusLabel: "Rejected",
		statusType: "default" as const,
		priority: "high",
		priorityLabel: "High",
		priorityType: "error" as const,
		icon: "carbon:temperature",
		iconBgClass: "bg-rose-50 text-rose-700",
		iconClass: "text-rose-700",
		primaryActionLabel: "View Notes"
	}
]

const filteredRequests = computed(() => {
	return allRequests.filter(req => {
		const matchCategory = selectedTab.value === "all" || req.category === selectedTab.value
		const matchStatus = activeStatus.value === "all" || req.status === activeStatus.value
		return matchCategory && matchStatus
	})
})

function handleAction(req: (typeof allRequests)[number], actionType: "view" | "primary") {
	if (actionType === "view") {
		message.info(`Viewing details for ${req.reference}`)
	} else {
		message.success(`Action '${req.primaryActionLabel}' executed for ${req.reference}`)
	}
}
</script>
