import type { SelectOption } from "naive-ui"
import type { CurrencyCode } from "@/add-os/utils/format/currency"
import { acceptHMRUpdate, defineStore } from "pinia"
import { DEFAULT_CURRENCY } from "@/add-os/utils/format/currency"

export interface CurrencyOption {
	code: CurrencyCode | string
	name: string
	symbol: string
	is_default?: boolean
    is_base?: boolean
}

/**
 * Currency is **read-only**, exactly as `themeName` is.
 *
 * The toolbar CurrencySwitch was removed on 2026-09-23 and `setCurrency()` went
 * with it, because it was the only write path — see docs/PHASE-3-DEAD-CONTROLS.md §F.
 * The store itself stays: `services/api.ts` reads `currency` at request time to
 * build the `currency` header the backend expects on every endpoint, so deleting
 * the store would break the whole API layer.
 *
 * Do not reintroduce a write path without a decision on what a staff-level
 * display-currency switch should mean for an admin dashboard.
 */
export const useCurrencyStore = defineStore("currency", {
	state: () => ({
		currency: DEFAULT_CURRENCY as CurrencyCode | string,
        currencyInitialized: false,
		availableCurrencies: [
			{ code: "SYP", name: "ليرة سورية (SYP)", symbol: "ل.س" },
			{ code: "USD", name: "دولار أمريكي (USD)", symbol: "$" },
			{ code: "EUR", name: "يورو (EUR)", symbol: "€" }
		] as CurrencyOption[],
		hasFetched: false,
		_fetchPromise: null as Promise<void> | null
	}),
	actions: {
		fetchCurrencies(force = false): Promise<void> {
			if (this.hasFetched && !force) return Promise.resolve()
			if (this._fetchPromise && !force) return this._fetchPromise

			this._fetchPromise = (async () => {
			try {
				const { get } = await import("@/add-os/services/api")
				const res = await get<{ data: Array<{ code: string; name: any; symbol: string; is_default?: boolean; is_base?: boolean }> }>("/api/v1/currencies")
				if (res?.data?.length) {
					this.availableCurrencies = res.data.map(c => ({
						code: c.code,
						name: typeof c.name === 'object' ? (c.name.ar || c.name.en) : c.name,
						symbol: c.symbol,
						is_default: c.is_default,
                        is_base: c.is_base
					}))
					const defaultCurrency = this.availableCurrencies.find(c => c.is_default) || this.availableCurrencies.find(c => c.is_base)
					if (defaultCurrency && (!this.currencyInitialized || force)) {
						this.currency = defaultCurrency.code
                        this.currencyInitialized = true
					}
					this.hasFetched = true
				}
			} catch {
				// Fallback to initial currencies
			} finally {
				this._fetchPromise = null
			}
			})()
			return this._fetchPromise
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
		pick: ["currency", "currencyInitialized"]
	}
})

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useCurrencyStore, import.meta.hot))
}
