<!-- src/add-os/modules/inventory/components/AttachmentsField.vue -->
<template>
	<div class="flex flex-col gap-2">
		<div v-for="(url, index) in value" :key="url + index" class="flex items-center gap-2 text-sm">
			<Icon name="carbon:document" :size="16" class="text-secondary" />
			<a :href="url" target="_blank" rel="noopener noreferrer" class="min-w-0 truncate text-primary underline">{{ names[url] ?? attachmentName(url) }}</a>
			<n-button size="tiny" quaternary @click="value = value.filter((_, i) => i !== index)">{{ t("inventory.operations.removeAttachment") }}</n-button>
		</div>
		<AttachmentField v-if="value.length < MAX" :key="value.length" :value="null" @update:value="add" @named="name => (pendingName = name)" />
	</div>
</template>

<script setup lang="ts">
import { NButton } from "naive-ui"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import AttachmentField from "@/add-os/modules/inventory/components/AttachmentField.vue"
import { attachmentName } from "@/add-os/modules/inventory/utils/attachments"
import Icon from "@/components/common/Icon.vue"

/**
 * Several documents beside an asset (its invoice, a photo, a warranty
 * card): each uploaded at once as AttachmentField does, up to ten — ADD
 * Core's limit.
 */
const value = defineModel<string[]>("value", { required: true })
const { t } = useI18n()

const MAX = 10
const pendingName = ref<string | null>(null)
/** The chosen files' own names, shown until the page is left. */
const names = ref<Record<string, string>>({})

function add(url: string | null) {
	if (!url) return
	if (pendingName.value) names.value = { ...names.value, [url]: pendingName.value }
	pendingName.value = null
	value.value = [...value.value, url]
}
</script>
