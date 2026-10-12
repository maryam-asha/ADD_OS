<!-- src/add-os/modules/booking/views/BookingCalendarPage.vue -->
<template>
	<div class="add-booking-calendar flex flex-col gap-5">
		<div class="flex items-start justify-between gap-4">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.calendar") }}</h1>
				<p>{{ t("bookingCalendar.description") }}</p>
			</div>
			<n-button type="primary" @click="openCreate()">
				<template #icon>
					<Icon name="carbon:calendar-add" :size="18" />
				</template>
				{{ t("bookingCalendar.create.button") }}
			</n-button>
		</div>

		<n-alert v-if="error" type="error" :title="t('bookingCalendar.loadError')" />

		<n-card class="add-filters-card">
			<div
				class="flex items-center justify-between cursor-pointer select-none py-1"
				@click="isFiltersExpanded = !isFiltersExpanded"
			>
				<div class="flex items-center gap-2 font-semibold text-sm sm:text-base">
					<Icon name="carbon:calendar-settings" :size="18" class="text-primary" />
					<span>{{ t("bookingCalendar.filters.title") }}</span>
					<n-tag v-if="hasFilters" size="small" type="primary" :bordered="false" round class="ms-1">
						{{ activeFiltersCount }}
					</n-tag>
				</div>
				<div class="flex items-center gap-2">
					<n-button
						quaternary
						size="small"
						circle
						:aria-label="isFiltersExpanded ? t('bookingCalendar.filters.collapse') : t('bookingCalendar.filters.expand')"
						@click.stop="isFiltersExpanded = !isFiltersExpanded"
					>
						<template #icon>
							<Icon
								name="carbon:chevron-down"
								:size="16"
								class="transition-transform duration-200"
								:class="{ 'rotate-180': isFiltersExpanded }"
							/>
						</template>
					</n-button>
				</div>
			</div>

			<n-collapse-transition :show="isFiltersExpanded">
				<div class="pt-4 border-t border-border mt-3">
					<div class="flex flex-wrap items-end justify-between gap-4">
						<div class="flex flex-wrap items-end gap-4">
							<!--
								Each select carries a visible label, not just a placeholder. A
								placeholder disappears the moment a value is chosen, which left
								two unlabelled pills on screen with nothing to say what they
								filtered.
							-->
							<!--
								The width sits on the label, not the select: Naive injects
								`.n-select { width: 100% }` after Tailwind, so a width class
								on the select loses and it fills a label that has shrunk to
								nothing in this wrapping row.
							-->
							<label class="add-filter-field">
								<span class="text-xs">{{ t("bookingCalendar.filters.spaceType") }}</span>
								<n-select
									v-model:value="spaceType"
									clearable
									:options="spaceTypeOptions"
									:placeholder="t('bookingCalendar.filters.allSpaceTypes')"
								/>
							</label>
							<label class="add-filter-field add-filter-field--wide">
								<span class="text-xs">{{ t("bookingCalendar.filters.space") }}</span>
								<n-select
									v-model:value="spaceId"
									clearable
									:options="spaceOptions"
									:placeholder="t('bookingCalendar.filters.allSpaces')"
								/>
							</label>
							<!--
								One member's bookings only. The occupancy each day shows stays
								the space's own, so a room others filled never reads as free.
							-->
							<label class="add-filter-field add-filter-field--wide">
								<span class="text-xs">{{ t("bookingCalendar.filters.member") }}</span>
								<n-select
									v-model:value="memberId"
									clearable
									filterable
									:options="memberOptions"
									:loading="isLoadingMembers"
									:placeholder="t('bookingCalendar.filters.allMembers')"
									@focus="ensureMembers"
								/>
							</label>
						</div>

						<div class="add-totals-group flex flex-wrap items-center gap-3">
							<div v-for="total in totalsSummary" :key="total.key" class="add-total-chip flex flex-col">
								<span class="text-xs opacity-75">{{ t(`bookingCalendar.totals.${total.key}`) }}</span>
								<span class="text-base font-bold">{{ total.value }}</span>
							</div>
						</div>
					</div>

					<div v-if="branchHours" class="add-branch-hours-bar mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
						<span class="inline-flex items-center gap-1.5 font-semibold text-primary">
							<Icon name="carbon:time" :size="16" />
							{{ branchHours.title }}
						</span>
						<span class="font-medium">{{ branchHours.hours ?? t("bookingCalendar.hours.closedToday") }}</span>
						<span v-if="branchHours.days_label" class="opacity-75">· {{ branchHours.days_label }}</span>
						<span class="text-xs opacity-60">({{ branchHours.timezone_note }})</span>
					</div>

					<!-- `justify-start` is logical: right in Arabic, left in English. The
					     old `ar ? justify-end : justify-start` flipped it twice and left
					     it on the left in both. -->
					<div v-if="hasFilters" class="add-filters-reset-row mt-3 flex justify-start">
						<n-button
							quaternary
							size="small"
							class="add-filters-reset-btn"
							@click="resetFilters"
						>
							<template #icon>
								<Icon name="carbon:filter-reset" :size="16" />
							</template>
							{{ t("bookingCalendar.filters.reset") }}
						</n-button>
					</div>
				</div>
			</n-collapse-transition>
		</n-card>

		<!--
			The branch's co-working seats, and lending a room to co-working when
			they run out. After lending or taking a room back the calendar
			reloads: the room's cells and the co_space's occupancy both changed.
		-->
		<CoworkingPoolPanel
			v-if="poolBranchId !== null"
			:branch-id="poolBranchId"
			:rooms="lendableRooms"
			:today="districtToday()"
			@changed="load"
		/>

		<n-card class="add-calendar-card">
			<n-spin :show="isLoading">
				<div class="add-calendar-wrap">
					<FullCalendar ref="refCalendar" :options="calendarOptions" />
				</div>

				<div class="mt-4 flex flex-wrap items-center gap-4 text-xs">
					<span class="font-semibold opacity-80">{{ t("bookingCalendar.legend.title") }}:</span>
					<span v-for="status in LEGEND_STATUSES" :key="status" class="flex items-center gap-2">
						<span class="add-legend-swatch" :class="`c-${status}`" />
						<span class="font-medium">{{ status === "ended" ? t("bookingCalendar.legend.ended") : t(`allBookings.status.${status}`) }}</span>
					</span>
					<span class="flex items-center gap-2">
						<span class="add-legend-swatch c-leased" />
						<span class="font-medium">{{ t("bookingCalendar.legend.leased") }}</span>
					</span>
					<span class="flex items-center gap-2">
						<span class="add-legend-swatch c-closed" />
						<span class="font-medium">{{ t("bookingCalendar.legend.closed") }}</span>
					</span>
				</div>
			</n-spin>
		</n-card>

		<!-- Booking detail -->
		<n-modal
			v-model:show="detailVisible"
			preset="card"
			class="max-w-md add-detail-modal"
			:title="t('bookingCalendar.detail.title')"
			content-style="max-height: calc(88vh - 130px); overflow-y: auto; overflow-x: hidden;"
		>
			<template #header-extra>
				<n-tag v-if="selected" :type="STATUS_TAG_TYPE[selected.displayStatus]" size="small" :bordered="false" class="font-semibold">
					{{ selected.displayLabel }}
				</n-tag>
			</template>
			<n-descriptions v-if="selected" :column="1" label-placement="left" bordered size="small">
				<n-descriptions-item :label="t('bookingCalendar.detail.member')">
					<div class="flex flex-col">
						<span>{{ selected.memberName || "—" }}</span>
						<span class="text-xs">{{ selected.memberPhone || t("bookingCalendar.detail.noPhone") }}</span>
					</div>
				</n-descriptions-item>
				<n-descriptions-item :label="t('bookingCalendar.detail.space')">
					{{ selected.spaceName }}
				</n-descriptions-item>
				<n-descriptions-item :label="t('bookingCalendar.detail.when')">
					<div class="flex flex-col">
						<span>{{ selected.dateLabel }}</span>
						<span class="text-xs">{{ selected.timeLabel }}</span>
					</div>
				</n-descriptions-item>
				<n-descriptions-item :label="t('bookingCalendar.detail.status')">
					<n-tag :type="STATUS_TAG_TYPE[selected.status]" size="small" :bordered="false">
						{{ selected.statusLabel }}
					</n-tag>
				</n-descriptions-item>
				<n-descriptions-item :label="t('bookingCalendar.detail.payment')">
					{{ t(`allBookings.paymentState.${selected.paymentState}`) }}
				</n-descriptions-item>
				<n-descriptions-item :label="t('bookingCalendar.detail.checkedIn')">
					{{ selected.checkedInAt ? formatDateTime(selected.checkedInAt) : t("bookingCalendar.detail.notCheckedIn") }}
				</n-descriptions-item>
				<n-descriptions-item v-if="selected.checkedInAt" :label="t('bookingCalendar.detail.checkedOut')">
					{{ selected.checkedOutAt ? formatDateTime(selected.checkedOutAt) : t("bookingCalendar.detail.notCheckedOut") }}
				</n-descriptions-item>
			</n-descriptions>
		</n-modal>

		<!-- A day's bookings — what "+N" opens -->
		<n-modal
			v-model:show="dayListVisible"
			preset="card"
			class="max-w-md add-day-list-modal"
			:title="dayList?.dateLabel"
			content-style="max-height: calc(88vh - 130px); overflow-y: auto; overflow-x: hidden;"
		>
			<template #header-extra>
				<n-tag v-if="dayList" size="small" :bordered="false" class="font-semibold">
					{{ t("bookingCalendar.dayList.count", { count: formatNumber(dayList.items.length) }) }}
				</n-tag>
			</template>
			<ul v-if="dayList" class="add-day-list">
				<li v-for="item in dayList.items" :key="item.id">
					<button type="button" class="add-day-list__item" :class="`c-${item.displayStatus}`" @click="openFromDayList(item)">
						<span class="add-day-list__time"><bdi>{{ item.timeLabel }}</bdi></span>
						<span class="add-day-list__body">
							<span class="add-day-list__space">{{ item.spaceName }}</span>
							<span class="add-day-list__member"><bdi>{{ item.memberName || "—" }}</bdi></span>
						</span>
						<n-tag :type="STATUS_TAG_TYPE[item.displayStatus]" size="small" :bordered="false" class="shrink-0">
							{{ item.displayLabel }}
						</n-tag>
					</button>
				</li>
			</ul>
		</n-modal>

		<!-- Create booking -->
		<n-modal
			v-model:show="createVisible"
			preset="card"
			class="max-w-lg md:max-w-xl add-create-booking-modal"
			:title="t('bookingCalendar.create.title')"
			content-style="max-height: calc(88vh - 130px); overflow-y: auto; overflow-x: hidden;"
		>
			<template #header-extra>
				<div class="add-modal-badge">
					<Icon name="carbon:calendar-add" :size="18" class="text-[var(--primary-color)]" />
				</div>
			</template>

			<n-form :model="createForm" class="flex flex-col gap-1">
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
					<n-form-item
						:label="t('bookingCalendar.create.member')"
						:feedback="createErrors.user_id?.[0]"
						:validation-status="createErrors.user_id ? 'error' : undefined"
					>
						<n-select
							v-model:value="createForm.user_id"
							filterable
							:options="memberOptions"
							:loading="isLoadingMembers"
							:placeholder="t('bookingCalendar.create.memberPlaceholder')"
						/>
					</n-form-item>

					<n-form-item
						:label="t('bookingCalendar.create.space')"
						:feedback="createErrors.space_id?.[0]"
						:validation-status="createErrors.space_id ? 'error' : undefined"
					>
						<n-select
							v-model:value="createForm.space_id"
							:options="creatableSpaceOptions"
							:placeholder="t('bookingCalendar.create.spacePlaceholder')"
						/>
					</n-form-item>
				</div>

				<n-form-item
					:label="t('bookingCalendar.create.date')"
					:feedback="createErrors.start_at?.[0]"
					:validation-status="createErrors.start_at ? 'error' : undefined"
				>
					<n-date-picker
						v-model:formatted-value="createForm.date"
						type="date"
						value-format="yyyy-MM-dd"
						class="w-full"
						:is-date-disabled
					/>
				</n-form-item>

				<!--
					A booking is a run of the space's own cells, picked by its first
					and last cell — the same as the member app. No duration comes
					first: the cells are the server's, each judged on its own, and
					the run's length follows from the two taps. A free-form clock
					would let an operator enter 14:07 on a 30-minute grid and learn
					it was wrong only from the 422.
				-->
				<n-form-item :label="t('bookingCalendar.create.time')">
					<div class="flex w-full flex-col gap-2.5">
						<n-spin :show="isLoadingSlots" :size="16">
							<div v-if="slotsBanner" class="add-slot-note">{{ slotsBanner }}</div>

							<template v-else-if="slots.length > 0">
								<div class="flex items-center justify-between gap-2 mb-1.5 px-0.5">
									<p class="add-slot-counts">{{ t("bookingCalendar.create.pickHint") }}</p>
									<span v-if="slotCountsNote" class="add-slot-count-badge shrink-0">
										{{ slotCountsNote }}
									</span>
								</div>
								<div
									ref="slotsGridRef"
									class="add-slot-grid"
									tabindex="0"
									role="region"
									:aria-label="t('bookingCalendar.create.time')"
								>
									<!--
										A taken cell stays visible and disabled rather than
										being dropped: "2pm is booked" and "2pm does not
										exist here" are different facts, and an operator
										needs to tell them apart. Cells whose time has gone
										— started, or inside the minimum notice — are not
										shown at all: nothing can be done with them.
									-->
									<button
										v-for="slot in slots"
										:key="slot.start_time"
										type="button"
										class="add-slot"
										:class="{
											'add-slot--active': isInRun(slot),
											'add-slot--endpoint': isRunStart(slot) || isRunEnd(slot),
											'add-slot--middle': isRunMiddle(slot),
											'add-slot--taken': !slot.is_available
										}"
										:disabled="!slot.is_available"
										:aria-pressed="isInRun(slot)"
										@click="selectSlot(slot)"
									>
										<!--
											The server's own "01:00 PM", shown as sent and sent as
											shown — one format for the start, the end and the
											selected run, with nothing converted on either side.
										-->
										<span class="add-slot__start"><bdi dir="ltr">{{ slot.start_time }}</bdi></span>
										<span class="add-slot__meta"><bdi dir="ltr">{{ slot.end_time }}</bdi></span>
									</button>
								</div>
							</template>

							<div v-else-if="!isLoadingSlots" class="add-slot-note">
								{{ t("bookingCalendar.create.noSlots") }}
							</div>
						</n-spin>

						<div v-if="selectedRun" class="add-slot-counts add-slot-counts--selected">
							<div class="add-slot-summary-range">
								<Icon name="carbon:time" :size="18" class="shrink-0 add-slot-summary-icon" />
								<span>
									<template v-if="locale === 'ar'">
										من <bdi>{{ formatClockTime(selectedRun.startTime) }}</bdi> إلى <bdi>{{ formatClockTime(selectedRun.endTime) }}</bdi>
									</template>
									<template v-else>
										{{ formatClockTime(selectedRun.startTime) }} – {{ formatClockTime(selectedRun.endTime) }}
									</template>
								</span>
							</div>
							<span class="add-slot-duration-badge">{{ " " }}· {{ hoursLabel(selectedRun.minutes) }}</span>
						</div>
						<p v-if="runTooShort" class="add-slot-warning">
							<Icon name="carbon:warning" :size="16" class="shrink-0" />
							<span>
								{{ t("bookingCalendar.create.tooShort", { minimum: hoursLabel(minimumMinutes) }) }}
							</span>
						</p>
					</div>
				</n-form-item>

				<!--
					What the member owes for the chosen run — the server's own
					arithmetic (hours × hourly rate, less any plan discount), in
					points and in each currency the desk takes cash in.
				-->
				<n-form-item v-if="selectedRun && createForm.user_id !== null" :label="t('bookingCalendar.create.quoteTitle')">
					<n-spin :show="isQuoting" class="w-full">
						<div v-if="quote" class="add-quote-card">
							<div class="flex items-center justify-between gap-2 border-b border-[var(--border-color)] pb-2 mb-2">
								<span class="text-xs opacity-75">
									{{ t("bookingCalendar.create.quoteLine", { hours: hoursLabel(quote.minutes), rate: formatNumber(quote.hourly_rate_points) }) }}
								</span>
								<strong class="text-base text-[var(--primary-color)]">
									{{ t("bookingCalendar.create.quotePoints", { points: formatNumber(quote.total_points) }) }}
								</strong>
							</div>
							<div v-if="quote.breakdown.lines.filter(row => row.key !== 'base').length" class="flex flex-col gap-1 text-xs opacity-75 mb-2">
								<span v-for="line in quote.breakdown.lines.filter(row => row.key !== 'base')" :key="line.key">
									{{ line.label }}: {{ formatNumber(line.points) }}
								</span>
							</div>
							<div v-if="quote.amounts.length" class="flex flex-wrap gap-2 pt-1">
								<span v-for="amount in quote.amounts" :key="amount.currency" class="add-quote-currency-pill">
									<bdi dir="ltr">{{ formatQuoteAmount(amount) }}</bdi>
								</span>
							</div>
						</div>
					</n-spin>
				</n-form-item>

				<n-form-item :label="t('bookingCalendar.create.payment')" :feedback="createErrors.payment_method?.[0]" :validation-status="createErrors.payment_method ? 'error' : undefined">
					<n-radio-group v-model:value="createForm.payment" name="receptionBookingPayment" class="w-full">
						<div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
							<div
								class="add-payment-tile"
								:class="{
									'add-payment-tile--active': createForm.payment === 'wallet',
									'add-payment-tile--disabled': walletCannotPay
								}"
								@click="!walletCannotPay && (createForm.payment = 'wallet')"
							>
								<n-radio value="wallet" :disabled="walletCannotPay">
									<div class="flex flex-col gap-0.5">
										<span class="font-semibold text-xs">{{ t("bookingCalendar.create.paymentWallet") }}</span>
										<span v-if="walletBalance !== null" class="text-[0.7rem] opacity-75">
											{{ t(walletCannotPay ? "bookingCalendar.create.walletShort" : "bookingCalendar.create.walletBalance", { points: formatNumber(walletBalance) }) }}
										</span>
									</div>
								</n-radio>
							</div>

							<div
								class="add-payment-tile"
								:class="{ 'add-payment-tile--active': createForm.payment === 'cash_now' }"
								@click="createForm.payment = 'cash_now'"
							>
								<n-radio value="cash_now">
									<span class="font-semibold text-xs">{{ t("bookingCalendar.create.paymentCashNow") }}</span>
								</n-radio>
							</div>

							<div
								class="add-payment-tile"
								:class="{ 'add-payment-tile--active': createForm.payment === 'cash_later' }"
								@click="createForm.payment = 'cash_later'"
							>
								<n-radio value="cash_later">
									<span class="font-semibold text-xs">{{ t("bookingCalendar.create.paymentCashLater") }}</span>
								</n-radio>
							</div>
						</div>
					</n-radio-group>
				</n-form-item>

				<n-form-item :label="t('bookingCalendar.create.note')">
					<n-input
						v-model:value="createForm.note"
						type="textarea"
						:rows="2"
						:placeholder="t('bookingCalendar.create.notePlaceholder')"
					/>
				</n-form-item>

				<n-alert type="info" :bordered="false" class="add-create-rules-alert">{{ t("bookingCalendar.create.rulesNote") }}</n-alert>
			</n-form>

			<template #footer>
				<div class="flex items-center justify-end gap-3">
					<n-button class="add-dialog-cancel-btn" @click="createVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="isCreating" :disabled="!canSubmit" class="add-dialog-submit-btn font-semibold" @click="submitCreate">
						{{ t("bookingCalendar.create.submit") }}
					</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { CalendarApi, CalendarOptions, EventInput } from "@fullcalendar/core"
import type { SelectOption } from "naive-ui"
import type { AvailabilitySlot } from "@/add-os/modules/booking/types/availability"
import type { BookingPaymentState, BookingStatus, CalendarResponse, CalendarView } from "@/add-os/modules/booking/types/calendar"
import type { ReceptionBookingPayment, ReceptionBookingQuote } from "@/add-os/modules/booking/types/reception"
import type { Member } from "@/add-os/modules/members/types/member"
import type { SpaceType } from "@/add-os/modules/spatial/types/space"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import listPlugin from "@fullcalendar/list"
import timeGridPlugin from "@fullcalendar/timegrid"
import FullCalendar from "@fullcalendar/vue3"
import {
	NAlert,
	NButton,
	NCard,
	NCollapseTransition,
	NDatePicker,
	NDescriptions,
	NDescriptionsItem,
	NForm,
	NFormItem,
	NInput,
	NModal,
	NRadio,
	NRadioGroup,
	NSelect,
	NSpin,
	NTag,
	useMessage
} from "naive-ui"
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import CoworkingPoolPanel from "@/add-os/modules/booking/components/CoworkingPoolPanel.vue"
import { spaceTypeLabel } from "@/add-os/modules/booking/config/space-type-label"
import { SPACE_TYPES } from "@/add-os/modules/spatial/types/space"
import { ApiError } from "@/add-os/services/api"
import { getCalendar, getSpaceSlots } from "@/add-os/services/booking-calendar"
import { listMembers } from "@/add-os/services/members"
import { createReceptionBooking, quoteReceptionBooking } from "@/add-os/services/reception"
import { formatClockTime, formatCurrency, formatDate, formatDateTime, formatNumber, formatTime, isCurrencyCode } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The operations calendar: every booking in the district, on the FullCalendar
 * the template already ships.
 *
 * FullCalendar rather than a hand-built grid, and it is worth saying why the
 * first attempt was wrong: a table of shaded cells answers "how full is this
 * space today" but not "what is actually on at 2pm", which is the question an
 * operator standing at the desk is usually asking.
 *
 * `@fullcalendar/*` is imported from `node_modules` — a declared dependency,
 * not vendor source. Nothing is imported from `src/views/Apps/**`, which stays
 * Category C.
 *
 * Two actions live here, and only two. Clicking a booking opens a read-only
 * detail; the header button books a member in. Everything else about a booking
 * — approve, reject, check in, check out, cancel, settle, extend — stays on the
 * reception screens, because that is where those rules already live and a
 * second copy of them would be free to drift.
 *
 * Creation goes through the same `BookingCreationService` the member app uses,
 * so reception cannot double-book a room the member endpoint would refuse, and
 * cannot back-date one either. Every refusal arrives as a 422 with its own
 * translated message, which is shown verbatim rather than re-worded here.
 */

defineProps<{ titleKey?: string }>()

const { t, locale } = useI18n()
const message = useMessage()

/**
 * What the calendar shows for a booking: its server status, or `ended` once a
 * still-live booking's end time has gone by.
 *
 * `ended` is drawn here, not sent by the server — the backend enum has no such
 * value. It is a fact of the clock, not a decision about the booking, so it
 * only ever replaces `confirmed` or `pending`; a cancelled or rejected booking
 * keeps its own, more informative status. The server's status stays readable
 * in the detail's status row.
 *
 * **Narrowed 2026-10-03, not removed.** The backend now writes outcomes of its
 * own — `completed` at checkout, `no_show` once a booking ends with nobody
 * checked in, and an undecided `pending` lapses to `rejected` when it starts
 * (ADDCore `docs/decisions/booking-outcomes-and-extension.md`). Those are drawn
 * as the server sent them; `ended` never replaces them, because only
 * `confirmed`/`pending` are live. What `ended` still covers: the minutes before
 * the server's five-minute job reaches a booking, and a checked-in booking
 * running past its end until it is checked out (it stays `confirmed` on the
 * server). Dropping `ended` was weighed and given up: the board would then
 * show a finished booking as `confirmed` until the next reload, which is the
 * live flip this clock exists to give the desk.
 */
type CalendarDisplayStatus = BookingStatus | "ended"

/** The statuses the legend explains, in the order it lists them. */
const LEGEND_STATUSES: readonly CalendarDisplayStatus[] = ["confirmed", "pending", "ended", "completed", "no_show", "cancelled", "rejected"]

/** Same colours as the bookings index (`all-bookings.config.ts`), plus `ended`. */
const STATUS_TAG_TYPE: Readonly<Record<CalendarDisplayStatus, "success" | "warning" | "default" | "error" | "info">> = {
	confirmed: "success",
	pending: "warning",
	ended: "default",
	completed: "info",
	no_show: "error",
	cancelled: "default",
	rejected: "error"
}

/**
 * The current instant, refreshed each minute so a booking turns `ended` while
 * the page is left open at the desk, without a reload.
 */
const now = ref(Date.now())
const clock = setInterval(() => {
	now.value = Date.now()
}, 60_000)
onBeforeUnmount(() => clearInterval(clock))

/**
 * Compared as instants, so the district's offset in `end_at` and the browser's
 * own zone cannot disagree about whether a booking is over.
 */
function displayStatusOf(status: BookingStatus, endAt: string): CalendarDisplayStatus {
	const live = status === "confirmed" || status === "pending"
	return live && Date.parse(endAt) <= now.value ? "ended" : status
}

/** The tag's wording: the server's own label, unless the calendar marked it ended. */
function displayLabelOf(displayStatus: CalendarDisplayStatus, statusLabel: string): string {
	return displayStatus === "ended" ? t("bookingCalendar.legend.ended") : statusLabel
}

/**
 * FullCalendar view name → the `view` this API accepts. `listMonth` maps to
 * `month`: the list is a different rendering of the same month, not a
 * different range.
 */
const VIEW_BY_FC_TYPE: Readonly<Record<string, CalendarView>> = {
	dayGridMonth: "month",
	timeGridWeek: "week",
	timeGridDay: "day",
	listMonth: "month"
}

function toIsoDate(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Today's date in the given IANA timezone, as `YYYY-MM-DD`.
 *
 * The district's today, not the browser's: the server decides "past" in its
 * own timezone, and a desk machine on UTC at 01:30 Damascus time would
 * otherwise still offer yesterday. `en-CA` is used only because it formats a
 * date as `YYYY-MM-DD`; nothing is shown to the user.
 */
function todayIn(timeZone: string | undefined): string {
	if (!timeZone) return toIsoDate(new Date())
	return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
}

const refCalendar = ref()
const response = ref<CalendarResponse | null>(null)
const isLoading = ref(true)
const error = ref<ApiError | null>(null)

const spaceType = ref<SpaceType | null>(null)
const spaceId = ref<number | null>(null)
const memberId = ref<number | null>(null)

const isFiltersExpanded = ref(false)

const hasFilters = computed(() => spaceType.value !== null || spaceId.value !== null || memberId.value !== null)

const activeFiltersCount = computed(() => {
	let count = 0
	if (spaceType.value !== null) count++
	if (spaceId.value !== null) count++
	if (memberId.value !== null) count++
	return count
})

function resetFilters(): void {
	spaceType.value = null
	spaceId.value = null
	memberId.value = null
}

/**
 * What the calendar is currently showing.
 *
 * Seeded with today so the first paint has data: FullCalendar opens on the
 * current month, and waiting for its first `datesSet` would leave the screen
 * blank until the user navigated. Every later change comes from `datesSet`,
 * which is authoritative.
 */
const activeView = ref<CalendarView>("month")
const activeDate = ref<string>(toIsoDate(new Date()))

const branchHours = computed(() => response.value?.branch_hours ?? null)

/** The district's today, in the timezone the calendar response names. */
function districtToday(): string {
	return todayIn(response.value?.range.timezone ?? response.value?.branch_hours?.timezone)
}

/**
 * The branch's all-day closures from today on, date → the exception's reason,
 * as the server listed them: every one, not just those in the range the
 * calendar is showing, because the date picker navigates freely.
 */
const closures = computed(
	() => new Map((response.value?.branch_hours?.upcoming_closures ?? []).map(closure => [closure.date, closure.reason]))
)

const totalsSummary = computed(() => {
	const totals = response.value?.totals
	if (!totals) return []
	return [
		{ key: "spaces", value: formatNumber(totals.spaces) },
		{ key: "bookings", value: formatNumber(totals.bookings) },
		{ key: "occupancy", value: `${formatNumber(totals.occupancy_percent)}%` }
	]
})

const spaceTypeOptions = computed<SelectOption[]>(() =>
	SPACE_TYPES.map(type => ({ label: spaceTypeLabel(t, type), value: type }))
)

/**
 * Space options, read off whatever the current response returned rather than
 * fetched separately — the calendar has already named every active space in
 * range, and a second request would only risk disagreeing with it.
 */
const spaceOptions = computed<SelectOption[]>(() =>
	(response.value?.resources ?? []).map(resource => ({
		label: resource.space.title ?? spaceTypeLabel(t, resource.space.space_type),
		value: resource.space.id
	}))
)

/** The create form offers the same spaces, minus any the filter narrowed away. */
const creatableSpaceOptions = spaceOptions

/** The branch whose co-working pool the panel shows: the calendar's. */
const poolBranchId = computed(() => response.value?.meta.branch_id ?? null)

/** Rooms in view, which staff may lend to co-working when it overflows. */
const lendableRooms = computed(() =>
	(response.value?.resources ?? [])
		.filter(resource => resource.space.space_type === "room")
		.map(resource => ({
			id: resource.space.id,
			title: resource.space.title ?? spaceTypeLabel(t, resource.space.space_type),
			capacity: resource.space.capacity
		}))
)

// ---------------------------------------------------------------
// Detail — declared before the calendar options that populate it
// ---------------------------------------------------------------

interface SelectedBooking {
	id: number
	status: BookingStatus
	statusLabel: string
	displayStatus: CalendarDisplayStatus
	displayLabel: string
	spaceName: string
	memberName: string | null
	memberPhone: string | null
	paymentState: BookingPaymentState
	checkedInAt: string | null
	checkedOutAt: string | null
	dateLabel: string
	timeLabel: string
}

const selected = ref<SelectedBooking | null>(null)

/** Opens the detail for one booking, from the grid or from the day list. */
function openDetail(props: Record<string, unknown>): void {
	// A closed-day background event carries no booking; clicking it opens
	// nothing rather than an empty detail.
	if (!props.bookingId) return
	const displayStatus = displayStatusOf(props.status as BookingStatus, props.endAt as string)
	selected.value = {
		id: props.bookingId as number,
		status: props.status as BookingStatus,
		statusLabel: props.statusLabel as string,
		displayStatus,
		displayLabel: displayLabelOf(displayStatus, props.statusLabel as string),
		spaceName: props.spaceName as string,
		memberName: props.memberName as string | null,
		memberPhone: props.memberPhone as string | null,
		paymentState: props.paymentState as BookingPaymentState,
		checkedInAt: props.checkedInAt as string | null,
		checkedOutAt: (props.checkedOutAt as string | null | undefined) ?? null,
		dateLabel: formatDate(props.startAt as string),
		timeLabel: `${formatTime(props.startAt as string)} – ${formatTime(props.endAt as string)}`
	}
}

// ---------------------------------------------------------------
// Day list — what "+N" opens
// ---------------------------------------------------------------

interface DayListItem {
	id: number
	displayStatus: CalendarDisplayStatus
	displayLabel: string
	spaceName: string
	memberName: string | null
	timeLabel: string
	/** Kept whole so a row opens the same detail a grid event does. */
	props: Record<string, unknown>
}

const dayList = ref<{ dateLabel: string; items: DayListItem[] } | null>(null)

const dayListVisible = computed({
	get: () => dayList.value !== null,
	set: (value: boolean) => {
		if (!value) dayList.value = null
	}
})

/** Every booking on the day, in start order — not only the hidden ones. */
function openDayList(date: Date, events: Record<string, unknown>[]): void {
	const items = events
		.filter(props => Boolean(props.bookingId))
		.sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)))
		.map(props => {
			const displayStatus = displayStatusOf(props.status as BookingStatus, props.endAt as string)
			return {
				id: props.bookingId as number,
				displayStatus,
				displayLabel: displayLabelOf(displayStatus, props.statusLabel as string),
				spaceName: props.spaceName as string,
				memberName: props.memberName as string | null,
				timeLabel: `${formatTime(props.startAt as string)} – ${formatTime(props.endAt as string)}`,
				props
			}
		})
	dayList.value = { dateLabel: formatDate(date, { style: "long" }), items }
}

/** A row closes the list and opens that booking's detail in its place. */
function openFromDayList(item: DayListItem): void {
	dayList.value = null
	openDetail(item.props)
}

// ---------------------------------------------------------------
// Events
// ---------------------------------------------------------------

const events = computed<EventInput[]>(() => {
	const out: EventInput[] = []
	const closedDates = new Set<string>()

	for (const resource of response.value?.resources ?? []) {
		const spaceName = resource.space.title ?? spaceTypeLabel(t, resource.space.space_type)

		for (const day of resource.days) {
			if (day.state === "closed") {
				closedDates.add(day.date)
			} else if (day.state === "leased") {
				out.push({
					id: `leased-${resource.space.id}-${day.date}`,
					title: `${spaceName} · ${t("bookingCalendar.legend.leased")}`,
					start: day.date,
					allDay: true,
					classNames: ["c-leased", "styled"],
					extendedProps: {
						spaceName,
						isLeased: true
					}
				})
			}

			for (const booking of day.bookings) {
				out.push({
					id: String(booking.id),
					title: `${spaceName} · ${booking.member.name ?? ""}`.trim().replace(/ ·\s*$/, ""),
					start: booking.start_at,
					end: booking.end_at,
					classNames: [`c-${displayStatusOf(booking.status, booking.end_at)}`, "styled"],
					extendedProps: {
						bookingId: booking.id,
						statusLabel: booking.status_label,
						status: booking.status,
						spaceName,
						memberName: booking.member.name,
						memberPhone: booking.member.phone,
						paymentState: booking.payment_state,
						checkedInAt: booking.checked_in_at,
						checkedOutAt: booking.checked_out_at,
						startAt: booking.start_at,
						endAt: booking.end_at
					}
				})
			}
		}
	}

	// A day is only closed if it is closed for every space in view — one space
	// under maintenance does not shut the branch.
	const spaceCount = response.value?.resources.length ?? 0
	for (const date of closedDates) {
		const closedEverywhere = (response.value?.resources ?? []).every(
			resource => resource.days.find(day => day.date === date)?.state === "closed"
		)
		// A listed closure is drawn below, with its reason; drawing it here too
		// would stack two shades on one cell.
		if (closedEverywhere && spaceCount > 0 && !closures.value.has(date)) {
			out.push({ start: date, allDay: true, display: "background", classNames: ["c-closed"] })
		}
	}

	// Every upcoming closure, whether or not any space row is in view, carrying
	// the exception's own reason as its label — "Labour Day" answers "why can't
	// I book the 30th" before anyone clicks.
	for (const [date, reason] of closures.value) {
		out.push({
			start: date,
			allDay: true,
			display: "background",
			title: reason ?? t("bookingCalendar.legend.closed"),
			classNames: ["c-closed"]
		})
	}

	return out
})

/**
 * The wall-clock fields FullCalendar hands a function formatter — local time,
 * since the calendar runs in the browser's zone. Typed structurally because
 * FullCalendar only exports the full type from its internal entry point.
 */
interface FcClockFields {
	hour: number
	minute: number
}

/** A FullCalendar formatter that prints a time, or a time range, through `formatClockTime`. */
function fcClockRange(arg: { start: FcClockFields; end?: FcClockFields }): string {
	const clock = ({ hour, minute }: FcClockFields) => formatClockTime(`${hour}:${String(minute).padStart(2, "0")}`)
	return arg.end ? `${clock(arg.start)} – ${clock(arg.end)}` : clock(arg.start)
}

const calendarOptions = computed<CalendarOptions>(() => ({
	plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
	initialView: "dayGridMonth",
	headerToolbar: {
		start: "prev,next today",
		center: "title",
		end: "dayGridMonth,timeGridWeek,timeGridDay,listMonth"
	},
	// Sunday, matching the working week the backend's `week` view spans.
	firstDay: 0,
	locale: locale.value,
	direction: locale.value === "ar" ? "rtl" : "ltr",
	height: "auto",
	dayMaxEvents: 3,
	moreLinkText: (n: number) => `+${n}`,
	// A week column is a seventh of the grid: left to itself FullCalendar
	// cascades every concurrent booking into it until each is a few pixels
	// wide and its title wraps one letter per line. Concurrent bookings sit
	// side by side instead of overlapping, and past a small stack the rest
	// collapse into the same "+N" link the month grid uses. The day view has
	// the full width, so it stacks further before collapsing.
	slotEventOverlap: false,
	views: {
		timeGridWeek: { eventMaxStack: 2 },
		timeGridDay: { eventMaxStack: 6 }
	},
	// The grid truncates a title to one line; the full "space · member"
	// stays reachable on hover.
	eventDidMount(info) {
		if (info.event.title) info.el.title = info.event.title
	},
	navLinks: true,
	events: events.value,
	// Event times and the week/day hour axis go through the dashboard's own
	// clock formatter rather than FullCalendar's `Intl`-based one, so the grid
	// reads "02:00 م" exactly like the detail panel, the tables and the slot
	// list — `Intl` would also switch the digits in Arabic.
	eventTimeFormat: fcClockRange,
	slotLabelFormat: fcClockRange,
	// Read-only on the grid itself: no editable, no drag, no resize. Clicking
	// opens a detail; creating goes through the form, where the member and the
	// space are stated explicitly.
	// Clicking an empty day opens the form on that date. The grid stays
	// read-only otherwise — no drag, no resize, no inline edit — because
	// moving a booking is an approval-bearing action that lives on the
	// reception screens.
	//
	// A day that cannot take a booking opens nothing — past, an upcoming
	// closure, a weekday the branch never opens, or beyond the booking window —
	// because a form opened on one could only fail.
	dateClick(info) {
		const date = info.dateStr.slice(0, 10)
		if (!isBookableDate(date)) return
		openCreate({ date })
	},
	// A closed day — an upcoming closure or a weekday the branch never opens —
	// has its number struck through, matching the struck-through date in the
	// picker. A day beyond the booking window is only dimmed: it is open, just
	// not bookable yet.
	dayCellClassNames(arg) {
		const date = toIsoDate(arg.date)
		if (closures.value.has(date) || isClosedWeekday(date)) return ["add-day--closed"]
		return isBeyondWindow(date) ? ["add-day--out-of-window"] : []
	},
	eventClick(info) {
		openDetail(info.event.extendedProps as Record<string, unknown>)
	},
	// "+N" opens the day's bookings in our own modal instead of FullCalendar's
	// popover. The popover is anchored to the clicked cell, so on a lower row
	// it ran off the bottom of the screen; its close glyph needs FullCalendar's
	// icon font, which the theme's font stack replaced with an empty box; and
	// a one-line "space · member" in a narrow box was cut from the wrong end
	// in RTL. A centred modal has none of those problems.
	//
	// FullCalendar opens its popover whenever this returns nothing, so it
	// returns the view already on screen: "zoom" to where we are, a no-op.
	moreLinkClick(info) {
		openDayList(
			info.date,
			info.allSegs.map(seg => seg.event.extendedProps as Record<string, unknown>)
		)
		return info.view.type
	},
	datesSet(info) {
		const view = VIEW_BY_FC_TYPE[info.view.type] ?? "month"
		// `info.start` is the first visible cell, which in a month grid can be
		// in the previous month. The anchor the server needs is a date inside
		// the period, so the midpoint of the visible range is used.
		const midpoint = new Date((info.start.getTime() + info.end.getTime()) / 2)
		const nextDate = toIsoDate(midpoint)

		if (view !== activeView.value || nextDate !== activeDate.value) {
			activeView.value = view
			activeDate.value = nextDate
		}
	}
}))

const detailVisible = computed({
	get: () => selected.value !== null,
	set: (value: boolean) => {
		if (!value) selected.value = null
	}
})

// ---------------------------------------------------------------
// Create
// ---------------------------------------------------------------

const createVisible = ref(false)
const isCreating = ref(false)
const createErrors = ref<Record<string, string[]>>({})

const members = ref<Member[]>([])
const isLoadingMembers = ref(false)

const createForm = ref({
	user_id: null as number | null,
	space_id: null as number | null,
	date: toIsoDate(new Date()),
	/** The first cell of the run — a `start_time` from the server's list, never typed. */
	from: "" as string,
	/** The last cell of the run, by its `start_time`; the booking ends at its `end_time`. */
	to: "" as string,
	/** How it is paid — chosen every time, never defaulted. */
	payment: null as ReceptionBookingPayment | null,
	note: ""
})

/**
 * The cells, exactly as the server sent them. A cell whose time to be booked
 * has gone — started, or inside the minimum notice — is not among them: the
 * server leaves it out, for the desk as for the member app. Every other
 * refusal is sent, and stays on screen with its reason.
 */
const slots = ref<AvailabilitySlot[]>([])
const isLoadingSlots = ref(false)
const slotsBanner = ref<string | null>(null)

/** Each cell's length, from the last slots asked for: a run is its cells × this. */
const granularityMinutes = ref(0)

/** "1.5h" — the number through the shared formatter, the unit through i18n. */
function hoursLabel(minutes: number): string {
	return t("bookingCalendar.create.durationHours", { hours: formatNumber(minutes / 60) })
}

/**
 * Where a cell sits in the day, by its `start_time`.
 *
 * Cells are ordered by position, never by comparing their times: the times
 * are 12-hour ("01:00 PM"), which sort wrongly as text — "01:00 PM" comes
 * before "11:00 AM".
 */
function indexOf(startTime: string): number {
	return slots.value.findIndex(slot => slot.start_time === startTime)
}

/**
 * The chosen run: the cells from the first to the last, in order.
 *
 * `null` unless every cell between is free and each starts where the one
 * before it ends — a taken cell or the gap of a closed hour breaks a run, and
 * a broken run is not a booking.
 */
const selectedRun = computed(() => {
	const first = indexOf(createForm.value.from)
	const last = indexOf(createForm.value.to)
	if (first === -1 || last === -1 || last < first) return null

	const cells = slots.value.slice(first, last + 1)
	const unbroken = cells.every(
		(cell, index) => cell.is_available && (index === 0 || cell.start_time === cells[index - 1].end_time)
	)
	if (!unbroken) return null

	return {
		first,
		last,
		// Shown and posted exactly as the server wrote them.
		startTime: cells[0].start_time,
		endTime: cells[cells.length - 1].end_time,
		// Unbroken, so every cell is one step of the grid — not parsed from
		// the 12-hour text.
		minutes: cells.length * granularityMinutes.value
	}
})

/**
 * The shortest booking, from the calendar's setup — read once, as the member
 * app reads it once from the space details. One cell until it arrives.
 */
const minimumMinutes = computed(() => response.value?.booking_window?.min_duration_minutes ?? 0)

/** A picked run shorter than the minimum: said on screen, and not submittable. */
const runTooShort = computed(() => selectedRun.value !== null && selectedRun.value.minutes < minimumMinutes.value)

// ---------------------------------------------------------------
// What the chosen run costs (POST reception/bookings/quote)
// ---------------------------------------------------------------

const quote = ref<ReceptionBookingQuote | null>(null)
const isQuoting = ref(false)
/** Only the newest request may land: an older answer is for a run no longer chosen. */
let quoteRequest = 0

/** The richest wallet the member can spend from, or null before a quote. */
const walletBalance = computed(() => {
	const wallets = quote.value?.wallets ?? []
	return wallets.length ? Math.max(...wallets.map(wallet => wallet.usable_balance)) : null
})

/** No wallet covers the total: the wallet choice would come straight back as a 422. */
const walletCannotPay = computed(() => quote.value !== null && !quote.value.wallets.some(wallet => wallet.sufficient))

watch(walletCannotPay, cannot => {
	if (cannot && createForm.value.payment === "wallet") createForm.value.payment = null
})

/**
 * The server's decimal string, at the decimals it was sent with ("2.40", not
 * "2.4"): the ledger's own precision for that currency.
 */
function formatQuoteAmount(amount: { currency: string, value: string }): string {
	const [whole, fraction] = amount.value.split(".")
	const formattedWhole = formatNumber(whole)
	const valueWithFraction = fraction !== undefined ? `${formattedWhole}.${fraction}` : formattedWhole
	const symbol = amount.currency === "USD"
		? "$"
		: amount.currency === "EUR"
			? "€"
			: amount.currency === "SYP"
				? (locale.value === "ar" ? "ل.س" : "SYP")
				: amount.currency
	return `${valueWithFraction} ${symbol}`
}

async function loadQuote(): Promise<void> {
	const { user_id: userId, space_id: spaceId, date } = createForm.value
	const run = selectedRun.value
	const request = ++quoteRequest

	if (userId === null || spaceId === null || run === null || runTooShort.value) {
		quote.value = null
		return
	}

	isQuoting.value = true
	try {
		const result = await quoteReceptionBooking({
			user_id: userId,
			space_id: spaceId,
			start_at: `${date} ${run.startTime}`,
			end_at: `${date} ${run.endTime}`
		})
		if (request === quoteRequest) quote.value = result
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (request === quoteRequest) quote.value = null
	} finally {
		if (request === quoteRequest) isQuoting.value = false
	}
}

watch(
	() => [createForm.value.user_id, createForm.value.space_id, createForm.value.date, selectedRun.value?.startTime, selectedRun.value?.endTime],
	() => void loadQuote()
)

function isInRun(slot: AvailabilitySlot): boolean {
	const run = selectedRun.value
	const index = indexOf(slot.start_time)
	return run !== null && index >= run.first && index <= run.last
}

function isRunStart(slot: AvailabilitySlot): boolean {
	const run = selectedRun.value
	if (!run) return false
	return indexOf(slot.start_time) === run.first
}

function isRunEnd(slot: AvailabilitySlot): boolean {
	const run = selectedRun.value
	if (!run) return false
	return indexOf(slot.start_time) === run.last
}

function isRunMiddle(slot: AvailabilitySlot): boolean {
	const run = selectedRun.value
	if (!run) return false
	const index = indexOf(slot.start_time)
	return index > run.first && index < run.last
}

/**
 * How many of the day's cells are free, so an operator can see at a glance
 * that a day is busy rather than inferring it from greyed chips.
 */
const slotCountsNote = computed(() => {
	if (slots.value.length === 0) return null
	const available = slots.value.filter(slot => slot.is_available).length
	return t("bookingCalendar.create.slotCounts", { available, total: slots.value.length })
})

// ---------------------------------------------------------------
// Which dates can be booked — the calendar's setup, as the member app has it
// ---------------------------------------------------------------

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const

function addDays(isoDate: string, days: number): string {
	const date = new Date(`${isoDate}T12:00:00`)
	date.setDate(date.getDate() + days)
	return toIsoDate(date)
}

/** A weekday the branch does not open on at all, from its ordinary week. */
function isClosedWeekday(isoDate: string): boolean {
	const open = response.value?.branch_hours?.open_weekdays
	if (!open || open.length === 0) return false
	return !open.includes(WEEKDAYS[new Date(`${isoDate}T12:00:00`).getDay()])
}

/** Further ahead than `max_days_ahead` allows; `null` is no limit. */
function isBeyondWindow(isoDate: string): boolean {
	const maxDaysAhead = response.value?.booking_window?.max_days_ahead ?? null
	return maxDaysAhead !== null && isoDate > addDays(districtToday(), maxDaysAhead)
}

/**
 * Whether a date can take a booking at all, from the setup alone: not past,
 * not an upcoming closure, not a weekday the branch never opens, not beyond the
 * booking window. The same checks the member app makes from the space details,
 * and the reason the grid and the picker refuse the same dates.
 *
 * It says nothing about a date being full — that depends on other bookings,
 * and the slots for the date answer it.
 */
function isBookableDate(isoDate: string): boolean {
	return !(
		isoDate < districtToday()
		|| closures.value.has(isoDate)
		|| isClosedWeekday(isoDate)
		|| isBeyondWindow(isoDate)
	)
}

/** The next date, from the district's today, that can take a booking. */
function nextOpenDate(): string {
	let date = districtToday()
	// Bounded: a year with no bookable day is not a real schedule, and an
	// unbounded loop over server data is not worth the risk.
	for (let i = 0; i < 366 && !isBookableDate(date); i++) {
		date = addDays(date, 1)
	}
	return isBookableDate(date) ? date : districtToday()
}

/**
 * The picker refuses what the grid refuses, plus a day the calendar reports
 * closed for every space in view — which also covers a space-level closure the
 * branch's week does not show.
 */
function isDateDisabled(timestamp: number): boolean {
	const date = toIsoDate(new Date(timestamp))
	if (!isBookableDate(date)) return true

	const resources = response.value?.resources ?? []
	if (resources.length === 0) return false
	return resources.every(resource => {
		const state = resource.days.find(day => day.date === date)?.state
		return state === "closed" || state === "leased"
	})
}

const memberOptions = computed<SelectOption[]>(() =>
	members.value.map(member => ({ label: `${member.name} · ${member.phone}`, value: member.id }))
)

/**
 * Nothing about availability is judged here beyond the run itself.
 *
 * The form can only submit an unbroken run of cells the server listed as free,
 * at least the space's minimum long, so the client needs no opinion about
 * granularity, overlap, buffer or back-dating — it renders the server's
 * verdict. That verdict can still go stale between load and submit, which is
 * why the POST re-checks the whole run under a row lock and its 422 is shown
 * verbatim.
 */
const canSubmit = computed(
	() =>
		createForm.value.user_id !== null
		&& createForm.value.space_id !== null
		&& selectedRun.value !== null
		&& !runTooShort.value
		&& createForm.value.payment !== null
)

/**
 * Resets the create form state cleanly when the dialog is closed,
 * ensuring no stale member, space, time range, note, or errors linger.
 */
function resetCreateForm(): void {
	createErrors.value = {}
	createForm.value.user_id = null
	createForm.value.space_id = null
	createForm.value.date = nextOpenDate()
	createForm.value.from = ""
	createForm.value.to = ""
	createForm.value.payment = null
	createForm.value.note = ""
	slots.value = []
	slotsBanner.value = null
	if (slotsGridRef.value) {
		slotsGridRef.value.scrollTop = 0
	}
}

watch(createVisible, visible => {
	if (!visible) {
		resetCreateForm()
	}
})

/**
 * Opens the form, optionally on a date and space the operator already clicked.
 *
 * Prefilling from the click is the point: an operator who clicked Thursday on
 * the grid has already said which day they mean, and making them re-enter it
 * is how the form felt disconnected from the calendar it sits on.
 */
function openCreate(prefill?: { date?: string, spaceId?: number }): void {
	resetCreateForm()
	// Without a clicked day, the next one that can actually be booked: on a
	// holiday, today would open the form on a date the picker already refuses.
	createForm.value.date = prefill?.date ?? nextOpenDate()
	createForm.value.from = ""
	createForm.value.to = ""

	if (prefill?.spaceId !== undefined) {
		createForm.value.space_id = prefill.spaceId
	} else if (createForm.value.space_id === null) {
		// One space in view is not a choice; preselecting it saves a click and
		// lets the slot grid load immediately.
		const only = creatableSpaceOptions.value.length === 1 ? creatableSpaceOptions.value[0] : null
		createForm.value.space_id = only ? (only.value as number) : null
	}

	createVisible.value = true

	ensureMembers()
	void loadSlots()
}

/** The member list is fetched once, when the filter or the create form first needs it. */
function ensureMembers(): void {
	if (members.value.length === 0 && !isLoadingMembers.value) {
		void loadMembers()
	}
}

/**
 * The cells for the chosen space and date.
 *
 * Re-fetched on every change of either, because a cell list is only true for
 * one space and one day — reusing yesterday's would offer windows that are
 * already gone.
 */
let slotsRequest = 0

async function loadSlots(): Promise<void> {
	const { space_id: spaceId, date } = createForm.value
	if (spaceId === null || !date) {
		slots.value = []
		slotsBanner.value = null
		return
	}

	const request = ++slotsRequest
	isLoadingSlots.value = true
	slotsBanner.value = null
	try {
		const response_ = await getSpaceSlots(spaceId, date)
		// A slower answer for a space or date the operator has since moved off
		// must not overwrite the current one.
		if (request !== slotsRequest) return

		granularityMinutes.value = response_.meta.granularity_minutes
		slots.value = response_.slots
		// A closed day carries the server's own banner, reason included.
		slotsBanner.value = response_.closed_banner?.text ?? null
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (request !== slotsRequest) return
		slots.value = []
		slotsBanner.value = caught.data?.message ?? t("bookingCalendar.create.slotsError")
	} finally {
		if (request === slotsRequest) isLoadingSlots.value = false
	}
}

/**
 * Picks the run, first cell then last.
 *
 * The first tap starts a run of one cell. A later tap on a free cell after it
 * ends the run there, if every cell between is free and unbroken; anything
 * else — an earlier cell, a run already made, a gap in between — starts a new
 * run at the tapped cell. A taken cell cannot be picked at all.
 */
function selectSlot(slot: AvailabilitySlot): void {
	if (!slot.is_available) return

	const { from, to } = createForm.value
	const startingNew = from === "" || from !== to || indexOf(slot.start_time) <= indexOf(from)
	if (startingNew) {
		createForm.value.from = slot.start_time
		createForm.value.to = slot.start_time
		return
	}

	createForm.value.to = slot.start_time
	// A broken stretch between the two taps is not a run: start over here.
	if (selectedRun.value === null) {
		createForm.value.from = slot.start_time
		createForm.value.to = slot.start_time
	}
}

const slotsGridRef = ref<HTMLElement | null>(null)

// A new space or date invalidates the chosen run: the cells free on Tuesday
// say nothing about Wednesday.
watch(
	() => [createForm.value.space_id, createForm.value.date],
	() => {
		createForm.value.from = ""
		createForm.value.to = ""
		if (createVisible.value) void loadSlots()
	}
)

async function loadMembers(): Promise<void> {
	isLoadingMembers.value = true
	try {
		members.value = await listMembers()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		// A failed member list leaves the picker empty rather than blocking the
		// modal; the operator sees an empty select and can close it.
		members.value = []
	} finally {
		isLoadingMembers.value = false
	}
}

async function submitCreate(): Promise<void> {
	if (!canSubmit.value) return

	isCreating.value = true
	createErrors.value = {}
	try {
		await createReceptionBooking({
			user_id: createForm.value.user_id as number,
			space_id: createForm.value.space_id as number,
			// Wall-clock in the district's own timezone, which is what the
			// endpoint expects — an offset here would be re-interpreted.
			//
			// The run's own first start and last end, both the server's values
			// — not minutes added here.
			start_at: `${createForm.value.date} ${selectedRun.value!.startTime}`,
			end_at: `${createForm.value.date} ${selectedRun.value!.endTime}`,
			payment_method: createForm.value.payment === "wallet" ? "wallet" : "cash",
			...(createForm.value.payment === "wallet" ? {} : { cash_collected: createForm.value.payment === "cash_now" }),
			...(createForm.value.note ? { note: createForm.value.note } : {})
		})
		message.success(t("bookingCalendar.create.success"))
		createVisible.value = false
		await load()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		createErrors.value = caught.data?.errors ?? {}
		// The server's own sentence, shown as-is: it already names the rule
		// that was broken, in the requested language.
		if (caught.data?.message) message.error(caught.data.message)
	} finally {
		isCreating.value = false
	}
}

// ---------------------------------------------------------------
// Load
// ---------------------------------------------------------------

async function load(): Promise<void> {
	isLoading.value = true
	error.value = null
	try {
		response.value = await getCalendar({
			view: activeView.value,
			date: activeDate.value,
			...(spaceType.value ? { space_type: spaceType.value } : {}),
			...(spaceId.value ? { space_id: spaceId.value } : {}),
			...(memberId.value ? { member_id: memberId.value } : {})
		})
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		error.value = caught
		response.value = null
	} finally {
		isLoading.value = false
	}
}

watch([activeView, activeDate, spaceType, spaceId, memberId], load, { immediate: true })

/** Exposed for the calendar API in tests and for a future refresh control. */
defineExpose({
	calendarApi: (): CalendarApi | undefined => refCalendar.value?.getApi()
})
</script>

<style scoped lang="scss">
/**
 * ADD OS Operations Calendar styling:
 * Fully styled for theme compatibility, RTL/LTR support, crisp readable slots,
 * opaque elevated popover dialogs, and accessible contrast.
 */
.add-booking-calendar {
	position: relative;
	z-index: 2;

	.add-total-chip {
		padding: var(--add-space-2, 0.5rem) var(--add-space-4, 1rem);
		border-radius: var(--border-radius, 8px);
		background-color: var(--bg-secondary-color);
		border: 1px solid var(--border-color);
		min-inline-size: 5.5rem;
		transition: border-color 0.15s ease;
	}

	.add-branch-hours-bar {
		padding: var(--add-space-2, 0.5rem) var(--add-space-3, 0.75rem);
		background-color: var(--bg-secondary-color);
		border-radius: var(--border-radius, 8px);
		border: 1px solid var(--border-color);
	}

	.add-calendar-card {
		position: relative;
		z-index: 2;
		overflow: visible;

		:deep(.n-card__content) {
			overflow: visible;
		}
	}

	.add-calendar-wrap {
		min-height: 34rem;
	}

	:deep(.fc) {
		--fc-border-color: var(--border-color);
		--fc-page-bg-color: var(--bg-default-color, #ffffff);
		--fc-neutral-bg-color: var(--bg-secondary-color, #f7f5f2);
		--fc-today-bg-color: rgba(var(--primary-color-rgb) / 0.06);
		--fc-event-text-color: var(--fg-default-color, #333333);
		--fc-event-border-color: var(--border-color);
		--fc-event-bg-color: var(--bg-secondary-color);
		--fc-now-indicator-color: var(--primary-color);

		font-family: inherit;

		// ── Toolbar ──────────────────────────────────────────────
		.fc-toolbar {
			margin-bottom: 1.25rem !important;
			gap: 0.75rem;
			flex-wrap: wrap;

			.fc-toolbar-title {
				font-size: 1.25rem;
				font-weight: 700;
				color: var(--fg-default-color);
				letter-spacing: -0.01em;
			}

			.fc-button {
				background-color: var(--bg-secondary-color);
				border-color: var(--border-color);
				color: var(--fg-default-color);
				box-shadow: none !important;
				text-transform: capitalize;
				font-weight: 500;
				font-size: 0.8125rem;
				padding: 0.45rem 0.9rem;
				border-radius: 6px;
				transition: all 0.15s ease;

				&:hover {
					background-color: rgba(var(--primary-color-rgb) / 0.12);
					border-color: var(--primary-color);
					color: var(--primary-color);
				}

				&.fc-button-active {
					background-color: var(--primary-color) !important;
					border-color: var(--primary-color) !important;
					color: #ffffff !important;
					font-weight: 600;
				}

				&:disabled {
					opacity: 0.45;
					cursor: not-allowed;
				}
			}

			.fc-button-group {
				gap: 1px;
				border-radius: 7px;
				overflow: hidden;

				.fc-button {
					border-radius: 0;
					&:first-child {
						border-start-start-radius: 6px;
						border-end-start-radius: 6px;
					}
					&:last-child {
						border-start-end-radius: 6px;
						border-end-end-radius: 6px;
					}
				}
			}
		}

		// ── Table & Headers ──────────────────────────────────────
		.fc-scrollgrid {
			border-radius: 8px;
			overflow: hidden;
		}

		.fc-scrollgrid-section-sticky > * {
			background: var(--bg-default-color, #ffffff) !important;
		}

		.fc-col-header-cell {
			background-color: var(--bg-secondary-color);
			padding: 8px 0;
			border-color: var(--border-color);

			.fc-col-header-cell-cushion {
				color: var(--fg-secondary-color);
				font-size: 0.8125rem;
				font-weight: 600;
				text-decoration: none;
			}
		}

		// ── Day Grid & Days ──────────────────────────────────────
		.fc-daygrid-day-number {
			color: var(--fg-secondary-color);
			font-size: 0.8125rem;
			font-weight: 600;
			padding: 6px 8px;
			text-decoration: none;
		}

		.fc-day-today {
			background-color: rgba(var(--primary-color-rgb) / 0.05) !important;

			.fc-daygrid-day-number {
				color: var(--primary-color);
				font-weight: 700;
			}
		}

		// ── Event Styling (Common, High-contrast, Accessible) ───
		.fc-event {
			font-family: inherit;
			font-size: 0.8125rem;

			.fc-event-main {
				color: var(--fg-default-color) !important;
			}
			.fc-event-title {
				color: var(--fg-default-color) !important;
			}
			.fc-event-time {
				color: var(--fg-secondary-color) !important;
			}
		}

		.fc-event.styled {
			border-radius: 6px !important;
			border-width: 1px !important;
			border-style: solid !important;
			border-inline-start-width: 4px !important;
			border-inline-start-style: solid !important;
			padding: 2px 4px !important;
			cursor: pointer;
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
			transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;

			&:hover {
				box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12) !important;
				z-index: 6 !important;
			}

			&.c-confirmed {
				background-color: rgba(var(--success-color-rgb) / 0.16) !important;
				border-color: rgba(var(--success-color-rgb) / 0.35) !important;
				border-inline-start-color: var(--success-color) !important;
				color: var(--fg-default-color) !important;

				&:hover {
					background-color: rgba(var(--success-color-rgb) / 0.24) !important;
				}
				.fc-event-main,
				.fc-event-title {
					color: var(--fg-default-color) !important;
				}
				.fc-event-time {
					color: var(--fg-secondary-color) !important;
				}
			}

			&.c-leased {
				background-color: rgba(var(--info-color-rgb) / 0.16) !important;
				border-color: rgba(var(--info-color-rgb) / 0.35) !important;
				border-inline-start-color: var(--info-color) !important;
				color: var(--fg-default-color) !important;

				&:hover {
					background-color: rgba(var(--info-color-rgb) / 0.24) !important;
				}
				.fc-event-main,
				.fc-event-title {
					color: var(--fg-default-color) !important;
				}
				.fc-event-time {
					color: var(--fg-secondary-color) !important;
				}
			}

			&.c-pending {
				background-color: rgba(var(--warning-color-rgb) / 0.18) !important;
				border-color: rgba(var(--warning-color-rgb) / 0.4) !important;
				border-inline-start-color: var(--warning-color) !important;
				color: var(--fg-default-color) !important;

				&:hover {
					background-color: rgba(var(--warning-color-rgb) / 0.26) !important;
				}
				.fc-event-main,
				.fc-event-title {
					color: var(--fg-default-color) !important;
				}
				.fc-event-time {
					color: var(--fg-secondary-color) !important;
				}
			}

			// Over, not void: muted like a cancelled booking, but without the
			// strike-through, because it happened. A `completed` booking is the
			// server saying the same thing, so it wears the same look.
			&.c-ended,
			&.c-completed {
				background-color: var(--bg-secondary-color) !important;
				border-color: var(--border-color) !important;
				border-inline-start-color: var(--fg-secondary-color) !important;
				color: var(--fg-secondary-color) !important;
				opacity: 0.8;

				.fc-event-main,
				.fc-event-title,
				.fc-event-time {
					color: var(--fg-secondary-color) !important;
				}
			}

			// A no-show is void like a cancellation — the room was not used —
			// but it held the slot to the end, so its edge stays coloured: the
			// one an operator may need to follow up.
			&.c-cancelled,
			&.c-no_show {
				background-color: var(--bg-secondary-color) !important;
				border-color: var(--border-color) !important;
				border-inline-start-color: var(--border-color) !important;
				color: var(--fg-secondary-color) !important;
				opacity: 0.7;

				.fc-event-main,
				.fc-event-title,
				.fc-event-time {
					color: var(--fg-secondary-color) !important;
					text-decoration: line-through;
				}
			}

			&.c-no_show {
				border-inline-start-color: var(--error-color) !important;
			}

			&.c-rejected {
				background-color: rgba(var(--error-color-rgb) / 0.16) !important;
				border-color: rgba(var(--error-color-rgb) / 0.35) !important;
				border-inline-start-color: var(--error-color) !important;
				color: var(--fg-default-color) !important;

				&:hover {
					background-color: rgba(var(--error-color-rgb) / 0.24) !important;
				}
				.fc-event-main,
				.fc-event-title {
					color: var(--fg-default-color) !important;
				}
				.fc-event-time {
					color: var(--fg-secondary-color) !important;
				}
			}
		}

		// ── TimeGrid (Week & Day Views) ─────────────────────────
		.fc-timegrid-slot {
			height: 2.25rem !important;
			border-bottom: 0 !important;
		}

		.fc-timegrid-slot-minor {
			border-top-style: dashed !important;
			border-top-color: rgba(var(--border-color-rgb, 120, 120, 120) / 0.25) !important;
		}

		.fc-timegrid-slot-label {
			vertical-align: middle;
			font-size: 0.75rem;
			font-weight: 600;
			color: var(--fg-secondary-color);
		}

		.fc-timegrid-axis-cushion {
			padding: 0 8px !important;
		}

		.fc-timegrid-now-indicator-line {
			border-color: var(--primary-color) !important;
			border-width: 2px 0 0 !important;
		}

		.fc-timegrid-now-indicator-arrow {
			border-color: var(--primary-color) !important;
		}

		.fc-timegrid-event {
			margin-bottom: 2px !important;
			// The card's own 4px padding plus this would leave a narrow column no
			// room for text; the card padding alone is enough.
			padding: 0 !important;
			overflow: hidden;

			.fc-event-main {
				padding: 4px 6px !important;
				display: flex !important;
				flex-direction: column !important;
				gap: 2px !important;
				min-width: 0;
				overflow: hidden;
				color: var(--fg-default-color) !important;
			}

			.fc-event-main-frame {
				min-width: 0;
			}

			// One line each, cut with an ellipsis: a title wrapped inside a narrow
			// column breaks letter by letter and reads as nothing.
			.fc-event-time,
			.fc-event-title {
				white-space: nowrap !important;
				overflow: hidden;
				text-overflow: ellipsis;
				max-width: 100%;
			}

			.fc-event-time {
				font-size: 0.75rem !important;
				font-weight: 700 !important;
				color: var(--fg-secondary-color) !important;
				line-height: 1.2 !important;
				margin: 0 !important;
			}

			.fc-event-title {
				font-size: 0.8125rem !important;
				font-weight: 600 !important;
				color: var(--fg-default-color) !important;
				line-height: 1.35 !important;
				margin: 0 !important;
			}
		}

		.fc-timegrid-more-link {
			border-radius: 6px;
			padding: 2px 4px;
			font-size: 0.75rem;
			font-weight: 700;
			background-color: var(--bg-secondary-color);
			border: 1px solid var(--border-color);
			color: var(--fg-default-color);
		}

		// ── DayGrid Events (Month View) ─────────────────────────
		.fc-daygrid-event {
			border-radius: 4px !important;
			padding: 2px 6px !important;
			margin: 2px 0 !important;
			display: flex !important;
			align-items: center !important;
			gap: 4px !important;

			// Clean modern appearance: hide the conflicting default dot
			.fc-daygrid-event-dot {
				display: none !important;
			}

			.fc-event-time {
				font-size: 0.72rem !important;
				font-weight: 700 !important;
				color: var(--fg-secondary-color) !important;
				flex-shrink: 0 !important;
			}

			.fc-event-title {
				font-size: 0.75rem !important;
				font-weight: 500 !important;
				color: var(--fg-default-color) !important;
				overflow: hidden !important;
				text-overflow: ellipsis !important;
				white-space: nowrap !important;
			}
		}

		// ── Month "+more" link ──────────────────────────────────
		.fc-more-link {
			display: inline-flex !important;
			align-items: center !important;
			padding: 2px 7px !important;
			font-size: 0.72rem !important;
			font-weight: 700 !important;
			color: var(--primary-color) !important;
			background-color: rgba(var(--primary-color-rgb) / 0.1) !important;
			border-radius: 6px !important;
			margin: 2px 3px !important;
			text-decoration: none !important;
			cursor: pointer;
			transition: all 0.15s ease;

			&:hover {
				background-color: var(--primary-color) !important;
				color: #ffffff !important;
				transform: translateY(-1px);
				box-shadow: 0 2px 6px rgba(var(--primary-color-rgb) / 0.3);
			}
		}

		// ── Closed Day Background Events ─────────────────────────
		.fc-bg-event.c-closed {
			background-color: var(--bg-secondary-color);
			opacity: 0.7;

			.fc-event-title {
				font-size: var(--add-font-size-caption, 0.75rem);
				font-style: normal;
				font-weight: var(--add-font-weight-medium, 500);
				color: var(--add-text-muted, var(--fg-secondary-color));
			}
		}

		.fc-daygrid-day.add-day--out-of-window {
			cursor: var(--add-disabled-cursor, not-allowed);

			.fc-daygrid-day-number {
				opacity: var(--add-disabled-opacity, 0.4);
			}
		}

		.fc-daygrid-day.add-day--closed {
			cursor: var(--add-disabled-cursor, not-allowed);

			.fc-daygrid-day-number {
				text-decoration: line-through;
				opacity: var(--add-disabled-opacity, 0.4);
			}
		}
	}
}

/**
 * Filter fields.
 */
.add-filter-field {
	display: flex;
	flex-direction: column;
	gap: var(--add-space-1, 0.25rem);
	inline-size: 13rem;
	max-inline-size: 100%;

	&--wide {
		inline-size: 16rem;
	}
}

.add-filters-reset-row {
	display: flex;
	align-items: center;
}

.add-filters-reset-btn {
	font-size: 0.8125rem;
	font-weight: 500;
	color: var(--fg-secondary-color);
	transition: color 0.15s ease, background-color 0.15s ease;

	&:hover {
		color: var(--primary-color);
	}
}

.add-legend-swatch {
	display: inline-block;
	inline-size: 0.85rem;
	block-size: 0.85rem;
	border-radius: 0.25rem;
	border-inline-start-width: 3px;
	border-inline-start-style: solid;

	&.c-confirmed {
		background-color: rgba(var(--success-color-rgb) / 0.2);
		border-color: var(--success-color);
	}
	&.c-pending {
		background-color: rgba(var(--warning-color-rgb) / 0.2);
		border-color: var(--warning-color);
	}
	&.c-ended,
	&.c-completed {
		background-color: var(--bg-secondary-color);
		border-color: var(--fg-secondary-color);
	}
	&.c-cancelled {
		background-color: var(--bg-secondary-color);
		border-color: var(--border-color);
	}
	&.c-no_show {
		background-color: var(--bg-secondary-color);
		border-color: var(--error-color);
	}
	&.c-rejected {
		background-color: rgba(var(--error-color-rgb) / 0.2);
		border-color: var(--error-color);
	}
	&.c-closed {
		background-color: var(--bg-secondary-color);
		border-color: var(--border-color);
		opacity: 0.7;
	}
	&.c-leased {
		background-color: rgba(var(--info-color-rgb) / 0.2);
		border-color: var(--info-color);
	}
}

/**
 * The slot grid and chips in the Create Booking modal.
 * Modern responsive 3-column layout with smooth vertical scrolling.
 */
.add-slot-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 10px;
	max-height: 250px;
	overflow-y: auto;
	overflow-x: hidden;
	padding: 4px;
	scrollbar-width: thin;
	scrollbar-color: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.45) rgba(0, 0, 0, 0.04);
	overscroll-behavior-y: contain;
	scroll-behavior: smooth;

	&::-webkit-scrollbar {
		width: 6px;
	}
	&::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.04);
		border-radius: 9999px;
	}
	&::-webkit-scrollbar-thumb {
		background: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.35);
		border-radius: 9999px;

		&:hover {
			background: var(--primary-color, #638356);
		}
	}

	@media (max-width: 440px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

.add-modal-badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	border-radius: 10px;
	background: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.12);
	border: 1px solid rgba(var(--primary-color-rgb, 99, 131, 86) / 0.2);
}

.add-slot-count-badge {
	font-size: 0.72rem;
	font-weight: 600;
	padding: 2px 8px;
	border-radius: 6px;
	background: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.1);
	color: var(--primary-color, #638356);
}

.add-quote-card {
	padding: 12px 16px;
	border-radius: 12px;
	background: linear-gradient(135deg, rgba(var(--primary-color-rgb, 99, 131, 86) / 0.08) 0%, rgba(var(--primary-color-rgb, 99, 131, 86) / 0.02) 100%);
	border: 1px solid rgba(var(--primary-color-rgb, 99, 131, 86) / 0.22);
}

.add-quote-currency-pill {
	display: inline-flex;
	align-items: center;
	padding: 3px 10px;
	border-radius: 6px;
	font-size: 0.75rem;
	font-weight: 600;
	background: var(--add-surface-raised, #ffffff);
	border: 1px solid var(--border-color);
	color: var(--fg-default-color);
}

.add-payment-tile {
	padding: 10px 12px;
	border-radius: 12px;
	border: 1.5px solid var(--border-color);
	background: var(--bg-secondary-color, #f9fafb);
	cursor: pointer;
	transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
	display: flex;
	align-items: center;

	:deep(.n-radio) {
		width: 100%;
		align-items: center;
	}

	&:hover:not(&--disabled):not(&--active) {
		border-color: var(--primary-color);
		background: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.04);
		transform: translateY(-1px);
	}

	&--active {
		border-color: var(--primary-color) !important;
		background: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.1) !important;
		box-shadow: 0 2px 8px rgba(var(--primary-color-rgb, 99, 131, 86) / 0.15);
	}

	&--disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
}

.add-create-rules-alert {
	border-radius: 10px !important;
	border: 1px solid rgba(var(--primary-color-rgb, 99, 131, 86) / 0.15) !important;
	background: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.05) !important;
}

.add-dialog-cancel-btn {
	border-radius: 10px !important;
	padding-inline: 16px !important;
	font-weight: 600;
	transition: all 0.15s ease;
}

.add-dialog-submit-btn {
	border-radius: 10px !important;
	padding-inline: 20px !important;
	box-shadow: 0 2px 8px rgba(var(--primary-color-rgb, 99, 131, 86) / 0.3) !important;
	transition: all 0.18s ease;

	&:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 14px rgba(var(--primary-color-rgb, 99, 131, 86) / 0.4) !important;
	}
}

.add-slot {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 3px;
	padding: 10px 6px;
	min-height: 58px;
	border-radius: 14px;
	border: 1.5px solid var(--border-color);
	background: var(--add-surface-raised, #ffffff);
	color: var(--fg-default-color);
	cursor: pointer;
	direction: ltr;
	transition: all 0.15s ease;

	.add-slot__start,
	> span:first-child {
		font-size: 0.8125rem;
		font-weight: 700;
		line-height: 1.25;
		color: var(--fg-default-color);
		transition: color 0.15s ease;
	}

	&__meta {
		font-size: 0.72rem;
		font-weight: 500;
		line-height: 1.25;
		color: var(--fg-secondary-color);
		transition: color 0.15s ease;
	}

	&:hover:not(:disabled):not(.add-slot--active) {
		border-color: var(--primary-color);
		background-color: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.05);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
	}

	&:focus-visible {
		outline: 2px solid var(--primary-color);
		outline-offset: 2px;
	}

	// ── Endpoint (Start or End of range, or single slot): Solid olive green like mobile app ──
	&--endpoint,
	&--active:not(&--middle) {
		background: #638356 !important;
		background: var(--primary-color, #638356) !important;
		border-color: var(--primary-color, #638356) !important;
		color: #ffffff !important;
		box-shadow: 0 4px 12px rgba(99, 131, 86, 0.35) !important;

		.add-slot__start,
		> span:first-child {
			color: #ffffff !important;
			font-weight: 700 !important;
		}

		.add-slot__meta {
			color: rgba(255, 255, 255, 0.9) !important;
			font-weight: 500 !important;
		}
	}

	// ── Middle of selected range: Soft mint/sage green tint like mobile app ──
	&--middle {
		background: #ebf3e7 !important;
		background: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.15) !important;
		border-color: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.4) !important;
		box-shadow: none !important;

		.add-slot__start,
		> span:first-child {
			color: #3b5a2a !important;
			color: var(--primary-color, #3b5a2a) !important;
			font-weight: 700 !important;
		}

		.add-slot__meta {
			color: #4b7038 !important;
			color: var(--primary-color, #4b7038) !important;
			opacity: 0.85;
			font-weight: 600 !important;
		}
	}

	// ── Unavailable / Booked slot: Soft muted gray with strikethrough ──
	&--taken,
	&:disabled {
		opacity: 0.45 !important;
		cursor: not-allowed !important;
		background: var(--bg-secondary-color, #f9fafb) !important;
		border-color: transparent !important;
		box-shadow: none !important;

		.add-slot__start,
		> span:first-child,
		.add-slot__meta {
			color: var(--fg-secondary-color) !important;
			text-decoration: line-through;
		}
	}
}

.add-slot-note {
	font-size: 0.8125rem;
	color: var(--fg-secondary-color);
	margin: 0;
	padding: 8px 12px;
	background: var(--bg-secondary-color);
	border-radius: 8px;
}

.add-slot-counts {
	font-size: 0.8125rem;
	color: var(--fg-secondary-color);
	margin: 0;

	&--hint {
		font-size: 0.78rem;
		opacity: 0.85;
	}

	// ── Selected Summary Bar matching mobile reference design ──
	&--selected {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 14px;
		border-radius: 12px;
		background-color: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.08);
		border: 1px solid rgba(var(--primary-color-rgb, 99, 131, 86) / 0.22);
		color: var(--fg-default-color);

		.add-slot-summary-range {
			display: flex;
			align-items: center;
			gap: 8px;
			font-size: 0.9375rem;
			font-weight: 700;
			color: var(--fg-default-color);
			letter-spacing: -0.01em;

			.add-slot-summary-icon {
				color: var(--primary-color);
			}
		}

		.add-slot-duration-badge {
			display: inline-flex;
			align-items: center;
			padding: 4px 12px;
			border-radius: 8px;
			background: #f3e8dc;
			color: #8c532b;
			font-weight: 700;
			font-size: 0.8125rem;
			white-space: nowrap;
			box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
		}
	}
}

.add-slot-warning {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	border-radius: 8px;
	background-color: rgba(var(--warning-color-rgb) / 0.12);
	border: 1px solid rgba(var(--warning-color-rgb) / 0.3);
	color: var(--warning-color);
	font-weight: 600;
	font-size: 0.8125rem;
	margin: 0;
}

:global(.theme-dark) {
	.add-slot {
		background: var(--bg-default-color, #1e1e24);
		border-color: var(--border-color);

		&--middle {
			background: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.2) !important;
		}

		&--taken,
		&:disabled {
			background: var(--bg-secondary-color, #26262e) !important;
		}
	}

	.add-slot-counts--selected {
		background-color: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.12);
		border-color: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.3);

		.add-slot-duration-badge {
			background: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.25);
			color: #e2c09f;
		}
	}

	.add-slot-grid {
		scrollbar-color: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.5) rgba(255, 255, 255, 0.05);

		&::-webkit-scrollbar-track {
			background: rgba(255, 255, 255, 0.05);
		}
		&::-webkit-scrollbar-thumb {
			background: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.45);
		}
	}

	.add-quote-card {
		background: linear-gradient(135deg, rgba(var(--primary-color-rgb, 99, 131, 86) / 0.14) 0%, rgba(var(--primary-color-rgb, 99, 131, 86) / 0.04) 100%);
		border-color: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.3);
	}

	.add-quote-currency-pill {
		background: var(--bg-secondary-color, #26262e);
	}

	.add-payment-tile {
		background: var(--bg-secondary-color, #26262e);

		&--active {
			background: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.18) !important;
		}
	}
}

.add-create-booking-modal,
.add-detail-modal,
.add-day-list-modal {
	max-height: calc(100vh - 48px);
	display: flex;
	flex-direction: column;

	:deep(.n-card-header) {
		flex-shrink: 0;
	}

	:deep(.n-card__content) {
		flex: 1 1 auto;
		overflow-y: auto !important;
		overflow-x: hidden !important;
		max-height: calc(88vh - 130px);
		scrollbar-width: thin;
		scrollbar-color: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.45) rgba(0, 0, 0, 0.04);
		overscroll-behavior-y: contain;
		padding-inline-end: 14px;

		&::-webkit-scrollbar {
			width: 6px;
		}
		&::-webkit-scrollbar-track {
			background: rgba(0, 0, 0, 0.04);
			border-radius: 9999px;
		}
		&::-webkit-scrollbar-thumb {
			background: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.35);
			border-radius: 9999px;

			&:hover {
				background: var(--primary-color, #638356);
			}
		}
	}

	:deep(.n-card__footer),
	:deep(.n-card__action) {
		flex-shrink: 0;
		border-top: 1px solid var(--border-color);
	}
}

// ── Day list (what "+N" opens) ─────────────────────────────
.add-day-list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.add-day-list__item {
	width: 100%;
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.625rem 0.75rem;
	border: 1px solid var(--border-color);
	border-inline-start-width: 4px;
	border-radius: 0.5rem;
	background: var(--bg-secondary-color);
	color: var(--fg-default-color);
	font: inherit;
	text-align: start;
	cursor: pointer;
	transition: background-color 0.15s ease;

	&:hover {
		background: rgba(var(--primary-color-rgb) / 0.06);
	}

	&:focus-visible {
		outline: 2px solid var(--primary-color);
		outline-offset: 2px;
	}

	&.c-confirmed {
		border-inline-start-color: var(--success-color);
	}
	&.c-leased {
		border-inline-start-color: var(--info-color);
	}
	&.c-pending {
		border-inline-start-color: var(--warning-color);
	}
	&.c-rejected {
		border-inline-start-color: var(--error-color);
	}
	&.c-ended,
	&.c-completed {
		border-inline-start-color: var(--fg-secondary-color);
		opacity: 0.85;
	}
	&.c-cancelled {
		opacity: 0.75;
	}
	&.c-no_show {
		border-inline-start-color: var(--error-color);
		opacity: 0.75;
	}
}

.add-day-list__time {
	flex-shrink: 0;
	font-size: 0.75rem;
	font-weight: 700;
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
	color: var(--fg-secondary-color);
}

// Space and member on their own lines, wrapping instead of truncating: a
// one-line "space · member" in RTL was cut from the member's first letters.
.add-day-list__body {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
}

.add-day-list__space {
	font-size: 0.875rem;
	font-weight: 600;
	overflow-wrap: anywhere;
}

.add-day-list__member {
	font-size: 0.75rem;
	color: var(--fg-secondary-color);
	overflow-wrap: anywhere;
}
</style>

<style lang="scss">
/* Global styles for booking modal dialogs (when portaled to body by Naive UI) */
.n-modal-container .n-modal.add-create-booking-modal,
.n-modal-container .n-modal.add-detail-modal,
.n-modal-container .n-modal.add-day-list-modal {
	max-height: calc(100vh - 48px);
	display: flex !important;
	flex-direction: column !important;

	.n-card-header {
		flex-shrink: 0 !important;
	}

	.n-card__content {
		flex: 1 1 auto !important;
		overflow-y: auto !important;
		overflow-x: hidden !important;
		max-height: calc(88vh - 130px) !important;
		scrollbar-width: thin !important;
		scrollbar-color: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.45) rgba(0, 0, 0, 0.04) !important;
		overscroll-behavior-y: contain;
		padding-inline-end: 14px;

		&::-webkit-scrollbar {
			width: 6px !important;
		}
		&::-webkit-scrollbar-track {
			background: rgba(0, 0, 0, 0.04) !important;
			border-radius: 9999px !important;
		}
		&::-webkit-scrollbar-thumb {
			background: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.35) !important;
			border-radius: 9999px !important;

			&:hover {
				background: var(--primary-color, #638356) !important;
			}
		}
	}

	.n-card__footer,
	.n-card__action {
		flex-shrink: 0 !important;
		border-top: 1px solid var(--border-color) !important;
	}
}

.theme-dark .n-modal-container .n-modal.add-create-booking-modal,
.theme-dark .n-modal-container .n-modal.add-detail-modal,
.theme-dark .n-modal-container .n-modal.add-day-list-modal {
	.n-card__content {
		scrollbar-color: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.5) rgba(255, 255, 255, 0.05) !important;

		&::-webkit-scrollbar-track {
			background: rgba(255, 255, 255, 0.05) !important;
		}
		&::-webkit-scrollbar-thumb {
			background: rgba(var(--primary-color-rgb, 99, 131, 86) / 0.45) !important;
		}
	}
}
</style>
