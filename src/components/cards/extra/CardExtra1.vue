<template>
	<n-card hoverable content-class="p-0!">
		<n-tabs type="line" :tabs-padding="24" pane-class="!p-5" animated>
			<n-tab-pane name="Tab One"><p v-html="text1" /></n-tab-pane>
			<n-tab-pane name="Tab Two"><p v-html="text2" /></n-tab-pane>
			<n-tab-pane name="Tab Three"><p v-html="text3" /></n-tab-pane>
		</n-tabs>
	</n-card>
</template>

<script setup lang="ts">
import { faker } from "@faker-js/faker"
import { NCard, NTabPane, NTabs } from "naive-ui"

const text1 = faker.lorem.sentences(5, "<br/><br/>")
const text2 = faker.lorem.sentences(5, "<br/><br/>")
const text3 = faker.lorem.sentences(5, "<br/><br/>")
</script>
