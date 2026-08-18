import { useMessage } from "naive-ui"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import type { Company, CompanyPayload, CompanyStatusPayload } from "@/add-os/modules/members/types/company"
import { ApiError } from "@/add-os/services/api"
import { createCompany, updateCompanyStatus } from "@/add-os/services/companies"

/**
 * Companies has no PUT/DELETE (confirmed in the Postman collection's own
 * description), so it doesn't fit useResourceMutations's create+update+remove
 * triplet. These two composables cover exactly the two mutations that exist,
 * mirroring useResourceMutations's own toast/rethrow shape without touching
 * that shared file or its existing consumers.
 */
export function useCompanyCreation(refetchRequests: () => Promise<void>, refetchCompanies: () => Promise<void>) {
	const message = useMessage()
	const { t } = useI18n()
	const isSubmitting = ref(false)

	async function submit(payload: CompanyPayload): Promise<Company> {
		isSubmitting.value = true
		try {
			const company = await createCompany(payload)
			message.success(t("companies.create.success"))
			await Promise.all([refetchRequests(), refetchCompanies()])
			return company
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

	return { submit, isSubmitting }
}

export function useCompanyStatusChange(refetchCompanies: () => Promise<void>) {
	const message = useMessage()
	const { t } = useI18n()
	const isSubmitting = ref(false)

	async function submit(id: number, payload: CompanyStatusPayload): Promise<void> {
		isSubmitting.value = true
		try {
			await updateCompanyStatus(id, payload)
			message.success(t("companies.changeStatus.success"))
			await refetchCompanies()
		} catch (caught) {
			if (!(caught instanceof ApiError)) throw caught
			if (caught.status === 403) message.error(t("resourceCrud.mutations.permissionError"))
			else message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
			throw caught
		} finally {
			isSubmitting.value = false
		}
	}

	return { submit, isSubmitting }
}
