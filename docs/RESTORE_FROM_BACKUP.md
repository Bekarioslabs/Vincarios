# Restore A Markdown Note From A Backup

vincarios creates a backup before it executes a reviewed update to an existing Markdown note. V1 does not yet provide an in-app Restore button, so restoration is a deliberate manual file copy.

## Where Backups Live

For an updated note, vincarios writes a timestamped snapshot inside the same vault:

```text
<vault>/.vincarios/backups/YYYY-MM-DD/<original folders>/<note-name>.YYYY-MM-DD_HH-MM-SS.md
```

For example:

```text
My Vault/.vincarios/backups/2026-07-18/03_Knowledge/Topic.2026-07-18_14-05-31.md
```

The matching `.vincarios/audit.jsonl` entry records the original path and backup path.

## Restore Safely

1. Stop editing the affected note and close vincarios.
2. Copy the current version of the note somewhere safe first, in case you need it later.
3. Find the desired timestamped backup under `.vincarios/backups/`.
4. Copy that backup over the original note at the same relative vault path.
5. Reopen vincarios and verify the restored note in Preview.

## Scope And Limits

- This applies to existing-note updates executed through the Review Basket, including reviewed YAML/tag updates.
- New-note creation does not need a pre-write backup.
- V1 Rename Light and external changes are not restored by this guide.
- Backups remain vault-local and are ignored by Git by default. Keep an independent backup of important vaults as well.