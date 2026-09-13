import type { SelectOption } from "naive-ui"
import { acceptHMRUpdate, defineStore } from "pinia"
import type { CurrencyCode } from "@/add-os/utils/format/currency"
import { DEFAULT_CURRENCY } from "@/add-os/utils/format/currency"

export interface CurrencyOption {
	code: CurrencyCode | string
	name: string
	symbol: string
	is_default?: boolean
}

export const useCurrencyStore = defineStore("currency", {
	state: () => ({
		currency: DEFAULT_CURRENCY as CurrencyCode | string,
		availableCurrencies: [
			{ code: "SYP", name: "ليرة سورية (SYP)", symbol: "ل.س" },
			{ code: "USD", name: "دولار أمريكي (USD)", symbol: "$" },
			{ code: "EUR", name: "يورو (EUR)", symbol: "€" }
		] as CurrencyOption[]
	}),
	actions: {
		async setCurrency(code: string, syncWithBackend = true): Promise<void> {
			this.currency = code
			if (syncWithBackend) {
				try {
					const { useAuthStore } = await import("@/stores/auth")
					const authStore = useAuthStore()
					if (authStore.isLogged) {
						const { patch } = await import("@/add-os/services/api")
						await patch("/api/v1/member/preferences/currency", {
							preferred_currency: code
						})
					}
				} catch {
					// Discard sync errors gracefully
				}
			}
		},
		async fetchCurrencies(): Promise<void> {
			try {
				const { get } = await import("@/add-os/services/api")
				const res = await get<{ data: Array<{ code: string; name: string; symbol: string; is_default?: boolean }> }>("/api/v1/currencies")
				if (res?.data?.length) {
					this.availableCurrencies = res.data.map(c => ({
						code: c.code,
						name: c.name,
						symbol: c.symbol,
						is_default: c.is_default
					}))
				}
			} catch {
				// Fallback to initial currencies
			}
		}
	},
	getters: {
		currentCurrencySymbol(state): string {
			const found = state.availableCurrencies.find(c => c.code === state.currency)
			return found ? found.symbol : state.currency
		},
		selectOptions(state): SelectOption[] {
			return state.availableCurrencies.map(c => ({
				label: `${c.symbol} - ${c.name}`,
				value: c.code
			}))
		}
	},
	persist: {
		pick: ["currency"]
	}
})

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useCurrencyStore, import.meta.hot))
}
