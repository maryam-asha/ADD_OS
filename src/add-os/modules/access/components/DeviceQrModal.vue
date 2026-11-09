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

const STICKER_CSS = `
	@page { size: auto; margin: 12mm; }
	html, body { margin: 0; background: #fff; color: #111; font-family: system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif; }
	.sticker { box-sizing: border-box; width: 80mm; margin: 0 auto; padding: 8mm 6mm; border: 0.4mm dashed #999; border-radius: 4mm; text-align: center; }
	.sticker img { display: block; width: 62mm; height: 62mm; margin: 0 auto; image-rendering: pixelated; }
	.place { margin: 5mm 0 2mm; font-size: 15pt; font-weight: 700; }
	.hint { margin: 0; font-size: 9pt; color: #444; }
	.ref { margin: 3mm 0 0; font-size: 7pt; color: #888; direction: ltr; }
`

/**
 * The sticker alone on a page, printed from a hidden frame so the dashboard
 * itself is not what prints. Every text is set as text, never parsed as HTML:
 * the room name is staff-entered.
 */
function print() {
	const image = qrImage()
	if (!image || !props.device) return

	const frame = document.createElement("iframe")
	frame.setAttribute("aria-hidden", "true")
	frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;"
	document.body.appendChild(frame)

	const doc = frame.contentDocument
	const view = frame.contentWindow
	if (!doc || !view) {
		frame.remove()
		return
	}

	doc.open()
	doc.write("<!doctype html><html><head><meta charset=\"utf-8\"></head><body></body></html>")
	doc.close()
	doc.documentElement.lang = currentLocale.value
	doc.documentElement.dir = currentLocale.value === "ar" ? "rtl" : "ltr"
	doc.title = props.caption

	const style = doc.createElement("style")
	style.textContent = STICKER_CSS
	doc.head.appendChild(style)

	const card = doc.createElement("div")
	card.className = "sticker"
	const qr = doc.createElement("img")
	qr.alt = props.caption
	const place = doc.createElement("p")
	place.className = "place"
	place.textContent = props.caption
	const hint = doc.createElement("p")
	hint.className = "hint"
	hint.textContent = t("accessDevices.qr.printHint")
	const ref = doc.createElement("p")
	ref.className = "ref"
	ref.textContent = props.device.external_ref ? `#${props.device.external_ref}` : ""
	card.append(qr, place, hint, ref)
	doc.body.appendChild(card)

	view.addEventListener("afterprint", () => frame.remove(), { once: true })
	qr.addEventListener("load", () => {
		view.focus()
		view.print()
	}, { once: true })
	qr.src = image
}
</script>
