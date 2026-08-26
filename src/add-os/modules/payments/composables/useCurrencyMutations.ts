import type { Currency, CurrencyPayload, CurrencyUpdatePayload } from "@/add-os/modules/payments/types/currency"
import { useMessage } from "naive-ui"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import { createCurrency, updateCurrency, updateCurrencyStatus } from "@/add-os/services/currencies"

/**
 * Currencies have three mutations, and none of them fits
 * `useResourceMutations`: its `update`/`remove` are typed `(id: number, …)`
 * while this resource is keyed by a `code` string, there is no destroy route to
 * fill `remove` with, and `updateStatus` is a fourth verb the shared triplet has
 * no slot for. `useCompanyMutations` is the existing precedent for exactly this
 * — cover the mutations that actually exist, mirroring `useResourceMutations`'s
 * toast/rethrow shape, without touching that shared file or its consumers.
 *
 * Filling `remove` with a rejecting stub was the alternative, and it is what
 * `ExchangeRatesPage` already had to do; that page's own comment ("never
 * invoked, only present to satisfy useResourceMutations' shared shape") is the
 * argument against repeating it.
 *
 * The error handling is deliberately identical to `useResourceMutations.run()`:
 * a 422 carries field-level `errors` that `ResourceFormDrawer` maps onto its own
 * form, so it is re-thrown rather than toasted and never shown twice; a 403
 * shows the fixed translated message rather than Laravel's raw Gate string.
 */
function useMutationRunner(refetch: () => Promise<void>) {
	const message = useMessage()
	const { t } = useI18n()
	const isSubmitting = ref(false)

	async function run<R>(action: () => Promise<R>, successMessage: string): Promise<R> {
		isSubmitting.value = true
		try {
			const result = await action()
			message.success(successMessage)
			await refetch()
			return result
		} catch (caught) {
			if (!(caught instanceof ApiError)) throw caught
			if (caught.status === 422) throw caught
			if (caught.status === 403) message.error(t("resourceCrud.mutations.permissionError"))
			else message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
			throw caught
		} finally {
			isSubmitting.value = false
		}
	}

	return { run, isSubmitting }
}

export function useCurrencyMutations(refetch: () => Promise<void>) {
	const { t } = useI18n()
	const form = useMutationRunner(refetch)
	const status = useMutationRunner(refetch)

	/**
	 * Two independent runners, not one: a row's status switch and the create/edit
	 * drawer can be in flight at the same moment, and sharing `isSubmitting`
	 * would put the drawer's submit button into a spinner because someone
	 * flipped an unrelated row.
	 */
	return {
		create: (payload: CurrencyPayload): Promise<Currency> => form.run(() => createCurrency(payload), t("currencies.create.success")),
		update: (code: string, payload: CurrencyUpdatePayload) => form.run(() => updateCurrency(code, payload), t("currencies.edit.success")),
		updateStatus: (code: string, isActive: boolean) =>
			status.run(() => updateCurrencyStatus(code, { is_active: isActive }), t(isActive ? "currencies.status.activated" : "currencies.status.deactivated")),
		isSubmitting: form.isSubmitting,
		isStatusSubmitting: status.isSubmitting
	}
}
