// src/add-os/modules/access/types/access.ts

/**
 * Door locks and their gateways (ADD Core `devices` rows of type lock/gateway,
 * docs/decisions/qr-lock-unlock.md). `external_ref` is TTLock's own id
 * (lockId / gatewayId); `status` and the metadata figures come from the
 * TTLock account (`access:sync-devices`), never from this form.
 */
export type DeviceType = "lock" | "gateway"
export type DeviceStatus = "online" | "offline" | "faulted"

export interface DeviceMetadata {
	battery?: number | null
	battery_updated_at?: string | null
	has_gateway?: boolean
	lock_count?: number
	network_name?: string | null
	synced_at?: string
}

export interface Device {
	id: number
	branch_id: number
	space_id: number | null
	/** ADD Core has other device types; this module shows only locks and gateways. */
	type: DeviceType | string
	hardware_mac: string | null
	parent_device_id: number | null
	/** What the sticker at the door encodes; locks only. */
	qr_value: string | null
	external_ref: string | null
	metadata: DeviceMetadata | null
	status: DeviceStatus
}

export interface DevicePayload extends Record<string, unknown> {
	type: DeviceType
	branch_id: number | null
	space_id: number | null
	external_ref: string | null
	hardware_mac: string | null
	parent_device_id: number | null
}

/** One lock on the TTLock account, as the device form picks it. */
export interface TTLockAccountLock {
	lock_id: string
	name: string | null
	mac: string | null
	battery: number | null
	has_gateway: boolean
	linked_device_id: number | null
}

export interface TTLockAccountGateway {
	gateway_id: string
	name: string | null
	mac: string | null
	is_online: boolean
	lock_count: number
	network_name: string | null
	linked_device_id: number | null
}

export interface TTLockAccount {
	locks: TTLockAccountLock[]
	gateways: TTLockAccountGateway[]
}

export type AccessEventType = "unlock" | "lock" | "lock_auto" | "failed_attempt"
export type AccessEventChannel = "keypad_manual" | "qr_scan" | "reception_activation" | "app_remote" | "dashboard"

export interface AccessEvent {
	id: number
	occurred_at: string
	event_type: AccessEventType
	channel: AccessEventChannel
	device: { id: number; external_ref: string | null; space: { id: number; name: string } | null } | null
	actor: { id: number; name: string } | null
	grant: { id: number; source_type: AccessSourceType | null; booking_id: number | null; office_lease_id: number | null } | null
}

export type AccessGrantStatus = "issued" | "activated" | "expired" | "revoked"
export type AccessSourceType = "booking" | "tenancy"
export type AccessRevokeReason = "maintenance" | "cancellation" | "replaced" | "lease" | "staff"

/** A door code as staff see it — never the code itself. */
export interface AccessGrant {
	id: number
	status: AccessGrantStatus
	source_type: AccessSourceType | null
	booking_id: number | null
	office_lease_id: number | null
	grantee: { type: "user" | "company"; id: number; name: string | null }
	lock: { id: number; space: { id: number; name: string } | null }
	issued_at: string | null
	must_activate_by: string | null
	activated_at: string | null
	expires_at: string | null
	revoke_reason: AccessRevokeReason | null
	revoked_at: string | null
	revoked_by: { id: number; name: string } | null
}

/** `GET admin/reception/bookings/{id}/access-grant` — top-level, no `data`. */
export interface BookingAccessGrant {
	id: number
	status: AccessGrantStatus
	lock_id: number
	issued_at: string | null
	must_activate_by: string | null
	activated_at: string | null
	expires_at: string | null
	revoke_reason: AccessRevokeReason | null
}
