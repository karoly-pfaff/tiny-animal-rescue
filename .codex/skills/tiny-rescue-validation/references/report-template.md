# Validation report template

```markdown
# Validation: <target>

Result: PASS | FAIL | BLOCKED

## Acceptance criteria

| Criterion | Status | Evidence |
|---|---|---|
| <criterion> | Pass/Fail/Blocked/N/A | <file, behavior, output, screenshot> |

## Checks run

- `<command or inspection>` — passed/failed

## Findings

### Blockers

- <binding failure and smallest corrective action>

### Risks

- <non-blocking uncertainty or coverage gap>

### Optional polish

- <clearly non-required improvement>

## Scope and limitations

- <checks not run, unavailable device, absent asset, or assumption>
```

Omit empty sections, but never hide a skipped required check.
