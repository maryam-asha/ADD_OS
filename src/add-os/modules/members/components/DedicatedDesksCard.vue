<!-- src/add-os/modules/members/components/DedicatedDesksCard.vue -->
<template>
	<n-card>
		<div class="flex flex-col gap-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex items-center gap-2 text-sm font-bold">
					<Icon name="carbon:workspace" :size="18" />
					<span>{{ t("memberships.desks.title") }}</span>
					<n-tag v-if="waitingCount > 0" size="small" round type="warning" class="add-desks-waiting">
						{{ t("memberships.desks.waiting", { count: formatNumber(waitingCount) }) }}
					</n-tag>
				</div>
				<div class="flex items-center gap-2">
					<n-switch v-model:value="onlyWithoutDesk" size="small" />
					<span class="text-xs">{{ t("memberships.desks.onlyWithout") }}</span>
				</div>
			</div>

			<p class="text-xs text-secondary">{{ t("memberships.desks.hint") }}</p>

			<n-alert v-if="loadError" type="error" :title="t('memberships.desks.loadError')" />

			<n-spin :show="loading">
				<p v-if="rows.length === 0" class="text-xs text-secondary py-4 text-center">
					{{ onlyWithoutDesk ? t("memberships.desks.noneWithout") : t("memberships.desks.none") }}
				</p>

				<div v-else class="flex flex-col divide-y divide-black/5">
					<div v-for="row in rows" :key="row.id" class="add-desk-row flex flex-wrap items-center justify-between gap-3 py-2">
						<div class="flex flex-col gap-0.5 min-w-0">
							<span class="text-sm font-semibold truncate">
								{{ row.owner?.name ?? `#${row.owner_id}` }}
								<span class="text-xs text-secondary font-normal">
									· {{ row.owner_type === "company" ? t("memberships.activate.ownerCompany") : t("memberships.activate.ownerMember") }}
								</span>
							</span>
							<span class="text-xs text-secondary add-numeric">
								{{ planName(row) }} · {{ t("memberships.desks.until", { date: formatDate(row.current_period_end) }) }}
								<template v-if="row.seats > 1"> · {{ t("memberships.desks.seats", { seats: formatNumber(row.seats) }) }}</template>
							</span>
						</div>

						<div class="flex items-center gap-2">
							<template v-if="row.desks?.length">
								<n-tag v-for="desk in row.desks" :key="desk.id" size="small" round>{{ desk.code }}</n-tag>
							</template>
							<n-tag v-else size="small" round type="warning">{{ t("memberships.desks.notAssigned") }}</n-tag>
							<n-button size="small" @click="openAssign(row)">
								{{ row.desks?.length ? t("memberships.desks.change") : t("memberships.desks.assign") }}
							</n-button>
						</div>
					</div>
				</div>
			</n-spin>

			<div v-if="lastPage > 1" class="flex justify-end">
				<n-pagination v-model:page="page" :page-count="lastPage" size="small" />
			</div>
		</div>

		<n-modal
			v-model:show="assignVisible"
			preset="dialog"
			:title="t('memberships.desks.assignTitle')"
			:positive-text="t('memberships.desks.save')"
			:negative-text="t('memberships.desks.cancel')"
			:loading="saving"
			:positive-button-props="{ disabled: !canSave }"
			@positive-click="saveAssign"
		>
			<div v-if="target" class="flex flex-col gap-3 pt-2">
				<span class="text-sm">{{ target.owner?.name ?? `#${target.owner_id}` }} — {{ planName(target) }}</span>
				<n-select
					v-model:value="selected"
					multiple
					clearable
					:options="deskOptions"
					:loading="desksLoading"
					:placeholder="t('memberships.desks.pick')"
				/>
				<span class="text-xs" :class="tooMany ? 'text-error' : 'text-secondary'">
					{{ t("memberships.desks.max", { seats: formatNumber(target.seats) }) }}
				</span>
			</div>
		</n-modal>
	</n-card>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { Membership } from "@/add-os/modules/members/types/membership"
import { NAlert, NButton, NCard, NModal, NPagination, NSelect, NSpin, NSwitch, NTag, useMessage } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { ApiError } from "@/add-os/services/api"
import { assignMembershipDesks, listMemberships } from "@/add-os/services/memberships"
import { listSeatsDesks } from "@/add-os/services/seats-desks"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Live Dedicated Desk subscriptions and their desks, where staff tie a desk
 * to one — most often one bought in the app, which arrives without one
 * (backend docs/decisions/coworking-seat-pool.md). Only the branch's free
 * desks are offered, plus the subscription's own; the server re-checks.
 */

const { t } = useI18n()
const message = useMessage()

const rows = ref<Membership[]>([])
const loading = ref(false)
const loadError = ref(false)
const onlyWithoutDesk = ref(true)
const page = ref(1)
const lastPage = ref(1)
/** How many live Dedicated Desk subscriptions still wait for a desk, whatever the list shows. */
const waitingCount = ref(0)

let listRequest = 0

async function load(): Promise<void> {
	const request = ++listRequest
	loading.value = true
	loadError.value = false
	try {
		const result = await listMemberships({
			dedicated: 1,
			live: 1,
			...(onlyWithoutDesk.value ? { without_desk: 1 as const } : {}),
			page: page.value
		})
		if (request !== listRequest) return
		rows.value = result.data
		lastPage.value = result.meta.last_page
		waitingCount.value = onlyWithoutDesk.value
			? result.meta.total
			: (await listMemberships({ dedicated: 1, live: 1, without_desk: 1, per_page: 1 })).meta.total
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (request === listRequest) loadError.value = true
	} finally {
		if (request === listRequest) loading.value = false
	}
}

function planName(row: Membership): string {
	return row.plan ? pickLocalized(row.plan.name, currentLocale.value) : `#${row.plan_id}`
}

// ---------------------------------------------------------------
// Assigning
// ---------------------------------------------------------------

const assignVisible = ref(false)
const target = ref<Membership | null>(null)
const selected = ref<number[]>([])
const deskOptions = ref<SelectOption[]>([])
const desksLoading = ref(false)
const saving = ref(false)

const tooMany = computed(() => target.value !== null && selected.value.length > target.value.seats)
const canSave = computed(() => target.value !== null && !tooMany.value)

async function openAssign(row: Membership): Promise<void> {
	target.value = row
	const own = row.desks ?? []
	selected.value = own.map(desk => desk.id)
	deskOptions.value = own.map(desk => ({ value: desk.id, label: desk.code }))
	assignVisible.value = true

	if (row.branch_id === null) return
	desksLoading.value = true
	try {
		// Free during its own hours and dates — its own desks included.
		const free = await listSeatsDesks({ branch_id: row.branch_id, free_for_membership: row.id })
		deskOptions.value = free.map(desk => ({ value: desk.id, label: desk.label && desk.label !== desk.code ? `${desk.code} — ${desk.label}` : desk.code }))
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
	} finally {
		desksLoading.value = false
	}
}

async function saveAssign(): Promise<boolean> {
	if (target.value === null || !canSave.value) return false
	saving.value = true
	try {
		await assignMembershipDesks(target.value.id, selected.value)
		message.success(t("memberships.desks.saved"))
		assignVisible.value = false
		void load()
		return true
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		const detail = caught.data?.message ?? Object.values(caught.data?.errors ?? {})[0]?.[0]
		message.error(detail ?? t("memberships.desks.error"))
		return false
	} finally {
		saving.value = false
	}
}

watch(onlyWithoutDesk, () => {
	page.value = 1
	void load()
})
watch(page, () => void load())

onMounted(load)

/** The page reloads the list after activating a subscription. */
defineExpose({ reload: load })
</script>
