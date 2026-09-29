import { flushPromises, mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { createPersistedState } from "pinia-plugin-persistedstate"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import { useAuthStore } from "@/stores/auth"
import LoginPage from "../LoginPage.vue"

const { loginMock, twoFactorChallengeMock, getMeMock, getCsrfCookieMock, pushMock, currentQuery } = vi.hoisted(() => ({
	loginMock: vi.fn(),
	twoFactorChallengeMock: vi.fn(),
	getMeMock: vi.fn(),
	getCsrfCookieMock: vi.fn(),
	pushMock: vi.fn(),
	// The `/login` route's query, writable so a test can arrive with `?redirect=`.
	currentQuery: { value: {} as Record<string, string> }
}))

vi.mock("@/add-os/services/auth", () => ({
	login: loginMock,
	twoFactorChallenge: twoFactorChallengeMock,
	getMe: getMeMock,
	getCsrfCookie: getCsrfCookieMock
}))

// Partial mock, not a replacement: `services/api.ts` imports `src/router`, which
// calls `createRouter` at module load. Replacing the whole module removes that
// export and the suite fails to collect before a single test runs.
vi.mock("vue-router", async importOriginal => {
	const actual = await importOriginal<typeof import("vue-router")>()
	return { ...actual, useRouter: () => ({ push: pushMock }), useRoute: () => ({ query: currentQuery.value }) }
})

const adminUser = { id: 1, name: "Maryam", email: "m@add.sy", roles: ["admin"] }

const messages = {
	en: {
		common: { logoAlt: "ADD OS logo" },
		auth: {
			common: { back: "Back" },
			signIn: {
				title: "Welcome back",
				subtitle: "Sign in to continue.",
				emailLabel: "Email",
				emailPlaceholder: "Enter your email",
				emailRequired: "Email is required.",
				emailInvalid: "Enter a valid email address.",
				passwordLabel: "Password",
				passwordPlaceholder: "Enter your password",
				passwordRequired: "Password is required.",
				forgotLink: "Forgot your password?",
				submit: "Sign in",
				genericError: "Couldn't sign in."
			},
			twoFactor: {
				title: "Two-step verification",
				subtitle: "Enter the code.",
				codeLabel: "Authentication code",
				codePlaceholder: "Enter the six-digit code",
				codeRequired: "Enter the code.",
				recoveryLabel: "Recovery code",
				recoveryPlaceholder: "Enter a recovery code",
				recoveryRequired: "Enter a recovery code.",
				useRecoveryCode: "Use a recovery code instead",
				useAuthCode: "Use an authentication code instead",
				submit: "Verify",
				genericError: "Couldn't verify that code."
			}
		}
	}
}

const stubs = {
	Logo: { template: `<div class="logo-stub" />` },
	Icon: { props: ["name", "size"], template: `<i class="icon-stub" :data-name="name" />` },
	RouterLink: { template: `<a><slot :navigate="() => {}" /></a>` }
}

function mountPage() {
	const pinia = createPinia()
	pinia.use(createPersistedState({ key: id => `__persisted__${id}` }))
	setActivePinia(pinia)

	const i18n = createI18n({ legacy: false, locale: "en", fallbackLocale: "en", messages })

	return mount(LoginPage, { global: { plugins: [pinia, i18n], stubs } })
}

/** Fills both sign-in fields with values that pass client-side validation. */
async function fillCredentials(wrapper: ReturnType<typeof mountPage>) {
	const inputs = wrapper.findAll("input")
	await inputs[0].setValue("m@add.sy")
	await inputs[1].setValue("correct-horse")
	await flushPromises()
}

async function clickSubmit(wrapper: ReturnType<typeof mountPage>, label: string) {
	const button = wrapper.findAll("button").find(b => b.text().includes(label))
	expect(button, `no button labelled "${label}"`).toBeTruthy()
	await button!.trigger("click")
	await flushPromises()
}

describe("loginPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// The auth store persists `logged`, so a successful sign-in in one test
		// rehydrates into the next pinia and every later "is NOT logged in"
		// assertion passes vacuously. A fresh pinia is not enough on its own.
		localStorage.clear()
		currentQuery.value = {}
		getCsrfCookieMock.mockResolvedValue(undefined)
		getMeMock.mockResolvedValue(adminUser)
	})

	it("primes the CSRF cookie before the first submit can happen", async () => {
		mountPage()
		await flushPromises()
		expect(getCsrfCookieMock).toHaveBeenCalledTimes(1)
	})

	it("signs in and lands on the home redirect", async () => {
		loginMock.mockResolvedValue({ two_factor: false })

		const wrapper = mountPage()
		await flushPromises()
		await fillCredentials(wrapper)
		await clickSubmit(wrapper, "Sign in")

		expect(loginMock).toHaveBeenCalledWith("m@add.sy", "correct-horse")
		expect(useAuthStore().isLogged).toBe(true)
		expect(pushMock).toHaveBeenCalledWith({ path: "/", replace: true })
	})

	it("lands on the page it was sent away from", async () => {
		loginMock.mockResolvedValue({ two_factor: false })
		currentQuery.value = { redirect: "/bookings/calendar?day=2026-09-28" }

		const wrapper = mountPage()
		await flushPromises()
		await fillCredentials(wrapper)
		await clickSubmit(wrapper, "Sign in")

		expect(pushMock).toHaveBeenCalledWith({ path: "/bookings/calendar?day=2026-09-28", replace: true })
	})

	it("refuses an off-site redirect and lands home instead", async () => {
		loginMock.mockResolvedValue({ two_factor: false })
		currentQuery.value = { redirect: "//elsewhere/steal" }

		const wrapper = mountPage()
		await flushPromises()
		await fillCredentials(wrapper)
		await clickSubmit(wrapper, "Sign in")

		expect(pushMock).toHaveBeenCalledWith({ path: "/", replace: true })
	})

	describe("already signed in", () => {
		it("on a 409, completes the session silently and lands on the requested page", async () => {
			loginMock.mockRejectedValue(new ApiError(409, JSON.stringify({ message: "You are already logged in." })))
			currentQuery.value = { redirect: "/members" }

			const wrapper = mountPage()
			await flushPromises()
			await fillCredentials(wrapper)
			await clickSubmit(wrapper, "Sign in")

			expect(wrapper.text()).not.toContain("already logged in")
			expect(useAuthStore().isLogged).toBe(true)
			expect(pushMock).toHaveBeenCalledWith({ path: "/members", replace: true })
		})

		it("on the older backend's blocked redirect (a network TypeError), does the same", async () => {
			loginMock.mockRejectedValue(new TypeError("Failed to fetch"))

			const wrapper = mountPage()
			await flushPromises()
			await fillCredentials(wrapper)
			await clickSubmit(wrapper, "Sign in")

			expect(useAuthStore().isLogged).toBe(true)
			expect(pushMock).toHaveBeenCalledWith({ path: "/", replace: true })
		})

		it("shows the original error when /me does not confirm a session", async () => {
			loginMock.mockRejectedValue(new ApiError(409, JSON.stringify({ message: "You are already logged in." })))
			getMeMock.mockRejectedValue(new ApiError(403, JSON.stringify({ message: "Forbidden." })))

			const wrapper = mountPage()
			await flushPromises()
			await fillCredentials(wrapper)
			await clickSubmit(wrapper, "Sign in")

			expect(wrapper.text()).toContain("You are already logged in.")
			expect(useAuthStore().isLogged).toBe(false)
			expect(pushMock).not.toHaveBeenCalled()
		})
	})

	it("does not submit when the email is not an email", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const inputs = wrapper.findAll("input")
		await inputs[0].setValue("not-an-email")
		await inputs[1].setValue("correct-horse")
		await clickSubmit(wrapper, "Sign in")

		expect(loginMock).not.toHaveBeenCalled()
	})

	describe("two-factor", () => {
		it("moves to the challenge WITHOUT logging in", async () => {
			// Fortify returns no user for a two_factor login — it is not yet a
			// session, so storing anything here would be storing a half-login.
			loginMock.mockResolvedValue({ two_factor: true })

			const wrapper = mountPage()
			await flushPromises()
			await fillCredentials(wrapper)
			await clickSubmit(wrapper, "Sign in")

			expect(wrapper.text()).toContain("Two-step verification")
			expect(getMeMock).not.toHaveBeenCalled()
			expect(useAuthStore().isLogged).toBe(false)
			expect(pushMock).not.toHaveBeenCalled()
		})

		it("completes the session once the code is accepted", async () => {
			loginMock.mockResolvedValue({ two_factor: true })
			twoFactorChallengeMock.mockResolvedValue(undefined)

			const wrapper = mountPage()
			await flushPromises()
			await fillCredentials(wrapper)
			await clickSubmit(wrapper, "Sign in")

			await wrapper.find("input").setValue("123456")
			await clickSubmit(wrapper, "Verify")

			expect(twoFactorChallengeMock).toHaveBeenCalledWith({ code: "123456" })
			expect(useAuthStore().isLogged).toBe(true)
		})

		it("sends a recovery code under its own key when that mode is chosen", async () => {
			loginMock.mockResolvedValue({ two_factor: true })
			twoFactorChallengeMock.mockResolvedValue(undefined)

			const wrapper = mountPage()
			await flushPromises()
			await fillCredentials(wrapper)
			await clickSubmit(wrapper, "Sign in")

			await clickSubmit(wrapper, "Use a recovery code instead")
			await wrapper.find("input").setValue("recovery-abc")
			await clickSubmit(wrapper, "Verify")

			expect(twoFactorChallengeMock).toHaveBeenCalledWith({ recovery_code: "recovery-abc" })
		})

		it("returns to sign-in without carrying the typed code back", async () => {
			loginMock.mockResolvedValue({ two_factor: true })

			const wrapper = mountPage()
			await flushPromises()
			await fillCredentials(wrapper)
			await clickSubmit(wrapper, "Sign in")

			await wrapper.find("input").setValue("123456")
			await clickSubmit(wrapper, "Back")

			expect(wrapper.text()).toContain("Welcome back")
		})
	})

	describe("errors", () => {
		it("shows the server's own message when there is one", async () => {
			// ApiError parses `data` out of the raw body string, exactly as request() hands it over.
			loginMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "These credentials do not match." })))

			const wrapper = mountPage()
			await flushPromises()
			await fillCredentials(wrapper)
			await clickSubmit(wrapper, "Sign in")

			expect(wrapper.text()).toContain("These credentials do not match.")
			expect(useAuthStore().isLogged).toBe(false)
		})

		it("falls back to our own copy when the server sends none", async () => {
			loginMock.mockRejectedValue(new Error("network down"))

			const wrapper = mountPage()
			await flushPromises()
			await fillCredentials(wrapper)
			await clickSubmit(wrapper, "Sign in")

			expect(wrapper.text()).toContain("Couldn't sign in.")
		})
	})

	// The vendor form shipped a "Remember me" checkbox with no v-model, and
	// `remember` appears nowhere in the pinned API collection. Invariant 4: a
	// shipped control may not be a no-op, so it is not carried over.
	it("ships no remember-me control", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.find("input[type=checkbox]").exists()).toBe(false)
		expect(wrapper.text().toLowerCase()).not.toContain("remember")
	})
})
