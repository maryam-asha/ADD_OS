<template>
	<div class="page page-wrapped page-mobile-full page-without-footer flex flex-col">
		<SegmentedPage
			ref="segmentedPageRef"
			:use-main-scroll="false"
			main-content-class="h-full! p-0!"
			disable-container-query
			enable-resize
		>
			<template #sidebar-content>
				<div class="section section-calendar">
					<DatePicker
						v-model="selectedDate"
						expanded
						borderless
						transparent
						locale="en"
						:first-day-of-week="2"
						:is-dark="isThemeDark"
					/>
				</div>
				<div class="section fullcalendar-actions-box">
					<p class="mb-3 opacity-50">Calendars</p>
					<div class="calendars-list">
						<n-checkbox v-model:checked="checkAll" label="View all" />
						<n-checkbox-group v-model:value="fullCalendarStore.selectedCalendars" class="flex flex-col">
							<n-checkbox
								v-for="calendar in fullCalendarStore.availableCalendars"
								:key="calendar.label"
								:value="calendar.label"
								class="styled"
								:class="calendar.label"
								:label="calendar.label"
							/>
						</n-checkbox-group>
					</div>
				</div>
				<div class="section mt-7">
					<div class="links flex flex-col gap-3">
						<a
							href="https://fullcalendar.io/docs/vue"
							target="_blank"
							alt="docs"
							class="flex items-center gap-2"
							rel="nofollow noopener noreferrer"
						>
							<Icon :name="ExternalIcon" :size="16" />
							<span>docs</span>
						</a>
						<a
							href="https://vcalendar.io/"
							target="_blank"
							alt="docs"
							class="flex items-center gap-2"
							rel="nofollow noopener noreferrer"
						>
							<Icon :name="ExternalIcon" :size="16" />
							<span>VCalendar</span>
						</a>
					</div>
				</div>
			</template>

			<template #main-toolbar>
				<div class="flex items-center gap-2">
					<div class="w-24">
						<n-select
							v-model:value="viewTypeModel"
							:size="compactMode ? 'small' : 'medium'"
							:options="viewTypeOptions"
							placeholder=""
						/>
					</div>
					<div>
						<n-button-group :size="compactMode ? 'small' : 'medium'">
							<n-button @click="calMove('prev')">
								<template #icon>
									<Icon :name="PrevIcon" :size="20" />
								</template>
							</n-button>
							<n-button @click="calMove('next')">
								<template #icon>
									<Icon :name="NextIcon" :size="20" />
								</template>
							</n-button>
							<n-button v-if="!compactMode" @click="goToday()">Today</n-button>
						</n-button-group>
					</div>
					<div class="current-date grow px-3 text-right" :class="{ compact: compactMode }">
						{{ currentDate }}
					</div>
					<div v-if="!compactMode">
						<n-button type="primary" @click="createNewEvent({})">
							<template #icon>
								<Icon :name="AddEventIcon" :size="20" />
							</template>
						</n-button>
					</div>
				</div>
			</template>
			<template #main-content>
				<div ref="calWrap" class="main scrollbar-styled h-full">
					<FullCalendar v-if="ready" ref="refCalendar" :options="calendarOptions" />
					<n-spin v-else class="h-full w-full" />
				</div>
			</template>
		</SegmentedPage>

		<EventEditor
			v-model:show="modalShow"
			v-model:event="currentEvent"
			@submit-event="submitEvent"
			@delete-event="deleteEvent"
		/>
	</div>
</template>

<script setup lang="ts">
import type { CalendarApi, CalendarOptions, EventInput } from "@fullcalendar/core"
import type { DateMarker, EventImpl } from "@fullcalendar/core/internal"
import type { CalendarEditEvent, CalendarEvent } from "@/mock/fullcalendar"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import listPlugin from "@fullcalendar/list"
import timeGridPlugin from "@fullcalendar/timegrid"
import FullCalendar from "@fullcalendar/vue3"
import { useResizeObserver } from "@vueuse/core"
import { NButton, NButtonGroup, NCheckbox, NCheckboxGroup, NSelect, NSpin } from "naive-ui"
import { DatePicker } from "v-calendar"
import { computed, nextTick, onMounted, ref, watch } from "vue"
import EventEditor from "@/components/apps/FullCalendar/EventEditor.vue"
import Icon from "@/components/common/Icon.vue"
import SegmentedPage from "@/components/common/SegmentedPage.vue"
import { useHideLayoutFooter } from "@/composables/useHideLayoutFooter"
import { useFullCalendarStore } from "@/stores/apps/useFullCalendarStore"
import { useThemeStore } from "@/stores/theme"
import "v-calendar/style.css"
import "@/assets/scss/overrides/vcalendar-override.scss"

type ViewType = "timeGridDay" | "dayGridMonth" | "timeGridWeek" | "listMonth"

const ExternalIcon = "tabler:external-link"
const NextIcon = "carbon:chevron-right"
const PrevIcon = "carbon:chevron-left"
const AddEventIcon = "carbon:calendar-add"

const fullCalendarStore = useFullCalendarStore()
const themeStore = useThemeStore()

const newEvent: CalendarEditEvent = {
	title: "",
	start: Date.now(),
	end: Date.now(),
	allDay: false,
	extendedProps: {
		calendar: "Personal",
		location: "",
		description: ""
	}
}

const ready = ref(false)
const compactMode = ref(false)
const refCalendar = ref()
const calWrap = ref()
const calendarApi = ref<null | CalendarApi>(null)
const segmentedPageRef = ref<typeof SegmentedPage | null>(null)

const currentEvent = ref<CalendarEditEvent | null>(null)
const selectedDate = ref(new Date())
const currentViewType = ref<ViewType | undefined>(undefined)
const currentDate = ref<string | undefined>(undefined)
const viewTypeModel = computed({
	get: () => currentViewType.value,
	set: val => calView(val as ViewType)
})

const viewTypeOptions = [
	{ value: "timeGridDay", label: "Day" },
	{ value: "timeGridWeek", label: "Week" },
	{ value: "listMonth", label: "List" },
	{ value: "dayGridMonth", label: "Month" }
]

onMounted(() => {
	nextTick(() => {
		const duration = 1000 * themeStore.routerTransitionDuration
		const gap = 500

		// TIMEOUT REQUIRED BY PAGE ANIMATION
		setTimeout(() => {
			ready.value = true
			nextTick(() => {
				calendarApi.value = refCalendar.value?.getApi()
				setCurrentState()
			})
		}, duration + gap)
	})
})

useResizeObserver(calWrap, entries => {
	const entry = entries[0]

	if (entry) {
		const { width } = entry.contentRect

		compactMode.value = width < 600
	}
	calendarApi.value?.updateSize()
})

function setCurrentState() {
	currentViewType.value = calendarApi.value?.view.type as ViewType
	currentDate.value = calendarApi.value?.view.title
}

function eventSanitizer(event: EventImpl): CalendarEvent {
	const {
		publicId,
		title,
		extendedProps: { calendar, location, description },
		allDay
	} = event._def

	const start = event._instance?.range.start || new Date()
	const end = event._instance?.range.end || new Date()

	return {
		id: publicId,
		title,
		start,
		end,
		extendedProps: {
			calendar,
			location,
			description
		},
		allDay
	}
}

function eventToEdit(event: EventImpl): CalendarEditEvent {
	const {
		publicId,
		title,
		extendedProps: { calendar, location, description },
		allDay
	} = event._def

	const start = event._instance?.range.start.getTime() || Date.now()
	const end = event._instance?.range.end.getTime() || Date.now()

	return {
		id: publicId,
		title,
		start,
		end,
		extendedProps: {
			calendar,
			location,
			description
		},
		allDay
	}
}

const checkAll = computed({
	get: () => fullCalendarStore.selectedCalendars.length === fullCalendarStore.availableCalendars.length,
	set: val => {
		if (val) {
			fullCalendarStore.selectedCalendars = fullCalendarStore.availableCalendars.map(
				(i: { label: string }) => i.label
			)
		} else if (fullCalendarStore.selectedCalendars.length === fullCalendarStore.availableCalendars.length) {
			fullCalendarStore.selectedCalendars = []
		}
	}
})

const isThemeDark = computed(() => themeStore.isThemeDark)

const modalShow = computed({
	get: () => currentEvent.value !== null,
	set: () => (currentEvent.value = null)
})

function calMove(direction: "next" | "prev" | "today") {
	if (direction === "next") {
		calendarApi.value?.next()
	}
	if (direction === "prev") {
		calendarApi.value?.prev()
	}
	if (direction === "today") {
		calendarApi.value?.today()
	}
}

function calView(type: ViewType) {
	calendarApi.value?.changeView(type)
}

function submitEvent() {
	if (currentEvent.value) {
		if (currentEvent.value.id) {
			fullCalendarStore.updateEvent(currentEvent.value)
		} else {
			fullCalendarStore.addEvent(currentEvent.value)
		}
		currentEvent.value = null
		refetchEvents()
	}
}

function deleteEvent() {
	if (currentEvent.value) {
		if (currentEvent.value.id) {
			fullCalendarStore.removeEvent(currentEvent.value.id)
		}
		currentEvent.value = null
		refetchEvents()
	}
}

function createNewEvent({ start, end }: { start?: number; end?: number }) {
	currentEvent.value = {
		...structuredClone(newEvent),
		start: start || Date.now(),
		end: end || Date.now(),
		allDay: true
	}
}

function refetchEvents() {
	calendarApi.value?.refetchEvents()
}

function goToday() {
	goToDate(new Date(), false)
}

function goToDate(date: Date, newEvent: boolean) {
	segmentedPageRef.value?.closeSidebar?.()
	calendarApi.value?.gotoDate(date)
	if (newEvent) {
		createNewEvent({ start: date.getTime(), end: date.getTime() })
	}
}

const calendarOptions: CalendarOptions = {
	plugins: [dayGridPlugin, interactionPlugin, timeGridPlugin, listPlugin],
	initialView: "dayGridMonth",
	headerToolbar: /* false */ {
		start: "drawerToggler actionsToggler today",
		center: "prev,title,next",
		end: "dayGridMonth,timeGridWeek,timeGridDay,listMonth"
	},
	firstDay: 1,
	forceEventDuration: true,
	editable: true,
	eventResizableFromStart: true,
	dragScroll: true,
	dayMaxEvents: 2,
	navLinks: true,
	events: (info, successCallback) => {
		if (!info) return
		const events: EventInput[] = fullCalendarStore.fetchEvents()
		successCallback(events)
	},
	eventClassNames({ event }) {
		return [`c-${event._def.extendedProps.calendar} styled`]
	},
	eventClick({ event }) {
		currentEvent.value = eventToEdit(event)
	},
	dateClick(info) {
		createNewEvent({ start: info.date.getTime(), end: info.date.getTime() })
	},
	eventDrop: ({ event }) => {
		if (event._instance) {
			event._instance.range.start = event.start as DateMarker
			event._instance.range.end = event.end as DateMarker
		}
		const updated = eventSanitizer(event)
		fullCalendarStore.updateEvent(updated)
		refetchEvents()
	},
	datesSet() {
		setCurrentState()
	}
	/*
	customButtons: {
		drawerToggler: {
			text: "",
			click() {
				createNewEvent({})
			}
		},
		actionsToggler: {
			text: "Actions",
			click() {
				showLabelsModal.value = !showLabelsModal.value
			}
		}
	}
	*/
}

watch(() => fullCalendarStore.selectedCalendars, refetchEvents)
watch(selectedDate, val => goToDate(val, false))

// :has() CSS relational pseudo-class not yet supported by Firefox
// (https://caniuse.com/css-has)
// at the moment this worker around permit to hide Layout Footer
useHideLayoutFooter()
</script>

<style lang="scss" scoped>
.page {
	.section-calendar {
		margin-top: -10px;
		margin-bottom: 10px;
		container-type: inline-size;

		:deep() {
			.vc-container {
				margin-left: -30px;
				margin-right: -30px;
				width: calc(100% + 60px);
				.vc-header {
					margin-top: 2px;
					margin-bottom: 17px;
				}

				@container (max-width:190px) {
					display: none;
				}
			}
		}

		@media (max-width: 700px) {
			//margin-top: 0;
			margin-bottom: 0;
			padding: 0 14px;
		}
	}

	.current-date {
		font-size: 18px;
		font-weight: bold;

		&.compact {
			font-size: 14px;
			line-height: 1.2;
			font-weight: normal;
		}
	}

	.fc {
		height: 100%;

		:deep() {
			--fc-today-bg-color: rgba(var(--primary-color-rgb) / 0.05);
			--fc-border-color: var(--border-color);
			--fc-button-bg-color: var(--bg-secondary-color);

			--fc-button-border-color: rgba(var(--primary-color-rgb) / 0.05);
			--fc-button-text-color: var(--primary-color);
			--fc-button-active-bg-color: rgba(var(--primary-color-rgb) / 0.1);
			--fc-button-active-border-color: rgba(var(--primary-color-rgb) / 0.05);
			--fc-button-hover-bg-color: rgba(var(--primary-color-rgb) / 0.05);
			--fc-button-hover-border-color: rgba(var(--primary-color-rgb) / 0.05);

			.fc-scrollgrid {
				border: none;

				& > thead > tr > th {
					border: none;
				}
				& > tbody > tr > td {
					border: none;
				}
			}
			.fc-header-toolbar {
				display: none;

				flex-wrap: wrap;
				gap: 10px;

				.fc-toolbar-title {
					text-align: center;
					line-height: 1.2;
					font-size: 18px;
				}
				.fc-toolbar-chunk {
					&:nth-child(2) {
						& > div {
							display: flex;
							align-items: center;
							gap: 20px;
						}
					}
				}
				.fc-button-group {
					border-radius: var(--border-radius);

					button {
						text-transform: capitalize;
						outline: none;
						border-radius: var(--border-radius);

						&.fc-prev-button,
						&.fc-next-button {
							line-height: 1;
						}

						&:focus {
							box-shadow: none;
						}
					}

					.fc-button:not(:last-child) {
						border-bottom-right-radius: 0px;
						border-top-right-radius: 0px;
					}
					.fc-button:not(:first-child) {
						border-bottom-left-radius: 0px;
						border-top-left-radius: 0px;
						margin-left: -1px;
					}
				}

				.fc-drawerToggler-button {
					background-color: rgba(var(--primary-color-rgb) / 0.1);
					border-radius: var(--border-radius);
					border: none;
					padding: 7px 18px;

					&::after {
						content: "Add event";
					}
				}

				.fc-today-button,
				.fc-actionsToggler-button {
					background-color: var(--bg-secondary-color);
					padding: 7px 18px;
					border-radius: var(--border-radius);
					color: var(--fg-default-color);
					border: none;
					text-transform: capitalize;
				}

				.fc-actionsToggler-button {
					display: none;
				}

				.fc-next-button,
				.fc-prev-button {
					background-color: transparent;
					border: none;
					color: var(--fg-default-color);

					.fc-icon {
						font-size: 24px;
					}

					&:hover {
						color: var(--primary-color);
					}
				}

				button {
					font-weight: 500;
					outline: none;
					box-shadow: none !important;
				}
			}

			.fc-daygrid-day-number {
				margin-right: 5px;
				margin-top: 5px;
				margin-bottom: 5px;
				border-radius: var(--border-radius);
				background-color: var(--bg-secondary-color);
				width: 26px;
				height: 20px;
				text-decoration: none;
				line-height: 20px;
				text-align: center;
				padding: 0;
				font-family: var(--font-family-mono);
				font-size: 11px;
				transition: all 0.2s;

				&:hover {
					background-color: rgba(var(--primary-color-rgb) / 0.15);
					color: var(--primary-color);
				}
			}

			.fc-col-header-cell-cushion {
				text-decoration: none;
			}

			.fc-list-sticky {
				.fc-list-day > * {
					background-color: var(--bg-default-color);
				}
			}

			.fc-list-event:hover {
				td {
					background-color: rgba(var(--primary-color-rgb) / 0.05);
				}
			}
			.fc-timegrid-event-harness-inset .fc-timegrid-event,
			.fc-timegrid-event.fc-event-mirror,
			.fc-timegrid-more-link {
				box-shadow: none;
			}

			.fc-event {
				.fc-event-title {
					margin-left: 3px;
				}

				.fc-event-time {
					color: var(--fg-secondary-color);
					margin-left: 5px;
				}

				&.c-Personal {
					background-color: rgba(var(--extra1-color-rgb) / 0.05);
					border-color: rgba(var(--extra1-color-rgb) / 0.1);
					.fc-event-title {
						color: var(--extra1-color);
					}
				}
				&.c-Business {
					background-color: rgba(var(--extra2-color-rgb) / 0.05);
					border-color: rgba(var(--extra2-color-rgb) / 0.1);
					.fc-event-title {
						color: var(--extra2-color);
					}
				}
				&.c-Family {
					background-color: rgba(var(--extra3-color-rgb) / 0.05);
					border-color: rgba(var(--extra3-color-rgb) / 0.1);
					.fc-event-title {
						color: var(--extra3-color);
					}
				}
				&.c-Holiday {
					background-color: rgba(var(--extra4-color-rgb) / 0.05);
					border-color: rgba(var(--extra4-color-rgb) / 0.1);
					.fc-event-title {
						color: var(--extra4-color);
					}
				}
				&.c-Other {
					background-color: rgba(var(--primary-color-rgb) / 0.05);
					border-color: rgba(var(--primary-color-rgb) / 0.05);
					.fc-event-title {
						color: var(--primary-color);
					}
				}
			}

			.fc-popover {
				border-color: rgba(var(--primary-color-rgb) / 0.2);
				border: none;
				.fc-popover-header {
					color: var(--fg-default-color);
					background-color: var(--bg-secondary-color);
				}

				.fc-event-time {
					color: rgba(0, 0, 0, 0.5);
				}
			}
		}
	}

	@media (max-width: 1200px) {
		.fc {
			:deep() {
				.fc-header-toolbar {
					.fc-actionsToggler-button {
						display: initial;
					}

					.fc-today-button {
						display: none;
					}
				}
			}
		}
	}
	@media (max-width: 900px) {
		.fc {
			:deep() {
				.fc-header-toolbar {
					.fc-drawerToggler-button {
						padding: 4px 18px;
						line-height: 1.19;
						&::after {
							content: "+";
							font-size: 24px;
						}
					}
				}
			}
		}
	}
	@media (max-width: 840px) {
		.fc {
			:deep() {
				.fc-header-toolbar {
					.fc-toolbar-chunk {
						&:nth-child(2) {
							order: -1;
							width: 100%;
							display: flex;
							align-items: center;
							justify-content: center;

							& > div {
								width: 100%;
								justify-content: space-between;
							}
						}
					}
				}
			}
		}
	}
	@media (max-width: 700px) {
		min-height: initial;

		.fc {
			height: 100%;
		}
	}
	@media (max-width: 395px) {
		.fc {
			:deep() {
				.fc-header-toolbar {
					.fc-actionsToggler-button {
						margin-left: 0;
					}
					.fc-drawerToggler-button {
						display: none;
					}
				}
			}
		}
	}
}
</style>

<style lang="scss">
.fullcalendar-actions-box {
	border-radius: var(--border-radius);
	overflow: hidden;

	.n-card-header,
	.n-card__content {
		background-color: var(--bg-default-color);
	}

	.labels-sections {
		border-top: 1px solid var(--border-color);
		margin-left: -24px;
		margin-right: -24px;
		padding: 0 24px;
		padding-top: 16px;

		.label {
			margin-bottom: 16px;
		}
	}
	.label {
		font-family: var(--font-family);
		font-size: 12px;
		margin-bottom: 8px;
		font-weight: 600;
		color: var(--fg-secondary-color);
	}

	.n-checkbox {
		&.styled {
			margin-top: 8px;

			.n-checkbox__label {
				display: flex;
				align-items: center;
				gap: 8px;

				&::after {
					content: "";
					display: block;
					width: 8px;
					height: 8px;
					border-radius: 50%;
				}
			}
		}
		&.Personal {
			.n-checkbox__label::after {
				background-color: var(--extra1-color);
			}
		}
		&.Business {
			.n-checkbox__label::after {
				background-color: var(--extra2-color);
			}
		}
		&.Family {
			.n-checkbox__label::after {
				background-color: var(--extra3-color);
			}
		}
		&.Holiday {
			.n-checkbox__label::after {
				background-color: var(--extra4-color);
			}
		}
		&.Other {
			.n-checkbox__label::after {
				background-color: var(--primary-color);
			}
		}
	}
}
</style>
