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

				<button
					type="button"
					@click="activeTab = 'discounts'"
					:class="[
						'pb-2.5 px-1 text-xs md:text-sm font-semibold transition-all cursor-pointer border-b-2 flex items-center gap-1.5',
						activeTab === 'discounts'
							? 'border-[#557e46] text-[#557e46]'
							: 'border-transparent text-neutral-500 hover:text-neutral-800'
					]"
				>
					<span>{{ t('packages.tabs.discounts') }}</span>
					<span class="px-2 py-0.5 text-[11px] rounded-full bg-[#eef7ec] text-[#47743b] font-bold leading-none">
						{{ discountsList.length }}
					</span>
				</button>

				<button
					type="button"
					@click="activeTab = 'resources'"
					:class="[
						'pb-2.5 px-1 text-xs md:text-sm font-semibold transition-all cursor-pointer border-b-2 flex items-center gap-1.5',
						activeTab === 'resources'
							? 'border-[#557e46] text-[#557e46]'
							: 'border-transparent text-neutral-500 hover:text-neutral-800'
					]"
				>
					<span>{{ t('packages.tabs.resources') }}</span>
					<span class="px-2 py-0.5 text-[11px] rounded-full bg-[#eef7ec] text-[#47743b] font-bold leading-none">
						{{ resourceGrantsList.length }}
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

						<!-- Row 1: Price (points), Module -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.form.pricePoints') }} *</span>
								<PlanStepper v-model="model.price_points" :min="0" :step="1" integer />
								<!--
									Read-only, and read straight off the server's own rendering of
									this plan. The point rate lives on the backend and an admin can
									change it, so a value computed here would be a second, drifting
									copy of the same rule.
								-->
								<span v-if="serverPriceUsdHint" class="text-[11px] text-neutral-400 add-numeric">
									≈ {{ serverPriceUsdHint }}
								</span>
								<span v-if="errors['price_points']" class="text-xs text-red-500">{{ errors['price_points'][0] }}</span>
							</div>
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.form.module') }}</span>
								<n-select v-model:value="model.plan_module_id" :options="moduleOptions" :placeholder="t('packages.form.selectModule')" size="small" clearable />
							</div>
						</div>

						<!-- Row 2: Duration -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
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

							<div class="flex items-center justify-between gap-2 p-2 px-3 bg-neutral-50 rounded-lg border border-neutral-100">
								<span class="text-xs font-semibold text-neutral-700">{{ t('packages.form.isPublic') }}</span>
								<n-switch v-model:value="model.is_public" :rail-style="railStyle" size="small" />
							</div>
						</div>
					</div>

					<!-- Card 4: وقت الباقة -->
					<div class="border border-neutral-200/70 rounded-xl p-3.5 bg-white flex flex-col gap-3 shadow-2xs">
						<div class="flex items-center gap-2 text-xs md:text-sm font-bold text-neutral-800">
							<div class="w-6 h-6 rounded-md bg-[#eef2fb] text-[#3f5b8f] flex items-center justify-center shrink-0">
								<Icon name="carbon:time" :size="14" />
							</div>
							<span>{{ t('packages.sections.accessWindow') }}</span>
						</div>

						<div class="flex items-center justify-between gap-2 p-2 px-3 bg-neutral-50 rounded-lg border border-neutral-100">
							<span class="text-xs font-semibold text-neutral-700">{{ t('packages.form.hasAccessWindow') }}</span>
							<n-switch :value="hasAccessWindow" :rail-style="railStyle" size="small" @update:value="toggleAccessWindow" />
						</div>

						<template v-if="hasAccessWindow">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div class="flex flex-col gap-1">
									<span class="text-xs font-semibold text-neutral-600">{{ t('packages.form.accessWindowStart') }} *</span>
									<n-time-picker
										:formatted-value="toPickerTimeValue(model.access_window_start)"
										format="HH:mm"
										value-format="HH:mm"
										class="w-full"
										size="small"
										@update:formatted-value="(value: string | null) => (model.access_window_start = value)"
									/>
									<span v-if="errors['access_window_start']" class="text-xs text-red-500">{{ errors['access_window_start'][0] }}</span>
								</div>
								<div class="flex flex-col gap-1">
									<span class="text-xs font-semibold text-neutral-600">{{ t('packages.form.accessWindowEnd') }} *</span>
									<n-time-picker
										:formatted-value="toPickerTimeValue(model.access_window_end)"
										format="HH:mm"
										value-format="HH:mm"
										class="w-full"
										size="small"
										@update:formatted-value="(value: string | null) => (model.access_window_end = value)"
									/>
									<span v-if="errors['access_window_end']" class="text-xs text-red-500">{{ errors['access_window_end'][0] }}</span>
								</div>
							</div>

							<!--
								An end at or before the start is legal, not an error: the
								window wraps past midnight, which is exactly the evening
								package this field exists for. So this explains the
								consequence instead of warning about a mistake.
							-->
							<div v-if="accessWindowWraps" class="flex items-start gap-2 p-2 px-3 bg-[#eef2fb] rounded-lg border border-[#d9e2f4] text-[11px] text-[#3f5b8f]">
								<Icon name="carbon:information" :size="14" class="shrink-0 mt-px" />
								<span>{{ t('packages.form.accessWindowWraps') }}</span>
							</div>

							<span class="text-[11px] text-neutral-500">{{ t('packages.form.accessWindowHint') }}</span>
						</template>
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
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.balances.amountPoints') }}</span>
								<PlanStepper v-model="balance.amount_points" :min="0" :step="1" integer />
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
						<span class="text-sm md:text-base font-bold add-numeric">{{ formatPoints(totalBalancePoints) }}</span>
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
				<!-- TAB 4: الحسومات -->
				<div v-show="activeTab === 'discounts'" class="flex flex-col gap-3">
					<!-- Top Action Bar -->
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold text-neutral-500">{{ t('packages.discounts.description') }}</span>
						<button
							type="button"
							@click="addDiscount"
							class="h-8 px-3 text-xs font-semibold rounded-lg bg-[#f0f7ee] hover:bg-[#e4f1e1] text-[#4d783f] border border-[#d6e8d2] flex items-center gap-1.5 transition-colors cursor-pointer"
						>
							<Icon name="carbon:add" :size="14" />
							<span>{{ t('packages.discounts.add') }}</span>
						</button>
					</div>

					<!-- Empty state -->
					<div v-if="discountsList.length === 0" class="py-10 text-center text-neutral-400 bg-white rounded-xl border border-dashed border-neutral-200 text-xs">
						{{ t('packages.discounts.empty') }}
					</div>

					<!-- Discounts list -->
					<div
						v-for="(discount, idx) in discountsList"
						:key="idx"
						class="border border-neutral-200/80 rounded-xl p-3.5 bg-white flex flex-col gap-3 shadow-2xs relative"
					>
						<!-- Card Header -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<div class="w-7 h-7 rounded-lg flex items-center justify-center border text-xs shrink-0 bg-[#fdf3e9] text-[#c26d25] border-[#f5dfcb]">
									<Icon name="carbon:percentage" :size="15" />
								</div>
								<span class="font-bold text-xs md:text-sm text-neutral-800">{{ getDiscountTargetLabel(discount) }}</span>
							</div>

							<button
								type="button"
								@click="removeDiscount(idx)"
								class="w-7 h-7 rounded-lg bg-[#fef1f1] hover:bg-[#fde2e2] text-[#e04545] border border-[#fbd4d4] flex items-center justify-center transition-colors cursor-pointer"
								title="Remove"
							>
								<Icon name="carbon:trash-can" :size="14" />
							</button>
						</div>

						<!-- Row 1: Percentage, Target (and space/space-type if targeted) -->
						<div :class="['grid gap-3', (discount.targetMode ?? 'all') === 'all' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3']">
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.discounts.percentage') }}</span>
								<PlanStepper v-model="discount.percentage" :min="1" :max="100" integer />
							</div>

							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.discounts.target.label') }}</span>
								<n-select :value="discount.targetMode ?? 'all'" :options="targetModeOptions" size="small" @update:value="(mode: 'all' | 'space' | 'space_type') => setDiscountTarget(discount, mode)" />
							</div>

							<div v-if="discount.targetMode === 'space'" class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.discounts.selectSpace') }}</span>
								<n-select v-model:value="discount.space_id" :options="spaceOptions" :placeholder="t('packages.discounts.selectSpace')" size="small" clearable />
							</div>

							<div v-else-if="discount.targetMode === 'space_type'" class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.discounts.selectSpaceType') }}</span>
								<n-select v-model:value="discount.space_type" :options="spaceTypeOptions" :placeholder="t('packages.discounts.selectSpaceType')" size="small" clearable />
							</div>
						</div>

						<!-- Row 2: Usage limit toggle (+ count), Active toggle -->
						<div :class="['grid gap-3 items-center', discountUsageLimited(discount).value ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2']">
							<div class="flex items-center justify-between gap-2 p-2 px-3 bg-neutral-50 rounded-lg border border-neutral-100">
								<span class="text-xs font-semibold text-neutral-700">{{ t('packages.discounts.limitUsage') }}</span>
								<n-switch v-model:value="discountUsageLimited(discount).value" :rail-style="railStyle" size="small" />
							</div>

							<div v-if="discountUsageLimited(discount).value" class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.discounts.usageLimit') }}</span>
								<PlanStepper v-model="discountUsageValue(discount).value" :min="1" :step="1" integer />
							</div>

							<div class="flex items-center justify-between gap-2 p-2 px-3 bg-neutral-50 rounded-lg border border-neutral-100">
								<span class="text-xs font-semibold text-neutral-700">{{ t('packages.discounts.isActive') }}</span>
								<n-switch v-model:value="discount.is_active" :rail-style="railStyle" size="small" />
							</div>
						</div>

						<!-- Row 3: Description Arabic and English -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.discounts.descriptionField') }} (عربي)</span>
								<input
									v-model="discountDesc(discount).ar"
									class="w-full h-9 text-xs md:text-sm border border-neutral-200 rounded-lg px-3 bg-white focus:outline-none focus:border-[#557e46] transition-colors"
									:placeholder="t('resourceCrud.form.arabicPlaceholder')"
								/>
							</div>

							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">Description (English)</span>
								<input
									v-model="discountDesc(discount).en"
									class="w-full h-9 text-xs md:text-sm border border-neutral-200 rounded-lg px-3 bg-white focus:outline-none focus:border-[#557e46] transition-colors"
									:placeholder="t('resourceCrud.form.englishPlaceholder')"
								/>
							</div>
						</div>
					</div>
				</div>
				<!-- TAB 5: الموارد -->
				<div v-show="activeTab === 'resources'" class="flex flex-col gap-3">
					<!-- Top Action Bar -->
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold text-neutral-500">{{ t('packages.resources.description') }}</span>
						<button
							type="button"
							@click="addResourceGrant"
							:disabled="resourceTypeOptions.length === 0"
							class="h-8 px-3 text-xs font-semibold rounded-lg bg-[#f0f7ee] hover:bg-[#e4f1e1] text-[#4d783f] border border-[#d6e8d2] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<Icon name="carbon:add" :size="14" />
							<span>{{ t('packages.resources.add') }}</span>
						</button>
					</div>

					<!-- Empty state -->
					<div v-if="resourceGrantsList.length === 0" class="py-10 text-center text-neutral-400 bg-white rounded-xl border border-dashed border-neutral-200 text-xs">
						{{ t('packages.resources.empty') }}
					</div>

					<!-- Resource grants list -->
					<div
						v-for="(grant, idx) in resourceGrantsList"
						:key="idx"
						class="border border-neutral-200/80 rounded-xl p-3.5 bg-white flex flex-col gap-3 shadow-2xs relative"
					>
						<!-- Card Header -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<div class="w-7 h-7 rounded-lg flex items-center justify-center border text-xs shrink-0 bg-[#ebf3fd] text-[#2c75d8] border-[#d4e4f9]">
									<Icon name="carbon:box" :size="15" />
								</div>
								<span class="font-bold text-xs md:text-sm text-neutral-800">{{ getResourceTypeLabel(grant) }}</span>
							</div>

							<button
								type="button"
								@click="removeResourceGrant(idx)"
								class="w-7 h-7 rounded-lg bg-[#fef1f1] hover:bg-[#fde2e2] text-[#e04545] border border-[#fbd4d4] flex items-center justify-center transition-colors cursor-pointer"
								title="Remove"
							>
								<Icon name="carbon:trash-can" :size="14" />
							</button>
						</div>

						<!-- Row 1: Resource type, Quantity -->
						<div class="grid gap-3 grid-cols-1 md:grid-cols-2">
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.resources.resourceType') }}</span>
								<n-select v-model:value="grant.resource_type_id" :options="resourceTypeOptions" size="small" />
							</div>

							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">
									{{ t('packages.resources.quantity') }}
									<template v-if="resourceTypeUnitLabel(grant)"> ({{ resourceTypeUnitLabel(grant) }})</template>
								</span>
								<PlanStepper v-model="grant.quantity" :min="0.01" :step="1" />
							</div>
						</div>

						<!-- Row 2: Description Arabic and English -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">{{ t('packages.resources.descriptionField') }} (عربي)</span>
								<input
									v-model="resourceGrantDesc(grant).ar"
									class="w-full h-9 text-xs md:text-sm border border-neutral-200 rounded-lg px-3 bg-white focus:outline-none focus:border-[#557e46] transition-colors"
									:placeholder="t('resourceCrud.form.arabicPlaceholder')"
								/>
							</div>

							<div class="flex flex-col gap-1">
								<span class="text-xs font-semibold text-neutral-600">Description (English)</span>
								<input
									v-model="resourceGrantDesc(grant).en"
									class="w-full h-9 text-xs md:text-sm border border-neutral-200 rounded-lg px-3 bg-white focus:outline-none focus:border-[#557e46] transition-colors"
									:placeholder="t('resourceCrud.form.englishPlaceholder')"
								/>
							</div>
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
import type { PlanBalanceItem, PlanDiscountItem, PlanFeatureItem, PlanPayload, PlanResourceGrantItem } from "@/add-os/modules/plans/types/plan"
import type { SpaceType } from "@/add-os/modules/spatial/types/space"
import { NModal, NSelect, NSwitch, NTimePicker, useMessage } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { usePoints } from "@/add-os/modules/payments/composables/usePoints"
import PlanStepper from "@/add-os/modules/plans/components/PlanStepper.vue"
import { SPACE_TYPES } from "@/add-os/modules/spatial/types/space"
import { ApiError } from "@/add-os/services/api"
import { listPlanModules } from "@/add-os/services/plan-modules"
import { listResourceTypes } from "@/add-os/services/resource-types"
import { listSpaces } from "@/add-os/services/spaces"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	title: string
	submitting: boolean
	onSubmit: (payload: PlanPayload) => Promise<void>
	/**
	 * The server's own USD rendering of the plan being edited, as a decimal
	 * string (`price_usd`), shown read-only under the point input.
	 *
	 * Passed in rather than derived: the point rate is server state an admin
	 * can change, so the only honest USD figure is the one the API sent with
	 * this plan. Absent on create — there is no server value to quote yet —
	 * and deliberately NOT recomputed as the operator edits the point count,
	 * since that would require the rate this component must not hold. It
	 * refreshes when the list reloads after a save.
	 */
	priceUsd?: string | null
}>()

const show = defineModel<boolean>("show", { required: true })
const model = defineModel<PlanPayload>("model", { required: true })

const { t } = useI18n()
const message = useMessage()

const activeTab = ref<"basic" | "balances" | "features" | "discounts" | "resources">("basic")
const errors = ref<Record<string, string[]>>({})
const moduleOptions = ref<SelectOption[]>([])
const spaceOptions = ref<SelectOption[]>([])
const resourceTypeOptions = ref<SelectOption[]>([])
const rawModules = ref<{ id: number; name: { ar: string; en: string } }[]>([])
const rawSpaces = ref<{ id: number; space_type: SpaceType }[]>([])
const rawResourceTypes = ref<{ id: number; name: { ar: string; en: string }; unit_label: { ar: string; en: string } }[]>([])

const { formatPoints } = usePoints()

/**
 * `≈ $50.00`, or empty when the server sent nothing to quote (create mode).
 * The `$` is written here rather than in the locale bundle: a symbol-only
 * Arabic value fails the repo's ar/en script guard.
 */
const serverPriceUsdHint = computed(() => (props.priceUsd ? `$${props.priceUsd}` : ""))

const railStyle = ({ checked }: { checked: boolean }) => ({
	background: checked ? "#557e46" : "#d1d5db"
})

/** `H:i`, 24-hour. Shape only — see `toPickerTimeValue` for why that matters. */
const TIME_DISPLAY_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/

/**
 * NTimePicker strictly parses `formatted-value` through date-fns and only
 * special-cases `null` as "no value" — every other string, including a plain
 * empty one, is parsed and then formatted, and formatting an Invalid Date
 * throws synchronously during setup. The same crash-avoidance shape check
 * `ResourceFormDrawer` already carries, for the same reason.
 *
 * This is not the field's business rule: a value that fails here is handed to
 * the picker as `null` (renders empty) while the model keeps it, and the
 * backend's own `date_format:H:i` stays the real validator.
 */
function toPickerTimeValue(value: unknown): string | null {
	return typeof value === "string" && TIME_DISPLAY_PATTERN.test(value) ? value : null
}

/** Both bounds set — the pair the backend validates with `required_with`. */
const hasAccessWindow = computed(() => Boolean(model.value.access_window_start && model.value.access_window_end))

/**
 * Turning the window off clears BOTH bounds rather than hiding a half-filled
 * pair: the backend requires each with the other, so a lingering single value
 * would be a 422 the operator cannot see the cause of.
 *
 * Turning it on seeds the evening package this feature was built for, so the
 * common case is one switch rather than two pickers.
 */
function toggleAccessWindow(enabled: boolean) {
	if (enabled) {
		model.value.access_window_start = "20:00"
		model.value.access_window_end = "00:00"
	} else {
		model.value.access_window_start = null
		model.value.access_window_end = null
	}
}

/**
 * True when the window runs past midnight — `"20:00"`-`"00:00"` or
 * `"22:00"`-`"02:00"`. Legal and intended, so this drives an explanation, not
 * a validation error. Mirrors the backend's own minute comparison rather than
 * comparing the strings lexically, which is exactly what breaks on midnight.
 */
const accessWindowWraps = computed(() => {
	const start = toPickerTimeValue(model.value.access_window_start)
	const end = toPickerTimeValue(model.value.access_window_end)
	if (!start || !end) return false

	const toMinutes = (value: string) => {
		const [hours, minutes] = value.split(":").map(Number)
		return hours * 60 + minutes
	}

	return toMinutes(end) <= toMinutes(start)
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

const targetModeOptions = computed<SelectOption[]>(() => [
	{ label: t("packages.discounts.target.all"), value: "all" },
	{ label: t("packages.discounts.target.space"), value: "space" },
	{ label: t("packages.discounts.target.spaceType"), value: "space_type" }
])

const spaceTypeOptions = computed<SelectOption[]>(() =>
	SPACE_TYPES.map(type => ({ label: t(`spaces.spaceType.${type}`), value: type }))
)

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

const discountsList = computed<PlanDiscountItem[]>({
	get: () => {
		if (!model.value.discounts) model.value.discounts = []
		return model.value.discounts
	},
	set: val => {
		model.value.discounts = val
	}
})

const resourceGrantsList = computed<PlanResourceGrantItem[]>({
	get: () => {
		if (!model.value.resource_grants) model.value.resource_grants = []
		return model.value.resource_grants
	},
	set: val => {
		model.value.resource_grants = val
	}
})

const totalBalancePoints = computed(() => {
	return (model.value.balances ?? []).reduce((acc, b) => acc + (Number(b.amount_points) || 0), 0)
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
		amount_points: 20,
		description: { ar: "", en: "" },
		order: model.value.balances.length + 1
	})
}

function removeBalance(index: number) {
	model.value.balances?.splice(index, 1)
}

function discountDesc(d: PlanDiscountItem) {
	if (!d.description) d.description = { ar: "", en: "" }
	return d.description
}

/**
 * Switches target mode and keeps `space_id`/`space_type` mutually exclusive,
 * mirroring the guard `PlanDiscount::booted()` enforces server-side. Can't
 * be inferred purely from those two fields being null (see `targetMode`'s
 * doc comment on `PlanDiscountItem`), so `d.targetMode` is the source of
 * truth the template reads for which picker to show.
 */
function setDiscountTarget(d: PlanDiscountItem, mode: "all" | "space" | "space_type") {
	d.targetMode = mode
	if (mode !== "space") d.space_id = null
	if (mode !== "space_type") d.space_type = null
}

/** `usage_limit: null` means unlimited; the switch just toggles that sentinel. */
function discountUsageLimited(d: PlanDiscountItem) {
	return {
		get value(): boolean {
			return d.usage_limit != null
		},
		set value(limited: boolean) {
			d.usage_limit = limited ? (d.usage_limit ?? 1) : null
		}
	}
}

/**
 * PlanStepper's `modelValue` is `number | undefined`, not `number | null` —
 * this only renders while `discountUsageLimited` is true, where `usage_limit`
 * is never actually null, but that fact isn't visible to the type checker
 * from a sibling `v-if`, so the stepper binds through this instead of the
 * field directly.
 */
function discountUsageValue(d: PlanDiscountItem) {
	return {
		get value(): number {
			return d.usage_limit ?? 1
		},
		set value(val: number) {
			d.usage_limit = val
		}
	}
}

function addDiscount() {
	if (!model.value.discounts) model.value.discounts = []
	model.value.discounts.push({
		percentage: 10,
		space_id: null,
		space_type: null,
		usage_limit: null,
		description: { ar: "", en: "" },
		is_active: true,
		order: model.value.discounts.length + 1,
		targetMode: "all"
	})
}

function removeDiscount(index: number) {
	model.value.discounts?.splice(index, 1)
}

function getDiscountTargetLabel(d: PlanDiscountItem): string {
	if (d.space_id != null) {
		const space = rawSpaces.value.find(s => s.id === d.space_id)
		return space ? `#${space.id} - ${t(`spaces.spaceType.${space.space_type}`)}` : `#${d.space_id}`
	}
	if (d.space_type) {
		return t(`spaces.spaceType.${d.space_type}`)
	}
	return t("packages.discounts.target.all")
}

function resourceGrantDesc(g: PlanResourceGrantItem) {
	if (!g.description) g.description = { ar: "", en: "" }
	return g.description
}

function addResourceGrant() {
	if (!model.value.resource_grants) model.value.resource_grants = []
	const firstType = rawResourceTypes.value[0]
	if (!firstType) return
	model.value.resource_grants.push({
		resource_type_id: firstType.id,
		quantity: 1,
		description: { ar: "", en: "" },
		order: model.value.resource_grants.length + 1
	})
}

function removeResourceGrant(index: number) {
	model.value.resource_grants?.splice(index, 1)
}

function getResourceTypeLabel(g: PlanResourceGrantItem): string {
	const found = rawResourceTypes.value.find(rt => rt.id === g.resource_type_id)
	return found ? pickLocalized(found.name, currentLocale.value) : t("packages.resources.resourceType")
}

function resourceTypeUnitLabel(g: PlanResourceGrantItem): string {
	const found = rawResourceTypes.value.find(rt => rt.id === g.resource_type_id)
	return found ? pickLocalized(found.unit_label, currentLocale.value) : ""
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
		const [modules, spaces, resourceTypes] = await Promise.all([listPlanModules(), listSpaces(), listResourceTypes()])
		rawModules.value = modules
		moduleOptions.value = modules.map(m => ({
			label: pickLocalized(m.name, currentLocale.value),
			value: m.id
		}))
		rawSpaces.value = spaces.map(s => ({ id: s.id, space_type: s.space_type }))
		spaceOptions.value = spaces.map(s => ({
			label: `#${s.id} - ${t(`spaces.spaceType.${s.space_type}`)}`,
			value: s.id
		}))
		rawResourceTypes.value = resourceTypes.map(rt => ({ id: rt.id, name: rt.name, unit_label: rt.unit_label }))
		resourceTypeOptions.value = resourceTypes.map(rt => ({
			label: `${pickLocalized(rt.name, currentLocale.value)} (${pickLocalized(rt.unit_label, currentLocale.value)})`,
			value: rt.id
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
			// The backend validates `integer` on this: a fractional point count
			// is a 422, not something to round away silently here.
			amount_points: Number(b.amount_points),
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
		})),
		discounts: (model.value.discounts ?? []).map(d => ({
			// The backend validates `integer` between 1 and 100, same reasoning
			// as amount_points above.
			percentage: Number(d.percentage),
			space_id: d.space_id ?? null,
			space_type: d.space_type ?? null,
			usage_limit: d.usage_limit ?? null,
			description: d.description?.ar || d.description?.en ? d.description : null,
			is_active: Boolean(d.is_active),
			order: d.order ?? 0
		})),
		resource_grants: (model.value.resource_grants ?? []).map(g => ({
			resource_type_id: g.resource_type_id,
			// The backend validates `numeric` (not `integer`) here — a fractional
			// quantity like 5.5 hours is legitimate, unlike amount_points/percentage
			// above.
			quantity: Number(g.quantity),
			description: g.description?.ar || g.description?.en ? g.description : null,
			order: g.order ?? 0
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
