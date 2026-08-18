/**
 * Only `user_id`, `door_access_enabled`, `is_admin` are confirmed — they are the
 * exact fields in Add Company Member's POST body, and the collection has no
 * GET/List response example to confirm anything else (e.g. a nested user name
 * or phone). Do NOT add a `name`/`user` field here without verifying a real
 * response first — the members table (Task 15) renders `user_id` directly for
 * this reason, and that limitation is called out again there.
 */
export interface CompanyMember {
	user_id: number
	door_access_enabled: boolean
	is_admin: boolean
}

export interface AddCompanyMemberPayload extends Record<string, unknown> {
	user_id: number
	door_access_enabled: boolean
	is_admin: boolean
}

export interface UpdateDoorAccessPayload extends Record<string, unknown> {
	door_access_enabled: boolean
}

export interface UpdateAdminFlagPayload extends Record<string, unknown> {
	is_admin: boolean
}
