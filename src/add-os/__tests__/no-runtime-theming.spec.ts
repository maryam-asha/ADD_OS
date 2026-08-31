import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * ADD OS — the token palette is not writable at runtime.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  A runtime override makes every asserted contrast ratio VACUOUS:          ║
 * ║  green in CI, false in the product. A test that cannot fail for the case  ║
 * ║  it exists to catch is worse than no test — it manufactures confidence.   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * `tokens.spec.ts` asserts ~90 ratios against `add-os/theme/tokens.ts`: primary
 * 4.72, danger 4.52, success 4.61, borderStrong 4.20/3.12, both focus-ring bands,
 * the deferred label and icon. All of it is only true if the values reaching the
 * screen ARE those values.
 *
 * The Pinx template shipped `themeStore.setColor()` plus a colour picker, so a
 * user could replace the brand primary at will. Deleting the picker was not
 * enough — the capability would have survived the control and returned with the
 * first settings screen anyone built. So this file guards the CAPABILITY.
 *
 * Two families are covered:
 *   · palette writes  — `setColor()` and any direct mutation of `colors[…]`
 *   · themeName writes — `setTheme` / `setThemeLight` / `setThemeDark` /
 *     `toggleTheme`, all four of which handed naive-ui's `darkTheme` to our
 *     light-only overrides
 *
 * Restore both families deliberately, together with a full dark palette and a
 * curated set of brand-legal options — never as a free colour picker.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..")

/** Actions that must not exist. Each is a write path into themed state. */
const FORBIDDEN_ACTIONS = [
	{ name: "setColor", why: "the only write path into the token palette — makes every asserted ratio vacuous" },
	{ name: "setTheme", why: "sets themeName directly; dark has no palette in v1" },
	{ name: "setThemeDark", why: "reaches naive-ui darkTheme with light-only overrides" },
	{ name: "setThemeLight", why: "half of the toggle pair; unnecessary once Light is pinned" },
	{ name: "toggleTheme", why: "was reachable from three surfaces, one with no visual presence" }
] as const

/** Deleted files whose return would reintroduce a removed capability. */
const DELETED_FILES = [
	{ file: "src/app-layouts/common/Toolbar/ThemeSwitch.vue", why: "toolbar dark-mode toggle" },
	{ file: "src/composables/useThemeSwitch.ts", why: "toggle wrapper used by the command palette" },
	{
		file: "src/components/common/LayoutSettings.vue",
		why: "the floating layout-settings panel, removed whole on 2026-08-30 — it was the last surface that wrote themed state, and its language switch is served by the toolbar's LocaleSwitch"
	}
] as const

const TEXT_EXT = /\.(?:ts|tsx|vue)$/i
const GENERATED = /\.generated\./i

function walk(dir: string, out: string[] = []): string[] {
	const full = path.join(ROOT, dir)
	if (!existsSync(full)) return out
	for (const entry of readdirSync(full, { withFileTypes: true })) {
		const rel = path.join(dir, entry.name).replace(/\\/g, "/")
		if (entry.isDirectory()) {
			if (entry.name === "node_modules") continue
			walk(rel, out)
		} else if (TEXT_EXT.test(entry.name) && !GENERATED.test(entry.name)) {
			out.push(rel)
		}
	}
	return out
}

const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8")

/**
 * Strips line and block comments so the scan sees CODE only.
 *
 * Necessary here, unlike in the URL and secret guards: the store documents each
 * removal by quoting the deleted action, and that documentation is the reason a
 * future reader understands why it must not come back. Rewriting the prose to
 * avoid the names — the fix used for those other guards — would delete the
 * explanation to satisfy the check.
 *
 * Deliberately naive (no string-literal awareness). Nothing in this codebase puts
 * a `//` inside a string on a line that also names one of these actions, and a
 * false POSITIVE here would only ever be a spurious failure, never a miss.
 */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
}

describe("no runtime theming — the store exposes no write path", () => {
	const storeCode = stripComments(read("src/stores/theme.ts"))

	for (const { name, why } of FORBIDDEN_ACTIONS) {
		it(`theme store defines no \`${name}\``, () => {
			// An action definition, e.g. `setColor(theme, name, color): void {`
			const definition = new RegExp(`^\\s*${name}\\s*\\(`, "m")
			expect(definition.test(storeCode), `${name} is back — ${why}`).toBe(false)
		})
	}

	it("still exposes the read-only getters code legitimately depends on", () => {
		// The point is to remove WRITES, not the ability to ask which mode is active.
		for (const getter of ["isThemeDark", "isThemeLight", "naiveTheme"]) {
			expect(storeCode, `${getter} should remain`).toContain(getter)
		}
	})

	it("does not persist themeName, layout, or routerTransition", () => {
		const pick = storeCode.match(/pick:\s*\[([^\]]*)\]/)
		expect(pick, "persist.pick not found").not.toBeNull()
		const persisted = pick![1]
		// "boxed" joined this list on 2026-08-30: the LayoutSettings panel was its
		// only writer, so once the panel went, a persisted value could stick with
		// no UI left to correct it.
		for (const key of ["themeName", "layout", "routerTransition", "boxed"]) {
			expect(persisted, `${key} must not persist — nothing can set it, so a stale value would stick`).not.toContain(key)
		}
		// The ones something CAN still change must keep persisting.
		for (const key of ["rtl", "sidebar.collapsed"]) {
			expect(persisted, `${key} should still persist`).toContain(key)
		}
	})
})

/**
 * The guard specs are excluded from the code scans, and only they.
 *
 * A guard has to name the thing it forbids in order to forbid it, so scanning a
 * guard's own pattern definitions with those patterns is circular — the palette
 * assignment regex below matches its own source text. Excluding these three files
 * is not a loophole: they contain no application code, and a genuine reappearance
 * of a removed action is still caught by the store-definition checks above and by
 * the call-site scan over everything else.
 *
 * Listed explicitly rather than skipping all of `__tests__`, so a future test that
 * really does call a removed action is still checked.
 */
const GUARD_SPECS = new Set([
	"src/add-os/__tests__/no-runtime-theming.spec.ts",
	"src/add-os/__tests__/no-external-urls.spec.ts",
	"src/add-os/__tests__/no-secrets.spec.ts"
])

describe("no runtime theming — nothing calls a removed action", () => {
	const sources = walk("src").filter(rel => !GUARD_SPECS.has(rel))

	it("scans a meaningful surface", () => {
		expect(sources.length).toBeGreaterThan(100)
	})

	it("excludes only the guard specs themselves", () => {
		const all = walk("src")
		expect(all.length - sources.length).toBe(GUARD_SPECS.size)
	})

	for (const { name, why } of FORBIDDEN_ACTIONS) {
		it(`no call site for \`${name}\``, () => {
			const call = new RegExp(`\\.${name}\\s*\\(`)
			const offenders = sources.filter(rel => call.test(stripComments(read(rel))))
			expect(offenders, `${name} is being called again — ${why}\n  ${offenders.join("\n  ")}`).toEqual([])
		})
	}

	// Direct mutation would bypass the missing action entirely.
	//
	// Written as a single linear pass — `.colors` then an index or member access,
	// then anything up to an `=` on the SAME line — rather than with adjacent
	// optional `\s*` groups, which backtrack polynomially on hostile input.
	// Reads such as `state.colors[state.themeName].primary` carry no `=` and so
	// do not match.
	it("nothing assigns into the colour palette directly", () => {
		const assign = /\.colors[[.][^\n=]*=(?!=)/
		const offenders = sources.filter(rel => assign.test(stripComments(read(rel))))
		expect(offenders, `direct palette assignment bypasses the removed setColor:\n  ${offenders.join("\n  ")}`).toEqual([])
	})
})

describe("no runtime theming — removed controls stay removed", () => {
	for (const { file, why } of DELETED_FILES) {
		it(`${path.basename(file)} does not exist`, () => {
			expect(existsSync(path.join(ROOT, file)), `${file} is back — ${why}`).toBe(false)
		})
	}

	it("no component imports a deleted control", () => {
		const stems = DELETED_FILES.map(d => path.basename(d.file).replace(/\.(?:vue|ts)$/, ""))
		const offenders: string[] = []
		for (const rel of walk("src")) {
			const code = stripComments(read(rel))
			for (const stem of stems) {
				if (new RegExp(`import[^\\n]*\\b${stem}\\b`).test(code)) offenders.push(`${rel} → ${stem}`)
			}
		}
		expect(offenders, `dangling import of a deleted control:\n  ${offenders.join("\n  ")}`).toEqual([])
	})

	/**
	 * The colour picker was the control; these were its ingredients.
	 *
	 * This used to read `LayoutSettings.vue` alone. That panel was removed whole on
	 * 2026-08-30, so pointing the check at one deleted file would have left a guard
	 * that silently guards nothing. It now sweeps the surfaces that can actually
	 * REACH a user.
	 *
	 * `src/views/` is excluded on purpose, and the exclusion is the interesting
	 * part: the unrouted Pinx demo views still on disk include
	 * `views/Components/ColorPicker.vue`, whose whole subject IS an
	 * `n-color-picker`. They are unreachable by design — the router is built from
	 * `add-os/navigation/sections.ts` and nothing imports them, so they drop out of
	 * the bundle (see .claude/rules/vendor-boundary.md, "Unrouted demo surfaces").
	 * Flagging them would make this guard cry wolf until someone deleted it.
	 *
	 * What that costs: a picker added to a demo view AND then routed would pass
	 * here. Linking a demo view into `sections.ts` is already forbidden, and the
	 * dist-scanning guards would see it once it shipped.
	 */
	const SHELL_ROOTS = ["src/add-os", "src/app-layouts", "src/components", "src/composables", "src/stores"]

	it("no colour picker remains on any surface that can reach a user", () => {
		const offenders: string[] = []
		for (const root of SHELL_ROOTS) {
			for (const rel of walk(root).filter(r => !GUARD_SPECS.has(r))) {
				const code = stripComments(read(rel))
				if (/n-color-picker|NColorPicker/i.test(code)) {
					offenders.push(`${rel} → colour picker`)
				}
				if (/#00B27B|#00E19B/i.test(code)) {
					offenders.push(`${rel} → demo swatch palette`)
				}
			}
		}
		expect(offenders, `the removed colour picker is back:\n  ${offenders.join("\n  ")}`).toEqual([])
	})

	it("scans a meaningful surface, so the sweep above cannot pass vacuously", () => {
		const scanned = SHELL_ROOTS.flatMap(root => walk(root))
		expect(scanned.length).toBeGreaterThan(100)
	})
})
