<!-- src/add-os/modules/pricing/components/CouponDetailDrawer.vue -->
<!--
	One coupon's terms, and every use of it. A use whose booking was
	cancelled, rejected or never paid was given back — it reads "Refunded",
	and no longer counts against the limits.
-->
<template>
	<n-drawer v-model:show="show" :width="620" :placement="isRtl ? 'left' : 'right'">
		<n-drawer-content :title="drawerTitle" closable>
			<n-spin :show="loading">
				<n-alert v-if="failed" type="error" :bordered="false">{{ t("coupons.detail.loadError") }}</n-alert>
				<div v-if="coupon" class="flex flex-col gap-4 text-sm">
					<dl class="flex flex-col divide-y divide-[var(--border-color)]">
						<div v-for="field in fields" :key="field.label" class="flex justify-between gap-4 py-2">
							<dt class="text-secondary">{{ field.label }}</dt>
							<dd class="text-end font-medium">
								<bdi v-if="field.ltr" dir="ltr">{{ field.value }}</bdi>
								<template v-else>{{ field.value }}</template>
							</dd>
						</div>
					</dl>

					<h3 class="font-semibold">{{ t("coupons.detail.redemptions") }}</h3>
					<n-data-table remote size="small" :columns :data="redemptions" :loading="redemptionsLoading" :pagination :bordered="false" @update:page="loadRedemptions" />
				</div>
			</n-spin>
		</n-drawer-content>
	</n-drawer>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Coupon, CouponRedemption, CouponTarget } from "@/add-os/modules/pricing/types/coupon"
import { NAlert, NDataTable, NDrawer, NDrawerContent, NSpin, NTag } from "naive-ui"
import { computed, h, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { usePricingPickers } from "@/add-os/modules/pricing/composables/usePricingPickers"
import { discountLabel } from "@/add-os/modules/pricing/utils/coupon-form"
import { ApiError } from "@/add-os/services/api"
import { getCoupon, listCouponRedemptions } from "@/add-os/services/coupons"
import { formatDateTime, formatNumber } from "@/add-os/utils/format"

const props = defineProps<{ couponId: number | null }>()
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()
const pickers = usePricingPickers()
const isRtl = computed(() => currentLocale.value === "ar")

const PAGE_SIZE = 10
const coupon = ref<Coupon | null>(null)
const loading = ref(false)
const failed = ref(false)
const redemptions = ref<CouponRedemption[]>([])
const redemptionsLoading = ref(false)
const page = ref(1)
const total = ref(0)
const pagination = computed(() => ({ page: page.value, pageSize: PAGE_SIZE, itemCount: total.value }))

function yesNo(value: boolean): string {
	return t(value ? "coupons.detail.yes" : "coupons.detail.no")
}

/** `used / limit`, `∞` for no limit — the coupon's count, never a computed figure. */
function usage(c: Coupon): string {
	return `${formatNumber(c.used ?? 0)} / ${c.usage_limit === null ? "∞" : formatNumber(c.usage_limit)}`
}

function targetLabel(target: CouponTarget): string {
	const purpose = t(`pricing.purpose.${target.purpose}`)
	if (target.plan_id !== null) return `${purpose}: ${pickers.nameOf("plan_id", target.plan_id)}`
	if (target.space_id !== null) return `${purpose}: ${pickers.nameOf("space_id", target.space_id)}`
	if (target.space_type !== null) return `${purpose}: ${t(`spaces.spaceType.${target.space_type}`)}`
	if (target.event_id !== null) return `${purpose}: ${pickers.nameOf("event_id", target.event_id)}`
	return purpose
}

/** A coupon by its code; an offer, which has none, by its name. */
const drawerTitle = computed(() => {
	const c = coupon.value
	if (!c) return ""
	return c.code !== null ? t("coupons.detail.title", { code: c.code }) : t("coupons.detail.offerTitle", { name: c.name ? pickLocalized(c.name, currentLocale.value) : "" })
})

const fields = computed(() => {
	const c = coupon.value
	if (!c) return []
	const dash = "—"
	return [
		{ label: t("coupons.form.name"), value: c.name ? pickLocalized(c.name, currentLocale.value) || dash : dash },
		{ label: t("coupons.form.discount"), value: discountLabel(t, c) + (c.max_discount_points ? ` · ${t("coupons.detail.cap", { value: formatNumber(c.max_discount_points) })}` : "") },
		{ label: t("coupons.form.minAmount"), value: c.min_amount_points === null ? dash : formatNumber(c.min_amount_points) },
		// Whether it stacks on an offer means nothing for an offer itself.
		...(c.is_automatic ? [] : [{ label: t("coupons.form.combinable"), value: yesNo(c.combinable_with_offers) }]),
		{ label: t("coupons.form.usageLimit"), value: usage(c), ltr: true },
		{ label: t("coupons.form.perUserLimit"), value: c.per_user_limit === null ? t("coupons.form.unlimited") : formatNumber(c.per_user_limit) },
		{ label: t("coupons.form.newMembersOnly"), value: yesNo(c.new_members_only) },
		{ label: t("coupons.form.company"), value: c.company_id === null ? dash : pickers.nameOf("company_id", c.company_id) },
		{ label: t("coupons.form.users"), value: c.user_ids?.length ? c.user_ids.map(id => pickers.nameOf("user", id)).join("، ") : t("coupons.detail.everyone") },
		{ label: t("coupons.form.startsAt"), value: c.starts_at ? formatDateTime(c.starts_at) : dash },
		{ label: t("coupons.form.endsAt"), value: c.ends_at ? formatDateTime(c.ends_at) : dash },
		{ label: t("coupons.form.targets"), value: c.targets?.length ? c.targets.map(targetLabel).join(" · ") : t("coupons.detail.allPurchases") },
		{ label: t("coupons.detail.createdAt"), value: formatDateTime(c.created_at) }
	] as { label: string, value: string, ltr?: boolean }[]
})

/** Whichever record the use was spent on. */
function recordOf(row: CouponRedemption): string {
	const id = row.booking_id ?? row.walkin_session_id ?? row.event_attendee_id ?? row.payment_id
	return id === null ? "—" : `#${id}`
}

const columns = computed<DataTableColumns<CouponRedemption>>(() => [
	{
		title: t("coupons.redemption.member"),
		key: "user",
		render: row => (row.user ? h("div", { class: "flex flex-col" }, [h("span", row.user.name), h("bdi", { dir: "ltr", class: "text-xs text-secondary" }, row.user.phone)]) : "—")
	},
	{ title: t("coupons.redemption.purpose"), key: "purpose", render: row => t(`pricing.purpose.${row.purpose}`) },
	{ title: t("coupons.redemption.record"), key: "record", render: row => h("bdi", { dir: "ltr" }, recordOf(row)) },
	{ title: t("coupons.redemption.base"), key: "base_points", render: row => formatNumber(row.base_points) },
	{ title: t("coupons.redemption.discounted"), key: "points", render: row => `${formatNumber(row.points)} (${formatNumber(row.percent)}%)` },
	{ title: t("coupons.redemption.date"), key: "created_at", render: row => formatDateTime(row.created_at) },
	{
		title: t("coupons.redemption.state"),
		key: "counts",
		render: row => h(NTag, { "size": "small", "round": true, "bordered": false, "type": row.counts ? "success" : "default", "data-test": "redemption-state" }, { default: () => t(row.counts ? "coupons.redemption.used" : "coupons.redemption.refunded") })
	}
])

async function loadRedemptions(next = 1): Promise<void> {
	if (props.couponId === null) return
	page.value = next
	redemptionsLoading.value = true
	try {
		const result = await listCouponRedemptions(props.couponId, { page: next, per_page: PAGE_SIZE })
		redemptions.value = result.data
		total.value = result.meta.total
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		failed.value = true
	} finally {
		redemptionsLoading.value = false
	}
}

async function open(): Promise<void> {
	if (props.couponId === null) return
	coupon.value = null
	failed.value = false
	loading.value = true
	try {
		await pickers.load()
		coupon.value = await getCoupon(props.couponId)
		await loadRedemptions(1)
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		failed.value = true
	} finally {
		loading.value = false
	}
}

watch(() => [show.value, props.couponId] as const, ([visible]) => {
	if (visible) void open()
}, { immediate: true })
</script>
