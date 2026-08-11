<template>
	<CardCodeExample title="Basic">
		<n-data-table :columns :data :pagination :bordered="false" />
		<template #code="{ html, js }">
			{{ html(`
			<n-data-table :columns :data :pagination :bordered="false" />
			`) }}

			{{
				js(`
				type Song = {
					no: number
					title: string
					length: string
				}

				const createColumns = ({ play }: { play: (row: Song) => void }): DataTableColumns\<\Song\>\ => {
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
							key: "actions",
							render(row) {
								return h(
									NButton,
									{
										strong: true,
										tertiary: true,
										size: "small",
										onClick: () => play(row)
									},
									{ default: () => "Play" }
								)
							}
						}
					]
				}

				const data: Song[] = [
					{ no: 3, title: "Wonderwall", length: "4:18" },
					{ no: 4, title: "Don't Look Back in Anger", length: "4:48" },
					{ no: 12, title: "Champagne Supernova", length: "7:27" }
				]

				export default defineComponent({
					setup() {
						const message = useMessage()
						return {
							data,
							columns: createColumns({
								play(row: Song) {
									message.info(\`Play \$\{row.title\}\`)
								}
							}),
							pagination: false as const
						}
					},
					components: { NDataTable }
				})
				`)
			}}
		</template>
	</CardCodeExample>
</template>

<script lang="ts">
import type { DataTableColumns } from "naive-ui"
import { NButton, NDataTable, useMessage } from "naive-ui"
import { defineComponent, h } from "vue"

interface Song {
	no: number
	title: string
	length: string
}

function createColumns({ play }: { play: (row: Song) => void }): DataTableColumns<Song> {
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
			key: "actions",
			render(row) {
				return h(
					NButton,
					{
						strong: true,
						tertiary: true,
						size: "small",
						onClick: () => play(row)
					},
					{ default: () => "Play" }
				)
			}
		}
	]
}

const data: Song[] = [
	{ no: 3, title: "Wonderwall", length: "4:18" },
	{ no: 4, title: "Don't Look Back in Anger", length: "4:48" },
	{ no: 12, title: "Champagne Supernova", length: "7:27" }
]

export default defineComponent({
	components: { NDataTable },
	setup() {
		const message = useMessage()
		return {
			data,
			columns: createColumns({
				play(row: Song) {
					message.info(`Play ${row.title}`)
				}
			}),
			pagination: false as const
		}
	}
})
</script>
