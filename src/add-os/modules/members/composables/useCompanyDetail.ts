import type { Company } from "@/add-os/modules/members/types/company"
import type {
	AddCompanyMemberPayload,
	CompanyMember,
	UpdateAdminFlagPayload,
	UpdateDoorAccessPayload
} from "@/add-os/modules/members/types/company-member"
import { ref } from "vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { ApiError } from "@/add-os/services/api"
import { getCompany } from "@/add-os/services/companies"
import { createCompanyMembersApi } from "@/add-os/services/company-members"
import { listUsers } from "@/add-os/services/users"

/**
 * The one shared fetch/mutate surface for a single company: its own record,
 * its members, and the user list needed to add one. Every consumer of company
 * data — the detail panel, the shared AddCompanyMemberDialog, anything future —
 * calls this instead of writing its own fetch logic.
 */
export function useCompanyDetail(companyId: number) {
	const company = ref<Company | null>(null)
	const isLoadingCompany = ref(true)
	const companyError = ref<ApiError | null>(null)

	async function refetchCompany() {
		isLoadingCompany.value = true
		companyError.value = null
		try {
			company.value = await getCompany(companyId)
		} catch (caught) {
			if (!(caught instanceof ApiError)) throw caught
			companyError.value = caught
			company.value = null
		} finally {
			isLoadingCompany.value = false
		}
	}
	refetchCompany()

	const membersApi = createCompanyMembersApi(companyId)
	const {
		data: members,
		isLoading: isLoadingMembers,
		error: membersError,
		refetch: refetchMembers
	} = useResourceList<CompanyMember>(membersApi.list)

	const { data: users, isLoading: isLoadingUsers } = useResourceList(listUsers)

	async function addMember(payload: AddCompanyMemberPayload) {
		const member = await membersApi.add(payload)
		await refetchMembers()
		return member
	}

	async function setDoorAccess(userId: number, payload: UpdateDoorAccessPayload) {
		await membersApi.updateDoorAccess(userId, payload)
		await refetchMembers()
	}

	async function setAdminFlag(userId: number, payload: UpdateAdminFlagPayload) {
		await membersApi.updateAdminFlag(userId, payload)
		await refetchMembers()
	}

	async function removeMember(userId: number) {
		await membersApi.remove(userId)
		await refetchMembers()
	}

	return {
		company,
		isLoadingCompany,
		companyError,
		refetchCompany,
		members,
		isLoadingMembers,
		membersError,
		refetchMembers,
		users,
		isLoadingUsers,
		addMember,
		setDoorAccess,
		setAdminFlag,
		removeMember
	}
}
