export interface BusinessHourException {
	id: number
	branch_id: number
	/** "YYYY-MM-DD" */
	date: string
	is_closed: boolean
	/** null when is_closed is true — confirmed live: is_closed=true requires these omitted. */
	open_time: string | null
	close_time: string | null
	reason: string | null
}

export interface BusinessHourExceptionPayload extends Record<string, unknown> {
	branch_id: number
	date: string
	is_closed: boolean
	open_time: string | null
	close_time: string | null
	reason: string | null
}
