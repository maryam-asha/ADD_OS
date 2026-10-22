import _uniq from "lodash/uniq"
import { NAV_GROUPS, navGroupMenuKey } from "./sections"

/** The sidebar keys of every group entry, e.g. "hrGroup". */
const GROUP_KEYS = new Set(Object.values(NAV_GROUPS).map(navGroupMenuKey))

/**
 * ADD OS — the sidebar's open entries after naive-ui reports a change.
 *
 * `accordion` on the menu keeps one top-level entry open, but only at the top
 * level. Inside a group entry (HR's six modules, since 2026-10-22) it would
 * leave every module the user opened still open, stacking forty-odd rows; so
 * inside a group, opening a module closes the one before it. naive-ui appends
 * the key it just opened, so the last key is the one to keep.
 *
 * `undefined` hands the menu back its own state — the case outside any group.
 */
export function expandedKeysAfter(value: string[]): string[] | undefined {
	const group = value.find(key => GROUP_KEYS.has(key))
	const lastKey = value.at(-1)
	return group && lastKey ? _uniq([group, lastKey]) : undefined
}
