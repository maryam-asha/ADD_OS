<template>
	<dl class="request-facts">
		<div v-for="line in lines" :key="line.label" class="request-facts__tile">
			<dt class="request-facts__label">
				<Icon :name="line.icon" :size="14" aria-hidden="true" />
				{{ line.label }}
			</dt>
			<dd class="request-facts__value">{{ line.value }}</dd>
		</div>
	</dl>
</template>

<script setup lang="ts">
import type { Bilingual } from "@/add-os/components/resource/field-types"
import type { ProviderRequest } from "@/add-os/modules/providers/types"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * A provider request's submitted fields, read per type — what a reviewer
 * needs to see before approving (who, which plan, how many seats, how many
 * points, who pays), never the raw JSON. One tile per field, label above
 * value, so each reads on its own.
 */
const props = withDefaults(
	defineProps<{
		request: ProviderRequest
		/** plan id → localized name, when the caller has the plan list. */
		planNames?: Record<number, string>
		/** Off when the caller already shows the company elsewhere. */
		showCompany?: boolean
	}>(),
	{ planNames: undefined, showCompany: true }
)

const { t } = useI18n()

function text(value: unknown): string {
	if (value === null || value === undefined || value === "") return "—"
	if (typeof value === "object") return pickLocalized(value as Bilingual, currentLocale.value) || "—"
	return String(value)
}

function yesNo(value: unknown): string {
	return value ? t("common.yes") : t("common.no")
}

const lines = computed(() => {
	const p = props.request.payload ?? {}
	const out: { label: string; value: string; icon: string }[] = []
	const add = (key: string, value: string, icon: string) => out.push({ label: t(`providerRequests.fields.${key}`), value, icon })

	if (props.showCompany && props.request.company) add("company", props.request.company.legal_name ?? `#${props.request.company.id}`, "carbon:enterprise")

	switch (props.request.type) {
		case "plan_assignment": {
			const planId = Number(p.plan_id)
			add("plan", props.planNames?.[planId] ?? `#${planId}`, "carbon:catalog")
			add("seats", formatNumber(Number(p.seats ?? 0)), "carbon:user-multiple")
			add("payer", p.payer ? t(`invoices.payerOptions.${String(p.payer)}`) : "—", "carbon:money")
			add("autoRenew", yesNo(p.auto_renew), "carbon:renew")
			break
		}
		case "wallet_top_up":
			add("points", formatNumber(Number(p.points ?? 0)), "carbon:wallet")
			add("payer", p.payer ? t(`invoices.payerOptions.${String(p.payer)}`) : "—", "carbon:money")
			break
		case "company_member":
			add("name", text(p.name), "carbon:user")
			add("phone", text(p.phone), "carbon:phone")
			add("doorAccess", yesNo(p.door_access_enabled ?? true), "carbon:locked")
			break
		case "company_admin":
			add("user", text(p.user_name ?? (p.user_id ? `#${String(p.user_id)}` : null)), "carbon:user-admin")
			break
		case "plan_design":
			add("planName", text(p.name), "carbon:document")
			add("pricePoints", formatNumber(Number(p.price_points ?? 0)), "carbon:currency")
			add("durationDays", formatNumber(Number(p.duration_days ?? 0)), "carbon:calendar")
			add("isSubscription", yesNo(p.is_subscription), "carbon:renew")
			break
	}

	return out
})
</script>

<style scoped lang="scss">
.request-facts {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
	gap: var(--add-space-3);
	margin: 0;

	&__tile {
		display: flex;
		flex-direction: column;
		gap: var(--add-space-1);
		min-width: 0;
		padding: var(--add-space-3) var(--add-space-4);
		background: var(--add-surface-sunken);
		border: var(--add-border-width-hairline) solid var(--add-border);
		border-radius: var(--add-radius-default);
	}

	&__label {
		display: inline-flex;
		gap: var(--add-space-1);
		align-items: center;
		font-size: var(--add-font-size-caption);
		color: var(--add-text-secondary);
	}

	&__value {
		margin: 0;
		font-size: var(--add-font-size-body);
		font-weight: var(--add-font-weight-strong);
		color: var(--add-text-primary);
		overflow-wrap: anywhere;
	}
}
</style>
