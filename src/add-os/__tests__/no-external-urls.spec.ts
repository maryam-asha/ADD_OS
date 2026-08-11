import { existsSync, readdirSync, readFileSync } from "node:fs"
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
]

const ALLOWED_HOSTS = new Set(ALLOWED.map(a => a.host))

/** Text formats worth scanning. Binaries are skipped — grep false-positives otherwise. */
const TEXT_EXT = /\.(?:js|mjs|cjs|ts|tsx|vue|css|scss|html|json|map|svg|txt|webmanifest)$/i

/** Scheme-anchored on purpose — see the prose note in the header. */
const URL_RE = /https?:\/\/([\w.-]+)/g

/** Trailing dots are sentence punctuation, not part of the host. */
const cleanHost = (h: string) => h.replace(/\.+$/, "")

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

function scan(files: string[]): Finding[] {
	const findings: Finding[] = []
	for (const file of files) {
		let text: string
		try {
			text = readFileSync(file, "utf8")
		} catch {
			continue
		}
		for (const m of text.matchAll(URL_RE)) {
			const host = cleanHost(m[1])
			if (ALLOWED_HOSTS.has(host)) continue
			findings.push({
				file: path.relative(ROOT, file).replace(/\\/g, "/"),
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

	it("scans a non-empty surface", () => {
		expect(targets.length).toBeGreaterThan(10)
	})

	it("references no off-allowlist host", () => {
		const findings = scan(targets)
		expect(findings, findings.length ? `\nOff-allowlist hosts in ADD OS source:\n${fmt(findings)}\n` : "").toEqual([])
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

	it.runIf(built)("references no off-allowlist host in any emitted file", () => {
		const findings = scan(files)
		expect(
			findings,
			findings.length
				? `\n${findings.length} off-allowlist reference(s) in dist/:\n${fmt(findings)}\n\n` +
					`If it cannot cause a request, add it to ALLOWED with a reason. If it can, remove it.\n`
				: ""
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
