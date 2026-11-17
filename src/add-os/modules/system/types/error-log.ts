/**
 * One error or crash the member app reported (`POST /api/v1/errors`, sent
 * without a session), as the dashboard reads it back from
 * `GET /api/v1/admin/error-logs`. Shape from ADD Core's `ErrorLogResource`;
 * only `error_type` and `message` are required on the way in, so everything
 * else can be null.
 */
export type ErrorLogPlatform = "android" | "ios"

export interface ErrorLog {
	id: number
	error_type: string
	message: string
	stack_trace: string | null
	app_version: string | null
	build_number: string | null
	platform: ErrorLogPlatform | null
	os: string | null
	device: string | null
	screen: string | null
	/** A bare id: the resource does not load the user, so there is no name to show. */
	user_id: number | null
	session_id: string | null
	/** Null only for rows written before the backend defaulted it to now(). */
	occurred_at: string | null
	metadata: Record<string, unknown> | null
	created_at: string
}

/** The filters `GET /api/v1/admin/error-logs` accepts; all optional, `error_type` is an exact match. */
export interface ErrorLogQuery {
	platform?: ErrorLogPlatform | null
	error_type?: string | null
	from?: string | null
	to?: string | null
}
