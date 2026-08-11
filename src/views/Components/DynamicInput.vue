<template>
	<div class="page">
		<div class="page-header">
			<div class="title">Dynamic Input</div>
			<div class="links">
				<a
					href="https://www.naiveui.com/en-US/light/components/dynamic-input"
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
			<CardCodeExample title="Use input preset">
				<template #description>
					By default, the preset element of
					<n-text code>n-dynamic-input</n-text>
					is
					<n-text code>input</n-text>
					.
				</template>
				<div class="mb-3">
					<label>preset:</label>
					<n-select v-model:value="preset" :options="presetOptions" />
				</div>
				<n-dynamic-input
					v-model:value="value"
					placeholder="Please type here"
					:min="3"
					:max="10"
					:preset
				/>
				<pre style="direction: ltr">{{ JSON.stringify(value, null, 2) }}</pre>
				<template #code="{ html, js }">
					{{ html(`
					<div class="mb-3">
						<label>preset:</label>
						<n-select v-model:value="preset" :options="presetOptions" />
					</div>
					<n-dynamic-input
						v-model:value="value"
						placeholder="Please type here"
						:min="3"
						:max="10"
						:preset="preset"
					/>
					<pre>\{\{ JSON.stringify(value, null, 2) \}\}</pre>
					`) }}

					{{
						js(`
						const value = ref(["", "", ""])
						const preset = ref<"input" | "pair" | undefined>("input")
						const presetOptions = [
							{
								label: "input",
								value: "input"
							},
							{
								label: "pair",
								value: "pair"
							}
						]

						watch(preset, () => {
							value.value = []
						})
						`)
					}}
				</template>
			</CardCodeExample>

			<CardCodeExample title="Customizing input content">
				<n-dynamic-input v-model:value="customValue" :on-create show-sort-button>
					<template #create-button-default>Add whatever you want</template>
					<template #default="{ value: valueObj }">
						<div style="display: flex; align-items: center; gap: 12px; width: 100%">
							<n-checkbox v-model:checked="valueObj.isCheck" />
							<n-input-number v-model:value="valueObj.num" style="width: 160px" />
							<n-input v-model:value="valueObj.string" type="text" />
						</div>
					</template>
				</n-dynamic-input>
				<pre style="direction: ltr">{{ JSON.stringify(customValue, null, 2) }}</pre>

				<template #code="{ html, js }">
					{{ html(`
					<n-dynamic-input v-model:value="customValue" :on-create="onCreate" show-sort-button>
						<template #create-button-default>Add whatever you want</template>
						<template #default="{ value }">
							<div style="display: flex; align-items: center; gap: 12px; width: 100%">
								<n-checkbox v-model:checked="value.isCheck" />
								<n-input-number v-model:value="value.num" style="width: 160px" />
								<n-input v-model:value="value.string" type="text" />
							</div>
						</template>
					</n-dynamic-input>
					<pre>\{\{ JSON.stringify(customValue, null, 2) \}\}</pre>
					`) }}

					{{
						js(`
						const customValue = ref([
							{
								isCheck: true,
								num: 1,
								string: "A String"
							}
						])
						function onCreate() {
							return {
								isCheck: false,
								num: 1,
								string: "A String"
							}
						}
						`)
					}}
				</template>
			</CardCodeExample>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { NCheckbox, NDynamicInput, NInput, NInputNumber, NSelect, NText } from "naive-ui"
import { ref, watch } from "vue"
import Icon from "@/components/common/Icon.vue"

const ExternalIcon = "tabler:external-link"
const value = ref(["", "", ""])
const preset = ref<"input" | "pair" | undefined>("input")
const presetOptions = [
	{
		label: "input",
		value: "input"
	},
	{
		label: "pair",
		value: "pair"
	}
]

const customValue = ref([
	{
		isCheck: true,
		num: 1,
		string: "A String"
	}
])
function onCreate() {
	return {
		isCheck: false,
		num: 1,
		string: "A String"
	}
}

watch(preset, () => {
	value.value = []
})
</script>
