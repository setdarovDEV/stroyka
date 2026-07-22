# Stroyka Design System

Use this file as the design source of truth for Open Design, Codex, and any generated frontend work.

## Product

Stroyka is a construction control desktop/web app for directors, project owners, accountants, prorabs, engineers, and warehouse operators. It compares planned estimates with real execution: materials, stock, worker hours, machine hours, zones, alerts, and reports.

## Style

- Operational business tool, closer to 1C/ERP/Excel than marketing SaaS.
- Dense, calm, table-first layouts.
- No landing-page heroes inside the app.
- No gradients anywhere.
- No gradient backgrounds, gradient borders, gradient text, gradient buttons, or gradient chart fills.
- No blurred decorative blobs, bokeh, or orb decorations.
- Use flat color surfaces, clear borders, compact spacing, and high scanability.
- Cards only for repeated summary items, forms, modals, and bounded widgets. Do not nest cards.
- Radius max: 8px.
- Letter spacing: 0.

## Palette

- Background: off-white `#f7f7f4`
- Surface: white `#ffffff`
- Surface muted: warm gray `#efefea`
- Text: near-black `#181814`
- Muted text: cool gray `#626b70`
- Border: neutral gray `#d8d8d0`
- Primary action: construction green `#2f6b4f`
- Primary hover: `#285b44`
- Accent: safety amber `#b7791f`
- Danger: `#b42318`
- Success: `#2f6b4f`
- Info: `#2563a6`

Use color sparingly. Most UI should be neutral. Status color appears only in badges, table cells, alerts, charts, and action icons.

## Typography

- System sans font.
- Page title: 22-28px.
- Section title: 16-18px.
- Table/body: 13-14px.
- Labels: 12px.
- Avoid oversized headings in dashboards, forms, sidebars, or data grids.

## Layout

- Desktop-first, but no overflow on laptop screens.
- Sidebar fixed width around 240px.
- Main content uses compact page header, toolbar/filter row, then table/dashboard content.
- Tables must support repeated work: sticky headers where useful, clear row hover, visible status badges, compact actions.
- Use tabs for operational modes: stock items, pending confirmations, history, work logs, machine logs.
- Forms use labels, grouped fields, and direct actions. Avoid explanatory marketing copy.

## Components

- Buttons: icon + text for primary actions; icon-only for row actions with accessible labels/tooltips where available.
- Inputs/selects: 36px height, visible border, no heavy shadow.
- Badges: flat tinted backgrounds, no gradients.
- Charts: flat fills only, no gradient fills.
- 3D view: plain bounded work area, no decorative frame.

## Open Design Prompt

Create Stroyka frontend screens using this design system. Generate React/Tailwind-compatible layouts for an operational construction ERP. No gradients. No decorative blobs. Prioritize dashboard, warehouse, estimates, projects, material requests, reports, and login/register screens.
