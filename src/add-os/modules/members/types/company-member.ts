export interface CompanyMemberUser {
	id: number
	name: string
	phone: string | null
}

export interface CompanyMember {
	id?: number
	user_id?: number
	user?: CompanyMemberUser | null
	door_access_enabled: boolean
	is_admin: boolean
	created_at?: string
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
