<template>
	<div class="page">
		<div class="page-header">
			<div class="title">Mention</div>
			<div class="links">
				<a
					href="https://www.naiveui.com/en-US/light/components/mention"
					target="_blank"
					alt="docs"
					rel="nofollow noopener noreferrer"
				>
					<Icon :name="ExternalIcon" :size="16" />
					docs
				</a>
			</div>
		</div>

		<div class="components-list">
			<CardCodeExample title="Basic">
				<n-mention :options :render-label placeholder="Type '@'" :prefix="['@']" />
				<template #code="{ html, js }">
					{{ html(`
					<n-mention :options :render-label="renderLabel" placeholder="Type '@'" :prefix="['@']" />
					`) }}

					{{
						js(`
						const options = [
							{
								label: "07akioni",
								value: "07akioni"
							},
							{
								label: "star-kirby",
								value: "star-kirby"
							},
							{
								label: "amadeus711",
								value: "amadeus711"
							}
						]
						const renderLabel = (option: MentionOption): VNodeChild =>
							h("div", { style: "display: flex; align-items: center;" }, [
								h(NAvatar, {
									style: "margin-right: 8px;",
									size: 24,
									round: true,
									src: "https://picsum.photos/seed/FsNXmz/460/460"
								}),
								option.value
							])
						`)
					}}
				</template>
			</CardCodeExample>

			<CardCodeExample title="Textarea">
				<n-mention type="textarea" :options :autosize="{ minRows: 3 }" />
				<template #code="{ html, js }">
					{{ html(`
					<n-mention type="textarea" :options :autosize="{ minRows: 3 }" />
					`) }}

					{{
						js(`
						const options = [
							{
								label: "07akioni",
								value: "07akioni"
							},
							{
								label: "star-kirby",
								value: "star-kirby"
							},
							{
								label: "amadeus711",
								value: "amadeus711"
							}
						]
						`)
					}}
				</template>
			</CardCodeExample>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { MentionOption } from "naive-ui"
import type { VNodeChild } from "vue"
import { NAvatar, NMention } from "naive-ui"
import { h } from "vue"
import Icon from "@/components/common/Icon.vue"

const ExternalIcon = "tabler:external-link"

const options = [
	{
		label: "07akioni",
		value: "07akioni"
	},
	{
		label: "star-kirby",
		value: "star-kirby"
	},
	{
		label: "amadeus711",
		value: "amadeus711"
	}
]
function renderLabel(option: MentionOption): VNodeChild {
	return h("div", { style: "display: flex; align-items: center; gap:8px" }, [
		h(NAvatar, {
			size: 24,
			round: true,
			src: "https://picsum.photos/seed/FsNXmz/460/460"
		}),
		option.value
	])
}
</script>
