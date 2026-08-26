# Users/Roles pages have no permission gate — the whole resource, not two actions

Dated finding, not fixed. `UsersPage.vue` is on the owner's list for a larger pass;
landing a point patch here first was explicitly ruled out for this batch.

## What the collection says

The pinned snapshot (`docs/api/`, 2026-08-24) calls out exactly two endpoints as
admin-only, in prose, on the individual request:

- **Create User** (`POST /admin/users`): "admin-only route (role:admin, not
  role:admin|operations — an operations account gets 403 here)."
- **Assign Role** (`PATCH /admin/users/{id}/role`): "admin-only route."

Every other Users endpoint's description is silent on permission scope: List Users
("Optional `?role=` filter"), Get User (no description), Update User Profile ("Profile
fields only... Returns `{message}`"), Update User Status (describes the three status
values and the token-revocation side effect, nothing about role). Roles' one endpoint,
List Roles, has no description at all.

## What the backend route file actually says

Read directly, today (`ADDCore/routes/api/v1/admin.php`, lines 170–197):

```php
// Narrower than the group above: managing accounts and roles is admin-only,
// operations can't create or promote other accounts.
Route::middleware('role:admin')->group(function () {
    Route::apiResource('users', UserController::class)->except('destroy');
    Route::patch('users/{user}/status', [UserController::class, 'updateStatus']);
    Route::patch('users/{user}/role', [UserController::class, 'assignRole']);

    Route::get('roles', [RoleController::class, 'index']);
    ...
});
```

`apiResource('users', ...)->except('destroy')` is index/show/store/update — so **every**
Users endpoint this codebase calls (`listUsers`, `getUser`, `createUser`,
`updateUserProfile`, `updateUserStatus`, `assignRole`) sits behind `role:admin`, not
`role:admin|operations`. So does the one Roles endpoint (`listRoles`). This is a strict
superset of what the collection's prose says: the collection only flags Create User and
Assign Role; the route file gates the entire resource plus Roles plus (irrelevantly for
now) `PATCH /admin/settings/{key}`, which has no screen yet.

This was independently found in `docs/superpowers/specs/2026-08-11-users-roles-management-design.md`
§1, written 2026-08-11 from the same route file — re-verified against the live file today
rather than trusted on the design doc's age, and it still reads the same.

## What the screens do

Neither `UsersPage.vue` nor `RolesPage.vue` contains an `isRoleGranted` check, or any
other role-conditional rendering, anywhere:

- `UsersPage.vue` calls `listUsers()` unconditionally on load, and renders the Create
  User button, the change-status action, and the change-role action with no gate. An
  `operations` viewer sees all of it and gets a 403 the instant any of it runs — starting
  with the initial list load, not just the two actions the collection happens to
  document.
- `RolesPage.vue` calls `listRoles()` unconditionally on load, no gate. Same failure mode,
  immediately, on page load.

Neither `sections.ts` nor `routes.ts` hides or guards the `system` nav section
(Users/Roles) by role either — an `operations` account sees "System" in the sidebar,
navigates in, and the page fails to load anything.

## What `permissions.ts` currently has — and why that was a reasonable read of incomplete evidence

`permissions.ts`'s own comment says, currently:

> `users` and `roles` have no entries here, and that's settled, not an open question:
> the collection has no DELETE endpoint for either resource at all... There is nothing
> to gate here for either resource.

That reasoning is specific to *delete* gating (the file's only stated purpose:
"which role may delete which spatial resource") and was correct on its own terms — there
genuinely is no DELETE for either resource, so nothing to gate *there*. It was never
making a claim about read/write access to the resource as a whole, and nobody had reason
to widen the question until the route file was read directly. **Not a mistake to
correct defensively — a scope that needs deliberately widening now that the fuller
picture exists.**

## What a fix would touch (not built here)

- `permissions.ts`: a new gate distinct from the delete-role map — something like
  `canManageUsersAndRoles(): boolean` sourced from `role:admin` on the whole group, used
  for *page-level* access, not a single action. Whether that's "hide the nav section,"
  "hide the page content behind a permission-denied state," or "hide each individual
  control while still rendering the page shell" is a product decision this finding
  doesn't make.
- `UsersPage.vue`: gate the initial `listUsers()` call (or its rendering) plus the Create
  User button, the change-status action, and the change-role action — all four, not just
  the two the collection documents.
- `RolesPage.vue`: gate the initial `listRoles()` call the same way.
- `sections.ts` / `routes.ts`: decide whether an `operations` account should see "System"
  in the nav at all, given nothing under it will ever work for that role today.

None of the above is implemented in this batch.
