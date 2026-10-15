<!-- src/add-os/components/form/MarkdownEditor.vue -->
<template>
	<div
		class="add-markdown-editor flex flex-col rounded-xl border border-[var(--add-border,#CDC2AF)]/60 bg-[var(--add-surface-raised,#FFFFFF)] transition-colors focus-within:border-[var(--add-primary,#657C50)] focus-within:ring-1 focus-within:ring-[var(--add-primary,#657C50)]/30 dark:border-neutral-800 dark:bg-neutral-900 shadow-2xs overflow-hidden"
		:class="{ 'opacity-60 pointer-events-none': disabled }"
	>
		<!-- ── Top Toolbar ────────────────────────────────────────────────────── -->
		<div
			class="flex flex-wrap items-center justify-between gap-1.5 border-b border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface,#F7F5F2)]/70 px-2.5 py-1.5 dark:border-neutral-800 dark:bg-neutral-800/70"
		>
			<!-- Formatting Buttons -->
			<div class="flex flex-wrap items-center gap-0.5">
				<!-- Headings -->
				<button
					type="button"
					class="editor-btn font-bold text-xs"
					:title="t('markdown.h1', 'عنوان رئيسي H1')"
					@mousedown.prevent
					@click="applyPrefix('# ')"
				>
					H1
				</button>
				<button
					type="button"
					class="editor-btn font-bold text-xs"
					:title="t('markdown.h2', 'عنوان فرعي H2')"
					@mousedown.prevent
					@click="applyPrefix('## ')"
				>
					H2
				</button>
				<button
					type="button"
					class="editor-btn font-bold text-xs"
					:title="t('markdown.h3', 'عنوان صغير H3')"
					@mousedown.prevent
					@click="applyPrefix('### ')"
				>
					H3
				</button>

				<div class="toolbar-divider" />

				<!-- Bold & Italic & Strikethrough -->
				<button
					type="button"
					class="editor-btn font-bold"
					:title="t('markdown.bold', 'غامق (Ctrl+B)')"
					@mousedown.prevent
					@click="applyWrap('**', '**', t('markdown.boldPlaceholder', 'نص عريض'))"
				>
					<Icon name="carbon:text-bold" :size="15" />
				</button>
				<button
					type="button"
					class="editor-btn italic"
					:title="t('markdown.italic', 'مائل (Ctrl+I)')"
					@mousedown.prevent
					@click="applyWrap('*', '*', t('markdown.italicPlaceholder', 'نص مائل'))"
				>
					<Icon name="carbon:text-italic" :size="15" />
				</button>
				<button
					type="button"
					class="editor-btn"
					:title="t('markdown.strikethrough', 'مشطوب')"
					@mousedown.prevent
					@click="applyWrap('~~', '~~', t('markdown.strikePlaceholder', 'نص مشطوب'))"
				>
					<Icon name="carbon:text-strikethrough" :size="15" />
				</button>

				<div class="toolbar-divider" />

				<!-- Lists -->
				<button
					type="button"
					class="editor-btn"
					:title="t('markdown.bulletList', 'قائمة نقطية')"
					@mousedown.prevent
					@click="applyPrefix('- ')"
				>
					<Icon name="carbon:list-bulleted" :size="15" />
				</button>
				<button
					type="button"
					class="editor-btn"
					:title="t('markdown.numberedList', 'قائمة مرقمة')"
					@mousedown.prevent
					@click="applyPrefix('1. ')"
				>
					<Icon name="carbon:list-numbered" :size="15" />
				</button>
				<button
					type="button"
					class="editor-btn"
					:title="t('markdown.taskList', 'قائمة مهام')"
					@mousedown.prevent
					@click="applyPrefix('- [ ] ')"
				>
					<Icon name="carbon:list-checked" :size="15" />
				</button>

				<div class="toolbar-divider" />

				<!-- Quote & Code -->
				<button
					type="button"
					class="editor-btn"
					:title="t('markdown.quote', 'اقتباس')"
					@mousedown.prevent
					@click="applyPrefix('> ')"
				>
					<Icon name="carbon:quotes" :size="15" />
				</button>
				<button
					type="button"
					class="editor-btn font-mono"
					:title="t('markdown.code', 'شيفرة برمجية')"
					@mousedown.prevent
					@click="applyCode"
				>
					<Icon name="carbon:code" :size="15" />
				</button>

				<div class="toolbar-divider" />

				<!-- Link & Table & Divider -->
				<button
					type="button"
					class="editor-btn"
					:title="t('markdown.link', 'إدراج رابط')"
					@mousedown.prevent
					@click="insertLink"
				>
					<Icon name="carbon:link" :size="15" />
				</button>
				<button
					type="button"
					class="editor-btn"
					:title="t('markdown.table', 'إدراج جدول')"
					@mousedown.prevent
					@click="insertTable"
				>
					<Icon name="carbon:data-table" :size="15" />
				</button>
			</div>

			<!-- View Mode Switcher -->
			<div class="flex items-center gap-1 rounded-lg bg-[var(--add-surface-sunken,#EDEAE8)]/70 p-0.5 dark:bg-neutral-800">
				<button
					type="button"
					class="mode-btn"
					:class="{ active: viewMode === 'edit' }"
					:title="t('markdown.editMode', 'تحرير')"
					@mousedown.prevent
					@click="viewMode = 'edit'"
				>
					<Icon name="carbon:edit" :size="13" />
					<span class="text-xs">{{ t('markdown.edit', 'تحرير') }}</span>
				</button>
				<button
					type="button"
					class="mode-btn"
					:class="{ active: viewMode === 'split' }"
					:title="t('markdown.splitMode', 'مقسم')"
					@mousedown.prevent
					@click="viewMode = 'split'"
				>
					<span class="text-xs">{{ t('markdown.split', 'مقسم') }}</span>
				</button>
				<button
					type="button"
					class="mode-btn"
					:class="{ active: viewMode === 'preview' }"
					:title="t('markdown.previewMode', 'معاينة')"
					@mousedown.prevent
					@click="viewMode = 'preview'"
				>
					<Icon name="carbon:view" :size="13" />
					<span class="text-xs">{{ t('markdown.preview', 'معاينة') }}</span>
				</button>
			</div>
		</div>

		<!-- ── Editor Body Area ────────────────────────────────────────────────── -->
		<div
			class="editor-body grid min-h-[200px]"
			:class="{
				'grid-cols-1': viewMode !== 'split',
				'grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-[var(--add-border,#CDC2AF)]/30 dark:divide-neutral-800': viewMode === 'split'
			}"
		>
			<!-- Textarea Input (shown in edit and split modes) -->
			<div v-show="viewMode === 'edit' || viewMode === 'split'" class="relative flex flex-col">
				<textarea
					ref="textareaRef"
					v-model="model"
					:placeholder="placeholder || t('markdown.placeholder', 'اكتب هنا باستخدام Markdown...')"
					:rows
					:disabled
					:readonly
					dir="auto"
					class="h-full w-full resize-y bg-transparent p-3.5 text-sm font-sans leading-relaxed text-[var(--add-text-primary,#43474F)] outline-hidden dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
					:style="{ minHeight }"
					@keydown="handleKeydown"
				/>
			</div>

			<!-- Live Formatted Preview (shown in preview and split modes) -->
			<div
				v-show="viewMode === 'preview' || viewMode === 'split'"
				class="preview-container overflow-y-auto p-4 bg-[var(--add-surface,#F7F5F2)]/20 dark:bg-neutral-900/30"
				:style="{ minHeight, maxHeight: viewMode === 'split' ? maxHeight : 'auto' }"
			>
				<MarkdownViewer :content="model" :empty-text="t('markdown.emptyPreview', 'المعاينة فارغة... اكتب نصاً للبدء')" />
			</div>
		</div>

		<!-- ── Bottom Footer Stats ─────────────────────────────────────────────── -->
		<div class="flex items-center justify-between border-t border-[var(--add-border,#CDC2AF)]/30 bg-[var(--add-surface,#F7F5F2)]/40 px-3 py-1 text-[11px] text-[var(--add-text-muted,#5A606B)] dark:border-neutral-800 dark:bg-neutral-800/40">
			<span class="font-mono">Markdown (MD)</span>
			<div class="flex items-center gap-3 font-mono">
				<span>{{ wordCount }} {{ t('markdown.words', 'كلمة') }}</span>
				<span>·</span>
				<span>{{ characterCount }} {{ t('markdown.chars', 'حرف') }}</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue"
import { useI18n } from "vue-i18n"
import MarkdownViewer from "@/add-os/components/common/MarkdownViewer.vue"
import Icon from "@/components/common/Icon.vue"

const props = withDefaults(
	defineProps<{
		value?: string
		modelValue?: string
		placeholder?: string
		rows?: number
		disabled?: boolean
		readonly?: boolean
		minHeight?: string
		maxHeight?: string
	}>(),
	{
		value: undefined,
		modelValue: undefined,
		placeholder: "",
		rows: 8,
		disabled: false,
		readonly: false,
		minHeight: "220px",
		maxHeight: "500px"
	}
)

const emit = defineEmits<{
	(e: "update:value", val: string): void
	(e: "update:modelValue", val: string): void
	(e: "change", val: string): void
}>()

const { t } = useI18n()

// Dual model support for v-model and v-model:value
const model = computed({
	get: () => props.modelValue ?? props.value ?? "",
	set: (val: string) => {
		emit("update:value", val)
		emit("update:modelValue", val)
		emit("change", val)
	}
})

const viewMode = ref<"edit" | "preview" | "split">("edit")
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// Stats
const characterCount = computed(() => model.value.length)
const wordCount = computed(() => {
	const trimmed = model.value.trim()
	if (!trimmed) return 0
	return trimmed.split(/\s+/).length
})

/**
 * Captures all scroll states (window, textarea, and all parent scroll containers)
 * so applying formatting never causes page or container scroll jumps.
 */
function captureScrollContext(el: HTMLTextAreaElement) {
	const textareaScrollTop = el.scrollTop
	const textareaScrollLeft = el.scrollLeft
	const winX = typeof window !== "undefined" ? window.scrollX : 0
	const winY = typeof window !== "undefined" ? window.scrollY : 0

	const scrollParents: { el: HTMLElement; top: number; left: number }[] = []
	if (typeof window !== "undefined") {
		let curr = el.parentElement
		while (curr && curr !== document.body) {
			const style = window.getComputedStyle(curr)
			if (/auto|scroll/.test(style.overflow + style.overflowY + style.overflowX)) {
				scrollParents.push({ el: curr, top: curr.scrollTop, left: curr.scrollLeft })
			}
			curr = curr.parentElement
		}
	}

	return {
		restore(start: number, end: number) {
			nextTick(() => {
				try {
					el.focus({ preventScroll: true })
				} catch {
					el.focus()
				}
				el.setSelectionRange(start, end)
				el.scrollTop = textareaScrollTop
				el.scrollLeft = textareaScrollLeft
				for (const sp of scrollParents) {
					sp.el.scrollTop = sp.top
					sp.el.scrollLeft = sp.left
				}
				if (typeof window !== "undefined" && (window.scrollX !== winX || window.scrollY !== winY)) {
					window.scrollTo(winX, winY)
				}
			})
		}
	}
}

/**
 * Wraps selected text with prefix and suffix, or inserts sample text
 */
function applyWrap(prefix: string, suffix: string, defaultText = "") {
	const el = textareaRef.value
	if (!el) return

	const scroll = captureScrollContext(el)
	const start = el.selectionStart
	const end = el.selectionEnd
	const fullText = model.value
	const selected = fullText.substring(start, end)

	const insert = selected.length > 0 ? selected : defaultText
	const newContent = fullText.substring(0, start) + prefix + insert + suffix + fullText.substring(end)

	model.value = newContent

	const newStart = start + prefix.length
	const newEnd = newStart + insert.length
	scroll.restore(newStart, newEnd)
}

/**
 * Prefixes the current line(s) with a markdown token (e.g. # or - )
 */
function applyPrefix(prefix: string) {
	const el = textareaRef.value
	if (!el) return

	const scroll = captureScrollContext(el)
	const start = el.selectionStart
	const end = el.selectionEnd
	const fullText = model.value

	// Find the start of the current line
	const lineStart = fullText.lastIndexOf("\n", start - 1) + 1
	const lineEnd = fullText.indexOf("\n", end)
	const effectiveEnd = lineEnd === -1 ? fullText.length : lineEnd

	const lineContent = fullText.substring(lineStart, effectiveEnd)
	const newContent = fullText.substring(0, lineStart) + prefix + lineContent + fullText.substring(effectiveEnd)

	model.value = newContent

	const newPos = start + prefix.length
	scroll.restore(newPos, newPos)
}

/**
 * Handles inline code vs code block
 */
function applyCode() {
	const el = textareaRef.value
	if (!el) return

	const start = el.selectionStart
	const end = el.selectionEnd
	const selected = model.value.substring(start, end)

	if (selected.includes("\n")) {
		// Multi-line selection: Code block
		applyWrap("```\n", "\n```", "console.log('Hello');")
	} else {
		// Single-line or empty: Inline code
		applyWrap("`", "`", "code")
	}
}

/**
 * Inserts a Markdown link
 */
function insertLink() {
	const el = textareaRef.value
	if (!el) return

	const scroll = captureScrollContext(el)
	const start = el.selectionStart
	const end = el.selectionEnd
	const selected = model.value.substring(start, end)

	const label = selected.length > 0 ? selected : t("markdown.linkLabel", "رابط")
	const linkTemplate = `[${label}](https://example.com)`

	const fullText = model.value
	model.value = fullText.substring(0, start) + linkTemplate + fullText.substring(end)

	const urlStart = start + label.length + 3
	const urlEnd = urlStart + 19
	scroll.restore(urlStart, urlEnd)
}

/**
 * Inserts a sample Markdown table
 */
function insertTable() {
	const tableSnippet = `\n| ${t("markdown.col1", "العمود 1")} | ${t("markdown.col2", "العمود 2")} |\n| --- | --- |\n| ${t("markdown.val1", "بيانات 1")} | ${t("markdown.val2", "بيانات 2")} |\n`
	applyWrap("", tableSnippet)
}

/**
 * Keyboard shortcuts (Ctrl+B, Ctrl+I, Tab indentation)
 */
function handleKeydown(e: KeyboardEvent) {
	if (e.ctrlKey || e.metaKey) {
		if (e.key === "b" || e.key === "B") {
			e.preventDefault()
			applyWrap("**", "**", t("markdown.boldPlaceholder", "نص عريض"))
		} else if (e.key === "i" || e.key === "I") {
			e.preventDefault()
			applyWrap("*", "*", t("markdown.italicPlaceholder", "نص مائل"))
		} else if (e.key === "k" || e.key === "K") {
			e.preventDefault()
			insertLink()
		}
	} else if (e.key === "Tab") {
		// Allow tab indentation inside textarea
		e.preventDefault()
		const el = textareaRef.value
		if (!el) return
		const scroll = captureScrollContext(el)
		const start = el.selectionStart
		const end = el.selectionEnd
		model.value = `${model.value.substring(0, start)}  ${model.value.substring(end)}`
		scroll.restore(start + 2, start + 2)
	}
}
</script>

<style scoped>
.editor-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 28px;
	height: 28px;
	padding: 0 6px;
	border-radius: 6px;
	color: var(--add-text-secondary, #565B65);
	background: transparent;
	border: none;
	cursor: pointer;
	transition: all 0.15s ease;
	user-select: none;
}

.editor-btn:hover {
	background: var(--add-surface-sunken, #EDEAE8);
	color: var(--add-primary-text, #556843);
}

.dark .editor-btn {
	color: #9CA3AF;
}

.dark .editor-btn:hover {
	background: #374151;
	color: #F3F4F6;
}

.toolbar-divider {
	width: 1px;
	height: 18px;
	margin: 0 4px;
	background-color: var(--add-border, #CDC2AF);
	opacity: 0.35;
}

.dark .toolbar-divider {
	background-color: #4B5563;
}

.mode-btn {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 8px;
	border-radius: 6px;
	color: var(--add-text-muted, #5A606B);
	background: transparent;
	border: none;
	cursor: pointer;
	font-weight: 500;
	transition: all 0.15s ease;
	user-select: none;
}

.mode-btn:hover {
	color: var(--add-text-primary, #43474F);
}

.mode-btn.active {
	background: var(--add-surface-raised, #FFFFFF);
	color: var(--add-primary-text, #556843);
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	font-weight: 600;
}

.dark .mode-btn.active {
	background: #1F2937;
	color: #A3E635;
}
</style>
