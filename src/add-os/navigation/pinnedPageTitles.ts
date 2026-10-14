/**
 * ADD OS — the toolbar's recent and pinned pages, named in the reader's language.
 *
 * The template's `Toolbar/PinnedPagesV2.vue` (vendor, Category C — never
 * edited) stores each visited route's `meta.title` and prints it as is. ADD OS
 * titles are i18n KEYS (see navigation/routes.ts — the breadcrumb and the
 * ComingSoon page translate them), so the strip read "nav.pages.spacesReport".
 *
 * The override: `vite.config.ts` runs this rewrite on that one file as it is
 * loaded, before the Vue compiler sees it — the same build-time hook that
 * strips Iconify's remote hosts. The stored title stays the key; the strip
 * translates it as it renders, so it follows a language switch and fixes
 * pages remembered before this existed. A title that is not a key (a route
 * with no `meta.title`) is shown as before.
 *
 * Every anchor is required: should a template update move one, the build
 * fails here, naming it, rather than shipping raw keys again.
 */

/** The vendor file this rewrites. */
export const PINNED_PAGES_FILE = /src[\\/]app-layouts[\\/]common[\\/]Toolbar[\\/]PinnedPagesV2\.vue$/

const I18N_SETUP = "const { t } = useI18n()"

export function rewritePinnedPageTitles(code: string): string {
	if (!code.includes(I18N_SETUP)) {
		throw new Error(`add-os:pinned-page-titles — "${I18N_SETUP}" not found in PinnedPagesV2.vue; the template changed, revisit src/add-os/navigation/pinnedPageTitles.ts`)
	}

	const printed = /\{\{\s*page\.title\s*\}\}/g
	const titled = /:title="page\.title"/g
	if (!printed.test(code)) {
		throw new Error("add-os:pinned-page-titles — no `{{ page.title }}` left in PinnedPagesV2.vue; the template changed, revisit src/add-os/navigation/pinnedPageTitles.ts")
	}

	return code
		.replace(I18N_SETUP, "const { t, te } = useI18n()\nconst pageTitle = (title: string) => (te(title) ? t(title) : title)")
		.replace(printed, "{{ pageTitle(page.title) }}")
		.replace(titled, ":title=\"pageTitle(page.title)\"")
}
