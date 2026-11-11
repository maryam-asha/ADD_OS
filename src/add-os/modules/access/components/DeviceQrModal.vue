<!-- src/add-os/modules/access/components/DeviceQrModal.vue -->
<!--
	The sticker fixed at a lock: a QR of its `qr_value`, which the member's
	app scans to open that door. The value names the lock and nothing else —
	a photographed sticker opens nothing without the scanner's own live code.
	Prints as a sticker on its own page, or downloads as a PNG; a new value
	(damaged or doubtful sticker) stops the old one at once, so it asks first.
-->
<template>
	<n-modal v-model:show="show" preset="card" :title="t('accessDevices.qr.title')" class="max-w-sm" :bordered="false">
		<div v-if="device" class="flex flex-col items-center gap-3">
			<div ref="sticker" class="rounded-lg bg-white p-4">
				<n-qr-code v-if="device.qr_value" :value="device.qr_value" :size="220" error-correction-level="M" />
			</div>
			<p class="text-center font-semibold">{{ caption }}</p>
			<p class="text-center text-xs text-secondary">{{ t("accessDevices.qr.hint") }}</p>

			<div class="flex w-full flex-wrap justify-center gap-2">
				<n-button type="primary" :disabled="!device.qr_value" data-test="sticker-print" @click="print">
					<template #icon><Icon name="carbon:printer" :size="16" /></template>
					{{ t("accessDevices.qr.print") }}
				</n-button>
				<n-button secondary :disabled="!device.qr_value" @click="download">
					<template #icon><Icon name="carbon:download" :size="16" /></template>
					{{ t("accessDevices.qr.download") }}
				</n-button>
				<n-button v-if="canRegenerate" type="warning" secondary @click="emit('regenerate', device)">
					<template #icon><Icon name="carbon:renew" :size="16" /></template>
					{{ t("accessDevices.qr.regenerate") }}
				</n-button>
			</div>
		</div>
	</n-modal>
</template>

<script setup lang="ts">
import type { Device } from "@/add-os/modules/access/types/access"
import { NButton, NModal, NQrCode } from "naive-ui"
import { useTemplateRef } from "vue"
import { useI18n } from "vue-i18n"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { printSticker } from "@/add-os/utils/printSticker"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	device: Device | null
	/** The room the lock is on, already resolved by the page. */
	caption: string
	canRegenerate: boolean
}>()
const emit = defineEmits<{ regenerate: [device: Device] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const sticker = useTemplateRef<HTMLElement>("sticker")

function qrImage(): string | null {
	return sticker.value?.querySelector("canvas")?.toDataURL("image/png") ?? null
}

function download() {
	const image = qrImage()
	if (!image || !props.device) return

	const link = document.createElement("a")
	link.href = image
	link.download = `lock-${props.device.external_ref ?? props.device.id}-sticker.png`
	link.click()
}

/** The sticker alone on a page; see `printSticker`. */
function print() {
	const canvas = sticker.value?.querySelector("canvas")
	if (!canvas || !props.device) return

	printSticker({
		qrCanvas: canvas,
		title: props.caption,
		subtitle: props.device.external_ref ? `#${props.device.external_ref}` : "",
		hint: t("accessDevices.qr.printHint"),
		dir: currentLocale.value === "ar" ? "rtl" : "ltr"
	})
}
</script>
