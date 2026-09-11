# Toolbox Project Instructions

Toolbox is a self-hosted household/workshop inventory, storage mapping and item checkout application.

## Primary stack

- C#
- ASP.NET Core
- Entity Framework Core
- PostgreSQL
- React
- TypeScript
- Vite
- xUnit
- Docker / Docker Compose

## Engineering principles

- Use a modular monolith.
- Keep domain logic separate from controllers and UI.
- Model storage containers as an arbitrary hierarchy.
- Use Storage for UI sections, storage container for entities, and Container in compact controls. Preserve internal Location identifiers and existing API/data contracts.
- Use database migrations.
- Add meaningful automated tests.
- Keep the UI mobile-friendly.
- Search and fast interaction are higher priorities than visual complexity.
- Never commit secrets.
- Run builds and tests after meaningful changes.

## Product priorities

Toolbox should make it extremely quick to answer:

"Where is this item?"

Core concepts are:
- items
- nested storage containers
- search
- checkout / return
- checkout history

## Current scope

Do NOT implement yet:
- full map drawing
- OCR
- AI
- barcode databases
- complex authentication
- native mobile applications
- warranty management
- stock purchasing

Map drawing is an important future feature, but should only be documented during the initial implementation.

## Initial development brief

Before beginning initial implementation, read:

docs/INITIAL_BUILD.md

Follow that document until its Definition of Done has been reached.

## Git

Make small, descriptive commits.

Do not commit generated output, credentials or environment secrets.
