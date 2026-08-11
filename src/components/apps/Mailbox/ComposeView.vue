<template>
	<div class="compose-view flex grow flex-col">
		<n-form label-placement="left" size="small" label-width="auto">
			<n-form-item label="To">
				<n-input-group>
					<n-auto-complete
						v-model:value="emailForm.email"
						:input-props="{
							autocomplete: 'disabled'
						}"
						:options="autoCompleteOptions"
						placeholder="Email"
					/>
					<n-button type="tertiary">CC</n-button>
					<n-button type="tertiary">BCC</n-button>
				</n-input-group>
			</n-form-item>
			<n-form-item label="Subject">
				<n-input placeholder="Message subject..." />
			</n-form-item>
		</n-form>
		<div class="compose-view-attachments flex justify-end">
			<n-button ghost>
				<template #icon>
					<Icon :name="DocumentAddIcon" />
				</template>

				Add attachment
			</n-button>
		</div>
		<div class="compose-view-body scrollbar-styled flex grow flex-col">
			<QuillEditor v-if="mounted" theme="snow" toolbar="minimal" @blur="resetScroll()" />
		</div>
		<div class="compose-view-footer flex justify-end">
			<n-button-group>
				<n-button type="primary" ghost>
					<template #icon>
						<Icon :name="SentIcon" />
					</template>
					Send
				</n-button>
				<n-dropdown
					trigger="click"
					:options="[
						{
							label: 'Save as draft',
							key: 'Save as draft'
						},
						{
							label: 'Postponed sending',
							key: 'Postponed sending'
						}
					]"
				>
					<n-button type="primary" ghost>
						<template #icon>
							<Icon :name="ChevronDownIcon" />
						</template>
					</n-button>
				</n-dropdown>
			</n-button-group>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Component } from "vue"
import type { Email } from "@/mock/mailbox"
import { NAutoComplete, NButton, NButtonGroup, NDropdown, NForm, NFormItem, NInput, NInputGroup } from "naive-ui"
import { computed, defineAsyncComponent, onMounted, ref, toRefs } from "vue"
import Icon from "@/components/common/Icon.vue"
import "@/assets/scss/overrides/quill-override.scss"

const props = defineProps<{
	email: Partial<Email>
}>()

const QuillEditor = defineAsyncComponent<Component>(() => {
	return (async () => {
		const { QuillEditor } = await import("@vueup/vue-quill")
		return QuillEditor
	})()
})

const { email: emailForm } = toRefs(props)

const SentIcon = "carbon:send"
const ChevronDownIcon = "carbon:chevron-down"
const DocumentAddIcon = "carbon:document-add"
const mounted = ref(false)
const autoCompleteOptions = computed(() => {
	return ["@gmail.com", "@live.com", "@qq.com", "@me.com"].map(suffix => {
		const prefix = emailForm.value?.email?.split("@")[0]
		return {
			label: prefix + suffix,
			value: prefix + suffix
		}
	})
})

function resetScroll() {
	window.scrollTo(0, 0)
}

onMounted(() => {
	mounted.value = true
})
</script>

<style lang="scss" scoped>
.compose-view {
	.n-form {
		:deep(.n-form-item-feedback-wrapper) {
			min-height: 10px;
		}
	}

	.compose-view-body {
		overflow: hidden;
		height: 0;
		padding: 20px 0px;
	}
}
</style>
