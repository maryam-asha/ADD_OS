export interface Building {
	id: number
	branch_id: number
	name: { ar: string; en: string }
	floor_count: number
}

/**
 * Create and update share this exact shape.
 *
 * Extends `Record<string, unknown>` explicitly: a plain interface has no
 * implicit index signature, so it isn't structurally assignable to
 * `ResourceFormDrawer`'s `TModel extends Record<string, unknown>` generic
 * constraint without this (declaration merging means TS won't infer one for
 * an interface the way it would for an object type literal/type alias).
 * `Building` above is never passed as that generic, so it's left untouched.
 */
export interface BuildingPayload extends Record<string, unknown> {
	/**
	 * `number | null`, not `number`: `null` is the "nothing selected yet" sentinel
	 * for the form's `branch_id` select. async-validator's `isEmptyValue` only
	 * treats `undefined`, `null`, an empty array (`type: 'array'`), or an empty
	 * string (`typeof value === 'string'`) as empty — a numeric `0` matches none
	 * of those branches, so a `required: true` rule would never fire against it.
	 * `null` is caught unconditionally by `isEmptyValue`'s very first check,
	 * regardless of the rule's `type`. By the time `ResourceFormDrawer`'s
	 * validation passes and `onSubmit` fires, this is guaranteed to hold a real
	 * branch id, so the widening only affects transient form-editing state, never
	 * what's actually sent to the API.
	 */
	branch_id: number | null
	name: { ar: string; en: string }
	floor_count: number
}
