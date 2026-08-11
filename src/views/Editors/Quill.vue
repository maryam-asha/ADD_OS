<template>
	<div class="page">
		<div class="page-header">
			<div class="title">Quill</div>
			<div class="links">
				<a
					href="https://vueup.github.io/vue-quill/"
					target="_blank"
					alt="docs"
					rel="nofollow noopener noreferrer"
				>
					<Icon :name="ExternalIcon" :size="16" />
					docs
				</a>
			</div>
		</div>

		<n-card>
			<QuillEditor v-if="mounted" theme="snow" toolbar="minimal" class="h-[60vh]! w-full" @blur="resetScroll()" />
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { Component } from "vue"
import { NCard } from "naive-ui"
import { defineAsyncComponent, onMounted, ref } from "vue"
import Icon from "@/components/common/Icon.vue"
import "@/assets/scss/overrides/quill-override.scss"

const ExternalIcon = "tabler:external-link"

const mounted = ref(false)

const QuillEditor = defineAsyncComponent<Component>(() => {
	return (async () => {
		const { QuillEditor } = await import("@vueup/vue-quill")
		return QuillEditor
	})()
})

function resetScroll() {
	window.scrollTo(0, 0)
}

onMounted(() => {
	mounted.value = true
})
</script>
