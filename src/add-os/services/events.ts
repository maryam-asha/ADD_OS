import type { Paginated, RawPaginatedResponse } from "./pagination"
import type { MessageResponse } from "./resource-factory"
import type {
	Event,
	EventAttendee,
	EventPayload,
	EventRegistrationField,
	EventRegistrationFieldPayload,
	EventRegistrationStatus
} from "@/add-os/modules/events/types/event"
import { del, get, patch, post } from "./api"
import { toPaginated } from "./pagination"
import { createResourceApi } from "./resource-factory"

const BASE = "/api/v1/admin/events"

const api = createResourceApi<Event, EventPayload, EventPayload>(BASE)

export const listEvents = api.list
export const getEvent = api.getById
export const createEvent = api.create
export const updateEvent = api.update
export const removeEvent = api.remove

// ── Registration form definition ────────────────────────────────────────────

/** Every field, active or not — this is the editor, not the member's form. */
export async function listRegistrationFields(eventId: number): Promise<EventRegistrationField[]> {
	const raw = await get<{ data: EventRegistrationField[] }>(`${BASE}/${eventId}/registration-fields`)
	return raw.data
}

export async function createRegistrationField(
	eventId: number,
	payload: EventRegistrationFieldPayload
): Promise<EventRegistrationField> {
	const raw = await post<{ data: EventRegistrationField }>(`${BASE}/${eventId}/registration-fields`, payload)
	return raw.data
}

export function updateRegistrationField(
	eventId: number,
	fieldId: number,
	payload: Partial<EventRegistrationFieldPayload>
): Promise<MessageResponse> {
	return patch<MessageResponse>(`${BASE}/${eventId}/registration-fields/${fieldId}`, payload)
}

export function removeRegistrationField(eventId: number, fieldId: number): Promise<MessageResponse> {
	return del<MessageResponse>(`${BASE}/${eventId}/registration-fields/${fieldId}`)
}

// ── Attendees and approval ──────────────────────────────────────────────────

/**
 * Paginated, unlike the event list: registrations grow without bound, so the
 * `meta` is real and discarding it would show page 1 of N as the whole roster.
 */
export async function listAttendees(
	eventId: number,
	query?: { status?: EventRegistrationStatus, page?: number, per_page?: number }
): Promise<Paginated<EventAttendee>> {
	const raw = await get<RawPaginatedResponse<EventAttendee>>(`${BASE}/${eventId}/attendees`, query)
	return toPaginated(raw)
}

/** The queue of registrations still waiting on a decision, oldest first. */
export async function listPendingAttendees(
	eventId: number,
	query?: { page?: number, per_page?: number }
): Promise<Paginated<EventAttendee>> {
	const raw = await get<RawPaginatedResponse<EventAttendee>>(`${BASE}/${eventId}/attendees/pending`, query)
	return toPaginated(raw)
}

/**
 * Admits the registration, taking payment at this moment for a paid event.
 * Fails with 422 if the member's balance has dropped since they applied, and
 * with 409 if the event filled up or someone already decided it.
 */
export function approveAttendee(eventId: number, attendeeId: number): Promise<MessageResponse> {
	return post<MessageResponse>(`${BASE}/${eventId}/attendees/${attendeeId}/approve`, {})
}

/** Nothing was charged, so nothing is refunded; the seat frees immediately. */
export function rejectAttendee(
	eventId: number,
	attendeeId: number,
	rejectionReason: string
): Promise<MessageResponse> {
	return post<MessageResponse>(`${BASE}/${eventId}/attendees/${attendeeId}/reject`, {
		rejection_reason: rejectionReason
	})
}

/** Turns down every registration still awaiting a decision, under one reason. */
export function rejectPendingAttendees(eventId: number, rejectionReason: string): Promise<MessageResponse> {
	return post<MessageResponse>(`${BASE}/${eventId}/attendees/reject-pending`, {
		rejection_reason: rejectionReason
	})
}
