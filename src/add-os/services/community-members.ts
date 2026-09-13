import type { CommunityMember, CommunityMemberPayload } from "@/add-os/modules/community/types/community-member"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<CommunityMember, CommunityMemberPayload, CommunityMemberPayload>(
	"/api/v1/admin/community-members"
)

export const listCommunityMembers = api.list
export const getCommunityMember = api.getById
export const createCommunityMember = api.create
export const updateCommunityMember = api.update
export const removeCommunityMember = api.remove
