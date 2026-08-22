export type DayOfWeek = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday"

export interface BusinessHour {
	id: number
	branch_id: number
	day_of_week: DayOfWeek
	/** "HH:mm" — confirmed live the backend rejects "HH:mm:ss" (format must be exactly H:i). */
	open_time: string
	close_time: string
}

export interface BusinessHourPayload extends Record<string, unknown> {
	branch_id: number
	day_of_week: DayOfWeek
	open_time: string
	close_time: string
}
