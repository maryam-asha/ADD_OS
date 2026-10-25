/**
 * ADD OS — Arabic (ar) message bundle.
 *
 * This is the primary locale of the application. It lives under `src/add-os/`
 * (our code), not under `src/lang/locales/` (Pinx vendor code), and is wired
 * into the template's i18n through a single re-export in
 * `src/lang/locales/index.ts`.
 *
 * As ADD OS modules land, each module contributes its own namespaced bundle
 * here (e.g. `memberships.json`, `bookings.json`) and gets merged below, so
 * `src/lang/locales/index.ts` never needs to change again.
 */
import base from "./ar.json"
import hrApprovals from "./hr-approvals.json"
import hrAttendance from "./hr-attendance.json"
import hrBenefits from "./hr-benefits.json"
import hrLeave from "./hr-leave.json"
import hrPayroll from "./hr-payroll.json"
import hrPerformance from "./hr-performance.json"
import hrRecruitment from "./hr-recruitment.json"
import hrReports from "./hr-reports.json"
import hrTimesheets from "./hr-timesheets.json"
import hrTraining from "./hr-training.json"
import hr from "./hr.json"
import inventory from "./inventory.json"

const messages = {
	...base,
	...hr,
	...hrApprovals,
	...hrLeave,
	...hrAttendance,
	...hrTimesheets,
	...hrPayroll,
	...hrBenefits,
	...hrRecruitment,
	...hrPerformance,
	...hrTraining,
	...hrReports,
	...inventory
	// ...spread future ADD OS module bundles here
}

export default messages
