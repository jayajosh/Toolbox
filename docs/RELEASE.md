# Release Procedure

Use this checklist to publish a Toolbox release.

## 1. Prepare

- Confirm the release version matches `frontend/package.json`,
  `frontend/package-lock.json`, `Toolbox.Api.csproj`, the status endpoint, and
  `CHANGELOG.md`.
- Review `git status` and include only intended changes.
- Back up the PostgreSQL database before upgrading an existing deployment.

## 2. Verify

Run the same checks as CI:

```bash
dotnet restore backend/Toolbox.sln
dotnet test backend/Toolbox.sln --configuration Release --no-restore
npm --prefix frontend ci
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
docker compose config --quiet
git diff --check
```

Build and smoke-test the release stack:

```bash
docker compose up -d --build
curl --fail http://localhost:7001/healthz
curl --fail http://localhost:5080/api/health/live
curl --fail http://localhost:5080/api/health/ready
curl --fail http://localhost:5080/api/status
```

Manually verify the core flows on desktop and mobile:

- Search, create, edit, move, and delete an item.
- Create, move, and remove a storage container.
- Check an item out and back in.
- Load and edit the same floor plan from two devices.
- Confirm the mobile inventory, checkout, storage, and floor-plan layouts.

## 3. Publish

After the release commit is on `main` and CI passes:

```bash
git tag -a v1.0.0 -m "Toolbox v1.0.0"
git push origin main
git push origin v1.0.0
```

Create the release from the matching `CHANGELOG.md` section. Do not tag a
worktree with uncommitted changes or bypass failing checks.
