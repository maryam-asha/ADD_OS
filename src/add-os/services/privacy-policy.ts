// src/add-os/services/privacy-policy.ts
import { get, patch } from "./api"

export interface PrivacyPolicyContent {
	en: string
	ar: string
}

export interface PrivacyPolicy {
	content: PrivacyPolicyContent
	updated_at?: string | null
}

export interface PrivacyPolicyPayload {
	content: PrivacyPolicyContent
}

export interface PrivacyPolicyResponse {
	data?: PrivacyPolicy
	content?: PrivacyPolicyContent
	message?: string
}

const ENDPOINT = "/api/v1/admin/privacy-policy"

/**
 * Fetches the current Privacy Policy.
 * GET /api/v1/admin/privacy-policy
 */
export async function getPrivacyPolicy(): Promise<PrivacyPolicy> {
	const res = await get<PrivacyPolicyResponse>(ENDPOINT)
	if (res?.data?.content) {
		return {
			content: {
				en: res.data.content.en ?? "",
				ar: res.data.content.ar ?? ""
			},
			updated_at: res.data.updated_at
		}
	}
	if (res?.content) {
		return {
			content: {
				en: res.content.en ?? "",
				ar: res.content.ar ?? ""
			}
		}
	}
	return {
		content: {
			en: "",
			ar: ""
		}
	}
}

/**
 * Updates the Privacy Policy content.
 * PATCH /api/v1/admin/privacy-policy
 */
export async function updatePrivacyPolicy(content: PrivacyPolicyContent): Promise<PrivacyPolicyResponse> {
	const payload: PrivacyPolicyPayload = { content }
	return patch<PrivacyPolicyResponse>(ENDPOINT, payload)
}
