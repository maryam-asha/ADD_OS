<template>
	<dl class="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
		<template v-for="line in lines" :key="line.label">
			<dt class="text-neutral-500">{{ line.label }}</dt>
			<dd class="font-medium">{{ line.value }}</dd>
		</template>
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

/**
 * A provider request's submitted fields, read per type — what a reviewer
 * needs to see before approving (who, which plan, how many seats, how many
 * points, who pays), never the raw JSON.
 */
const props = defineProps<{
	request: ProviderRequest
	/** plan id → localized name, when the caller has the plan list. */
	planNames?: Record<number, string>
}>()

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
	const out: { label: string; value: string }[] = []
	const add = (key: string, value: string) => out.push({ label: t(`providerRequests.fields.${key}`), value })

	if (props.request.company) add("company", props.request.company.legal_name ?? `#${props.request.company.id}`)

	switch (props.request.type) {
		case "plan_assignment": {
			const planId = Number(p.plan_id)
			add("plan", props.planNames?.[planId] ?? `#${planId}`)
			add("seats", formatNumber(Number(p.seats ?? 0)))
			add("payer", p.payer ? t(`invoices.payerOptions.${String(p.payer)}`) : "—")
			add("autoRenew", yesNo(p.auto_renew))
			break
		}
		case "wallet_top_up":
			add("points", formatNumber(Number(p.points ?? 0)))
			add("payer", p.payer ? t(`invoices.payerOptions.${String(p.payer)}`) : "—")
			break
		case "company_member":
			add("name", text(p.name))
			add("phone", text(p.phone))
			add("doorAccess", yesNo(p.door_access_enabled ?? true))
			break
		case "company_admin":
			add("user", text(p.user_name ?? (p.user_id ? `#${String(p.user_id)}` : null)))
			break
		case "plan_design":
			add("planName", text(p.name))
			add("pricePoints", formatNumber(Number(p.price_points ?? 0)))
			add("durationDays", formatNumber(Number(p.duration_days ?? 0)))
			add("isSubscription", yesNo(p.is_subscription))
			break
	}

	return out
})
</script>
