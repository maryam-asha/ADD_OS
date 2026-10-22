<!-- src/add-os/modules/providers/views/ProvidersListPage.vue -->
<template>
	<div class="flex flex-col gap-6 text-[var(--add-text-primary,#43474F)]">
		<!-- ════════════════════════════════════════════════════════════════════════ -->
		<!-- PAGE HEADER -->
		<!-- ════════════════════════════════════════════════════════════════════════ -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div class="flex flex-col gap-1">
				<div class="flex items-center gap-3">
					<h1 class="text-2xl font-bold tracking-tight text-[var(--add-text-primary,#43474F)]">
						{{ t("providers.title", "المزوّدون") }}
					</h1>
					<span
						class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
						style="background-color: rgba(101, 124, 80, 0.1); color: var(--add-primary-text, #556843); border: 1px solid rgba(101, 124, 80, 0.25);"
					>
						{{ t("providers.registeredBadge", { count: data.length }) }}
					</span>
				</div>
				<p class="text-xs text-[var(--add-text-muted,#5A606B)]">
					{{ t("providers.description", "إدارة مزودي الخدمات، العقود التشغيلية، شروط السداد، وحسابات الدخول لبوابة المزوّدين.") }}
				</p>
			</div>

			<!-- Actions: Refresh & Create Provider -->
			<div class="flex items-center gap-2 shrink-0">
				<n-button size="small" secondary :loading="isLoading" class="rounded-lg" @click="refetch">
					<template #icon><Icon name="carbon:renew" :size="15" /></template>
					{{ t("common.refresh", "تحديث") }}
				</n-button>
				<n-button type="primary" class="rounded-lg font-medium" @click="openCreate">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("providers.create", "إنشاء مزوّد") }}
				</n-button>
			</div>
		</div>

		<!-- ════════════════════════════════════════════════════════════════════════ -->
		<!-- STAT CARDS (3 Balanced Cards) -->
		<!-- ════════════════════════════════════════════════════════════════════════ -->
		<div v-if="!error && !isLoading" class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<!-- 1. Total Providers -->
			<div class="rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-5 shadow-xs flex flex-col justify-between gap-4">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-muted,#5A606B)]">
						{{ t("providers.stats.total", "إجمالي المزوّدين") }}
					</span>
					<div
						class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
						style="background-color: rgba(101, 124, 80, 0.08); color: var(--add-primary-text, #556843);"
					>
						<Icon name="carbon:enterprise" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-2">
					<span class="text-3xl font-bold tracking-tight text-[var(--add-text-primary,#43474F)] font-mono">
						{{ data.length }}
					</span>
					<span class="text-xs text-[var(--add-text-muted,#5A606B)] font-medium">
						{{ activeCount }} {{ t("providers.status.active", "نشط") }} / {{ inactiveCount }} {{ t("providers.status.inactive", "غير نشط") }}
					</span>
				</div>
			</div>

			<!-- 2. Active Providers -->
			<div class="rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-5 shadow-xs flex flex-col justify-between gap-4">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-muted,#5A606B)]">
						{{ t("providers.stats.active", "المزوّدون النشطون") }}
					</span>
					<div
						class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
						style="background-color: rgba(101, 124, 80, 0.12); color: var(--add-primary-text, #556843);"
					>
						<Icon name="carbon:checkmark-outline" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-2">
					<span class="text-3xl font-bold tracking-tight text-[var(--add-text-primary,#43474F)] font-mono">
						{{ activeCount }}
					</span>
					<span class="text-xs font-medium" style="color: var(--add-primary-text, #556843);">
						{{ activePercentage }}% من الإجمالي
					</span>
				</div>
			</div>

			<!-- 3. Inactive Providers -->
			<div class="rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-5 shadow-xs flex flex-col justify-between gap-4">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-muted,#5A606B)]">
						{{ t("providers.stats.inactive", "غير النشطين") }}
					</span>
					<div
						class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
						style="background-color: rgba(231, 177, 85, 0.12); color: var(--add-warning-text, #845A13);"
					>
						<Icon name="carbon:warning-alt-filled" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-2">
					<span class="text-3xl font-bold tracking-tight text-[var(--add-text-primary,#43474F)] font-mono">
						{{ inactiveCount }}
					</span>
					<span class="text-xs font-medium text-[var(--add-text-muted,#5A606B)]">
						{{ inactivePercentage }}% من الإجمالي
					</span>
				</div>
			</div>
		</div>

		<!-- Error Alert -->
		<n-alert v-if="error" type="error" :title="t('providers.error')" class="rounded-xl" />

		<!-- ════════════════════════════════════════════════════════════════════════ -->
		<!-- FILTER BAR -->
		<!-- ════════════════════════════════════════════════════════════════════════ -->
		<div class="rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-3.5 shadow-xs">
			<div class="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
				<!-- Search Input (6 Cols) -->
				<div class="sm:col-span-6">
					<n-input
						v-model:value="searchQuery"
						clearable
						size="small"
						:placeholder="t('providers.searchPlaceholder', 'البحث باسم المزوّد أو رقم العقد...')"
						class="w-full"
					>
						<template #prefix>
							<Icon name="carbon:search" :size="16" class="text-[var(--add-text-muted,#5A606B)]" />
						</template>
					</n-input>
				</div>

				<!-- Status Filter (6 Cols) -->
				<div class="sm:col-span-6 flex items-center gap-2">
					<n-select
						v-model:value="statusFilter"
						:options="statusFilterOptions"
						size="small"
						class="flex-1"
					/>

					<!-- Clear Filters -->
					<n-button
						v-if="searchQuery || statusFilter !== 'all'"
						size="small"
						quaternary
						class="rounded-lg text-xs shrink-0"
						@click="resetFilters"
					>
						<template #icon><Icon name="carbon:filter-reset" :size="14" /></template>
						{{ t("common.reset", "إعادة ضبط") }}
					</n-button>
				</div>
			</div>
		</div>

		<!-- ════════════════════════════════════════════════════════════════════════ -->
		<!-- DATA TABLE -->
		<!-- ════════════════════════════════════════════════════════════════════════ -->
		<div class="rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-5 shadow-xs flex flex-col gap-4 add-ledger-table">
			<n-data-table
				:columns="columns"
				:data="filteredData"
				:loading="isLoading"
				:row-key="(row: Provider) => row.id"
				:bordered="false"
				:scroll-x="880"
				size="small"
			>
				<template #empty>
					<div class="flex flex-col items-center justify-center py-12 text-center text-[var(--add-text-muted,#5A606B)]">
						<Icon name="carbon:document-blank" :size="40" class="mb-2 opacity-50" />
						<span class="text-sm font-semibold text-[var(--add-text-primary,#43474F)]">
							{{ t("providers.empty.title", "لا يوجد مزوّدون مطابقون") }}
						</span>
						<span class="text-xs mt-1">
							{{ t("providers.empty.desc", "لم يتم العثور على أي مزوّد يطابق معايير البحث الحالية.") }}
						</span>
					</div>
				</template>
			</n-data-table>

			<!-- Table Footer Summary -->
			<div class="flex items-center justify-between border-t border-[var(--add-border,#CDC2AF)]/20 pt-3 text-xs text-[var(--add-text-muted,#5A606B)]">
				<span>
					{{ t("providers.registeredBadge", { count: filteredData.length }) }}
				</span>
				<span>
					{{ activeCount }} {{ t("providers.status.active", "نشط") }}
				</span>
			</div>
		</div>

		<!-- ════════════════════════════════════════════════════════════════════════ -->
		<!-- DIALOG: CREATE / EDIT PROVIDER -->
		<!-- ════════════════════════════════════════════════════════════════════════ -->
		<n-modal
			v-model:show="showForm"
			preset="card"
			class="max-w-2xl w-full !rounded-2xl shadow-xl my-6"
			style="max-height: 85vh; display: flex; flex-direction: column;"
			content-style="max-height: calc(85vh - 145px); overflow-y: auto;"
			:mask-closable="false"
			:segmented="{ content: 'soft', footer: 'soft' }"
		>
			<!-- Custom Modal Header -->
			<template #header>
				<div class="flex items-center gap-3">
					<div
						class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
						style="background-color: rgba(101, 124, 80, 0.1); color: var(--add-primary, #657C50);"
					>
						<Icon :name="editingId ? 'carbon:edit' : 'carbon:enterprise'" :size="20" />
					</div>
					<div class="flex flex-col">
						<span class="text-base font-bold text-[var(--add-text-primary,#43474F)]">
							{{ editingId ? t("providers.edit", "تعديل المزوّد") : t("providers.create", "إنشاء مزوّد جديد") }}
						</span>
						<span class="text-xs text-[var(--add-text-muted,#5A606B)]">
							{{ editingId ? t("providers.form.providerInfoHint", "تحديث بيانات المزوّد والعقد التشغيلي ومهلة السداد.") : t("providers.newAccount.hint", "إدخال بيانات المزوّد وإنشاء حساب الدخول الأول للبوابة.") }}
						</span>
					</div>
				</div>
			</template>

			<!-- Form Content (Dialog-level scrolling, no inner scroll container) -->
			<n-form ref="formRef" :model="formModel" :rules="rules" label-placement="top" class="flex flex-col gap-5 pt-2">
					<!-- Section 1: Provider & Contract Information -->
					<div class="flex flex-col gap-3">
						<div class="flex items-center gap-2 border-b border-[var(--add-border,#CDC2AF)]/30 pb-2">
							<Icon name="carbon:enterprise" :size="16" class="text-[var(--add-primary,#657C50)]" />
							<span class="text-sm font-bold text-[var(--add-text-primary,#43474F)]">
								{{ t("providers.form.providerInfoSection", "بيانات المزوّد والعقد التشغيلي") }}
							</span>
						</div>

						<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
							<!-- Provider Name -->
							<n-form-item path="name" :label="t('providers.name', 'اسم المزوّد')" class="sm:col-span-2">
								<n-input
									v-model:value="form.name"
									:placeholder="t('providers.form.namePlaceholder', 'أدخل اسم المزوّد...')"
									class="rounded-lg"
								>
									<template #prefix>
										<Icon name="carbon:enterprise" :size="16" class="text-[var(--add-text-muted,#5A606B)]" />
									</template>
								</n-input>
							</n-form-item>

							<!-- Contract Reference -->
							<n-form-item path="contract_ref" :label="t('providers.contract', 'رقم / مرجع العقد')">
								<n-input
									v-model:value="form.contract_ref"
									:placeholder="t('providers.form.contractPlaceholder', 'مثال: CON-2026-001')"
									class="rounded-lg font-mono"
								>
									<template #prefix>
										<Icon name="carbon:document" :size="16" class="text-[var(--add-text-muted,#5A606B)]" />
									</template>
								</n-input>
							</n-form-item>

							<!-- Payment Terms (Days) -->
							<n-form-item path="payment_terms_days" :label="t('providers.paymentTerms', 'مدة الدفع (أيام)')">
								<n-input-number
									v-model:value="form.payment_terms_days"
									:min="1"
									:max="365"
									clearable
									class="w-full rounded-lg"
									:placeholder="t('providers.paymentTermsDefault', 'الافتراضي (من الإعدادات)')"
								>
									<template #prefix>
										<Icon name="carbon:calendar" :size="16" class="text-[var(--add-text-muted,#5A606B)]" />
									</template>
									<template #suffix>
										<span class="text-xs text-[var(--add-text-muted,#5A606B)]">{{ t("providers.form.daysSuffix", "يوم") }}</span>
									</template>
								</n-input-number>
							</n-form-item>
						</div>
					</div>

					<!-- Section 2: Initial Portal Account (Create Only) -->
					<div
						v-if="!editingId"
						class="flex flex-col gap-3 rounded-xl border border-[var(--add-border,#CDC2AF)]/50 bg-[var(--add-surface,#F7F5F2)]/70 p-4"
					>
						<div class="flex items-start justify-between gap-2 border-b border-[var(--add-border,#CDC2AF)]/30 pb-2.5">
							<div class="flex items-center gap-2">
								<Icon name="carbon:user-admin" :size="17" class="text-[var(--add-primary,#657C50)]" />
								<span class="text-sm font-bold text-[var(--add-text-primary,#43474F)]">
									{{ t("providers.newAccount.title", "حساب الدخول لبوابة المزوّد") }}
								</span>
							</div>
							<n-tag size="small" round type="primary" :bordered="false" class="font-medium text-xs">
								حساب البوابة الأول
							</n-tag>
						</div>

						<p class="text-xs text-[var(--add-text-muted,#5A606B)] leading-relaxed">
							{{ t("providers.form.accountHint", "يُنشأ هذا الحساب لتمكين ممثل المزوّد من تسجيل الدخول إلى البوابة وإدارة الشركات والفواتير.") }}
						</p>

						<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
							<!-- Account Name -->
							<n-form-item path="account.name" :label="t('providers.newAccount.name', 'اسم المسؤول')">
								<n-input v-model:value="account.name" placeholder="الاسم الكامل" class="rounded-lg">
									<template #prefix>
										<Icon name="carbon:user" :size="16" class="text-[var(--add-text-muted,#5A606B)]" />
									</template>
								</n-input>
							</n-form-item>

							<!-- Account Phone -->
							<n-form-item path="account.phone" :label="t('providers.newAccount.phone', 'رقم الهاتف')">
								<n-input
									v-model:value="account.phone"
									placeholder="+9639XXXXXXXX"
									dir="ltr"
									class="rounded-lg font-mono"
									@blur="account.phone = toInternationalPhone(account.phone)"
								>
									<template #prefix>
										<Icon name="carbon:phone" :size="16" class="text-[var(--add-text-muted,#5A606B)]" />
									</template>
								</n-input>
							</n-form-item>

							<!-- Account Email -->
							<n-form-item path="account.email" :label="t('providers.newAccount.email', 'البريد الإلكتروني')" class="sm:col-span-2">
								<n-input
									v-model:value="account.email"
									type="text"
									inputmode="email"
									dir="ltr"
									placeholder="provider@example.com"
									class="rounded-lg font-mono"
								>
									<template #prefix>
										<Icon name="carbon:email" :size="16" class="text-[var(--add-text-muted,#5A606B)]" />
									</template>
								</n-input>
							</n-form-item>

							<!-- Account Password -->
							<n-form-item path="account.password" :label="t('providers.newAccount.password', 'كلمة المرور')">
								<n-input
									v-model:value="account.password"
									type="password"
									show-password-on="click"
									placeholder="8 أحرف على الأقل"
									class="rounded-lg"
								>
									<template #prefix>
										<Icon name="carbon:locked" :size="16" class="text-[var(--add-text-muted,#5A606B)]" />
									</template>
								</n-input>
							</n-form-item>

							<!-- Password Confirmation -->
							<n-form-item path="account.password_confirmation" :label="t('providers.newAccount.passwordConfirmation', 'تأكيد كلمة المرور')">
								<n-input
									v-model:value="account.password_confirmation"
									type="password"
									show-password-on="click"
									placeholder="أعد إدخال كلمة المرور"
									class="rounded-lg"
								>
									<template #prefix>
										<Icon name="carbon:locked" :size="16" class="text-[var(--add-text-muted,#5A606B)]" />
									</template>
								</n-input>
							</n-form-item>
						</div>
					</div>
				</n-form>

			<!-- Modal Footer -->
			<template #footer>
				<div class="flex items-center justify-end gap-2.5">
					<n-button secondary class="rounded-lg" @click="showForm = false">
						{{ t("resourceCrud.form.cancel", "إلغاء") }}
					</n-button>
					<n-button
						type="primary"
						class="rounded-lg font-medium px-5"
						:loading="isSubmitting"
						@click="submitForm"
					>
						<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
						{{ editingId ? t("resourceCrud.form.submit", "حفظ التعديلات") : t("providers.create", "إنشاء المزوّد") }}
					</n-button>
				</div>
			</template>
		</n-modal>

		<!-- ════════════════════════════════════════════════════════════════════════ -->
		<!-- DIALOG: MANAGE PORTAL ACCOUNTS -->
		<!-- ════════════════════════════════════════════════════════════════════════ -->
		<n-modal
			v-model:show="showAccounts"
			preset="card"
			class="max-w-lg w-full !rounded-2xl shadow-xl my-6"
			style="max-height: 85vh; display: flex; flex-direction: column;"
			content-style="max-height: calc(85vh - 145px); overflow-y: auto;"
			:segmented="{ content: 'soft', footer: 'soft' }"
		>
			<template #header>
				<div class="flex items-center gap-3">
					<div
						class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
						style="background-color: rgba(0, 127, 145, 0.1); color: var(--add-info, #007F91);"
					>
						<Icon name="carbon:user-multiple" :size="20" />
					</div>
					<div class="flex flex-col">
						<span class="text-base font-bold text-[var(--add-text-primary,#43474F)]">
							{{ t("providers.accounts.title", { name: accountsProvider?.name ?? "" }) }}
						</span>
						<span class="text-xs text-[var(--add-text-muted,#5A606B)]">
							{{ t("providers.accounts.hint", "إدارة الحسابات المخولة بالدخول إلى بوابة المزوّد.") }}
						</span>
					</div>
				</div>
			</template>

			<div v-if="isLoadingAccounts" class="flex justify-center py-10">
				<n-spin size="large" />
			</div>

			<div v-else class="flex flex-col gap-4">
				<!-- Accounts List -->
				<div class="flex flex-col gap-2">
					<span class="text-xs font-semibold text-[var(--add-text-muted,#5A606B)]">
						الحسابات المرتبطة حالياً ({{ accounts.length }})
					</span>

					<div
						v-if="!accounts.length"
						class="rounded-xl border border-dashed border-[var(--add-border,#CDC2AF)]/50 bg-[var(--add-surface,#F7F5F2)]/40 p-4 text-center text-xs text-[var(--add-text-muted,#5A606B)]"
					>
						{{ t("providers.accounts.empty", "لا توجد حسابات مرتبطة بعد.") }}
					</div>

					<div class="flex flex-col gap-2">
						<div
							v-for="acc in accounts"
							:key="acc.id"
							class="flex items-center justify-between gap-3 rounded-xl border border-[var(--add-border,#CDC2AF)]/30 bg-[var(--add-surface-raised,#FFFFFF)] p-3 shadow-2xs"
						>
							<div class="flex items-center gap-2.5 min-w-0">
								<div class="w-8 h-8 rounded-full bg-[var(--add-surface,#F7F5F2)] flex items-center justify-center text-[var(--add-text-secondary,#565B65)] shrink-0">
									<Icon name="carbon:user" :size="16" />
								</div>
								<div class="flex flex-col min-w-0">
									<span class="text-xs font-bold text-[var(--add-text-primary,#43474F)] truncate">
										{{ acc.name }}
									</span>
									<span class="text-[11px] font-mono text-[var(--add-text-muted,#5A606B)] truncate" dir="ltr">
										{{ acc.email || "بدون بريد" }}
									</span>
								</div>
							</div>

							<n-button
								size="tiny"
								secondary
								type="error"
								class="rounded-lg shrink-0"
								@click="unlink(acc.id)"
							>
								<template #icon><Icon name="carbon:close" :size="12" /></template>
								{{ t("providers.accounts.unlink", "فك الربط") }}
							</n-button>
						</div>
					</div>
				</div>

				<!-- Link New Account Section -->
				<div class="flex flex-col gap-2 border-t border-[var(--add-border,#CDC2AF)]/30 pt-3">
					<span class="text-xs font-semibold text-[var(--add-text-muted,#5A606B)]">
						{{ t("providers.accounts.pick", "ربط حساب مستخدم إضافي") }}
					</span>
					<div class="flex gap-2">
						<n-select
							v-model:value="accountToLink"
							:options="linkableOptions"
							filterable
							clearable
							size="small"
							:placeholder="t('providers.accounts.pick', 'اختاروا حساباً بدور مزوّد')"
							class="flex-1"
						/>
						<n-button
							type="primary"
							size="small"
							class="rounded-lg"
							:disabled="!accountToLink"
							:loading="isSubmitting"
							@click="link"
						>
							<template #icon><Icon name="carbon:add" :size="14" /></template>
							{{ t("providers.accounts.link", "ربط") }}
						</n-button>
					</div>
				</div>
			</div>

			<template #footer>
				<div class="flex justify-end">
					<n-button secondary size="small" class="rounded-lg" @click="showAccounts = false">
						{{ t("common.close", "إغلاق") }}
					</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, FormInst, FormRules, SelectOption } from "naive-ui"
import type { Provider } from "@/add-os/modules/providers/types"
import type { User } from "@/add-os/modules/system/types/user"
import type { NewProviderAccount } from "@/add-os/services/providers"
import { NAlert, NButton, NDataTable, NForm, NFormItem, NInput, NInputNumber, NModal, NSelect, NSpin, NTag, useDialog, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { ApiError } from "@/add-os/services/api"
import { createProvider, getProvider, linkProviderUser, listProviders, unlinkProviderUser, updateProvider, updateProviderStatus } from "@/add-os/services/providers"
import { listUsers } from "@/add-os/services/users"
import { formatNumber } from "@/add-os/utils/format"
import { isValidPhone, toInternationalPhone } from "@/add-os/utils/phone"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()
const dialog = useDialog()
const message = useMessage()

const { data, isLoading, error, refetch } = useResourceList<Provider>(listProviders)
const isSubmitting = ref(false)

// ── Search & Filter State ─────────────────────────────────────────────────────
const searchQuery = ref("")
const statusFilter = ref<"all" | "active" | "inactive">("all")

const statusFilterOptions = computed<SelectOption[]>(() => [
	{ label: t("providers.allStatuses", "كافة الحالات"), value: "all" },
	{ label: t("providers.status.active", "نشط"), value: "active" },
	{ label: t("providers.status.inactive", "غير نشط"), value: "inactive" }
])

function resetFilters() {
	searchQuery.value = ""
	statusFilter.value = "all"
}

// ── Computed Statistics ───────────────────────────────────────────────────────
const activeCount = computed(() => data.value.filter(p => p.status === "active").length)
const inactiveCount = computed(() => data.value.filter(p => p.status === "inactive").length)

const activePercentage = computed(() => {
	if (data.value.length === 0) return 0
	return Math.round((activeCount.value / data.value.length) * 100)
})

const inactivePercentage = computed(() => {
	if (data.value.length === 0) return 0
	return Math.round((inactiveCount.value / data.value.length) * 100)
})

// ── Filtered Data ─────────────────────────────────────────────────────────────
const filteredData = computed(() => {
	return data.value.filter(item => {
		// Status filter
		if (statusFilter.value !== "all" && item.status !== statusFilter.value) {
			return false
		}
		// Search query
		if (searchQuery.value.trim()) {
			const q = searchQuery.value.trim().toLowerCase()
			const matchesName = item.name.toLowerCase().includes(q)
			const matchesContract = item.contract_ref?.toLowerCase().includes(q)
			if (!matchesName && !matchesContract) return false
		}
		return true
	})
})

function apiErrorMessage(caught: unknown): string {
	if (caught instanceof ApiError) {
		const errors = caught.data?.errors as Record<string, string[]> | undefined
		const first = errors ? Object.values(errors)[0]?.[0] : undefined
		return first ?? caught.data?.message ?? t("resourceCrud.mutations.genericError")
	}
	return t("resourceCrud.mutations.genericError")
}

// ── DataTable Columns ─────────────────────────────────────────────────────────
const columns = computed<DataTableColumns<Provider>>(() => [
	{
		title: t("providers.name", "المزوّد"),
		key: "name",
		minWidth: 200,
		align: "center",
		render: row =>
			h("div", { class: "inline-flex items-center gap-2.5 py-1" }, [
				h(
					"div",
					{
						class: "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
						style: "background-color: rgba(101, 124, 80, 0.08); color: var(--add-primary, #657C50);"
					},
					[h(Icon, { name: "carbon:enterprise", size: 16 })]
				),
				h("div", { class: "flex flex-col min-w-0 text-start" }, [
					h("span", { class: "text-xs font-bold text-[var(--add-text-primary,#43474F)] truncate" }, row.name),
					h("span", { class: "text-[11px] font-mono text-[var(--add-text-muted,#5A606B)]" }, `#${row.id}`)
				])
			])
	},
	{
		title: t("providers.contract", "رقم العقد"),
		key: "contract_ref",
		width: 140,
		align: "center",
		render: row =>
			h(
				"span",
				{ class: "font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--add-surface,#F7F5F2)] border border-[var(--add-border,#CDC2AF)]/40 text-[var(--add-text-secondary,#565B65)] inline-block whitespace-nowrap" },
				row.contract_ref
			)
	},
	{
		title: t("common.status", "الحالة"),
		key: "status",
		width: 100,
		align: "center",
		render: row =>
			h(
				NTag,
				{
					size: "small",
					round: true,
					bordered: false,
					type: row.status === "active" ? "success" : "default",
					class: "font-medium"
				},
				{ default: () => t(`providers.status.${row.status}`, row.status === "active" ? "نشط" : "غير نشط") }
			)
	},
	{
		title: t("providers.paymentTerms", "مدة الدفع (أيام)"),
		key: "payment_terms_days",
		width: 160,
		align: "center",
		render: row =>
			row.payment_terms_days
				? h("span", { class: "font-mono text-xs font-bold text-[var(--add-text-primary,#43474F)] whitespace-nowrap" }, `${formatNumber(row.payment_terms_days)} يوم`)
				: h("span", { class: "text-xs text-[var(--add-text-muted,#5A606B)] whitespace-nowrap" }, t("providers.paymentTermsDefault", "الافتراضي (من الإعدادات)"))
	},
	{
		title: t("providers.companiesCount", "الشركات"),
		key: "companies_count",
		width: 100,
		align: "center",
		render: row =>
			h(
				"div",
				{ class: "inline-flex items-center justify-center gap-1.5 text-xs text-[var(--add-text-primary,#43474F)]" },
				[
					h(Icon, { name: "carbon:building", size: 14, class: "text-[var(--add-text-muted,#5A606B)]" }),
					h("span", { class: "font-mono font-bold" }, formatNumber(row.companies_count ?? 0))
				]
			)
	},
	{
		title: t("providers.usersCount", "الحسابات"),
		key: "users_count",
		width: 100,
		align: "center",
		render: row =>
			h(
				"div",
				{
					class: "inline-flex items-center justify-center gap-1.5 text-xs cursor-pointer hover:underline text-[var(--add-info-text,#006B7A)]",
					onClick: () => openAccounts(row)
				},
				[
					h(Icon, { name: "carbon:user-multiple", size: 14 }),
					h("span", { class: "font-mono font-bold" }, formatNumber(row.users_count ?? 0))
				]
			)
	},
	{
		title: t("common.actions", "الإجراءات"),
		key: "actions",
		width: 140,
		align: "center",
		render: row =>
			h("div", { class: "inline-flex items-center justify-center gap-1.5" }, [
				// Edit Button (Icon Only)
				h(
					NButton,
					{
						size: "small",
						secondary: true,
						class: "rounded-lg",
						title: t("providers.edit", "تعديل"),
						onClick: () => openEdit(row)
					},
					{
						icon: () => h(Icon, { name: "carbon:edit", size: 15 })
					}
				),
				// Accounts Button (Icon Only)
				h(
					NButton,
					{
						size: "small",
						secondary: true,
						class: "rounded-lg",
						title: t("providers.accounts.button", "الحسابات"),
						onClick: () => openAccounts(row)
					},
					{
						icon: () => h(Icon, { name: "carbon:user-multiple", size: 15 })
					}
				),
				// Toggle Status Button (Icon Only)
				h(
					NButton,
					{
						size: "small",
						secondary: true,
						type: row.status === "active" ? "error" : "success",
						class: "rounded-lg",
						title: row.status === "active" ? t("providers.deactivate", "إيقاف") : t("providers.activate", "تفعيل"),
						onClick: () => toggleStatus(row)
					},
					{
						icon: () => h(Icon, { name: row.status === "active" ? "carbon:pause" : "carbon:play-filled-alt", size: 15 })
					}
				)
			])
	}
])

// ── Create / Edit Form ────────────────────────────────────────────────────────
const showForm = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInst | null>(null)
const form = ref<{ name: string; contract_ref: string; payment_terms_days: number | null }>({
	name: "",
	contract_ref: "",
	payment_terms_days: null
})

function emptyAccount(): NewProviderAccount {
	return { name: "", email: "", phone: "", password: "", password_confirmation: "" }
}

const account = ref<NewProviderAccount>(emptyAccount())
const formModel = computed(() => ({ ...form.value, account: account.value }))

const requiredRule = { required: true, message: t("resourceCrud.form.required", "هذا الحقل مطلوب"), trigger: ["blur", "input"] }
const rules = computed<FormRules>(() => ({
	name: requiredRule,
	contract_ref: requiredRule,
	...(editingId.value
		? {}
		: {
				"account.name": requiredRule,
				"account.email": [
					requiredRule,
					{ type: "email", message: t("providers.newAccount.emailInvalid", "أدخلوا بريداً إلكترونياً صحيحاً"), trigger: ["blur"] }
				],
				"account.phone": [
					requiredRule,
					{
						validator: (_rule: unknown, value: string) => isValidPhone(value),
						message: t("providerRequests.create.phoneInvalid", "رقم الهاتف غير صالح"),
						trigger: ["blur"]
					}
				],
				"account.password": [
					requiredRule,
					{ min: 8, message: t("providers.newAccount.passwordShort", "8 أحرف على الأقل"), trigger: ["blur"] }
				],
				"account.password_confirmation": [
					requiredRule,
					{
						validator: (_rule: unknown, value: string) => value === account.value.password,
						message: t("providers.newAccount.passwordMismatch", "كلمتا المرور غير متطابقتين"),
						trigger: ["blur", "input"]
					}
				]
			})
}))

function openCreate() {
	editingId.value = null
	form.value = { name: "", contract_ref: "", payment_terms_days: null }
	account.value = emptyAccount()
	formRef.value?.restoreValidation()
	showForm.value = true
}

function openEdit(row: Provider) {
	editingId.value = row.id
	form.value = { name: row.name, contract_ref: row.contract_ref, payment_terms_days: row.payment_terms_days }
	formRef.value?.restoreValidation()
	showForm.value = true
}

async function submitForm() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}
	isSubmitting.value = true
	try {
		if (editingId.value) {
			await updateProvider(editingId.value, { ...form.value })
			message.success(t("providers.updated", "تم تحديث المزوّد بنجاح"))
		} else {
			await createProvider({ ...form.value, account: { ...account.value, phone: toInternationalPhone(account.value.phone) } })
			message.success(t("providers.created", "تم إنشاء المزوّد بنجاح"))
		}
		showForm.value = false
		await refetch()
	} catch (caught) {
		message.error(apiErrorMessage(caught))
	} finally {
		isSubmitting.value = false
	}
}

function toggleStatus(row: Provider) {
	const next = row.status === "active" ? "inactive" : "active"
	const run = async () => {
		try {
			await updateProviderStatus(row.id, next)
			message.success(
				next === "active"
					? t("providers.activateSuccess", "تم تفعيل حساب المزوّد بنجاح")
					: t("providers.deactivateSuccess", "تم إيقاف المزوّد بنجاح")
			)
			await refetch()
		} catch (caught) {
			message.error(apiErrorMessage(caught))
		}
	}
	if (next === "inactive") {
		dialog.warning({
			title: t("providers.deactivateConfirmTitle", "إيقاف المزوّد"),
			content: t("providers.deactivateConfirmContent", "إيقاف المزوّد يمنع حساباته من الدخول، لكن شركاته تبقى تعمل ويمكن نقلها لمزوّد آخر."),
			positiveText: t("providers.deactivate", "إيقاف"),
			negativeText: t("resourceCrud.form.cancel", "إلغاء"),
			positiveButtonProps: { type: "error" },
			onPositiveClick: run
		})
	} else {
		dialog.warning({
			title: t("providers.activateConfirmTitle", "تفعيل حساب المزوّد"),
			content: t("providers.activateConfirmContent", "هل أنت متأكد من تفعيل هذا المزوّد؟ سيتمكن مستخدمو المزوّد من تسجيل الدخول إلى البوابة واستئناف العمليات."),
			positiveText: t("providers.activate", "تفعيل"),
			negativeText: t("resourceCrud.form.cancel", "إلغاء"),
			positiveButtonProps: { type: "primary" },
			onPositiveClick: run
		})
	}
}

// ── Accounts Management ───────────────────────────────────────────────────────
const showAccounts = ref(false)
const isLoadingAccounts = ref(false)
const accountsProvider = ref<Provider | null>(null)
const accounts = ref<NonNullable<Provider["users"]>>([])
const providerUsers = ref<User[]>([])
const accountToLink = ref<number | null>(null)

const linkableOptions = computed<SelectOption[]>(() =>
	providerUsers.value
		.filter(u => !accounts.value.some(a => a.id === u.id))
		.map(u => ({ label: u.email ? `${u.name} (${u.email})` : u.name, value: u.id }))
)

async function loadAccounts(id: number) {
	const [provider, users] = await Promise.all([getProvider(id), listUsers({ role: "provider" })])
	accountsProvider.value = provider
	accounts.value = provider.users ?? []
	providerUsers.value = users
}

async function openAccounts(row: Provider) {
	accountsProvider.value = row
	accounts.value = []
	accountToLink.value = null
	showAccounts.value = true
	isLoadingAccounts.value = true
	try {
		await loadAccounts(row.id)
	} catch (caught) {
		message.error(apiErrorMessage(caught))
	} finally {
		isLoadingAccounts.value = false
	}
}

async function link() {
	if (!accountsProvider.value || !accountToLink.value) return
	isSubmitting.value = true
	try {
		await linkProviderUser(accountsProvider.value.id, accountToLink.value)
		message.success(t("providers.accounts.linked", "تم ربط الحساب بنجاح"))
		accountToLink.value = null
		await Promise.all([loadAccounts(accountsProvider.value.id), refetch()])
	} catch (caught) {
		message.error(apiErrorMessage(caught))
	} finally {
		isSubmitting.value = false
	}
}

function unlink(userId: number) {
	if (!accountsProvider.value) return
	dialog.warning({
		title: t("providers.accounts.unlinkConfirmTitle", "فك ربط الحساب"),
		content: t("providers.accounts.unlinkConfirmContent", "هل أنت متأكد من فك ربط هذا الحساب بالمزوّد؟ لن يتمكن هذا المستخدم من الدخول لبوابة هذا المزوّد بعد الآن."),
		positiveText: t("providers.accounts.unlink", "فك الربط"),
		negativeText: t("resourceCrud.form.cancel", "إلغاء"),
		positiveButtonProps: { type: "error" },
		onPositiveClick: async () => {
			try {
				await unlinkProviderUser(accountsProvider.value!.id, userId)
				message.success(t("providers.accounts.unlinked", "تم فك ربط الحساب"))
				await Promise.all([loadAccounts(accountsProvider.value!.id), refetch()])
			} catch (caught) {
				message.error(apiErrorMessage(caught))
			}
		}
	})
}
</script>
