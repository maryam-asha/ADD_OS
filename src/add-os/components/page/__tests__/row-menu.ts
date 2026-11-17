import { flushPromises } from "@vue/test-utils"

/**
 * For specs: a row's destructive actions (and any beyond the first two) sit
 * under its "⋯" menu (RowActions, 2026-11-17), which Naive teleports to the
 * document body. The menu button reads "More actions", or its i18n key in a
 * spec that gives no message for it.
 */
const MENU = "button[aria-label='More actions'], button[aria-label='common.moreActions']"

/** Every row's "⋯" button under `root`. */
export function rowMenus(root: ParentNode = document): HTMLButtonElement[] {
	return Array.from(root.querySelectorAll<HTMLButtonElement>(MENU))
}

/** Opens the `index`th row menu and clicks the item labelled `label`; returns the item, or undefined. */
export async function pickFromRowMenu(label: string, index = 0, root: ParentNode = document): Promise<HTMLElement | undefined> {
	rowMenus(root)[index]?.click()
	await flushPromises()
	const item = Array.from(document.querySelectorAll<HTMLElement>(".n-dropdown-option-body")).find(el => el.textContent?.trim() === label)
	item?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
	await flushPromises()
	return item
}
