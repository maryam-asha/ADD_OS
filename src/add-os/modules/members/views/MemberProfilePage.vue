<!-- src/add-os/modules/members/views/MemberProfilePage.vue -->
<!--
	A member's whole file: who they are, what they hold and owe, whether they
	are inside now — then a tab for each part of their history, every one
	filtered and paged by the server. Reached from the members list.
	Refreshed with the ADD OS architectural design system and brand palette.
-->
<template>
	<div class="flex flex-col gap-5 max-w-7xl mx-auto p-4 sm:p-6 text-[var(--add-text-primary)]">
		<!-- Top action & breadcrumb bar -->
		<div class="flex items-center justify-between gap-4">
			<n-button text class="group flex items-center gap-1.5 text-[var(--add-text-secondary)] hover:text-[var(--add-brand-levant-deep-teal)]" @click="router.push({ name: 'members.individuals' })">
				<template #icon>
					<Icon name="carbon:arrow-left" :size="16" class="rtl:rotate-180 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" />
				</template>
				<span class="font-medium text-sm">{{ t("memberProfile.back") }}</span>
			</n-button>
			<div class="flex items-center gap-2">
				<n-button secondary size="small" :loading="isLoading" class="border-[var(--add-border)]" @click="loadSummary">
					<template #icon><Icon name="carbon:renew" :size="14" class="text-[var(--add-brand-levant-deep-teal)]" /></template>
					{{ t("memberProfile.refresh") }}
				</n-button>
			</div>
		</div>

		<!-- Error alert -->
		<n-alert v-if="loadFailed" type="error" :bordered="false" class="rounded-xl">{{ t("memberProfile.loadError") }}</n-alert>

		<n-spin :show="isLoading && !summary">
			<div v-if="summary" class="flex flex-col gap-5">
				<!-- Member Identity Card -->
				<div class="rounded-xl border border-[var(--add-border)]/70 bg-[var(--add-surface-raised)] p-5 sm:p-6 shadow-xs">
					<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
						<!-- Left: Avatar + Core Details -->
						<div class="flex items-center gap-4 sm:gap-5 min-w-0">
							<!-- Avatar with active presence dot -->
							<div class="relative shrink-0">
								<n-avatar
									round
									:size="64"
									:src="member?.personal_profile?.avatar_url ?? undefined"
									class="bg-[var(--add-brand-levant-deep-teal)] text-[var(--add-surface-raised)] text-xl font-bold ring-2 ring-[var(--add-border)]/40 shadow-xs"
								>
									{{ initials(member?.name) }}
								</n-avatar>
								<span
									v-if="member?.status === 'active'"
									class="absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 rounded-full bg-[var(--add-brand-smart-olive)] ring-2 ring-[var(--add-surface-raised)]"
									:title="t(`members.status.${member?.status}`)"
								></span>
							</div>

							<!-- Identity and Meta Details -->
							<div class="flex flex-col gap-1.5 min-w-0">
								<div class="flex items-center gap-2.5 flex-wrap">
									<h1 class="text-xl sm:text-2xl font-bold text-[var(--add-brand-charcoal-backbone)] tracking-tight">
										{{ member?.name }}
									</h1>
									<span class="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--add-surface-sunken)] text-[var(--add-text-secondary)] font-numeric border border-[var(--add-border)]/50">
										#{{ member?.id }}
									</span>
									<n-tag :type="member?.status === 'active' ? 'success' : 'error'" size="small" round :bordered="false">
										{{ t(`members.status.${member?.status}`) }}
									</n-tag>
								</div>

								<div v-if="profile?.professional?.job_title || profile?.professional?.company_name" class="text-xs sm:text-sm font-medium text-[var(--add-brand-antique-copper)] flex items-center gap-1.5">
									<Icon name="carbon:badge" :size="14" />
									<span class="truncate">
										{{ [profile?.professional?.job_title, profile?.professional?.company_name].filter(Boolean).join(" · ") }}
									</span>
								</div>

								<!-- Contact & Affiliate chips -->
								<div class="flex flex-wrap items-center gap-2 pt-0.5">
									<span class="inline-flex items-center gap-1.5 bg-[var(--add-surface-sunken)] px-2.5 py-1 rounded-md border border-[var(--add-border)]/50 text-xs font-numeric text-[var(--add-text-secondary)]">
										<Icon name="carbon:phone" :size="13" class="text-[var(--add-brand-smart-olive)] shrink-0" />
										<bdi dir="ltr">{{ member?.phone }}</bdi>
									</span>
									<span v-if="member?.email" class="inline-flex items-center gap-1.5 bg-[var(--add-surface-sunken)] px-2.5 py-1 rounded-md border border-[var(--add-border)]/50 text-xs font-numeric text-[var(--add-text-secondary)]">
										<Icon name="carbon:email" :size="13" class="text-[var(--add-brand-deep-teal)] shrink-0" />
										<span class="truncate max-w-[220px]">{{ member.email }}</span>
									</span>
									<span v-if="summary.joined_at" class="inline-flex items-center gap-1.5 bg-[var(--add-surface-sunken)] px-2.5 py-1 rounded-md border border-[var(--add-border)]/50 text-xs text-[var(--add-text-secondary)]">
										<Icon name="carbon:calendar" :size="13" class="text-[var(--add-brand-charcoal-backbone)] shrink-0" />
										{{ t("memberProfile.joined", { date: formatDate(summary.joined_at) }) }}
									</span>
									<!-- Companies tags in the same clean flow -->
									<template v-if="member?.companies?.length">
										<n-tag v-for="company in member.companies" :key="company.id" size="small" :bordered="false" class="bg-[var(--add-surface-sunken)] text-[var(--add-text-primary)]">
											<template #icon><Icon name="carbon:enterprise" :size="12" class="text-[var(--add-brand-levant-deep-teal)]" /></template>
											{{ company.legal_name }}<template v-if="company.is_admin"> · {{ t("memberProfile.companyAdmin") }}</template>
										</n-tag>
									</template>
								</div>
							</div>
						</div>

						<!-- Right: Primary Action Button -->
						<div class="shrink-0 flex items-center gap-2 md:self-center">
							<!-- Money the member hands over for what they owe, entered as given: amount and currency. -->
							<n-button v-if="summary.outstanding.points > 0" type="warning" secondary size="medium" @click="collectVisible = true">
								<template #icon><Icon name="carbon:money" :size="16" /></template>
								{{ t("memberProfile.collect") }}
							</n-button>
							<n-button type="primary" size="medium" @click="topUpVisible = true">
								<template #icon><Icon name="carbon:wallet" :size="16" /></template>
								{{ t("memberProfile.topUp") }}
							</n-button>
						</div>
					</div>
				</div>

				<!-- Live Presence Card: Inside right now -->
				<div
					v-if="summary.open_session"
					class="rounded-xl border border-[var(--add-brand-smart-olive)]/40 bg-[var(--add-brand-smart-olive)]/8 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs"
				>
					<div class="flex items-center gap-2.5">
						<span class="relative flex h-2.5 w-2.5">
							<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--add-brand-smart-olive)] opacity-75"></span>
							<span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--add-brand-smart-olive)]"></span>
						</span>
						<span class="font-semibold text-[var(--add-brand-levant-deep-teal)] text-sm">
							{{ t("memberProfile.insideNow", { space: summary.open_session.space ?? "—", time: formatTime(summary.open_session.checked_in_at) }) }}
						</span>
					</div>
					<n-button size="small" type="primary" secondary @click="openSession(summary.open_session.type, summary.open_session.id)">
						<template #icon><Icon name="carbon:arrow-right" :size="14" class="rtl:rotate-180" /></template>
						{{ t("memberProfile.viewSession") }}
					</n-button>
				</div>

				<!-- At a glance KPI Grid (6 metrics with balanced proportions) -->
				<div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
					<div
						v-for="card in cards"
						:key="card.key"
						class="bg-[var(--add-surface-raised)] border border-[var(--add-border)]/60 rounded-xl p-3.5 shadow-xs hover:border-[var(--add-border-strong)] transition-colors flex flex-col justify-between gap-2 min-h-[96px]"
					>
						<div class="flex items-center justify-between gap-2">
							<span class="text-xs font-medium text-[var(--add-text-muted)] truncate">{{ card.label }}</span>
							<div :class="['w-6 h-6 rounded-md flex items-center justify-center shrink-0', card.iconBg, card.iconColor]">
								<Icon :name="card.icon" :size="14" />
							</div>
						</div>
						<div class="flex flex-col">
							<span class="text-lg sm:text-xl font-bold font-numeric tracking-tight truncate leading-tight" :class="card.tone || 'text-[var(--add-brand-charcoal-backbone)]'">
								{{ card.value }}
							</span>
							<span class="text-xs text-[var(--add-text-muted)] truncate mt-0.5 h-4 flex items-center">
								{{ card.hint || "" }}
							</span>
						</div>
					</div>
				</div>
			</div>
		</n-spin>

		<!-- Member History & Tabs Container -->
		<div v-if="summary" class="rounded-xl border border-[var(--add-border)]/70 bg-[var(--add-surface-raised)] p-5 sm:p-6 shadow-xs">
			<n-tabs v-model:value="tab" type="line" animated>
				<!-- Overview Tab -->
				<n-tab-pane name="overview" :tab="t('memberProfile.tabs.overview')">
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
						<!-- Wallet Categories Card -->
						<div class="bg-[var(--add-surface)]/50 border border-[var(--add-border)]/60 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
							<div class="flex items-center justify-between border-b border-[var(--add-border)]/40 pb-3">
								<div class="flex items-center gap-2">
									<div class="w-7 h-7 rounded-md bg-[var(--add-brand-smart-olive)]/15 flex items-center justify-center text-[var(--add-primary-text)]">
										<Icon name="carbon:wallet" :size="16" />
									</div>
									<h3 class="font-bold text-[var(--add-brand-levant-deep-teal)] text-sm sm:text-base">{{ t("memberProfile.walletPools") }}</h3>
								</div>
								<n-button size="tiny" type="primary" secondary @click="topUpVisible = true">
									{{ t("memberProfile.topUp") }}
								</n-button>
							</div>
							<div class="flex flex-col gap-2.5">
								<div
									v-for="pool in summary.wallet.categories"
									:key="pool.category"
									class="flex flex-col gap-1.5 p-3 rounded-lg bg-[var(--add-surface-raised)] border border-[var(--add-border)]/40 shadow-xs"
								>
									<div class="flex items-center justify-between text-xs sm:text-sm">
										<span class="font-semibold text-[var(--add-brand-charcoal-backbone)]">{{ pool.label }}</span>
										<span class="font-bold font-numeric text-[var(--add-primary-text)]">{{ t("memberProfile.points", { points: formatNumber(pool.points) }) }}</span>
									</div>
									<div class="w-full bg-[var(--add-surface-sunken)] rounded-full h-1.5 overflow-hidden">
										<div
											class="bg-[var(--add-brand-smart-olive)] h-full rounded-full transition-all duration-500"
											:style="{ width: poolShare(pool.points) }"
										></div>
									</div>
								</div>
							</div>
						</div>

						<!-- Activity & Usage Pulse -->
						<div class="bg-[var(--add-surface)]/50 border border-[var(--add-border)]/60 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
							<div class="flex items-center gap-2 border-b border-[var(--add-border)]/40 pb-3">
								<div class="w-7 h-7 rounded-md bg-[var(--add-brand-levant-deep-teal)]/15 flex items-center justify-center text-[var(--add-brand-levant-deep-teal)]">
									<Icon name="carbon:activity" :size="16" />
								</div>
								<h3 class="font-bold text-[var(--add-brand-levant-deep-teal)] text-sm sm:text-base">{{ t("memberProfile.activity") }}</h3>
							</div>
							<div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
								<div
									v-for="line in activity"
									:key="line.label"
									class="flex flex-col gap-1 p-3.5 rounded-lg bg-[var(--add-surface-raised)] border border-[var(--add-border)]/40 shadow-xs"
								>
									<span class="text-xs font-medium text-[var(--add-text-muted)]">{{ line.label }}</span>
									<span class="text-lg font-bold font-numeric text-[var(--add-brand-charcoal-backbone)]">{{ line.value }}</span>
								</div>
							</div>

							<!-- Quick Membership Status if available -->
							<div v-if="summary.membership" class="p-3.5 rounded-lg bg-[var(--add-surface-raised)] border border-[var(--add-border)]/40 flex items-center justify-between gap-3 mt-auto">
								<div class="flex items-center gap-2.5">
									<div class="w-8 h-8 rounded-md bg-[var(--add-brand-antique-copper)]/15 flex items-center justify-center text-[var(--add-brand-antique-copper)]">
										<Icon name="carbon:badge" :size="18" />
									</div>
									<div class="flex flex-col">
										<span class="text-xs text-[var(--add-text-muted)]">{{ t("memberProfile.cards.plan") }}</span>
										<span class="font-bold text-sm text-[var(--add-brand-charcoal-backbone)]">{{ summary.membership.plan }}</span>
									</div>
								</div>
								<div v-if="summary.membership.hours_remaining !== null" class="text-end">
									<span class="text-xs text-[var(--add-text-muted)] block">{{ t("memberProfile.cards.hoursLeft", { hours: formatNumber(summary.membership.hours_remaining) }) }}</span>
									<span v-if="summary.membership.period_end" class="text-xs font-numeric text-[var(--add-text-secondary)]">
										{{ t("memberProfile.cards.until", { date: formatDate(summary.membership.period_end) }) }}
									</span>
								</div>
							</div>
						</div>
					</div>
				</n-tab-pane>

				<!-- Profile Tab (Bento Grid) -->
				<n-tab-pane name="profile" :tab="t('memberProfile.tabs.profile')">
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
						<!-- Personal Details Bento Card -->
						<div class="flex flex-col gap-3.5 p-4 sm:p-5 rounded-xl border border-[var(--add-border)]/60 bg-[var(--add-surface)]/30">
							<div class="flex items-center gap-2">
								<div class="w-6 h-6 rounded-md bg-[var(--add-brand-smart-olive)]/15 text-[var(--add-primary-text)] flex items-center justify-center">
									<Icon name="carbon:user-avatar" :size="14" />
								</div>
								<h3 class="font-bold text-[var(--add-brand-levant-deep-teal)] text-sm sm:text-base">{{ t("memberProfile.profile.personal") }}</h3>
							</div>
							<div class="flex items-start gap-3.5 p-3 rounded-lg bg-[var(--add-surface-raised)] border border-[var(--add-border)]/40">
								<n-avatar round :size="52" :src="profile.personal.avatar_url ?? undefined" class="bg-[var(--add-brand-smart-olive)] text-[var(--add-surface-raised)] text-lg font-bold shrink-0">
									{{ initials(member?.name) }}
								</n-avatar>
								<div class="flex flex-col gap-0.5">
									<span class="text-xs font-medium text-[var(--add-text-muted)]">Bio</span>
									<p class="text-xs sm:text-sm text-[var(--add-text-secondary)] whitespace-pre-line leading-relaxed">
										{{ profile.personal.bio || t("memberProfile.profile.noBio") }}
									</p>
								</div>
							</div>
							<ProfileFields :fields="personalFields" />
						</div>

						<!-- Account & Security Bento Card -->
						<div class="flex flex-col gap-3.5 p-4 sm:p-5 rounded-xl border border-[var(--add-border)]/60 bg-[var(--add-surface)]/30">
							<div class="flex items-center gap-2">
								<div class="w-6 h-6 rounded-md bg-[var(--add-brand-levant-deep-teal)]/15 text-[var(--add-brand-levant-deep-teal)] flex items-center justify-center">
									<Icon name="carbon:user" :size="14" />
								</div>
								<h3 class="font-bold text-[var(--add-brand-levant-deep-teal)] text-sm sm:text-base">{{ t("memberProfile.profile.account") }}</h3>
							</div>
							<ProfileFields :fields="accountFields" />
						</div>

						<!-- Professional & Online Presence Bento Card -->
						<div class="flex flex-col gap-3.5 p-4 sm:p-5 rounded-xl border border-[var(--add-border)]/60 bg-[var(--add-surface)]/30">
							<div class="flex items-center gap-2">
								<div class="w-6 h-6 rounded-md bg-[var(--add-brand-antique-copper)]/15 text-[var(--add-brand-antique-copper)] flex items-center justify-center">
									<Icon name="carbon:enterprise" :size="14" />
								</div>
								<h3 class="font-bold text-[var(--add-brand-levant-deep-teal)] text-sm sm:text-base">{{ t("memberProfile.profile.professional") }}</h3>
							</div>
							<ProfileFields :fields="professionalFields" />
							<div class="flex flex-wrap gap-2 pt-2 border-t border-[var(--add-border)]/30">
								<a
									v-for="link in links"
									:key="link.key"
									:href="link.url"
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--add-border)]/60 bg-[var(--add-surface-raised)] text-xs font-medium text-[var(--add-brand-charcoal-backbone)] hover:border-[var(--add-brand-smart-olive)] hover:text-[var(--add-primary-text)] transition-colors"
								>
									<Icon :name="link.icon" :size="14" />
									<span>{{ link.label }}</span>
								</a>
								<span v-if="!links.length" class="text-xs text-[var(--add-text-muted)]">{{ t("memberProfile.profile.noLinks") }}</span>
							</div>
						</div>

						<!-- Companies & Branches Bento Card -->
						<div class="flex flex-col gap-3.5 p-4 sm:p-5 rounded-xl border border-[var(--add-border)]/60 bg-[var(--add-surface)]/30">
							<div class="flex items-center gap-2">
								<div class="w-6 h-6 rounded-md bg-[var(--add-brand-deep-teal)]/15 text-[var(--add-brand-deep-teal)] flex items-center justify-center">
									<Icon name="carbon:building" :size="14" />
								</div>
								<h3 class="font-bold text-[var(--add-brand-levant-deep-teal)] text-sm sm:text-base">{{ t("memberProfile.profile.companies") }}</h3>
							</div>
							<div class="flex flex-col gap-2">
								<div
									v-for="company in profile.companies"
									:key="company.id"
									class="flex flex-wrap items-center justify-between gap-2.5 text-xs sm:text-sm p-2.5 rounded-lg bg-[var(--add-surface-raised)] border border-[var(--add-border)]/40 shadow-xs"
								>
									<div class="flex items-center gap-2">
										<Icon name="carbon:enterprise" :size="14" class="text-[var(--add-brand-levant-deep-teal)]" />
										<span class="font-semibold text-[var(--add-brand-charcoal-backbone)]">{{ company.legal_name }}</span>
									</div>
									<div class="flex flex-wrap items-center gap-1.5">
										<n-tag v-if="company.is_admin" size="small" round :bordered="false" type="info">{{ t("memberProfile.companyAdmin") }}</n-tag>
										<n-tag size="small" round :bordered="false" :type="company.door_access_enabled ? 'success' : 'default'">
											{{ t(company.door_access_enabled ? "memberProfile.profile.doorAccess" : "memberProfile.profile.noDoorAccess") }}
										</n-tag>
										<n-tag v-if="company.status !== 'active'" size="small" round :bordered="false" type="warning">{{ company.status }}</n-tag>
									</div>
								</div>
								<span v-if="!profile.companies.length" class="text-xs text-[var(--add-text-muted)]">{{ t("memberProfile.profile.noCompanies") }}</span>
							</div>

							<div class="pt-2 border-t border-[var(--add-border)]/30 flex flex-col gap-2">
								<h4 class="text-xs font-bold text-[var(--add-text-muted)] uppercase tracking-wider">{{ t("memberProfile.profile.branches") }}</h4>
								<div class="flex flex-wrap gap-2">
									<n-tag v-for="branch in profile.branches" :key="branch.id" size="small" round :type="branch.is_home_branch ? 'success' : 'default'">
										<template #icon><Icon name="carbon:location" :size="12" /></template>
										{{ branch.name ?? `#${branch.id}` }}<template v-if="branch.is_home_branch"> · {{ t("memberProfile.profile.homeBranch") }}</template>
									</n-tag>
									<span v-if="!profile.branches.length" class="text-xs text-[var(--add-text-muted)]">—</span>
								</div>
							</div>
						</div>

						<!-- App, Devices & Consent Bento Card -->
						<div class="flex flex-col gap-3.5 p-4 sm:p-5 rounded-xl border border-[var(--add-border)]/60 bg-[var(--add-surface)]/30 lg:col-span-2">
							<div class="flex items-center gap-2">
								<div class="w-6 h-6 rounded-md bg-[var(--add-brand-charcoal-backbone)]/10 text-[var(--add-brand-charcoal-backbone)] flex items-center justify-center">
									<Icon name="carbon:phone" :size="14" />
								</div>
								<h3 class="font-bold text-[var(--add-brand-levant-deep-teal)] text-sm sm:text-base">{{ t("memberProfile.profile.appAndConsent") }}</h3>
							</div>
							<ProfileFields :fields="consentFields" />
							<div class="flex flex-col gap-2 pt-2 border-t border-[var(--add-border)]/30">
								<span class="text-xs font-bold text-[var(--add-text-muted)] uppercase tracking-wider">{{ t("memberProfile.profile.devices") }}</span>
								<div class="flex flex-wrap gap-2">
									<div
										v-for="(device, index) in profile.devices"
										:key="index"
										class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--add-surface-raised)] border border-[var(--add-border)]/50 text-xs font-medium text-[var(--add-text-secondary)] font-numeric shadow-xs"
									>
										<Icon name="carbon:screen" :size="13" class="text-[var(--add-brand-levant-deep-teal)]" />
										<span>{{ device.platform ?? "—" }}</span>
										<template v-if="device.last_used_at">
											<span class="text-[var(--add-border)]">·</span>
											<span class="text-[var(--add-text-muted)]">{{ formatDateTime(device.last_used_at) }}</span>
										</template>
									</div>
									<span v-if="!profile.devices.length" class="text-xs text-[var(--add-text-muted)]">{{ t("memberProfile.profile.noDevices") }}</span>
								</div>
							</div>
						</div>
					</div>
				</n-tab-pane>

				<!-- History & Ledger Tabs -->
				<n-tab-pane name="bookings" :tab="t('memberProfile.tabs.bookings')" display-directive="show:lazy">
					<ProfileTable :load="loadBookings" :columns="bookingColumns" :row-key="byId" :filters="bookingFilters" date-range />
				</n-tab-pane>
				<n-tab-pane name="sessions" :tab="t('memberProfile.tabs.sessions')" display-directive="show:lazy">
					<ProfileTable :load="query => listMemberSessions(userId, query)" :columns="sessionColumns" :row-key="row => `${row.type}-${row.id}`" :filters="sessionFilters" date-range />
				</n-tab-pane>
				<n-tab-pane name="memberships" :tab="t('memberProfile.tabs.memberships')" display-directive="show:lazy">
					<ProfileTable :load="query => listMemberMemberships(userId, query)" :columns="membershipColumns" :row-key="byId" />
				</n-tab-pane>
				<n-tab-pane name="wallet" :tab="t('memberProfile.tabs.wallet')" display-directive="show:lazy">
					<ProfileTable :load="query => listMemberWalletTransactions(userId, query)" :columns="walletColumns" :row-key="byId" :filters="walletFilters" date-range />
				</n-tab-pane>
				<n-tab-pane name="payments" :tab="t('memberProfile.tabs.payments')" display-directive="show:lazy">
					<ProfileTable :load="query => listMemberPayments(userId, query)" :columns="paymentColumns" :row-key="byId" :filters="paymentFilters" />
				</n-tab-pane>
				<n-tab-pane name="serviceRequests" :tab="t('memberProfile.tabs.serviceRequests')" display-directive="show:lazy">
					<ProfileTable :load="query => listMemberServiceRequests(userId, query)" :columns="requestColumns" :row-key="byId" :filters="requestFilters" date-range />
				</n-tab-pane>
				<n-tab-pane name="events" :tab="t('memberProfile.tabs.events')" display-directive="show:lazy">
					<ProfileTable :load="query => listMemberEventRegistrations(userId, query)" :columns="eventColumns" :row-key="byId" :filters="eventFilters" />
				</n-tab-pane>
			</n-tabs>
		</div>

		<WalletTopUpDialog v-model:show="topUpVisible" :member @success="loadSummary" />
		<CollectPaymentModal v-model:show="collectVisible" :user-id @settled="loadSummary" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { PropType } from "vue"
import type { AdminBooking } from "@/add-os/modules/booking/types/calendar"
import type { SessionType } from "@/add-os/modules/booking/types/reception"
import type { ProfileFilter } from "@/add-os/modules/members/components/profile/ProfileTable.vue"
import type {
	MemberEventRegistration,
	MemberMembership,
	MemberPayment,
	MemberProfileSummary,
	MemberServiceRequest,
	MemberSession,
	MemberWalletTransaction
} from "@/add-os/modules/members/types/member-profile"
import { NAlert, NAvatar, NButton, NSpin, NTabPane, NTabs, NTag } from "naive-ui"
import { computed, defineComponent, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import ProfileTable from "@/add-os/modules/members/components/profile/ProfileTable.vue"
import WalletTopUpDialog from "@/add-os/modules/members/components/WalletTopUpDialog.vue"
import CollectPaymentModal from "@/add-os/modules/payments/components/CollectPaymentModal.vue"
import { ApiError } from "@/add-os/services/api"
import { listBookings } from "@/add-os/services/booking-calendar"
import {
	getMemberSummary,
	listMemberEventRegistrations,
	listMemberMemberships,
	listMemberPayments,
	listMemberServiceRequests,
	listMemberSessions,
	listMemberWalletTransactions
} from "@/add-os/services/member-profile"
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatTime, isCurrencyCode } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t, te } = useI18n()
const route = useRoute()
const router = useRouter()

const userId = Number(route.params.id)

const summary = ref<MemberProfileSummary | null>(null)
const isLoading = ref(false)
const loadFailed = ref(false)
const topUpVisible = ref(false)
const collectVisible = ref(false)
const tab = ref("overview")

const member = computed(() => summary.value?.member ?? null)

function initials(name: string | null | undefined): string {
	return (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase()
}

/** `H:MM`, the same in both languages. */
function duration(seconds: number): string {
	const minutes = Math.floor(seconds / 60)
	return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`
}

function points(value: number | null | undefined): string {
	return value === null || value === undefined ? "—" : t("memberProfile.points", { points: formatNumber(value) })
}

function money(amount: { value: string, currency: string }): string {
	return formatCurrency(amount.value, isCurrencyCode(amount.currency) ? { currency: amount.currency } : {})
}

function tag(label: string, type: "success" | "warning" | "error" | "info" | "default" = "default") {
	return h(NTag, { size: "small", round: true, bordered: false, type }, { default: () => label })
}

const byId = (row: { id: number }) => row.id

function openSession(type: SessionType, id: number): void {
	router.push({ name: "bookings.activeSessionDetail", params: { type, id } })
}

function poolShare(poolPoints: number): string {
	const total = summary.value?.wallet.points ?? 0
	if (total <= 0) return "100%"
	const pct = Math.min(100, Math.max(8, Math.round((poolPoints / total) * 100)))
	return `${pct}%`
}

/* ── Header KPI cards ─────────────────────────────────────────────────────── */

const cards = computed(() => {
	const s = summary.value
	if (!s) return []
	return [
		{
			key: "wallet",
			icon: "carbon:wallet",
			label: t("memberProfile.cards.wallet"),
			value: points(s.wallet.points),
			hint: null,
			tone: "text-[var(--add-primary-text)]",
			iconBg: "bg-[var(--add-brand-smart-olive)]/15",
			iconColor: "text-[var(--add-primary-text)]"
		},
		{
			key: "owed",
			icon: "carbon:warning",
			label: t("memberProfile.cards.owed"),
			value: points(s.outstanding.points),
			hint: s.outstanding.points > 0 ? `${money(s.outstanding.amount)} · ${t("memberProfile.cards.items", { count: s.outstanding.items })}` : null,
			tone: s.outstanding.points > 0 ? "text-[var(--add-danger-text)]" : "text-[var(--add-brand-charcoal-backbone)]",
			iconBg: s.outstanding.points > 0 ? "bg-[var(--add-danger)]/15" : "bg-[var(--add-brand-warm-mist)]/50",
			iconColor: s.outstanding.points > 0 ? "text-[var(--add-danger-text)]" : "text-[var(--add-brand-charcoal-backbone)]"
		},
		{
			key: "plan",
			icon: "carbon:badge",
			label: t("memberProfile.cards.plan"),
			value: s.membership?.plan ?? t("memberProfile.cards.noPlan"),
			hint: s.membership
				? [s.membership.hours_remaining !== null ? t("memberProfile.cards.hoursLeft", { hours: formatNumber(s.membership.hours_remaining) }) : null, s.membership.period_end ? t("memberProfile.cards.until", { date: formatDate(s.membership.period_end) }) : null].filter(Boolean).join(" · ")
				: null,
			tone: "text-[var(--add-brand-levant-deep-teal)]",
			iconBg: "bg-[var(--add-brand-antique-copper)]/15",
			iconColor: "text-[var(--add-brand-antique-copper)]"
		},
		{
			key: "bookings",
			icon: "carbon:calendar",
			label: t("memberProfile.cards.bookings"),
			value: formatNumber(s.counts.bookings),
			hint: t("memberProfile.cards.upcoming", { count: s.counts.upcoming_bookings }),
			tone: "text-[var(--add-brand-charcoal-backbone)]",
			iconBg: "bg-[var(--add-brand-levant-deep-teal)]/15",
			iconColor: "text-[var(--add-brand-levant-deep-teal)]"
		},
		{
			key: "sessions",
			icon: "carbon:time",
			label: t("memberProfile.cards.sessions"),
			value: formatNumber(s.counts.sessions),
			hint: null,
			tone: "text-[var(--add-brand-charcoal-backbone)]",
			iconBg: "bg-[var(--add-brand-deep-teal)]/15",
			iconColor: "text-[var(--add-brand-deep-teal)]"
		},
		{
			key: "lastVisit",
			icon: "carbon:calendar",
			label: t("memberProfile.cards.lastVisit"),
			value: s.last_visit_at ? formatDate(s.last_visit_at) : "—",
			hint: s.last_visit_at ? formatTime(s.last_visit_at) : null,
			tone: "text-[var(--add-brand-charcoal-backbone)]",
			iconBg: "bg-[var(--add-brand-charcoal-backbone)]/10",
			iconColor: "text-[var(--add-brand-charcoal-backbone)]"
		}
	]
})

const activity = computed(() => {
	const s = summary.value
	if (!s) return []
	return [
		{ label: t("memberProfile.cards.pointsSpent"), value: points(s.counts.points_spent) },
		{ label: t("memberProfile.tabs.serviceRequests"), value: formatNumber(s.counts.service_requests) },
		{ label: t("memberProfile.tabs.events"), value: formatNumber(s.counts.event_registrations) }
	]
})

/* ── Profile tab ──────────────────────────────────────────────────── */

const profile = computed(() => summary.value!.profile)

/** Label/value rows; a value the member left empty reads as a dash, not a gap. */
const ProfileFields = defineComponent({
	name: "ProfileFields",
	props: { fields: { type: Array as PropType<{ label: string, value: string | null | undefined, ltr?: boolean }[]>, required: true } },
	setup(props) {
		return () => h("dl", { class: "grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs sm:text-sm" }, props.fields.map(field => h("div", { class: "flex flex-col gap-0.5" }, [
			h("dt", { class: "text-xs font-medium text-[var(--add-text-muted)]" }, field.label),
			h("dd", { class: "text-[var(--add-text-primary)] font-semibold" }, field.value ? (field.ltr ? h("bdi", { dir: "ltr" }, field.value) : field.value) : "—")
		])))
	}
})

const personalFields = computed(() => [
	{ label: t("memberProfile.profile.city"), value: profile.value.personal.city },
	{ label: t("memberProfile.profile.gender"), value: profile.value.personal.gender ? t(`memberProfile.profile.genders.${profile.value.personal.gender}`) : null }
])

const accountFields = computed(() => {
	const account = profile.value.account
	return [
		{ label: t("memberProfile.profile.phone"), value: account.phone, ltr: true },
		{ label: t("memberProfile.profile.email"), value: account.email, ltr: true },
		{ label: t("memberProfile.profile.status"), value: t(`members.status.${account.status}`) },
		{ label: t("memberProfile.profile.roles"), value: account.roles.join(", ") },
		{ label: t("memberProfile.profile.language"), value: account.preferred_language ? t(`memberProfile.profile.languages.${account.preferred_language}`) : null },
		{ label: t("memberProfile.profile.currency"), value: account.preferred_currency },
		{ label: t("memberProfile.profile.joined"), value: account.joined_at ? formatDateTime(account.joined_at) : null },
		{ label: t("memberProfile.profile.updated"), value: account.updated_at ? formatDateTime(account.updated_at) : null }
	]
})

const professionalFields = computed(() => [
	{ label: t("memberProfile.profile.jobTitle"), value: profile.value.professional.job_title },
	{ label: t("memberProfile.profile.companyName"), value: profile.value.professional.company_name },
	{ label: t("memberProfile.profile.industry"), value: profile.value.professional.industry }
])

/** Only the links the member filled in, each opening in a new tab. */
const links = computed(() => {
	const l = profile.value.links
	return [
		{ key: "linkedin", label: "LinkedIn", url: l.linkedin_url, icon: "carbon:logo-linkedin" },
		{ key: "instagram", label: "Instagram", url: l.instagram_url, icon: "carbon:logo-instagram" },
		{ key: "behance", label: "Behance", url: l.behance_url, icon: "carbon:link" },
		{ key: "website", label: t("memberProfile.profile.website"), url: l.website_url, icon: "carbon:earth" }
	].filter((link): link is typeof link & { url: string } => !!link.url)
})

const consentFields = computed(() => [
	{ label: t("memberProfile.profile.privacyAgreed"), value: profile.value.privacy_policy_agreed_at ? formatDateTime(profile.value.privacy_policy_agreed_at) : t("memberProfile.profile.notAgreed") },
	{ label: t("memberProfile.profile.devices"), value: String(profile.value.devices.length) }
])

/* ── Filters ──────────────────────────────────────────────────────── */

function options(prefix: string, values: string[]): SelectOption[] {
	return values.map(value => ({ label: t(`${prefix}.${value}`), value }))
}

const paymentStateFilter = computed<ProfileFilter>(() => ({
	key: "payment_state",
	placeholder: t("memberProfile.filters.paymentState"),
	options: options("allBookings.paymentState", ["paid", "unpaid"])
}))

const bookingFilters = computed<ProfileFilter[]>(() => [
	{ key: "status", placeholder: t("memberProfile.filters.status"), options: options("allBookings.status", ["pending", "confirmed", "completed", "no_show", "cancelled", "rejected"]) },
	paymentStateFilter.value
])

const sessionFilters = computed<ProfileFilter[]>(() => [
	{ key: "type", placeholder: t("memberProfile.filters.type"), options: options("activeSessions.type", ["booking", "walkin"]) },
	paymentStateFilter.value,
	{ key: "open", placeholder: t("memberProfile.filters.state"), options: [{ label: t("memberProfile.sessionOpen"), value: 1 }, { label: t("memberProfile.sessionClosed"), value: 0 }] }
])

const walletFilters = computed<ProfileFilter[]>(() => [
	{ key: "type", placeholder: t("memberProfile.filters.direction"), options: options("memberProfile.direction", ["credit", "debit"]) },
	{ key: "category", placeholder: t("memberProfile.filters.category"), options: (summary.value?.wallet.categories ?? []).map(pool => ({ label: pool.label, value: pool.category })) }
])

const paymentFilters = computed<ProfileFilter[]>(() => [
	{ key: "status", placeholder: t("memberProfile.filters.status"), options: options("memberProfile.paymentStatus", ["pending", "accepted", "failed", "canceled", "reversed", "expired", "needs_review"]) },
	{ key: "purpose", placeholder: t("memberProfile.filters.purpose"), options: options("memberProfile.purpose", ["booking", "booking_extension", "coworking_session", "wallet_top_up", "plan_purchase", "event_registration"]) }
])

const requestFilters = computed<ProfileFilter[]>(() => [
	{ key: "status", placeholder: t("memberProfile.filters.status"), options: options("operationsRequests.status", ["pending", "in_progress", "resolved", "rejected", "cancelled"]) }
])

const eventFilters = computed<ProfileFilter[]>(() => [
	{ key: "status", placeholder: t("memberProfile.filters.status"), options: options("memberProfile.registrationStatus", ["pending", "approved", "rejected"]) }
])

/* ── Loaders and columns ──────────────────────────────────────────── */

function loadBookings(query: Record<string, unknown>) {
	return listBookings({ ...query, user_id: userId })
}

const bookingColumns = computed<DataTableColumns<AdminBooking>>(() => [
	{ title: "#", key: "id", width: 70 },
	{ title: t("memberProfile.columns.space"), key: "space", render: row => row.space.title ?? "—" },
	{ title: t("memberProfile.columns.when"), key: "start_at", render: row => `${formatDate(row.start_at)} · ${formatTime(row.start_at)} – ${formatTime(row.end_at)}` },
	{ title: t("memberProfile.columns.status"), key: "status", render: row => tag(row.status_label, row.status === "confirmed" || row.status === "completed" ? "success" : row.status === "pending" ? "warning" : "default") },
	{ title: t("memberProfile.columns.payment"), key: "payment_state", render: row => tag(t(`allBookings.paymentState.${row.payment_state}`), row.payment_state === "paid" ? "success" : "warning") },
	{ title: t("memberProfile.columns.checkedIn"), key: "checked_in_at", render: row => (row.checked_in_at ? formatTime(row.checked_in_at) : "—") },
	{ title: t("memberProfile.columns.checkedOut"), key: "checked_out_at", render: row => (row.checked_out_at ? formatTime(row.checked_out_at) : "—") }
])

const sessionColumns = computed<DataTableColumns<MemberSession>>(() => [
	{ title: t("memberProfile.columns.type"), key: "type", render: row => tag(t(`activeSessions.type.${row.type}`)) },
	{ title: t("memberProfile.columns.space"), key: "space", render: row => row.space.name ?? "—" },
	{ title: t("memberProfile.columns.checkedIn"), key: "checked_in_at", render: row => formatDateTime(row.checked_in_at) },
	{ title: t("memberProfile.columns.checkedOut"), key: "checked_out_at", render: row => (row.checked_out_at ? formatTime(row.checked_out_at) : tag(t("memberProfile.sessionOpen"), "success")) },
	{ title: t("memberProfile.columns.duration"), key: "duration_seconds", render: row => h("bdi", { dir: "ltr" }, duration(row.duration_seconds)) },
	{ title: t("memberProfile.columns.fromPlan"), key: "plan_covered_seconds", render: row => (row.plan_covered_seconds ? h("bdi", { dir: "ltr" }, duration(row.plan_covered_seconds)) : "—") },
	{ title: t("memberProfile.columns.price"), key: "price_points", render: row => points(row.price_points) },
	{ title: t("memberProfile.columns.payment"), key: "payment_state", render: row => (row.payment_state ? tag(t(`allBookings.paymentState.${row.payment_state}`), row.payment_state === "paid" ? "success" : "warning") : "—") },
	{
		title: "",
		key: "actions",
		render: row => h(NButton, { size: "tiny", secondary: true, onClick: () => openSession(row.type, row.id) }, { default: () => t("memberProfile.details") })
	}
])

const membershipColumns = computed<DataTableColumns<MemberMembership>>(() => [
	{ title: t("memberProfile.columns.plan"), key: "plan", render: row => row.plan.name ?? "—" },
	{ title: t("memberProfile.columns.via"), key: "via", render: row => (row.via === "company" ? `${t("memberProfile.viaCompany")} · ${row.company?.name ?? ""}` : t("memberProfile.viaPersonal")) },
	{ title: t("memberProfile.columns.period"), key: "period", render: row => `${row.current_period_start ? formatDate(row.current_period_start) : "—"} – ${row.current_period_end ? formatDate(row.current_period_end) : "—"}` },
	{
		title: t("memberProfile.columns.status"),
		key: "status",
		render: row => (row.current_period_end && new Date(row.current_period_end) < new Date() ? tag(t("memberProfile.membershipEnded")) : tag(t("memberProfile.membershipActive"), "success"))
	},
	{ title: t("memberProfile.columns.desks"), key: "desks", render: row => (row.desks.length ? row.desks.map(desk => desk.code).join(", ") : "—") }
])

const walletColumns = computed<DataTableColumns<MemberWalletTransaction>>(() => [
	{ title: t("memberProfile.columns.date"), key: "created_at", render: row => formatDateTime(row.created_at) },
	{ title: t("memberProfile.columns.description"), key: "title", render: row => h("div", { class: "flex flex-col" }, [h("span", { class: "font-medium" }, row.title), h("span", { class: "text-xs text-[var(--add-text-muted)]" }, row.kind_label)]) },
	{ title: t("memberProfile.columns.category"), key: "category", render: row => row.category_label },
	{ title: t("memberProfile.columns.method"), key: "method", render: row => row.method_label ?? "—" },
	{
		title: t("memberProfile.columns.points"),
		key: "points",
		render: row => h("span", { class: row.points < 0 ? "font-bold font-numeric text-[var(--add-danger-text)]" : "font-bold font-numeric text-[var(--add-primary-text)]" }, `${row.points > 0 ? "+" : ""}${formatNumber(row.points)}`)
	}
])

const paymentColumns = computed<DataTableColumns<MemberPayment>>(() => [
	{ title: "#", key: "id", width: 70 },
	{ title: t("memberProfile.columns.date"), key: "created_at", render: row => (row.created_at ? formatDateTime(row.created_at) : "—") },
	{ title: t("memberProfile.columns.purpose"), key: "purpose", render: row => t(`memberProfile.purpose.${row.purpose}`) },
	{ title: t("memberProfile.columns.method"), key: "method", render: row => (te(`memberProfile.method.${row.method}`) ? t(`memberProfile.method.${row.method}`) : row.method) },
	{ title: t("memberProfile.columns.points"), key: "amount_points", render: row => points(row.amount_points ?? row.points_to_credit) },
	{
		title: t("memberProfile.columns.status"),
		key: "status",
		render: row => tag(t(`memberProfile.paymentStatus.${row.status}`), row.status === "accepted" ? "success" : row.status === "pending" || row.status === "needs_review" ? "warning" : "default")
	}
])

const requestColumns = computed<DataTableColumns<MemberServiceRequest>>(() => [
	{ title: t("memberProfile.columns.reference"), key: "reference", render: row => row.reference ?? `#${row.id}` },
	{ title: t("memberProfile.columns.service"), key: "service_name", render: row => row.service_name ?? "—" },
	{ title: t("memberProfile.columns.date"), key: "submitted_at", render: row => (row.submitted_at ? formatDateTime(row.submitted_at) : "—") },
	{ title: t("memberProfile.columns.status"), key: "status", render: row => tag(t(`operationsRequests.status.${row.status}`), row.status === "resolved" ? "success" : row.status === "pending" || row.status === "in_progress" ? "warning" : "default") },
	{ title: t("memberProfile.columns.note"), key: "resolution_note", render: row => row.resolution_note ?? "—" }
])

const eventColumns = computed<DataTableColumns<MemberEventRegistration>>(() => [
	{ title: t("memberProfile.columns.event"), key: "event", render: row => row.event.title ?? "—" },
	{ title: t("memberProfile.columns.when"), key: "start_at", render: row => (row.event.start_at ? formatDateTime(row.event.start_at) : "—") },
	{ title: t("memberProfile.columns.status"), key: "status", render: row => tag(t(`memberProfile.registrationStatus.${row.status}`), row.status === "approved" ? "success" : row.status === "pending" ? "warning" : "default") },
	{ title: t("memberProfile.columns.attended"), key: "attended", render: row => (row.attended ? tag(t("memberProfile.yes"), "success") : t("memberProfile.no")) },
	{ title: t("memberProfile.columns.price"), key: "price_points", render: row => (row.price_points ? points(row.price_points) : t("memberProfile.free")) },
	{ title: t("memberProfile.columns.payment"), key: "payment_state", render: row => (row.payment_state && row.price_points ? tag(t(`allBookings.paymentState.${row.payment_state}`), row.payment_state === "paid" ? "success" : "warning") : "—") }
])

/* ── Load ─────────────────────────────────────────────────────────── */

async function loadSummary(): Promise<void> {
	isLoading.value = true
	loadFailed.value = false
	try {
		summary.value = await getMemberSummary(userId)
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		loadFailed.value = true
	} finally {
		isLoading.value = false
	}
}

onMounted(loadSummary)

defineExpose({ summary, tab, loadSummary })
</script>
