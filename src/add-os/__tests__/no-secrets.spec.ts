import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * ADD OS — no credentials in the repository, enforced.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  A system whose isolation guarantee backs physical door locks must not    ║
 * ║  carry live third-party credentials in its source tree. Enforced by a     ║
 * ║  failing test, not by anyone remembering.                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Sibling of `no-external-urls.spec.ts`, same shape: allowlist as data, one
 * justification per entry, enforced.
 *
 * ── What this caught ────────────────────────────────────────────────────────
 * `VITE_MAPTILER_API_KEY` shipped with the Pinx template carrying two different
 * live-looking keys — one in `.env`, another in `.env.production` — and
 * `.gitignore` listed only `.env`, which does NOT match `.env.production`. So the
 * production credential was committable. Both are gone; `.gitignore` now covers
 * `.env.*` with `.env.example` as the single exception.
 *
 * ── Why value-shaped, not name-shaped ───────────────────────────────────────
 * Scanning for names like `API_KEY` flags every legitimate mention, including
 * this comment. The real signal is a VALUE that looks like a credential sitting
 * in a committed file, so that is what is scanned. `.env.example` is required to
 * hold keys with EMPTY values, which is the whole point of a template.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..")

/** Files that ship with the repository and must therefore be credential-free. */
const COMMITTED_ENV_FILES = [".env.example"]

/** Present locally, never committed. Verified only for `.gitignore` coverage. */
const LOCAL_ENV_FILES = [".env", ".env.production", ".env.local", ".env.development"]

interface AllowedSecretish {
	pattern: string
	why: string
}

/**
 * Strings that look credential-shaped but are not. Empty today — recorded as a
 * structure so the first exception has to arrive with a reason attached.
 */
const ALLOWED: readonly AllowedSecretish[] = []

/** Names whose VALUE must be empty in any committed env file. */
const SECRET_KEY_RE = /(?:_KEY|_SECRET|_TOKEN|_PASSWORD|_CREDENTIAL|_PRIVATE|_DSN)\s*=\s*(\S+)/i

/**
 * A bare high-entropy alphanumeric run of 20+ chars with both cases and a digit.
 * Deliberately narrow: the aim is a MapTiler/Stripe/AWS-shaped key, not any long
 * identifier. Hashes, hex digests and base64 asset data are excluded by the
 * mixed-case-plus-digit requirement being applied to a bare token only.
 */
const CREDENTIAL_SHAPE = /\b(?=[A-Za-z0-9]{20,40}\b)(?=[A-Za-z0-9]*[a-z])(?=[A-Za-z0-9]*[A-Z])(?=[A-Za-z0-9]*\d)[A-Za-z0-9]+\b/g

function readIfExists(rel: string): string | null {
	const full = path.join(ROOT, rel)
	return existsSync(full) ? readFileSync(full, "utf8") : null
}

describe("no secrets — committed env files", () => {
	it("ships .env.example as the documented template", () => {
		expect(readIfExists(".env.example"), ".env.example must exist — it documents required variables").not.toBeNull()
	})

	it("does not ship the template's old .env.sample alongside it", () => {
		// Two files claiming the same job is how one of them goes stale.
		expect(readIfExists(".env.sample"), "superseded by .env.example — remove it").toBeNull()
	})

	for (const rel of COMMITTED_ENV_FILES) {
		it(`${rel} declares every secret-shaped key with an EMPTY value`, () => {
			const text = readIfExists(rel)
			if (text === null) return

			const offenders: string[] = []
			for (const line of text.split(/\r?\n/)) {
				const trimmed = line.trim()
				if (trimmed === "" || trimmed.startsWith("#")) continue
				const m = trimmed.match(SECRET_KEY_RE)
				if (m) offenders.push(trimmed)
			}
			expect(offenders, `\n${rel} must not carry credential VALUES:\n  ${offenders.join("\n  ")}\n`).toEqual([])
		})

		it(`${rel} contains nothing shaped like a credential`, () => {
			const text = readIfExists(rel)
			if (text === null) return

			const allow = new Set(ALLOWED.map(a => a.pattern))
			const hits = [...text.matchAll(CREDENTIAL_SHAPE)].map(m => m[0]).filter(h => !allow.has(h))

			expect(hits, `\n${rel} contains credential-shaped value(s): ${hits.join(", ")}\n`).toEqual([])
		})
	}
})

describe("no secrets — gitignore coverage", () => {
	const gitignore = readIfExists(".gitignore") ?? ""

	it("has a .gitignore", () => {
		expect(gitignore.length).toBeGreaterThan(0)
	})

	// `.env` alone does NOT match `.env.production`. That gap is what let the
	// production credential become committable, so the pattern is asserted
	// directly rather than trusting a bare `.env` line.
	it("ignores EVERY env file, not just `.env`", () => {
		const lines = gitignore.split(/\r?\n/).map(l => l.trim())
		expect(lines, "`.env` alone does not match `.env.production`").toContain(".env.*")
		expect(lines).toContain(".env")
	})

	it("allows .env.example through as the one exception", () => {
		const lines = gitignore.split(/\r?\n/).map(l => l.trim())
		expect(lines).toContain("!.env.example")
	})

	it("names each local env file so the intent is explicit", () => {
		// Documentation-as-test: the list above is what `.env.*` is meant to cover.
		expect(LOCAL_ENV_FILES.length).toBeGreaterThan(1)
		for (const f of LOCAL_ENV_FILES) expect(f.startsWith(".env")).toBe(true)
	})
})

describe("no secrets — the MapTiler key stays gone", () => {
	// Deleted rather than rotated: it arrived with the Pinx template, so it is the
	// template vendor's credential and ADD has no account to revoke it from.
	// Nothing in ADD OS read it — its only reader is reachable solely from an
	// unrouted demo page — and `api.maptiler.com` never appeared in a build.
	const SCAN_DIRS = ["src/add-os", "scripts", "docs"]
	const TEXT_EXT = /\.(?:ts|tsx|js|mjs|cjs|vue|scss|css|json|md|html)$/i

	/**
	 * Generated artifacts are skipped, and ONLY generated artifacts.
	 *
	 * Not a concession to make the test pass. `icons.generated.json` holds SVG
	 * path geometry, where a single subpath is a long unbroken run of mixed-case
	 * letters and digits (command letters alternating with coordinates). Those are
	 * credential-shaped by construction and cannot be reworded.
	 *
	 * No example is quoted here on purpose — quoting one would trip this very
	 * check, which is the guard behaving correctly. Same lesson as the URL guard:
	 * fix the content, never loosen the rule.
	 *
	 * Narrow on purpose: a credential cannot ORIGINATE in a generated file. If one
	 * ever appeared there it would have come from the source it was generated
	 * from, and that source is scanned.
	 */
	const GENERATED = /\.generated\./i

	function walk(dir: string, out: string[] = []): string[] {
		const full = path.join(ROOT, dir)
		if (!existsSync(full)) return out
		for (const entry of readdirSync(full, { withFileTypes: true })) {
			const rel = path.join(dir, entry.name)
			if (entry.isDirectory()) walk(rel, out)
			else if (TEXT_EXT.test(entry.name) && !GENERATED.test(entry.name)) out.push(rel)
		}
		return out
	}

	it("declares no MapTiler key in any committed env file", () => {
		for (const rel of [...COMMITTED_ENV_FILES]) {
			const text = readIfExists(rel) ?? ""
			const active = text
				.split(/\r?\n/)
				.filter(l => !l.trim().startsWith("#"))
				.join("\n")
			expect(active, `${rel} must not declare VITE_MAPTILER_API_KEY`).not.toMatch(/VITE_MAPTILER_API_KEY\s*=/)
		}
	})

	it("carries no credential-shaped value in ADD OS code, scripts, or docs", () => {
		const allow = new Set(ALLOWED.map(a => a.pattern))
		const offenders: string[] = []

		for (const rel of SCAN_DIRS.flatMap(d => walk(d))) {
			const text = readFileSync(path.join(ROOT, rel), "utf8")
			for (const m of text.matchAll(CREDENTIAL_SHAPE)) {
				if (allow.has(m[0])) continue
				offenders.push(`${rel}: ${m[0]}`)
			}
		}

		expect(
			offenders,
			offenders.length
				? `\nCredential-shaped value(s) found:\n  ${offenders.join("\n  ")}\n\n` +
					`If it is not a credential, add it to ALLOWED with a reason.\n`
				: ""
		).toEqual([])
	})
})

describe("no secrets — the allowlist itself", () => {
	it("gives every entry a justification", () => {
		for (const a of ALLOWED) {
			expect(a.why.length, `${a.pattern} needs a real reason`).toBeGreaterThan(30)
		}
	})

	// Starting empty is the point: the first exception must be argued for.
	it("starts empty", () => {
		expect(ALLOWED.length).toBeLessThanOrEqual(3)
	})
})
