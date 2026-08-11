import type { Plugin } from "vite"
import process from "node:process"
import { fileURLToPath, URL } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import vue from "@vitejs/plugin-vue"
import vueJsx from "@vitejs/plugin-vue-jsx"
import Components from "unplugin-vue-components/vite"
import { defineConfig, loadEnv } from "vite"
import VueDevTools from "vite-plugin-vue-devtools"
import svgLoader from "vite-svg-loader"

/**
 * ADD OS — strips Iconify's remote API hosts out of the bundle.
 *
 * ADD OS is deployed on an isolated VPN. `@iconify/vue` registers three public
 * icon APIs at module scope and falls back to them for any icon it does not
 * already hold, so the hosts ship in `dist` whether or not they are ever called.
 *
 * Icons are already bundled locally (`npm run icons` → `@/add-os/assets/icons.ts`)
 * and `Icon.vue` resolves with `getIcon()`, which has no network path — so this
 * is the third and last layer: even an accidental future call cannot leave the
 * network. The hosts are rewritten to a same-origin path that simply 404s.
 *
 * Iconify's SVG rendering is left completely untouched; only the host strings change.
 */
const ICONIFY_API_HOSTS = ["https://api.iconify.design", "https://api.simplesvg.com", "https://api.unisvg.com"]

const DISABLED_ENDPOINT = "/__iconify-api-disabled"

function stripIconifyRemoteApi(): Plugin {
	return {
		name: "add-os:strip-iconify-remote-api",
		enforce: "pre",
		transform(code, id) {
			if (!id.includes("@iconify")) return null
			if (!ICONIFY_API_HOSTS.some(host => code.includes(host))) return null

			return {
				code: ICONIFY_API_HOSTS.reduce((out, host) => out.replaceAll(host, DISABLED_ENDPOINT), code),
				map: null
			}
		}
	}
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	// Load env file based on `mode` in the current working directory.
	// Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
	process.env = { ...process.env, ...loadEnv(mode, process.cwd(), "") }

	return {
		plugins: [
			stripIconifyRemoteApi(),
			tailwindcss(),
			vue({
				script: {
					defineModel: true
				}
			}),
			vueJsx(),
			VueDevTools(),
			svgLoader(),
			Components({
				dirs: ["src/components/cards"],
				dts: "src/unplugin.components.d.ts"
			})
		],
		resolve: {
			alias: {
				"@": fileURLToPath(new URL("./src", import.meta.url)),
				"node:process": "process/browser"
			}
		},
		optimizeDeps: {
			include: ["@fawmi/vue-google-maps"],
			// ADD OS: keep @iconify/vue out of the esbuild pre-bundle so the plugin above
			// also applies during `vite dev`, not just in production builds.
			exclude: ["@iconify/vue"]
		},
		define: {
			__APP_ENV__: JSON.stringify(process.env.APP_ENV)
		},
		css: {
			preprocessorOptions: {
				scss: {
					silenceDeprecations: ["legacy-js-api", "import"],
					api: "modern-compiler"
				}
			}
		}
	}
})
