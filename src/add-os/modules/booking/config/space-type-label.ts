import type { ComposerTranslation } from "vue-i18n"
import { SPACE_TYPES } from "@/add-os/modules/spatial/types/space"

/**
 * Renders `space_type` for a reception row.
 *
 * Reception payloads carry `space_type` and no Space name — this codebase has
 * no translatable Space name field, and `space_type` is the established
 * stand-in (`ArrivalRequestResource` does the same). The translations already
 * exist under `spaces.spaceType.*`; nothing new is defined here.
 *
 * The membership check is the point. `t()` returns the key path verbatim when
 * it can't resolve one, so an unrecognised `space_type` would render the
 * literal string `spaces.spaceType.meeting_room` in a table cell — a
 * missing-translation artefact that reads as a bug in the page rather than as
 * an unexpected value from the API. Falling back to the raw value keeps the
 * cell honest and the surprise visible. See the note in
 * `modules/booking/types/reception.ts` about the one value already sighted
 * outside the documented enum.
 */
export function spaceTypeLabel(t: ComposerTranslation, spaceType: string): string {
	return (SPACE_TYPES as readonly string[]).includes(spaceType) ? t(`spaces.spaceType.${spaceType}`) : spaceType
}
