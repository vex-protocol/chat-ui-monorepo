# Writing Linear Issues

How to write issues that anyone can pick up and know exactly what "done" looks like.

---

## The Problem With Vague Issues

"Walk through the registration flow and try edge cases" is a narrative — good for brainstorming, terrible as a ticket. It has no clear definition of done, can't be verified by someone else, and forces the assignee to guess what's in scope.

## Every Issue Answers Three Questions

| Question | Section | Purpose |
|---|---|---|
| **What?** | Title + Description | One-sentence summary + context/motivation |
| **When is it done?** | Acceptance Criteria | Testable, binary (pass/fail) statements |
| **What could go wrong?** | Edge Cases | Explicit boundary conditions to verify |

## Universal Rules (All Issue Types)

1. **Title: Verb + Object + Context** — not just a noun. "Implement registration validation" not "Registration."
2. **Description: Why, not just what.** State the user goal and business context. One paragraph max.
3. **Acceptance criteria are contracts.** If all boxes are checked, the ticket is done. No debate.
4. **Edge cases are first-class.** They go in the ticket before work starts, not discovered during review.
5. **Scope boundaries prevent creep.** State what's out of scope so nobody gold-plates.
6. **One ticket = one verifiable unit.** If it takes more than a few days, break it down.

---

## Format by Audience

Different assignees need different structures. The same journey (e.g., "signing up") produces different issues for QA, design, and engineering.

### QA / Validation Issues

Focus: **Does it work?** Binary pass/fail test scripts.

```markdown
## Description
[One paragraph: what user journey is being validated and why]

## Acceptance Criteria

### Happy Path
- [ ] GIVEN I am [precondition]
      WHEN I [action]
      THEN [expected result]

### [Category: e.g., Username Validation]
- [ ] GIVEN I enter [specific input]
      WHEN [trigger]
      THEN [specific, observable outcome]

### Error Recovery & UX
- [ ] GIVEN [error state]
      WHEN I [corrective action]
      THEN [error clears / form recovers]

## Edge Cases

| Input | Expected Behavior |
|---|---|
| `specific input` | specific outcome |
| `another input` | another outcome |

## Out of Scope
- Thing we're not testing here (separate ticket)
```

**Key principle:** Enumerate, don't narrate. "Try weird characters" becomes a table of specific inputs and expected outputs.

### Design / Mockup Issues

Focus: **What screens need to exist?** Deliverables checklist.

```markdown
## Description
[One paragraph: what user journey this covers and the design goal]

## Screens to Deliver

### 1. [Screen Name] (e.g., Registration Form)
- [ ] Default state — empty form, clear CTA
- [ ] Filled state — all fields populated, ready to submit
- [ ] Error state — inline validation errors visible
- [ ] Loading state — submit button disabled, spinner

### 2. [Screen Name] (e.g., Success / Landing)
- [ ] First-time user — empty state with onboarding hint
- [ ] Returning user — populated with data

## Error & Edge Case Screens
- [ ] [Specific error] — e.g., "Username taken" inline error
- [ ] [Specific error] — e.g., "Server unreachable" full-screen error
- [ ] [Empty state] — e.g., no conversations yet

## Flow Diagram
[Optional: describe the screen-to-screen navigation]
Registration Form → (success) → App Home
Registration Form → (error) → Registration Form with errors

## Design Constraints
- Must work on 320px–428px widths (iPhone SE through iPhone Pro Max)
- Follow existing design system tokens (see `docs/explanation/design-system.md`)
- Accessibility: minimum 4.5:1 contrast ratio, touch targets >= 44pt

## Out of Scope
- Screens for features not yet planned (e.g., OAuth)
```

**Key principle:** Designers need to know which states to render, not which inputs to type. Every screen has at least: default, filled, error, loading, and empty states.

### Engineering / Implementation Issues

Focus: **What to build?** Technical requirements with clear boundaries.

```markdown
## Description
[One paragraph: what this implements and why it matters to the user]

## Acceptance Criteria
- [ ] [Functional requirement — what the code must do]
- [ ] [Functional requirement]
- [ ] [Non-functional requirement — performance, security, etc.]

## Technical Notes
- Implementation approach or constraints (e.g., "use argon2 for hashing, not bcrypt")
- API contract or data model changes
- Dependencies on other issues (link them)

## Edge Cases
- [ ] [Boundary condition and how to handle it]
- [ ] [Concurrency / race condition to guard against]

## Out of Scope
- What this PR should NOT include
```

---

## Common Mistakes

| Mistake | Example | Fix |
|---|---|---|
| Narrative instead of criteria | "Try edge cases" | List each edge case explicitly |
| Ambiguous done state | "Should feel smooth" | "Page loads in < 3s, no layout shift" |
| Missing error states | Only describes happy path | Add error, empty, loading, offline states |
| Scope creep bait | No out-of-scope section | State what's NOT included |
| Bundled concerns | "Build and design the login" | Separate issues for design and implementation |
| Revealing implementation to designers | "Use a regex for validation" | Describe the behavior, not the code |

## Checklist Before Creating

Before clicking Create in Linear:

- [ ] Could someone who didn't write this ticket verify it's done?
- [ ] Are all acceptance criteria binary (pass/fail, not subjective)?
- [ ] Are edge cases enumerated, not described vaguely?
- [ ] Is there an out-of-scope section?
- [ ] Is this one verifiable unit, not three issues bundled together?
- [ ] Is the format matched to the audience (QA vs design vs engineering)?
