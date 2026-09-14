# Toolbox

Toolbox is a self-hosted inventory app for homes, workshops, garages, and shared
equipment stores. It records what you have and where it is kept, down to a shelf,
box, or drawer.

Search for an item and get its full location instead of a note like "somewhere
in the garage":

```text
House / Garage / Red Tool Chest / Drawer 2
```

Toolbox runs on your own machine with PostgreSQL, an ASP.NET Core API, and a
React web app. It works in a phone browser as well as on a desktop.

## Features

- Search and filter items by name, family, tag, or storage container.
- Organise buildings, rooms, cabinets, shelves, boxes, and drawers.
- Add individual items or numbered ranges.
- Move items when the physical layout changes.
- Check equipment out to a named borrower and keep its return history.
- Draw a floor plan and place storage containers on it.
- Share the floor plan between browsers and devices.
- Import and export inventory as CSV.

## V1

Toolbox V1 is released. The core inventory, storage, checkout, and shared
floor-plan workflows are included.

Known limitations:

- No accounts, authentication, or permissions.
- Borrowers are recorded by name rather than user account.
- Floor plans export as JSON only.
- No item photos or general attachments.
- QR storage-container labels are planned for V2.

## Run It

Docker Compose is the easiest way to run Toolbox:

```bash
cp .env.example .env
docker compose up --build
```

The default addresses are:

- Web app: `http://localhost:7001/`
- API: `http://localhost:5080`
- PostgreSQL: `localhost:5432`

To use the app from another device on the same network, replace `localhost`
with the Docker host's LAN address. The web app and API use the ports defined in
`.env` through `WEB_PORT` and `API_PORT`.

In the development Compose setup, the API applies pending database migrations
at startup. Seed data is disabled.

## Development

Run these commands from the repository root:

```bash
dotnet restore backend/Toolbox.sln
dotnet build backend/Toolbox.sln
dotnet test backend/Toolbox.sln
npm --prefix frontend ci
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
```

The API exposes `/api/health/live`, `/api/health/ready`, and `/api/status`.
The frontend uses Vite on port `5174` for local development and port `4174` for
preview. Port `5173` is reserved for a separate portfolio application.

## Backup And Upgrade

Back up PostgreSQL before upgrading an existing installation:

```bash
docker compose exec -T db pg_dump -U toolbox -d toolbox > toolbox-backup.sql
```

Then rebuild the stack and check its health:

```bash
docker compose up -d --build
curl --fail http://localhost:7001/healthz
curl --fail http://localhost:5080/api/health/ready
```

See [`backend/README.md`](backend/README.md) for connection strings and
production migration instructions.

## Documentation

- [`CHANGELOG.md`](CHANGELOG.md): release history.
- [`docs/RELEASE.md`](docs/RELEASE.md): release checklist and smoke tests.
- [`docs/AGENTS.md`](docs/AGENTS.md): project guidance for contributors.

## Contributing

Keep business rules in the backend rather than controllers or UI components.
Include tests for new behavior and run the relevant checks before submitting a
change. Do not commit generated output, credentials, or local environment files.

## License

No open-source license has been selected. Until a license is added, all rights
are reserved.
