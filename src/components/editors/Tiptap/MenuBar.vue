<template>
	<div class="menu-bar">
		<n-scrollbar x-scrollable>
			<div class="menu-bar-scroll">
				<template v-for="(item, index) in items">
					<div v-if="item.type === 'divider'" :key="`divider${index}`" class="divider" />
					<menu-item v-if="!item.type" :key="index" v-bind="item" />
				</template>
			</div>
		</n-scrollbar>
	</div>
</template>

<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3"
import type { ItemProps } from "./MenuItem.vue"
import { NScrollbar } from "naive-ui"
import MenuItem from "./MenuItem.vue"

const { editor } = defineProps<{
	editor: Editor
}>()

const items: (ItemProps | { type: string; icon: string })[] = [
	{
		icon: "bold",
		title: "Bold",
		action: () => editor.chain().focus().toggleBold().run(),
		isActive: () => editor.isActive("bold")
	},
	{
		icon: "italic",
		title: "Italic",
		action: () => editor.chain().focus().toggleItalic().run(),
		isActive: () => editor.isActive("italic")
	},
	{
		icon: "underline",
		title: "Underline",
		action: () => editor.chain().focus().toggleUnderline().run(),
		isActive: () => editor.isActive("underline")
	},
	{
		icon: "strikethrough",
		title: "Strike",
		action: () => editor.chain().focus().toggleStrike().run(),
		isActive: () => editor.isActive("strike")
	},
	{
		icon: "code-view",
		title: "Code",
		action: () => editor.chain().focus().toggleCode().run(),
		isActive: () => editor.isActive("code")
	},
	{
		icon: "mark-pen-line",
		title: "Highlight",
		action: () => editor.chain().focus().toggleHighlight().run(),
		isActive: () => editor.isActive("highlight")
	},
	{
		type: "divider",
		icon: ""
	},
	{
		icon: "h-1",
		title: "Heading 1",
		action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
		isActive: () => editor.isActive("heading", { level: 1 })
	},
	{
		icon: "h-2",
		title: "Heading 2",
		action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
		isActive: () => editor.isActive("heading", { level: 2 })
	},
	{
		icon: "paragraph",
		title: "Paragraph",
		action: () => editor.chain().focus().setParagraph().run(),
		isActive: () => editor.isActive("paragraph")
	},
	{
		icon: "list-unordered",
		title: "Bullet List",
		action: () => editor.chain().focus().toggleBulletList().run(),
		isActive: () => editor.isActive("bulletList")
	},
	{
		icon: "list-ordered",
		title: "Ordered List",
		action: () => editor.chain().focus().toggleOrderedList().run(),
		isActive: () => editor.isActive("orderedList")
	},
	{
		icon: "list-check",
		title: "Task List",
		action: () => editor.chain().focus().toggleTaskList().run(),
		isActive: () => editor.isActive("taskList")
	},
	{
		icon: "code-box-line",
		title: "Code Block",
		action: () => editor.chain().focus().toggleCodeBlock().run(),
		isActive: () => editor.isActive("codeBlock")
	},
	{
		type: "divider",
		icon: ""
	},
	{
		icon: "text-align-left",
		title: "Text align left",
		action: () => editor.chain().focus().setTextAlign("left").run(),
		isActive: () => editor.isActive({ textAlign: "left" })
	},
	{
		icon: "text-align-center",
		title: "Text align center",
		action: () => editor.chain().focus().setTextAlign("center").run(),
		isActive: () => editor.isActive({ textAlign: "center" })
	},
	{
		icon: "text-align-right",
		title: "Text align right",
		action: () => editor.chain().focus().setTextAlign("right").run(),
		isActive: () => editor.isActive({ textAlign: "right" })
	},
	{
		icon: "text-align-justify",
		title: "Text align justify",
		action: () => editor.chain().focus().setTextAlign("justify").run(),
		isActive: () => editor.isActive({ textAlign: "justify" })
	},
	{
		type: "divider",
		icon: ""
	},
	{
		icon: "link",
		title: "Link",
		action: setLink,
		isActive: () => editor.isActive("link")
	},
	{
		icon: "double-quotes",
		title: "Blockquote",
		action: () => editor.chain().focus().toggleBlockquote().run(),
		isActive: () => editor.isActive("blockquote")
	},
	{
		icon: "separator",
		title: "Horizontal Rule",
		action: () => editor.chain().focus().setHorizontalRule().run()
	},
	{
		type: "divider",
		icon: ""
	},
	{
		icon: "text-wrap",
		title: "Hard Break",
		action: () => editor.chain().focus().setHardBreak().run()
	},
	{
		icon: "format-clear",
		title: "Clear Format",
		action: () => editor.chain().focus().clearNodes().unsetAllMarks().run()
	},
	{
		type: "divider",
		icon: ""
	},
	{
		icon: "arrow-go-back-line",
		title: "Undo",
		action: () => editor.chain().focus().undo().run()
	},
	{
		icon: "arrow-go-forward-line",
		title: "Redo",
		action: () => editor.chain().focus().redo().run()
	}
]

function setLink() {
	if (editor.isActive("link")) {
		editor.chain().focus().extendMarkRange("link").unsetLink().run()
		return
	}

	const previousUrl = editor.getAttributes("link").href
	// eslint-disable-next-line no-alert
	const url = window.prompt("URL", previousUrl)

	// cancelled
	if (url === null) {
		return
	}

	// empty
	if (url === "") {
		editor.chain().focus().extendMarkRange("link").unsetLink().run()

		return
	}

	// update link
	editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
}
</script>

<style lang="scss" scoped>
.menu-bar {
	container-type: inline-size;

	.menu-bar-scroll {
		@container (max-width: 620px) {
			white-space: nowrap;
			display: flex;
			align-items: center;
		}
	}

	.divider {
		background-color: rgba(var(--border-color-rgb) / 0.5);
		height: 24px;
		margin: 0 9px;
		width: 2px;
		display: inline-block;
	}
}
</style>
