export interface SeatDesk {
	id: number
	space_id: number
	label: string
	qr_point_id: number | null
}

/**
 * Extends `Record<string, unknown>` explicitly: a plain interface has no
 * implicit index signature, so it isn't structurally assignable to
 * `ResourceFormDrawer`'s `TModel extends Record<string, unknown>` generic
 * constraint without this (declaration merging means TS won't infer one for
 * an interface the way it would for an object type literal/type alias).
 * `SeatDesk` above is never passed as that generic, so it's left untouched.
 *
 * This also has to hold for `SeatDeskFormModel` (seats-desks.config.ts),
 * which is declared as `interface SeatDeskFormModel extends SeatDeskPayload {
 * ... }` — an interface extending another interface that already satisfies
 * `Record<string, unknown>` automatically satisfies that same generic
 * constraint itself, with no explicit `extends Record<string, unknown>`
 * clause of its own needed (same reasoning as every prior resource's
 * payload/form-model pair).
 */
export interface SeatDeskPayload extends Record<string, unknown> {
	/**
	 * `number | null`, not `number`: `null` is the "nothing selected yet"
	 * sentinel for the form's `space_id` select. async-validator's
	 * `isEmptyValue` only treats `undefined`, `null`, an empty array (`type:
	 * 'array'`), or an empty string (`typeof value === 'string'`) as empty — a
	 * numeric `0` matches none of those branches, so a `required: true` rule
	 * would never fire against it. `null` is caught unconditionally by
	 * `isEmptyValue`'s very first check, regardless of the rule's `type`. By
	 * the time `ResourceFormDrawer`'s validation passes and `onSubmit` fires,
	 * this is guaranteed to hold a real space id, so the widening only affects
	 * transient form-editing state, never what's actually sent to the API.
	 * `SeatDesk.space_id` above stays `number` — it is never passed as
	 * `ResourceFormDrawer`'s model generic.
	 */
	space_id: number | null
	label: string
	qr_point_id: number | null
}
