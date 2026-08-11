<template>
	<div class="page">
		<div class="page-header">
			<div class="title">Refresh tool</div>
		</div>

		<n-card>
			This tool allows you to refresh only the view, not the entire app. It can be useful in various situations.
			Here's an example:

			<div class="demo mt-4">
				<div class="mb-5 text-lg">
					<strong class="mr-2">Timestamp page load:</strong>
					<n-time :time format="HH:mm:ss" />
				</div>
				<n-button type="primary" size="large" @click="reload">Refresh view tool</n-button>
			</div>
		</n-card>
	</div>
</template>

<script lang="ts" setup>
import { NButton, NCard, NTime } from "naive-ui"
import { onMounted, ref } from "vue"
import { useMainStore } from "@/stores/main"

const mainStore = useMainStore()
const time = ref(Date.now())

function reload(e?: MouseEvent) {
	mainStore.softReload()
	return e
}

onMounted(() => {
	// eslint-disable-next-line no-console
	console.log("Refresh view")
})
</script>
