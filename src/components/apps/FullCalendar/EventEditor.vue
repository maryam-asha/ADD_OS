<template>
	<n-drawer v-model:show="modalShow" :width="500" class="fullcalendar-drawer">
		<n-drawer-content :title="event?.id ? 'Edit event' : 'Add event'" closable>
			<n-form v-if="event" ref="refForm" :label-width="80" :model="event" :rules="formRules">
				<n-form-item label="Title" path="title">
					<n-input v-model:value="event.title" placeholder="Event Title" />
				</n-form-item>
				<div class="flex flex-col justify-between sm:flex-row">
					<n-form-item label="Start" path="start">
						<n-date-picker
							v-model:value="event.start"
							class="w-full"
							:type="event.allDay ? 'date' : 'datetime'"
						/>
					</n-form-item>
					<n-form-item label="End" path="end">
						<n-date-picker
							v-model:value="event.end"
							class="w-full"
							:type="event.allDay ? 'date' : 'datetime'"
						/>
					</n-form-item>
				</div>
				<div class="flex justify-between gap-6">
					<n-form-item label="All Day" path="allDay">
						<n-switch v-model:value="event.allDay" />
					</n-form-item>
					<n-form-item label="Calendar" path="extendedProps.calendar" class="grow">
						<n-select v-model:value="event.extendedProps.calendar" :options="selectCalendar" />
					</n-form-item>
				</div>
				<n-form-item label="Location" path="extendedProps.location">
					<n-input
						v-model:value="event.extendedProps.location"
						type="textarea"
						placeholder="Event Location"
					/>
				</n-form-item>
				<n-form-item label="Description" path="extendedProps.description">
					<n-input
						v-model:value="event.extendedProps.description"
						type="textarea"
						placeholder="Event Description"
					/>
				</n-form-item>
				<div class="flex items-center justify-end gap-3">
					<n-form-item v-if="event?.id">
						<n-popconfirm @positive-click="deleteEvent">
							<template #trigger>
								<n-button>Delete Event</n-button>
							</template>
							Are you sure you want
							<br />
							to delete the event?
						</n-popconfirm>
					</n-form-item>
					<n-form-item>
						<n-button type="primary" @click="submitEvent">Submit</n-button>
					</n-form-item>
				</div>
			</n-form>
		</n-drawer-content>
	</n-drawer>
</template>

<script setup lang="ts">
import type { FormValidationError } from "naive-ui"
import type { CalendarEditEvent } from "@/mock/fullcalendar"
import {
	NButton,
	NDatePicker,
	NDrawer,
	NDrawerContent,
	NForm,
	NFormItem,
	NInput,
	NPopconfirm,
	NSelect,
	NSwitch
} from "naive-ui"
import { computed, ref } from "vue"
import { useFullCalendarStore } from "@/stores/apps/useFullCalendarStore"

const emit = defineEmits(["submitEvent", "deleteEvent"])
const event = defineModel<CalendarEditEvent | null>("event", { default: null })
const modalShow = defineModel<boolean>("show", { default: false })
const refForm = ref()
const fullCalendarStore = useFullCalendarStore()
const selectCalendar = computed(() =>
	fullCalendarStore.availableCalendars.map(o => ({
		label: o.label,
		value: o.label
	}))
)

const formRules = {
	title: {
		required: true,
		message: "Please input event title",
		trigger: "blur"
	}
}

function submitEvent() {
	refForm.value?.validate((errors: Array<FormValidationError> | undefined) => {
		if (!errors && event.value) {
			emit("submitEvent")
		}
	})
}

function deleteEvent() {
	emit("deleteEvent")
}
</script>

<style lang="scss">
.fullcalendar-drawer {
	max-width: 100%;
}
</style>
