<!-- src/add-os/modules/cms/views/PrivacyPolicyPage.vue -->
<template>
	<div class="flex flex-col gap-6">
		<!-- ── Page Header ─────────────────────────────────────────────────────── -->
		<PageHeader :title="t('privacyPolicy.title')" :description="t('privacyPolicy.subtitle')">
			<template #actions>
				<!-- Dirty / Saved status badge -->
				<div
					class="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors border"
					:class="
						isDirty
							? 'bg-[var(--add-warning)]/10 text-[var(--add-warning-text)] border-[var(--add-warning)]/20'
							: 'bg-[var(--add-success)]/10 text-[var(--add-success-text)] border-[var(--add-success)]/20'
					"
				>
					<span
						class="w-2 h-2 rounded-full"
						:class="isDirty ? 'bg-[var(--add-warning)]' : 'bg-[var(--add-success)]'"
					/>
					<span>{{ isDirty ? t("privacyPolicy.unsavedChanges") : t("privacyPolicy.allSaved") }}</span>
				</div>

				<!-- Refresh button -->
				<n-button :loading="isFetching" secondary @click="fetchPolicy">
					<template #icon>
						<Icon name="carbon:renew" :size="16" />
					</template>
					{{ t("privacyPolicy.refresh") }}
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
						<Icon name="carbon:save" :size="16" />
					</template>
					{{ t("privacyPolicy.saveButton") }}
				</n-button>
			</template>
		</PageHeader>

		<!-- Error Alert if GET failed -->
		<n-alert v-if="loadError" type="error" :title="t('privacyPolicy.loadError')" class="rounded-xl">
			<!-- n-alert has no action slot: the retry sits in its body. -->
			<n-button size="small" tertiary @click="fetchPolicy">
				{{ t("privacyPolicy.retry") }}
			</n-button>
		</n-alert>

		<!-- ── Main Editor Card ────────────────────────────────────────────────── -->
		<n-spin :show="isFetching">
			<div class="rounded-2xl border border-[var(--add-border)]/60 bg-[var(--add-surface-raised)] p-4 md:p-6 shadow-xs flex flex-col gap-4">
				<!-- Language & View Mode Tabs -->
				<n-tabs v-model:value="activeTab" type="segment" class="w-full">
					<n-tab name="ar">
						<div class="flex items-center gap-2">
							<span>{{ t("privacyPolicy.arabicTab") }}</span>
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
							<span>{{ t("privacyPolicy.englishTab") }}</span>
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
							<span>{{ t("privacyPolicy.sideBySideTab") }}</span>
						</div>
					</n-tab>
				</n-tabs>

				<!-- Tab 1: Arabic Policy -->
				<div v-show="activeTab === 'ar'" class="flex flex-col gap-2">
					<div class="flex items-center justify-between text-xs text-[var(--add-text-secondary)] px-1">
						<span>{{ t("privacyPolicy.arPlaceholder") }}</span>
					</div>
					<MarkdownEditor
						v-model:value="form.ar"
						:placeholder="t('privacyPolicy.arPlaceholder')"
						min-height="460px"
						max-height="700px"
					/>
				</div>

				<!-- Tab 2: English Policy -->
				<div v-show="activeTab === 'en'" class="flex flex-col gap-2">
					<div class="flex items-center justify-between text-xs text-[var(--add-text-secondary)] px-1">
						<span>{{ t("privacyPolicy.enPlaceholder") }}</span>
					</div>
					<MarkdownEditor
						v-model:value="form.en"
						:placeholder="t('privacyPolicy.enPlaceholder')"
						min-height="460px"
						max-height="700px"
					/>
				</div>

				<!-- Tab 3: Side-by-Side (Both Languages) -->
				<div v-show="activeTab === 'split'" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<div class="flex flex-col gap-2">
						<div class="flex items-center justify-between text-xs font-semibold px-1">
							<span>{{ t("privacyPolicy.arabicTab") }}</span>
						</div>
						<MarkdownEditor
							v-model:value="form.ar"
							:placeholder="t('privacyPolicy.arPlaceholder')"
							min-height="460px"
							max-height="700px"
						/>
					</div>
					<div class="flex flex-col gap-2">
						<div class="flex items-center justify-between text-xs font-semibold px-1">
							<span>{{ t("privacyPolicy.englishTab") }}</span>
						</div>
						<MarkdownEditor
							v-model:value="form.en"
							:placeholder="t('privacyPolicy.enPlaceholder')"
							min-height="460px"
							max-height="700px"
						/>
					</div>
				</div>

				<!-- Footer metadata -->
				<div
					v-if="lastUpdated"
					class="pt-3 border-t border-[var(--add-border)]/30 flex items-center justify-between text-xs text-[var(--add-text-secondary)]"
				>
					<span>
						{{ t("privacyPolicy.lastUpdated") }}:
						<strong class="font-mono text-[var(--add-text-primary)]">{{ formatDateTime(lastUpdated) }}</strong>
					</span>
				</div>
			</div>
		</n-spin>
	</div>
</template>

<script setup lang="ts">
import type { PrivacyPolicyContent } from "@/add-os/services/privacy-policy"
import { NAlert, NButton, NSpin, NTab, NTabs, useMessage } from "naive-ui"
import { computed, onMounted, reactive, ref } from "vue"
import { useI18n } from "vue-i18n"
import MarkdownEditor from "@/add-os/components/form/MarkdownEditor.vue"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import { getPrivacyPolicy, updatePrivacyPolicy } from "@/add-os/services/privacy-policy"
import { formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()
const message = useMessage()

const isFetching = ref(false)
const isSaving = ref(false)
const loadError = ref(false)
const lastUpdated = ref<string | null>(null)
const activeTab = ref<"ar" | "en" | "split">("ar")

const form = reactive<PrivacyPolicyContent>({
	ar: "",
	en: ""
})

const initialContent = reactive<PrivacyPolicyContent>({
	ar: "",
	en: ""
})

const isDirty = computed(() => form.ar !== initialContent.ar || form.en !== initialContent.en)

async function fetchPolicy() {
	isFetching.value = true
	loadError.value = false
	try {
		const policy = await getPrivacyPolicy()
		form.ar = policy.content.ar ?? ""
		form.en = policy.content.en ?? ""
		initialContent.ar = form.ar
		initialContent.en = form.en
		lastUpdated.value = policy.updated_at ?? null
	} catch {
		loadError.value = true
		message.error(t("privacyPolicy.loadError"))
	} finally {
		isFetching.value = false
	}
}

async function handleSave() {
	if (!isDirty.value) return
	isSaving.value = true
	try {
		await updatePrivacyPolicy({
			ar: form.ar,
			en: form.en
		})
		initialContent.ar = form.ar
		initialContent.en = form.en
		lastUpdated.value = new Date().toISOString()
		message.success(t("privacyPolicy.saveSuccess"))
	} catch {
		message.error(t("privacyPolicy.saveError"))
	} finally {
		isSaving.value = false
	}
}

onMounted(() => {
	fetchPolicy()
})
</script>
