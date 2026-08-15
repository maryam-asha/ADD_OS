export interface Zone {
	id: number
	floor_id: number
	label: string
	sort_order: number
}

/**
 * Create and update share this exact shape.
 *
 * Extends `Record<string, unknown>` explicitly: a plain interface has no
 * implicit index signature, so it isn't structurally assignable to
 * `ResourceFormDrawer`'s `TModel extends Record<string, unknown>` generic
 * constraint without this (declaration merging means TS won't infer one for
 * an interface the way it would for an object type literal/type alias).
 * `Zone` above is never passed as that generic, so it's left untouched.
 *
 * This also has to hold for `ZoneFormModel` (zones.config.ts), which is
 * declared as `interface ZoneFormModel extends ZonePayload { ... }` — an
 * interface extending another interface that already satisfies
 * `Record<string, unknown>` automatically satisfies that same generic
 * constraint itself, with no explicit `extends Record<string, unknown>`
 * needed on `ZoneFormModel`. (This differs from Floor/Building's virtual-field
 * model, which is an intersection type — `FloorPayload & { branch_id: ... }`
 * — not interface inheritance; an intersection of a plain interface with an
 * extra object-literal field does not pick up an index signature on its own,
 * so that base interface needs the explicit `extends` clause for a different
 * reason. Confirmed empirically via an isolated `tsc --strict` scratch test.)
 */
export interface ZonePayload extends Record<string, unknown> {
	/**
	 * `number | null`, not `number`: `null` is the "nothing selected yet" sentinel
	 * for the form's `floor_id` select. async-validator's `isEmptyValue` only
	 * treats `undefined`, `null`, an empty array (`type: 'array'`), or an empty
	 * string (`typeof value === 'string'`) as empty — a numeric `0` matches none
	 * of those branches, so a `required: true` rule would never fire against it.
	 * `null` is caught unconditionally by `isEmptyValue`'s very first check,
	 * regardless of the rule's `type`. By the time `ResourceFormDrawer`'s
	 * validation passes and `onSubmit` fires, this is guaranteed to hold a real
	 * floor id, so the widening only affects transient form-editing state, never
	 * what's actually sent to the API.
	 */
	floor_id: number | null
	label: string
	sort_order: number
}
