import type { OperationalStatus } from "./operational-status"

/**
 * Mirrors the backend's `App\Domain\Foundation\Enums\ResourceCategory` — a
 * string-backed PHP enum deliberately kept open-ended, so this list grows in
 * lockstep with it rather than validating against a fixed set the server
 * itself doesn't enforce.
 */
export type ResourceCategory =
	| "projector"
	| "mic"
	| "screen"
	| "whiteboard"
	| "other"

export const RESOURCE_CATEGORIES: readonly ResourceCategory[] = [
	"projector",
	"mic",
	"screen",
	"whiteboard",
	"other"
]

export interface SpaceResource {
	id: number
	/** `null` for general/shared inventory not tied to any single space. */
	space_id: number | null
	name: string
	category: ResourceCategory
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
	 * `number | null`: `null` is both the form's "nothing selected yet" state
	 * AND a valid submitted value — the field is optional (see
	 * `buildResourceFields` in resources.config.ts), so a resource left
	 * unassigned to any space is real general/shared inventory, not a
	 * validation failure waiting to happen.
	 */
	space_id: number | null
	name: string
	category: ResourceCategory
	quantity: number
}

export interface SpaceResourceStatusPayload {
	status: OperationalStatus
	status_reason?: string
}
