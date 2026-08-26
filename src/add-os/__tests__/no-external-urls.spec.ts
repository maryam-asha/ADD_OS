import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * ADD OS — network isolation, enforced.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ADD OS runs on a VPN-isolated, offline-capable network, and that        ║
 * ║  isolation backs physical door locks. It must not depend on a human      ║
 * ║  remembering. Any off-allowlist `http(s)://` reference fails the build.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * This generalises what the icon guard already proved
 * (`add-os/assets/__tests__/icons.spec.ts`): a forgotten remote reference should
 * break a test, not silently ship and then either fail on a closed network or —
 * worse, if a port is open — leak usage patterns out of a closed system.
 *
 * ── Two passes ──────────────────────────────────────────────────────────────
 * 1. EMITTED ARTIFACTS (`dist/`) — the authoritative check, because unrouted
 *    demo pages never reach it. Skipped when `dist/` is absent, so a plain
 *    `vitest run` still works; CI must `npm run build` first for full coverage.
 * 2. ADD OS SOURCE — always runs, over the surface we own plus the entry points.
 *    Catches a new remote reference at commit time rather than at build time.
 *
 * ── Adding to the allowlist ─────────────────────────────────────────────────
 * Every entry needs a one-line justification, and the test enforces that. If the
 * reason is "it's fine", it is not fine — an entry with no reason is how a real
 * remote dependency gets waved through.
 *
 * ── ALLOWED vs. SCOPED ──────────────────────────────────────────────────────
 * `ALLOWED` permits a host EVERYWHERE both passes look. `SCOPED` permits one
 * host inside one named set of files and nowhere else — same host in any other
 * file is still a failure, and it may narrow further on the matched URL's path,
 * not just its hostname.
 *
 * Prefer `SCOPED`. A host that is only ever legitimate in test fixtures, or only
 * inside a bundled third-party chunk, does not need blanket permission across
 * the codebase, and granting it there is how a real call site later hides in
 * plain sight. Both lists are self-pruning: an entry that stops matching
 * anything fails its own test rather than lingering as dead permission.
 *
 * ── Naming a forbidden host in prose ────────────────────────────────────────
 * The scan is anchored on the SCHEME (`https://`), because a fetchable reference
 * needs one and a sentence does not. So a comment explaining why some host must
 * never be contacted should write the bare hostname — `api.iconify.design`, not
 * the full URL. That keeps the guard absolute: no comment-stripping heuristics,
 * and no allowlist entry that would also permit a real use.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..")

interface AllowedHost {
	host: string
	/** Why this cannot cause a network request. Required. */
	why: string
	/** Set when the entry is temporary, naming what removes it. */
	removedBy?: string
}

/**
 * Hosts permitted to appear as strings. NONE of these is fetched at runtime.
 *
 * Measured against a clean build on 2026-08-03 — this is the complete set, not a
 * guess. `maps.googleapis.com` was on this list and is now gone: the Google Maps
 * plugin was removed from `main.ts` and uninstalled.
 */
const ALLOWED: readonly AllowedHost[] = [
	{
		host: "www.w3.org",
		why: "XML/SVG namespace URIs (xmlns=…). Identifiers, never dereferenced — the browser does not fetch them."
	},
	{
		host: "vuejs.org",
		why: "Vue's dev-build warning strings link to docs. Text in a console message; no request."
	},
	{
		host: "v3-migration.vuejs.org",
		why: "Same as vuejs.org — Vue compat warning text."
	},
	{
		host: "www.naiveui.com",
		why: "naive-ui dev warnings link to its docs. Text in a console message; no request."
	},
	{
		host: "pinx.vercel.app",
		why: "Pinx template <meta> tags in index.html (canonical, og:image, twitter:image). Inert markup — no fetch — but wrong branding.",
		removedBy: "Phase 4 (brand assets: title, meta, favicon)"
	}
	// `api.org` was here — the Pinx placeholder VITE_API_URL. Removed from the
	// allowlist because it is no longer in the build: the variable was emptied and
	// `add-os/config/env.ts` now refuses to invent a host. See docs/SECRETS-RESOLUTION.md.
	//
	// `maps.googleapis.com` was here too, until the Google Maps plugin was removed.
	//
	// `api.test` was here, blanket-permitted across everything both passes scan.
	// Moved to SCOPED on 2026-08-26 (owner decision) — see the note on its entry
	// there for what the blanket grant was costing.
]

const ALLOWED_HOSTS = new Set(ALLOWED.map(a => a.host))

/**
 * One host, permitted inside one named set of files and nowhere else.
 *
 * This is the narrow instrument. `ALLOWED` is the blunt one, and every entry
 * here is an entry that used to need — or would otherwise have needed — blanket
 * permission across the whole scanned surface.
 */
interface ScopedExemption {
	host: string
	/** Which pass this belongs to. Drives the self-pruning check, since a dist scope cannot fire without a build. */
	pass: "source" | "dist"
	/** Short name for the scope, shown in failure messages. */
	scope: string
	/** Why this cannot cause a network request. Required, same bar as ALLOWED. */
	why: string
	/** The ONLY files this applies to, by repo-relative POSIX path. Anywhere else is still a failure. */
	appliesTo: (relativePath: string) => boolean
	/** Optional further narrowing on the matched URL itself, not merely its hostname. */
	urlPattern?: RegExp
}

const SCOPED: readonly ScopedExemption[] = [
	{
		host: "api.test",
		pass: "source",
		scope: "add-os spec files",
		/**
		 * Vitest mock host, in specs where `fetch` itself is stubbed — the API base
		 * URL in service-layer specs, and mock resource URLs (announcement
		 * image/link fields) in view specs. No network request is possible in
		 * either case, and it cannot reach a build: test files are not in the Vite
		 * graph.
		 *
		 * That last fact is why it is here rather than in ALLOWED. As an ALLOWED
		 * entry it permanently failed the dist self-pruning check ("carries no
		 * allowlist entry that is no longer needed"), because a host that can never
		 * be in `dist/` can never satisfy a check that reads `dist/`. It also
		 * granted far more than it needed: blanket permission for `api.test` in
		 * every file under `src/add-os`, production modules included. Scoped to
		 * spec files, a stray `api.test` in shipped code now fails.
		 */
		why: "Vitest mock host in specs where fetch is stubbed; test files are not in the Vite graph, so it can never reach a build.",
		appliesTo: rel => /^src\/add-os\/(?:.*\/)?__tests__\/[^/]+\.spec\.ts$/.test(rel)
	},
	{
		host: "github.com",
		pass: "dist",
		scope: "bundled third-party dist chunks",
		/**
		 * A genuine false positive, and the narrowest fix for it.
		 *
		 * date-fns throws a RangeError whose message links to its own docs —
		 * `…/date-fns/blob/master/docs/unicodeTokens.md` — and naive-ui's date and
		 * number pickers pull date-fns in, so the literal rides into
		 * `dist/assets/InputNumber-*.js`. It is a substring of a thrown error
		 * message: nothing dereferences it, and no code path turns it into a
		 * request.
		 *
		 * Deliberately NOT an ALLOWED entry, which would permit any github.com URL
		 * anywhere. Two independent narrowings instead:
		 *   1. `appliesTo` — emitted bundle chunks only. `github.com` written in
		 *      our own source under `src/` is still a failure, which is the whole
		 *      point: this exempts a dependency's string, not a habit of ours.
		 *   2. `urlPattern` — the date-fns repository only. A different github.com
		 *      URL appearing in a chunk still fails, so the exemption cannot widen
		 *      quietly when some future dependency starts embedding its own links.
		 *
		 * Matched on the repo path rather than the exact file so a date-fns patch
		 * release that moves the anchor does not break the build for no reason.
		 */
		why: "date-fns RangeError message text linking to its own docs, bundled via naive-ui's pickers. A string in a thrown message — nothing dereferences it.",
		appliesTo: rel => /^dist\/assets\/[^/]+\.js$/.test(rel),
		urlPattern: /^https:\/\/github\.com\/date-fns\/date-fns\//
	}
]

const exemptionId = (e: ScopedExemption) => `${e.host} (${e.scope})`

/** Text formats worth scanning. Binaries are skipped — grep false-positives otherwise. */
const TEXT_EXT = /\.(?:js|mjs|cjs|ts|tsx|vue|css|scss|html|json|map|svg|txt|webmanifest)$/i

/** Scheme-anchored on purpose — see the prose note in the header. */
const URL_RE = /https?:\/\/([\w.-]+)/g

/**
 * The same match extended past the hostname, so a `urlPattern` can narrow on the
 * PATH — `github.com/date-fns/…` permitted while `github.com/anything-else` is
 * not. `URL_RE` deliberately stops at the host (it is the hostname the guard
 * fundamentally cares about); this reads the tail separately rather than
 * widening `URL_RE` and changing what every existing finding reports.
 *
 * Stops at whitespace and at the delimiters a URL is embedded behind in JS, CSS
 * and markup — quotes, backticks, brackets, and the comma that ends a minified
 * string literal.
 */
const URL_TAIL_RE = /^https?:\/\/[^\s"'`<>()[\]{},\\]+/

function urlAt(text: string, index: number): string {
	return URL_TAIL_RE.exec(text.slice(index, index + 500))?.[0] ?? ""
}

/** Trailing dots are sentence punctuation, not part of the host. */
const cleanHost = (h: string) => h.replace(/\.+$/, "")

/**
 * The one place a scoped exemption is honoured. Returns the entry that applies,
 * or `undefined` — and `undefined` means the reference is a finding.
 *
 * Every condition is an AND: right host, right file, and — when the entry asks
 * for it — right URL. Exported through the tests below as the seam the negative
 * controls drive directly, so "this still fails outside its scope" is asserted
 * rather than assumed.
 */
function exemptionFor(host: string, relativePath: string, url: string): ScopedExemption | undefined {
	return SCOPED.find(e => e.host === host && e.appliesTo(relativePath) && (!e.urlPattern || e.urlPattern.test(url)))
}

function walk(dir: string, out: string[] = []): string[] {
	if (!existsSync(dir)) return out
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			if (entry.name === "node_modules") continue
			walk(full, out)
		} else if (TEXT_EXT.test(entry.name)) {
			out.push(full)
		}
	}
	return out
}

interface Finding {
	file: string
	host: string
	context: string
}

/**
 * `firedExemptions` collects the id of every SCOPED entry that actually
 * suppressed something, so the self-pruning checks can tell a live exemption
 * from dead permission nobody noticed had expired.
 */
function scan(files: string[], firedExemptions?: Set<string>): Finding[] {
	const findings: Finding[] = []
	for (const file of files) {
		let text: string
		try {
			text = readFileSync(file, "utf8")
		} catch {
			continue
		}
		const rel = path.relative(ROOT, file).replace(/\\/g, "/")
		for (const m of text.matchAll(URL_RE)) {
			const host = cleanHost(m[1])
			if (ALLOWED_HOSTS.has(host)) continue

			const exemption = exemptionFor(host, rel, urlAt(text, m.index ?? 0))
			if (exemption) {
				firedExemptions?.add(exemptionId(exemption))
				continue
			}

			findings.push({
				file: rel,
				host,
				context: text.slice(Math.max(0, (m.index ?? 0) - 60), (m.index ?? 0) + 80).replace(/\s+/g, " ")
			})
		}
	}
	return findings
}

function fmt(fs: Finding[]) {
  return [...new Set(fs.map(f => f.host))]
		.map(h => {
			const first = fs.find(f => f.host === h)!
			return `  ${h}\n    in ${first.file}\n    …${first.context}…`
		})
		.join("\n")
}

describe("network isolation — the allowlist itself", () => {
	it("gives every entry a justification", () => {
		for (const a of ALLOWED) {
			expect(a.why.length, `${a.host} needs a real reason, not a placeholder`).toBeGreaterThan(30)
		}
	})

	it("has no duplicate hosts", () => {
		expect(ALLOWED_HOSTS.size).toBe(ALLOWED.length)
	})

	// An allowlist that only ever grows stops being a control. Temporary entries
	// name the task that removes them so they surface in review.
	it("names the task that removes each temporary entry", () => {
		const temporary = ALLOWED.filter(a => a.removedBy)
		for (const a of temporary) {
			expect(a.removedBy!.length, `${a.host}.removedBy`).toBeGreaterThan(10)
		}
		// Pinned so a shrinking allowlist is visible progress. Two entries have
		// already gone: `maps.googleapis.com` with the Google Maps plugin, and
		// `api.org` with the placeholder API base.
		expect(temporary.map(a => a.host).sort()).toEqual(["pinx.vercel.app"])
	})
})

/**
 * Negative controls for the two SCOPED entries.
 *
 * An exemption is only as good as the boundary around it, and a boundary nobody
 * tests is a boundary that quietly widens. These assert the OUTSIDE of each
 * scope — the cases that must still fail — rather than re-asserting the inside,
 * which the two passes already cover by going green.
 */
describe("network isolation — scoped exemptions do not leak", () => {
	/**
	 * Every fixture URL below is assembled from these rather than written whole,
	 * and that is not stylistic: the source pass scans this very file, and a
	 * contiguous scheme-plus-host literal here would be a real finding — as it
	 * should be, since `github.com` is deliberately NOT exempt in source. Writing
	 * the scheme separately keeps the guard absolute, exactly as the header's
	 * "Naming a forbidden host in prose" note prescribes: no comment-stripping
	 * heuristics, and no exemption carved out for the guard's own test data.
	 *
	 * It is also the strongest available demonstration that the boundary holds —
	 * these fixtures were caught by the source pass on the first run.
	 */
	const HTTPS = `https:${"//"}`
	const HTTP = `http:${"//"}`

	const DATE_FNS_URL = `${HTTPS}github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`
	const API_TEST_URL = `${HTTP}api.test/v1`

	it("no longer grants api.test or github.com blanket permission", () => {
		expect(ALLOWED_HOSTS.has("api.test")).toBe(false)
		expect(ALLOWED_HOSTS.has("github.com")).toBe(false)
	})

	describe("github.com", () => {
		it("is exempt inside a bundled dist chunk", () => {
			expect(exemptionFor("github.com", "dist/assets/InputNumber-CW_z6JqE.js", DATE_FNS_URL)).toBeDefined()
		})

		// The point of the whole exercise: this exempts a dependency's string, not a habit of ours.
		it("is NOT exempt in our own source, wherever it sits under src/", () => {
			expect(exemptionFor("github.com", "src/add-os/services/api.ts", DATE_FNS_URL)).toBeUndefined()
			expect(exemptionFor("github.com", "src/add-os/modules/payments/views/CurrenciesPage.vue", DATE_FNS_URL)).toBeUndefined()
			expect(exemptionFor("github.com", "src/add-os/__tests__/no-external-urls.spec.ts", DATE_FNS_URL)).toBeUndefined()
			expect(exemptionFor("github.com", "src/main.ts", DATE_FNS_URL)).toBeUndefined()
			expect(exemptionFor("github.com", "index.html", DATE_FNS_URL)).toBeUndefined()
		})

		it("is NOT exempt elsewhere in dist — only the emitted asset chunks", () => {
			expect(exemptionFor("github.com", "dist/index.html", DATE_FNS_URL)).toBeUndefined()
			expect(exemptionFor("github.com", "dist/assets/index-abc123.css", DATE_FNS_URL)).toBeUndefined()
			expect(exemptionFor("github.com", "dist/assets/nested/chunk.js", DATE_FNS_URL)).toBeUndefined()
		})

		// So the exemption cannot widen on its own the day some other dependency
		// starts embedding its own links in an error message.
		it("is NOT exempt for any other github.com URL, even in the right file", () => {
			const chunk = "dist/assets/InputNumber-CW_z6JqE.js"
			expect(exemptionFor("github.com", chunk, `${HTTPS}github.com/tusen-ai/naive-ui/issues/2462`)).toBeUndefined()
			expect(exemptionFor("github.com", chunk, `${HTTPS}github.com/broofa/mime`)).toBeUndefined()
			expect(exemptionFor("github.com", chunk, `${HTTPS}github.com/date-fns-attacker/date-fns/x`)).toBeUndefined()
			expect(exemptionFor("github.com", chunk, "")).toBeUndefined()
		})
	})

	describe("api.test", () => {
		it("is exempt in a spec file, at any depth", () => {
			expect(exemptionFor("api.test", "src/add-os/services/__tests__/currencies.spec.ts", API_TEST_URL)).toBeDefined()
			expect(exemptionFor("api.test", "src/add-os/modules/payments/views/__tests__/CurrenciesPage.spec.ts", API_TEST_URL)).toBeDefined()
		})

		// Strictly tighter than the blanket ALLOWED entry this replaced, which
		// permitted api.test in shipped modules too.
		it("is NOT exempt in production source", () => {
			expect(exemptionFor("api.test", "src/add-os/services/currencies.ts", API_TEST_URL)).toBeUndefined()
			expect(exemptionFor("api.test", "src/add-os/config/env.ts", API_TEST_URL)).toBeUndefined()
			expect(exemptionFor("api.test", "src/main.ts", API_TEST_URL)).toBeUndefined()
		})

		it("is NOT exempt in a non-spec file that merely sits in a __tests__ folder", () => {
			expect(exemptionFor("api.test", "src/add-os/services/__tests__/fixtures.ts", API_TEST_URL)).toBeUndefined()
		})

		it("is NOT exempt in an emitted bundle — it must never reach one", () => {
			expect(exemptionFor("api.test", "dist/assets/index-abc123.js", API_TEST_URL)).toBeUndefined()
		})
	})

	/**
	 * End-to-end rather than predicate-only: proves the scan really does report a
	 * finding, not merely that `exemptionFor` declined. Written to a real file so
	 * the path `scan()` derives is a genuine repo-relative one, then removed.
	 */
	it("reports a real finding for an exempted host used outside its scope", () => {
		const dir = mkdtempSync(path.join(ROOT, "src", "add-os", "__tests__", ".negative-control-"))
		const file = path.join(dir, "leaked.ts")
		try {
			writeFileSync(file, `const docs = "${DATE_FNS_URL}"\nconst api = "${API_TEST_URL}"\n`, "utf8")

			const findings = scan([file])

			expect(findings.map(f => f.host).sort()).toEqual(["api.test", "github.com"])
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})
})

describe("network isolation — ADD OS source", () => {
	// The surface we own, plus the entry points that always ship. Deliberately not
	// all of `src/`: the unrouted Pinx showcase pages carry ~40 demo hosts, and
	// allowlisting those would drown the signal. They never reach `dist`, and the
	// dist pass below is what covers anything that does.
	const targets = [
		...walk(path.join(ROOT, "src", "add-os")),
		path.join(ROOT, "src", "main.ts"),
		path.join(ROOT, "src", "App.vue"),
		path.join(ROOT, "src", "tailwind.css"),
		path.join(ROOT, "index.html")
	].filter(f => existsSync(f))

	const fired = new Set<string>()
	const findings = scan(targets, fired)

	it("scans a non-empty surface", () => {
		expect(targets.length).toBeGreaterThan(10)
	})

	it("references no off-allowlist host", () => {
		expect(findings, findings.length ? `\nOff-allowlist hosts in ADD OS source:\n${fmt(findings)}\n` : "").toEqual([])
	})

	// Self-pruning, same principle the dist allowlist check applies to ALLOWED:
	// an exemption that suppresses nothing is dead permission, and dead
	// permission is how a real reference later slips through unremarked.
	it("uses every source-scoped exemption it grants", () => {
		const unused = SCOPED.filter(e => e.pass === "source" && !fired.has(exemptionId(e))).map(exemptionId)
		expect(unused, unused.length ? `\nSource-scoped exemptions that matched nothing — remove them:\n  ${unused.join("\n  ")}\n` : "").toEqual([])
	})
})

describe("network isolation — emitted artifacts", () => {
	const dist = path.join(ROOT, "dist")
	const built = existsSync(dist)
	const files = built ? walk(dist) : []

	it("has a build to check", () => {
		if (!built) {
			console.warn(
				"\n  [no-external-urls] dist/ absent — emitted-artifact pass SKIPPED." +
					"\n  Run `npm run build` before `npm run test:unit` for full coverage.\n"
			)
		}
		expect(true).toBe(true)
	})

	const fired = new Set<string>()
	const findings = scan(files, fired)

	it.runIf(built)("references no off-allowlist host in any emitted file", () => {
		expect(
			findings,
			findings.length
				? `\n${findings.length} off-allowlist reference(s) in dist/:\n${fmt(findings)}\n\n` +
					`If it can cause a request, remove it. If it cannot, prefer a SCOPED entry over ALLOWED —\n` +
					`scope it to the files it legitimately appears in, and narrow on the URL path where you can.\n`
				: ""
		).toEqual([])
	})

	it.runIf(built)("uses every dist-scoped exemption it grants", () => {
		const unused = SCOPED.filter(e => e.pass === "dist" && !fired.has(exemptionId(e))).map(exemptionId)
		expect(
			unused,
			unused.length ? `\nDist-scoped exemptions that matched nothing in this build — remove them:\n  ${unused.join("\n  ")}\n` : ""
		).toEqual([])
	})

	// Self-pruning: an entry for a host that no longer appears is dead permission,
	// and dead permission is how a real dependency later slips in unnoticed. This
	// is what caught `api.org` becoming stale the moment the placeholder was emptied.
	it.runIf(built)("carries no allowlist entry that is no longer needed", () => {
		const corpus = files.map(f => readFileSync(f, "utf8")).join("\n")
		const stale = ALLOWED.filter(a => !corpus.includes(`//${a.host}`)).map(a => a.host)
		expect(
			stale,
			stale.length ? `\nAllowlist entries no longer present in the build — remove them:\n  ${stale.join("\n  ")}\n` : ""
		).toEqual([])
	})

	it.runIf(built)("scanned js, css and html", () => {
		const exts = new Set(files.map(f => path.extname(f).toLowerCase()))
		expect(exts).toContain(".js")
		expect(exts).toContain(".css")
		expect(exts).toContain(".html")
	})

	// The specific regression this task closed. Pinned by name so re-adding the
	// plugin fails here with an obvious message rather than in a code review.
	it.runIf(built)("ships no Google Maps loader", () => {
		const hits = files.filter(f => readFileSync(f, "utf8").includes("maps.googleapis.com"))
		expect(hits.map(f => path.relative(ROOT, f)), "@fawmi/vue-google-maps is back — it injects a remote script tag").toEqual(
			[]
		)
	})
})
