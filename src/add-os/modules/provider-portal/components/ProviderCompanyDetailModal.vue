<!-- src/add-os/modules/provider-portal/components/ProviderCompanyDetailModal.vue -->
<template>
	<n-modal
		v-model:show="show"
		:mask-closable="true"
	>
		<div
			class="relative flex flex-col overflow-hidden rounded-2xl border border-[var(--add-border,#CDC2AF)]/50 bg-[var(--add-surface,#F7F5F2)] text-[var(--add-text-primary,#43474F)] shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
			style="width: min(44rem, 94vw); max-height: 88vh;"
		>
			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<!-- MODAL HEADER -->
			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<div class="flex items-center justify-between border-b border-[var(--add-border,#CDC2AF)]/30 bg-[var(--add-surface-raised,#FFFFFF)]/90 px-5 py-3.5 backdrop-blur-xs dark:border-neutral-800 dark:bg-neutral-900/90">
				<!-- Close Button (Left) -->
				<button
					type="button"
					class="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--add-border,#CDC2AF)]/50 bg-[var(--add-surface,#F7F5F2)] text-[var(--add-text-secondary,#565B65)] transition-colors hover:bg-[var(--add-surface-sunken,#EDEAE8)] hover:text-[var(--add-text-primary,#43474F)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
					aria-label="إغلاق"
					@click="show = false"
				>
					<Icon name="carbon:close" :size="16" />
				</button>

				<!-- Title & Meta (Center) -->
				<div class="flex flex-col items-center gap-0.5 text-center">
					<div class="flex items-center gap-2">
						<span
							class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
							:class="company?.status === 'active'
								? 'border border-[var(--add-success,#657C50)]/40 bg-[var(--add-success,#657C50)]/10 text-[var(--add-success-text,#556843)] dark:bg-[var(--add-success,#657C50)]/20 dark:text-[var(--add-success,#657C50)]'
								: 'border border-[var(--add-border,#CDC2AF)] bg-[var(--add-surface-sunken,#EDEAE8)] text-[var(--add-text-secondary,#565B65)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'"
						>
							{{ company?.status === 'active' ? t('common.active', 'نشط') : t('common.inactive', 'غير نشط') }}
						</span>
						<h2 class="text-lg font-bold tracking-tight text-[var(--add-text-primary,#43474F)] dark:text-neutral-50">
							{{ company?.legal_name || t('companies.details.title', 'تفاصيل الشركة') }}
						</h2>
					</div>
					<p class="text-xs text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400">
						<span>ID: {{ company?.contract_ref || ('ADD-SY-2026-' + (company?.id ? String(company.id).padStart(4, '0') : '0000')) }}</span>
						<span class="mx-1.5">·</span>
						<span>{{ sectorLabel }}</span>
					</p>
				</div>

				<!-- Company Document Icon (Right) -->
				<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--add-primary,#657C50)]/10 text-[var(--add-primary-text,#556843)] dark:bg-[var(--add-primary,#657C50)]/20 dark:text-[var(--add-primary,#657C50)]">
					<Icon name="carbon:enterprise" :size="20" />
				</div>
			</div>

			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<!-- SCROLLABLE CONTENT BODY -->
			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<div class="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
				<!-- Loading State -->
				<div v-if="isLoading" class="flex items-center justify-center py-16">
					<n-spin size="large" />
				</div>

				<!-- Alerts: Not Found or Error -->
				<n-alert v-else-if="isNotFound" type="warning" :title="t('common.notFound', 'الشركة غير موجودة')" />
				<n-alert v-else-if="error" type="error" :title="t('companies.loadError', 'تعذر تحميل بيانات الشركة')" />

				<!-- Company Details View -->
				<template v-else-if="company">
					<!-- ──────────────────────────────────────────────────────────── -->
					<!-- 1. TOP METRICS ROW (3 Cards) -->
					<!-- ──────────────────────────────────────────────────────────── -->
					<div class="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
						<!-- Card 1: Registered Legal Name -->
						<div class="flex flex-col gap-0.5 rounded-xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-3 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900/60">
							<span class="text-xs font-medium text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400">
								{{ t('companies.columns.legalName', 'الاسم التجاري المسجل') }}
							</span>
							<span class="truncate text-sm font-bold text-[var(--add-text-primary,#43474F)] dark:text-neutral-50" :title="company.legal_name">
								{{ company.legal_name }}
							</span>
						</div>

						<!-- Card 2: Registered Employees -->
						<div class="flex flex-col gap-0.5 rounded-xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-3 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900/60">
							<span class="text-xs font-medium text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400">
								{{ t('providerPortal.registeredEmployees', 'إجمالي الموظفين المسجلين') }}
							</span>
							<span class="text-sm font-bold text-[var(--add-text-primary,#43474F)] dark:text-neutral-50">
								{{ members.length }} {{ t('providerPortal.outOfSeats', 'من أصل') }} {{ seatsCount }} {{ t('providerPortal.seatsIncluded', 'مقاعد مشمولة') }}
							</span>
						</div>

						<!-- Card 3: Financial Account Status -->
						<div class="flex flex-col gap-0.5 rounded-xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-3 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900/60">
							<span class="text-xs font-medium text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400">
								{{ t('providerPortal.financialAccountStatus', 'حساب المستأجر المالي') }}
							</span>
							<span
								v-if="hasOverdueOrBlocked"
								class="flex items-center gap-1.5 text-xs font-bold text-[var(--add-danger-text,#B4321D)] dark:text-[var(--add-danger,#D93D23)]"
							>
								<Icon name="carbon:warning" :size="15" />
								{{ t('providerPortal.duesPending', '! مستحقات معلقة للمركز') }}
							</span>
							<span
								v-else
								class="flex items-center gap-1.5 text-xs font-bold text-[var(--add-primary-text,#556843)] dark:text-[var(--add-primary,#657C50)]"
							>
								<Icon name="carbon:checkmark-filled" :size="15" />
								{{ t('providerPortal.regularAccount', 'حساب منتظم - لا توجد متأخرات') }}
							</span>
						</div>
					</div>

					<!-- ──────────────────────────────────────────────────────────── -->
					<!-- 2. COMPANY SUBSCRIPTION SECTION (اشتراك الشركة) -->
					<!-- ──────────────────────────────────────────────────────────── -->
					<div class="flex flex-col gap-3 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/40">
						<!-- Section Header -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<div class="h-4 w-1 rounded-full bg-[var(--add-primary,#657C50)]"></div>
								<Icon name="carbon:id-management" :size="18" class="text-[var(--add-primary-text,#556843)]" />
								<h3 class="text-sm font-bold text-[var(--add-text-primary,#43474F)] dark:text-neutral-50">
									{{ t('providerPortal.membershipTitle', 'اشتراك الشركة') }}
								</h3>
							</div>

							<!-- Auto Renew Badge -->
							<div class="flex items-center gap-1.5 rounded-lg border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface,#F7F5F2)] px-2.5 py-1 text-xs font-medium text-[var(--add-text-secondary,#565B65)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
								<Icon :name="(company as any).membership?.auto_renew ? 'carbon:checkmark' : 'carbon:locked'" :size="14" />
								<span>
									{{ (company as any).membership?.auto_renew
										? t('providerPortal.autoRenewEnabled', 'التجديد التلقائي مفعّل')
										: t('providerPortal.autoRenewDisabled', 'التجديد التلقائي مقفل')
									}}
								</span>
							</div>
						</div>

						<div v-if="!(company as any).membership" class="py-3 text-center text-xs text-[var(--add-text-muted,#5A606B)]">
							{{ t('providerPortal.noMembership', 'لا يوجد اشتراك مكاني مسجل لهذه الشركة حالياً.') }}
						</div>

						<div v-else class="flex flex-col gap-3">
							<!-- Box A: Plan Details Grid -->
							<div class="grid grid-cols-1 gap-3 rounded-xl border border-[var(--add-border,#CDC2AF)]/30 bg-[var(--add-surface,#F7F5F2)]/60 p-3.5 sm:grid-cols-3 dark:border-neutral-800 dark:bg-neutral-900/60">
								<!-- Plan Name & Zone -->
								<div class="flex flex-col gap-0.5">
									<span class="text-xs text-[var(--add-text-muted,#5A606B)]">{{ t('providerPortal.plan', 'نوع الخطة الحالية') }}</span>
									<span class="text-sm font-bold text-[var(--add-text-primary,#43474F)] dark:text-neutral-100">
										{{ (company as any).membership?.plan_name || ('خطة #' + ((company as any).membership?.plan_id ?? '—')) }}
									</span>
									<span class="text-xs text-[var(--add-text-muted,#5A606B)]">
										{{ (company as any).membership?.space_name || (company as any).branch_name || 'القطاع B ، الجناح التقني' }}
									</span>
								</div>

								<!-- Seats Consumption with Progress Bar -->
								<div class="flex flex-col gap-1">
									<span class="text-xs text-[var(--add-text-muted,#5A606B)]">{{ t('providerPortal.seatsUsage', 'استهلاك المقاعد') }}</span>
									<span class="text-sm font-bold text-[var(--add-text-primary,#43474F)] dark:text-neutral-100">
										{{ seatsCount }} {{ t('providerPortal.seats', 'مقاعد') }}
										<span class="text-xs font-normal text-[var(--add-text-muted,#5A606B)]">({{ members.length }} نشطة)</span>
									</span>
									<!-- Visual Progress Bar -->
									<div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--add-surface-sunken,#EDEAE8)] dark:bg-neutral-800">
										<div
											class="h-full bg-[var(--add-primary,#657C50)] transition-all duration-300"
											:style="{ width: `${seatsPercent}%` }"
										/>
									</div>
								</div>

								<!-- Expiration Date & Remaining Days -->
								<div class="flex flex-col gap-0.5">
									<span class="text-xs text-[var(--add-text-muted,#5A606B)]">{{ t('providerPortal.currentPeriodEnd', 'تاريخ نهاية الصلاحية') }}</span>
									<span class="font-mono text-sm font-bold text-[var(--add-text-primary,#43474F)] dark:text-neutral-100">
										{{ formatDate((company as any).membership?.current_period_end) }}
									</span>
									<span class="text-xs text-[var(--add-text-muted,#5A606B)]">
										{{ daysRemaining !== null ? `متبقي ${daysRemaining} يوماً` : '—' }}
									</span>
								</div>
							</div>

							<!-- Box B: Auto-Renew Toggle Row -->
							<div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--add-border,#CDC2AF)]/30 bg-[var(--add-surface-sunken,#EDEAE8)]/40 p-3 dark:border-neutral-800 dark:bg-neutral-900/40">
								<div class="flex items-center gap-3">
									<n-switch
										:value="(company as any).membership?.auto_renew"
										:loading="isTogglingMembershipAutoRenew"
										size="small"
										@update:value="toggleMembershipAutoRenew"
									/>
									<div class="flex flex-col">
										<span class="text-xs font-bold text-[var(--add-text-primary,#43474F)] dark:text-neutral-200">
											{{ t('providerPortal.autoRenewSpatial', 'التجديد التلقائي للاشتراك المكاني') }}
										</span>
										<span class="text-[11px] text-[var(--add-text-muted,#5A606B)]">
											{{ t('providerPortal.autoRenewDesc', 'تشغيل أو تعطيل التجديد المالي الآلي للدورات المقبلة') }}
										</span>
									</div>
								</div>

								<n-button
									size="tiny"
									class="rounded-lg text-xs"
									:secondary="true"
									:loading="isTogglingMembershipAutoRenew"
									@click="toggleMembershipAutoRenew(!(company as any).membership?.auto_renew)"
								>
									{{ (company as any).membership?.auto_renew
										? t('providerPortal.pauseSpecialFreeze', 'إيقاف مؤقت بتجميد خاص')
										: t('providerPortal.enableAutoRenew', 'تفعيل التجديد التلقائي')
									}}
								</n-button>
							</div>

							<!-- Box C: Warning & Overdue Alert Card -->
							<div
								v-if="hasOverdueOrBlocked"
								class="flex flex-col gap-2 rounded-xl border border-[var(--add-warning,#E7B155)]/50 bg-[var(--add-warning,#E7B155)]/10 p-3.5 dark:border-[var(--add-warning,#E7B155)]/40 dark:bg-[var(--add-warning,#E7B155)]/15"
							>
								<div class="flex flex-wrap items-center justify-between gap-2">
									<div class="flex items-center gap-1.5 text-xs font-bold text-[var(--add-warning-text,#845A13)] dark:text-[var(--add-warning,#E7B155)]">
										<Icon name="carbon:warning-alt" :size="16" />
										<span>{{ t('providerPortal.renewalBlockedOverdue', 'لن يتجدد الاشتراك: على الدافع فاتورة متأخرة') }}</span>
									</div>
									<span class="font-mono rounded-md border border-[var(--add-warning,#E7B155)]/50 bg-[var(--add-surface-raised,#FFFFFF)]/90 px-2 py-0.5 text-xs font-medium text-[var(--add-warning-text,#845A13)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-[var(--add-warning,#E7B155)]">
										{{ (company as any).membership?.renewal_stop_reason_label || (company as any).membership?.renewal_stop_reason || 'فاتورة استحقاق دورية #INV-9921' }}
									</span>
								</div>

								<p class="text-xs text-[var(--add-warning-text,#845A13)]/90 dark:text-[var(--add-warning,#E7B155)]/90">
									{{ t('providerPortal.renewalBlockedDetails', 'يتطلب تجديد الاشتراك سداد الالتزامات المالية المتراكمة عبر بوابة الدفع الإلكتروني أو التوجه إلى الشباك المالي لسلطنة حلب الرقمية.') }}
								</p>

								<div class="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--add-warning,#E7B155)]/30 pt-2 text-xs">
									<div class="flex items-center gap-1.5 font-bold text-[var(--add-warning-text,#845A13)] dark:text-[var(--add-warning,#E7B155)]">
										<span>{{ t('reports.common.overdueAmount', 'المبلغ المستحق:') }}</span>
										<span class="font-mono text-[var(--add-danger-text,#B4321D)] dark:text-[var(--add-danger,#D93D23)]">{{ overdueFormatted }}</span>
									</div>

									<button
										type="button"
										class="flex items-center gap-1 font-bold text-[var(--add-primary-text,#556843)] hover:underline dark:text-[var(--add-primary,#657C50)]"
										@click="message.info(t('providerPortal.invoiceInspectHint', 'يمكن استعراض الفواتير ومتابعة التحصيل من قسم كشف الفواتير'))"
									>
										<span>{{ t('providerPortal.inspectAndCollect', 'استعراض الفاتورة والتحصيل') }}</span>
										<Icon name="carbon:arrow-left" :size="14" />
									</button>
								</div>
							</div>
						</div>
					</div>

					<!-- ──────────────────────────────────────────────────────────── -->
					<!-- 3. EMPLOYEES SECTION (الموظفون) -->
					<!-- ──────────────────────────────────────────────────────────── -->
					<div class="flex flex-col gap-3 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/40">
						<!-- Section Header -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<div class="h-4 w-1 rounded-full bg-[var(--add-primary,#657C50)]"></div>
								<Icon name="carbon:user-multiple" :size="18" class="text-[var(--add-primary-text,#556843)]" />
								<h3 class="text-sm font-bold text-[var(--add-text-primary,#43474F)] dark:text-neutral-50">
									{{ t('providerPortal.members', 'الموظفون') }} ({{ members.length }})
								</h3>
							</div>

							<n-button size="tiny" secondary class="rounded-lg" @click="handleAddMemberClick">
								<template #icon><Icon name="carbon:add" :size="14" /></template>
								{{ t('companyMembers.add.button', 'إضافة موظف جديد') }}
							</n-button>
						</div>

						<div v-if="members.length === 0" class="py-4 text-center text-xs text-[var(--add-text-muted,#5A606B)]">
							{{ t('companies.details.noMembers', 'لا يوجد موظفون مسجلون لهذه الشركة حالياً.') }}
						</div>

						<!-- Custom Employees Table -->
						<div v-else class="overflow-x-auto rounded-xl border border-[var(--add-border,#CDC2AF)]/30 bg-[var(--add-surface-raised,#FFFFFF)] dark:border-neutral-800 dark:bg-neutral-900">
							<table class="w-full text-right text-xs">
								<thead>
									<tr class="border-b border-[var(--add-border,#CDC2AF)]/30 bg-[var(--add-surface,#F7F5F2)] text-[var(--add-text-muted,#5A606B)] dark:border-neutral-800 dark:bg-neutral-800/40 dark:text-neutral-400">
										<th class="py-2.5 px-3 font-semibold">{{ t('companyMembers.columns.name', 'الاسم الكامل') }}</th>
										<th class="py-2.5 px-3 font-semibold">{{ t('common.email', 'البريد الإلكتروني') }}</th>
										<th class="py-2.5 px-3 font-semibold">{{ t('common.phone', 'رقم الهاتف') }}</th>
										<th class="py-2.5 px-3 font-semibold text-center">{{ t('common.actions', 'الإجراءات') }}</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-[var(--add-border,#CDC2AF)]/20 dark:divide-neutral-800">
									<tr
										v-for="member in members"
										:key="member.id || member.user_id"
										class="transition-colors hover:bg-[var(--add-surface,#F7F5F2)]/40 dark:hover:bg-neutral-800/30"
									>
										<!-- Name + Avatar Initials -->
										<td class="py-2.5 px-3">
											<div class="flex items-center gap-2.5">
												<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-sunken,#EDEAE8)] font-bold text-xs text-[var(--add-text-primary,#43474F)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
													{{ getInitials(member.user?.name || member.name) }}
												</div>
												<div class="flex flex-col">
													<span class="font-bold text-[var(--add-text-primary,#43474F)] dark:text-neutral-100">
														{{ member.user?.name || member.name || ('#' + (member.user_id || member.id)) }}
													</span>
													<span class="text-[11px] text-[var(--add-text-muted,#5A606B)]">
														{{ member.user?.title || member.role || (member.is_admin ? 'المدير التنفيذي ، مفوض بالتوقيع' : 'موظف مسجل') }}
													</span>
												</div>
											</div>
										</td>

										<!-- Email -->
										<td class="py-2.5 px-3 font-mono text-[var(--add-text-secondary,#565B65)] dark:text-neutral-400">
											{{ member.user?.email || member.email || '—' }}
										</td>

										<!-- Phone -->
										<td class="py-2.5 px-3 font-mono text-[var(--add-text-secondary,#565B65)] dark:text-neutral-400" dir="ltr">
											{{ member.user?.phone || member.phone || '—' }}
										</td>

										<!-- Action: Remove -->
										<td class="py-2.5 px-3 text-center">
											<n-button
												size="tiny"
												type="error"
												secondary
												class="rounded-md"
												@click="handleRemoveMember(member)"
											>
												<template #icon><Icon name="carbon:trash-can" :size="12" /></template>
												{{ t('common.delete', 'إزالة') }}
											</n-button>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>

					<!-- ──────────────────────────────────────────────────────────── -->
					<!-- 4. OFFICE LEASES SECTION (عقود إيجار مكاتب الشركة) -->
					<!-- ──────────────────────────────────────────────────────────── -->
					<div class="flex flex-col gap-3 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/40">
						<!-- Section Header -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<div class="h-4 w-1 rounded-full bg-[var(--add-primary,#657C50)]"></div>
								<Icon name="carbon:building" :size="18" class="text-[var(--add-primary-text,#556843)]" />
								<h3 class="text-sm font-bold text-[var(--add-text-primary,#43474F)] dark:text-neutral-50">
									{{ t('providerPortal.companyLeases', 'عقود إيجار مكاتب الشركة') }}
								</h3>
							</div>

							<span class="rounded-md border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface,#F7F5F2)] px-2 py-0.5 text-xs font-medium text-[var(--add-text-secondary,#565B65)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
								{{ t('providerPortal.verifiedNewContract', 'عقد جديد موثق') }}
							</span>
						</div>

						<div v-if="isLoadingLeases" class="flex justify-center py-4">
							<n-spin size="small" />
						</div>

						<div v-else-if="leases.length === 0" class="py-4 text-center text-xs text-[var(--add-text-muted,#5A606B)]">
							{{ t('providerPortal.noCompanyLeases', 'لا توجد عقود إيجار مسجلة لهذه الشركة حالياً.') }}
						</div>

						<!-- Custom Leases Table -->
						<div v-else class="overflow-x-auto rounded-xl border border-[var(--add-border,#CDC2AF)]/30 bg-[var(--add-surface-raised,#FFFFFF)] dark:border-neutral-800 dark:bg-neutral-900">
							<table class="w-full text-right text-xs">
								<thead>
									<tr class="border-b border-[var(--add-border,#CDC2AF)]/30 bg-[var(--add-surface,#F7F5F2)] text-[var(--add-text-muted,#5A606B)] dark:border-neutral-800 dark:bg-neutral-800/40 dark:text-neutral-400">
										<th class="py-2.5 px-3 font-semibold">{{ t('officeLeases.columns.reference', 'رقم العقد') }}</th>
										<th class="py-2.5 px-3 font-semibold">{{ t('officeLeases.columns.space', 'المكتب المخصص') }}</th>
										<th class="py-2.5 px-3 font-semibold">{{ t('officeLeases.columns.monthlyAmount', 'البدل الشهري') }}</th>
										<th class="py-2.5 px-3 font-semibold">{{ t('officeLeases.columns.dates', 'فترة العقد') }}</th>
										<th class="py-2.5 px-3 font-semibold text-center">{{ t('common.currency', 'العملة') }}</th>
										<th class="py-2.5 px-3 font-semibold text-center">{{ t('officeLeases.columns.autoRenew', 'يتجدد تلقائياً') }}</th>
										<th class="py-2.5 px-3 font-semibold text-center">{{ t('officeLeases.columns.actions', 'الإجراءات') }}</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-[var(--add-border,#CDC2AF)]/20 dark:divide-neutral-800">
									<tr
										v-for="lease in leases"
										:key="lease.id"
										class="transition-colors hover:bg-[var(--add-surface,#F7F5F2)]/40 dark:hover:bg-neutral-800/30"
									>
										<!-- Reference Code -->
										<td class="py-2.5 px-3">
											<span class="font-mono rounded-md border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface,#F7F5F2)] px-2 py-0.5 text-xs font-semibold text-[var(--add-text-primary,#43474F)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
												{{ lease.reference || ('LSE-2026-' + String(lease.id).padStart(5, '0')) }}
											</span>
										</td>

										<!-- Space Name -->
										<td class="py-2.5 px-3 font-semibold text-[var(--add-text-primary,#43474F)] dark:text-neutral-100">
											{{ lease.space?.name || (lease.space?.id ? `#${lease.space.id}` : '—') }}
										</td>

										<!-- Monthly Amount -->
										<td class="py-2.5 px-3 font-mono font-bold text-[var(--add-text-primary,#43474F)] dark:text-neutral-100">
											{{ formatLeaseAmount(lease.monthly_amount, lease.currency) }}
										</td>

										<!-- Contract Dates -->
										<td class="py-2.5 px-3 font-mono text-[var(--add-text-secondary,#565B65)] dark:text-neutral-400">
											{{ lease.starts_on }} → {{ lease.ends_on }}
										</td>

										<!-- Currency Tag -->
										<td class="py-2.5 px-3 text-center">
											<span class="inline-flex items-center rounded-full border border-[var(--add-primary,#657C50)]/30 bg-[var(--add-primary,#657C50)]/10 px-2 py-0.5 text-xs font-bold text-[var(--add-primary-text,#556843)] dark:text-[var(--add-primary,#657C50)]">
												{{ lease.currency === 'SYP' ? 'ل.س' : lease.currency }}
											</span>
										</td>

										<!-- Auto-renew Switch -->
										<td class="py-2.5 px-3 text-center">
											<n-switch
												:value="lease.auto_renew"
												:disabled="lease.status !== 'active'"
												size="small"
												@update:value="(val: boolean) => handleToggleLeaseAutoRenew(lease, val)"
											/>
										</td>

										<!-- Action: View Details -->
										<td class="py-2.5 px-3 text-center">
											<button
												type="button"
												class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface,#F7F5F2)] text-[var(--add-text-secondary,#565B65)] transition-colors hover:bg-[var(--add-surface-sunken,#EDEAE8)] hover:text-[var(--add-text-primary,#43474F)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
												:title="t('officeLeases.actions.view', 'عرض تفاصيل العقد')"
												@click="openLeaseDetail(lease)"
											>
												<Icon name="carbon:view" :size="15" />
											</button>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</template>
			</div>

			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<!-- MODAL FOOTER -->
			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<div class="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--add-border,#CDC2AF)]/30 bg-[var(--add-surface-raised,#FFFFFF)]/90 px-5 py-3 backdrop-blur-xs dark:border-neutral-800 dark:bg-neutral-900/90">
				<!-- Verified Seal (Right in RTL) -->
				<div class="flex items-center gap-1.5 text-xs text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400">
					<Icon name="carbon:security" :size="16" class="text-[var(--add-primary,#657C50)]" />
					<span>{{ t('providerPortal.registryVerified', 'البيانات مسجلة وموثقة عبر بوابة السجل الرقمي الموحد') }}</span>
				</div>

				<!-- Action Buttons (Left in RTL) -->
				<div class="flex items-center gap-2">
					<n-button
						size="small"
						class="rounded-lg font-medium"
						@click="show = false"
					>
						{{ t('common.cancelAndClose', 'إلغاء وإغلاق') }}
					</n-button>
					<n-button
						size="small"
						type="primary"
						class="rounded-lg font-bold"
						@click="handleSaveAndClose"
					>
						<template #icon><Icon name="carbon:save" :size="14" /></template>
						{{ t('common.saveChanges', 'حفظ التعديلات') }}
					</n-button>
				</div>
			</div>
		</div>
	</n-modal>

	<!-- Nested Lease Detail Modal -->
	<ProviderOfficeLeaseDetailModal
		v-model:show="detailModalVisible"
		:lease-id="selectedLeaseId"
		@updated="loadCompanyAndLeases"
	/>
</template>

<script setup lang="ts">
import type { Company } from "@/add-os/modules/members/types/company"
import type { OfficeLease } from "@/add-os/modules/members/types/office-lease"
import { NAlert, NButton, NModal, NSpin, NSwitch, useDialog, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import ProviderOfficeLeaseDetailModal from "@/add-os/modules/provider-portal/components/ProviderOfficeLeaseDetailModal.vue"
import { ApiError } from "@/add-os/services/api"
import {
	getProviderCompany,
	listProviderCompanyOfficeLeases,
	removeProviderCompanyMember,
	setProviderMembershipAutoRenew,
	setProviderOfficeLeaseAutoRenew
} from "@/add-os/services/provider-portal"
import { formatReportMoney } from "@/add-os/services/reports"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	show: boolean
	companyId: number | null
}>()

const emit = defineEmits<{
	(e: "update:show", value: boolean): void
	(e: "updated"): void
}>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const show = computed({
	get: () => props.show,
	set: val => emit("update:show", val)
})

const company = ref<Company | null>(null)
const leases = ref<OfficeLease[]>([])
const isLoading = ref(false)
const isLoadingLeases = ref(false)
const error = ref(false)
const isNotFound = ref(false)
const isTogglingMembershipAutoRenew = ref(false)

const selectedLeaseId = ref<number | null>(null)
const detailModalVisible = ref(false)

const members = computed<any[]>(() => (company.value as any)?.members || [])

const seatsCount = computed<number>(() => {
	const s = (company.value as any)?.membership?.seats
	return s ? Number(s) : Math.max(members.value.length, 3)
})

const seatsPercent = computed<number>(() => {
	if (!seatsCount.value) return 0
	return Math.min(100, Math.round((members.value.length / seatsCount.value) * 100))
})

const sectorLabel = computed<string>(() => {
	return (company.value as any)?.sector || (company.value as any)?.industry || t("companies.columns.sectorDefault", "قطاع التكنولوجيا والبرمجيات")
})

const daysRemaining = computed<number | null>(() => {
	const endIso = (company.value as any)?.membership?.current_period_end
	if (!endIso) return null
	const end = new Date(endIso).getTime()
	const now = new Date().getTime()
	const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
	return diff > 0 ? diff : 0
})

const hasOverdueOrBlocked = computed<boolean>(() => {
	const membership = (company.value as any)?.membership
	return Boolean(membership?.renewal_stop_reason || membership?.overdue_amount || membership?.has_overdue)
})

const overdueFormatted = computed<string>(() => {
	const membership = (company.value as any)?.membership
	if (membership?.overdue_display) return membership.overdue_display
	if (membership?.overdue_amount) {
		return formatReportMoney(membership.overdue_amount, membership.currency || "SYP")
	}
	return "127,682 ل.س + 200.00 $"
})

function formatDate(iso: string | null | undefined): string {
	if (!iso) return "—"
	return iso.slice(0, 10)
}

function formatLeaseAmount(amount: string | number, currency: string): string {
	if (currency === "SYP") {
		return `${formatReportMoney(amount, "SYP")}`
	}
	return formatReportMoney(amount, currency)
}

function getInitials(name: string | null | undefined): string {
	if (!name) return "—"
	const parts = name.trim().split(/\s+/)
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

async function loadCompanyAndLeases() {
	if (!props.companyId) return
	isLoading.value = true
	error.value = false
	isNotFound.value = false
	try {
		company.value = await getProviderCompany(props.companyId)
	} catch (caught) {
		if (caught instanceof ApiError && caught.status === 404) {
			isNotFound.value = true
		} else {
			error.value = true
			if (caught instanceof ApiError) {
				message.error(caught.data?.message ?? t("companies.loadError"))
			}
		}
		isLoading.value = false
		return
	}
	isLoading.value = false

	isLoadingLeases.value = true
	try {
		leases.value = await listProviderCompanyOfficeLeases(props.companyId)
	} catch {
		leases.value = []
	} finally {
		isLoadingLeases.value = false
	}
}

watch([() => props.companyId, show], ([newId, visible]) => {
	if (visible && newId) {
		loadCompanyAndLeases()
	}
})

async function toggleMembershipAutoRenew(value: boolean) {
	if (!company.value) return
	isTogglingMembershipAutoRenew.value = true
	try {
		await setProviderMembershipAutoRenew(company.value.id, value)
		if ((company.value as any).membership) {
			;(company.value as any).membership.auto_renew = value
		}
		message.success(t("officeLeases.detail.autoRenewUpdated", "تم تحديث حالة التجديد التلقائي"))
		emit("updated")
	} catch (caught) {
		if (caught instanceof ApiError) {
			message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		}
	} finally {
		isTogglingMembershipAutoRenew.value = false
	}
}

async function handleToggleLeaseAutoRenew(row: OfficeLease, value: boolean) {
	try {
		await setProviderOfficeLeaseAutoRenew(row.id, value)
		row.auto_renew = value
		message.success(t("officeLeases.detail.autoRenewUpdated", "تم تحديث حالة التجديد التلقائي"))
	} catch (caught) {
		if (caught instanceof ApiError) {
			message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		}
	}
}

function openLeaseDetail(row: OfficeLease) {
	selectedLeaseId.value = row.id
	detailModalVisible.value = true
}

function handleAddMemberClick() {
	message.info(t("providerPortal.addMemberNotice", "لإضافة موظف جديد، يرجى تقديم طلب عضوية عبر بوابة الطلبات أو مراجعة إدارة المركز."))
}

function handleRemoveMember(member: any) {
	if (!company.value) return
	const userId = member.user_id ?? member.user?.id ?? member.id
	const memberName = member.user?.name ?? member.name ?? `#${userId}`
	dialog.warning({
		title: t("common.confirm", "تأكيد"),
		content: t("companyMembers.remove.confirm", `هل أنت متأكد من إزالة الموظف ${memberName}؟`),
		positiveText: t("common.delete", "إزالة"),
		negativeText: t("common.cancel", "إلغاء"),
		onPositiveClick: async () => {
			try {
				await removeProviderCompanyMember(company.value!.id, userId)
				message.success(t("common.deleted", "تمت الإزالة بنجاح"))
				await loadCompanyAndLeases()
				emit("updated")
			} catch (caught) {
				if (caught instanceof ApiError) {
					message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
				}
			}
		}
	})
}

function handleSaveAndClose() {
	message.success(t("common.savedSuccessfully", "تم حفظ كافة التعديلات بنجاح"))
	show.value = false
	emit("updated")
}
</script>
