<template>
	<n-card hoverable>
		<div class="post-box">
			<div class="user mb-4 flex items-start gap-3">
				<div class="avatar">
					<n-avatar round :src="avatar" :size="40" lazy :img-props="{ alt: 'avatar' }" />
				</div>
				<div class="info">
					<div class="name">
						{{ name }}
					</div>
					<div class="date">
						<n-time :time="date" format="d MMM @ HH:mm" />
					</div>
				</div>
			</div>

			<div class="content mb-4 flex flex-col gap-4">
				<div v-if="image" class="image">
					<n-image :src="image" width="500" height="300" lazy :img-props="{ alt: 'image' }" />
				</div>
				<p v-if="text" class="text">
					{{ text }}
				</p>
			</div>

			<div class="reactions flex items-center gap-7">
				<n-button
					text
					class="item comments"
					:class="{ active: commentActive }"
					@click="commentActive = !commentActive"
				>
					<template #icon>
						<Icon :name="commentActive ? CommentsActiveIcon : CommentsIcon" />
					</template>
					{{ commentsCount }}
				</n-button>
				<n-button text class="item likes" :class="{ active: likeActive }" @click="likeActive = !likeActive">
					<template #icon>
						<Icon :name="likeActive ? HeartActiveIcon : HeartIcon" />
					</template>
					{{ likesCount }}
				</n-button>
			</div>
		</div>

		<div v-if="commentActive" class="comments-box">
			<div v-for="comment of comments" :key="comment.id" class="comment flex">
				<div class="avatar">
					<n-avatar round :src="comment.avatar" :size="40" lazy :img-props="{ alt: 'avatar' }" />
				</div>
				<div class="content">
					<div class="info flex flex-wrap">
						<div class="name">{{ comment.name }}</div>
						<div class="date">
							<n-time :time="comment.date" format="d MMM @ HH:mm" />
						</div>
					</div>
					<p class="text" v-html="comment.text" />
				</div>
			</div>
		</div>

		<div class="reply-box flex">
			<div class="text-input grow">
				<n-input
					v-model:value="reply"
					placeholder="Reply..."
					type="textarea"
					size="small"
					:autosize="{
						minRows: 1,
						maxRows: 5
					}"
					@blur="resetWindowScroll()"
				/>
			</div>
			<div class="actions-group flex items-center">
				<n-button text type="primary" :disabled="!reply" @click="send()">
					<Icon :size="20" :name="SendIcon" />
				</n-button>
			</div>
		</div>
	</n-card>
</template>

<script setup lang="ts">
import { faker } from "@faker-js/faker"
import { NAvatar, NButton, NCard, NImage, NInput, NTime } from "naive-ui"
import { ref } from "vue"
import Icon from "@/components/common/Icon.vue"
import dayjs from "@/utils/dayjs"

export interface CardSocial {
	showImage?: boolean
	hideText?: boolean
	showComments?: boolean
	like?: boolean
}

const { showImage, hideText, showComments, like } = defineProps<CardSocial>()

const NEWLINE_REGEX = /\n/g
const SendIcon = "carbon:send"
const HeartIcon = "ion:heart-outline"
const HeartActiveIcon = "ion:heart"
const CommentsIcon = "ion:chatbubbles-outline"
const CommentsActiveIcon = "ion:chatbubbles"

const commentActive = ref(showComments ?? false)
const likeActive = ref(like ?? false)

const avatar = faker.image.avatarGitHub()
const name = faker.person.fullName()
const date = faker.date.between({ from: dayjs().subtract(10, "d").toDate(), to: dayjs().subtract(5, "d").toDate() })
const image = showImage ? faker.image.urlPicsumPhotos({ width: 500, height: 300 }) : null
const text = hideText ? "" : faker.lorem.paragraph()

const reply = ref("")

const likesCount = faker.number.int({ min: 10, max: 50 })
const commentsCount = faker.number.int({ min: 1, max: 3 })

let lastDate = date
const comments = ref(
	Array.from({ length: commentsCount }, () => {
		const newDate = faker.date.between({ from: dayjs(lastDate).toDate(), to: dayjs().toDate() })
		lastDate = newDate
		return {
			id: faker.string.nanoid(),
			avatar: faker.image.avatarGitHub(),
			name: faker.person.fullName(),
			date: newDate,
			text: faker.lorem.paragraph()
		}
	})
)

function resetWindowScroll() {
	window.scrollTo(0, 0)
}

function send() {
	comments.value.push({
		id: faker.string.nanoid(),
		avatar: "/images/avatar-64.jpg",
		name: "Margie Dibbert",
		date: dayjs().toDate(),
		text: reply.value.replace(NEWLINE_REGEX, "<br/>")
	})
	reply.value = ""
}
</script>

<style lang="scss" scoped>
.n-card {
	.post-box {
		.user {
			.info {
				.name {
					font-size: 16px;
					font-weight: 700;
				}
				.date {
					opacity: 0.5;
					font-size: 14px;
				}
			}
		}

		.content {
			.image {
				width: 100%;

				.n-image {
					width: 100%;
				}
				:deep() {
					img {
						border-radius: var(--border-radius-small);
						width: 100%;
					}
				}
			}
		}

		.reactions {
			.item {
				display: flex;
				align-items: center;

				&.active {
					&.comments {
						.n-icon {
							color: var(--primary-color);
						}
					}
					&.likes {
						.n-icon {
							color: var(--extra4-color);
						}
					}
				}
			}
		}
	}

	.comments-box {
		.comment {
			margin-top: 20px;
			gap: 12px;

			.content {
				.info {
					gap: 16px;
					margin-bottom: 6px;

					.name {
						font-size: 16px;
						font-weight: 700;
					}
					.date {
						opacity: 0.5;
						font-size: 14px;
					}
				}
			}
		}
	}

	.reply-box {
		border-block-start: 1px solid var(--border-color);
		padding-top: var(--n-padding-bottom);
		gap: 20px;
		margin-top: var(--n-padding-bottom);

		.text-input {
			.n-input--textarea {
				background-color: transparent;

				:deep() {
					.n-input__border,
					.n-input__state-border {
						display: none;
					}
				}
			}
		}

		.actions-group {
			gap: 20px;
		}
	}
}
</style>
