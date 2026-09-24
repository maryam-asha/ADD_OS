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
					</n-form>

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
								{{ selectedPlan.access_window_start }} – {{ selectedPlan.access_window_end }}
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
		</template>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { MembershipActivationPayload, MembershipOwnerType } from "@/add-os/modules/members/types/membership"
import type { Plan } from "@/add-os/modules/plans/types/plan"
import { NAlert, NButton, NCard, NForm, NFormItem, NSelect, NTag, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { canActivateMemberships } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { ApiError } from "@/add-os/services/api"
import { listCompanies } from "@/add-os/services/companies"
import { listMembers } from "@/add-os/services/members"
import { activateMembership } from "@/add-os/services/memberships"
import { listPlans } from "@/add-os/services/plans"
import { formatNumber } from "@/add-os/utils/format"
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
const memberOptions = ref<SelectOption[]>([])
const companyOptions = ref<SelectOption[]>([])

const canActivate = computed(() => canActivateMemberships())

const form = ref<{ owner_type: MembershipOwnerType; owner_id: number | null; plan_id: number | null }>({
	owner_type: "user",
	owner_id: null,
	plan_id: null
})

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

const canSubmit = computed(() => form.value.owner_id !== null && form.value.plan_id !== null)

/** Switching owner type clears the selection — a member id is not a company id. */
function onOwnerTypeChange() {
	form.value.owner_id = null
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
		const payload: MembershipActivationPayload =
			form.value.owner_type === "user"
				? { plan_id: form.value.plan_id!, user_id: form.value.owner_id! }
				: { plan_id: form.value.plan_id!, company_id: form.value.owner_id! }

		await activateMembership(payload)

		message.success(t("memberships.activate.success"))
		form.value.owner_id = null
		form.value.plan_id = null
	} catch (caught) {
		if (caught instanceof ApiError) {
			// The backend refuses a second live membership for the same owner,
			// and says so in `message` rather than in `errors`.
			const detail = caught.data?.message ?? Object.values(caught.data?.errors ?? {})[0]?.[0]
			message.error(detail ?? t("memberships.activate.error"))
		} else {
			message.error(t("memberships.activate.error"))
		}
	} finally {
		submitting.value = false
	}
}

onMounted(() => {
	if (!canActivate.value) return
	loadPlans()
	loadOwners()
})
</script>
