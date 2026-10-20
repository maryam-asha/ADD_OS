<template>
	<n-upload :default-upload="false" :max="1" :accept="ACCEPT" :file-list @update:file-list="onFiles">
		<n-button>
			<template #icon><Icon name="carbon:document-attachment" :size="16" /></template>
			{{ t("hrRecruitment.cv.choose") }}
		</n-button>
	</n-upload>
</template>

<script setup lang="ts">
import type { UploadFileInfo } from "naive-ui"
import { NButton, NUpload } from "naive-ui"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import Icon from "@/components/common/Icon.vue"

/**
 * One CV file, kept in the form and sent with it. The types mirror ADD
 * Core's default `hr.recruitment.cv_mimes` (PDF and Word); the server checks
 * them again with its size limit and says so when it refuses.
 */
const file = defineModel<File | null>("file", { required: true })

const ACCEPT = ".pdf,.doc,.docx"

const { t } = useI18n()
const fileList = ref<UploadFileInfo[]>([])

/** A form reset clears the list too. */
watch(file, value => {
	if (!value) fileList.value = []
})

function onFiles(files: UploadFileInfo[]) {
	fileList.value = files
	file.value = files[0]?.file ?? null
}
</script>
