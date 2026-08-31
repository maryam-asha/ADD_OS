import { flushPromises, mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { createPersistedState } from "pinia-plugin-persistedstate"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import ForgotPasswordPage from "../ForgotPasswordPage.vue"

const { requestPasswordResetMock, getCsrfCookieMock, pushMock } = vi.hoisted(() => ({
	requestPasswordResetMock: vi.fn(),
	getCsrfCookieMock: vi.fn(),
	pushMock: vi.fn()
}))

vi.mock("@/add-os/services/auth", () => ({
	requestPasswordReset: requestPasswordResetMock,
	getCsrfCookie: getCsrfCookieMock
}))

// Partial mock: `services/api.ts` imports `src/router`, which calls `createRouter`
// at module load. Replacing the module wholesale breaks collection.
vi.mock("vue-router", async importOriginal => {
	const actual = await importOriginal<typeof import("vue-router")>()
	return { ...actual, useRouter: () => ({ push: pushMock }) }
})

const messages = {
	en: {
		common: { logoAlt: "ADD OS logo" },
		auth: {
			common: { back: "Back" },
			forgotPassword: {
				title: "Forgot your password?",
				subtitle: "We'll email you a reset link.",
				emailLabel: "Email",
				emailPlaceholder: "Enter your email",
				emailRequired: "Email is required.",
				emailInvalid: "Enter a valid email address.",
				submit: "Send reset link",
				success: "If that email has an account, a reset link is on its way.",
				alreadySignedIn: "You are already signed in.",
				genericError: "Couldn't send the reset link.",
				backToSignIn: "Back to sign in"
			}
		}
	}
}

const stubs = {
	RouterLink: { template: `<a><slot :navigate="() => {}" /></a>` }
}

function mountPage() {
	const pinia = createPinia()
	pinia.use(createPersistedState({ key: id => `__persisted__${id}` }))
	setActivePinia(pinia)

	const i18n = createI18n({ legacy: false, locale: "en", fallbackLocale: "en", messages })

	// Icon is NOT stubbed: this is the first screen that renders the back arrow on
	// load, so a broken local icon lookup would show up here and nowhere else.
	return mount(ForgotPasswordPage, { global: { plugins: [pinia, i18n], stubs } })
}

async function submit(wrapper: ReturnType<typeof mountPage>, email: string) {
	await wrapper.find("input").setValue(email)
	await flushPromises()
	const button = wrapper.findAll("button").find(b => b.text().includes("Send reset link"))
	expect(button, "no submit button").toBeTruthy()
	await button!.trigger("click")
	await flushPromises()
}

describe("forgotPasswordPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		localStorage.clear()
		getCsrfCookieMock.mockResolvedValue(undefined)
	})

	it("renders the form", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.find("input").exists(), "no email input rendered").toBe(true)
		expect(wrapper.text()).toContain("Forgot your password?")
	})

	it("primes the CSRF cookie before the first submit can happen", async () => {
		mountPage()
		await flushPromises()
		expect(getCsrfCookieMock).toHaveBeenCalledTimes(1)
	})

	it("posts the address and replaces the form with the neutral confirmation", async () => {
		requestPasswordResetMock.mockResolvedValue(undefined)

		const wrapper = mountPage()
		await flushPromises()
		await submit(wrapper, "m@add.sy")

		expect(requestPasswordResetMock).toHaveBeenCalledWith("m@add.sy")
		expect(wrapper.text()).toContain("If that email has an account")
		expect(wrapper.find("input").exists(), "the form should be replaced, not stacked").toBe(false)
	})

	it("does not post an address that fails validation", async () => {
		const wrapper = mountPage()
		await flushPromises()
		await submit(wrapper, "not-an-email")

		expect(requestPasswordResetMock).not.toHaveBeenCalled()
		expect(wrapper.text()).toContain("Enter a valid email address.")
	})

	it("gives a 409 its own message rather than the generic failure", async () => {
		requestPasswordResetMock.mockRejectedValue(new ApiError(409, JSON.stringify({ message: "Already authenticated" })))

		const wrapper = mountPage()
		await flushPromises()
		await submit(wrapper, "m@add.sy")

		expect(wrapper.text()).toContain("You are already signed in.")
		expect(wrapper.find("input").exists(), "the form must stay so the caller can retry").toBe(true)
	})
})
