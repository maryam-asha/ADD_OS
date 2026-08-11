<template>
	<n-card class="card">
		<div class="content">
			<div v-if="$slots.description" class="description">
				<slot name="description" />
			</div>
			<slot />
		</div>
		<template v-if="$slots.html || $slots.js || $slots.css || $slots.code" #action>
			<n-collapse>
				<template #header-extra>
					<Icon :name="CodeIcon" />
				</template>
				<n-collapse-item title="Code" name="code">
					<LtrContext class="code-container">
						<n-scrollbar x-scrollable class="max-h-96 max-w-full">
							<slot v-if="$slots.html" name="html" />
							<slot v-if="$slots.js" name="js" />
							<slot v-if="$slots.css" name="css" />
							<slot name="code" :html :js :css />
							<div v-show="loaded.html" class="code-box">
								<div class="label">Template</div>
								<pre ref="refHTML" />
							</div>
							<div v-show="loaded.js" class="code-box">
								<div class="label">Script</div>
								<pre ref="refJS" />
							</div>
							<div v-show="loaded.css" class="code-box">
								<div class="label">Style</div>
								<pre ref="refCSS" />
							</div>
						</n-scrollbar>
					</LtrContext>
				</n-collapse-item>
			</n-collapse>
		</template>
	</n-card>
</template>

<script setup lang="ts">
import { NCard, NCollapse, NCollapseItem, NScrollbar } from "naive-ui"
import { ref } from "vue"
import Icon from "@/components/common/Icon.vue"
import LtrContext from "@/components/common/LtrContext.vue"
import { hljs, resetIndent } from "@/directives/v-hl"

type LangType = "html" | "js" | "css"
const CodeIcon = "carbon:code"

const refHTML = ref<HTMLElement | null>(null)
const refJS = ref<HTMLElement | null>(null)
const refCSS = ref<HTMLElement | null>(null)

const loaded = ref({
	html: false,
	js: false,
	css: false
})

function codeInit(code: string, lang: LangType) {
	let el: HTMLElement | null = null
	if (lang === "html") {
		el = refHTML.value
	}
	if (lang === "js") {
		el = refJS.value
	}
	if (lang === "css") {
		el = refCSS.value
	}

	if (el) {
		el.innerHTML = hljs.highlightAuto(code).value
		resetIndent(el)
		loaded.value[lang] = true
	}
}

function html(code: string) {
	if (code) {
		codeInit(code, "html")
	}
}

function js(code: string) {
	if (code) {
		codeInit(code, "js")
	}
}

function css(code: string) {
	if (code) {
		codeInit(code, "css")
	}
}
</script>

<style scoped lang="scss">
.card {
	.content {
		.description {
			line-height: 1.5;
			margin-bottom: 20px;
		}
	}
	.code-container {
		display: grid;

		.code-box {
			margin: 15px 0;

			.label {
				background-color: var(--hover-color);
				opacity: 0.8;
				display: inline-block;
				padding: 4px 6px;
				font-size: 12px;
				border-radius: var(--border-radius-small);
				margin-bottom: 5px;
				line-height: 1;
			}
		}
	}
}
</style>
