import { flushPromises } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { createPersistedState } from "pinia-plugin-persistedstate"
import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * ADD OS — a 401 during boot must not hijack the first navigation.
 *
 * `main.ts` installs the router (which starts the first navigation) and THEN
 * awaits `initSession()` before mounting. Signed out, that probe 401s while the
 * navigation is still in flight.
 *
 * `services/api.ts` answered every 401 with an unconditional
 * `router.push("/login")`, so the boot probe started a second navigation against
 * the first. In the browser the two cancelled each other: neither completed,
 * vue-router stayed at START_LOCATION, `<RouterView>` rendered nothing, and the
 * user got a blank page with the address bar unchanged and no Vue error at all.
 *
 * It could only ever show on `/forgot-password` and `/reset-password` — the only
 * routes reachable WITHOUT a session that are not `/login`, where the push is a
 * same-location navigation that cancels nothing.
 *
 * ── Why this test mounts the whole app ──────────────────────────────────────
 * `services/__tests__/api.spec.ts` pins the decision in isolation, and that is
 * the faster check. It cannot catch this one: the defect is in the ORDER
 * main.ts uses, and it is invisible to any test that mounts a component. The
 * first attempt at reproducing it used `@vue/test-utils` `mount()`, which
 * installs plugins at mount time — a different order — and the bug did not
 * reproduce. `createApp` here is not incidental; it is the reproduction.
 */

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test",
	hasApiUrl: () => true,
	assertEnv: () => {}
}))

/** Boots the app the way main.ts does, at `path`, with every request 401ing. */
async function bootUnauthenticatedAt(path: string) {
	// jsdom has neither; the vertical-nav layout scrolls in router.afterEach.
	Element.prototype.scrollTo = () => {}
	window.scrollTo = () => {}

	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ message: "Unauthenticated." }), {
				status: 401,
				headers: { "content-type": "application/json" }
			})
		)
	)

	window.history.replaceState({}, "", path)

	const pinia = createPinia()
	pinia.use(createPersistedState({ key: id => `__persisted__${id}` }))
	setActivePinia(pinia)

	const { registerLocalIcons } = await import("@/add-os/assets/icons")
	registerLocalIcons()

	const i18n = (await import("@/lang")).default
	const router = (await import("@/router")).default
	const App = (await import("@/App.vue")).default
	const { useAuthStore } = await import("@/stores/auth")
	const { createApp } = await import("vue")

	const app = createApp(App)
	app.use(pinia)
	app.use(i18n)
	app.use(router)

	await useAuthStore().initSession()

	const host = document.createElement("div")
	document.body.appendChild(host)
	app.mount(host)

	await flushPromises()
	await new Promise(resolve => setTimeout(resolve, 800))
	await flushPromises()

	// Unmounted by the caller: left mounted, ResizeObserver's scheduler keeps
	// running past the jsdom teardown and prints a TypeError after the summary.
	return { router, text: host.textContent ?? "", unmount: () => app.unmount() }
}

describe("a 401 at boot does not hijack the first navigation", () => {
	beforeEach(() => {
		localStorage.clear()
		vi.spyOn(console, "warn").mockImplementation(() => {})
	})

	it("leaves a signed-out caller on /forgot-password, with the page rendered", { timeout: 120_000 }, async () => {
		const { router, text, unmount } = await bootUnauthenticatedAt("/forgot-password")
		try {
			expect(router.currentRoute.value.name, "the boot probe must not navigate anywhere").toBe("ForgotPassword")
			// START_LOCATION renders nothing, which is exactly the blank page reported.
			expect(text.length, "the page rendered nothing — the router never settled").toBeGreaterThan(50)
		} finally {
			unmount()
		}
	})
})
