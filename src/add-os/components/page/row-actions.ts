/**
 * One thing a user can do to a table row. Every table on the dashboard hands
 * its row actions to RowActions as a list of these, never as hand-built
 * buttons, so each row looks and behaves the same everywhere (decided
 * 2026-11-17, docs/UI-PATTERNS.md §Row actions).
 */
export interface RowAction {
	/** Stable id, unique within the row. */
	key: string
	/** Already translated. Shown as the tooltip and the accessible name, or the menu text. */
	label: string
	/** A Carbon (or other bundled) icon name. */
	icon: string
	onClick: () => unknown
	/** Destructive: always in the "⋯" menu, last, in the danger colour, and confirmed first. */
	danger?: boolean
	disabled?: boolean
	/**
	 * In a labelled row (a queue's decisions), the one action the desk takes
	 * most — filled in the primary colour. Ignored in an icon row.
	 */
	primary?: boolean
	/** Already translated: why it is disabled, or anything the label leaves out. Shown as a tooltip. */
	hint?: string
	/** In flight: the button spins and cannot be pressed again. */
	loading?: boolean
	/** Rendered as `data-test` on the button or menu item, for specs. */
	testId?: string
	/**
	 * Already translated. When set, the action runs only after a centred
	 * confirm dialog. Every `danger` action should carry one.
	 */
	confirm?: string
}

/** How many ordinary actions show as icon buttons before the rest fold into "⋯". */
export const INLINE_ACTION_LIMIT = 2

/**
 * Splits a row's actions the one way every table does: the first ordinary
 * actions inline, everything else (and every destructive action, last) in
 * the overflow menu.
 */
export function splitRowActions(actions: RowAction[]): { inline: RowAction[]; menu: RowAction[] } {
	const ordinary = actions.filter(action => !action.danger)
	const destructive = actions.filter(action => action.danger)
	return {
		inline: ordinary.slice(0, INLINE_ACTION_LIMIT),
		menu: [...ordinary.slice(INLINE_ACTION_LIMIT), ...destructive]
	}
}
