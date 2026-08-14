export interface Branch {
	id: number
	name: { ar: string; en: string }
	city: { ar: string; en: string }
	timezone: string
	is_active: boolean
}

/**
 * Create and update share this exact shape — confirmed identical in the Postman collection.
 *
 * Extends `Record<string, unknown>` explicitly: a plain interface has no
 * implicit index signature, so it isn't structurally assignable to
 * `ResourceFormDrawer`'s `TModel extends Record<string, unknown>` generic
 * constraint without this (declaration merging means TS won't infer one for
 * an interface the way it would for an object type literal/type alias).
 * `Branch` above is never passed as that generic, so it's left untouched.
 */
export interface BranchPayload extends Record<string, unknown> {
	name: { ar: string; en: string }
	city: { ar: string; en: string }
	timezone: string
	is_active: boolean
}
