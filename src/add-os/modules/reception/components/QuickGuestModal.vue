<!-- src/add-os/modules/reception/components/QuickGuestModal.vue -->
<template>
	<FormModal :show :title="t('reception.quickGuest.title', 'تسجيل ضيف جديد')" size="sm" @update:show="emit('update:show', $event)">
		<n-form ref="formRef" :model="form" :rules label-placement="top" class="flex flex-col gap-3">
			<n-form-item :label="t('users.columns.name', 'الاسم الكامل')" path="name">
				<n-input
					v-model:value="form.name"
					:placeholder="t('reception.quickGuest.namePlaceholder', 'مثال: محمد الأحمد')"
				>
					<template #prefix>
						<Icon name="carbon:user" :size="16" class="text-[var(--add-text-muted)]" />
					</template>
				</n-input>
			</n-form-item>

			<n-form-item :label="t('users.columns.phone', 'رقم الهاتف')" path="phone">
				<n-input
					v-model:value="form.phone"
					dir="ltr"
					:placeholder="t('reception.quickGuest.phonePlaceholder', '+963 9XX XXX XXX')"
				>
					<template #prefix>
						<Icon name="carbon:phone" :size="16" class="text-[var(--add-text-muted)]" />
					</template>
				</n-input>
			</n-form-item>

			<n-form-item :label="t('users.columns.email', 'البريد الإلكتروني')" path="email">
				<n-input
					v-model:value="form.email"
					dir="ltr"
					:placeholder="t('reception.quickGuest.emailPlaceholder', 'guest@example.com')"
				>
					<template #prefix>
						<Icon name="carbon:email" :size="16" class="text-[var(--add-text-muted)]" />
					</template>
				</n-input>
			</n-form-item>

			<n-form-item :label="t('users.form.password', 'كلمة المرور المؤقتة')" path="password">
				<n-input
					v-model:value="form.password"
					type="password"
					show-password-on="click"
					dir="ltr"
					:placeholder="t('reception.quickGuest.passwordPlaceholder', 'كلمة مرور لا تقل عن 8 خانات')"
				/>
			</n-form-item>
		</n-form>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button :disabled="isSubmitting" @click="emit('update:show', false)">
					{{ t('resourceCrud.form.cancel', 'إلغاء') }}
				</n-button>
				<n-button type="primary" :loading="isSubmitting" @click="submit">
					<template #icon><Icon name="carbon:user-follow" :size="16" /></template>
					{{ t('reception.quickGuest.submit', 'تسجيل الضيف') }}
				</n-button>
			</div>
		</template>
	</FormModal>
</template>

<script setup lang="ts">
import type { FormInst, FormRules } from "naive-ui"
import type { User } from "@/add-os/modules/system/types/user"
import { NButton, NForm, NFormItem, NInput, useMessage } from "naive-ui"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import FormModal from "@/add-os/components/page/FormModal.vue"
import { ApiError } from "@/add-os/services/api"
import { createUser } from "@/add-os/services/users"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	show: boolean
}>()

const emit = defineEmits<{
	"update:show": [value: boolean]
	"created": [user: User]
}>()

const { t } = useI18n()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const isSubmitting = ref(false)

const form = ref({
	name: "",
	phone: "",
	email: "",
	password: `ADD@${Math.floor(1000 + Math.random() * 9000)}`
})

watch(() => props.show, (open) => {
	if (open) {
		form.value = {
			name: "",
			phone: "",
			email: "",
			password: `ADD@${Math.floor(1000 + Math.random() * 9000)}`
		}
		formRef.value?.restoreValidation()
	}
})

const rules: FormRules = {
	name: [{ required: true, message: "الاسم مطلوب", trigger: ["blur", "input"] }],
	phone: [{ required: true, message: "رقم الهاتف مطلوب", trigger: ["blur", "input"] }],
	email: [
		{ required: true, message: "البريد الإلكتروني مطلوب", trigger: ["blur", "input"] },
		{ type: "email", message: "البريد الإلكتروني غير صالح", trigger: ["blur", "input"] }
	],
	password: [{ required: true, min: 8, message: "كلمة المرور يجب أن لا تقل عن 8 خانات", trigger: ["blur", "input"] }]
}

async function submit() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	isSubmitting.value = true
	try {
		const payload = {
			name: form.value.name.trim(),
			phone: form.value.phone.trim(),
			email: form.value.email.trim(),
			password: form.value.password,
			password_confirmation: form.value.password,
			role: "member" as const
		}

		const newUser = await createUser(payload)
		message.success(t("reception.quickGuest.success", { name: newUser.name }) || `تم تسجيل الضيف ${newUser.name} بنجاح`)
		emit("created", newUser)
		emit("update:show", false)
	} catch (caught) {
		if (caught instanceof ApiError) {
			const errs = caught.data?.errors
			if (errs) {
				const firstErr = Object.values(errs)[0]?.[0]
				message.error(firstErr || caught.data?.message || "تعذر حفظ بيانات الضيف")
			} else {
				message.error(caught.data?.message || "تعذر حفظ بيانات الضيف")
			}
		} else {
			message.error("حدث خطأ غير متوقع")
		}
	} finally {
		isSubmitting.value = false
	}
}
</script>
