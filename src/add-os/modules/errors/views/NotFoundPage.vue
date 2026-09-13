<template>
	<main class="bg-surface flex min-h-screen items-center justify-center px-6 py-12">
		<section class="flex w-full max-w-2xl flex-col items-center text-center">
			<img :src="illustration" :alt="t('errors.notFound.illustrationAlt')" class="mb-8 h-56 w-auto object-contain sm:h-72" />
			<p class="text-success text-sm font-semibold uppercase tracking-wide">404</p>
			<h1 class="text-text-primary mt-3 text-3xl font-bold sm:text-4xl">{{ t("errors.notFound.title") }}</h1>
			<p class="text-text-secondary mt-4 max-w-lg text-base leading-relaxed">{{ t("errors.notFound.description") }}</p>
			<n-button type="primary" size="large" class="mt-8" @click="goHome">
				{{ t("errors.backHome") }}
			</n-button>
		</section>
	</main>
</template>

<script lang="ts" setup>
import { NButton } from "naive-ui"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import illustration from "@/assets/images/errors/no-data.png"

const { t } = useI18n()
const router = useRouter()

function goHome() {
	router.push({ path: "/" })
}
</script>
