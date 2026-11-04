<!-- src/add-os/modules/booking/components/BookingDetailDrawer.vue -->
<!--
	One booking in full, from All Bookings: who, where, when, where its
	approval stands, what it cost line by line and how it is paid. While the
	booking can still be cancelled — the server's `actions.can_cancel`, the
	same answer the member's app reads — an account that may book at the
	desk (`reception.book`) can cancel it from here; the page asks to confirm
	and runs it, so this drawer only says which booking.
-->
<template>
	<n-drawer v-model:show="show" :width="560" :placement="isRtl ? 'left' : 'right'">
		<n-drawer-content :title="t('allBookings.detail.title')" closable>
			<n-spin :show="loading">
				<n-alert v-if="failed" type="error" :bordered="false">{{ t("allBookings.detail.loadError") }}</n-alert>

				<div v-if="booking" class="flex flex-col gap-5 text-sm" data-test="booking-detail">
					<div class="flex items-center justify-between gap-3">
						<n-tag :type="STATUS_TAG_TYPE[booking.status] ?? 'default'" size="small" :bordered="false">{{ booking.status_label }}</n-tag>
						<span class="text-xs text-secondary">#{{ booking.id }}</span>
					</div>

					<dl class="flex flex-col divide-y divide-[var(--border-color)]">
						<div v-for="field in fields" :key="field.label" class="flex justify-between gap-4 py-2">
							<dt class="text-secondary">{{ field.label }}</dt>
							<dd class="text-end font-medium">
								<bdi v-if="field.ltr" dir="ltr">{{ field.value }}</bdi>
								<template v-else>{{ field.value }}</template>
							</dd>
						</div>
					</dl>

					<section class="flex flex-col gap-2">
						<h3 class="font-semibold">{{ t("allBookings.detail.price") }}</h3>
						<div v-for="line in booking.breakdown.lines" :key="line.key" class="flex justify-between gap-4">
							<span class="text-secondary">{{ line.label }}</span>
							<bdi dir="ltr" class="font-mono">{{ line.formatted }}</bdi>
						</div>
						<div v-if="booking.breakdown.vat.points > 0" class="flex justify-between gap-4">
							<span class="text-secondary">{{ booking.breakdown.vat.label }}</span>
							<bdi dir="ltr" class="font-mono">{{ booking.breakdown.vat.formatted }}</bdi>
						</div>
						<div class="flex justify-between gap-4 font-semibold">
							<span>{{ t("allBookings.detail.total") }}</span>
							<bdi dir="ltr" class="font-mono">{{ booking.breakdown.total.formatted }} · {{ formatNumber(booking.breakdown.total.points) }} {{ t("allBookings.detail.points") }}</bdi>
						</div>
						<AppliedDiscountList v-if="booking.discounts?.length" :discounts="booking.discounts" />
					</section>

					<section class="flex flex-col gap-2">
						<h3 class="font-semibold">{{ t("allBookings.detail.progress") }}</h3>
						<ol class="flex flex-col gap-2">
							<li v-for="step in booking.request_status.steps" :key="step.key" class="flex items-center justify-between gap-4">
								<span class="inline-flex items-center gap-2" :class="{ 'text-secondary': step.state === 'upcoming' }">
									<Icon :name="STEP_ICON[step.state]" :size="16" />
									{{ step.label }}
								</span>
								<span v-if="step.at" class="text-xs text-secondary">{{ formatDateTime(step.at) }}</span>
							</li>
						</ol>
						<n-alert v-if="booking.request_status.rejection_reason" type="error" :bordered="false">
							{{ booking.request_status.rejection_reason }}
						</n-alert>
					</section>

					<section v-if="booking.note" class="flex flex-col gap-2">
						<h3 class="font-semibold">{{ t("allBookings.detail.note") }}</h3>
						<p class="whitespace-pre-line">{{ booking.note }}</p>
					</section>

					<section v-if="mayCancel && isOpen" class="flex flex-col gap-2" data-test="booking-cancel">
						<p class="text-xs text-secondary">{{ booking.actions.cancel_note }}</p>
						<n-button
							type="error"
							secondary
							:disabled="!booking.actions.can_cancel"
							@click="emit('cancel', booking.id)"
						>
							<template #icon><Icon name="carbon:close-outline" :size="16" /></template>
							{{ t("allBookings.cancel.button") }}
						</n-button>
						<p v-if="!booking.actions.can_cancel" class="text-xs text-secondary">{{ t("allBookings.cancel.unavailable") }}</p>
					</section>
				</div>
			</n-spin>
		</n-drawer-content>
	</n-drawer>
</template>

<script setup lang="ts">
import type { AdminBookingDetail } from "@/add-os/modules/booking/types/calendar"
import { NAlert, NButton, NDrawer, NDrawerContent, NSpin, NTag } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { isCancellable, STATUS_TAG_TYPE } from "@/add-os/modules/booking/config/all-bookings.config"
import { spaceTypeLabel } from "@/add-os/modules/booking/config/space-type-label"
import AppliedDiscountList from "@/add-os/modules/pricing/components/AppliedDiscountList.vue"
import { getBooking } from "@/add-os/services/booking-calendar"
import { formatDate, formatDateTime, formatNumber, formatTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	bookingId: number | null
	/** Whether this account may cancel at all (`reception.book`); the server still decides for this booking. */
	mayCancel: boolean
}>()
const emit = defineEmits<{ cancel: [id: number] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const isRtl = computed(() => currentLocale.value === "ar")

const STEP_ICON = {
	complete: "carbon:checkmark-filled",
	current: "carbon:time",
	upcoming: "carbon:circle-dash"
} as const

const booking = ref<AdminBookingDetail | null>(null)
const loading = ref(false)
const failed = ref(false)

const isOpen = computed(() => booking.value !== null && isCancellable(booking.value))

const fields = computed(() => {
	const row = booking.value
	if (row === null) return []

	const space = row.space.title ?? (row.space.space_type ? spaceTypeLabel(t, row.space.space_type) : "—")
	const source = row.payment_source ? ` · ${t(`allBookings.paymentSource.${row.payment_source}`)}` : ""

	return [
		{ label: t("allBookings.columns.member"), value: row.member.name ?? "—" },
		...(row.member.phone ? [{ label: t("allBookings.detail.phone"), value: row.member.phone, ltr: true }] : []),
		{ label: t("allBookings.columns.space"), value: row.space.branch ? `${space} — ${row.space.branch}` : space },
		{ label: t("allBookings.detail.date"), value: formatDate(row.when.start_at) },
		{ label: t("allBookings.detail.time"), value: `${formatTime(row.when.start_at)} – ${formatTime(row.when.end_at)} (${row.when.duration_label})` },
		{ label: t("allBookings.columns.payment"), value: `${t(`allBookings.paymentState.${row.payment_state}`)}${source}` },
		...(row.checked_in_at ? [{ label: t("allBookings.detail.checkedIn"), value: formatDateTime(row.checked_in_at) }] : []),
		...(row.checked_out_at ? [{ label: t("allBookings.detail.checkedOut"), value: formatDateTime(row.checked_out_at) }] : []),
		...(row.created_at ? [{ label: t("allBookings.detail.createdAt"), value: formatDateTime(row.created_at) }] : [])
	]
})

async function load(id: number): Promise<void> {
	loading.value = true
	failed.value = false
	booking.value = null
	try {
		booking.value = (await getBooking(id)).data
	} catch {
		failed.value = true
	} finally {
		loading.value = false
	}
}

watch(
	() => [show.value, props.bookingId] as const,
	([open, id]) => {
		if (open && id !== null) void load(id)
	},
	{ immediate: true }
)

defineExpose({ reload: () => (props.bookingId !== null ? load(props.bookingId) : Promise.resolve()) })
</script>
