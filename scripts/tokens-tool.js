// ADD OS: `node:os` and `text` dropped with the import flow — the former resolved
// `~/` in the tokens path, the latter prompted for it. See refuseImport().
import path from "node:path"
import process from "node:process"
import { cancel, intro, isCancel, outro, select, spinner } from "@clack/prompts"
import { colord } from "colord"
import fs from "fs-extra"
import _ from "lodash"

// ADD OS: GLOBAL_KEYS / TYPO_KEYS / COLOR_KEYS / COLOR_SUFFIX_REGEX dropped —
// they parsed the INBOUND Figma shape and were only read by importTokens().
const COLOR_OPACITY_LIST = [] // [5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90]
const TOKENS_MAP = [
	{
		token: "colors",
		type: "color"
	},
	{
		token: "fontFamily",
		type: "fontFamilies"
	},
	{
		token: "fontWeight",
		type: "fontWeights"
	},
	{
		token: "fontSize",
		type: "fontSizes"
	},
	{
		token: "lineHeight",
		type: "lineHeights"
	},
	{
		token: "typography",
		type: "typo"
	}
]

const DESIGN_TOKEN_PATH = fs.pathExistsSync(path.join(process.cwd(), "src"))
	? path.join(process.cwd(), "src", "design-tokens.json")
	: path.join(process.cwd(), "app", "design-tokens.json")
const FIGMA_TOKEN_PATH = path.join(process.cwd(), "figma-tokens.json")

function getValue(origin, val) {
	if (val && val.indexOf("{") === 0) {
		const path = val.replace("{", "").replace("}", "")
		return _.get(origin, path)
	}

	return val
}

/**
 * Sanitizes a token or type name based on the provided mapping.
 *
 * This function converts a token name to a type name or vice versa based on the direction specified. It uses a predefined map to find the corresponding sanitized name.
 *
 * @param {string} name - The name of the token or type to be sanitized.
 * @param {"token" | "type"} from - Indicates the current type of the name (`"token"` or `"type"`) to determine the direction of the conversion.
 * @returns {string} The sanitized name, converted to the opposite type. If no mapping is found, returns the original name.
 */
function tokenNameSanitize(name, from) {
	const to = from === "token" ? "type" : "token"

	const pair = TOKENS_MAP.find(o => o[from] === name)

	if (!pair) return name

	return pair[to]
}

/**
 * ADD OS — `importTokens()` REMOVED.
 *
 * It wrote `src/design-tokens.json`, which is now GENERATED from
 * `src/add-os/theme/tokens.ts` by `npm run tokens`. So a Figma import appeared to
 * succeed and was then erased without warning by the next generate — a human's
 * colour work, silently gone.
 *
 * Deleted rather than left unreachable: a dead function whose only behaviour is to
 * destroy work is a hazard sitting one call away from being re-wired. The import
 * flow now stops at `refuseImport()` and names tokens.ts as the place to edit.
 */

/**
 * Exports tokens from the design system and writes them to a JSON file.
 *
 * @returns {string} The path to the exported JSON file.
 */
async function exportTokens() {
	const tokens = await fs.readJSON(DESIGN_TOKEN_PATH)

	const groups = _.chain(tokens)
		.toPairs()
		.map(([k, v]) => ({ key: k, value: v }))
		.value()

	const exportFile = {
		global: {},
		light: {},
		dark: {}
	}

	const globalTokens = groups.filter(o => !["colors", "typography"].includes(o.key))
	const colorTokens = groups.filter(o => ["colors"].includes(o.key))
	const typoTokens = groups.filter(o => ["typography"].includes(o.key))

	for (const group of globalTokens) {
		const type = tokenNameSanitize(group.key, "token")

		for (const name in group.value) {
			const tokenName = _.kebabCase(`${type}-${name}`)

			exportFile.global[tokenName] = {
				value: group.value[name],
				type
			}
		}
	}

	for (const group of colorTokens) {
		const type = tokenNameSanitize(group.key, "token")
		const set = group.value

		for (const setName in set) {
			for (const name in set[setName]) {
				const globalName = _.kebabCase(`${type}-${setName}-${name}`)
				const tokenName = _.kebabCase(`${type}-${name}`)

				const value = colord(set[setName][name]).toRgbString()

				exportFile.global[globalName] = {
					value,
					type
				}

				exportFile[setName][tokenName] = {
					value: `{${globalName}}`,
					type
				}

				for (const opacity of COLOR_OPACITY_LIST) {
					const opacityName = opacity.toString().padStart(3, "0")
					const globalNameOpacity = _.kebabCase(`${type}-${setName}-${name}-${opacityName}`)
					const tokenNameOpacity = _.kebabCase(`${type}-${name}-${opacityName}`)
					const valueOpacity = colord(value)
						.alpha(opacity / 100)
						.toRgbString()

					exportFile.global[globalNameOpacity] = {
						value: valueOpacity,
						type
					}

					exportFile[setName][tokenNameOpacity] = {
						value: `{${globalNameOpacity}}`,
						type
					}
				}
			}
		}
	}

	for (const group of typoTokens) {
		const type = group.key
		const set = group.value

		for (const setName in set) {
			const globalName = `typo-${setName}`
			const value = set[setName]
			const newValue = {}

			for (const k in value) {
				const prop = value[k]
				if (prop.indexOf("{") === 0) {
					const ref = prop.replace("{", "").replace("}", "")
					const path = _.split(ref, ".")[1]
					const prefix = tokenNameSanitize(k, "token")
					newValue[k] = `{${_.kebabCase(`${prefix}-${_.kebabCase(path)}`)}}`
				} else {
					newValue[k] = prop
				}
			}

			// sanitize lineHeight for figma
			if (value.fontSize && tokens?.lineHeight?.default) {
				newValue.lineHeight = Math.round(
					Number.parseInt(getValue(tokens, value.fontSize)) * Number.parseFloat(tokens.lineHeight.default)
				).toString()
			}

			exportFile.global[globalName] = {
				value: newValue,
				type
			}
		}
	}

	await fs.writeJSON(FIGMA_TOKEN_PATH, exportFile, { spaces: "\t" })

	return FIGMA_TOKEN_PATH
}

/**
 * ADD OS — refuses the import direction instead of destroying work.
 *
 * Both of this tool's write targets are now GENERATED from
 * `src/add-os/theme/tokens.ts` by `npm run tokens`:
 *
 *   importTokens()  →  src/design-tokens.json
 *   exportTokens()  →  figma-tokens.json
 *
 * So importing a palette from Figma used to appear to succeed and then be erased
 * without warning by the next `npm run tokens` — a human's Figma work, silently
 * gone. That is the one failure mode worth a hard stop.
 *
 * Writing BACK to tokens.ts is not offered: it is hand-authored TypeScript
 * carrying provenance notes and WCAG measurements per value, and a codegen
 * writeback would flatten exactly the documentation that makes it trustworthy.
 * Colour decisions belong in a human edit with a reason attached.
 */
function refuseImport() {
	cancel("Import is disabled in ADD OS — it would be silently discarded.")
	console.log()
	console.log("  src/design-tokens.json is GENERATED. The source of truth is:")
	console.log()
	console.log("      src/add-os/theme/tokens.ts")
	console.log()
	console.log("  Anything written here is erased by the next `npm run tokens`.")
	console.log()
	console.log("  To change a colour:")
	console.log("    1. edit src/add-os/theme/tokens.ts")
	console.log("       (register non-brand values in DERIVATIONS, with a reason)")
	console.log("    2. npm run tokens")
	console.log("    3. npx vitest run src/add-os/theme    # WCAG invariants")
	console.log()
	console.log("  To bring a palette back FROM Figma: read the exported json and apply")
	console.log("  the values to tokens.ts by hand. That step is deliberately manual —")
	console.log("  every colour there carries a recorded justification.")
	console.log()
	console.log("  See src/add-os/theme/README.md and docs/brand/PHASE-0-AUDIT.md")
	console.log()
	return process.exit(1)
}

async function main() {
	console.log()
	intro("Design tokens import/export tool")

	const flowType = await select({
		message: "Choose an action.",
		options: [
			{ value: "import", label: "Import figma tokens  (DISABLED — see tokens.ts)" },
			{ value: "export", label: "Export figma json" }
		]
	})

	if (isCancel(flowType)) {
		cancel("Operation cancelled")
		return process.exit(0)
	}

	if (flowType === "import") {
		// ADD OS: hard stop. See refuseImport() for why.
		return refuseImport()
	} else {
		const s = spinner()
		s.start("Creating figma token file")

		const filePath = await exportTokens()

		s.stop("Figma token file created")

		// ADD OS: this target is generated too, so say so rather than implying the
		// file is now authoritative. Non-destructive — it only re-derives a
		// generated file from another generated file — but a reader should not
		// mistake it for a source.
		outro(`Written to ${filePath} — NOTE: regenerated by \`npm run tokens\` from add-os/theme/tokens.ts`)
	}
}

main().catch(console.error)
