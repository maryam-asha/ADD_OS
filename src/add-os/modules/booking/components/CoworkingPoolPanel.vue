<!-- src/add-os/modules/booking/components/CoworkingPoolPanel.vue -->
<template>
	<n-card class="add-coworking-pool">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div
				class="flex items-center gap-2 font-semibold cursor-pointer select-none"
				@click="isExpanded = !isExpanded"
			>
				<Icon name="carbon:group" :size="18" />
				<span>{{ t("coworkingPool.title") }}</span>
				<span v-if="!isExpanded && pool" class="text-xs font-normal opacity-75 ms-1">
					({{ t("coworkingPool.stats.free") }}: {{ formatNumber(pool.free_now) }} / {{ formatNumber(pool.capacity_now) }})
				</span>
			</div>

			<div class="flex items-center gap-2">
				<n-button quaternary size="small" :loading="isLoading" :aria-label="t('coworkingPool.refresh')" @click="loadPool">
					<template #icon>
						<Icon name="carbon:renew" :size="16" />
					</template>
				</n-button>
				<n-button size="small" :disabled="rooms.length === 0" @click="openLend">
					<template #icon>
						<Icon name="carbon:share" :size="16" />
					</template>
					{{ t("coworkingPool.lend.button") }}
				</n-button>
				<n-button
					quaternary
					size="small"
					circle
					:aria-label="isExpanded ? t('coworkingPool.collapse') : t('coworkingPool.expand')"
					@click="isExpanded = !isExpanded"
				>
					<template #icon>
						<Icon
							name="carbon:chevron-down"
							:size="16"
							class="transition-transform duration-200"
							:class="{ 'rotate-180': isExpanded }"
						/>
					</template>
				</n-button>
			</div>
		</div>

		<n-collapse-transition :show="isExpanded">
			<div>
				<n-alert v-if="loadError" type="error" class="mt-3" :title="loadError" />

				<!--
					The server's own counts, shown as they came. Nothing here recounts
					seats: which subscription covers whom, and whether a plan is open,
					are decided once on the server for every booking, walk-in and sale.
				-->
				<div v-else-if="pool" class="mt-3 flex flex-wrap items-center gap-3">
					<div v-for="stat in stats" :key="stat.key" class="add-pool-chip flex flex-col" :class="stat.tone && `add-pool-chip--${stat.tone}`">
						<span class="text-xs opacity-75">{{ t(`coworkingPool.stats.${stat.key}`) }}</span>
						<span class="text-base font-bold add-numeric">{{ formatNumber(stat.value) }}</span>
					</div>
					<p class="text-xs opacity-70">{{ t("coworkingPool.hint") }}</p>
				</div>

				<!--
					The rest of the day, stretch by stretch: "taken now" is this moment
					only, and a booking at 19:00 is not taken at 17:00 — so the seats
					already promised later today are listed here rather than hidden.
				-->
				<div v-if="busySegments.length > 0" class="mt-3 flex flex-col gap-1">
					<span class="text-xs font-semibold">{{ t("coworkingPool.untilClosing") }}</span>
					<div
						v-for="segment in busySegments"
						:key="segment.start"
						class="add-segment-row flex items-center justify-between gap-3 text-sm"
						:class="{ 'add-segment-row--short': segment.free < 0 }"
					>
						<span class="add-numeric">{{ formatTime(segment.start) }} – {{ formatTime(segment.end) }}</span>
						<span class="add-numeric">
							{{ t("coworkingPool.segmentTaken", { taken: formatNumber(segment.usage), seats: formatNumber(segment.capacity) }) }}
						</span>
					</div>
				</div>

				<n-alert v-if="pool && pool.min_free < 0" type="warning" class="mt-3" :title="t('coworkingPool.overbooked')" />
				<n-alert v-else-if="pool && pool.free_now <= 0" type="warning" class="mt-3" :title="t('coworkingPool.full')" />
			</div>
		</n-collapse-transition>

		<!-- Lend a room to co-working, or take it back -->
		<n-modal v-model:show="lendVisible" preset="card" class="max-w-lg" :title="t('coworkingPool.lend.title')">
			<p class="mb-4 text-xs">{{ t("coworkingPool.lend.hint") }}</p>

			<n-form label-placement="top">
				<n-form-item :label="t('coworkingPool.lend.room')">
					<n-select v-model:value="lendForm.space_id" :options="roomOptions" :placeholder="t('coworkingPool.lend.selectRoom')" />
				</n-form-item>

				<div class="grid grid-cols-1 gap-x-4 md:grid-cols-3">
					<n-form-item :label="t('coworkingPool.lend.date')" :feedback="fieldErrors.starts_at?.[0]" :validation-status="fieldErrors.starts_at ? 'error' : undefined">
						<n-date-picker v-model:formatted-value="lendForm.date" type="date" value-format="yyyy-MM-dd" :is-date-disabled="isPastDate" class="w-full" />
					</n-form-item>
					<n-form-item :label="t('coworkingPool.lend.from')">
						<n-time-picker v-model:formatted-value="lendForm.from" format="hh:mm a" use-12-hours value-format="HH:mm" :minutes="30" class="w-full" />
					</n-form-item>
					<n-form-item :label="t('coworkingPool.lend.to')" :feedback="fieldErrors.ends_at?.[0]" :validation-status="fieldErrors.ends_at ? 'error' : undefined">
						<n-time-picker v-model:formatted-value="lendForm.to" format="hh:mm a" use-12-hours value-format="HH:mm" :minutes="30" class="w-full" />
					</n-form-item>
				</div>

				<n-form-item :label="t('coworkingPool.lend.seats')" :feedback="fieldErrors.seats?.[0]" :validation-status="fieldErrors.seats ? 'error' : undefined">
					<n-input-number v-model:value="lendForm.seats" :min="1" :max="selectedRoom?.capacity ?? undefined" class="w-full" />
				</n-form-item>
			</n-form>

			<!--
				The room's current and coming stretches, so the operator sees what
				it is already lent for before lending it again.
			-->
			<div v-if="lendForm.space_id !== null" class="flex flex-col gap-2">
				<span class="text-xs font-semibold">{{ t("coworkingPool.lend.existing") }}</span>
				<n-spin :show="windowsLoading" :size="14">
					<p v-if="windows.length === 0" class="text-xs opacity-70">{{ t("coworkingPool.lend.none") }}</p>
					<div v-for="window in windows" :key="window.id" class="add-window-row flex items-center justify-between gap-2">
						<span class="text-sm">
							{{ formatDate(window.starts_at) }} · {{ formatTime(window.starts_at) }} – {{ formatTime(window.ends_at) }}
							· {{ t("coworkingPool.lend.seatsCount", { seats: formatNumber(window.seats) }) }}
						</span>
						<n-button size="tiny" quaternary type="error" :aria-label="t('coworkingPool.lend.takeBack')" @click="takeBack(window)">
							{{ t("coworkingPool.lend.takeBack") }}
						</n-button>
					</div>
				</n-spin>
			</div>

			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="lendVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="isSubmitting" :disabled="!canLend" @click="submitLend">
						{{ t("coworkingPool.lend.submit") }}
					</n-button>
				</div>
			</template>
		</n-modal>
	</n-card>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { CoworkingPool, CoworkingWindow } from "@/add-os/modules/booking/types/coworking"
import {
	NAlert,
	NButton,
	NCard,
	NCollapseTransition,
	NDatePicker,
	NForm,
	NFormItem,
	NInputNumber,
	NModal,
	NSelect,
	NSpin,
	NTimePicker,
	useDialog,
	useMessage
} from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import { getCoworkingPool, lendRoom, listCoworkingWindows, takeRoomBack } from "@/add-os/services/coworking"
import { formatDate, formatNumber, formatTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The branch's co-working seats at a glance, and the one lever staff have
 * when they run out: lending a room to co-working for a stretch.
 *
 * Seats are counted once per branch on the server — co_spaces plus lent
 * rooms open; subscriptions (while their plan is open), bookings and walk-ins
 * inside now taken (backend docs/decisions/coworking-seat-pool.md). A lent
 * room takes no room bookings meanwhile, and the server refuses to lend one
 * over its own bookings or to take seats back the pool is counting on; those
 * refusals are shown as they arrive.
 */

const props = defineProps<{
	/** The branch the calendar is showing. */
	branchId: number
	/** The branch's rooms that could be lent: id, name, and seats. */
	rooms: { id: number, title: string, capacity: number | null }[]
	/** The district's today, `YYYY-MM-DD`. */
	today: string
}>()

const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const pool = ref<CoworkingPool | null>(null)
const isLoading = ref(false)
const isExpanded = ref(false)
const loadError = ref<string | null>(null)

/** The stretches until closing in which any seat is taken, as the server cut them. */
const busySegments = computed(() => (pool.value?.segments ?? []).filter(segment => segment.usage > 0))

/** Now, the most taken at once until closing, and the fewest free. */
const stats = computed(() => {
	if (!pool.value) return []
	const busiest = Math.max(0, ...pool.value.segments.map(segment => segment.usage))
	return [
		{ key: "capacity", value: pool.value.capacity_now, tone: null },
		{ key: "taken", value: pool.value.usage_now, tone: null },
		{ key: "free", value: pool.value.free_now, tone: pool.value.free_now <= 0 ? "warning" : "success" },
		{ key: "busiest", value: busiest, tone: null },
		{ key: "fewestToday", value: pool.value.min_free, tone: pool.value.min_free < 0 ? "error" : null }
	]
})

async function loadPool(): Promise<void> {
	isLoading.value = true
	loadError.value = null
	try {
		pool.value = await getCoworkingPool(props.branchId)
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		pool.value = null
		loadError.value = caught.data?.message ?? t("coworkingPool.loadError")
	} finally {
		isLoading.value = false
	}
}

watch(() => props.branchId, loadPool, { immediate: true })

// ---------------------------------------------------------------
// Lending a room
// ---------------------------------------------------------------

const lendVisible = ref(false)
const isSubmitting = ref(false)
const fieldErrors = ref<Record<string, string[]>>({})
const lendForm = ref<{ space_id: number | null, date: string, from: string | null, to: string | null, seats: number | null }>({
	space_id: null,
	date: "",
	from: null,
	to: null,
	seats: null
})

const roomOptions = computed<SelectOption[]>(() =>
	props.rooms.map(room => ({
		value: room.id,
		label: room.capacity ? `${room.title} · ${t("coworkingPool.lend.seatsCount", { seats: formatNumber(room.capacity) })}` : room.title
	}))
)

const selectedRoom = computed(() => props.rooms.find(room => room.id === lendForm.value.space_id) ?? null)

/** `HH:mm` compares correctly as text: both are 24-hour, zero-padded. */
const canLend = computed(() => {
	const { space_id, date, from, to, seats } = lendForm.value
	return space_id !== null && date !== "" && from !== null && to !== null && to > from && seats !== null && seats >= 1
})

function isPastDate(timestamp: number): boolean {
	const date = new Date(timestamp)
	const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
	return iso < props.today
}

function openLend(): void {
	fieldErrors.value = {}
	lendForm.value = {
		space_id: props.rooms.length === 1 ? props.rooms[0].id : null,
		date: props.today,
		from: null,
		to: null,
		seats: null
	}
	lendVisible.value = true
}

const windows = ref<CoworkingWindow[]>([])
const windowsLoading = ref(false)

async function loadWindows(): Promise<void> {
	const spaceId = lendForm.value.space_id
	if (spaceId === null) {
		windows.value = []
		return
	}
	windowsLoading.value = true
	try {
		windows.value = await listCoworkingWindows(spaceId)
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		windows.value = []
	} finally {
		windowsLoading.value = false
	}
}

// A room's seats cap what it can lend: a different room starts over.
watch(
	() => lendForm.value.space_id,
	() => {
		lendForm.value.seats = selectedRoom.value?.capacity ?? null
		void loadWindows()
	}
)

async function afterChange(): Promise<void> {
	await Promise.all([loadWindows(), loadPool()])
	emit("changed")
}

async function submitLend(): Promise<void> {
	if (!canLend.value) return
	const { space_id, date, from, to, seats } = lendForm.value

	isSubmitting.value = true
	fieldErrors.value = {}
	try {
		await lendRoom(space_id!, { starts_at: `${date} ${from}`, ends_at: `${date} ${to}`, seats: seats! })
		message.success(t("coworkingPool.lend.success"))
		lendForm.value.from = null
		lendForm.value.to = null
		await afterChange()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		fieldErrors.value = caught.data?.errors ?? {}
		// The server's own sentence: a booking in the stretch, an overlapping
		// stretch, too many seats.
		message.error(caught.data?.message ?? t("coworkingPool.lend.error"))
	} finally {
		isSubmitting.value = false
	}
}

/**
 * Takes the room back. When the pool is counting on its seats the server
 * refuses; staff may then insist, by arrangement, and the second request says
 * so with `override`.
 */
async function takeBack(window: CoworkingWindow, override = false): Promise<void> {
	try {
		const result = await takeRoomBack(window.id, override)
		message.success(result.message)
		await afterChange()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (caught.status === 422 && !override) {
			dialog.warning({
				title: t("coworkingPool.lend.overrideTitle"),
				content: caught.data?.message ?? "",
				positiveText: t("coworkingPool.lend.overrideConfirm"),
				negativeText: t("resourceCrud.form.cancel"),
				onPositiveClick: () => takeBack(window, true)
			})
			return
		}
		message.error(caught.data?.message ?? t("coworkingPool.lend.error"))
	}
}

defineExpose({ pool, loadPool, openLend, lendForm, canLend, submitLend, windows, takeBack })
</script>

<style scoped lang="scss">
.add-coworking-pool {
	.add-pool-chip {
		padding: var(--add-space-2, 0.5rem) var(--add-space-4, 1rem);
		border-radius: var(--border-radius, 8px);
		background-color: var(--bg-secondary-color);
		border: 1px solid var(--border-color);
		min-inline-size: 5.5rem;
	}

	.add-pool-chip--success {
		border-color: var(--success-color);
	}

	.add-pool-chip--warning {
		border-color: var(--warning-color);
	}

	.add-pool-chip--error {
		border-color: var(--error-color);
	}
}

.add-segment-row {
	padding: var(--add-space-1, 0.25rem) var(--add-space-2, 0.5rem);
	border-radius: var(--border-radius, 8px);
	background-color: var(--bg-secondary-color);
}

.add-segment-row--short {
	border: 1px solid var(--error-color);
}

.add-window-row {
	padding: var(--add-space-1, 0.25rem) var(--add-space-2, 0.5rem);
	border-radius: var(--border-radius, 8px);
	background-color: var(--bg-secondary-color);
}
</style>
