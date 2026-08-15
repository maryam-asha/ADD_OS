import type { OperationalStatus } from "./operational-status"

export interface SpaceResource {
	id: number
	space_id: number
	name: string
	category: string
	quantity: number
	status: OperationalStatus
	status_reason: string | null
}

/**
 * create/update — status fields are excluded entirely; they move only through
 * SpaceResourceStatusPayload.
 *
 * Extends `Record<string, unknown>` explicitly: a plain interface has no
 * implicit index signature, so it isn't structurally assignable to
 * `ResourceFormDrawer`'s `TModel extends Record<string, unknown>` generic
 * constraint without this (declaration merging means TS won't infer one for
 * an interface the way it would for an object type literal/type alias).
 * `SpaceResource` above is never passed as that generic, so it's left untouched.
 *
 * This also has to hold for `ResourceFormModel` (resources.config.ts), which is
 * declared as `interface ResourceFormModel extends SpaceResourcePayload { ... }`
 * — an interface extending another interface that already satisfies
 * `Record<string, unknown>` automatically satisfies that same generic
 * constraint itself, with no explicit `extends Record<string, unknown>` clause
 * of its own needed (same reasoning as Zone/Space's payload/form-model pairs).
 */
export interface SpaceResourcePayload extends Record<string, unknown> {
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
	 * `SpaceResource.space_id` above stays `number` — it is never passed as
	 * `ResourceFormDrawer`'s model generic.
	 */
	space_id: number | null
	name: string
	category: string
	quantity: number
}

export interface SpaceResourceStatusPayload {
	status: OperationalStatus
	status_reason?: string
}
