<template>
	<CardCodeExample title="Empty">
		<n-data-table :columns :data />
	</CardCodeExample>
</template>

<script lang="tsx" setup>
import type { DataTableColumns } from "naive-ui"
import { NDataTable } from "naive-ui"
import { ref } from "vue"

interface Song {
	no: number
	title: string
	length: string
}

function createColumns(): DataTableColumns<Song> {
	return [
		{
			title: "No",
			key: "no"
		},
		{
			title: "Title",
			key: "title"
		},
		{
			title: "Length",
			key: "length"
		},
		{
			title: "Action",
			key: "actions"
		}
	]
}

const data: Song[] = []

const columns = ref(createColumns())
</script>
