import { useMessage } from "naive-ui"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"

interface MutationMessages {
	createSuccess: string
	updateSuccess: string
	deleteSuccess: string
}

export function useResourceMutations<T, CreatePayload, UpdatePayload>(
	api: {
		create: (payload: CreatePayload) => Promise<T>
		update: (id: number, payload: UpdatePayload) => Promise<{ message?: string }>
		remove: (id: number) => Promise<{ message?: string }>
	},
	refetch: () => Promise<void>,
	messages: MutationMessages
) {
	const message = useMessage()
	const { t } = useI18n()
	const isSubmitting = ref(false)

	/**
	 * A 422 carries field-level `errors` the caller (ResourceFormDrawer) maps
	 * onto its own form — re-thrown, not toasted, so it isn't shown twice.
	 * Everything else (403, 5xx, network) is this composable's job to surface,
	 * since it's the layer that actually runs inside a component's Naive UI
	 * context (api.ts, one layer down, cannot call useMessage() at all).
	 */
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
			message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
			throw caught
		} finally {
			isSubmitting.value = false
		}
	}

	return {
		create: (payload: CreatePayload) => run(() => api.create(payload), messages.createSuccess),
		update: (id: number, payload: UpdatePayload) => run(() => api.update(id, payload), messages.updateSuccess),
		remove: (id: number) => run(() => api.remove(id), messages.deleteSuccess),
		isSubmitting
	}
}
