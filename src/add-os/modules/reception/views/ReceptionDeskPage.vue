<!-- src/add-os/modules/reception/views/ReceptionDeskPage.vue -->
<template>
	<div class="flex flex-col gap-6 max-w-5xl mx-auto p-4 sm:p-6">
		<!-- Operational Date & Status Header -->
		<n-card size="small" class="shadow-sm border border-stone-200">
			<div class="flex items-center justify-between flex-wrap gap-3">
				<div class="flex items-center gap-3">
					<Icon name="carbon:calendar" :size="22" class="text-stone-600" />
					<span class="text-base font-semibold text-stone-800">
						{{ formattedDate }}
					</span>
				</div>
				<n-tag type="success" round size="medium" class="px-3 font-medium">
					<template #icon>
						<span class="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1"></span>
					</template>
					{{ t("reception.statusOperational") }}
				</n-tag>
			</div>
		</n-card>

		<!-- 4 KPI Stat Cards -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<n-card v-for="stat in statCards" :key="stat.key" size="small" class="hover:shadow-md transition-shadow">
				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<div class="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-700">
							<Icon :name="stat.icon" :size="22" />
						</div>
						<span class="text-3xl font-extrabold text-stone-900 tracking-tight">
							{{ stat.value }}
						</span>
					</div>
					<div>
						<h3 class="text-sm font-semibold text-stone-700">{{ stat.title }}</h3>
						<p class="text-xs flex items-center gap-1 mt-1 font-medium" :class="stat.trendColor">
							<Icon :name="stat.trendIcon" :size="14" />
							<span>{{ stat.trendText }}</span>
						</p>
					</div>
				</div>
			</n-card>
		</div>

		<!-- Quick Actions -->
		<div class="flex flex-col gap-3">
			<h2 class="text-lg font-bold text-stone-800">{{ t("reception.quickActionsTitle") }}</h2>
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<n-button
					type="primary"
					size="large"
					class="h-24 flex-col gap-2 rounded-xl text-base font-bold shadow-sm"
					@click="router.push('/bookings/active-sessions')"
				>
					<Icon name="carbon:play-filled-alt" :size="26" />
					<span>{{ t("reception.actions.startSession") }}</span>
				</n-button>

				<n-button
					secondary
					size="large"
					class="h-24 flex-col gap-2 rounded-xl text-base font-semibold border border-stone-200"
					@click="router.push('/members/individuals')"
				>
					<Icon name="carbon:user-follow" :size="26" class="text-stone-700" />
					<span class="text-stone-800">{{ t("reception.actions.registerGuest") }}</span>
				</n-button>

				<n-button
					secondary
					size="large"
					class="h-24 flex-col gap-2 rounded-xl text-base font-semibold border border-stone-200"
					@click="router.push('/payments/wallet-top-ups')"
				>
					<Icon name="carbon:wallet" :size="26" class="text-stone-700" />
					<span class="text-stone-800">{{ t("reception.actions.topUpWallet") }}</span>
				</n-button>

				<n-button
					secondary
					size="large"
					class="h-24 flex-col gap-2 rounded-xl text-base font-semibold border border-stone-200"
					@click="router.push('/bookings/close-session')"
				>
					<Icon name="carbon:close-outline" :size="26" class="text-stone-700" />
					<span class="text-stone-800">{{ t("reception.actions.closeSession") }}</span>
				</n-button>
			</div>
		</div>

		<!-- Up Next Section -->
		<n-card size="small" class="shadow-sm border border-stone-200">
			<template #header>
				<div class="flex items-center justify-between">
					<span class="text-lg font-bold text-stone-900">{{ t("reception.upNextTitle") }}</span>
					<n-button text type="primary" size="small" @click="router.push('/bookings/approval-queue')">
						{{ t("common.viewAll") }}
						<template #icon><Icon name="carbon:chevron-right" :size="16" /></template>
					</n-button>
				</div>
			</template>

			<div class="divide-y divide-stone-100">
				<div
					v-for="item in upNextItems"
					:key="item.id"
					class="py-3.5 flex items-center justify-between hover:bg-stone-50/80 px-2 rounded-lg transition-colors cursor-pointer"
					@click="handleItemClick(item)"
				>
					<div class="flex items-center gap-3.5">
						<div class="w-10 h-10 rounded-full flex items-center justify-center" :class="item.bgClass">
							<Icon :name="item.icon" :size="20" :class="item.iconClass" />
						</div>
						<div class="flex flex-col">
							<span class="font-bold text-stone-900 text-sm sm:text-base">{{ item.title }}</span>
							<span class="text-xs text-stone-500">{{ item.subtitle }}</span>
						</div>
					</div>

					<div class="flex items-center gap-2 text-stone-500 font-medium text-xs sm:text-sm">
						<span>{{ item.time }}</span>
						<Icon name="carbon:chevron-right" :size="18" />
					</div>
				</div>
			</div>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import { NButton, NCard, NTag } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

const { t } = useI18n()
const router = useRouter()

const formattedDate = computed(() => {
	const now = new Date()
	return now.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
})

const statCards = computed(() => [
	{
		key: "active_sessions",
		title: t("reception.stats.activeSessions"),
		value: 24,
		icon: "carbon:user",
		trendIcon: "carbon:arrow-up",
		trendText: `3 ${t("reception.vsYesterday")}`,
		trendColor: "text-emerald-600"
	},
	{
		key: "expected_bookings",
		title: t("reception.stats.expectedBookings"),
		value: 18,
		icon: "carbon:calendar",
		trendIcon: "carbon:subtract",
		trendText: `0 ${t("reception.vsYesterday")}`,
		trendColor: "text-stone-500"
	},
	{
		key: "pending_guests",
		title: t("reception.stats.pendingGuests"),
		value: 7,
		icon: "carbon:group",
		trendIcon: "carbon:arrow-up",
		trendText: `2 ${t("reception.vsYesterday")}`,
		trendColor: "text-amber-600"
	},
	{
		key: "pending_payments",
		title: t("reception.stats.pendingPayments"),
		value: 5,
		icon: "carbon:wallet",
		trendIcon: "carbon:arrow-up",
		trendText: `1 ${t("reception.vsYesterday")}`,
		trendColor: "text-amber-600"
	}
])

const upNextItems = [
	{
		id: 1,
		title: "Guest Arrival",
		subtitle: "Omar Al-Hassan",
		time: "10:30 AM",
		icon: "carbon:user-avatar",
		bgClass: "bg-amber-50 text-amber-700",
		iconClass: "text-amber-700",
		route: "/bookings/active-sessions"
	},
	{
		id: 2,
		title: "Meeting Room Booking",
		subtitle: "Board Room • 2 Guests",
		time: "11:00 AM",
		icon: "carbon:calendar",
		bgClass: "bg-stone-100 text-stone-700",
		iconClass: "text-stone-700",
		route: "/bookings/approval-queue"
	},
	{
		id: 3,
		title: "Cash Payment",
		subtitle: "From Walid K.",
		time: "11:30 AM",
		icon: "carbon:wallet",
		bgClass: "bg-orange-50 text-orange-700",
		iconClass: "text-orange-700",
		route: "/payments/wallet-top-ups"
	},
	{
		id: 4,
		title: "Session Closing",
		subtitle: "Sara M.",
		time: "01:00 PM",
		icon: "carbon:play-outline",
		bgClass: "bg-emerald-50 text-emerald-700",
		iconClass: "text-emerald-700",
		route: "/bookings/close-session"
	}
]

function handleItemClick(item: (typeof upNextItems)[number]) {
	if (item.route) router.push(item.route)
}
</script>
