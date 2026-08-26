import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = path.resolve(__dirname, "..", "..", "..")
const ADD_OS_DIR = path.join(ROOT, "src", "add-os")
/** Hand-written sources. Never `g`-flagged — `walk` calls `.test()` in a loop, and a global regex is stateful. */
const TEXT_EXT = /\.(?:ts|tsx|vue)$/i

/**
 * Emitted bundles.
 *
 * This constant exists because the two passes below scan sets that share no
 * extension, and `walk` used to hardcode `TEXT_EXT` for both: the dist pass
 * called `walk(dist)` and then filtered the result for `.js`/`.mjs`, which is an
 * intersection of two disjoint sets. `distFiles` was therefore ALWAYS `[]` and
 * the joined text always `""` — so the pass did not vacuously succeed, it
 * FAILED every single time a build existed, on `"".includes(marker)`. The
 * markers were in the build the whole time (`dist/assets/companies-*.js` carries
 * `/admin/companies`); nothing ever opened a `.js` file to look.
 *
 * A guard that cries wolf on every build is worse than no guard: the next person
 * to run `pnpm build && pnpm test:unit` learns to skip it. Hence `walk` now takes
 * the pattern as a parameter, and the pass asserts it actually read something
 * before asserting on the contents.
 */
const BUNDLE_EXT = /\.(?:js|mjs)$/i

/** Only these files may reference a Company Pipeline HTTP path — everything else must go through them. */
const ALLOWED_RELATIVE_FILES = new Set([
	"services/companies.ts",
	"services/private-office-requests.ts",
	"services/company-members.ts"
])

/**
 * Leading-slash path fragments, not bare words — this avoids matching i18n keys
 * like "companies.columns.legalName" or nav path segments like `path: "companies"`.
 * Narrowed further to include `/admin` because a bare `/companies` also matches
 * inside the perfectly normal import specifier `@/add-os/services/companies`
 * (the substring lives in "services/companies"), which isn't an HTTP call at all.
 * `/admin/companies` and `/admin/private-office-requests` are the actual API path
 * segments the three service files construct, and never appear in an import path.
 */
const PATH_MARKERS = ["/admin/companies", "/admin/private-office-requests"]

/** `pattern` is a parameter, not a module constant — the two callers scan disjoint extension sets. */
function walk(dir: string, pattern: RegExp, out: string[] = []): string[] {
	if (!existsSync(dir)) return out
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			if (entry.name === "node_modules") continue
			walk(full, pattern, out)
		} else if (pattern.test(entry.name)) {
			out.push(full)
		}
	}
	return out
}

function isAllowedSourceFile(file: string): boolean {
	const rel = path.relative(ADD_OS_DIR, file).replace(/\\/g, "/")
	if (ALLOWED_RELATIVE_FILES.has(rel)) return true
	// Each service's own spec exercises the literal path in test fixtures, by design.
	if (rel === "services/__tests__/companies.spec.ts") return true
	if (rel === "services/__tests__/private-office-requests.spec.ts") return true
	if (rel === "services/__tests__/company-members.spec.ts") return true
	if (rel === "__tests__/no-direct-company-http.spec.ts") return true
	return false
}

function findOffenders(files: string[]): string[] {
	return files
		.filter(f => !isAllowedSourceFile(f))
		.filter(f => {
			const text = readFileSync(f, "utf8")
			return PATH_MARKERS.some(marker => text.includes(marker))
		})
		.map(f => path.relative(ROOT, f).replace(/\\/g, "/"))
}

describe("company pipeline — no direct HTTP calls outside the service layer", () => {
	const sourceFiles = walk(ADD_OS_DIR, TEXT_EXT)

	it("scans a non-empty surface", () => {
		expect(sourceFiles.length).toBeGreaterThan(10)
	})

	it("references /admin/companies or /admin/private-office-requests only from the dedicated service files", () => {
		const offenders = findOffenders(sourceFiles)
		expect(
			offenders,
			offenders.length ? `\nDirect Company Pipeline HTTP reference(s) outside the service layer:\n  ${offenders.join("\n  ")}\n` : ""
		).toEqual([])
	})

	const dist = path.join(ROOT, "dist")
	const built = existsSync(dist)

	it("has a build to check", () => {
		if (!built) {
			console.warn(
				"\n  [no-direct-company-http] dist/ absent — emitted-artifact pass SKIPPED." +
					"\n  Run `npm run build` before `npm run test:unit` for full coverage.\n"
			)
		}
		expect(true).toBe(true)
	})

	// Once bundled, an offending call site can no longer be attributed to a
	// source file — minification and chunking erase that. This pass is
	// intentionally a weaker smoke check (the endpoints still exist in the
	// build at all, proving the service layer wasn't tree-shaken away), not a
	// location check like the source pass above.
	it.runIf(built)("ships the Company Pipeline endpoints in the build", () => {
		const distFiles = walk(dist, BUNDLE_EXT)

		/**
		 * Asserted BEFORE the contents are, and this line is the point of the fix:
		 * without it, "found nothing to read" and "read everything and the markers
		 * are gone" are the same red test — and the first masqueraded as the second
		 * for as long as this guard existed. Any future change that stops this pass
		 * from reaching the bundles now says so in as many words, instead of
		 * blaming the companies module.
		 */
		expect(distFiles.length, "dist/ yielded no .js or .mjs files — the scan below would read an empty string").toBeGreaterThan(0)

		const text = distFiles.map(f => readFileSync(f, "utf8")).join("\n")
		for (const marker of PATH_MARKERS) {
			expect(text.includes(marker), `${marker} missing from the build`).toBe(true)
		}
	})
})
