<!-- src/add-os/modules/events/components/EventSessionsDrawer.vue -->
<!--
	An event's schedule: one row per sitting, each with its own hours.

	This exists because an event whose hours differ per day could not be
	expressed at all — start_at/end_at is a single interval. Those two stay on
	the event as the envelope around these rows, derived by the backend, so
	the list and the card keep working whether or not an event has a schedule.
-->
<template>
	<n-modal
		v-model:show="show"
		preset="card"
		:title="t('events.sessions.title')"
		closable
		style="max-width: 40rem"
		content-style="max-height: 70vh; overflow-y: auto"
	>
		<n-spin :show="isLoading">
			<div class="flex flex-col gap-4">
				<n-alert type="info" :bordered="false">
					{{ t("events.sessions.note") }}
				</n-alert>

				<n-alert v-if="loadError" type="error" :title="t('events.sessions.loadError')" />

				<n-alert v-if="orderError" type="warning" :bordered="false">
					{{ orderError }}
				</n-alert>

				<n-empty v-if="!rows.length" :description="t('events.sessions.empty')" />

				<div v-for="(row, index) in rows" :key="index" class="flex items-center gap-2">
					<span class="text-xs opacity-60 w-6 shrink-0">{{ index + 1 }}</span>

					<n-date-picker
						v-model:value="row.start"
						class="flex-1"
						type="datetime"
						format="yyyy-MM-dd HH:mm"
						:placeholder="t('events.sessions.startAt')"
						@update:value="() => alignEnd(row)"
					/>
					<n-date-picker
						v-model:value="row.end"
						class="flex-1"
						type="datetime"
						format="yyyy-MM-dd HH:mm"
						:placeholder="t('events.sessions.endAt')"
					/>

					<n-button
						quaternary
						type="error"
						size="small"
						:aria-label="t('events.sessions.remove')"
						:title="t('events.sessions.remove')"
						@click="rows.splice(index, 1)"
					>
						<template #icon>
							<Icon name="carbon:close" :size="16" />
						</template>
					</n-button>
				</div>

				<div class="flex justify-between gap-2">
					<n-button size="small" dashed @click="addRow">
						<template #icon>
							<Icon name="carbon:add" :size="16" />
						</template>
						{{ t("events.sessions.add") }}
					</n-button>

					<div class="flex gap-2">
						<n-button size="small" @click="show = false">
							{{ t("common.close") }}
						</n-button>
						<n-button size="small" type="primary" :loading="isSaving" @click="save">
							{{ t("common.save") }}
						</n-button>
					</div>
				</div>

				<n-alert v-if="saveError" type="error" :bordered="false">
					{{ saveError }}
				</n-alert>
			</div>
		</n-spin>
	</n-modal>
</template>

<script setup lang="ts">
import type { DraftSession, EventSession } from "@/add-os/modules/events/types/event"
import {
	NAlert,
	NButton,
	NDatePicker,
	NEmpty,
	NModal,
	NSpin,
	useMessage
} from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { getEvent, updateEvent } from "@/add-os/services/events"
import { toOffsetIso } from "@/add-os/utils/format/dates"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{ eventId: number | null }>()
const emit = defineEmits<{ saved: [] }>()

const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()

const rows = ref<DraftSession[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const loadError = ref(false)
const saveError = ref<string | null>(null)

/** A sitting that ends before it begins would be refused by the API. */
const orderError = computed<string | null>(() => {
	const wrong = rows.value.some(r => r.start !== null && r.end !== null && r.end <= r.start)

	return wrong ? t("events.sessions.orderError") : null
})

const incomplete = computed(() => rows.value.some(r => r.start === null || r.end === null))

function addRow() {
	// A new row starts the day after the last one, at the same hours — a
	// multi-day event is usually consecutive days, so this is the common case
	// rather than an empty pair of pickers.
	const last = rows.value.at(-1)
	const DAY = 24 * 60 * 60 * 1000

	rows.value.push(
		last?.start != null && last?.end != null
			? { start: last.start + DAY, end: last.end + DAY }
			: { start: null, end: null }
	)
}

/** Keep a sitting inside one day when only its start has been set. */
function alignEnd(row: DraftSession) {
	if (row.start === null || row.end !== null) return

	row.end = row.start + 2 * 60 * 60 * 1000
}

async function load() {
	if (props.eventId === null) return

	isLoading.value = true
	loadError.value = false
	saveError.value = null

	try {
		const event = await getEvent(props.eventId)

		rows.value = (event.sessions ?? []).map(session => ({
			start: Date.parse(session.start_at),
			end: Date.parse(session.end_at)
		}))
	} catch {
		loadError.value = true
	} finally {
		isLoading.value = false
	}
}

watch(
	() => [show.value, props.eventId] as const,
	([visible]) => {
		if (visible) load()
	},
	{ immediate: true }
)

async function save() {
	if (props.eventId === null || orderError.value) return

	if (incomplete.value) {
		saveError.value = t("events.sessions.incomplete")
		return
	}

	isSaving.value = true
	saveError.value = null

	try {
		// An explicit offset, so the hours the admin sees are the hours that
		// are stored — the same contract the event form uses.
		const sessions: EventSession[] = rows.value.map(row => ({
			start_at: toOffsetIso(row.start as number),
			end_at: toOffsetIso(row.end as number)
		}))

		await updateEvent(props.eventId, { sessions })
		message.success(t("events.sessions.saved"))
		emit("saved")
		show.value = false
	} catch (error) {
		const body = (error as { data?: { message?: string } }).data
		saveError.value = body?.message ?? t("events.sessions.saveError")
	} finally {
		isSaving.value = false
	}
}

defineExpose({ rows, addRow, save, orderError })
</script>
