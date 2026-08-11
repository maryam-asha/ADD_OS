<template>
	<n-card :title="headerTitle" content-class="!pr-2 !pl-3">
		<template #cover>
			<img
				v-if="!hideImage"
				alt="cover"
				src="https://picsum.photos/seed/IqZMU/900/130"
				width="900"
				height="130"
			/>
		</template>
		<template #default>
			<div ref="wrapperEl" class="list-wrap" :class="{ 'whole-height': lazy }">
				<n-spin :show="!loaded && lazy">
					<div class="scrollbar-wrapper" :style="lazy ? { height: `${wrapperHeight}px` } : {}">
						<n-scrollbar v-if="loaded || !lazy" class="max-h-full pr-4">
							<n-timeline>
								<n-timeline-item :content="text1" line-type="dashed">
									<template #icon>
										<Icon :size="8" :name="DotIcon" />
									</template>
								</n-timeline-item>
								<n-timeline-item type="success" :content="text2" :time="date1">
									<template #header>
										<n-tag type="success" size="small">Success</n-tag>
									</template>
									<template #icon>
										<Icon :size="8" :name="DotIcon" />
									</template>
								</n-timeline-item>
								<n-timeline-item type="error" :content="text3" :time="date2">
									<template #icon>
										<Icon :size="8" :name="DotIcon" />
									</template>
								</n-timeline-item>
								<n-timeline-item type="warning" :content="text4" :time="date3">
									<template #header>
										<n-tag type="warning" size="small">Warning</n-tag>
									</template>
									<template #icon>
										<Icon :size="8" :name="DotIcon" />
									</template>
								</n-timeline-item>
								<n-timeline-item
									v-for="item of longItems"
									:key="item.date"
									:type="item.type"
									:content="item.text"
									:time="item.date"
								>
									<template #header>
										<n-tag v-if="item.title" :type="item.type" size="small">{{ item.title }}</n-tag>
									</template>
									<template #icon>
										<Icon :size="8" :name="DotIcon" />
									</template>
								</n-timeline-item>
								<n-timeline-item
									type="info"
									title="Info"
									:content="text5"
									:time="date4"
									line-type="dashed"
								>
									<template #header>
										<n-tag type="info" size="small">Info</n-tag>
									</template>
									<template #icon>
										<Icon :size="8" :name="DotIcon" />
									</template>
								</n-timeline-item>
								<n-timeline-item :content="text6">
									<template #icon>
										<Icon :size="8" :name="DotIcon" />
									</template>
								</n-timeline-item>
							</n-timeline>
						</n-scrollbar>
					</div>
				</n-spin>
			</div>
		</template>
	</n-card>
</template>

<script setup lang="ts">
import { faker } from "@faker-js/faker"
import { useResizeObserver } from "@vueuse/core"
import _capitalize from "lodash/capitalize"
import { NCard, NScrollbar, NSpin, NTag, NTimeline, NTimelineItem } from "naive-ui"
import { ref } from "vue"
import Icon from "@/components/common/Icon.vue"
import dayjs from "@/utils/dayjs"

const { long, lazy, hideImage, title } = defineProps<{
	long?: boolean
	lazy?: boolean
	hideImage?: boolean
	title?: string
}>()

const DotIcon = "carbon:circle-solid"

type TimelineType = "default" | "success" | "error" | "info" | "warning" | undefined

const types: TimelineType[] = ["default", "success", "error", "info", "warning"]

const loaded = ref(false)
const wrapperEl = ref<HTMLElement>()
const wrapperHeight = ref<number | null>(null)
const lazyTimer = ref<number | NodeJS.Timeout>(0)

const headerTitle = title || faker.lorem.sentence({ min: 2, max: 5 }).replace(/\./, "")
const text1 = faker.lorem.sentence({ min: 2, max: 5 }).replace(/\./, "")
const text2 = faker.lorem.sentence({ min: 2, max: 5 }).replace(/\./, "")
const text3 = faker.lorem.sentence({ min: 2, max: 5 }).replace(/\./, "")
const text4 = faker.lorem.sentence({ min: 2, max: 5 }).replace(/\./, "")
const text5 = faker.lorem.sentence({ min: 2, max: 5 }).replace(/\./, "")
const text6 = faker.lorem.sentence({ min: 2, max: 5 }).replace(/\./, "")

const date1 = dayjs().format("DD-MM-YYYY HH:mm")
const date2 = dayjs(date1, "DD-MM-YYYY HH:mm").add(18, "hour").format("DD-MM-YYYY HH:mm")
const date3 = dayjs(date2, "DD-MM-YYYY HH:mm").add(8, "hour").format("DD-MM-YYYY HH:mm")
const date4 = dayjs(date3, "DD-MM-YYYY HH:mm").add(18, "hour").format("DD-MM-YYYY HH:mm")

const longItems = ref<{ text: string; date: string; type: TimelineType; title: string }[]>([])

if (long) {
	let lastDate = date3
	for (let i = 0; i < 10; i++) {
		lastDate = dayjs(lastDate, "DD-MM-YYYY HH:mm").add(3, "m").format("DD-MM-YYYY HH:mm")
		const type: TimelineType = types[faker.number.int({ min: 0, max: 4 })]
		longItems.value.push({
			type,
			title: faker.datatype.boolean() ? "" : _capitalize(type).replace(/\./, ""),
			text: faker.lorem.sentence({ min: 2, max: 5 }).replace(/\./, ""),
			date: lastDate
		})
	}
}

function lazyRefresh() {
	wrapperHeight.value = null
	loaded.value = false

	if (lazyTimer.value) {
		clearTimeout(lazyTimer.value)
	}

	lazyTimer.value = setTimeout(() => {
		const height = wrapperEl?.value?.offsetHeight
		if (height) {
			wrapperHeight.value = height
			loaded.value = true
		}
	}, 1000)
}

if (lazy) {
	lazyRefresh()

	useResizeObserver(wrapperEl, () => {
		lazyRefresh()
	})
}
</script>

<style scoped lang="scss">
.n-card {
	:deep() {
		.n-card__content {
			display: flex;
			flex-direction: column;
		}
	}
	.list-wrap {
		overflow: hidden;
		height: 100%;
		flex-grow: 1;
		max-height: 800px;

		&.whole-height {
			max-height: initial;
		}

		.scrollbar-wrapper {
			min-height: 100px;
		}
	}
}
</style>
