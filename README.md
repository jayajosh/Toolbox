# Toolbox

> A self-hosted inventory that tells you exactly where your stuff is.

Toolbox is a household and workshop inventory application for answering one
simple question: **where did I put that?** It models real storage spaces as
nested locations, connects items to those locations, and keeps checkout history
when something leaves its normal home.

## Status

This repository is at the initial project setup stage. The product direction
and first vertical slice are specified in [`docs/INITIAL_BUILD.md`](docs/INITIAL_BUILD.md);
the backend, frontend, database, and Docker Compose application are the next
implementation targets.

## Planned Features

- Search items by name and description.
- Organise items in arbitrarily nested locations such as `House / Garage / Tool Chest / Drawer 3`.
- View an item's complete storage path.
- Create, move, and manage locations and items.
- Check items out to a named borrower and return them later.
- Preserve checkout history rather than deleting completed records.
- Generate stable QR codes for location pages.
- Use a responsive interface suitable for a phone in a garage or workshop.
- Add maps and visual location placement in a later phase.

## Screenshots

Screenshots will be added once the first usable interface is available.

## Quick Start

The application is not runnable yet. Once the initial implementation lands,
the intended full-stack startup command will be:

```bash
docker compose up --build
```

The Compose stack will provide the ASP.NET Core API, React/Vite frontend, and
PostgreSQL database. Ports and environment variables will be documented here
when they are finalized. Copy `.env.example` to `.env` for local configuration;
never commit secrets.

## Development

The planned local toolchain is:

- .NET SDK with ASP.NET Core and Entity Framework Core
- Node.js with npm or pnpm
- PostgreSQL, supplied by Docker Compose for consistency
- Docker and Docker Compose

Expected commands after scaffolding:

```bash
# Start infrastructure and the application
docker compose up --build

# Backend
dotnet restore
dotnet build
dotnet test

# Frontend
npm install
npm run build
```

## Architecture

Toolbox will start as a modular monolith rather than a collection of
microservices:

```text
toolbox/
├── backend/       # ASP.NET Core Web API, domain logic, EF Core
│   ├── src/
│   └── tests/
├── frontend/      # React + TypeScript + Vite
├── docs/           # Product and design documentation
├── docker-compose.yml
├── .env.example
└── README.md
```

The backend will own validation, hierarchy/path calculation, checkout rules,
and persistence. The frontend will consume the REST API and focus on fast
search, quick item entry, location browsing, and mobile usability.

## Data Model

The initial model has three core concepts:

- **Location**: a named physical place with an optional parent location. A self-reference supports any depth of nesting.
- **Item**: an inventory record with a name, description, quantity, and current location.
- **Checkout**: an append-only history record with borrower, checkout time, optional return time, and notes. At most one active checkout should exist for an item.

An item's displayed location is calculated by walking its parents, for
example: `House / Garage / Red Tool Chest / Drawer 3`.

## API Direction

The first API will expose REST resources for locations and items:

```text
GET|POST              /api/locations
GET|PUT|DELETE        /api/locations/{id}
GET                   /api/locations/tree
GET|POST              /api/items
GET|PUT|DELETE        /api/items/{id}
GET                   /api/items?search=torque
POST                  /api/items/{id}/checkout
POST                  /api/items/{id}/return
GET                   /api/locations/{id}/qr
```

Exact request and response shapes will be documented alongside the API once
implemented.

## Workflows

### QR locations

Each location will have a stable URL such as `/locations/{id}`. Toolbox will
generate a QR code for that URL so a label on a box, cabinet, or drawer opens
its contents directly. Printable QR sheets and barcode scanning are outside
the initial scope.

### Checkout

Checking out an item records the borrower, timestamp, and optional notes while
marking the item unavailable. Returning it closes that record and makes the
item available again. Completed records remain available as history.

## Roadmap

1. Scaffold the API, React client, PostgreSQL connection, migrations, and Compose stack.
2. Implement nested locations, item assignment, path calculation, and search.
3. Add checkout/return actions, history, seed data, and automated tests.
4. Add location pages and QR generation.
5. Document and implement the map model and visual layout editor.
6. Consider authentication, attachments, barcode support, and other extensions.

The initial release deliberately does not include full accounts, complex
permissions, OCR, AI recognition, purchasing, warranty tracking, offline sync,
or a native mobile app.

## Future Map System

Maps are planned as a separate layer over the location hierarchy. The proposed
concepts are `Map`, `MapElement`, and `LocationMapPlacement`, with normalized
`x`, `y`, `width`, `height`, and `rotation` values so layouts remain portable
across screen sizes. The map editor will not be built until the core inventory
workflow is useful on its own.

## Contributing

Read [`AGENTS.md`](AGENTS.md) and [`docs/INITIAL_BUILD.md`](docs/INITIAL_BUILD.md)
before making changes. Keep the modular-monolith boundary clear, add tests for
domain behavior, run builds/tests before submitting changes, and keep commits
small and descriptive. Do not commit generated output, credentials, or local
environment files.

## License

No license has been selected yet. Until one is added, all rights are reserved.
