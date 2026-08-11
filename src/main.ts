import { createPinia, setActivePinia } from "pinia"
import { createPersistedState } from "pinia-plugin-persistedstate"
import { createApp } from "vue"
import VueApexCharts from "vue3-apexcharts"
import VueVectorMap from "vuevectormap"
import { registerLocalIcons } from "@/add-os/assets/icons"
import { assertEnv, hasApiUrl } from "@/add-os/config/env"
import App from "@/App.vue"
import i18n from "@/lang"

import router from "@/router"
import { useAuthStore } from "@/stores/auth"
import "jsvectormap/dist/maps/world.js"
import "jsvectormap/src/scss/jsvectormap.scss"

import "@/assets/scss/index.scss"
import "./tailwind.css"

const meta = document.createElement("meta")
meta.name = "naive-ui-style"
document.head.appendChild(meta)

// ADD OS: fail on a misconfigured environment before anything mounts. Throws in a
// production build when VITE_API_URL is unset; warns in development. There is no
// fallback host — see @/add-os/config/env.ts.
assertEnv()

// ADD OS: bundle-local icons. Must run before anything renders — Icon.vue resolves
// synchronously and never falls back to the network. See @/add-os/assets/icons.ts.
registerLocalIcons()

const pinia = createPinia()
pinia.use(
	createPersistedState({
		key: id => `__persisted__${id}`
	})
)
setActivePinia(pinia)

const app = createApp(App)
app.use(pinia)
app.use(i18n)
app.use(router)

app.use(VueApexCharts)
// @ts-expect-error options not provided
app.use(VueVectorMap)

// ADD OS: `@fawmi/vue-google-maps` was registered here and is gone.
//
// It injected a remote <script> from `maps.googleapis.com` when a GMap component
// mounted (bare hostname on purpose — see no-external-urls.spec.ts). The loader
// is lazy and no ADD OS route rendered one, so nothing fired — but "safe until
// someone routes a map" is a countdown, not a guarantee, on a VPN-isolated
// network whose isolation backs physical door locks.
//
// Enforced by `add-os/__tests__/no-external-urls.spec.ts`, which fails the build
// if any emitted artifact references an off-allowlist host.
//
// If maps are ever needed: `maplibre-gl` + `vue-maplibre-gl` are already
// dependencies and can run against a self-hosted tile server.

// ADD OS: verify the Fortify session against the API before the router resolves its
// first navigation — trusting the persisted `logged` flag alone would let a page
// reload paper over an expired or server-revoked session until the first API call
// happened to 401. See src/stores/auth.ts's initSession().
async function bootstrap() {
	if (hasApiUrl()) {
		await useAuthStore().initSession()
	}
	app.mount("#app")
}

bootstrap()
