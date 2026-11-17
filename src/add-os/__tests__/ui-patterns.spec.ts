import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * One page, one table, one dialog (docs/UI-PATTERNS.md, decided 2026-11-17).
 *
 * Every module under src/add-os/modules is held to it. A file that cannot be,
 * by what it is, is named in EXEMPT with the reason; a file still waiting on a
 * decision is named in PENDING with the one rule it may break and who decides.
 * A PENDING entry that no longer breaks its rule fails the suite, so the list
 * cannot go stale.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..")
const MODULES = path.join(ROOT, "src", "add-os", "modules")

const EXEMPT: Record<string, string> = {
	"auth/views/LoginPage.vue": "sign-in screen: AuthShell, no dashboard chrome",
	"auth/views/ForgotPasswordPage.vue": "sign-in screen: AuthShell, no dashboard chrome",
	"auth/views/ResetPasswordPage.vue": "sign-in screen: AuthShell, no dashboard chrome",
	"errors/views/NotFoundPage.vue": "full-page error illustration",
	"errors/views/ServerErrorPage.vue": "full-page error illustration",
	"hr/views/core/MyCertificatePage.vue": "a printable document, not a page",
	"hr/views/payroll/PayslipPage.vue": "a printable document, not a page",
	"hr/components/core/EmployeeViewModal.vue": "a printable view of the employee file",
	"hr/views/core/EmployeeProfilePage.vue": "a record profile: its hero (EmployeeHero) is its header",
	"members/views/MemberProfilePage.vue": "a record profile: its hero is its header",
	"members/views/CompanyProfilePage.vue": "a record profile: its hero is its header",
	"hr/views/core/MyHrPage.vue": "the My HR frame; its pages carry the headers",
	"events/views/EventCreatePage.vue": "renders EventFormPage, which carries the header",
	"providers/views/ProviderRequestsPage.vue": "its review dialog is the self-framed ProviderRequestDetail (own header, status, decision footer) at the lg width"
}

const PENDING: Record<string, { rule: "n-modal"; why: string }> = {
}

const COLOUR_EXEMPT: Record<string, string> = {
	"events/config/event-categories.config.ts": "the default colour of a new category is data saved with it, not a style"
}

function files(dir: string, out: string[] = []): string[] {
	if (!existsSync(dir)) return out
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			if (entry.name !== "__tests__") files(full, out)
		} else if (/\.(?:vue|ts)$/.test(entry.name)) {
			out.push(full)
		}
	}
	return out
}

const rel = (file: string) => path.relative(MODULES, file).replace(/\\/g, "/")
const template = (text: string) => text.match(/<template>[\s\S]*<\/template>/)?.[0] ?? ""
const withoutComments = (text: string) => text.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1")

const modules = readdirSync(MODULES).filter(name => statSync(path.join(MODULES, name)).isDirectory())
const all = modules.flatMap(name => files(path.join(MODULES, name))).filter(file => !(rel(file) in EXEMPT))
const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")
const isView = (file: string) => rel(file).includes("/views/") && file.endsWith(".vue")
const views = all.filter(file => isView(file) && !/<RouterView|<router-view/.test(template(read(file))))
const vues = all.filter(file => file.endsWith(".vue"))

function offenders(list: string[], test: (text: string) => boolean, rule?: string): string[] {
	return list.filter(file => test(read(file)) && !(rule && PENDING[rel(file)]?.rule === rule)).map(rel)
}

describe("ui patterns: every module", () => {
	it("finds the pages it checks (negative control)", () => {
		expect(modules.length).toBeGreaterThan(20)
		expect(views.length).toBeGreaterThan(100)
	})

	it("titles every page with PageHeader, never a hand-built h1", () => {
		expect(offenders(views, text => /<h1[\s>]/.test(template(text)))).toEqual([])
		expect(offenders(views, text => !/<(?:Hr)?PageHeader[\s>]|<HrFormPage[\s>]/.test(template(text)))).toEqual([])
	})

	it("gives every page a description", () => {
		expect(offenders(views, text => /<(?:Hr)?PageHeader(?![^>]*description=)[^>]*>/.test(template(text)))).toEqual([])
	})

	it("keeps the primary action out of a row of its own (it belongs in PageHeader)", () => {
		expect(offenders(views, text => /\n\t\t<div class="flex justify-end[^"]*">\s*<n-button[^>]*type="primary"/.test(template(text)))).toEqual([])
	})

	it("hands row actions over as data, not hand-built extraActions buttons", () => {
		expect(offenders(vues, text => /:extra-actions=/.test(text))).toEqual([])
	})

	/**
	 * Every table's actions cell is RowActions (decided 2026-11-17): a record's
	 * actions as icons with the rest under "⋯", a queue's decisions labelled.
	 * A file with an actions column and no RowActions built its own buttons.
	 */
	it("lays out every table's actions cell with RowActions", () => {
		expect(offenders(all, text => /key: "actions"/.test(text) && !/RowActions/.test(text))).toEqual([])
	})

	it("confirms through a centred dialog, never n-popconfirm", () => {
		expect(offenders(vues, text => /<n-popconfirm|NPopconfirm/.test(text))).toEqual([])
	})

	it("frames dialogs with FormModal, not a bare n-modal", () => {
		expect(offenders(vues, text => /<n-modal[\s>]/.test(template(text)), "n-modal")).toEqual([])
	})

	it("opens records in DetailDrawer, never a bare n-drawer", () => {
		expect(offenders(vues, text => /<n-drawer[\s>]/.test(template(text)))).toEqual([])
	})

	/**
	 * CLAUDE.md invariant 2 (no hard-coded design values in src/add-os) had
	 * drifted: on 2026-11-17, 88 module files carried hex colours, Tailwind
	 * palette classes (stone, slate, neutral, emerald…) or dark: variants —
	 * among them Antique Copper as a text accent, which tokens-and-color.md
	 * bans. All three bypass tokens.ts; dark mode is out of scope.
	 */
	it("colours only through tokens: no hex, no Tailwind palette, no dark: variants", () => {
		const palette = /#[0-9A-Fa-f]{6}\b|\b(?:text|bg|border)-(?:red|green|emerald|amber|blue|sky|indigo|rose|stone|slate|gray|zinc|neutral|orange|yellow|teal|cyan|purple|violet|pink|lime)-\d{2,3}\b|\bdark:/
		expect(all.filter(file => !(rel(file) in COLOUR_EXEMPT) && palette.test(withoutComments(read(file)))).map(rel)).toEqual([])
	})

	it("lists only exemptions and pending entries that still exist and still apply", () => {
		for (const file of [...Object.keys(EXEMPT), ...Object.keys(PENDING), ...Object.keys(COLOUR_EXEMPT)]) {
			expect(existsSync(path.join(MODULES, file)), file).toBe(true)
		}
		for (const file of Object.keys(PENDING)) {
			expect(/<n-modal[\s>]/.test(template(read(path.join(MODULES, file)))), `${file} no longer needs its PENDING entry`).toBe(true)
		}
	})
})

describe("ui patterns: one shared kit", () => {
	const page = (name: string) => path.join(ROOT, "src", "add-os", "components", "page", name)

	it("keeps the shared pieces in components/page", () => {
		for (const name of ["PageHeader.vue", "FilterToolbar.vue", "Panel.vue", "FormModal.vue", "DetailDrawer.vue", "RowActions.vue", "row-actions.ts", "useConfirm.ts"]) {
			expect(existsSync(page(name)), name).toBe(true)
		}
	})

	it("renders HR's kit through the shared pieces, so there is one implementation", () => {
		const wrappers: Record<string, string> = {
			"hr/components/ui/HrPageHeader.vue": "PageHeader",
			"hr/components/ui/HrToolbar.vue": "FilterToolbar",
			"hr/components/ui/HrPanel.vue": "Panel",
			"hr/components/HrFormModal.vue": "FormModal",
			"hr/components/HrDrawer.vue": "DetailDrawer"
		}
		for (const [file, shared] of Object.entries(wrappers)) {
			const text = read(path.join(MODULES, file))
			expect(text, file).toContain(`@/add-os/components/page/${shared}.vue`)
			expect(template(text), file).not.toMatch(/<n-(?:modal|drawer|card)[\s>]|<header[\s>]|<section[\s>]/)
		}
	})

	it("routes ResourceTable's row through RowActions", () => {
		const text = readFileSync(path.join(ROOT, "src", "add-os", "components", "resource", "ResourceTable.vue"), "utf8")
		expect(text).toContain("h(RowActions")
		expect(text).not.toMatch(/extraActions\??:/)
	})
})
