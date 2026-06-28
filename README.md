# Paladin Farm & Ranch

## Introduction

Paladin Farm & Ranch is a [Computing for Good (C4G)](https://omscs.gatech.edu/cs-6150-computing-good) project built to support farmers and ranchers in disaster preparedness and recovery. The application allows users to register their farms, manage crops, livestock, and equipment, submit disaster assistance requests, and coordinate responses from volunteers. The production application is deployed at [paladinfarmandranch.com](https://paladinfarmandranch.com/).

### User Features

| Feature                 | Description                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Farm & Ranch Management | Register farms with geolocation, gates, crops, livestock, equipment, and emergency needs |
| Disaster Requests       | Create and coordinate disaster assistance requests and volunteer responses               |
| Dashboard               | Overview of active requests and farm data                                                |
| Disaster Resources      | Admin-managed list of helpful links and resources                                        |
| Push Notifications      | Web push notification support for subscribed users                                       |
| Google Maps             | Interactive maps for farm and gate locations                                             |
| Contact Form            | Public contact submission form                                                           |
| User Management         | Admin page for managing users. Base roles are `ADMIN` and `STAFF`                        |

### Developer Features

| Feature        | Description                                      |
| -------------- | ------------------------------------------------ |
| Authentication | Google OAuth login with 2 provided test accounts |
| CI/CD          | Automatic deployment of the application and DB   |

## Getting Started

1. Make sure you have the following set up and configured on your computer:
   - [git](https://docs.github.com/en/get-started/getting-started-with-git/set-up-git) or [Github Desktop](https://desktop.github.com/download/)
   - [NodeJS](https://nodejs.org/en/download) - version 24 or higher
   - [pnpm](https://pnpm.io/installation) - fast, disk-efficient package manager
   - [Docker](https://www.docker.com/get-started/)
2. Clone the repo using either SSH, HTTPS, or Github Desktop

- SSH

```bash
git clone git@github.com:C4G/paladin.git
```

- HTTPS

```bash
git clone https://github.com/C4G/paladin.git
```

3. Get the `.env` file from the project mentor. This file contains secrets for authentication, database connection, Google Maps API keys, and push notification keys. **Contact the project mentor to get the contents of this file.** Do not commit this file to version control.
4. Install all of the node dependencies with the following command

```bash
pnpm install
```

5. Make sure you have docker running and run the following command to initialize the database, apply all database schema, and seed some test users:

```bash
pnpm run init
```

6. If all is well up to this point your terminal should look like this:
   ![Initialization Successful](/documentation/init_success.png?raw=true 'Initialization Successful')
7. Next, run the development server

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

8. You may login with either of the accounts below or with your own gmail account

| Username              | Password         | Role  |
| --------------------- | ---------------- | ----- |
| c4gdevad@gmail.com    | EHdqcGJajTAnSy$8 | ADMIN |
| c4gdevstaff@gmail.com | JCbSk3&&JF!h#m@x | STAFF |

9. To access the database you can run the following command in a new terminal:

```bash
pnpm exec prisma studio
```

It should open the browser automatically or you can open [http://localhost:5555/](http://localhost:5555/) to see the database tables.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Technologies Used

- [Nextjs](https://nextjs.org/) - framework
- [Typescript](https://www.typescriptlang.org/)
- [Tailwind](https://tailwindcss.com/) - css atomic classes
- [Prisma](https://www.prisma.io/) - db type ORM system
- [Prettier](https://prettier.io/) - formatter
- [ESLint](https://eslint.org/) - enforce rules / policies for maintable code
- [Husky](https://typicode.github.io/husky/) - allows for code changes during local commit
- [Lint-Staged](https://github.com/lint-staged/lint-staged) - lints code on only staged files with auto-fix
- [Docker](https://www.docker.com/) - containers
- [Postgres](https://www.postgresql.org/) - database
- [Github Actions](https://github.com/features/actions) - ci/cd process
- [Nginx](https://nginx.org/) - server hosting configuration / routing
- [Shadcn](https://ui.shadcn.com/) - UI component library
- [RadixUI](https://www.radix-ui.com/) - UI component library
- [Lucide-React](https://lucide.dev/guide/packages/lucide-react) - UI icons
- [Next-Auth](https://authjs.dev/) - authentication with google
- [Ag-Grid](https://www.ag-grid.com/) - grid / table component
- [Google Maps API](https://developers.google.com/maps) - map integration
- [Web Push](https://www.npmjs.com/package/web-push) - push notifications
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) - form handling and validation

## Production Deployment

The application uses Docker Compose for production, following the [C4G template](https://github.com/C4G/template) pattern: a Postgres database, a one-shot migration container, and the Next.js standalone app.

### Architecture

- **Database** (`paladin-db`): PostgreSQL 17 with a persistent volume.
- **Migrations** (`paladin-migrations`): runs `prisma migrate deploy` once, then exits.
- **Application** (`paladin-app`): Next.js standalone server, starts only after migrations succeed. Exposes a health endpoint at `/api/health`.

### Commands

```bash
# Build and start all services
docker compose --profile production up -d --build

# Check status / logs
docker compose ps
docker compose logs paladin-app
docker compose logs paladin-migrations

# Stop (and clean) the stack
docker compose --profile production down
docker compose --profile production down --volumes --remove-orphans
```

All required variables must be set in `.env` before deploying — see `.env.prod.example`. `NEXT_PUBLIC_*` variables are baked into the client bundle at **build** time and are passed as Docker build args (see `docker-compose.yml`).

## C4G staff / TA setup (out of repo)

These steps are performed once per project by C4G staff and are **not** automated in this repository:

1. **GitHub Actions secrets** — add repo/org secrets used by `.github/workflows/ci.yaml`: `DATABASE_PW`, `DATABASE_USER`, `DATABASE_NAME`, `DATABASE_HOST`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `RESEND_API_KEY`, `NOTIFICATION_EMAIL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_PLAN_ID`, `PAYPAL_SECRET`, `PAYPAL_API_BASE`.
2. **Google OAuth** — configure the OAuth client and authorized redirect URIs in GCP for the project subdomain.
3. **Server `.env`** — place the production `.env` on the c4g.dev server (values for the variables in `.env.prod.example`).
4. **nginx + SSL** — add the nginx vhost for the project subdomain and (re)issue the SSL certificate.
5. **Deploy** — on the server, run `docker compose --profile production up -d --build`.
