/**
 * Individual member — a user with role "member" who self-registered from
 * the Flutter app. Distinct from system users (admin/operations) who are
 * created by an admin via UsersPage.
 *
 * The wire shape is identical to `UserResource`: we re-use the same API
 * endpoint (`GET /api/v1/admin/users?role=member`) and the same backend
 * resource class. The separate type exists so that call sites dealing with
 * members cannot accidentally pass a staff user, and vice-versa.
 */

import type { UserCompanyAffiliation, UserStatus } from "@/add-os/modules/system/types/user"

export type { UserStatus as MemberStatus }

export interface MemberPersonalProfile {
	bio: string | null
	city: string | null
	avatar_url: string | null
	gender: "male" | "female" | null
}

export interface MemberProfessionalProfile {
	job_title: string | null
	company_name: string | null
	industry: string | null
}

export interface MemberProfileLinks {
	linkedin_url: string | null
	instagram_url: string | null
	behance_url: string | null
	website_url: string | null
}

export interface Member {
	id: number
	name: string
	phone: string
	email: string
	preferred_language: string
	preferred_currency: string
	status: UserStatus
	roles: string[]
	companies?: UserCompanyAffiliation[]
	personal_profile?: MemberPersonalProfile | null
	professional_profile?: MemberProfessionalProfile | null
	profile_links?: MemberProfileLinks | null
}

/** Wallet balance for a member — from `GET /api/v1/admin/reception/wallet-balance?user_id={id}` */
export interface MemberWalletBalance {
	owner_type: "user"
	owner_id: number
	owner_name: string
	owner_phone: string | null
	status?: string
	general_balance: string
	currency: string
	converted_balance?: string | null
	display_currency?: string
}

/** An active co-working session (booking or walk-in) belonging to a member */
export interface MemberActiveSession {
	id: number
	type: "booking" | "walkin"
	space_id: number
	space_type: string | null
	user_id: number
	user_name: string | null
	checked_in_at: string
	is_overdue: boolean
}

/** Payload to change a member's account status */
export interface UpdateMemberStatusPayload {
	status: UserStatus
	reason?: string
}
