<!-- src/add-os/modules/plans/components/PlanFormDrawer.vue -->
<template>
	<n-modal
		v-model:show="show"
		:mask-closable="true"
		class="!p-0"
	>
		<div class="bg-white rounded-2xl shadow-xl overflow-hidden border border-neutral-200/80 w-[92vw] max-w-[580px] flex flex-col max-h-[85vh]">
			<!-- Header: Start-aligned title & icon according to language direction, close button at end -->
			<div class="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between bg-white shrink-0">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-lg bg-[#f0f7ee] text-[#4d783f] border border-[#d6e8d2] flex items-center justify-center shrink-0">
						<Icon :name="isCreateMode ? 'carbon:add' : 'carbon:edit'" :size="16" />
					</div>
					<div class="flex flex-col">
						<h2 class="text-sm md:text-base font-bold text-neutral-800 leading-tight">
							{{ modeTitle }}
						</h2>
						<span class="text-xs text-neutral-400 font-normal mt-0.5">
							{{ headerSubtitle }}
						</span>
					</div>
				</div>

				<!-- Close button -->
				<button
					type="button"
					class="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
					@click="show = false"
					aria-label="Close"
				>
					<Icon name="carbon:close" :size="16" />
				</button>
			</div>

			<!-- Navigation Tabs Bar: Start-aligned according to language direction -->
			<div class="flex items-center justify-start gap-6 border-b border-neutral-100 px-5 pt-1.5 bg-white shrink-0">
				<button
					type="button"
					@click="activeTab = 'basic'"
					:class="[
						'pb-2.5 px-1 text-xs md:text-sm font-semibold transition-all cursor-pointer border-b-2 flex items-center gap-1.5',
						activeTab === 'basic'
							? 'border-[#557e46] text-[#557e46]'
							: 'border-transparent text-neutral-500 hover:text-neutral-800'
					]"
				>
					{{ t('packages.tabs.basic') }}
				</button>

				<button
					type="button"
					@click="activeTab = 'balances'"
					:class="[
						'pb-2.5 px-1 text-xs md:text-sm font-semibold transition-all cursor-pointer border-b-2 flex items-center gap-1.5',
						activeTab === 'balances'
							? 'border-[#557e46] text-[#557e46]'
							: 'border-transparent text-neutral-500 hover:text-neutral-800'
					]"
				>
					<span>{{ t('packages.tabs.balances') }}</span>
					<span class="px-2 py-0.5 text-[11px] rounded-full bg-[#eef7ec] text-[#47743b] font-bold leading-none">
						{{ balancesList.length }}
					</span>
				</button>

				<button
					type="button"
					@click="activeTab = 'features'"
					:class="[
						'pb-2.5 px-1 text-xs md:text-sm font-semibold transition-all cursor-pointer border-b-2 flex items-center gap-1.5',
						activeTab === 'features'
							? 'border-[#557e46] text-[#557e46]'
							: 'border-transparent text-neutral-500 hover:text-neutral-800'
					]"
				>
					<span>{{ t('packages.tabs.features') }}</span>
					<span class="px-2 py-0.5 text-[11px] rounded-full bg-[#eef7ec] text-[#47743b] font-bold leading-none">
						{{ featuresList.length }}
					</span>
				</button>
			</div>

			<!-- Scrollable Content Area -->
			<div class="overflow-y-auto flex-1 p-4 md:p-5 bg-[#faf9f8] flex flex-col gap-3.5">
				<!-- TAB 1: البيانات الأساسية -->
				<div v-show="activeTab === 'basic'" class="flex flex-col gap-3.5">
					<!-- Card 1: المعلومات الأساسية -->
					<div class="border border-neutral-200/70 rounded-xl p-3.5 bg-white flex flex-col gap-3 shadow-2xs">
						<div class="flex items-center gap-2 text-xs md:text-sm font-bold text-neutral-800">
							<div class="w-6 h-6 rounded-md bg-[#eef7ec] text-[#4d783f] flex items-center justify-center shrink-0">
								<Icon name="carbon:tag" :size="14" />
							</div>
							<span>{{ t('packages.sections.basicInfo') }}</span>
						</div>

						<!-- Row 1: Name Arabic and English -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.form.name') }} (عربي) *</span>
								<input
									v-model="model.name.ar"
									class="w-full h-9 text-xs md:text-sm border border-neutral-200 rounded-lg px-3 bg-white focus:outline-none focus:border-[#557e46] transition-colors"
									:placeholder="t('resourceCrud.form.arabicPlaceholder')"
								/>
								<span v-if="errors['name.ar']" class="text-xs text-red-500">{{ errors['name.ar'][0] }}</span>
							</div>
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">Name (English) *</span>
								<input
									v-model="model.name.en"
									class="w-full h-9 text-xs md:text-sm border border-neutral-200 rounded-lg px-3 bg-white focus:outline-none focus:border-[#557e46] transition-colors"
									:placeholder="t('resourceCrud.form.englishPlaceholder')"
								/>
								<span v-if="errors['name.en']" class="text-xs text-red-500">{{ errors['name.en'][0] }}</span>
							</div>
						</div>

						<!-- Row 2: Subtitle Arabic and English -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.form.subtitle') }} (عربي)</span>
								<input
									v-model="subtitleAr"
									class="w-full h-9 text-xs md:text-sm border border-neutral-200 rounded-lg px-3 bg-white focus:outline-none focus:border-[#557e46] transition-colors"
									:placeholder="t('resourceCrud.form.arabicPlaceholder')"
								/>
							</div>
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">Subtitle (English)</span>
								<input
									v-model="subtitleEn"
									class="w-full h-9 text-xs md:text-sm border border-neutral-200 rounded-lg px-3 bg-white focus:outline-none focus:border-[#557e46] transition-colors"
									:placeholder="t('resourceCrud.form.englishPlaceholder')"
								/>
							</div>
						</div>
					</div>

					<!-- Card 2: التسعير -->
					<div class="border border-neutral-200/70 rounded-xl p-3.5 bg-white flex flex-col gap-3 shadow-2xs">
						<div class="flex items-center gap-2 text-xs md:text-sm font-bold text-neutral-800">
							<div class="w-6 h-6 rounded-md bg-[#fdf3e9] text-[#cf7024] flex items-center justify-center shrink-0">
								<Icon name="carbon:currency-dollar" :size="14" />
							</div>
							<span>{{ t('packages.sections.pricing') }}</span>
						</div>

						<!-- Row 1: Currency, Price, Module -->
						<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.form.pricingCurrency') }} *</span>
								<n-select v-model:value="model.pricing_currency" :options="currencyOptions" size="small" />
							</div>
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.form.price') }} *</span>
								<PlanStepper v-model="model.price" :min="0" :step="5" />
								<span v-if="errors['price']" class="text-xs text-red-500">{{ errors['price'][0] }}</span>
							</div>
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.form.module') }}</span>
								<n-select v-model:value="model.plan_module_id" :options="moduleOptions" :placeholder="t('packages.form.selectModule')" size="small" clearable />
							</div>
						</div>

						<!-- Row 2: Overage Rate, Included Hours, Duration -->
						<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.form.overageRate') }}</span>
								<PlanStepper v-model="model.overage_rate" :min="0" :step="1" />
							</div>
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.form.includedHours') }} *</span>
								<PlanStepper v-model="model.included_hours" :min="0" :step="1" />
							</div>
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.form.durationDays') }} *</span>
								<PlanStepper v-model="model.duration_days" :min="1" :step="1" />
							</div>
						</div>
					</div>

					<!-- Card 3: إعدادات العرض -->
					<div class="border border-neutral-200/70 rounded-xl p-3.5 bg-white flex flex-col gap-3 shadow-2xs">
						<div class="flex items-center gap-2 text-xs md:text-sm font-bold text-neutral-800">
							<div class="w-6 h-6 rounded-md bg-[#eef7ec] text-[#4d783f] flex items-center justify-center shrink-0">
								<Icon name="carbon:settings" :size="14" />
							</div>
							<span>{{ t('packages.sections.displaySettings') }}</span>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.form.order') }}</span>
								<PlanStepper v-model="model.order" :min="0" :step="1" />
							</div>

							<div class="flex items-center justify-between gap-2 p-2 px-3 bg-neutral-50 rounded-lg border border-neutral-100">
								<span class="text-xs font-semibold text-neutral-700">{{ t('packages.form.isActive') }}</span>
								<n-switch v-model:value="model.is_active" :rail-style="railStyle" size="small" />
							</div>

							<div class="flex items-center justify-between gap-2 p-2 px-3 bg-neutral-50 rounded-lg border border-neutral-100">
								<span class="text-xs font-semibold text-neutral-700">{{ t('packages.form.isSubscription') }}</span>
								<n-switch v-model:value="model.is_subscription" :rail-style="railStyle" size="small" />
							</div>
						</div>
					</div>
				</div>

				<!-- TAB 2: الأرصدة -->
				<div v-show="activeTab === 'balances'" class="flex flex-col gap-3">
					<!-- Top Action Bar -->
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold text-neutral-500">{{ t('packages.balances.includedDescription') }}</span>
						<button
							type="button"
							@click="addBalance"
							class="h-8 px-3 text-xs font-semibold rounded-lg bg-[#f0f7ee] hover:bg-[#e4f1e1] text-[#4d783f] border border-[#d6e8d2] flex items-center gap-1.5 transition-colors cursor-pointer"
						>
							<Icon name="carbon:add" :size="14" />
							<span>{{ t('packages.balances.add') }}</span>
						</button>
					</div>

					<!-- Empty state -->
					<div v-if="balancesList.length === 0" class="py-10 text-center text-neutral-400 bg-white rounded-xl border border-dashed border-neutral-200 text-xs">
						{{ t('packages.balances.empty') }}
					</div>

					<!-- Balances list -->
					<div
						v-for="(balance, idx) in balancesList"
						:key="idx"
						class="border border-neutral-200/80 rounded-xl p-3.5 bg-white flex flex-col gap-3 shadow-2xs relative"
					>
						<!-- Card Header -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<div :class="['w-7 h-7 rounded-lg flex items-center justify-center border text-xs shrink-0', getCategoryBadgeClass(balance.category)]">
									<Icon :name="getCategoryIcon(balance.category)" :size="15" />
								</div>
								<span class="font-bold text-xs md:text-sm text-neutral-800">{{ getCategoryTitle(balance.category) }}</span>
							</div>

							<button
								type="button"
								@click="removeBalance(idx)"
								class="w-7 h-7 rounded-lg bg-[#fef1f1] hover:bg-[#fde2e2] text-[#e04545] border border-[#fbd4d4] flex items-center justify-center transition-colors cursor-pointer"
								title="Remove"
							>
								<Icon name="carbon:trash-can" :size="14" />
							</button>
						</div>

						<!-- Row 1: Amount, Category Select (and space if specific) -->
						<div :class="['grid gap-3', balance.category === 'space_specific' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2']">
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.balances.amount') }}</span>
								<PlanStepper v-model="balance.amount" :min="0" :step="5" />
							</div>

							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.balances.category') }}</span>
								<n-select v-model:value="balance.category" :options="categoryOptions" size="small" />
							</div>

							<div v-if="balance.category === 'space_specific'" class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.balances.restrictedSpace') }}</span>
								<n-select
									v-model:value="balance.restricted_space_id"
									:options="spaceOptions"
									:placeholder="t('packages.balances.selectSpace')"
									size="small"
									clearable
								/>
							</div>
						</div>

						<!-- Row 2: Note Arabic and English -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.balances.description') }} (عربي)</span>
								<input
									v-model="balanceDesc(balance).ar"
									class="w-full h-9 text-xs md:text-sm border border-neutral-200 rounded-lg px-3 bg-white focus:outline-none focus:border-[#557e46] transition-colors"
									:placeholder="t('resourceCrud.form.arabicPlaceholder')"
								/>
							</div>

							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">Note (English)</span>
								<input
									v-model="balanceDesc(balance).en"
									class="w-full h-9 text-xs md:text-sm border border-neutral-200 rounded-lg px-3 bg-white focus:outline-none focus:border-[#557e46] transition-colors"
									:placeholder="t('resourceCrud.form.englishPlaceholder')"
								/>
							</div>
						</div>
					</div>

					<!-- Bottom Summary Banner -->
					<div class="bg-[#f0f7ee] border border-[#d6e8d2] text-[#38642e] rounded-xl p-3 px-4 flex items-center justify-between">
						<span class="text-xs font-bold">{{ t('packages.balances.totalIncluded') }}</span>
						<span class="text-sm md:text-base font-bold add-numeric">{{ model.pricing_currency }} {{ totalBalancesAmount }}</span>
					</div>
				</div>

				<!-- TAB 3: الميزات -->
				<div v-show="activeTab === 'features'" class="flex flex-col gap-3">
					<!-- Top Action Bar -->
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold text-neutral-500">{{ t('packages.features.userVisible') }}</span>
						<button
							type="button"
							@click="openAddFeature"
							class="h-8 px-3 text-xs font-semibold rounded-lg bg-[#f0f7ee] hover:bg-[#e4f1e1] text-[#4d783f] border border-[#d6e8d2] flex items-center gap-1.5 transition-colors cursor-pointer"
						>
							<Icon name="carbon:add" :size="14" />
							<span>{{ t('packages.features.add') }}</span>
						</button>
					</div>

					<!-- Inline Feature Form (when adding or editing) -->
					<div
						v-if="isEditingFeature"
						class="border border-[#557e46]/40 rounded-xl p-3.5 bg-white flex flex-col gap-3 shadow-2xs"
					>
						<div class="flex items-center justify-between border-b border-neutral-100 pb-2">
							<span class="text-xs font-bold text-neutral-800">
								{{ featureFormIndex === null ? t('packages.features.add') : t('packages.features.edit') }}
							</span>
							<button type="button" @click="cancelFeatureEdit" class="text-neutral-400 hover:text-neutral-700 text-xs">
								{{ t('packages.actions.cancel') }}
							</button>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.features.name') }} (عربي) *</span>
								<input
									v-model="featureForm.name.ar"
									class="w-full h-9 text-xs md:text-sm border border-neutral-200 rounded-lg px-3 bg-white focus:outline-none focus:border-[#557e46]"
									:placeholder="t('resourceCrud.form.arabicPlaceholder')"
								/>
							</div>
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">Feature Name (English) *</span>
								<input
									v-model="featureForm.name.en"
									class="w-full h-9 text-xs md:text-sm border border-neutral-200 rounded-lg px-3 bg-white focus:outline-none focus:border-[#557e46]"
									:placeholder="t('resourceCrud.form.englishPlaceholder')"
								/>
							</div>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.features.value') }} (عربي)</span>
								<input
									v-model="featureForm.value.ar"
									class="w-full h-9 text-xs md:text-sm border border-neutral-200 rounded-lg px-3 bg-white focus:outline-none focus:border-[#557e46]"
									:placeholder="t('resourceCrud.form.arabicPlaceholder')"
								/>
							</div>
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">Value / Details (English)</span>
								<input
									v-model="featureForm.value.en"
									class="w-full h-9 text-xs md:text-sm border border-neutral-200 rounded-lg px-3 bg-white focus:outline-none focus:border-[#557e46]"
									:placeholder="t('resourceCrud.form.englishPlaceholder')"
								/>
							</div>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.features.icon') }}</span>
								<input
									v-model="featureForm.icon"
									class="w-full h-9 text-xs md:text-sm border border-neutral-200 rounded-lg px-3 bg-white focus:outline-none focus:border-[#557e46]"
									placeholder="carbon:calendar"
								/>
							</div>
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.features.order') }}</span>
								<PlanStepper v-model="featureForm.order" :min="0" :step="1" />
							</div>
							<div class="flex items-center justify-between gap-2 p-2 px-3 bg-neutral-50 rounded-lg border border-neutral-100 mt-4">
								<span class="text-xs font-semibold text-neutral-700">{{ t('packages.features.isIncluded') }}</span>
								<n-switch v-model:value="featureForm.is_included" :rail-style="railStyle" size="small" />
							</div>
						</div>

						<div class="flex justify-end gap-2 pt-2 border-t border-neutral-100">
							<button
								type="button"
								@click="cancelFeatureEdit"
								class="h-8 px-3 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
							>
								{{ t('packages.actions.cancel') }}
							</button>
							<button
								type="button"
								@click="saveFeatureEdit"
								class="h-8 px-4 rounded-lg bg-[#557e46] hover:bg-[#466939] text-white text-xs font-bold"
							>
								{{ t('packages.features.save') }}
							</button>
						</div>
					</div>

					<!-- Empty state -->
					<div v-if="featuresList.length === 0" class="py-10 text-center text-neutral-400 bg-white rounded-xl border border-dashed border-neutral-200 text-xs">
						{{ t('packages.features.empty') }}
					</div>

					<!-- Features list -->
					<div
						v-for="(feature, idx) in featuresList"
						:key="idx"
						class="border border-neutral-200/70 rounded-xl p-2.5 px-3 bg-white flex items-center justify-between gap-3 shadow-2xs hover:border-neutral-300 transition-colors"
					>
						<!-- Start side (in RTL: Right): Icon + Title & Subtitle -->
						<div class="flex items-center gap-2.5 overflow-hidden">
							<div class="w-8 h-8 rounded-lg bg-neutral-50 text-neutral-700 flex items-center justify-center shrink-0 border border-neutral-200/70">
								<Icon :name="resolveFeatureIcon(feature.icon)" :size="16" />
							</div>
							<div class="flex flex-col gap-0.5 overflow-hidden">
								<span class="text-xs md:text-sm font-bold text-neutral-900 truncate">
									{{ pickLocalized(feature.name, currentLocale) }}
								</span>
								<span class="text-[11px] text-neutral-400 truncate">
									{{ getFeatureSubtitleText(feature) }}
								</span>
							</div>
						</div>

						<!-- End side (in RTL: Left): Switch + Edit + Delete -->
						<div class="flex items-center gap-2 shrink-0">
							<button
								type="button"
								@click="editFeature(idx)"
								class="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 flex items-center justify-center transition-colors cursor-pointer"
								title="Edit"
							>
								<Icon name="carbon:edit" :size="14" />
							</button>
							<button
								type="button"
								@click="removeFeature(idx)"
								class="w-7 h-7 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
								title="Delete"
							>
								<Icon name="carbon:trash-can" :size="14" />
							</button>
							<n-switch v-model:value="feature.is_included" :rail-style="railStyle" size="small" />
						</div>
					</div>
				</div>
			</div>

			<!-- Fixed Footer -->
			<div class="p-3.5 px-5 border-t border-neutral-100 bg-white flex items-center justify-between gap-3 shrink-0">
				<button
					type="button"
					@click="show = false"
					class="h-9 px-5 rounded-lg border border-neutral-200 text-xs md:text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
				>
					{{ t('packages.actions.cancel') }}
				</button>

				<button
					type="button"
					:disabled="submitting"
					@click="handleSubmit"
					class="h-9 px-6 rounded-lg bg-[#557e46] hover:bg-[#476a3a] text-white text-xs md:text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-w-[130px]"
				>
					<Icon v-if="submitting" name="carbon:circle-dash" class="animate-spin" :size="16" />
					<span>{{ t('packages.actions.save') }}</span>
				</button>
			</div>
		</div>
	</n-modal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { PlanBalanceItem, PlanFeatureItem, PlanPayload } from "@/add-os/modules/plans/types/plan"
import { NModal, NSelect, NSwitch, useMessage } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { currentLocale } from "@/add-os/lang/currentLocale"
import PlanStepper from "@/add-os/modules/plans/components/PlanStepper.vue"
import { ApiError } from "@/add-os/services/api"
import { listPlanModules } from "@/add-os/services/plan-modules"
import { listSpaces } from "@/add-os/services/spaces"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	title: string
	submitting: boolean
	onSubmit: (payload: PlanPayload) => Promise<void>
}>()

const show = defineModel<boolean>("show", { required: true })
const model = defineModel<PlanPayload>("model", { required: true })

const { t } = useI18n()
const message = useMessage()

const activeTab = ref<"basic" | "balances" | "features">("basic")
const errors = ref<Record<string, string[]>>({})
const moduleOptions = ref<SelectOption[]>([])
const spaceOptions = ref<SelectOption[]>([])
const rawModules = ref<{ id: number; name: { ar: string; en: string } }[]>([])

const currencyOptions = [
	{ label: "USD", value: "USD" },
	{ label: "SYP", value: "SYP" }
]

const railStyle = ({ checked }: { checked: boolean }) => ({
	background: checked ? "#557e46" : "#d1d5db"
})

const isCreateMode = computed(() => !Boolean((model.value as { id?: number }).id || model.value.name?.ar?.trim()))

const modeTitle = computed(() => {
	return isCreateMode.value ? t("packages.create.title") : t("packages.edit.title")
})

const selectedModuleName = computed(() => {
	if (!model.value.plan_module_id) return ""
	const found = rawModules.value.find(m => m.id === model.value.plan_module_id)
	return found ? pickLocalized(found.name, currentLocale.value) : ""
})

const headerSubtitle = computed(() => {
	const planName = pickLocalized(model.value.name, currentLocale.value)
	const modName = selectedModuleName.value || t("packages.noModule")
	if (planName.trim()) {
		return `${planName} · ${modName}`
	}
	return `${t("packages.create.title")} · ${modName}`
})

const categoryOptions = computed<SelectOption[]>(() => [
	{ label: t("packages.balances.categories.cafe"), value: "cafe" },
	{ label: t("packages.balances.categories.printing_internet"), value: "printing_internet" },
	{ label: t("packages.balances.categories.general"), value: "general" },
	{ label: t("packages.balances.categories.space_specific"), value: "space_specific" }
])

const subtitleAr = computed({
	get: () => model.value.subtitle?.ar ?? "",
	set: val => {
		if (!model.value.subtitle) model.value.subtitle = { ar: "", en: "" }
		model.value.subtitle.ar = val
	}
})

const subtitleEn = computed({
	get: () => model.value.subtitle?.en ?? "",
	set: val => {
		if (!model.value.subtitle) model.value.subtitle = { ar: "", en: "" }
		model.value.subtitle.en = val
	}
})

const balancesList = computed<PlanBalanceItem[]>({
	get: () => {
		if (!model.value.balances) model.value.balances = []
		return model.value.balances
	},
	set: val => {
		model.value.balances = val
	}
})

const featuresList = computed<PlanFeatureItem[]>({
	get: () => {
		if (!model.value.features) model.value.features = []
		return model.value.features
	},
	set: val => {
		model.value.features = val
	}
})

const totalBalancesAmount = computed(() => {
	const sum = (model.value.balances ?? []).reduce((acc, b) => acc + (Number(b.amount) || 0), 0)
	return sum
})

function getCategoryTitle(category: string): string {
	switch (category) {
		case "cafe":
			return t("packages.balances.categories.cafe")
		case "printing_internet":
			return t("packages.balances.categories.printing_internet")
		case "space_specific":
			return t("packages.balances.categories.space_specific")
		default:
			return t("packages.balances.categories.general")
	}
}

function getCategoryIcon(category: string): string {
	switch (category) {
		case "cafe":
			return "carbon:cafe"
		case "printing_internet":
			return "carbon:printer"
		case "space_specific":
			return "carbon:workspace"
		default:
			return "carbon:wallet"
	}
}

function getCategoryBadgeClass(category: string): string {
	switch (category) {
		case "cafe":
			return "bg-[#fdf4eb] text-[#c26d25] border-[#f5dfcb]"
		case "printing_internet":
			return "bg-[#ebf3fd] text-[#2c75d8] border-[#d4e4f9]"
		case "space_specific":
			return "bg-[#f4edf9] text-[#7d3cb5] border-[#e6d8f2]"
		default:
			return "bg-[#eef8ed] text-[#3d8332] border-[#d6e8d2]"
	}
}

function balanceDesc(b: PlanBalanceItem) {
	if (!b.description) b.description = { ar: "", en: "" }
	return b.description
}

function addBalance() {
	if (!model.value.balances) model.value.balances = []
	model.value.balances.push({
		category: "cafe",
		amount: 20,
		description: { ar: "", en: "" },
		order: model.value.balances.length + 1
	})
}

function removeBalance(index: number) {
	model.value.balances?.splice(index, 1)
}

// Inline feature form state
interface FeatureFormModel {
	name: { ar: string; en: string }
	value: { ar: string; en: string }
	icon: string
	is_included: boolean
	order: number
}

const isEditingFeature = ref(false)
const featureFormIndex = ref<number | null>(null)
const featureForm = ref<FeatureFormModel>({
	name: { ar: "", en: "" },
	value: { ar: "", en: "" },
	icon: "carbon:calendar",
	is_included: true,
	order: 1
})

function openAddFeature() {
	featureFormIndex.value = null
	featureForm.value = {
		name: { ar: "", en: "" },
		value: { ar: "", en: "" },
		icon: "carbon:calendar",
		is_included: true,
		order: (model.value.features?.length ?? 0) + 1
	}
	isEditingFeature.value = true
}

function editFeature(index: number) {
	featureFormIndex.value = index
	const target = model.value.features?.[index]
	if (target) {
		featureForm.value = {
			name: { ...target.name },
			value: target.value ? { ...target.value } : { ar: "", en: "" },
			icon: target.icon || "carbon:calendar",
			is_included: target.is_included,
			order: target.order ?? index + 1
		}
	}
	isEditingFeature.value = true
}

function cancelFeatureEdit() {
	isEditingFeature.value = false
	featureFormIndex.value = null
}

function saveFeatureEdit() {
	if (!featureForm.value.name.ar.trim() && !featureForm.value.name.en.trim()) {
		message.error(t("resourceCrud.validation.required", { field: t("packages.features.name") }))
		return
	}
	if (!model.value.features) model.value.features = []

	if (featureFormIndex.value === null) {
		model.value.features.push({ ...featureForm.value })
	} else {
		model.value.features[featureFormIndex.value] = { ...featureForm.value }
	}
	isEditingFeature.value = false
	featureFormIndex.value = null
}

function removeFeature(index: number) {
	model.value.features?.splice(index, 1)
}

function resolveFeatureIcon(icon?: string | null): string {
	if (!icon || !icon.trim()) return "carbon:calendar"
	if (icon.startsWith("carbon:")) return icon
	return `carbon:${icon}`
}

function getFeatureSubtitleText(feature: PlanFeatureItem): string {
	if (!feature.is_included) {
		return t("packages.features.notIncluded")
	}
	const val = feature.value ? pickLocalized(feature.value, currentLocale.value) : ""
	const enName = feature.name?.en?.trim()
	const parts: string[] = []
	if (enName) parts.push(enName)
	if (val) parts.push(`${t("packages.features.details")}: ${val}`)
	return parts.join(" - ") || t("packages.features.isIncluded")
}

async function loadOptions() {
	try {
		const [modules, spaces] = await Promise.all([listPlanModules(), listSpaces()])
		rawModules.value = modules
		moduleOptions.value = modules.map(m => ({
			label: pickLocalized(m.name, currentLocale.value),
			value: m.id
		}))
		spaceOptions.value = spaces.map(s => ({
			label: `#${s.id} - ${t(`spaces.spaceType.${s.space_type}`)}`,
			value: s.id
		}))
	} catch {
		// Non-blocking
	}
}

watch(
	() => show.value,
	visible => {
		if (visible) {
			errors.value = {}
			isEditingFeature.value = false
			activeTab.value = "basic"
			loadOptions()
		}
	}
)

onMounted(() => {
	loadOptions()
})

async function handleSubmit() {
	errors.value = {}

	// Validate required basic info
	if (!model.value.name?.ar?.trim() || !model.value.name?.en?.trim()) {
		if (!model.value.name?.ar?.trim()) errors.value["name.ar"] = [t("resourceCrud.validation.required", { field: t("packages.form.name") })]
		if (!model.value.name?.en?.trim()) errors.value["name.en"] = [t("resourceCrud.validation.required", { field: t("packages.form.name") })]
		message.error(t("resourceCrud.validation.required", { field: t("packages.form.name") }))
		activeTab.value = "basic"
		return
	}

	// Clean payload before submitting
	const payload: PlanPayload = {
		...model.value,
		subtitle: model.value.subtitle?.ar || model.value.subtitle?.en ? model.value.subtitle : null,
		balances: (model.value.balances ?? []).map(b => ({
			category: b.category,
			amount: Number(b.amount),
			restricted_space_id: b.category === "space_specific" ? b.restricted_space_id ?? null : null,
			description: b.description?.ar || b.description?.en ? b.description : null,
			order: b.order ?? 0
		})),
		features: (model.value.features ?? []).map(f => ({
			name: f.name,
			value: f.value?.ar || f.value?.en ? f.value : null,
			icon: f.icon?.trim() || null,
			is_included: Boolean(f.is_included),
			order: f.order ?? 0
		}))
	}

	try {
		await props.onSubmit(payload)
		show.value = false
	} catch (caught) {
		if (caught instanceof ApiError && caught.status === 422 && caught.data?.errors) {
			errors.value = caught.data.errors
			const firstError = Object.values(caught.data.errors)[0]?.[0]
			if (firstError) {
				message.error(firstError)
			}
		}
	}
}
</script>
