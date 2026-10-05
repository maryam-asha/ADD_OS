import type { ComposerTranslation } from "vue-i18n"
import type { Bilingual } from "@/add-os/components/resource/field-types"
import type { Coupon, CouponPayload, PricingPurpose, TargetItemKey } from "@/add-os/modules/pricing/types/coupon"
import type { SpaceType } from "@/add-os/modules/spatial/types/space"
import { formatNumber } from "@/add-os/utils/format"
import { couponToPayload } from "./coupon-payload"

/** `20%` or `50 points` — the coupon's own terms, never a computed saving. */
export function discountLabel(t: ComposerTranslation, coupon: Pick<Coupon, "discount_type" | "discount_value">): string {
	return coupon.discount_type === "percentage"
		? t("coupons.detail.discountPercent", { value: formatNumber(coupon.discount_value) })
		: t("coupons.detail.discountPoints", { value: formatNumber(coupon.discount_value) })
}

export interface TargetRow {
	purpose: PricingPurpose | null
	itemKey: TargetItemKey | null
	itemValue: number | string | null
}

/**
 * The form's own model. The two `*_unlimited` flags exist so "no limit"
 * (`null`) is a deliberate choice and never the same thing as an empty box —
 * `per_user_limit` left out would fall back to 1 on the server.
 */
export interface CouponForm extends Omit<CouponPayload, "targets"> {
	usage_unlimited: boolean
	per_user_unlimited: boolean
	targets: TargetRow[]
}

export function emptyCouponForm(): CouponForm {
	return {
		code: "",
		name: { ar: "", en: "" },
		description: { ar: "", en: "" },
		discount_type: "percentage",
		discount_value: 10,
		max_discount_points: null,
		min_amount_points: null,
		combinable_with_offers: true,
		usage_limit: null,
		usage_unlimited: true,
		per_user_limit: 1,
		per_user_unlimited: false,
		new_members_only: false,
		company_id: null,
		starts_at: null,
		ends_at: null,
		is_active: true,
		targets: [],
		user_ids: []
	}
}

const ITEM_KEYS: TargetItemKey[] = ["plan_id", "space_id", "space_type", "event_id"]

export function couponToForm(coupon: Coupon): CouponForm {
	const payload = couponToPayload(coupon)
	return {
		...payload,
		name: payload.name ?? { ar: "", en: "" },
		description: payload.description ?? { ar: "", en: "" },
		usage_unlimited: payload.usage_limit === null,
		per_user_unlimited: payload.per_user_limit === null,
		targets: payload.targets.map((target) => {
			const itemKey = ITEM_KEYS.find(key => target[key] !== null) ?? null
			return { purpose: target.purpose, itemKey, itemValue: itemKey ? target[itemKey] : null }
		})
	}
}

function bilingualOrNull(value: Bilingual | null): Bilingual | null {
	return value && (value.ar.trim() || value.en.trim()) ? value : null
}

function emptyToNull<T>(value: T | "" | undefined): T | null {
	return value === "" || value === undefined ? null : value
}

/** The full body every write sends — nothing left out, nothing derived. */
export function formToPayload(form: CouponForm): CouponPayload {
	return {
		code: form.code.trim().toUpperCase(),
		name: bilingualOrNull(form.name),
		description: bilingualOrNull(form.description),
		discount_type: form.discount_type,
		discount_value: form.discount_value,
		max_discount_points: form.discount_type === "percentage" ? emptyToNull(form.max_discount_points) : null,
		min_amount_points: emptyToNull(form.min_amount_points),
		combinable_with_offers: form.combinable_with_offers,
		usage_limit: form.usage_unlimited ? null : emptyToNull(form.usage_limit),
		per_user_limit: form.per_user_unlimited ? null : emptyToNull(form.per_user_limit),
		new_members_only: form.new_members_only,
		company_id: emptyToNull(form.company_id),
		starts_at: emptyToNull(form.starts_at),
		ends_at: emptyToNull(form.ends_at),
		is_active: form.is_active,
		targets: form.targets
			.filter((row): row is TargetRow & { purpose: PricingPurpose } => row.purpose !== null)
			.map(row => ({
				purpose: row.purpose,
				plan_id: row.itemKey === "plan_id" ? (row.itemValue as number) : null,
				space_id: row.itemKey === "space_id" ? (row.itemValue as number) : null,
				space_type: row.itemKey === "space_type" ? (row.itemValue as SpaceType) : null,
				event_id: row.itemKey === "event_id" ? (row.itemValue as number) : null
			})),
		user_ids: [...form.user_ids]
	}
}

/**
 * A 422's `errors`, sorted by where the form shows them. Nothing is dropped:
 * a key the form has no place for goes to `other`, shown at the top.
 */
export function groupErrors(errors: Record<string, string[]>, known: string[]) {
	const fields: Record<string, string[]> = {}
	const targets: Record<number, string[]> = {}
	const other: string[] = []
	for (const [key, messages] of Object.entries(errors)) {
		const target = /^targets\.(\d+)(?:\..+)?$/.exec(key)
		if (target) {
			const index = Number(target[1])
			targets[index] = [...(targets[index] ?? []), ...messages]
		} else if (/^user_ids\.\d+$/.test(key)) {
			fields.user_ids = [...(fields.user_ids ?? []), ...messages]
		} else if (known.includes(key)) {
			fields[key] = messages
		} else {
			other.push(...messages)
		}
	}
	return { fields, targets, other }
}
