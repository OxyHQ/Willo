# Shared household interfaces

A new **Household** destination joins Home, Activity and Automations in the modern navigation. `/household` opens the overview; `/household/[section]` supports `tasks`, `shopping`, `calendar`, `notes`, `packages`, `maintenance`, `expenses` and `meals`. Unknown section URLs return to the overview. The classic five-tab design and existing live-device/authentication paths remain unchanged.

## Interaction coverage

- Tasks: cleaning, waste, pets, plants and laundry; today/upcoming/completed filters; assignments; daily/weekly/monthly recurrence; optional member rotation; completion and undo. Completing a recurrence advances its due date locally. Household chores remain separate from device automations.
- Shopping: quick entry, quantity/category forms, attribution of who added or collected an item, shared local state across preview members, picked-up filtering and clearing, case/whitespace deduplication.
- Calendar: real month geometry, adjacent months, selected-day agenda, event categories, time and multi-day visits/holidays. Create/edit validates dates, times and range order.
- Notes: searchable cards, pinned notes, readable detail, author-only edit/pin controls, everyone/selected/private audiences. Switching the preview member removes inaccessible cards and any open restricted content.
- Packages: expected/delivered/collected states, recipient and location, collector attribution, collection undo, editable details.
- Maintenance: equipment/room list, due/attention states, service recording and history, repeating next-service dates, warranty metadata and instructions.
- Expenses: euro amounts represented as integer cents, payer, participant selection, equal shares with deterministic remainder allocation, paid/unpaid status, recurring metadata, zero-sum balances and recording/reopening a settled split. Unpaid and settled records are excluded from balances.
- Meals: a week of dinner plans, cook/servings/ingredients, cooked state, food/leftovers and use-by sorting. Missing ingredients feed the same shopping store without duplicates. Available, unexpired pantry items are skipped; editing a recipe cannot reuse another ingredient's ID.

## Implementation and boundaries

The existing responsive shell and NativeWind palette are reused. New source scanning is added for `packages/frontend/household/`; no package version or lockfile changes. Household-specific glyphs are vector components, not downloaded images or a new icon font. Forms use a single root-level Bloom BottomSheet host; screens do not create their own modals. The root provider preserves local state through routing and resize. Date/money/recurrence/permission-view logic is separate from presentation and covered by tests.

**This is a UI feature, not a household backend.** All records and members are invented examples, fixed to 14 September 2026. Changes exist in memory until reload. No banking, transfers, invitations, notifications, bookings, courier tracking, real calendars, warranties or delivery services are contacted. Recurrence on expenses is metadata, not bill generation. Meal completion does not consume inventory automatically.

Note filtering is only client-side presentation. It is not an authorization boundary or encryption. All fixture data ships with the app; never put actual secrets in the preview. Production must derive the authenticated member and allowed records server-side, validate mutations, enforce note ownership/readers, and synchronise changes with the existing home model. The “Preview as” selector is explicitly a simulator, never an impersonation control for real users.

The existing Home Assistant/Oxy providers and the live entity views are not replaced. New UI routes follow the same preview-access model as the previously merged reference screens. No real household accounts are provisioned here.

## Verification

`bun test tests` includes 26 new behaviour tests for recurrence/undo, normalized shared shopping, dates, note visibility/write restrictions, package attribution, service idempotence, precise expense splits and balances, form validation and meal-to-shopping integration.

The existing CI installation, package typechecks and actual Expo web export remain required. CI additionally installs isolated Python Playwright tooling, serves the real export, checks all nine household surfaces at 390/834/1440 widths, exercises task creation in Bloom, resize retention, shopping attribution, note visibility and meals-to-shopping routing, and uploads screenshots/results under `household-web-review`. This tooling does not alter application dependencies.

A green build is not a substitute for iOS/Android device review. Check soft-keyboard avoidance, native back, safe areas, enlarged text, long translated labels, focus return and screen-reader behaviour on each supported platform. No native-device validation is claimed by the browser checks.
