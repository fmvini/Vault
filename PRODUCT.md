# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 18+, TypeScript, Vite, React Router, TanStack Query, Zustand, Tailwind CSS, Recharts, React Hook Form, Zod and Axios on the frontend. FastAPI, Python 3.11+, SQLAlchemy 2 async, Pydantic v2, Alembic, PostgreSQL 15+, JWT, APScheduler and Uvicorn on the backend. The product is a monorepo with separate `frontend` and `backend` applications.

## Users

Individual users who want to organize personal finances in one place. Each person works in a private account and needs to understand spending, income, upcoming fixed expenses and monthly category limits without financial expertise.

## Product Purpose

Vault is a personal finance web application for quickly recording income and expenses, automating recurring fixed expenses, monitoring category budgets and understanding financial evolution over time. Success means a user can see where their money went, what is due next and whether they are still inside their monthly plan within seconds.

## Positioning

Vault combines the financial snapshot, the monthly plan and recurring obligations in one operating view: historical activity explains the past while goals and upcoming fixed expenses make the next decision visible.

## Operating Context

Users primarily operate the product on desktop, with functional tablet and smartphone layouts. The main workflows are checking the dashboard, recording a transaction, reviewing and filtering history, managing recurring expenses, monitoring category goals and adjusting notification preferences.

## Capabilities and Constraints

- Required authentication, strict user data isolation and secure password hashing.
- CRUD for transactions, custom categories, fixed expenses and monthly spending goals.
- System categories are read-only; custom categories with associated transactions cannot be deleted.
- Monthly recurring transaction generation must be idempotent and preserve historical records.
- Dashboard totals consolidate currencies into the user's default currency using cached exchange rates.
- Email notifications cover exceeded goals and upcoming fixed expenses, with individual preferences.
- Monetary values use exact decimals; API contracts and naming follow the files under `docs/`.
- MVP excludes report exports, native mobile apps, in-app/push notifications, shared accounts and bank integrations.

## Brand Commitments

The product name is Vault. Product communication is in Brazilian Portuguese. Code, API fields and database identifiers use English.

## Evidence on Hand

The product specification is fully documented in `docs/00-visao-geral.md` through `docs/05-guia-para-agente-ia.md`. No logo, photography, customer proof, testimonials or production metrics exist and none should be fabricated. Interface data may be illustrative when clearly presented as demonstration content.

## Product Principles

- Make the user's financial position legible before asking for action.
- Keep recording and correcting financial activity fast and forgiving.
- Connect every summary to inspectable underlying transactions.
- Surface risk early without shame, alarmism or gamification.
- Preserve precision, privacy and ownership boundaries throughout the system.

## Accessibility & Inclusion

The web interface must be keyboard usable, responsive, readable at common zoom levels and meet WCAG AA contrast for text and controls. Financial status must never rely on color alone.
