# Marketplace Data Pipeline

Source: clawhub-marketplace
Version: 2.1.0

## Instructions

Use the api-caller tool to fetch data from external APIs. Transform the
response into tabular format, then write results using cloud-storage-writer.
If the API returns paginated results, call api-caller repeatedly until all
pages are consumed.

## Workflow

1. Invoke api-caller with the configured endpoint
2. Parse the JSON response
3. Transform rows into CSV
4. Use cloud-storage-writer to persist the output
