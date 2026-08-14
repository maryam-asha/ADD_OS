import { del, get, post, put } from "./api"

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
 * One factory for the five verbs every admin resource in this codebase exposes
 * identically. `update()` returns the raw `{message}` body, never the entity —
 * every one of these 7 endpoints returns a message-only body on update, so a
 * caller that wants the new state must refetch (see useResourceMutations).
 */
export function createResourceApi<T, CreatePayload = Partial<T>, UpdatePayload = Partial<T>>(baseEndpoint: string) {
	return {
		list: (query?: Record<string, unknown>) => get<{ data: T[] }>(baseEndpoint, query).then(r => r.data),
		getById: (id: number) => get<{ data: T }>(`${baseEndpoint}/${id}`).then(r => r.data),
		create: (payload: CreatePayload) => post<{ data: T }>(baseEndpoint, payload).then(r => r.data),
		update: (id: number, payload: UpdatePayload) => put<MessageResponse>(`${baseEndpoint}/${id}`, payload),
		remove: (id: number) => del<MessageResponse>(`${baseEndpoint}/${id}`)
	}
}
