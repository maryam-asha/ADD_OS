<template>
	<n-card hoverable content-class="!p-4">
		<Calendar expanded borderless transparent color="custom-color" :is-dark="isThemeDark" :attributes />
	</n-card>
</template>

<script setup lang="ts">
import { faker } from "@faker-js/faker"
import { NCard } from "naive-ui"
import { Calendar } from "v-calendar"
import { computed } from "vue"
import { useThemeStore } from "@/stores/theme"
import dayjs from "@/utils/dayjs"
import "v-calendar/style.css"
import "@/assets/scss/overrides/vcalendar-override.scss"

const themeStore = useThemeStore()

const isThemeDark = computed(() => themeStore.isThemeDark)

const attributes = [
	{
		dot: "blue",
		dates: [
			dayjs().subtract(1, "d").toDate(),
			dayjs().subtract(5, "d").toDate(),
			dayjs().add(5, "d").toDate(),
			dayjs().add(10, "d").toDate()
		],
		popover: {
			label: faker.lorem.sentence({ min: 1, max: 3 })
		}
	},
	{
		dot: "red",
		dates: [
			dayjs().subtract(3, "d").toDate(),
			dayjs().subtract(5, "d").toDate(),
			dayjs().add(2, "d").toDate(),
			dayjs().add(12, "d").toDate()
		],
		popover: {
			label: faker.lorem.sentence({ min: 1, max: 3 })
		}
	},
	{
		dot: "green",
		dates: [
			dayjs().subtract(1, "d").toDate(),
			dayjs().subtract(8, "d").toDate(),
			dayjs().add(2, "d").toDate(),
			dayjs().add(10, "d").toDate()
		],
		popover: {
			label: faker.lorem.sentence({ min: 1, max: 3 })
		}
	}
]
</script>
