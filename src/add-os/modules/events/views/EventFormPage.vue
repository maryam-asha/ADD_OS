<!-- src/add-os/modules/events/views/EventFormPage.vue -->
<template>
	<div class="flex flex-col gap-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
		<!-- Page Header -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80 dark:border-stone-800">
			<div class="flex items-center gap-3">
				<n-button
					circle
					secondary
					:aria-label="t('common.back')"
					:title="t('common.back')"
					@click="router.push('/community/events')"
				>
					<template #icon>
						<Icon :name="isRtl ? 'carbon:arrow-right' : 'carbon:arrow-left'" :size="18" />
					</template>
				</n-button>
				<div class="flex flex-col gap-0.5">
					<div class="flex items-center gap-2">
						<span class="text-xs font-semibold text-secondary uppercase tracking-wider">
							{{ t("nav.pages.events") }}
						</span>
						<span class="text-xs text-stone-300 dark:text-stone-600">/</span>
						<span class="text-xs font-medium text-stone-500">
							{{ isEdit ? t("events.edit.title") : t("events.create.title") }}
						</span>
					</div>
					<h1 class="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
						{{ isEdit ? t("events.edit.title") : t("events.create.title") }}
					</h1>
					<p class="text-xs text-secondary mt-0.5">
						{{ isEdit ? t("events.edit.subtitle") : t("events.create.subtitle") }}
					</p>
				</div>
			</div>

			<!-- Top Actions -->
			<div class="flex items-center gap-2 shrink-0">
				<n-button
					secondary
					:disabled="isSubmitting || isLoadingEvent"
					@click="router.push('/community/events')"
				>
					{{ t("events.create.actions.cancel") }}
				</n-button>
				<n-button
					type="primary"
					class="!bg-[var(--add-primary)] hover:!bg-[var(--add-primary-hover)] !text-white font-medium shadow-sm px-5 inline-flex items-center gap-2"
					:loading="isSubmitting"
					:disabled="isSubmitting || isLoadingEvent"
					@click="handleSubmit"
				>
					<template #icon>
						<Icon name="carbon:checkmark" :size="18" color="#ffffff" />
					</template>
					{{ isEdit ? t("events.edit.actions.submit") : t("events.create.actions.submit") }}
				</n-button>
			</div>
		</div>

		<!-- General Error Banner -->
		<n-alert v-if="generalError" type="error" closable @close="generalError = null">
			{{ generalError }}
		</n-alert>

		<n-alert v-if="isCancelled" type="warning" :bordered="false">
			{{ t("events.cancel.banner") }}
		</n-alert>

		<n-spin :show="isLoadingEvent">
			<n-form :model="form" label-placement="top">
				<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
					<!-- Main Column (8 cols): Content & Configuration -->
					<div class="lg:col-span-8 flex flex-col gap-6">
						<!-- Card 1: Basic Information -->
						<n-card
							size="small"
							class="shadow-xs border border-stone-200/80 dark:border-stone-800 rounded-xl"
						>
							<template #header>
								<div class="flex items-center gap-2">
									<div class="w-7 h-7 rounded-lg bg-[var(--add-primary)]/10 text-[var(--add-primary)] flex items-center justify-center shrink-0">
										<Icon name="carbon:information" :size="16" />
									</div>
									<span class="text-base font-semibold text-stone-900 dark:text-stone-100">
										{{ t("events.create.sections.basic") }}
									</span>
								</div>
							</template>

							<div class="flex flex-col gap-4">
								<!-- Event Title (Bilingual) -->
								<div class="flex flex-col gap-2">
									<span class="text-sm font-medium text-stone-700 dark:text-stone-300">
										{{ t("events.form.title") }} <span class="text-red-500">*</span>
									</span>
									<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<n-form-item
											:show-label="false"
											:feedback="fieldErrors['title.ar']?.[0] || fieldErrors.title?.[0]"
											:validation-status="fieldErrors['title.ar'] || fieldErrors.title ? 'error' : undefined"
											class="!mb-0"
										>
											<n-input
												v-model:value="form.title.ar"
												:placeholder="t('resourceCrud.form.arabicPlaceholder')"
												clearable
											>
												<template #prefix>
													<span class="text-xs font-bold text-stone-400 select-none">AR</span>
												</template>
											</n-input>
										</n-form-item>

										<n-form-item
											:show-label="false"
											:feedback="fieldErrors['title.en']?.[0] || fieldErrors.title?.[0]"
											:validation-status="fieldErrors['title.en'] || fieldErrors.title ? 'error' : undefined"
											class="!mb-0"
										>
											<n-input
												v-model:value="form.title.en"
												:placeholder="t('resourceCrud.form.englishPlaceholder')"
												clearable
											>
												<template #prefix>
													<span class="text-xs font-bold text-stone-400 select-none">EN</span>
												</template>
											</n-input>
										</n-form-item>
									</div>
								</div>

								<!-- Category Selector -->
								<n-form-item
									:label="t('events.form.category')"
									:feedback="fieldErrors.category_id?.[0]"
									:validation-status="fieldErrors.category_id ? 'error' : undefined"
									class="!mb-0"
								>
									<n-select
										v-model:value="form.category_id"
										:options="categoryOptions"
										:loading="isCategoriesLoading"
										:placeholder="t('events.form.category')"
										clearable
									/>
								</n-form-item>

								<!-- Description (Bilingual) -->
								<div class="flex flex-col gap-2">
									<span class="text-sm font-medium text-stone-700 dark:text-stone-300">
										{{ t("events.form.description") }}
									</span>
									<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<n-form-item
											:show-label="false"
											:feedback="fieldErrors['description.ar']?.[0] || fieldErrors.description?.[0]"
											:validation-status="fieldErrors['description.ar'] || fieldErrors.description ? 'error' : undefined"
											class="!mb-0"
										>
											<n-input
												v-model:value="form.description!.ar"
												type="textarea"
												:autosize="{ minRows: 4, maxRows: 8 }"
												:placeholder="t('resourceCrud.form.arabicPlaceholder')"
											/>
										</n-form-item>

										<n-form-item
											:show-label="false"
											:feedback="fieldErrors['description.en']?.[0] || fieldErrors.description?.[0]"
											:validation-status="fieldErrors['description.en'] || fieldErrors.description ? 'error' : undefined"
											class="!mb-0"
										>
											<n-input
												v-model:value="form.description!.en"
												type="textarea"
												:autosize="{ minRows: 4, maxRows: 8 }"
												:placeholder="t('resourceCrud.form.englishPlaceholder')"
											/>
										</n-form-item>
									</div>
								</div>
							</div>
						</n-card>

						<!-- Card 2: Schedule & Location -->
						<n-card
							size="small"
							class="shadow-xs border border-stone-200/80 dark:border-stone-800 rounded-xl"
						>
							<template #header>
								<div class="flex items-center gap-2">
									<div class="w-7 h-7 rounded-lg bg-[var(--add-primary)]/10 text-[var(--add-primary)] flex items-center justify-center shrink-0">
										<Icon name="carbon:calendar" :size="16" />
									</div>
									<span class="text-base font-semibold text-stone-900 dark:text-stone-100">
										{{ t("events.create.sections.schedule") }}
									</span>
								</div>
							</template>

							<div class="flex flex-col gap-4">
								<!-- Schedule Sessions -->
								<n-form-item
									:label="t('events.form.schedule')"
									:feedback="fieldErrors.sessions?.[0]"
									:validation-status="fieldErrors.sessions ? 'error' : undefined"
									class="!mb-0"
								>
									<div class="flex flex-col gap-2 w-full">
										<p class="text-xs text-secondary mb-1">
											{{ t("events.create.hints.sessions") }}
										</p>
										<SessionsField
											:model-value="form.sessions"
											@update:model-value="val => form.sessions = val"
										/>
									</div>
								</n-form-item>

								<!-- Location -->
								<n-form-item
									:label="t('events.form.location')"
									:feedback="fieldErrors.location?.[0]"
									:validation-status="fieldErrors.location ? 'error' : undefined"
									class="!mb-0"
								>
									<n-input
										v-model:value="form.location"
										:placeholder="t('events.form.location')"
										clearable
									>
										<template #prefix>
											<Icon name="carbon:location" :size="16" class="text-stone-400" />
										</template>
									</n-input>
								</n-form-item>
							</div>
						</n-card>

						<!-- Card 3: Registration & Capacity -->
						<n-card
							size="small"
							class="shadow-xs border border-stone-200/80 dark:border-stone-800 rounded-xl"
						>
							<template #header>
								<div class="flex items-center gap-2">
									<div class="w-7 h-7 rounded-lg bg-[var(--add-primary)]/10 text-[var(--add-primary)] flex items-center justify-center shrink-0">
										<Icon name="carbon:user-multiple" :size="16" />
									</div>
									<span class="text-base font-semibold text-stone-900 dark:text-stone-100">
										{{ t("events.create.sections.registration") }}
									</span>
								</div>
							</template>

							<div class="flex flex-col gap-5">
								<!-- Registration Source Selector -->
								<div class="flex flex-col gap-2">
									<span class="text-sm font-medium text-stone-700 dark:text-stone-300">
										{{ t("events.form.registrationSource") }}
									</span>
									<n-radio-group v-model:value="form.registration_source" name="registration_source">
										<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
											<div
												class="p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3"
												:class="form.registration_source === 'internal'
													? 'border-[var(--add-primary)] bg-[var(--add-primary)]/5 shadow-2xs'
													: 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'"
												@click="form.registration_source = 'internal'"
											>
												<n-radio value="internal" class="mt-0.5" />
												<div class="flex flex-col gap-0.5">
													<span class="text-sm font-semibold text-stone-900 dark:text-stone-100">
														{{ t("events.form.registrationSourceInternal") }}
													</span>
													<span class="text-xs text-secondary">
														{{ t("events.create.hints.internal") }}
													</span>
												</div>
											</div>

											<div
												class="p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3"
												:class="form.registration_source === 'external'
													? 'border-[var(--add-primary)] bg-[var(--add-primary)]/5 shadow-2xs'
													: 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'"
												@click="form.registration_source = 'external'"
											>
												<n-radio value="external" class="mt-0.5" />
												<div class="flex flex-col gap-0.5">
													<span class="text-sm font-semibold text-stone-900 dark:text-stone-100">
														{{ t("events.form.registrationSourceExternal") }}
													</span>
													<span class="text-xs text-secondary">
														{{ t("events.create.hints.external") }}
													</span>
												</div>
											</div>
										</div>
									</n-radio-group>
								</div>

								<!-- External Registration URL -->
								<div v-if="form.registration_source === 'external'" class="flex flex-col gap-2">
									<n-form-item
										:label="t('events.form.externalFormUrl')"
										:feedback="fieldErrors.external_form_url?.[0]"
										:validation-status="fieldErrors.external_form_url ? 'error' : undefined"
										class="!mb-0"
									>
										<n-input
											v-model:value="form.external_form_url"
											:placeholder="t('events.form.externalFormUrlPlaceholder')"
											dir="ltr"
											clearable
										>
											<template #prefix>
												<Icon name="carbon:link" :size="16" class="text-stone-400" />
											</template>
										</n-input>
									</n-form-item>
									<n-alert type="info" :bordered="false" class="text-xs">
										{{ t("events.create.hints.external") }}
									</n-alert>
								</div>

								<!-- Internal Registration Options -->
								<template v-else>
									<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<!-- Capacity -->
										<n-form-item
											:label="t('events.form.capacity')"
											:feedback="fieldErrors.capacity?.[0]"
											:validation-status="fieldErrors.capacity ? 'error' : undefined"
											class="!mb-0"
										>
											<n-input-number
												v-model:value="form.capacity"
												:min="1"
												:placeholder="t('events.form.capacity')"
												class="w-full"
												clearable
											/>
										</n-form-item>

										<!-- Requires Approval -->
										<n-form-item
											:label="t('events.form.requiresApproval')"
											:feedback="fieldErrors.requires_approval?.[0]"
											:validation-status="fieldErrors.requires_approval ? 'error' : undefined"
											class="!mb-0"
										>
											<div class="flex items-center justify-between w-full h-9 px-3 rounded-lg border border-stone-200 dark:border-stone-800">
												<span class="text-xs text-secondary">
													{{ t("events.create.hints.approval") }}
												</span>
												<n-switch v-model:value="form.requires_approval" />
											</div>
										</n-form-item>
									</div>
								</template>

								<!-- Registration Window -->
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-stone-100 dark:border-stone-800">
									<!-- Opens At -->
									<n-form-item
										:label="t('events.form.registrationOpensAt')"
										:feedback="fieldErrors.registration_opens_at?.[0]"
										:validation-status="fieldErrors.registration_opens_at ? 'error' : undefined"
										class="!mb-0"
									>
										<DateTimeInput v-model="form.registration_opens_at" />
									</n-form-item>

									<!-- Closes At -->
									<n-form-item
										:label="t('events.form.registrationClosesAt')"
										:feedback="fieldErrors.registration_closes_at?.[0]"
										:validation-status="fieldErrors.registration_closes_at ? 'error' : undefined"
										class="!mb-0"
									>
										<DateTimeInput v-model="form.registration_closes_at" />
									</n-form-item>
								</div>

								<!-- Mark as Full Switch -->
								<div class="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800">
									<div class="flex flex-col gap-0.5">
										<span class="text-sm font-medium text-stone-900 dark:text-stone-100">
											{{ t("events.form.isMarkedFull") }}
										</span>
										<span class="text-xs text-secondary">
											{{ t("events.markedFull") }}
										</span>
									</div>
									<n-switch v-model:value="form.is_marked_full" />
								</div>
							</div>
						</n-card>
					</div>

					<!-- Side Column (4 cols): Media, Pricing & Status -->
					<div class="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-6">
						<!-- Card 4: Event Image -->
						<n-card
							size="small"
							class="shadow-xs border border-stone-200/80 dark:border-stone-800 rounded-xl"
						>
							<template #header>
								<div class="flex items-center gap-2">
									<div class="w-7 h-7 rounded-lg bg-[var(--add-primary)]/10 text-[var(--add-primary)] flex items-center justify-center shrink-0">
										<Icon name="carbon:image" :size="16" />
									</div>
									<span class="text-base font-semibold text-stone-900 dark:text-stone-100">
										{{ t("events.create.sections.media") }}
									</span>
								</div>
							</template>

							<div class="flex flex-col gap-3">
								<!-- Image Preview State -->
								<div
									v-if="form.image_url"
									class="w-full flex flex-col gap-3 p-2.5 border border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50 dark:bg-stone-900/50"
								>
									<div class="relative w-full rounded-lg overflow-hidden border border-black/10 bg-black/5 aspect-video flex items-center justify-center">
										<img
											:src="form.image_url"
											alt="Cover preview"
											class="w-full h-full object-cover"
										/>
										<div class="absolute top-2 start-2 flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-medium px-2.5 py-0.5 rounded-full shadow-md backdrop-blur-sm">
											<Icon name="carbon:checkmark-filled" :size="14" />
											<span>{{ t("resourceCrud.form.uploadSuccess") }}</span>
										</div>
									</div>

									<div class="flex items-center justify-between gap-2">
										<n-upload
											accept="image/*"
											:show-file-list="false"
											:custom-request="handleImageUpload"
										>
											<n-button size="small" secondary type="primary">
												<template #icon><Icon name="carbon:renew" :size="14" /></template>
												{{ t("resourceCrud.form.changeImage") }}
											</n-button>
										</n-upload>

										<n-button size="small" secondary type="error" @click="removeImage">
											<template #icon><Icon name="carbon:trash-can" :size="14" /></template>
											{{ t("resourceCrud.form.removeImage") }}
										</n-button>
									</div>
								</div>

								<!-- Uploading State -->
								<div
									v-else-if="isUploadingImage"
									class="w-full py-8 px-4 border-2 border-dashed border-[var(--add-primary)]/50 rounded-xl flex flex-col items-center justify-center gap-2 bg-[var(--add-primary)]/5"
								>
									<n-spin size="small" />
									<span class="text-xs font-medium text-secondary">
										{{ t("resourceCrud.form.uploading") }}
									</span>
								</div>

								<!-- Empty Upload State -->
								<n-upload
									v-else
									class="w-full"
									accept="image/*"
									:show-file-list="false"
									:custom-request="handleImageUpload"
								>
									<n-upload-dragger class="w-full !p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[var(--add-primary)] transition-colors">
										<div class="p-3 rounded-full bg-[var(--add-primary)]/10 text-[var(--add-primary)]">
											<Icon name="carbon:cloud-upload" :size="28" />
										</div>
										<div class="flex flex-col items-center text-center gap-1">
											<span class="text-sm font-semibold text-stone-900 dark:text-stone-100">
												{{ t("resourceCrud.form.uploadImagesPrompt") }}
											</span>
											<span class="text-xs text-secondary">
												{{ t("events.create.hints.image") }}
											</span>
										</div>
									</n-upload-dragger>
								</n-upload>

								<n-text v-if="fieldErrors.image_url" type="error" class="text-xs">
									{{ fieldErrors.image_url[0] }}
								</n-text>
							</div>
						</n-card>

						<!-- Card 5: Pricing & Visibility -->
						<n-card
							size="small"
							class="shadow-xs border border-stone-200/80 dark:border-stone-800 rounded-xl"
						>
							<template #header>
								<div class="flex items-center gap-2">
									<div class="w-7 h-7 rounded-lg bg-[var(--add-primary)]/10 text-[var(--add-primary)] flex items-center justify-center shrink-0">
										<Icon name="carbon:currency" :size="16" />
									</div>
									<span class="text-base font-semibold text-stone-900 dark:text-stone-100">
										{{ t("events.create.sections.pricing") }}
									</span>
								</div>
							</template>

							<div class="flex flex-col gap-4">
								<!-- Free Event Switch -->
								<div class="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800">
									<div class="flex flex-col gap-0.5">
										<span class="text-sm font-medium text-stone-900 dark:text-stone-100">
											{{ t("events.form.isFree") }}
										</span>
										<span class="text-xs text-secondary">
											{{ t("events.create.hints.free") }}
										</span>
									</div>
									<n-switch v-model:value="form.is_free" />
								</div>

								<!-- Ticket Price (points) - shown only when not free -->
								<n-form-item
									v-if="!form.is_free"
									:label="t('events.form.pricePoints')"
									:feedback="fieldErrors.price_points?.[0]"
									:validation-status="fieldErrors.price_points ? 'error' : undefined"
									class="!mb-0"
								>
									<n-input-number
										v-model:value="form.price_points"
										:min="0"
										:precision="0"
										class="w-full"
									>
										<template #suffix>
											<span class="text-xs text-stone-400 select-none">PTS</span>
										</template>
									</n-input-number>
								</n-form-item>

								<!-- Publication Status -->
								<n-form-item
									:label="t('events.form.status')"
									:feedback="fieldErrors.status?.[0]"
									:validation-status="fieldErrors.status ? 'error' : undefined"
									class="!mb-0"
								>
									<n-select
										v-model:value="form.status"
										:options="statusOptions"
									/>
								</n-form-item>

								<!-- Display Order -->
								<n-form-item
									:label="t('events.form.order')"
									:feedback="fieldErrors.order?.[0]"
									:validation-status="fieldErrors.order ? 'error' : undefined"
									class="!mb-0"
								>
									<n-input-number
										v-model:value="form.order"
										:min="0"
										:precision="0"
										class="w-full"
									/>
								</n-form-item>
							</div>
						</n-card>

						<!-- Bottom Sticky Actions Card -->
						<n-card
							size="small"
							class="shadow-xs border border-stone-200/80 dark:border-stone-800 rounded-xl bg-stone-50/50 dark:bg-stone-900/40"
						>
							<div class="flex flex-col gap-3">
								<n-button
									type="primary"
									block
									class="!bg-[var(--add-primary)] hover:!bg-[var(--add-primary-hover)] !text-white font-medium shadow-sm py-2.5 rounded-lg"
									:loading="isSubmitting"
									:disabled="isSubmitting || isLoadingEvent"
									@click="handleSubmit"
								>
									<template #icon>
										<Icon name="carbon:checkmark" :size="18" color="#ffffff" />
									</template>
									{{ isEdit ? t("events.edit.actions.submit") : t("events.create.actions.submit") }}
								</n-button>
								<n-button
									secondary
									block
									:disabled="isSubmitting || isLoadingEvent"
									@click="router.push('/community/events')"
								>
									{{ t("events.create.actions.cancel") }}
								</n-button>
							</div>
						</n-card>
					</div>
				</div>
			</n-form>
		</n-spin>
	</div>
</template>

<script setup lang="ts">
import type { UploadCustomRequestOptions } from "naive-ui"
import type { Event, EventPayload, EventStatus } from "@/add-os/modules/events/types/event"
import type { EventCategory } from "@/add-os/modules/events/types/event-category"
import {
	NAlert,
	NButton,
	NCard,
	NForm,
	NFormItem,
	NInput,
	NInputNumber,
	NRadio,
	NRadioGroup,
	NSelect,
	NSpin,
	NSwitch,
	NText,
	NUpload,
	NUploadDragger,
	useDialog,
	useMessage
} from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import DateTimeInput from "@/add-os/components/form/DateTimeInput.vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import SessionsField from "@/add-os/components/resource/SessionsField.vue"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { emptyEventPayload } from "@/add-os/modules/events/config/events.config"
import { ApiError } from "@/add-os/services/api"
import { listEventCategories } from "@/add-os/services/event-categories"
import { createEvent, getEvent, updateEvent } from "@/add-os/services/events"
import { uploadMedia } from "@/add-os/services/media"
import { toOffsetIso } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const isRtl = computed(() => currentLocale.value === "ar")
const isEdit = computed(() => Boolean(route.params.id))
const eventId = computed(() => (route.params.id ? Number(route.params.id) : null))

const form = ref<EventPayload>(emptyEventPayload())
const categories = ref<EventCategory[]>([])
const isCategoriesLoading = ref(false)
const isLoadingEvent = ref(false)
const isSubmitting = ref(false)
const isUploadingImage = ref(false)
const fieldErrors = ref<Record<string, string[]>>({})
const generalError = ref<string | null>(null)
/** The status as saved, not as edited — what decides whether this save cancels. */
const savedStatus = ref<EventStatus | null>(null)
const isCancelled = computed(() => savedStatus.value === "cancelled")

const categoryOptions = computed(() =>
	categories.value.map(cat => ({
		label: pickLocalized(cat.name, currentLocale.value),
		value: cat.id
	}))
)

// An event is cancelled once it exists; there is nothing to cancel yet when
// it is being created.
const statusOptions = computed(() => [
	{ label: t("events.status.draft"), value: "draft" as EventStatus },
	{ label: t("events.status.published"), value: "published" as EventStatus },
	...(isEdit.value ? [{ label: t("events.status.cancelled"), value: "cancelled" as EventStatus }] : [])
])

function populateFormFromEvent(event: Event) {
	const sessions = event.sessions ?? []
	form.value = {
		category_id: event.category_id ?? null,
		title: { ar: event.title?.ar ?? "", en: event.title?.en ?? "" },
		description: { ar: event.description?.ar ?? "", en: event.description?.en ?? "" },
		sessions: sessions.length
			? sessions.map(s => ({ start_at: toOffsetIso(s.start_at), end_at: toOffsetIso(s.end_at) }))
			: event.start_at && event.end_at
				? [{ start_at: toOffsetIso(event.start_at), end_at: toOffsetIso(event.end_at) }]
				: [],
		location: event.location || "",
		capacity: event.capacity ?? null,
		requires_approval: event.requires_approval ?? false,
		registration_source: event.external_form_url ? "external" : "internal",
		external_form_url: event.external_form_url || "",
		registration_opens_at: event.registration_opens_at || "",
		registration_closes_at: event.registration_closes_at || "",
		is_marked_full: event.is_marked_full ?? false,
		is_free: event.is_free ?? true,
		price_points: event.price_points ?? 0,
		image_url: event.image_url || "",
		status: event.status ?? "draft",
		order: event.order ?? 0
	}
	savedStatus.value = event.status ?? null
}

async function loadEventData() {
	if (!isEdit.value || !eventId.value) {
		form.value = emptyEventPayload()
		savedStatus.value = null
		return
	}

	isLoadingEvent.value = true
	try {
		const event = await getEvent(eventId.value)
		populateFormFromEvent(event)
	} catch {
		generalError.value = t("events.loadError")
	} finally {
		isLoadingEvent.value = false
	}
}

onMounted(async () => {
	isCategoriesLoading.value = true
	try {
		categories.value = await listEventCategories()
	} catch {
		// Categories list failure does not prevent creating/editing an event
	} finally {
		isCategoriesLoading.value = false
	}

	await loadEventData()
})

watch(() => route.params.id, () => {
	loadEventData()
})

async function handleImageUpload(options: UploadCustomRequestOptions) {
	const { file, onFinish, onError } = options
	if (!file.file) return
	isUploadingImage.value = true
	try {
		const res = await uploadMedia(file.file, "events")
		form.value.image_url = res.url
		onFinish()
	} catch {
		onError()
		message.error(t("resourceCrud.mutations.genericError"))
	} finally {
		isUploadingImage.value = false
	}
}

function removeImage() {
	form.value.image_url = ""
}

function validateForm(): boolean {
	fieldErrors.value = {}
	let isValid = true

	// Validate title in both Arabic and English
	if (!form.value.title?.ar?.trim()) {
		fieldErrors.value["title.ar"] = [t("resourceCrud.validation.required", { field: `${t("events.form.title")} (AR)` })]
		isValid = false
	}
	if (!form.value.title?.en?.trim()) {
		fieldErrors.value["title.en"] = [t("resourceCrud.validation.required", { field: `${t("events.form.title")} (EN)` })]
		isValid = false
	}

	// Validate external form link if external
	if (form.value.registration_source === "external") {
		const link = String(form.value.external_form_url ?? "").trim()
		if (!link) {
			fieldErrors.value.external_form_url = [t("events.validation.externalFormUrlRequired")]
			isValid = false
		} else {
			try {
				const url = new URL(link)
				if (url.protocol !== "http:" && url.protocol !== "https:") {
					fieldErrors.value.external_form_url = [t("events.validation.externalFormUrlInvalid")]
					isValid = false
				}
			} catch {
				fieldErrors.value.external_form_url = [t("events.validation.externalFormUrlInvalid")]
				isValid = false
			}
		}
	}

	// Validate schedule sessions
	if (!form.value.sessions || form.value.sessions.length === 0) {
		fieldErrors.value.sessions = [t("resourceCrud.validation.required", { field: t("events.form.schedule") })]
		isValid = false
	}

	return isValid
}

function handleSubmit() {
	if (!validateForm()) {
		return
	}

	// Cancelling is a status like the others to the API — a plain update —
	// but it closes registration and payment for every member, so it is
	// confirmed rather than saved on the same click as a typo fix.
	if (isEdit.value && form.value.status === "cancelled" && !isCancelled.value) {
		dialog.warning({
			title: t("events.cancel.confirmTitle"),
			content: t("events.cancel.confirmBody"),
			positiveText: t("events.cancel.confirmOk"),
			negativeText: t("events.cancel.confirmBack"),
			onPositiveClick: () => save()
		})
		return
	}

	return save()
}

async function save() {
	const isCancelling = form.value.status === "cancelled" && !isCancelled.value
	generalError.value = null
	isSubmitting.value = true

	const cleaned: EventPayload = { ...form.value }

	// Handle external link vs in-app
	if (cleaned.registration_source === "external") {
		cleaned.external_form_url = String(cleaned.external_form_url ?? "").trim()
		cleaned.capacity = null
		cleaned.requires_approval = false
	} else {
		cleaned.external_form_url = null
	}

	// Free event drops points
	if (cleaned.is_free) {
		cleaned.price_points = 0
	}

	// Normalize empty timestamps to null
	if (!cleaned.registration_opens_at) cleaned.registration_opens_at = null
	if (!cleaned.registration_closes_at) cleaned.registration_closes_at = null

	// Remove virtual field
	delete cleaned.registration_source

	try {
		if (isEdit.value && eventId.value) {
			await updateEvent(eventId.value, cleaned)
			message.success(isCancelling ? t("events.cancel.success") : t("events.edit.success"))
		} else {
			await createEvent(cleaned)
			message.success(t("events.create.success"))
		}
		router.push("/community/events")
	} catch (caught) {
		if (caught instanceof ApiError && caught.status === 422 && caught.data?.errors) {
			fieldErrors.value = caught.data.errors
		} else {
			generalError.value = t("resourceCrud.mutations.genericError")
		}
	} finally {
		isSubmitting.value = false
	}
}
</script>
