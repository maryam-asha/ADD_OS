<template>
	<div class="page">
		<div class="page-header">
			<div class="title">Multi Language</div>
		</div>

		Multi language support is provided by the
		<a href="https://vue-i18n.intlify.dev/" target="_blank" alt="docs" rel="nofollow noopener noreferrer">
			vue-i18n
		</a>
		plugin. For more information and to find out about all possible implementations, I invite you to read the plugin
		documentation.
		<br />
		In the
		<a href="https://pinx-docs.vercel.app/i18n" target="_blank" alt="docs" rel="nofollow noopener noreferrer">
			template documentation
		</a>
		you can find out how it was implemented.

		<n-card class="mt-6">
			<LocaleSelect class="mb-5" />

			<p>
				{{ $t("sun_description") }}
			</p>
		</n-card>

		<n-card
			class="mt-6"
			:segmented="{
				content: true,
				footer: 'soft'
			}"
		>
			<template #header>
				<span class="flex items-center gap-3">
					RTL
					<span class="text-secondary">Right-to-Left</span>
				</span>
			</template>
			<template #header-extra>
				<n-button type="primary" @click="toggleRTL()">Set {{ isRTL ? "LTR" : "RTL" }}</n-button>
			</template>

			<n-alert title="BETA Feature" type="warning" class="mb-4" />

			<p class="mb-4">
				The RTL mode is a feature designed to enhance the user experience for languages read from right to left,
				such as Arabic, Hebrew, Sindhi, Aramaic and Persian.
			</p>
			<p class="mb-4">
				Enabling RTL mode automatically adapts the user interface of our application to align correctly with the
				reading conventions of these languages. This includes reversing the entire layout, ensuring that text,
				images, buttons, and other visual elements are arranged in a coherent and natural manner for RTL users.
			</p>
			<p class="mb-4">
				To activate RTL mode, simply use the
				<code>themeStore.setRTL(true)</code>
				function. This function will instantly adjust the layout orientation to support right-to-left reading.
			</p>
			<p>
				With this new feature, our template becomes even more versatile and inclusive, allowing a wider range of
				users to enjoy an optimized user experience.
			</p>
		</n-card>
	</div>
</template>

<script lang="ts" setup>
import { NAlert, NButton, NCard } from "naive-ui"
import { computed } from "vue"
import LocaleSelect from "@/components/common/LocaleSelect.vue"
import { useThemeStore } from "@/stores/theme"

const themeStore = useThemeStore()
const isRTL = computed(() => themeStore.isRTL)

function toggleRTL() {
	themeStore.setRTL(!isRTL.value)
}
</script>
