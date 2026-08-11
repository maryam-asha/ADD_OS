/**
 * ADD OS — bundles the icons the app actually uses, so nothing is fetched at runtime.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * `@iconify/vue` resolves unknown icons by calling https://api.iconify.design.
 * ADD OS runs on an isolated VPN, so that request either fails — leaving the UI
 * with no icons at all — or leaks usage out of a closed network.
 *
 * This script scans the source for icon names, pulls just those icons out of the
 * `@iconify-json/*` sets (devDependencies — they never ship), and writes them to
 * `src/add-os/assets/icons.generated.json`. That file is registered with
 * `addCollection()` at startup, and `Icon.vue` reads with `getIcon()` — a purely
 * local lookup with no network path.
 *
 * ── Running it ──────────────────────────────────────────────────────────────
 *     npm run icons
 *
 * Re-run after adding or renaming an icon. Forgetting is not silent: the test
 * `src/add-os/assets/__tests__/icons.spec.ts` fails when the generated file and
 * the source disagree.
 *
 * ── Dynamic names ───────────────────────────────────────────────────────────
 * Only string literals can be scanned. Icons built at runtime — e.g.
 * `circle-flags:${code}` in the language switcher — must be listed in
 * DYNAMIC_ICONS below or they will be missing.
 */

import { Buffer } from "node:buffer"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const SOURCE_DIR = "src"
const OUTPUT_FILE = path.join("src", "add-os", "assets", "icons.generated.json")
const SOURCE_EXTENSIONS = new Set([".vue", ".ts", ".tsx"])

/** `prefix:name` inside a quoted string. */
const ICON_PATTERN = /["'`]([a-z][a-z0-9-]{1,20}):([a-z0-9][a-z0-9-]*)["'`]/g

/**
 * Prefixes that look like icons but are not. Keep this list short and obvious —
 * anything else genuinely missing should surface as a build error, not be hidden.
 */
const NOT_ICON_PREFIXES = new Set(["node"])

/**
 * Icons composed at runtime, which the scanner cannot see.
 *
 * Currently none. The language switchers used to render `circle-flags:${code}`,
 * but flags were dropped: a language is not a country, and neither code even
 * resolved (`circle-flags:ar` is Argentina, `circle-flags:en` does not exist).
 *
 * `circle-flags` is still pulled in — 24 names remain in `src/views/Icons.vue`,
 * a Pinx showcase page. It drops out of the bundle on the next run once the
 * demo pages are removed; no action needed here.
 */
const DYNAMIC_ICONS = []

/**
 * Removes comments before scanning.
 *
 * Without this the scanner harvests prose: a doc comment that merely MENTIONS
 * `circle-flags:ar` had two non-existent flags bundled. Documentation must be
 * free to name an icon without shipping it.
 *
 * The line-comment pattern refuses to fire after a colon, so `https://…` inside
 * a string is not mistaken for the start of a comment.
 */
function stripComments(source) {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, " ")
		.replace(/<!--[\s\S]*?-->/g, " ")
		.replace(/(^|[^:\\])\/\/[^\n]*/g, "$1")
}

function walk(directory, files = []) {
	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const target = path.join(directory, entry.name)
		if (entry.isDirectory()) walk(target, files)
		else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(target)
	}
	return files
}

/** Returns Map<prefix, Set<iconName>> for every literal icon reference in the source. */
export function collectIconNames() {
	const collected = new Map()

	const add = (prefix, name) => {
		if (NOT_ICON_PREFIXES.has(prefix)) return
		if (!collected.has(prefix)) collected.set(prefix, new Set())
		collected.get(prefix).add(name)
	}

	for (const file of walk(SOURCE_DIR)) {
		const contents = stripComments(fs.readFileSync(file, "utf8"))
		for (const [, prefix, name] of contents.matchAll(ICON_PATTERN)) add(prefix, name)
	}

	for (const icon of DYNAMIC_ICONS) {
		const [prefix, name] = icon.split(":")
		add(prefix, name)
	}

	return collected
}

function loadIconSet(prefix) {
	const setPath = path.join("node_modules", "@iconify-json", prefix, "icons.json")

	if (!fs.existsSync(setPath)) {
		throw new Error(
			`Icon set "@iconify-json/${prefix}" is not installed, but the source references "${prefix}:*".\n`
			+ `  Install it:  npm i -D @iconify-json/${prefix}`
		)
	}

	return JSON.parse(fs.readFileSync(setPath, "utf8"))
}

/**
 * Builds one trimmed IconifyJSON per prefix, carrying only the used icons plus
 * the set-level metrics (width/height/aliases) they need to render correctly.
 */
export function buildCollections(collected) {
	const collections = {}
	const missing = []

	for (const [prefix, names] of [...collected].sort(([a], [b]) => a.localeCompare(b))) {
		const source = loadIconSet(prefix)
		const icons = {}
		const aliases = {}

		for (const name of [...names].sort()) {
			if (source.icons?.[name]) {
				icons[name] = source.icons[name]
			} else if (source.aliases?.[name]) {
				// Keep the alias and make sure its parent comes along.
				aliases[name] = source.aliases[name]
				let parent = source.aliases[name].parent
				while (parent && !icons[parent]) {
					if (source.icons?.[parent]) {
						icons[parent] = source.icons[parent]
						break
					}
					if (!source.aliases?.[parent]) break
					aliases[parent] = source.aliases[parent]
					parent = source.aliases[parent].parent
				}
			} else {
				missing.push(`${prefix}:${name}`)
			}
		}

		const collection = { prefix, icons }
		if (Object.keys(aliases).length) collection.aliases = aliases
		if (source.width) collection.width = source.width
		if (source.height) collection.height = source.height

		collections[prefix] = collection
	}

	return { collections, missing }
}

function main() {
	const collected = collectIconNames()
	const { collections, missing } = buildCollections(collected)

	if (missing.length) {
		console.error(`\n✖ ${missing.length} icon name(s) do not exist in their set:`)
		for (const name of missing) console.error(`    ${name}`)
		console.error("\nFix the name in the source, or install the correct set.\n")
		process.exitCode = 1
		return
	}

	fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
	fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(collections, null, "\t")}\n`, "utf8")

	const total = Object.values(collections).reduce((sum, c) => sum + Object.keys(c.icons).length, 0)
	const kb = (Buffer.byteLength(fs.readFileSync(OUTPUT_FILE)) / 1024).toFixed(1)

	console.log(`✔ ${total} icons from ${Object.keys(collections).length} sets → ${OUTPUT_FILE} (${kb} KB)`)
	for (const [prefix, collection] of Object.entries(collections)) {
		console.log(`    ${String(Object.keys(collection.icons).length).padStart(4)}  ${prefix}`)
	}
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
	main()
}
