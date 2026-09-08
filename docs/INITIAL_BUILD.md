# Toolbox — Initial Setup Agent Brief

You are beginning development of **Toolbox**, a self-hosted inventory, storage-location and item checkout application.

Your job in this first pass is to **create the repository, establish a sensible architecture, scaffold the application, design the core data model, and implement the first useful vertical slice**.

Do not attempt to implement every planned feature immediately.

---

# Product Summary

Toolbox answers:

> **Where did I put that?**

It should allow a household, garage, workshop, shed or storage space to be modelled as hierarchical locations.

Example:

```text
House
└── Garage
    └── Red Tool Chest
        └── Drawer 3
            └── 10mm socket
```

Users should eventually be able to:

* catalogue items
* search for items
* organise items into nested physical locations
* add photos
* create QR codes for locations
* scan a QR code to view a location
* check tools/items in and out
* draw simple maps/layouts
* place storage locations onto those maps
* search for an item and visually show where it is

The eventual map feature is important, but **do not build a full map editor in this first pass**.

---

# Primary Goal for This Pass

Produce a working application where:

1. The backend runs.
2. The frontend runs.
3. Locations can be created.
4. Locations can be nested.
5. Items can be created and assigned to locations.
6. Items can be searched.
7. An item's full storage path is displayed.
8. Items can be checked out and returned.
9. A QR code can be generated for a location.
10. Everything runs through Docker Compose.

The initial product should already be useful without the map editor.

---

# Suggested Stack

## Backend

* C#
* latest stable supported .NET / ASP.NET Core
* ASP.NET Core Web API
* Entity Framework Core
* xUnit

## Frontend

* React
* TypeScript
* Vite

## Database

Use PostgreSQL for the main self-hosted application.

Keep local development straightforward through Docker Compose.

## Deployment

* Docker
* Docker Compose

---

# Repository Structure

Use a clean structure similar to:

```text
toolbox/
├── backend/
│   ├── src/
│   └── tests/
├── frontend/
├── docs/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

Avoid unnecessary microservices.

This should initially be a straightforward modular monolith.

---

# Core Domain Model

Design this carefully before building the UI.

## Location

Represents a physical storage location.

Examples:

* House
* Garage
* Loft
* Cupboard
* Tool chest
* Shelf
* Drawer
* Storage box

Suggested fields:

```text
Id
Name
Description
ParentLocationId
LocationType
CreatedAt
UpdatedAt
```

A location can have:

* zero or one parent
* many child locations
* many items

The system should support arbitrary nesting.

---

## Item

Represents a physical item.

Examples:

* torque wrench
* HDMI cable
* drill
* Christmas decorations
* socket set

Suggested fields:

```text
Id
Name
Description
Quantity
LocationId
PhotoUrl / future attachment reference
CreatedAt
UpdatedAt
```

Keep the first version simple.

---

## Checkout

Represents an item leaving its normal storage location.

Suggested fields:

```text
Id
ItemId
CheckedOutAt
ReturnedAt
BorrowerName
Notes
```

Do not require a full user/account system for the MVP.

A simple borrower/name field is sufficient initially.

---

# Location Hierarchy

The hierarchy is one of the important engineering features.

Implement the ability to calculate/display a complete location path.

Example:

```text
House / Garage / Red Tool Chest / Drawer 3
```

Search results should display this path prominently.

Avoid designing the system around a fixed number of levels.

---

# Initial API

Create REST endpoints covering at least:

## Locations

```text
GET    /api/locations
POST   /api/locations
GET    /api/locations/{id}
PUT    /api/locations/{id}
DELETE /api/locations/{id}
```

Consider a tree endpoint such as:

```text
GET /api/locations/tree
```

if useful.

## Items

```text
GET    /api/items
POST   /api/items
GET    /api/items/{id}
PUT    /api/items/{id}
DELETE /api/items/{id}
```

Support item search.

For example:

```text
GET /api/items?search=torque
```

## Checkout

Provide clean commands/endpoints for:

* check out item
* return item

Avoid turning checkout into generic CRUD if explicit actions communicate intent better.

## QR

Provide a way to retrieve/generate a QR code that links to a location.

---

# Initial Frontend

Build a clean responsive UI.

Mobile usability matters because QR scanning and workshop usage will likely happen from a phone.

## Dashboard

Simple overview:

```text
Toolbox

Items        184
Locations     32
Checked out    3

[ Search everything... ]
```

## Location browser

Display hierarchical locations.

Example:

```text
Garage
├── Workbench
├── Wall Cabinet
└── Red Tool Chest
    ├── Drawer 1
    ├── Drawer 2
    └── Drawer 3
```

## Item search

Search should be extremely prominent.

Example result:

```text
Torque Wrench

Garage
→ Red Tool Chest
→ Drawer 2

[View item]
```

## Item page

Display:

* name
* description
* quantity
* current storage location
* full location path
* checkout state

Actions:

* edit
* move
* check out
* return

## Location page

Display:

* location details
* parent
* child locations
* contained items
* QR code

---

# Checkout Behaviour

Implement a simple but complete workflow.

Example:

```text
Torque Wrench
Status: Available

[Check out]
```

User enters:

```text
Borrower: Sam
Notes: Working on MX-5
```

Item becomes:

```text
Status: Checked out
Borrower: Sam
Since: 8 September
```

Return action should:

* close the checkout record
* mark the item available
* preserve historical checkout information

Do not delete history after return.

---

# QR Codes

Every location should have a stable URL.

Example:

```text
/locations/{id}
```

Generate a QR code pointing to this URL.

A printed QR sticker on a storage box should therefore open the box contents immediately.

For the first implementation:

* displaying/downloading the QR code is enough
* do not build printable QR sheet generation yet
* do not build barcode scanning yet

---

# Map Drawing — Design Now, Implement Later

Map drawing is a major planned Toolbox feature.

Eventually users should be able to draw simplified layouts representing:

* a house
* garage
* workshop
* room
* storage wall
* tool cabinet
* loft

Locations can then be placed on the layout.

Example:

```text
GARAGE
┌──────────────────────────────┐
│ Shelves A      Workbench     │
│                              │
│          Car                 │
│                              │
│ Tool Chest      Cabinet B    │
└──────────────────────────────┘
```

Searching for `torque wrench` could eventually highlight:

```text
Tool Chest → Drawer 2
```

on the map.

Create:

```text
docs/map-roadmap.md
```

Document a proposed data model.

Potential concepts:

```text
Map
MapElement
LocationMapPlacement
```

Consider storing normalised coordinates rather than hard-coded pixel positions.

Example conceptual placement:

```text
x
y
width
height
rotation
locationId
```

Do not implement the drawing canvas yet unless all core MVP work is already complete.

---

# Seed / Demo Data

Include useful development/demo data.

Example:

```text
House
├── Garage
│   ├── Red Tool Chest
│   │   ├── Drawer 1
│   │   └── Drawer 2
│   └── Shelving
└── Loft
    ├── Box A1
    └── Box A2
```

Items:

* torque wrench
* 10mm socket
* multimeter
* HDMI cable
* Christmas lights

This will help with screenshots and frontend development.

---

# Tests

Add meaningful backend tests.

At minimum test:

* create top-level location
* create nested location
* calculate full location path
* move an item between locations
* search items
* check item out
* prevent invalid duplicate active checkout if appropriate
* return item
* preserve checkout history

If tree logic is separated into a domain/service layer, test it directly.

---

# Database

Create EF Core migrations.

Docker Compose should start PostgreSQL automatically.

Do not rely on manual database setup.

---

# Docker

The repository root should support:

```bash
docker compose up --build
```

with:

* backend
* frontend
* PostgreSQL

Document all ports and required configuration.

Include `.env.example`.

Never commit secrets.

---

# README

Create a strong initial README containing:

## Toolbox

Suggested short description:

> A self-hosted inventory that tells you exactly where your stuff is.

Include:

* product purpose
* screenshots placeholder
* features
* quick start
* Docker setup
* development setup
* architecture
* data model overview
* roadmap
* QR workflow
* checkout workflow
* planned map system
* contributing notes

---

# CI

Add GitHub Actions covering at least:

* backend restore/build/test
* frontend install/build

Keep CI simple and reliable.

---

# UX Priorities

Toolbox should feel faster than maintaining a spreadsheet.

Prioritise:

1. Search.
2. Quickly adding an item.
3. Quickly moving an item.
4. Quickly browsing a location.
5. Mobile-friendly interaction.

Do not bury search behind multiple screens.

---

# Do Not Do Yet

Do not implement yet:

* full user/account system
* complex permissions
* barcode product database
* OCR
* AI item recognition
* automated image recognition
* advanced map editor
* CAD functionality
* notifications
* warranty system
* purchase tracking
* consumable stock management
* offline sync
* native mobile app

These can come later.

---

# Definition of Done for This Pass

Stop once:

* repository exists and is cleanly structured
* backend builds/runs
* frontend builds/runs
* PostgreSQL is configured
* EF migrations work
* nested locations work
* items can be added to locations
* items can be moved
* item search works
* full location path is shown
* checkout works
* return works
* history is retained
* location QR codes work
* application runs through Docker Compose
* tests cover key domain behaviour
* README documents the project
* map system is documented for later without being overbuilt

At completion, report:

* architecture chosen
* database model
* endpoints created
* frontend pages created
* tests implemented
* commands required to run the application
* known limitations
* the best next feature to implement
