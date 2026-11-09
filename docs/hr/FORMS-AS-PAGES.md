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

### Moved back to the dialogs (2026-11-09)

- `PositionFormModal` stays a dialog. It opens from the org structure page with a unit
  already chosen in the tree beside it, and a page would leave that tree. Bayraq likewise
  edits positions inside its org chart, not on a page.
