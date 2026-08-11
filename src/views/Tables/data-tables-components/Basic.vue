<template>
	<CardCodeExample ref="card" title="Basic">
		<n-data-table :columns :data :pagination />
	</CardCodeExample>
</template>

<script lang="tsx" setup>
import type { DataTableColumns } from "naive-ui"
import { faker } from "@faker-js/faker"
import { useResizeObserver } from "@vueuse/core"
import { NButton, NDataTable, useMessage } from "naive-ui"
import { h, reactive, ref } from "vue"

interface Song {
	no: number
	title: string
	length: string
}

function createColumns({ play }: { play: (row: Song) => void }): DataTableColumns<Song> {
	return [
		{
			title: "No",
			key: "no",
			width: 50,
			fixed: "left"
		},
		{
			title: "Title",
			key: "title",
			minWidth: 250
		},
		{
			title: "Length",
			key: "length",
			align: "right",
			width: 100
		},
		{
			title: "Action",
			key: "actions",
			align: "right",
			width: 100,
			render: row => h(NButton, { onClick: () => play(row), strong: true, tertiary: true, size: "small" }, "Play")
		}
	]
}

const data: Song[] = Array.from({ length: 50 }, (_, i) => ({
	no: i + 1,
	title: faker.music.songName(),
	length: `${faker.number.int({ min: 1, max: 8 })}:${faker.number.int({ min: 10, max: 59 })}`
}))

const message = useMessage()

const columns = ref(
	createColumns({
		play(row: Song) {
			message.info(`Play ${row.title}`)
		}
	})
)

const pagination = reactive({
	page: 1,
	pageSize: 5,
	showSizePicker: true,
	simple: false,
	pageSizes: [3, 5, 7],
	onChange: (page: number) => {
		pagination.page = page
	},
	onUpdatePageSize: (pageSize: number) => {
		pagination.pageSize = pageSize
		pagination.page = 1
	}
})

const card = ref(null)

useResizeObserver(card, entries => {
	const entry = entries[0]

	if (entry) {
		const { width } = entry.contentRect

		pagination.simple = width < 600
	}
})
</script>
