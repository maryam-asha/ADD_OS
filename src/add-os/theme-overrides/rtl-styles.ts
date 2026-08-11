import type { RtlItem } from "naive-ui/es/config-provider/src/internal-interface"
import { unstablePopoverRtl, unstableUploadsRtl } from "naive-ui"

/**
 * ADD OS — naive-ui RTL items the Pinx template did not register.
 *
 * naive-ui 2.44.1 exports 36 `unstable*Rtl` items. The template's
 * `src/app-layouts/common/rtlProvider.ts` registers 29 of them. This file adds
 * the ones we actually use in production; it is spread into that array.
 *
 * Registering naive-ui's own RTL item is always preferable to hand-writing SCSS:
 * it flips the component's internal styles at their source, and it is maintained
 * by naive-ui across upgrades.
 *
 * ── Added here ──────────────────────────────────────────────────────────────
 *  Popover  — used by Toolbar/Notifications, PinnedPagesV1, PinnedPagesV2, and
 *             inherited by n-tooltip and n-popselect (LocaleSwitch).
 *  Upload   — used by components/common/ImageCropper.vue.
 *
 * ── Available but deliberately NOT added ────────────────────────────────────
 *  Badge      — the template forces `.n-badge { direction: ltr }` in
 *               naive-override.scss and comments `unstableBadgeRtl` out on
 *               purpose, so badge counters stay top-right and read LTR.
 *               Changing this is a design decision — see RTL-REPORT.md.
 *  PageHeader — only used by the showcase page views/Components/PageHeader.vue.
 *  TreeSelect — only used by the showcase page views/Components/TreeSelect.vue.
 *  InputOtp   — not used anywhere in the project.
 *
 * When an ADD OS module starts using one of those, add it below rather than
 * writing SCSS for it:
 *   unstablePageHeaderRtl, unstableTreeSelectRtl, unstableInputOtpRtl
 */
export const addOsRtlStyles: RtlItem[] = [unstablePopoverRtl, unstableUploadsRtl]
