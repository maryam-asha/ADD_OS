<!-- src/add-os/modules/cms/views/TermsOfUsePage.vue -->
<template>
	<div class="flex flex-col gap-6">
		<!-- ── Page Header ─────────────────────────────────────────────────────── -->
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div class="flex flex-col gap-1">
				<div class="flex items-center gap-2.5">
					<div class="p-2 rounded-lg bg-[var(--add-primary)]/10 text-[var(--add-primary)]">
						<Icon name="carbon:document-tasks" :size="22" />
					</div>
					<h1 class="text-2xl font-bold tracking-tight">
						{{ t("termsOfUse.title") }}
					</h1>
				</div>
				<p class="text-sm text-[var(--add-text-secondary,#5A606B)]">
					{{ t("termsOfUse.subtitle") }}
				</p>
			</div>

			<!-- Action buttons & status -->
			<div class="flex flex-wrap items-center gap-3">
				<!-- Dirty / Saved status badge -->
				<div
					class="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors border"
					:class="
						isDirty
							? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
							: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
					"
				>
					<span
						class="w-2 h-2 rounded-full"
						:class="isDirty ? 'bg-amber-500' : 'bg-emerald-500'"
					/>
					<span>{{ isDirty ? t("termsOfUse.unsavedChanges") : t("termsOfUse.allSaved") }}</span>
				</div>

				<!-- Refresh button -->
				<n-button :loading="isFetching" secondary @click="fetchTerms">
					<template #icon>
						<Icon name="carbon:renew" :size="16" />
					</template>
					{{ t("termsOfUse.refresh") }}
				</n-button>

				<!-- Save button -->
				<n-button
					type="primary"
					:loading="isSaving"
					:disabled="!isDirty || isSaving"
					class="!bg-[var(--add-primary)] hover:!bg-[var(--add-primary-hover)] !text-white font-semibold shadow-xs px-5"
					@click="handleSave"
				>
					<template #icon>
						<Icon name="carbon:save" :size="16" color="#ffffff" />
					</template>
					{{ t("termsOfUse.saveButton") }}
				</n-button>
			</div>
		</div>

		<!-- Error Alert if GET failed -->
		<n-alert v-if="loadError" type="error" :title="t('termsOfUse.loadError')" class="rounded-xl">
			<!-- n-alert has no action slot: the retry sits in its body. -->
			<n-button size="small" tertiary @click="fetchTerms">
				{{ t("termsOfUse.retry") }}
			</n-button>
		</n-alert>

		<!-- ── Main Editor Card ────────────────────────────────────────────────── -->
		<n-spin :show="isFetching">
			<div class="rounded-2xl border border-[var(--add-border,#CDC2AF)]/60 bg-[var(--add-surface-raised,#FFFFFF)] p-4 md:p-6 shadow-xs flex flex-col gap-4">
				<!-- Language & View Mode Tabs -->
				<n-tabs v-model:value="activeTab" type="segment" class="w-full">
					<n-tab name="ar">
						<div class="flex items-center gap-2">
							<span>{{ t("termsOfUse.arabicTab") }}</span>
							<span
								v-if="form.ar"
								class="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--add-primary)]/10 text-[var(--add-primary)] font-mono"
							>
								{{ form.ar.length }}
							</span>
						</div>
					</n-tab>
					<n-tab name="en">
						<div class="flex items-center gap-2">
							<span>{{ t("termsOfUse.englishTab") }}</span>
							<span
								v-if="form.en"
								class="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--add-primary)]/10 text-[var(--add-primary)] font-mono"
							>
								{{ form.en.length }}
							</span>
						</div>
					</n-tab>
					<n-tab name="split">
						<div class="flex items-center gap-2">
							<Icon name="carbon:view" :size="14" />
							<span>{{ t("termsOfUse.sideBySideTab") }}</span>
						</div>
					</n-tab>
				</n-tabs>

				<!-- Tab 1: Arabic -->
				<div v-show="activeTab === 'ar'" class="flex flex-col gap-2">
					<div class="flex items-center justify-between text-xs text-[var(--add-text-secondary,#5A606B)] px-1">
						<span>{{ t("termsOfUse.arPlaceholder") }}</span>
					</div>
					<MarkdownEditor
						v-model:value="form.ar"
						:placeholder="t('termsOfUse.arPlaceholder')"
						min-height="460px"
						max-height="700px"
					/>
				</div>

				<!-- Tab 2: English -->
				<div v-show="activeTab === 'en'" class="flex flex-col gap-2">
					<div class="flex items-center justify-between text-xs text-[var(--add-text-secondary,#5A606B)] px-1">
						<span>{{ t("termsOfUse.enPlaceholder") }}</span>
					</div>
					<MarkdownEditor
						v-model:value="form.en"
						:placeholder="t('termsOfUse.enPlaceholder')"
						min-height="460px"
						max-height="700px"
					/>
				</div>

				<!-- Tab 3: Side-by-Side (Both Languages) -->
				<div v-show="activeTab === 'split'" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<div class="flex flex-col gap-2">
						<div class="flex items-center justify-between text-xs font-semibold px-1">
							<span>{{ t("termsOfUse.arabicTab") }}</span>
						</div>
						<MarkdownEditor
							v-model:value="form.ar"
							:placeholder="t('termsOfUse.arPlaceholder')"
							min-height="460px"
							max-height="700px"
						/>
					</div>
					<div class="flex flex-col gap-2">
						<div class="flex items-center justify-between text-xs font-semibold px-1">
							<span>{{ t("termsOfUse.englishTab") }}</span>
						</div>
						<MarkdownEditor
							v-model:value="form.en"
							:placeholder="t('termsOfUse.enPlaceholder')"
							min-height="460px"
							max-height="700px"
						/>
					</div>
				</div>

				<!-- Footer metadata -->
				<div
					v-if="lastUpdated"
					class="pt-3 border-t border-[var(--add-border,#CDC2AF)]/30 flex items-center justify-between text-xs text-[var(--add-text-secondary,#5A606B)]"
				>
					<span>
						{{ t("termsOfUse.lastUpdated") }}:
						<strong class="font-mono text-neutral-700 dark:text-neutral-300">{{ formatDateTime(lastUpdated) }}</strong>
					</span>
				</div>
			</div>
		</n-spin>
	</div>
</template>

<script setup lang="ts">
import type { TermsOfUseContent } from "@/add-os/services/terms-of-use"
import { NAlert, NButton, NSpin, NTab, NTabs, useMessage } from "naive-ui"
import { computed, onMounted, reactive, ref } from "vue"
import { useI18n } from "vue-i18n"
import MarkdownEditor from "@/add-os/components/form/MarkdownEditor.vue"
import { getTermsOfUse, updateTermsOfUse } from "@/add-os/services/terms-of-use"
import { formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()
const message = useMessage()

const isFetching = ref(false)
const isSaving = ref(false)
const loadError = ref(false)
const lastUpdated = ref<string | null>(null)
const activeTab = ref<"ar" | "en" | "split">("ar")

const form = reactive<TermsOfUseContent>({
	ar: "",
	en: ""
})

const initialContent = reactive<TermsOfUseContent>({
	ar: "",
	en: ""
})

const isDirty = computed(() => form.ar !== initialContent.ar || form.en !== initialContent.en)

async function fetchTerms() {
	isFetching.value = true
	loadError.value = false
	try {
		const terms = await getTermsOfUse()
		form.ar = terms.content.ar ?? ""
		form.en = terms.content.en ?? ""
		initialContent.ar = form.ar
		initialContent.en = form.en
		lastUpdated.value = terms.updated_at ?? null
	} catch {
		loadError.value = true
		message.error(t("termsOfUse.loadError"))
	} finally {
		isFetching.value = false
	}
}

async function handleSave() {
	if (!isDirty.value) return
	isSaving.value = true
	try {
		await updateTermsOfUse({
			ar: form.ar,
			en: form.en
		})
		initialContent.ar = form.ar
		initialContent.en = form.en
		lastUpdated.value = new Date().toISOString()
		message.success(t("termsOfUse.saveSuccess"))
	} catch {
		message.error(t("termsOfUse.saveError"))
	} finally {
		isSaving.value = false
	}
}

onMounted(() => {
	fetchTerms()
})
</script>
