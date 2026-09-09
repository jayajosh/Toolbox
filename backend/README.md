# Toolbox Backend

The backend is a modular monolith targeting .NET 10 and PostgreSQL.

## Projects

- `src/Toolbox.Domain`: guarded entities and domain invariants.
- `src/Toolbox.Application`: application-layer boundary for future use cases.
- `src/Toolbox.Infrastructure`: EF Core persistence, migrations, health checks, and development initialization.
- `src/Toolbox.Api`: ASP.NET Core host with foundation endpoints.
- `tests/Toolbox.Domain.Tests`: domain unit tests.

## Local commands

Run from `backend/` with the .NET 10 SDK:

```bash
dotnet restore Toolbox.sln
dotnet build Toolbox.sln
dotnet test Toolbox.sln
dotnet run --project src/Toolbox.Api
```

The API reads `ConnectionStrings:DefaultConnection`. Override it without editing configuration using `ConnectionStrings__DefaultConnection`, for example:

```bash
ConnectionStrings__DefaultConnection='Host=localhost;Port=5432;Database=toolbox;Username=toolbox;Password=your-local-password' dotnet run --project src/Toolbox.Api
```

In non-Production environments, startup applies migrations and inserts deterministic demo data only when all three domain tables are empty. Production does not run this initializer; apply migrations as part of deployment.

## Foundation endpoints

- `GET /api/health/live`: process liveness, no database dependency.
- `GET /api/health/ready`: database readiness, `200 Healthy` or `503 Unhealthy`.
- `GET /api/status`: backend name, version, and stage.

## EF Core migrations

Install the matching EF tool if needed, then run from `backend/`:

```bash
dotnet tool install --global dotnet-ef --version 10.0.12
dotnet ef migrations list --project src/Toolbox.Infrastructure --startup-project src/Toolbox.Api
dotnet ef database update --project src/Toolbox.Infrastructure --startup-project src/Toolbox.Api
```

The design-time factory defaults to a local PostgreSQL connection (`toolbox` / `toolbox`) and honors `ConnectionStrings__DefaultConnection`.

## Docker

Build the API image from this directory:

```bash
docker build -t toolbox-api .
docker run --rm -p 8080:8080 \
  -e ConnectionStrings__DefaultConnection='Host=host.docker.internal;Port=5432;Database=toolbox;Username=toolbox;Password=your-local-password' \
  toolbox-api
```

The image listens on port `8080`. Compose deployments should provide `ConnectionStrings__DefaultConnection` and use the non-Production environment if they want automatic migration and demo seeding.
