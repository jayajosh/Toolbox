# Toolbox V2 Scope

V2 will add physical access workflows that are intentionally outside the first
release.

## QR Storage Container Labels

Every storage container should expose a stable URL (the route naming is unchanged):

```text
/locations/{id}
```

Add an API endpoint that generates a QR code pointing to that URL. The storage container
page should display the code and allow it to be downloaded for attaching to a
box, cabinet, shelf, or drawer.

V2 should not include printable QR sheet generation or barcode scanning unless
they are separately prioritised.

## Prerequisites

Before implementing QR codes, V1 should have:

- stable storage container detail pages;
- storage container contents and hierarchy navigation;
- a documented public/base URL strategy; and
- API and frontend tests for storage container links.
