<template>
	<div class="page">
		<div class="toolbar mb-6 flex items-center gap-4">
			<n-button type="primary" size="large" @click="newNote()">
				<template #icon>
					<Icon :name="AddIcon" />
				</template>
				Add notes
			</n-button>

			<n-select v-model:value="selectedLabels" multiple :options size="large" placeholder="Labels filter..." />
		</div>
		<div class="list">
			<n-image-group>
				<div class="masonry">
					<div v-for="note of filteredNotes" :key="note.id" class="note">
						<div v-if="note.image" class="n-image">
							<n-image
								:src="note.image"
								width="640"
								height="400"
								:img-props="{ alt: `${note.title}-image` }"
								lazy
							/>
						</div>
						<div class="n-content" @click="selectNote(note)">
							<div v-if="note.title" class="n-title">{{ note.title }}</div>
							<div v-if="note.body" class="n-body" v-html="note.body" />
						</div>
						<div class="n-footer flex items-end justify-between gap-3" @click="selectNote(note)">
							<div class="n-date">{{ note.dateText }}</div>
							<div class="n-labels flex flex-wrap justify-end gap-2">
								<span
									v-for="label of note.labels"
									:key="label.id"
									class="n-label custom-label"
									:style="`--label-color:${labelsColors[label.id]}`"
								>
									{{ label.title }}
								</span>
							</div>
						</div>
					</div>
				</div>
			</n-image-group>
		</div>

		<n-modal v-model:show="showModal">
			<n-card class="w-[90vw]! max-w-lg!">
				<div v-if="selectedNote" class="form flex flex-col">
					<div v-if="selectedNote.id && selectedNote.image" class="mb-4">
						<img :alt="`${selectedNote.title}-image`" :src="selectedNote.image" class="rounded-lg" />
					</div>
					<n-upload v-else class="mb-2" :max="1">
						<n-upload-dragger>
							<div class="mb-3">
								<Icon :name="ImageIcon" :size="48" :depth="3" />
							</div>
							<n-text>Click or drag a file to this area to upload</n-text>
							<n-p depth="3">
								Strictly prohibit from uploading sensitive information. For example, your bank card PIN
								or your credit card expiry date.
							</n-p>
						</n-upload-dragger>
					</n-upload>
					<n-input v-model:value="selectedNote.title" placeholder="Title" class="mb-4" />
					<n-input
						v-model:value="selectedNote.body"
						placeholder="Body"
						type="textarea"
						class="mb-4"
						:autosize="{
							minRows: 2,
							maxRows: 7
						}"
					/>
					<div class="item-center flex justify-between gap-4">
						<div class="item-center flex grow gap-4">
							<div v-if="selectedNote.id" class="flex flex-wrap items-center gap-2">
								<span
									v-for="label of selectedNote.labels"
									:key="label.id"
									class="custom-label"
									:style="`--label-color:${labelsColors[label.id]}`"
								>
									{{ label.title }}
								</span>
							</div>
							<div v-else class="w-full">
								<n-select multiple class="w-full" :options placeholder="Labels filter..." />
							</div>
						</div>
						<div class="item-center flex gap-4">
							<n-button v-if="selectedNote.id">Delete</n-button>
							<n-button
								strong
								secondary
								type="primary"
								:disabled="!noteValid"
								@click="save(selectedNote)"
							>
								Save
							</n-button>
						</div>
					</div>
				</div>
			</n-card>
		</n-modal>
	</div>
</template>

<script lang="ts" setup>
import type { Ref } from "vue"
import type { Note } from "@/mock/notes"
import _clone from "lodash/cloneDeep"
import {
	NButton,
	NCard,
	NImage,
	NImageGroup,
	NInput,
	NModal,
	NP,
	NSelect,
	NText,
	NUpload,
	NUploadDragger
} from "naive-ui"
import { computed, ref } from "vue"
import Icon from "@/components/common/Icon.vue"
import { getNotes, labels } from "@/mock/notes"
import { useThemeStore } from "@/stores/theme"
import dayjs from "@/utils/dayjs"

const BR_TAG_REGEX = /<br\/>/gi
const NEWLINE_REGEX = /\n/g

const AddIcon = "fluent:notebook-add-24-regular"
const ImageIcon = "carbon:image"

const notes: Ref<Note[]> = ref(getNotes())
const options = labels.map(l => ({
	label: l.title,
	value: l.id
}))

const themeStore = useThemeStore()

const style = computed(() => themeStore.style)

const labelsColors = {
	personal: style.value["extra1-color"],
	office: style.value["extra2-color"],
	important: style.value["extra3-color"],
	shop: style.value["extra4-color"]
} as { [key: string]: string }

const selectedLabels = ref([])
const selectedNote = ref<Note | null>(null)
const filteredNotes = computed(() =>
	notes.value.filter(n => {
		if (!selectedLabels.value.length) {
			return true
		}

		return selectedLabels.value.every(label => n.labels.map(l => l.id).includes(label))
	})
)
const noteValid = computed(() => !!selectedNote.value?.title || !!selectedNote.value?.body)

const showModal = computed({ get: () => selectedNote.value !== null, set: () => (selectedNote.value = null) })

function newNote() {
	selectedNote.value = {
		id: "",
		date: new Date(),
		dateText: dayjs().format("HH:mm"),
		title: "",
		body: "",
		image: "",
		labels: []
	}
}
function selectNote(note: Note) {
	selectedNote.value = { ..._clone(note), body: note.body.replace(BR_TAG_REGEX, "\n") }
}
function save(note: Note) {
	const index = notes.value.findIndex(n => n.id === note.id)
	note.body = note.body.replace(NEWLINE_REGEX, "<br/>")

	if (index !== -1) {
		notes.value[index] = note
	} else {
		note.id = `${Date.now()}`
		notes.value = [note, ...notes.value]
	}

	selectedNote.value = null
}
</script>

<style lang="scss" scoped>
.page {
	.toolbar {
		max-width: 600px;
	}
	.list {
		container-type: inline-size;

		.masonry {
			--notes-gap: 1.25em;
			column-count: 4;
			column-gap: var(--notes-gap);

			@container (min-width: 1600px) {
				column-count: 5;
			}

			@container (max-width: 1200px) {
				column-count: 3;
			}

			@container (max-width: 900px) {
				column-count: 2;
			}

			@container (max-width: 600px) {
				column-count: 1;
			}

			.note {
				margin-bottom: var(--notes-gap);
				transition: all 0.25s;
				box-sizing: border-box;
				width: 100%;
				background-color: var(--bg-default-color);
				border-radius: var(--border-radius);
				border: 1px solid var(--border-color);
				overflow: hidden;
				cursor: pointer;
				break-inside: avoid;

				.n-content {
					padding: 20px;

					.n-title {
						font-size: 18px;
						line-height: 1.3;
						font-weight: bold;
						margin-bottom: 20px;
						opacity: 0;
						font-family: var(--font-family-display);
						animation: note-el-fade 0.6s forwards;
					}

					.n-body {
						font-size: 14px;
						opacity: 0;
						color: var(--fg-secondary-color);
						animation: note-el-fade 0.6s 0.2s forwards;
					}
				}

				.n-footer {
					padding: 16px 20px;
					opacity: 0;
					font-size: 12px;
					color: var(--primary-color);
					animation: note-el-fade 0.6s 0.4s forwards;
				}

				@keyframes note-el-fade {
					from {
						opacity: 0;
					}
					to {
						opacity: 1;
					}
				}

				&:hover {
					transform: translateY(-3px);
				}
			}
		}
	}

	.custom-label::before {
		z-index: 0;
	}
}
</style>
