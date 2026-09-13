<!-- src/add-os/modules/events/views/EventCancellationDetailsPage.vue -->
<template>
	<div class="flex flex-col gap-6 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
		<!-- Header Top Bar -->
		<div class="flex items-center justify-between border-b border-stone-200/80 pb-4">
			<div class="flex items-center gap-3">
				<n-button circle secondary @click="router?.back?.()">
					<template #icon><Icon name="carbon:arrow-left" :size="18" /></template>
				</n-button>
				<div class="flex flex-col">
					<h1 class="text-2xl font-bold text-stone-900">{{ t("eventCancellation.title") }}</h1>
					<span class="text-xs text-teal-700 font-medium">{{ t("eventCancellation.supportSubtitle") }}</span>
				</div>
			</div>
		</div>

		<!-- 2-Column Responsive Layout -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
			<!-- Left Column: Banner, Event Media & Ops Announcement -->
			<div class="lg:col-span-7 flex flex-col gap-6">
				<!-- Hero Cancellation Banner -->
				<div class="flex flex-col items-center justify-center text-center gap-3 py-6 bg-amber-50/40 border border-amber-100 rounded-2xl shadow-2xs">
					<div class="w-20 h-20 rounded-full bg-orange-100/70 border-4 border-orange-50 flex items-center justify-center shadow-inner">
						<div class="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center text-white">
							<Icon name="carbon:calendar-settings" :size="28" />
						</div>
					</div>
					<div class="flex flex-col gap-1 max-w-md">
						<h2 class="text-2xl font-extrabold text-stone-900 tracking-tight">{{ t("eventCancellation.heroTitle") }}</h2>
						<p class="text-xs sm:text-sm text-stone-500 font-medium">{{ t("eventCancellation.heroSubtitle") }}</p>
					</div>
				</div>

				<!-- Event Info Card -->
				<n-card size="small" class="shadow-sm border border-stone-200 overflow-hidden">
					<div class="flex flex-col sm:flex-row gap-4 items-stretch">
						<div class="w-full sm:w-48 h-40 rounded-xl bg-stone-800 flex flex-col items-center justify-center text-white shrink-0 relative overflow-hidden p-4">
							<div class="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-800 to-stone-700/60"></div>
							<div class="relative z-10 text-center flex flex-col items-center">
								<span class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">ADD EVENTS</span>
								<span class="text-base font-extrabold mt-1">THE FUTURE OF STARTUPS</span>
							</div>
						</div>

						<div class="flex flex-col justify-between flex-1 gap-2">
							<div class="flex flex-col gap-1">
								<n-tag type="info" size="small" class="w-fit font-bold rounded-md bg-sky-50 text-sky-700">
									NETWORKING
								</n-tag>
								<h3 class="text-lg font-bold text-stone-900 mt-1">The Future of Startups</h3>
								<p class="text-xs text-stone-500 font-medium">Trends, Opportunities, and Investment Outlook</p>
							</div>

							<div class="flex flex-col gap-1.5 text-xs text-stone-600 pt-3 border-t border-stone-100">
								<div class="flex items-center gap-2">
									<Icon name="carbon:calendar" :size="15" class="text-stone-400" />
									<span>Tue, Jun 10, 2025</span>
								</div>
								<div class="flex items-center gap-2">
									<Icon name="carbon:time" :size="15" class="text-stone-400" />
									<span>6:00 PM – 8:30 PM</span>
								</div>
								<div class="flex items-center gap-2">
									<Icon name="carbon:location" :size="15" class="text-stone-400" />
									<span>Main Branch – Event Hall</span>
								</div>
							</div>
						</div>
					</div>
				</n-card>

				<!-- Operations Cancellation Note -->
				<n-card size="small" class="shadow-sm border border-teal-200 bg-teal-50/30">
					<div class="flex items-start gap-3">
						<div class="w-9 h-9 rounded-full bg-teal-700 text-white flex items-center justify-center shrink-0">
							<Icon name="carbon:bullhorn" :size="18" />
						</div>
						<div class="flex flex-col text-xs sm:text-sm">
							<span class="font-bold text-teal-900">{{ t("eventCancellation.opsNoteTitle") }}</span>
							<p class="text-stone-600 mt-1 leading-relaxed">
								Due to unforeseen circumstances, this event has been cancelled. We appreciate your understanding.
							</p>
						</div>
					</div>
				</n-card>
			</div>

			<!-- Right Column: Refund Summary & Wallet Actions -->
			<div class="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-6">
				<!-- Refund Summary Card -->
				<n-card size="small" class="shadow-sm border border-stone-200">
					<template #header>
						<span class="text-base font-bold text-stone-900">{{ t("eventCancellation.refundSummaryTitle") }}</span>
					</template>

					<div class="divide-y divide-stone-100 text-xs sm:text-sm">
						<div class="py-2.5 flex justify-between items-center">
							<span class="text-stone-500 flex items-center gap-2">
								<Icon name="carbon:wallet" :size="17" class="text-stone-400" />
								{{ t("eventCancellation.amountPaid") }}
							</span>
							<span class="font-bold text-stone-900">50,000 SYP</span>
						</div>
						<div class="py-2.5 flex justify-between items-center">
							<span class="text-stone-500 flex items-center gap-2">
								<Icon name="carbon:renew" :size="17" class="text-emerald-600" />
								{{ t("eventCancellation.refundedTo") }}
							</span>
							<div class="flex flex-col items-end">
								<span class="font-bold text-emerald-700">50,000 SYP</span>
								<span class="text-xs text-stone-400">General Wallet Balance</span>
							</div>
						</div>
						<div class="py-2.5 flex justify-between items-center">
							<span class="text-stone-500 flex items-center gap-2">
								<Icon name="carbon:checkmark-filled" :size="17" class="text-emerald-600" />
								{{ t("eventCancellation.refundStatus") }}
							</span>
							<n-tag type="success" size="small" round class="font-bold bg-emerald-50 text-emerald-700">
								Refunded
							</n-tag>
						</div>
					</div>
				</n-card>

				<!-- Info Box -->
				<n-alert type="info" size="small" class="rounded-xl">
					{{ t("eventCancellation.walletReturnedInfo") }}
				</n-alert>

				<!-- Transaction ID Card -->
				<n-card size="small" class="shadow-sm border border-stone-200 cursor-pointer hover:border-stone-300 transition-colors" @click="handleViewTransaction">
					<div class="flex items-center justify-between text-xs sm:text-sm">
						<div class="flex items-center gap-3">
							<Icon name="carbon:receipt" :size="20" class="text-stone-500" />
							<div class="flex flex-col">
								<span class="text-stone-400 text-xs">{{ t("walletCredited.transactionID") }}</span>
								<span class="font-mono font-bold text-stone-800">TXN-20250527-88421</span>
							</div>
						</div>
						<div class="flex items-center gap-1 text-teal-700 font-semibold text-xs">
							<span>View Transaction</span>
							<Icon name="carbon:chevron-right" :size="16" />
						</div>
					</div>
				</n-card>

				<!-- Action Buttons -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
					<n-button type="primary" size="large" class="h-12 rounded-xl text-sm font-bold shadow-sm" @click="router?.push?.('/payments/wallet-top-ups')">
						<template #icon><Icon name="carbon:wallet" :size="18" /></template>
						View Wallet
					</n-button>
					<n-button secondary size="large" class="h-12 rounded-xl text-sm font-semibold border border-stone-200" @click="router?.push?.('/community/events')">
						<template #icon><Icon name="carbon:events" :size="18" /></template>
						Explore Events
					</n-button>
				</div>

				<!-- Footer Support Notice -->
				<div class="flex items-center justify-between p-3 rounded-xl bg-stone-100/70 text-xs text-stone-600">
					<div class="flex items-center gap-2">
						<Icon name="carbon:favorite" :size="16" class="text-rose-500 shrink-0" />
						<span>Need help? Contact team anytime.</span>
					</div>
					<n-button text type="primary" size="small" class="font-bold">
						Contact Us
					</n-button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { NAlert, NButton, NCard, NTag, useMessage } from "naive-ui"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

const { t } = useI18n()
const router = useRouter()
const message = useMessage()

function handleViewTransaction() {
	message.info("Opening transaction TXN-20250527-88421")
}
</script>
