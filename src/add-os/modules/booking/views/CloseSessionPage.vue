<!-- src/add-os/modules/booking/views/CloseSessionPage.vue -->
<template>
	<div class="flex flex-col gap-6 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
		<!-- Page Header -->
		<div class="flex items-center justify-between border-b border-stone-200/80 pb-4">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold text-stone-900">{{ t("closeSession.title") }}</h1>
				<span class="text-xs text-stone-500">ADD OS Reception Desk • Checkout Session</span>
			</div>
			<n-button secondary round @click="router?.back?.()">
				<template #icon><Icon name="carbon:close" :size="20" /></template>
				{{ t("common.back") || "Close" }}
			</n-button>
		</div>

		<!-- 2-Column Responsive Layout -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
			<!-- Left Column: Member Info, Duration & Charges -->
			<div class="lg:col-span-7 flex flex-col gap-6">
				<!-- Member Card -->
				<n-card size="small" class="shadow-sm border border-stone-200">
					<div class="flex items-start gap-4">
						<n-avatar round :size="56" class="bg-amber-700 text-white font-bold text-lg">
							OA
						</n-avatar>
						<div class="flex flex-col gap-1 flex-1">
							<div class="flex items-center justify-between flex-wrap gap-2">
								<span class="text-lg font-bold text-stone-900">Omar Al-Hassan</span>
								<n-tag type="success" size="small" round class="bg-emerald-50 text-emerald-700 border-emerald-200">
									{{ t("closeSession.activeMember") }}
								</n-tag>
							</div>
							<span class="text-xs text-stone-500 font-medium">+963 9xx xxx xxx</span>

							<div class="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-stone-100 text-xs">
								<div>
									<span class="text-stone-400 block">{{ t("closeSession.workspace") }}</span>
									<span class="font-semibold text-stone-800">Coworking Open Desk</span>
								</div>
								<div>
									<span class="text-stone-400 block">{{ t("closeSession.branch") }}</span>
									<span class="font-semibold text-stone-800">ADD Aleppo Branch</span>
								</div>
							</div>
						</div>
					</div>
				</n-card>

				<!-- Session Duration Card -->
				<n-card size="small" class="shadow-sm border border-stone-200">
					<div class="grid grid-cols-3 gap-3 text-center text-xs">
						<div class="flex flex-col gap-1 items-center p-3 rounded-xl bg-stone-50">
							<span class="text-stone-400 font-medium">{{ t("closeSession.checkIn") }}</span>
							<span class="font-bold text-stone-900 text-base">09:15 AM</span>
						</div>
						<div class="flex flex-col gap-1 items-center p-3 rounded-xl bg-stone-50">
							<span class="text-stone-400 font-medium">{{ t("closeSession.checkOut") }}</span>
							<span class="font-bold text-stone-900 text-base">12:45 PM</span>
						</div>
						<div class="flex flex-col gap-1 items-center p-3 rounded-xl bg-emerald-50/50 text-emerald-900 border border-emerald-100">
							<span class="text-emerald-700 font-medium">{{ t("closeSession.duration") }}</span>
							<span class="font-extrabold text-emerald-800 text-base">3h 30m</span>
						</div>
					</div>
				</n-card>

				<!-- Itemized Charges Card -->
				<n-card size="small" class="shadow-sm border border-stone-200">
					<template #header>
						<span class="text-base font-bold text-stone-900">Session Itemized Statement</span>
					</template>
					<div class="flex flex-col gap-3 text-xs sm:text-sm">
						<div class="flex justify-between items-center text-stone-700 p-2.5 rounded-lg hover:bg-stone-50">
							<span class="flex items-center gap-2">
								<Icon name="carbon:workspace" :size="18" class="text-emerald-600" />
								Coworking Session (3h 30m)
							</span>
							<span class="font-semibold text-stone-900">9,000 SYP</span>
						</div>
						<div class="flex justify-between items-center text-stone-700 p-2.5 rounded-lg hover:bg-stone-50">
							<span class="flex items-center gap-2">
								<Icon name="carbon:cafe" :size="18" class="text-amber-600" />
								Café Charges
							</span>
							<span class="font-semibold text-stone-900">3,500 SYP</span>
						</div>
						<div class="flex justify-between items-center text-stone-700 p-2.5 rounded-lg hover:bg-stone-50">
							<span class="flex items-center gap-2">
								<Icon name="carbon:printer" :size="18" class="text-blue-600" />
								Printing Charges
							</span>
							<span class="font-semibold text-stone-900">1,500 SYP</span>
						</div>

						<div class="border-t border-dashed border-stone-200 my-1 pt-3 flex justify-between font-medium text-stone-600 px-2.5">
							<span>{{ t("closeSession.subtotal") }}</span>
							<span>14,000 SYP</span>
						</div>
						<div class="flex justify-between text-lg font-extrabold text-stone-900 p-3 bg-stone-100/70 rounded-xl">
							<span>{{ t("closeSession.total") }}</span>
							<span class="text-emerald-700">14,000 SYP</span>
						</div>
					</div>
				</n-card>
			</div>

			<!-- Right Column: Payment Method & Submit -->
			<div class="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-6">
				<!-- Payment Status & Breakdown -->
				<n-card size="small" class="shadow-sm border border-amber-200 bg-amber-50/20">
					<div class="flex flex-col gap-4">
						<n-tag type="warning" round size="small" class="w-fit font-bold">
							<template #icon><Icon name="carbon:warning" :size="14" /></template>
							{{ t("closeSession.paymentStatusPartially") }}
						</n-tag>

						<div class="flex flex-col gap-2 text-xs sm:text-sm bg-white p-3 rounded-xl border border-amber-100 shadow-2xs">
							<div class="flex justify-between text-stone-700">
								<span>{{ t("closeSession.availableBalance") }}</span>
								<span class="font-bold text-stone-900">10,000 SYP</span>
							</div>
							<div class="flex justify-between text-rose-600 font-bold">
								<span>{{ t("closeSession.remainingCashDue") }}</span>
								<span>4,000 SYP</span>
							</div>
						</div>

						<n-radio-group v-model:value="selectedPaymentOption" name="paymentOption" class="flex flex-col gap-2 mt-1">
							<div
								class="flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer"
								:class="selectedPaymentOption === 'wallet' ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500' : 'border-stone-200 bg-white hover:border-stone-300'"
								@click="selectedPaymentOption = 'wallet'"
							>
								<n-radio value="wallet" />
								<div class="flex flex-col text-xs">
									<span class="font-bold text-stone-900 text-sm">{{ t("closeSession.useWalletBalance") }}</span>
									<span class="text-stone-500 mt-0.5">Apply 10,000 SYP from wallet</span>
								</div>
							</div>

							<div
								class="flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer"
								:class="selectedPaymentOption === 'cash' ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500' : 'border-stone-200 bg-white hover:border-stone-300'"
								@click="selectedPaymentOption = 'cash'"
							>
								<n-radio value="cash" />
								<div class="flex flex-col text-xs">
									<span class="font-bold text-stone-900 text-sm">{{ t("closeSession.payCashAtReception") }}</span>
									<span class="text-stone-500 mt-0.5">Collect remaining 4,000 SYP in cash</span>
								</div>
							</div>
						</n-radio-group>
					</div>
				</n-card>

				<!-- Receipt Summary -->
				<n-card size="small" class="shadow-sm border border-stone-200">
					<div class="flex flex-col gap-2 text-xs">
						<div class="flex justify-between">
							<span class="text-stone-500">{{ t("closeSession.sessionID") }}</span>
							<span class="font-mono font-bold text-stone-800">#CS-2418</span>
						</div>
						<div class="flex justify-between">
							<span class="text-stone-500">{{ t("closeSession.paymentMethod") }}</span>
							<span class="font-semibold text-stone-800">Wallet + Cash</span>
						</div>
						<p class="text-stone-400 italic mt-1">{{ t("closeSession.receiptNote") }}</p>
					</div>
				</n-card>

				<n-alert type="info" size="small" class="rounded-xl">
					{{ t("closeSession.infoNotice") }}
				</n-alert>

				<n-button type="primary" size="large" block class="h-12 rounded-xl text-base font-bold shadow-md" @click="handleCloseSession">
					{{ t("closeSession.submitButton") }}
				</n-button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { NAlert, NAvatar, NButton, NCard, NRadio, NRadioGroup, NTag, useMessage } from "naive-ui"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

const { t } = useI18n()
const router = useRouter()
const message = useMessage()

const selectedPaymentOption = ref<"wallet" | "cash">("wallet")

function handleCloseSession() {
	message.success(t("closeSession.successMessage"))
	router.push("/bookings/reception-desk")
}
</script>
