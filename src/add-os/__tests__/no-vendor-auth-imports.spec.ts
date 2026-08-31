import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * ADD OS — the auth screens are ours, and stay ours.
 *
 * `/login`, `/forgot-password` and `/reset-password` were served by the Pinx
 * `views/Auth/Login.vue` and `components/auth/*`. They now resolve to
 * `add-os/modules/auth/`, and the vendor files are left on disk, unrouted and
 * unimported, exactly as the removed Pinx demo views are.
 *
 * ── Why a guard rather than deleting them ───────────────────────────────────
 * Deleting is not available: those files are Category C, which `CLAUDE.md` says
 * to override and never edit. Leaving them is correct — but "unimported" is a
 * property that decays silently. Re-linking `views/Auth/Login.vue` would bring
 * back, in one line:
 *
 *   · the floating pill that repainted the login panel from the chart ramp at
 *     runtime, which `no-runtime-theming.spec.ts` cannot see because it writes a
 *     local ref rather than calling a store action;
 *   · form strings hardcoded in English, bypassing both message catalogues;
 *   · a "Remember me" checkbox with no `remember` field behind it anywhere in the
 *     pinned API collection.
 *
 * So the guard is on the IMPORT, which is the thing that would actually undo the
 * work.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..")

/** The vendor auth surfaces. Nothing OUTSIDE these may import from them. */
const VENDOR_AUTH_DIRS = ["src/views/Auth", "src/components/auth"]

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
 * Matches an import/`import(...)` whose specifier points into either vendor auth
 * directory, via the `@/` alias or a relative path ending in the same segments.
 */
const VENDOR_AUTH_IMPORT =
	/(?:from\s*|import\s*\(\s*)["'][^"']*(?:@\/views\/Auth\/|@\/components\/auth\/|\.\.?\/(?:[\w.-]+\/)*(?:views\/Auth|components\/auth)\/)/

/** A file that lives inside the vendor auth dirs may import its own siblings. */
const isInsideVendorAuth = (rel: string) => VENDOR_AUTH_DIRS.some(dir => rel.startsWith(`${dir}/`))

describe("the auth screens do not fall back to vendor code", () => {
	const sources = walk("src").filter(rel => rel !== "src/add-os/__tests__/no-vendor-auth-imports.spec.ts")

	it("scans a meaningful surface", () => {
		expect(sources.length).toBeGreaterThan(100)
	})

	it("no file outside the vendor auth folders imports from them", () => {
		const offenders = sources.filter(rel => !isInsideVendorAuth(rel) && VENDOR_AUTH_IMPORT.test(read(rel)))

		expect(
			offenders,
			`these import the vendor auth screens again — route to add-os/modules/auth instead:\n  ${offenders.join("\n  ")}`
		).toEqual([])
	})

	it("the router points every auth route at add-os", () => {
		const routerCode = read("src/router/index.ts")

		for (const routeName of ["Login", "ForgotPassword", "ResetPassword"]) {
			expect(routerCode, `${routeName} should be defined`).toContain(`name: "${routeName}"`)
		}
		expect(routerCode, "the router must not import a vendor auth view").not.toMatch(VENDOR_AUTH_IMPORT)
		expect(routerCode).toContain("@/add-os/modules/auth/views/LoginPage.vue")
		expect(routerCode).toContain("@/add-os/modules/auth/views/ForgotPasswordPage.vue")
		expect(routerCode).toContain("@/add-os/modules/auth/views/ResetPasswordPage.vue")
	})

	/**
	 * `checkAuth` sends a caller the store believes is signed in to "/" — measured
	 * from `authCheck()` directly. On the two password routes that made the pages
	 * unreachable rather than protected, and on `/reset-password` it stranded a
	 * valid emailed token, since the store's `logged` can be stale: `initSession()`
	 * returns early while `VITE_API_URL` is empty, so nothing clears it.
	 *
	 * Fortify answers an authenticated caller with 409 and the page shows it. The
	 * server decides; a persisted boolean does not.
	 */
	it("leaves the password routes reachable with a session in the store", () => {
		const routerCode = read("src/router/index.ts")

		for (const routePath of ["/forgot-password", "/reset-password"]) {
			const start = routerCode.indexOf(`path: "${routePath}"`)
			expect(start, `${routePath} should be in the route table`).toBeGreaterThan(-1)

			const next = routerCode.indexOf(`path: "/`, start + 1)
			const block = routerCode.slice(start, next === -1 ? undefined : next)

			expect(
				block.replace(/\/\/.*$/gm, ""),
				`${routePath} must not carry checkAuth — it redirects to "/" whenever the store says signed in`
			).not.toContain("checkAuth")
		}

		// `/login` keeps it: there, bouncing a signed-in caller is the point.
		const loginStart = routerCode.indexOf(`path: "/login"`)
		const loginBlock = routerCode.slice(loginStart, routerCode.indexOf(`path: "/`, loginStart + 1))
		expect(loginBlock).toContain("checkAuth: true")
	})

	// Negative control: the pattern must actually fire, or the sweep above would
	// pass for the wrong reason.
	it("the detector matches a real vendor auth import", () => {
		expect(VENDOR_AUTH_IMPORT.test(`import Login from "@/views/Auth/Login.vue"`)).toBe(true)
		expect(VENDOR_AUTH_IMPORT.test(`const c = () => import("@/components/auth/AuthForm.vue")`)).toBe(true)
		expect(VENDOR_AUTH_IMPORT.test(`import AuthShell from "@/add-os/modules/auth/components/AuthShell.vue"`)).toBe(
			false
		)
	})
})
