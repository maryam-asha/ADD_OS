<template>
	<div class="page page-wrapped flex flex-col">
		<div class="page-header">
			<div class="title">Tiptap</div>
			<div class="links">
				<a
					href="https://tiptap.dev/installation/vue3"
					target="_blank"
					alt="docs"
					rel="nofollow noopener noreferrer"
				>
					<Icon :name="ExternalIcon" :size="16" />
					docs
				</a>
			</div>
		</div>

		<div class="editor-wrap grow overflow-hidden">
			<Tiptap v-model="text" class="h-full" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import Icon from "@/components/common/Icon.vue"
import Tiptap from "@/components/editors/Tiptap"

const ExternalIcon = "tabler:external-link"
const text = ref("<p>I’m running Tiptap with Vue.js. 🎉</p>")
</script>

<style scoped lang="scss">
.editor-wrap {
	background-color: var(--bg-default-color);
	border-radius: var(--border-radius);
}
</style>
