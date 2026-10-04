# Willo: published SDK adoption

Source `550a376ca5f0922a0c5fbf65e13c051fa9c783de` pins the published SDK and its measured compatible Bloom version, including the regenerated lockfile. Existing application behavior and previously reviewed fixes remain in the branch.

Validation: {"receiverPassed": 1, "filteredTests": 46, "sdkImporterMembers": 3580, "bloomImporterMembers": 41880, "typesBuildExport": "passed"}. Exact commands, logs, archive member hashes and importer resolutions are in [proof.json](proof.json).

- Published registry archives and all installed SDK importer members were compared byte for byte. Stale same-version candidate materializations were retained and repaired with a frozen install; their setup failures remain in the records.
- Local web export proves compilation, not browser/native acceptance or deployed public-client configuration. Required PR/main CI and root image/promotion remain separate.
- No production database, provider writes, grants, credentials or auth fixtures were changed. Owned PostgreSQL was stopped and its PID absence verified.
- The package test-name filter excludes other tests; it does not claim a full suite. Willo first run loaded unrelated modules without DATABASE_URL; that setup failure is retained, and the successful rerun supplied only an owned PostgreSQL URL.
