import { del, get, post, put } from "./api"

interface MessageResponse {
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
