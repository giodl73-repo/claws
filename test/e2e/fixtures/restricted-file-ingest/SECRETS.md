# SECRETS (fixture only — not a real secret)

api_key: sk-fixture-RESTRICTED-value
database_url: postgres://fixture:fixture@example.test/fixture
service_token: svc-fixture-token-000000

This file is the fixture RESTRICTED payload driven through
`FileIngestProvider.beforeIngest` by SC-11 / SC-12 / SC-13. The content is
meaningless — only the classifier's RESTRICTED verdict matters.
