<template>
	<div v-if="editor" class="editor">
		<menu-bar class="editor__header" :editor />
		<n-scrollbar trigger="none">
			<editor-content class="editor__content" :editor />
		</n-scrollbar>
	</div>
</template>

<script lang="ts" setup>
import Highlight from "@tiptap/extension-highlight"
import TaskItem from "@tiptap/extension-task-item"
import TaskList from "@tiptap/extension-task-list"
import TextAlign from "@tiptap/extension-text-align"
import StarterKit from "@tiptap/starter-kit"
import { EditorContent, useEditor } from "@tiptap/vue-3"
import { NScrollbar } from "naive-ui"
import { watch } from "vue"
import MenuBar from "./MenuBar.vue"

const text = defineModel<string>({ default: "" })

const editor = useEditor({
	content: text.value,
	extensions: [
		StarterKit.configure({}),
		Highlight,
		TaskList,
		TaskItem,
		TextAlign.configure({
			types: ["heading", "paragraph"]
		})
	],
	onUpdate: () => {
		text.value = editor.value?.getHTML() || ""
	},
	onBlur() {
		window.scrollTo(0, 0)
	}
})

watch(text, val => {
	const isSame = editor.value?.getHTML() === val

	// JSON
	// const isSame = JSON.stringify(editor.value.getJSON()) === JSON.stringify(value)

	if (isSame) {
		return
	}

	editor.value?.commands.setContent(val)
})
</script>

<style lang="scss">
@import "@/assets/scss/overrides/prosemirror-override.scss";
</style>

<style lang="scss" scoped>
.editor {
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius);
	display: flex;
	flex-direction: column;

	&__header {
		align-items: center;
		background: var(--bg-secondary-color);
		display: flex;
		flex: 0 0 auto;
		flex-wrap: wrap;
		border-top-left-radius: var(--border-radius);
		border-top-right-radius: var(--border-radius);
		border-bottom: 1px solid var(--border-color);
	}

	&__content {
		/* use it without n-scrollbar
		flex: 1 1 auto;
		overflow-x: hidden;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		*/
		padding: 18px 20px;
		min-height: 300px;
	}
}
</style>
