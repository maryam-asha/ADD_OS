// src/add-os/modules/spatial/types/kiosk.ts

/** A reception kiosk device, bound to one coworking space. The server never returns its secret or pairing code here. */
export interface Kiosk {
	id: number
	name: string
	space_id: number
	is_active: boolean
	is_paired: boolean
	paired_at: string | null
	/** The last time one of its codes was accepted, the only sign of life a paired kiosk gives. */
	last_used_at: string | null
	created_at: string | null
}

export interface KioskPayload {
	name: string
	/** `null` only while the create form has no space chosen; the field is required. */
	space_id: number | null
	is_active: boolean
}

/** Returned once: the server keeps only a hash of the code. */
export interface IssuedPairingCode {
	pairing_code: string
	expires_at: string
}
