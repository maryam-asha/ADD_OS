import type { FormItemRule } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { Bilingual } from "@/add-os/components/resource/field-types"
import type { Translatable } from "@/add-os/modules/hr/types/hr"

/**
 * HR's bilingual fields need Arabic and take English optionally
 * (TranslatableField in ADD Core), where ResourceFormDrawer's own
 * `required` demands both — so HR fields pass this rule instead.
 */
export function arabicRequiredRule(t: ComposerTranslation, labelKey: string): FormItemRule {
	return {
		required: true,
		trigger: ["blur", "change", "input"],
		validator: (_rule, value: Partial<Bilingual> | null | undefined) =>
			value?.ar?.trim() ? true : new Error(t("hr.common.arabicRequired", { field: t(labelKey) }))
	}
}

/** A form's `{ar, en}` as the API takes it: trimmed, a blank English sent as null. */
export function toTranslatable(value: Partial<Bilingual> | null | undefined): Translatable {
	return { ar: value?.ar?.trim() ?? "", en: value?.en?.trim() || null }
}

/** An API value back into the form's shape. */
export function toBilingual(value: Translatable | null | undefined): Bilingual {
	return { ar: value?.ar ?? "", en: value?.en ?? "" }
}

/** A trimmed text input, blank sent as null. */
export function nullable(value: string | null | undefined): string | null {
	const trimmed = value?.trim()
	return trimmed || null
}
