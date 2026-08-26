import type { SettingValue } from "@/add-os/modules/settings/types/setting"
import { useMessage } from "naive-ui"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import { updateSetting } from "@/add-os/services/settings"

/**
 * The resource has exactly one mutation, and it does not fit
 * `useResourceMutations`: that composable's `update`/`remove` are typed
 * `(id: number, …)` while a setting is keyed by a dotted string, and there is no
 * `create` or `remove` to fill two of its three slots — the key set is fixed by
 * ADDCore's `SettingSeeder`. `useCurrencyMutations` is the existing precedent
 * for covering only the mutations that actually exist rather than filling the
 * shared triplet with rejecting stubs (see its own note on why
 * `ExchangeRatesPage` had to do exactly that).
 *
 * The error handling is deliberately identical to `useResourceMutations.run()`:
 * a 403 shows the fixed translated permission message rather than Laravel's raw
 * Gate string, and everything else falls back to the backend's own message.
 *
 * The one deviation, and the reason it is spelled out rather than copied: a 422
 * is TOASTED here instead of re-thrown. In every other resource a 422 carries
 * field-level `errors` that `ResourceFormDrawer` maps back onto the form field
 * that produced them — there is no drawer here, and the only field a settings
 * 422 can be about is `value`, whose shape rules `prepareSettingValue()` already
 * mirrors. A re-thrown 422 would therefore be swallowed in silence. The 422 that
 * can still reach this layer is the one client-side check that deliberately does
 * NOT mirror the server (`app.timezone`'s identifier list), and the operator has
 * to be told about it.
 */
export function useSettingMutations(refetch: () => Promise<void>) {
	const message = useMessage()
	const { t } = useI18n()
	const isSubmitting = ref(false)

	async function update(key: string, value: SettingValue) {
		isSubmitting.value = true
		try {
			const result = await updateSetting(key, value)
			message.success(t("settings.updateSuccess"))
			await refetch()
			return result
		} catch (caught) {
			if (!(caught instanceof ApiError)) throw caught
			if (caught.status === 403) message.error(t("resourceCrud.mutations.permissionError"))
			else message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
			throw caught
		} finally {
			isSubmitting.value = false
		}
	}

	return { update, isSubmitting }
}
