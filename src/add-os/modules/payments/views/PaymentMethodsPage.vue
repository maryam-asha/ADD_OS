<!-- src/add-os/modules/payments/views/PaymentMethodsPage.vue -->
<!--
	The payment methods, in the order members are offered them: whether each
	is on, whether it is a card gateway, what it can pay for, and how it has
	been used. Read-only — a method is switched on or off in the server's
	config, not here.
-->
<template>
	<div class="flex flex-col gap-6">
		<PageHeader :title="t(titleKey || 'nav.pages.paymentMethods')" :description="t('payments.methods.description')">
			<template #actions>
				<n-button secondary size="small" :loading="isLoading" @click="load">
					<template #icon><Icon name="carbon:renew" :size="16" /></template>
					{{ t("payments.refresh") }}
				</n-button>
			</template>
		</PageHeader>

		<n-alert v-if="failed" type="error" :bordered="false">{{ t("payments.loadError") }}</n-alert>

		<n-spin :show="isLoading && !methods.length">
			<div class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 min-h-24">
				<n-card v-for="(method, index) in methods" :key="method.key" size="small" class="shadow-sm border border-[var(--add-border)]" :class="method.enabled ? '' : 'opacity-75'" data-test="payment-method">
					<div class="flex flex-col gap-4">
						<!-- Name and state -->
						<div class="flex items-start justify-between gap-3">
							<div class="flex items-center gap-3">
								<span class="flex items-center justify-center size-11 rounded-xl" :class="method.enabled ? 'bg-[color-mix(in_srgb,var(--add-success)_10%,transparent)] text-[var(--add-success-text)]' : 'bg-[var(--add-surface-sunken)] text-[var(--add-text-muted)]'">
									<Icon :name="methodIcon(method.key)" :size="22" />
								</span>
								<div class="flex flex-col">
									<span class="font-bold text-[var(--add-text-primary)]">{{ method.label }}</span>
									<span class="text-xs text-[var(--add-text-secondary)]">
										<bdi dir="ltr">{{ method.key }}</bdi> · {{ t("payments.methods.order", { order: formatNumber(index + 1) }) }}
									</span>
								</div>
							</div>
							<div class="flex flex-col items-end gap-1">
								<n-tag :type="method.enabled ? 'success' : 'default'" size="small" round>
									{{ t(method.enabled ? "payments.methods.enabled" : "payments.methods.disabled") }}
								</n-tag>
								<n-tag size="small" round :bordered="false" :type="method.gateway ? 'info' : 'default'">
									{{ t(method.gateway ? "payments.methods.gateway" : "payments.methods.internal") }}
								</n-tag>
							</div>
						</div>

						<p class="text-sm text-[var(--add-text-secondary)]">{{ te(`payments.methods.about.${method.key}`) ? t(`payments.methods.about.${method.key}`) : t("payments.methods.about.other") }}</p>

						<!-- How it has been used -->
						<div class="grid grid-cols-3 gap-2">
							<div v-for="stat in stats(method)" :key="stat.label" class="flex flex-col gap-0.5 p-2.5 rounded-xl bg-[var(--add-surface-sunken)] border border-[var(--add-border)]">
								<span class="text-xs text-[var(--add-text-secondary)]">{{ stat.label }}</span>
								<span class="text-lg font-extrabold" :class="stat.tone ?? 'text-[var(--add-text-primary)]'">{{ stat.value }}</span>
							</div>
						</div>
						<div class="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--add-text-secondary)]">
							<span>{{ method.usage.last_used_at ? t("payments.methods.lastUsed", { date: formatDateTime(method.usage.last_used_at) }) : t("payments.methods.neverUsed") }}</span>
							<n-button v-if="method.usage.count" text size="tiny" type="primary" @click="openTransactions(method.key)">
								{{ t("payments.methods.viewTransactions") }}
							</n-button>
						</div>

						<!-- What it can pay for -->
						<div class="flex flex-col gap-2">
							<span class="text-xs font-semibold text-[var(--add-text-primary)]">{{ t("payments.methods.purposes") }}</span>
							<div class="flex flex-wrap gap-1.5">
								<n-tag
									v-for="purpose in listedPurposes(method)"
									:key="purpose.purpose"
									size="small"
									:bordered="false"
									:type="purpose.supported ? 'success' : 'default'"
									:class="purpose.supported ? '' : 'line-through opacity-60'"
								>
									{{ t(`payments.purpose.${purpose.purpose}`) }}
								</n-tag>
							</div>
						</div>
					</div>
				</n-card>
			</div>
		</n-spin>

		<n-alert type="info" :bordered="false">{{ t("payments.methods.configNote") }}</n-alert>
	</div>
</template>

<script setup lang="ts">
import type { PaymentMethodInfo } from "@/add-os/modules/payments/types/payment"
import { NAlert, NButton, NCard, NSpin, NTag } from "naive-ui"
import { onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import { ApiError } from "@/add-os/services/api"
import { listPaymentMethods } from "@/add-os/services/payments"
import { formatDateTime, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t, te } = useI18n()
const router = useRouter()

const methods = ref<PaymentMethodInfo[]>([])
const isLoading = ref(false)
const failed = ref(false)

function methodIcon(key: string): string {
	return key === "wallet" ? "carbon:wallet" : key === "cash" ? "carbon:money" : "carbon:currency"
}

function stats(method: PaymentMethodInfo) {
	return [
		{ label: t("payments.methods.stats.accepted"), value: formatNumber(method.usage.accepted_count) },
		{ label: t("payments.methods.stats.points"), value: formatNumber(method.usage.accepted_points), tone: "text-[var(--add-success-text)]" },
		{ label: t("payments.methods.stats.open"), value: formatNumber(method.usage.open_count), tone: method.usage.open_count ? "text-[var(--add-warning-text)]" : undefined }
	]
}

/**
 * A booking extension is not something anyone pays for with a method: it is
 * taken from the member's wallet the moment a wallet-paid booking is
 * extended, and any other extension leaves the booking owing the difference,
 * paid as a booking. Struck through on a card it read as "an extension
 * cannot be paid by card", which is wrong — so it is not listed at all.
 */
function listedPurposes(method: PaymentMethodInfo) {
	return method.purposes.filter(p => p.purpose !== "booking_extension")
}

function openTransactions(method: string): void {
	router.push({ name: "payments.transactions", query: { method } })
}

async function load(): Promise<void> {
	isLoading.value = true
	failed.value = false
	try {
		methods.value = await listPaymentMethods()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		failed.value = true
	} finally {
		isLoading.value = false
	}
}

onMounted(load)
</script>
