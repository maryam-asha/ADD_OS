<!-- src/add-os/modules/members/components/MemberDetailPanel.vue -->
<!--
  Shows a member's full profile details (avatar, personal profile, professional
  profile, social links), wallet balance, and active sessions in a modal panel.
  Opened from IndividualMembersPage when the operator clicks the "Details" action.
-->
<template>
	<n-modal
		v-model:show="show"
		preset="card"
		:title="currentMember?.name ?? t('members.detail.title')"
		closable
		style="width: min(44rem, 95vw)"
		content-style="max-height: 82vh; overflow-y: auto"
	>
		<div v-if="isLoadingMember" class="py-12 flex items-center justify-center">
			<n-spin size="large" />
		</div>

		<div v-else-if="currentMember" class="flex flex-col gap-5">
			<!-- Header Card: Avatar + Basic Info -->
			<div class="flex items-start gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-black/5">
				<n-avatar
					v-if="avatarUrl"
					round
					:size="68"
					:src="avatarUrl"
					fallback-src=""
					class="shrink-0 ring-2 ring-emerald-600/20"
				/>
				<n-avatar
					v-else
					round
					:size="68"
					class="shrink-0 bg-emerald-700 text-white font-bold text-xl shadow-xs"
				>
					{{ memberInitials }}
				</n-avatar>

				<div class="flex flex-col gap-1 flex-1 min-w-0">
					<div class="flex items-center justify-between gap-2 flex-wrap">
						<h2 class="text-lg font-bold text-stone-900 leading-tight truncate">
							{{ currentMember.name }}
						</h2>
						<n-tag :type="STATUS_TYPE[currentMember.status]" size="small" round :bordered="true">
							<template #icon>
								<Icon :name="STATUS_ICON[currentMember.status]" :size="12" />
							</template>
							{{ t(`members.status.${currentMember.status}`) }}
						</n-tag>
					</div>

					<div class="flex items-center gap-3 text-xs text-secondary flex-wrap mt-0.5">
						<span class="font-mono flex items-center gap-1">
							<Icon name="carbon:phone" :size="13" />
							{{ currentMember.phone }}
						</span>
						<span v-if="currentMember.email" class="flex items-center gap-1 truncate">
							<Icon name="carbon:email" :size="13" />
							{{ currentMember.email }}
						</span>
					</div>

					<div v-if="primaryCompany" class="text-xs text-stone-600 font-medium flex items-center gap-1 mt-1">
						<Icon name="carbon:enterprise" :size="13" />
						<span>{{ primaryCompany.legal_name }}</span>
						<n-tag v-if="primaryCompany.is_admin" size="tiny" type="warning" round class="scale-90">
							Admin
						</n-tag>
					</div>
				</div>
			</div>

			<!-- Personal & Professional Profiles Section -->
			<div v-if="hasAnyProfileInfo" class="flex flex-col gap-4">
				<!-- Personal Profile -->
				<div v-if="personalProfile && (personalProfile.bio || personalProfile.city || personalProfile.gender)" class="p-3.5 rounded-xl border border-black/5 bg-white shadow-2xs flex flex-col gap-2.5">
					<span class="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
						<Icon name="carbon:user-avatar" :size="15" />
						{{ t("members.profile.personalTitle") }}
					</span>

					<p v-if="personalProfile.bio" class="text-sm text-stone-800 leading-relaxed whitespace-pre-line bg-neutral-50/60 p-2.5 rounded-lg border border-black/5">
						{{ personalProfile.bio }}
					</p>

					<div class="grid grid-cols-2 gap-3 text-xs">
						<div v-if="personalProfile.city" class="flex flex-col gap-0.5">
							<span class="text-secondary">{{ t("members.profile.city") }}</span>
							<span class="font-medium text-stone-900">{{ personalProfile.city }}</span>
						</div>
						<div v-if="personalProfile.gender" class="flex flex-col gap-0.5">
							<span class="text-secondary">{{ t("members.profile.gender") }}</span>
							<span class="font-medium text-stone-900">
								{{ personalProfile.gender === 'male' ? t("members.profile.genderMale") : t("members.profile.genderFemale") }}
							</span>
						</div>
					</div>
				</div>

				<!-- Professional Profile -->
				<div v-if="professionalProfile && (professionalProfile.job_title || professionalProfile.company_name || professionalProfile.industry)" class="p-3.5 rounded-xl border border-black/5 bg-white shadow-2xs flex flex-col gap-2.5">
					<span class="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
						<Icon name="carbon:badge" :size="15" />
						{{ t("members.profile.professionalTitle") }}
					</span>

					<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
						<div v-if="professionalProfile.job_title" class="flex flex-col gap-0.5">
							<span class="text-secondary">{{ t("members.profile.jobTitle") }}</span>
							<span class="font-semibold text-stone-900">{{ professionalProfile.job_title }}</span>
						</div>
						<div v-if="professionalProfile.company_name" class="flex flex-col gap-0.5">
							<span class="text-secondary">{{ t("members.profile.companyName") }}</span>
							<span class="font-semibold text-stone-900">{{ professionalProfile.company_name }}</span>
						</div>
						<div v-if="professionalProfile.industry" class="flex flex-col gap-0.5">
							<span class="text-secondary">{{ t("members.profile.industry") }}</span>
							<span class="font-semibold text-stone-900">{{ professionalProfile.industry }}</span>
						</div>
					</div>
				</div>

				<!-- Profile Links -->
				<div v-if="hasSocialLinks" class="p-3.5 rounded-xl border border-black/5 bg-white shadow-2xs flex flex-col gap-2.5">
					<span class="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
						<Icon name="carbon:link" :size="15" />
						{{ t("members.profile.socialLinks") }}
					</span>

					<div class="flex items-center gap-2 flex-wrap">
						<a
							v-if="profileLinks?.linkedin_url"
							:href="profileLinks.linkedin_url"
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 hover:text-blue-700 transition-colors"
						>
							<Icon name="carbon:logo-linkedin" :size="14" />
							LinkedIn
						</a>
						<a
							v-if="profileLinks?.instagram_url"
							:href="profileLinks.instagram_url"
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 hover:text-pink-700 transition-colors"
						>
							<Icon name="carbon:logo-instagram" :size="14" />
							Instagram
						</a>
						<a
							v-if="profileLinks?.behance_url"
							:href="profileLinks.behance_url"
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 hover:text-blue-600 transition-colors"
						>
							<Icon name="carbon:link" :size="14" />
							Behance
						</a>
						<a
							v-if="profileLinks?.website_url"
							:href="profileLinks.website_url"
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 hover:text-teal-700 transition-colors"
						>
							<Icon name="carbon:earth" :size="14" />
							Website
						</a>
					</div>
				</div>
			</div>

			<!-- Wallet Balance -->
			<div>
				<h3 class="text-xs font-bold uppercase tracking-wider text-secondary mb-2 flex items-center gap-1.5">
					<Icon name="carbon:wallet" :size="15" />
					{{ t("members.detail.walletBalance") }}
				</h3>
				<div class="p-4 rounded-xl border border-black/5 bg-neutral-50 flex items-center justify-between shadow-2xs">
					<div v-if="isLoadingBalance" class="flex items-center gap-2 text-sm text-secondary">
						<n-spin :size="16" />
						{{ t("members.detail.loadingBalance") }}
					</div>
					<div v-else-if="balanceError" class="text-sm text-error">
						{{ t("members.detail.balanceError") }}
					</div>
					<div v-else-if="balance" class="flex flex-col gap-0.5">
						<span class="text-xs text-secondary">{{ t("members.detail.generalBalance") }}</span>
						<span class="text-2xl font-bold font-mono add-numeric text-teal-800">
							{{ balance.general_balance }}
							<span class="text-sm font-normal text-secondary ml-1">{{ balance.currency }}</span>
						</span>
					</div>
					<n-button circle secondary size="small" @click="reloadBalance">
						<template #icon><Icon name="carbon:renew" :size="15" /></template>
					</n-button>
				</div>
			</div>

			<!-- Active Sessions -->
			<div>
				<h3 class="text-xs font-bold uppercase tracking-wider text-secondary mb-2 flex items-center gap-1.5">
					<Icon name="carbon:time" :size="15" />
					{{ t("members.detail.activeSessions") }}
				</h3>

				<div v-if="isLoadingSessions" class="flex items-center gap-2 text-sm text-secondary py-3">
					<n-spin :size="16" />
					{{ t("members.detail.loadingSessions") }}
				</div>
				<div v-else-if="sessionsError" class="text-sm text-error py-2">
					{{ t("members.detail.sessionsError") }}
				</div>
				<div v-else-if="sessions.length === 0" class="py-4 text-center text-sm text-secondary bg-neutral-50/50 rounded-xl border border-black/5">
					{{ t("members.detail.noActiveSessions") }}
				</div>
				<div v-else class="flex flex-col gap-2">
					<div
						v-for="session in sessions"
						:key="session.id"
						class="flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all"
						:class="session.is_overdue ? 'border-error/30 bg-error/5' : 'border-black/5 bg-neutral-50'"
					>
						<div class="flex flex-col gap-0.5">
							<div class="flex items-center gap-2">
								<n-tag :type="session.type === 'booking' ? 'info' : 'default'" size="small" round>
									{{ t(`members.detail.sessionType.${session.type}`) }}
								</n-tag>
								<n-tag v-if="session.is_overdue" type="error" size="small" round>
									{{ t("members.detail.overdue") }}
								</n-tag>
							</div>
							<span class="text-xs text-secondary mt-0.5 font-mono">
								{{ t("members.detail.checkedInAt") }}: {{ formatTime(session.checked_in_at) }}
							</span>
						</div>
						<div class="text-xs text-secondary text-end font-medium">
							<span v-if="session.space_type">{{ session.space_type }}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</n-modal>
</template>

<script setup lang="ts">
import type { Member, MemberActiveSession, MemberStatus, MemberWalletBalance } from "@/add-os/modules/members/types/member"
import { NAvatar, NButton, NModal, NSpin, NTag } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { getMember, getMemberActiveSessions, getMemberWalletBalance } from "@/add-os/services/members"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import { formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"
import { ApiError } from "@/add-os/services/api"

const props = defineProps<{ member: Member | null }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()

const currentMember = ref<Member | null>(props.member)
const isLoadingMember = ref(false)

const STATUS_ICON: Record<MemberStatus, string> = {
	active: STATUS_ICONS.success,
	deactivated: STATUS_ICONS.warning,
	blocked: STATUS_ICONS.danger
}

const STATUS_TYPE: Record<MemberStatus, "success" | "warning" | "error"> = {
	active: "success",
	deactivated: "warning",
	blocked: "error"
}

const primaryCompany = computed(() => currentMember.value?.companies?.[0] ?? null)
const personalProfile = computed(() => currentMember.value?.personal_profile ?? null)
const professionalProfile = computed(() => currentMember.value?.professional_profile ?? null)
const profileLinks = computed(() => currentMember.value?.profile_links ?? null)

const avatarUrl = computed(() => personalProfile.value?.avatar_url || null)

const memberInitials = computed(() => {
	const name = currentMember.value?.name || "M"
	const parts = name.trim().split(" ")
	if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
	return name.slice(0, 2).toUpperCase()
})

const hasSocialLinks = computed(() => {
	const l = profileLinks.value
	if (!l) return false
	return Boolean(l.linkedin_url || l.instagram_url || l.behance_url || l.website_url)
})

const hasAnyProfileInfo = computed(() => {
	const p = personalProfile.value
	const pr = professionalProfile.value
	if (p && (p.bio || p.city || p.gender)) return true
	if (pr && (pr.job_title || pr.company_name || pr.industry)) return true
	if (hasSocialLinks.value) return true
	return false
})

// ── Fetch full member record with eager loaded profiles ─────────────────────
async function loadFullMember() {
	if (!props.member) return
	isLoadingMember.value = true
	try {
		currentMember.value = await getMember(props.member.id)
	} catch (e) {
		currentMember.value = props.member
		if (!(e instanceof ApiError)) throw e
	} finally {
		isLoadingMember.value = false
	}
}

// ── Wallet balance ──────────────────────────────────────────────────────────
const balance = ref<MemberWalletBalance | null>(null)
const isLoadingBalance = ref(false)
const balanceError = ref(false)

async function loadBalance() {
	if (!props.member) return
	isLoadingBalance.value = true
	balanceError.value = false
	try {
		balance.value = await getMemberWalletBalance(props.member.id)
	} catch (e) {
		balanceError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		isLoadingBalance.value = false
	}
}

function reloadBalance() {
	loadBalance()
}

// ── Active sessions ─────────────────────────────────────────────────────────
const sessions = ref<MemberActiveSession[]>([])
const isLoadingSessions = ref(false)
const sessionsError = ref(false)

async function loadSessions() {
	if (!props.member) return
	isLoadingSessions.value = true
	sessionsError.value = false
	try {
		sessions.value = await getMemberActiveSessions(props.member.id)
	} catch (e) {
		sessionsError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		isLoadingSessions.value = false
	}
}

// ── Load on open / member change ────────────────────────────────────────────
watch(
	[show, () => props.member?.id],
	([visible]) => {
		if (visible && props.member) {
			currentMember.value = props.member
			balance.value = null
			sessions.value = []
			loadFullMember()
			loadBalance()
			loadSessions()
		}
	},
	{ immediate: true }
)

function formatTime(iso: string): string {
	try {
		return formatDateTime(iso)
	} catch {
		return iso
	}
}
</script>
