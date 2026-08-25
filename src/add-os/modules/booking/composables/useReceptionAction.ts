import type { MessageResponse } from "@/add-os/services/resource-factory"
import { useMessage } from "naive-ui"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"

export type FieldErrors = Record<string, string[]>

/**
 * Runs one reception-desk command and reports whether it worked.
 *
 * `useResourceMutations` is the equivalent for CRUD screens, and this
 * deliberately does not reuse it: that composable is shaped around
 * create/update/remove and re-throws so `ResourceFormDrawer` can catch. Here
 * every caller is a row button or a small modal asking one question — "did it
 * work, so can I close?" — and a re-throw would mean a try/catch around every
 * button handler that does nothing but swallow.
 *
 * So this returns `false` instead of throwing, for ApiErrors only. Anything
 * that is not an ApiError is a bug in our own code, not a server answer, and
 * still propagates.
 *
 * Error handling otherwise matches `useResourceMutations` exactly, on purpose:
 *
 *  - 403 shows the fixed translated permission line, never Laravel's raw
 *    Gate-denial text.
 *  - 422 naming fields goes to `onFieldErrors` and is NOT toasted, so it isn't
 *    said twice — but only if the caller passed a handler. A dialog with no
 *    field to put it on toasts instead of showing nothing.
 *  - everything else surfaces the server's own message. That matters more here
 *    than on a CRUD screen: 409s ("This booking is not awaiting approval.",
 *    "This booking or session has already been paid.") are routine at a
 *    reception desk, and the server's wording is the whole explanation.
 */
export function useReceptionAction(refetch: () => Promise<void>) {
	const message = useMessage()
	const { t } = useI18n()
	const isSubmitting = ref(false)

	async function run(action: () => Promise<MessageResponse>, successMessage: string, onFieldErrors?: (errors: FieldErrors) => void): Promise<boolean> {
		isSubmitting.value = true
		try {
			await action()
			message.success(successMessage)
			await refetch()
			return true
		} catch (caught) {
			if (!(caught instanceof ApiError)) throw caught

			const fieldErrors = caught.status === 422 ? caught.data?.errors : undefined
			if (fieldErrors && onFieldErrors) {
				onFieldErrors(fieldErrors)
			} else if (caught.status === 403) {
				message.error(t("resourceCrud.mutations.permissionError"))
			} else {
				message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
			}

			return false
		} finally {
			isSubmitting.value = false
		}
	}

	return { run, isSubmitting }
}
