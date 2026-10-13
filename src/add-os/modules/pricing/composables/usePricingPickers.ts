import type { SelectOption } from "naive-ui"
import type { Ref } from "vue"
import type { TargetItemKey } from "@/add-os/modules/pricing/types/coupon"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { SPACE_TYPES } from "@/add-os/modules/spatial/types/space"
import { listCompanies } from "@/add-os/services/companies"
import { listEvents } from "@/add-os/services/events"
import { listPlans } from "@/add-os/services/plans"
import { listSpaces } from "@/add-os/services/spaces"
import { listUsers } from "@/add-os/services/users"

/**
 * The option lists a coupon is written against, from the endpoints that
 * already exist: members (`admin/users?role=member`, unpaginated), companies,
 * plans, spaces, events, and the known space types. Loaded once per
 * instance, on first open.
 */
export interface PricingPickers {
	load: () => Promise<void>
	users: Ref<SelectOption[]>
	companies: Ref<SelectOption[]>
	plans: Ref<SelectOption[]>
	spaces: Ref<SelectOption[]>
	events: Ref<SelectOption[]>
	spaceTypes: SelectOption[]
	optionsFor: (key: TargetItemKey) => SelectOption[]
	nameOf: (key: TargetItemKey | "company_id" | "user", id: number | string) => string
}

/** Annotated: the inferred type (Naive option style props included) is too long for tsc to emit. */
export function usePricingPickers(): PricingPickers {
	const { t } = useI18n()
	const users = ref<SelectOption[]>([])
	const companies = ref<SelectOption[]>([])
	const plans = ref<SelectOption[]>([])
	const spaces = ref<SelectOption[]>([])
	const events = ref<SelectOption[]>([])
	const spaceTypes: SelectOption[] = SPACE_TYPES.map(type => ({ label: t(`spaces.spaceType.${type}`), value: type }))
	let loaded: Promise<void> | null = null

	function load(): Promise<void> {
		loaded ??= (async () => {
			const locale = currentLocale.value
			const [u, c, p, s, e] = await Promise.all([listUsers({ role: "member" }), listCompanies(), listPlans(), listSpaces(), listEvents()])
			users.value = u.map(user => ({ label: `${user.name} · ${user.phone}`, value: user.id }))
			companies.value = c.map(company => ({ label: company.legal_name, value: company.id }))
			plans.value = p.map(plan => ({ label: pickLocalized(plan.name, locale), value: plan.id }))
			spaces.value = s.map(space => ({ label: space.name ? pickLocalized(space.name, locale) : `#${space.id}`, value: space.id }))
			events.value = e.map(event => ({ label: pickLocalized(event.title, locale), value: event.id }))
		})().catch((error: unknown) => {
			// A failed load may be retried on the next open.
			loaded = null
			throw error
		})
		return loaded
	}

	function optionsFor(key: TargetItemKey): SelectOption[] {
		return { plan_id: plans.value, space_id: spaces.value, space_type: spaceTypes, event_id: events.value }[key]
	}

	/** A name for an id, or `#id` when the list does not have it. */
	function nameOf(key: TargetItemKey | "company_id" | "user", id: number | string): string {
		const list = key === "company_id" ? companies.value : key === "user" ? users.value : optionsFor(key)
		return String(list.find(option => option.value === id)?.label ?? `#${id}`)
	}

	return { load, users, companies, plans, spaces, events, spaceTypes, optionsFor, nameOf }
}
