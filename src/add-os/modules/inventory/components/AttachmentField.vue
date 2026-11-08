<!-- src/add-os/modules/inventory/components/AttachmentField.vue -->
<template>
	<div>
		<div class="flex flex-wrap items-center gap-3">
			<label class="cursor-pointer">
				<span class="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-sunken px-3 py-1.5 text-sm">
					<Icon name="carbon:attachment" :size="16" />{{ uploading ? "…" : t("inventory.operations.chooseFile") }}
				</span>
				<input type="file" :accept="ATTACHMENT_TYPES.join(',')" class="hidden" @change="upload" />
			</label>
			<template v-if="value">
				<a :href="value" target="_blank" rel="noopener noreferrer" class="text-sm text-primary underline">{{ name ?? attachmentName(value) }}</a>
				<n-button size="tiny" quaternary @click="value = null">{{ t("inventory.operations.removeAttachment") }}</n-button>
			</template>
		</div>
		<p class="mt-1 text-xs text-secondary">{{ t("inventory.operations.attachmentHint") }}</p>
		<p v-if="problem" class="mt-1 text-xs text-error">{{ problem }}</p>
	</div>
</template>

<script setup lang="ts">
import { NButton } from "naive-ui"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { ATTACHMENT_TYPES, attachmentName, attachmentProblem } from "@/add-os/modules/inventory/utils/attachments"
import { uploadMedia } from "@/add-os/services/media"
import Icon from "@/components/common/Icon.vue"

/** The uploaded file's own name, just before its URL arrives (AttachmentsField keeps it). */
const emit = defineEmits<{ named: [name: string] }>()
/**
 * A scanned document beside a record — an operation's or an asset's
 * supplier invoice: an image or a PDF up to 2 MB, uploaded to ADD Core
 * at once; the model holds its URL.
 */
const value = defineModel<string | null>("value", { required: true })
const { t } = useI18n()

const uploading = ref(false)
const problem = ref("")
/** The chosen file's own name, shown until the page is left. */
const name = ref<string | null>(null)

async function upload(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	input.value = ""
	if (!file) return
	const refused = attachmentProblem(file)
	problem.value = refused ? t(`inventory.operations.${refused}`) : ""
	if (refused) return
	uploading.value = true
	try {
		const url = (await uploadMedia(file, "inventory")).url
		name.value = file.name
		emit("named", file.name)
		value.value = url
	} catch (e) {
		problem.value = apiErrorMessage(e, t("inventory.common.saveError"))
	} finally {
		uploading.value = false
	}
}
</script>
