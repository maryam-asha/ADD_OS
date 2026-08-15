export interface Floor {
	id: number
	building_id: number
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
 * `Floor` above is never passed as that generic, so it's left untouched.
 *
 * This also has to hold for the intersection type the form actually uses —
 * `FloorPayload & { branch_id: number | null }` (floors.config.ts's virtual
 * branch field) — which only satisfies `Record<string, unknown>` itself if
 * `FloorPayload` already does; an intersection of a plain interface with an
 * extra object-literal field does not pick up an index signature on its own.
 */
export interface FloorPayload extends Record<string, unknown> {
	/**
	 * `number | null`, not `number`: `null` is the "nothing selected yet" sentinel
	 * for the form's `building_id` select. async-validator's `isEmptyValue` only
	 * treats `undefined`, `null`, an empty array (`type: 'array'`), or an empty
	 * string (`typeof value === 'string'`) as empty — a numeric `0` matches none
	 * of those branches, so a `required: true` rule would never fire against it.
	 * `null` is caught unconditionally by `isEmptyValue`'s very first check,
	 * regardless of the rule's `type`. By the time `ResourceFormDrawer`'s
	 * validation passes and `onSubmit` fires, this is guaranteed to hold a real
	 * building id, so the widening only affects transient form-editing state,
	 * never what's actually sent to the API.
	 */
	building_id: number | null
	label: string
	sort_order: number
}
