import type { ComposerTranslation } from "vue-i18n"
import { HR_ABILITIES } from "@/add-os/modules/hr/types/approvals"

/** An `hr.*` ability by its translated name; any other permission by its code. */
export function abilityLabel(t: ComposerTranslation, ability: string): string {
	return (HR_ABILITIES as readonly string[]).includes(ability) ? t(`hrApprovals.abilities.${ability.split(".").join("_")}`) : ability
}
