# HR forms: pages, not dialogs

## Decision record

### 2026-10 (f60101a): every add and edit form is a dialog

> "every add and edit form is a dialog in the middle of the page, full width on a phone;
> reading a request stays in a drawer that opens from the side reading ends on"

`HrFormModal` was introduced as the single frame for every HR add or edit form, mirroring
`ResourceFormDrawer` elsewhere in the dashboard. The reasons, as recorded at the time:
one consistent frame, the list stays visible behind the form, and the form closes back
to exactly where the user was without a navigation.

### 2026-11-09: the larger forms move to pages of their own

**Reversed for the larger forms**, at the product owner's direction, after reviewing the HR
module of Bayraq ERP (erp.bayraq.io) as a reference. Bayraq puts its main create and edit
forms on their own address (`/hr/employees/:id`, `/hr/payroll?new=1` as a full page):
sections stacked as titled blocks, a link back to where the form was opened from, and the
buttons at the end of the page.

What this gives:

- **Room.** Long forms (hiring has five groups of fields) no longer scroll inside a box
  of fixed width, and the hiring wizard's two steps become one page. Every field shows at
  once, so validation errors are visible where they are.
- **An address.** A form can be linked to, reopened after a reload, and reached with
  the browser's back button. The Users page's "Hire" now opens the hire page directly.
- **A side column** for what the form does not edit (an employee's identity, which belongs
  to their account), beside the fields instead of above them.

**What it gives up:**

- **The list behind the form.** Opening a form leaves the list; returning reloads it.
  Filters survive because they live in the URL (`useRouteFilters`), but the scroll
  position does not.
- **Close-to-cancel.** A dialog dismissed with Esc or a click outside. A page needs its
  Cancel button or the back link. Unsaved input is lost on leaving either way. There is no
  unsaved-changes prompt yet, as there was none on the dialogs.
- **One frame for everything.** Short actions stay dialogs (see the rule below), so HR
  now has two frames for forms, not one.

### The rule after the change

| Form | Frame |
|---|---|
| Creating or editing a primary record with more than a handful of fields, or with its own sections (an employee, a payroll run, a pay component, a policy) | **Page**, `HrFormPage`, at `<list>/create` or `<list>/:id/edit` |
| A short action: a reason, a note, a date, a confirmation, a decision on a request, a single related item | **Dialog**, `HrFormModal` |
| Reading a record | **Drawer**, `HrDrawer` (unchanged) |

A form page is a hidden entry in `navigation/sections.ts`, beside its list page. It carries
the permission its form **writes** with (`hr.employees.create`, `hr.employees.update`),
because a write-only page carries the permission it writes with. Its title is
`nav.pages.<key>` in both catalogues.

### Layout: measured on the page, not the screen

The sidebar takes a different width open and collapsed, so the same screen leaves the
content area two different widths. Every breakpoint in a form page is therefore a
**container query** (Tailwind v4's `@container` / `@4xl:`), never a screen breakpoint
(`lg:`):

- `HrFormPage` is a container; its side column appears from `@4xl` (56rem of *content*).
- The sections' column and the side column are containers too, so a form's field grid
  uses `@xl:grid-cols-2` and follows the column it is in.
- The button bar is `sticky bottom-0`, not `fixed`: a fixed bar is positioned against the
  viewport and would sit under the sidebar or overrun it whenever the sidebar changes width.

## Remaining dialogs, sorted (2026-11-09)

Sorted by the rule above, from each dialog's fields and purpose. A developer's sorting, not
a ruling: the product owner may move any line.

**To become pages:** `PayComponentModal` (19 fields), `RecordEventModal` (18: promotion,
transfer, termination), `BenefitModal` (17), `RequisitionModal` (14), `LeavePolicyModal`
(13), `CourseModal` (13), `CycleModal`, `GoalModal`, `OpeningModal`, `LeaveRequestModal`
(a request with its balance beside it), `PositionFormModal`, `ApprovalFlowModal` (a steps
editor), `TemplateModal` (review template sections), `WorkPatternModal` (a weekly editor),
`OpenRunModal` (Bayraq opens a payroll run on a full page). (`PositionFormModal` was listed here first; see "Moved back" below.)

**To stay dialogs (short actions):** `AdjustBalanceModal`, `LoanModal`, `AdjustmentModal`,
`RateVersionModal`, `RateTableModal`, `UploadDocumentModal`, `InterviewModal`, `OfferModal`,
`ScorecardModal`, `HireCandidateModal`, `AddApplicationModal`, `AllocateModal`,
`CompensationModal`, `AdjustBudgetModal`, `CostAllocationModal`, `PeopleListModal`,
`CompleteSessionModal`, `EnrollModal`, `DelegationModal`, `LearningRequestModal`,
`SessionModal`, `CertificationModal`, `ReviewModal`.

## Converted

| Form | Was | Now |
|---|---|---|
| Hire an employee | `HireEmployeeModal` (two-step dialog) | `HireEmployeePage`, `/hr/employees/create` |
| Edit an employee's details | `EditEmployeeModal` | `EditEmployeePage`, `/hr/employees/:id/edit` |
| Open a payroll run | `OpenRunModal` | `OpenPayrollRunPage`, `/hr-pay/payroll-runs/create` (`hr.payroll.manage`); on success it goes to the run's own page |
| Add or edit a pay component | `PayComponentModal` | `PayComponentFormPage`, `/hr-settings/pay-components/create` and `/:id/edit` (`hr.settings.manage`, the permission the list page already wrote with, not `hr.payroll.manage`). There is no GET for one component, so the edit page finds it in the list it loads anyway for the codes the settings refer to |

| Request leave (the employee) | `LeaveRequestModal` | `MyLeaveRequestPage`, `/my-hr/leave/request` (My HR's audience); the balances beside the form |
| Request leave for an employee (HR) | `LeaveRequestModal` | `EmployeeLeaveRequestPage`, `/hr/employees/:id/leave-request` (`hr.leave.manage`); returns to the file on its leave tab (`?tab=leave`, which the file now honours) |

| Record an employment event (promotion, transfer, renewal, suspension, termination, rehire…) | `RecordEventModal` | `RecordEventPage`, `/hr/employees/:id/events/create` (`hr.lifecycle.manage`); `?type=` opens it on a type (a review's recommended promotion links straight there); today's job and contract sit beside the form; returns to the file on its career tab. The file's older `?event=` link now forwards to it, replacing the address |

| Add or edit a benefit | `BenefitModal` | `BenefitFormPage`, `/hr-pay/benefits/create` and `/:id/edit` (`hr.benefits.manage`); three panels: the benefit, value and frequency, cost and eligibility |

| File a hiring requisition | `RequisitionModal` | `RequisitionFormPage`, one page at two addresses: `/hr-talent/requisitions/create` for HR (`hr.recruitment.manage`, names the hiring manager) and `/my-hr/jobs/requisitions/create` for a manager filing their own; the latter returns to My recruitment on its requisitions tab (`?tab=`, which that page now honours) |

| Add or edit a course | `CourseModal` | `CourseFormPage`, `/hr-talent/courses/create` and `/:id/edit` (`hr.training.manage`); three panels: the course, provider/length/cost, the certification it grants |

| Add or edit a review template | `TemplateModal` | `TemplateFormPage`, `/hr-settings/review-templates/create` and `/:id/edit` (`hr.performance.manage`); the competencies get a panel of their own. No GET for one template: an edit finds it in the list |
| Add or edit a review cycle | `CycleModal` | `CycleFormPage`, `/hr-talent/review-cycles/create` and `/:id/edit` (`hr.performance.manage`); a new cycle opens on its own page once created, an edit returns to it |

The two leave pages share their fields: the dialog became `LeaveRequestForm`, the form
without its frame, which exposes `send()`, `submitting` and `ready` to the page's bar.
`LeaveBalances` moved to container queries too, so it lays out one card per row in a side
column and four across on a full page, menu open or collapsed.

### Moved back to the dialogs (2026-11-09)

- `PositionFormModal` stays a dialog. It opens from the org structure page with a unit
  already chosen in the tree beside it, and a page would leave that tree. Bayraq likewise
  edits positions inside its org chart, not on a page.
- `GoalModal` stays a dialog. It opens from three places (the goals list, the performance
  tab of an employee's file, My performance), each in the middle of its own list, in admin
  or self mode, for whichever employee that screen is about. A page would need three
  return addresses and would lose the list each goal belongs to.
- `OpeningModal` stays a dialog. It opens from inside the requisition drawer (for a new
  opening) and from the opening's own page (to edit it). A page from the drawer would close
  the requisition being read.

### Three dialogs nothing opens any more (2026-11-09), kept, not deleted

`LeavePolicyModal`, `ApprovalFlowModal` and `WorkPatternModal` lost their only call sites
in f97384d ("redesign hr settings … to match reference UI"), which rebuilt the leave,
approval-flow and time settings pages in Bayraq's layout. They look like dead code, and
the rule for dead controls is to delete them with their i18n keys. **They are kept
instead**, because deleting them would also delete the only UI for capabilities the
redesign did not carry over. The backend still serves all of these:

- **Leave policies:** service-based entitlement tiers, a maximum carried-over balance and
  its expiry in months, a maximum negative balance, and narrowing a policy to contract
  types, job grades or units (`hrLeave.policies.*`, 22 keys used nowhere else).
- **Approval flows:** a timeout per step and what happens when it passes (escalate,
  approve, reject), moving steps up and down (`hrApprovals.flows.*`, 13 keys).
- **Work patterns:** the weekly pattern (which shift each day) and weekly hours
  (`hrAttendance.patterns.*`, 8 keys).

Whether these capabilities come back (in the new pages, or through these dialogs) or are
deliberately dropped, along with the dialogs and their keys, is the product owner's decision.
Until then the dialogs stay as they are.

**Ruled the same day (product owner): bring them back.** Reviewing f97384d's three pages for
that showed they did more than drop capabilities. They did not work:

- **Approval flows** read and sent `approver_type`, `required_ability`,
  `approver_employee_id` and `order`, none of which StoreApprovalFlowRequest reads. Saved
  flows showed wrong, and saving was refused. The page also offered request types the
  server has no request for (custody, resignation), wrote a fixed indigo `#4F46E5` and
  Arabic literals into the code, and seeded every new flow with two direct-manager steps.
- **Time settings** never sent the workdays, saved only the first of the periods it let
  you add, never saved the grace, overtime, deduct-break or self-timed-punch controls
  (every one a no-op), and built a shift's code from its name with non-Latin letters
  stripped, so an Arabic name always became `shift-<timestamp>`.
- **Leave settings** sent `attachment_document_type_id: 1` for any type needing an
  attachment, saved a carry-over cap of 10 days nobody entered, swallowed a failed policy
  save (`.catch(() => {})`) so it looked saved, never saved the colour, the negative
  balance or the minimum and maximum days, and brought back the colour picker
  `no-runtime-theming.spec.ts` forbids, with five hex colours written into the code.

What was done, as decided:

- **Approval flows: rebuilt** in Bayraq's layout (request-type chips, then the type's steps
  one under the other joined by a "+" that inserts a step) on the FlowStep the server
  stores, with the timeouts, the step order and deleting a flow back.
  `ApprovalFlowModal` and its spec are deleted, its rules and tests moved to
  `ApprovalFlowsPage`, and its four keys no surface uses any more (`add`, `edit`,
  `addStep`, `empty`) are removed from both catalogues.
- **Time and leave settings: restored** to their versions before f97384d, which work, are
  tested, and carry the work patterns, attendance policies and leave policies. Their
  dialogs (`WorkPatternModal`, `LeavePolicyModal`) are in use again.
- **What that gives up, for now:** Bayraq's look on those two pages (a list of models
  beside an editor, the settings as switches). It is to be laid over the restored, working
  code next, not by patching f97384d's version.
- **Split shifts** (several periods in one day, as Bayraq allows) are **out**: ADD has
  none (product owner), and a shift template holds one start and one end. The "add a
  period" control does not come back.
- The settings menu (`HrSettingsLayout`, f97384d) stays, with HR's own page names.

**2026-11-10: Bayraq's look laid over the restored pages**, on the code that works:

- **Time settings:** the work patterns as cards, the chosen one edited beside them
  (`WorkPatternEditor`, which `WorkPatternModal` became). A fixed week's days are chips
  turned on and off, each working day taking a shift, and the editor shows the week's net
  hours worked out from those shifts, as Bayraq shows "صافي العمل". Below come the shifts and
  the attendance policies, one panel under the other instead of tabs.
- **Leave settings:** the leave types as cards, the chosen one edited beside them
  (`LeaveTypeEditor`) in Bayraq's groups (the balance, how the length is counted, what a
  request needs), with that type's policies listed under the editor. A new policy opens
  on the chosen type (`LeavePolicyModal`'s `leaveTypeId`). The holidays and coverage rules
  follow as panels. The leave-type table and dialog helpers in `leave.config.ts` went with
  the tabs, as did `hrLeave.types.requiresAttachment`, which only that table read.
- Both master–detail layouts are container queries (`@3xl:`), so the editor sits beside the
  list only when the content area is wide enough, menu open or collapsed.
