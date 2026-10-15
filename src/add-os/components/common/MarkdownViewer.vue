<!-- src/add-os/components/common/MarkdownViewer.vue -->
<template>
	<div
		v-if="content && content.trim()"
		class="add-markdown-content"
		:dir="dir"
		v-html="renderedHtml"
	/>
	<span v-else class="text-xs text-[var(--add-text-muted,#5A606B)] dark:text-neutral-500 italic">
		{{ emptyText || "—" }}
	</span>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { renderMarkdown } from "@/add-os/utils/markdown"

const props = withDefaults(
	defineProps<{
		/** Raw Markdown text */
		content?: string | null
		/** Text direction, defaults to auto */
		dir?: "rtl" | "ltr" | "auto"
		/** Text to display when content is empty */
		emptyText?: string
	}>(),
	{
		content: "",
		dir: "auto",
		emptyText: ""
	}
)

const renderedHtml = computed(() => renderMarkdown(props.content))
</script>
