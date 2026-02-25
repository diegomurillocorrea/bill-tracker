# Bill Tracker — Project Specification

## Project name and overview

**Bill Tracker** is an admin application for managing water, electrical power, and internet bills in El Salvador. The system centers on clients and the utility services they pay through the administrator, so you can see at a glance who is paying for which services (e.g. Water, Electrical Power, Internet).

## Context and scope

- **Geographic context:** El Salvador
- **Application type:** Admin (internal use for managing clients and their services)
- **Services in scope:**
  - Water
  - Electrical Power
  - Internet

## Core concepts

- **Clients** — The entities you administer (e.g. people or accounts). Each client can have zero or more active services.
- **Services** — The three bill types: Water, Electrical Power, and Internet.
- **Relationship** — Each client is linked to a set of active services (many-to-many). A client may have one, two, or all three services; or none.

## Concrete examples

- **Diego (client)** is paying with us: **Water**, **Electrical Power**.
- **Mabelinne (client)** is paying with us: **Internet** only.

## Admin capabilities (high level)

- View a list of clients and which services each client has.
- Add and edit clients.
- Assign or remove services per client.

## Out of scope / assumptions

- No customer-facing portal in this scope; the app is for administrators only.
- Single or few admin users; no complex role-based access specified here.
- Technical context: Next.js admin app (for reference).

## Possible future features

- Track individual bills (amounts, due dates) per client and service.
- Billing history and simple reports.
- Notifications or reminders for due dates.
