import type { Membership, MembershipActivationPayload } from "@/add-os/modules/members/types/membership"
import { post } from "./api"

const BASE = "/api/v1/admin/memberships"

/**
 * Activates a plan for a member or company with no wallet debit.
 *
 * Admin-only on the backend (`role:admin`, not `admin|operations`), so an
 * operations account gets a 403 here — the page gates the control the same
 * way rather than letting the request be the first thing that says no.
 *
 * There is deliberately no list/update/delete counterpart: the backend
 * exposes only `store` today, so a `createResourceApi` factory would
 * manufacture three endpoints that 404.
 */
export async function activateMembership(payload: MembershipActivationPayload): Promise<Membership> {
	const res = await post<{ data: Membership }>(BASE, payload)
	return res.data
}
