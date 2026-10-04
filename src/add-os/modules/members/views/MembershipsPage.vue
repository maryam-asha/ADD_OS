<!-- src/add-os/modules/members/views/MembershipsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.memberships") }}</h1>
			<p>{{ t("memberships.description") }}</p>
		</div>

		<!--
			Activation is admin-only on the backend (`role:admin`, not the shared
			`admin|operations` group). Saying so here is better than letting an
			operations account fill the form and collect a 403 on submit.
		-->
		<n-alert v-if="!canActivate" type="warning" :title="t('memberships.adminOnly')" />

		<template v-else>
			<n-alert v-if="loadError" type="error" :title="t('memberships.loadError')" />

			<n-card>
				<div class="flex flex-col gap-4">
					<div class="flex items-center gap-2 text-sm font-bold">
						<Icon name="carbon:license" :size="18" />
						<span>{{ t("memberships.activate.title") }}</span>
					</div>

					<p class="text-xs text-secondary">{{ t("memberships.activate.hint") }}</p>

					<n-form :model="form" label-placement="top">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<n-form-item path="owner_type" :label="t('memberships.activate.ownerType')">
								<n-select v-model:value="form.owner_type" :options="ownerTypeOptions" @update:value="onOwnerTypeChange" />
							</n-form-item>

							<n-form-item path="owner_id" :label="ownerLabel">
								<n-select
									v-model:value="form.owner_id"
									:options="ownerOptions"
									:loading="ownersLoading"
									:placeholder="ownerPlaceholder"
									filterable
									clearable
								/>
							</n-form-item>
						</div>

						<n-form-item path="plan_id" :label="t('memberships.activate.plan')">
							<n-select
								v-model:value="form.plan_id"
								:options="planOptions"
								:loading="plansLoading"
								:placeholder="t('memberships.activate.selectPlan')"
								filterable
								clearable
							/>
						</n-form-item>

						<!--
							A subscription holds seats in its branch's co-working pool for
							its whole period, while its plan is open. The branch defaults on
							the server (the company's, else the member's home branch, else
							the default one); a company buys as many seats as it needs.
						-->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<n-form-item path="branch_id" :label="t('memberships.activate.branch')">
								<n-select
									v-model:value="form.branch_id"
									:options="branchOptions"
									:placeholder="t('memberships.activate.branchDefault')"
									clearable
								/>
							</n-form-item>

							<n-form-item v-if="form.owner_type === 'company'" path="seats" :label="t('memberships.activate.seats')">
								<n-input-number v-model:value="form.seats" :min="1" :max="1000" class="w-full" />
							</n-form-item>
						</div>

						<!--
							A Dedicated Desk plan is tied to specific desks of the branch,
							one per seat at most. Optional here: a desk can be tied later.
							Only desks nobody holds are offered; the server re-checks.
						-->
						<n-form-item
							v-if="isDedicatedPlan"
							path="seat_desk_ids"
							:label="t('memberships.activate.desks')"
							:validation-status="tooManyDesks ? 'error' : undefined"
							:feedback="tooManyDesks ? t('memberships.activate.desksTooMany', { seats: formatNumber(requestedSeats) }) : undefined"
						>
							<n-select
								v-model:value="form.seat_desk_ids"
								multiple
								clearable
								:options="deskOptions"
								:loading="desksLoading"
								:disabled="previewBranchId === null"
								:placeholder="previewBranchId === null ? t('memberships.activate.desksPickBranch') : t('memberships.activate.desksPlaceholder')"
							/>
						</n-form-item>
					</n-form>

					<!--
						The branch's co-working seats over the plan's period, from the
						server's own count — so a sale that would not fit is visible
						before it is refused.
					-->
					<div v-if="poolPreview" class="flex flex-col gap-1 p-3 rounded-lg border border-black/5 text-xs" :class="fitsPool ? 'bg-neutral-50' : 'add-pool-short'">
						<span class="font-semibold">{{ t("memberships.activate.poolTitle") }}</span>
						<span class="add-numeric">
							{{ t("memberships.activate.poolNow", { free: formatNumber(poolPreview.free_now), seats: formatNumber(poolPreview.capacity_now) }) }}
							· {{ t("memberships.activate.poolFewest", { free: formatNumber(poolPreview.min_free), days: formatNumber(previewDays) }) }}
						</span>
						<span v-if="!fitsPool">{{ t("memberships.activate.poolShort", { seats: formatNumber(requestedSeats) }) }}</span>
					</div>
					<p v-else-if="form.owner_type === 'user' && form.branch_id === null" class="text-xs text-secondary">
						{{ t("memberships.activate.poolHomeBranch") }}
					</p>

					<div class="flex items-center gap-3">
						<n-switch v-model:value="form.override_capacity" />
						<div class="flex flex-col">
							<span class="text-sm">{{ t("memberships.activate.override") }}</span>
							<span class="text-xs text-secondary">{{ t("memberships.activate.overrideHint") }}</span>
						</div>
					</div>

					<!--
						The chosen plan's terms, read straight off the row already in
						hand. Activation grants a real subscription and debits nothing,
						so the operator should see what they are about to hand over
						before they hand it over.
					-->
					<div v-if="selectedPlan" class="flex flex-col gap-2 p-3 bg-neutral-50 rounded-lg border border-black/5">
						<div class="flex items-center justify-between gap-2">
							<span class="text-sm font-bold">{{ pickLocalized(selectedPlan.name, locale) }}</span>
							<n-tag v-if="!selectedPlan.is_public" size="small" round type="warning">
								{{ t("packages.visibility.private") }}
							</n-tag>
						</div>

						<div class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-secondary">
							<span class="add-numeric">
								{{ t("memberships.activate.durationDays", { days: formatNumber(selectedPlan.duration_days) }) }}
							</span>
							<span v-if="selectedPlan.access_window_start && selectedPlan.access_window_end" class="add-numeric">
								{{ t("memberships.activate.windowLabel") }}
								{{ formatClockTime(selectedPlan.access_window_start) }} – {{ formatClockTime(selectedPlan.access_window_end) }}
							</span>
							<span v-else>{{ t("memberships.activate.windowLabel") }} {{ t("packages.anyTime") }}</span>
						</div>

						<!--
							Stated plainly because it is the point of this screen and the
							one thing that differs from a member buying the plan
							themselves: nothing is deducted from anyone's wallet.
						-->
						<div class="flex items-start gap-2 text-xs">
							<Icon name="carbon:information" :size="14" class="shrink-0 mt-px" />
							<span>{{ t("memberships.activate.noCharge") }}</span>
						</div>
					</div>

					<div class="flex justify-end">
						<n-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="handleSubmit">
							{{ t("memberships.activate.submit") }}
						</n-button>
					</div>
				</div>
			</n-card>

			<DedicatedDesksCard ref="desksCard" />
		</template>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { CoworkingPool } from "@/add-os/modules/booking/types/coworking"
import type { MembershipActivationPayload, MembershipOwnerType, SeatPoolFullError } from "@/add-os/modules/members/types/membership"
import type { Plan } from "@/add-os/modules/plans/types/plan"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { SeatDesk } from "@/add-os/modules/spatial/types/seat-desk"
import { NAlert, NButton, NCard, NForm, NFormItem, NInputNumber, NSelect, NSwitch, NTag, useMessage } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { canActivateMemberships } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import DedicatedDesksCard from "@/add-os/modules/members/components/DedicatedDesksCard.vue"
import { ApiError } from "@/add-os/services/api"
import { listBranches } from "@/add-os/services/branches"
import { listCompanies } from "@/add-os/services/companies"
import { getCoworkingPool } from "@/add-os/services/coworking"
import { listMembers } from "@/add-os/services/members"
import { activateMembership } from "@/add-os/services/memberships"
import { listPlans } from "@/add-os/services/plans"
import { listSeatsDesks } from "@/add-os/services/seats-desks"
import { formatClockTime, formatDateTime, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const locale = currentLocale

const submitting = ref(false)
const plansLoading = ref(false)
const ownersLoading = ref(false)
const loadError = ref(false)

const plans = ref<Plan[]>([])
const desksCard = ref<InstanceType<typeof DedicatedDesksCard> | null>(null)
const memberOptions = ref<SelectOption[]>([])
const companyOptions = ref<SelectOption[]>([])

const canActivate = computed(() => canActivateMemberships())

const form = ref<{
	owner_type: MembershipOwnerType
	owner_id: number | null
	plan_id: number | null
	branch_id: number | null
	seats: number | null
	override_capacity: boolean
	seat_desk_ids: number[]
}>({
	owner_type: "user",
	owner_id: null,
	plan_id: null,
	branch_id: null,
	seats: 1,
	override_capacity: false,
	seat_desk_ids: []
})

// ---------------------------------------------------------------
// Co-working seats (backend docs/decisions/coworking-seat-pool.md)
// ---------------------------------------------------------------

const branches = ref<Branch[]>([])
const companyBranch = ref(new Map<number, number>())

const branchOptions = computed<SelectOption[]>(() =>
	branches.value.map(branch => ({ value: branch.id, label: pickLocalized(branch.name, locale.value) }))
)

/** A member's own subscription is one seat; a company's is what it buys. */
const requestedSeats = computed(() => (form.value.owner_type === "company" ? (form.value.seats ?? 1) : 1))

/**
 * The branch the seats would be held in, when it is known here: the one
 * chosen, else the company's own. A member's home branch is the server's to
 * resolve, so without a choice there is nothing to preview.
 */
const previewBranchId = computed(() => {
	if (form.value.branch_id !== null) return form.value.branch_id
	if (form.value.owner_type === "company" && form.value.owner_id !== null) {
		return companyBranch.value.get(form.value.owner_id) ?? null
	}
	return null
})

/** The pool is read at most two months ahead — the server's own limit. */
const previewDays = computed(() => {
	const plan = plans.value.find(candidate => candidate.id === form.value.plan_id)
	return Math.min(plan?.duration_days ?? 30, 62)
})

const poolPreview = ref<CoworkingPool | null>(null)

/** Whether the server's count leaves room for these seats; the server still decides. */
const fitsPool = computed(() => poolPreview.value === null || poolPreview.value.min_free >= requestedSeats.value)

function localWallClock(date: Date): string {
	const pad = (value: number) => String(value).padStart(2, "0")
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

let previewRequest = 0

async function loadPoolPreview(): Promise<void> {
	const branchId = previewBranchId.value
	const request = ++previewRequest
	if (branchId === null) {
		poolPreview.value = null
		return
	}

	const from = new Date()
	const to = new Date(from.getTime() + previewDays.value * 24 * 60 * 60 * 1000)
	try {
		const pool = await getCoworkingPool(branchId, { from: localWallClock(from), to: localWallClock(to) })
		if (request === previewRequest) poolPreview.value = pool
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (request === previewRequest) poolPreview.value = null
	}
}

const ownerTypeOptions = computed<SelectOption[]>(() => [
	{ value: "user", label: t("memberships.activate.ownerMember") },
	{ value: "company", label: t("memberships.activate.ownerCompany") }
])

const ownerOptions = computed(() => (form.value.owner_type === "user" ? memberOptions.value : companyOptions.value))

const ownerLabel = computed(() =>
	form.value.owner_type === "user" ? t("memberships.activate.ownerMember") : t("memberships.activate.ownerCompany")
)

const ownerPlaceholder = computed(() =>
	form.value.owner_type === "user" ? t("memberships.activate.selectMember") : t("memberships.activate.selectCompany")
)

/**
 * Only subscription plans. A one-time package cannot be held as a membership
 * — `Membership::booted()` throws on one server-side — so offering it here
 * would be a control whose only outcome is an error.
 *
 * Private plans are deliberately included, and inactive ones deliberately are
 * not: the backend rejects `is_active = false` with a 422, while a private
 * plan is exactly what this screen exists to assign.
 */
const planOptions = computed<SelectOption[]>(() =>
	plans.value
		.filter(plan => plan.is_subscription && plan.is_active)
		.map(plan => ({
			value: plan.id,
			label: plan.is_public
				? pickLocalized(plan.name, locale.value)
				: `${pickLocalized(plan.name, locale.value)} — ${t("packages.visibility.private")}`
		}))
)

const selectedPlan = computed(() => plans.value.find(plan => plan.id === form.value.plan_id) ?? null)

// ---------------------------------------------------------------
// Dedicated desks (backend docs/decisions/coworking-seat-pool.md)
// ---------------------------------------------------------------

/** The module whose subscriptions are tied to specific desks. */
const isDedicatedPlan = computed(() => selectedPlan.value?.plan_module?.slug === "dedicated_desk")

const freeDesks = ref<SeatDesk[]>([])
const desksLoading = ref(false)

const deskOptions = computed<SelectOption[]>(() =>
	freeDesks.value.map(desk => ({ value: desk.id, label: desk.label && desk.label !== desk.code ? `${desk.code} — ${desk.label}` : desk.code }))
)

const tooManyDesks = computed(() => isDedicatedPlan.value && form.value.seat_desk_ids.length > requestedSeats.value)

let desksRequest = 0

async function loadFreeDesks(): Promise<void> {
	const branchId = previewBranchId.value
	const request = ++desksRequest
	form.value.seat_desk_ids = []
	if (!isDedicatedPlan.value || branchId === null) {
		freeDesks.value = []
		return
	}

	desksLoading.value = true
	try {
		const desks = await listSeatsDesks({ branch_id: branchId, free_for_plan: form.value.plan_id! })
		if (request === desksRequest) freeDesks.value = desks
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (request === desksRequest) freeDesks.value = []
	} finally {
		if (request === desksRequest) desksLoading.value = false
	}
}

const canSubmit = computed(() => form.value.owner_id !== null && form.value.plan_id !== null && !tooManyDesks.value)

/** Switching owner type clears the selection — a member id is not a company id. */
function onOwnerTypeChange() {
	form.value.owner_id = null
	form.value.seats = 1
}

async function loadBranches() {
	try {
		branches.value = await listBranches()
	} catch {
		// Without the list the server's default branch still applies; the
		// select simply offers nothing to override it with.
		branches.value = []
	}
}

async function loadPlans() {
	plansLoading.value = true
	try {
		plans.value = await listPlans()
	} catch {
		loadError.value = true
	} finally {
		plansLoading.value = false
	}
}

async function loadOwners() {
	ownersLoading.value = true
	try {
		const [members, companies] = await Promise.all([listMembers(), listCompanies()])

		memberOptions.value = members.map(member => ({
			value: member.id,
			label: member.phone ? `${member.name} — ${member.phone}` : member.name
		}))
		companyOptions.value = companies.map(company => ({ value: company.id, label: company.legal_name }))
		companyBranch.value = new Map(companies.map(company => [company.id, company.branch_id]))
	} catch {
		loadError.value = true
	} finally {
		ownersLoading.value = false
	}
}

async function handleSubmit() {
	if (!canSubmit.value) return

	submitting.value = true
	try {
		// Exactly one owner key — the backend pairs them with `prohibits`, so
		// sending both is a 422 rather than a precedence question.
		const owner = form.value.owner_type === "user"
			? { user_id: form.value.owner_id! }
			: { company_id: form.value.owner_id!, seats: requestedSeats.value }

		const payload: MembershipActivationPayload = {
			plan_id: form.value.plan_id!,
			...owner,
			...(form.value.branch_id !== null ? { branch_id: form.value.branch_id } : {}),
			...(form.value.override_capacity ? { override_capacity: true } : {}),
			...(isDedicatedPlan.value && form.value.seat_desk_ids.length > 0 ? { seat_desk_ids: form.value.seat_desk_ids } : {})
		}

		await activateMembership(payload)

		message.success(t("memberships.activate.success"))
		form.value.owner_id = null
		form.value.plan_id = null
		form.value.seats = 1
		form.value.override_capacity = false
		void loadPoolPreview()
		void loadFreeDesks()
		void desksCard.value?.reload()
	} catch (caught) {
		if (caught instanceof ApiError) {
			// The backend refuses a second live membership for the same owner,
			// and says so in `message` rather than in `errors`. A full seat pool
			// also names the first moment the subscription no longer fits.
			const full = caught.data as Partial<SeatPoolFullError> | undefined
			const detail = caught.data?.message ?? Object.values(caught.data?.errors ?? {})[0]?.[0]
			const when = full?.first_shortfall_at ? ` (${formatDateTime(full.first_shortfall_at)})` : ""
			message.error(detail ? `${detail}${when}` : t("memberships.activate.error"))
		} else {
			message.error(t("memberships.activate.error"))
		}
	} finally {
		submitting.value = false
	}
}

// After every computed it reads is declared: a watch evaluates its sources
// at once.
watch([previewBranchId, previewDays], loadPoolPreview)
watch([previewBranchId, isDedicatedPlan, () => form.value.plan_id], loadFreeDesks)

onMounted(() => {
	if (!canActivate.value) return
	loadPlans()
	loadOwners()
	loadBranches()
})
</script>

<style scoped lang="scss">
/* Not enough co-working seats for the sale: the theme's warning colour. */
.add-pool-short {
	border-color: var(--warning-color);
	background-color: rgba(var(--warning-color-rgb), 0.08);
}
</style>
