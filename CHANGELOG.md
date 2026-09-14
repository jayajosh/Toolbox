# Changelog

All notable changes to Toolbox are documented in this file.

## [1.0.0] - 2026-09-14

### Added

- Inventory search, filtering, bulk movement, deletion, family assignment, and tags.
- Individual item creation, numbered quick-add ranges, and CSV import/export.
- Arbitrarily nested storage containers with colours and full location paths.
- Multi-item checkout and check-in with borrower details, notes, and retained history.
- Shared PostgreSQL-backed floor plans with walls, openings, mapped containers,
  measurement settings, JSON import/export, and browser fallback storage.
- Responsive desktop and mobile workflows, including the mobile floor-plan disclosure.
- Docker Compose deployment, database migrations, health endpoints, and automated tests.

### Known limitations

- Authentication, permissions, user accounts, item photos, attachments, QR labels,
  dedicated container URLs, and non-JSON floor-plan exports are not included in V1.
