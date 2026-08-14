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
	branch_id: number
	name: { ar: string; en: string }
	floor_count: number
}
