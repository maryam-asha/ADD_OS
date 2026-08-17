import type { Paginated, RawPaginatedResponse } from "./pagination"
import { del, get, post, put } from "./api"
import { toPaginated } from "./pagination"

/**
 * Exported (not just module-local): `vue-tsc --build --force` emits
 * declaration files (`composite: true`), and any consumer that re-exports
 * `api.update`/`api.remove` at module scope — e.g. `export const updateX =
 * api.update` — has this type in its own public signature. An unexported name
 * referenced from another module's declaration output is TS4023 ("cannot be
 * named"), so this must stay exported for every resource service to type-check.
 */
export interface MessageResponse {
	message?: string
}

/**
 * `list()` discards `meta` by contract (every existing caller wants `T[]`).
 * If the backend paginated the response and this is only page 1 of more,
 * that's a table quietly showing partial data — this warns loudly in that
 * case, naming the endpoint, so the fix (switch the caller to `listPage()`)
 * is obvious. Unconditional in every environment: a partially-shown table
 * is exactly as wrong in production as it is in development.
 */
function warnIfTruncated(baseEndpoint: string, raw: RawPaginatedResponse<unknown>): void {
	const lastPage = raw.meta?.last_page
	if (typeof lastPage === "number" && lastPage > 1) {
		console.warn(
			`[ADD OS] ${baseEndpoint} list() returned page ${raw.meta?.current_page ?? 1} of ${lastPage} and discarded the rest. ` +
				"Switch this caller to listPage() to see every row."
		)
	}
}

/**
 * One factory for the five verbs every admin resource in this codebase exposes
 * identically. `update()` returns the raw `{message}` body, never the entity —
 * every one of these 7 endpoints returns a message-only body on update, so a
 * caller that wants the new state must refetch (see useResourceMutations).
 *
 * `list()` keeps returning `T[]` — every existing caller depends on that. Use
 * `listPage()` for a caller that needs real pagination (`data` + `meta`); see
 * ./pagination.ts for what `meta` is and is not confirmed to contain.
 */
export function createResourceApi<T, CreatePayload = Partial<T>, UpdatePayload = Partial<T>>(baseEndpoint: string) {
	return {
		list: (query?: Record<string, unknown>) =>
			get<RawPaginatedResponse<T>>(baseEndpoint, query).then(r => {
				warnIfTruncated(baseEndpoint, r)
				return r.data
			}),
		listPage: (query?: Record<string, unknown>): Promise<Paginated<T>> =>
			get<RawPaginatedResponse<T>>(baseEndpoint, query).then(toPaginated),
		getById: (id: number) => get<{ data: T }>(`${baseEndpoint}/${id}`).then(r => r.data),
		create: (payload: CreatePayload) => post<{ data: T }>(baseEndpoint, payload).then(r => r.data),
		update: (id: number, payload: UpdatePayload) => put<MessageResponse>(`${baseEndpoint}/${id}`, payload),
		remove: (id: number) => del<MessageResponse>(`${baseEndpoint}/${id}`)
	}
}
