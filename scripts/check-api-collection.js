/**
 * ADD OS — API contract freshness check. `pnpm api:collection:check`
 *
 * "Confirmed from the collection" is meaningless if the file that claim was made
 * against has since changed. The canonical Postman collection lives outside this
 * repo, in the backend project, and is kept current there — so this repo pins a
 * dated, byte-identical snapshot at docs/api/ADD-OS.postman_collection.json and
 * every "per the collection" claim in code or docs cites that snapshot by date,
 * never the live file directly.
 *
 * This script is the only thing that compares the two. It hashes both files and
 * reports match/mismatch — no diff library, no new dependency, just `node:crypto`.
 * A mismatch means the snapshot is stale: every claim sourced from it is
 * unverified until someone re-reads the canonical file and re-pins.
 *
 * Assumes ADDCore is checked out as a sibling of this repo (the layout on this
 * machine). If that assumption doesn't hold elsewhere, this reports "canonical
 * source unreadable" rather than silently comparing against nothing.
 */

import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SNAPSHOT_PATH = path.join(ROOT, "docs", "api", "ADD-OS.postman_collection.json")
const CANONICAL_PATH = path.resolve(ROOT, "..", "ADDCore", "postman", "ADD-OS.postman_collection.json")

function sha256(buf) {
	return createHash("sha256").update(buf).digest("hex")
}

console.log(`Canonical source: ${CANONICAL_PATH}`)
console.log(`Committed snapshot: ${SNAPSHOT_PATH}`)
console.log()

if (!existsSync(CANONICAL_PATH)) {
	console.log("[api:collection:check] Canonical source is unreadable from this machine.")
	console.log("  Cannot verify the snapshot is current. Not falling back to any other copy.")
	console.log("  Expected ADDCore checked out as a sibling of this repo — see CLAUDE.md.")
	process.exit(2)
}

if (!existsSync(SNAPSHOT_PATH)) {
	console.log("[api:collection:check] No committed snapshot found at docs/api/.")
	console.log("  Nothing to compare against. Pin one first.")
	process.exit(2)
}

const canonical = readFileSync(CANONICAL_PATH)
const snapshot = readFileSync(SNAPSHOT_PATH)
const canonicalHash = sha256(canonical)
const snapshotHash = sha256(snapshot)

if (canonicalHash === snapshotHash) {
	console.log(`[api:collection:check] MATCH — sha256 ${canonicalHash}`)
	console.log("  The pinned snapshot is still current. Claims citing it by date remain verified.")
	process.exit(0)
}

console.log("[api:collection:check] MISMATCH")
console.log(`  canonical sha256: ${canonicalHash}`)
console.log(`  snapshot  sha256: ${snapshotHash}`)
console.log()
console.log("  The canonical collection has changed since this snapshot was pinned.")
console.log("  Every 'per the collection' / 'confirmed from the collection' claim that cites")
console.log("  the pinned date is now UNVERIFIED until someone re-reads the canonical file,")
console.log("  re-checks it for credential-shaped values, and re-pins docs/api/ with a new date.")
process.exit(1)
