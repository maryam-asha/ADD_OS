import { h } from "vue"
import { RouterLink } from "vue-router"
import { renderIcon } from "@/utils"

const CalendarIcon = "carbon:calendar"

export default {
	key: "Apps-Calendars-FullCalendar",
	icon: renderIcon(CalendarIcon),
	label: () =>
		h(
			RouterLink,
			{
				to: {
					name: "Apps-Calendars-FullCalendar"
				}
			},
			{ default: () => "Calendar" }
		)

	/*
	label: "Calendars",
	children: [
		{
			label: () =>
				h(
					RouterLink,
					{
						to: {
							name: "full-calendar"
						}
					},
					{ default: () => "Full Calendar" }
				),
			key: "full-calendar"
		},
		{
			label: () =>
				h(
					RouterLink,
					{
						to: {
							name: "vue-cal"
						}
					},
					{ default: () => "Vue Cal" }
				),
			key: "vue-cal"
		}
	]
	*/
}
