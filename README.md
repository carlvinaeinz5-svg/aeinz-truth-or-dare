# AEINZ Truth or Dare

## Accounts and database

The app uses Netlify Identity for email/password accounts and Netlify Database
(Postgres) for player profiles, saved stats, custom tasks, and online-game data.
Passwords are managed by Netlify Identity; they are not stored in this app's
database. The Drizzle schema is in `db/schema.ts`, and the database migrations
are in `netlify/database/migrations/`.

### Set up a Netlify site

1. Import this repository as a site in Netlify and connect it to your GitHub
   repository.
2. In the site's **Identity** settings, select **Enable Identity**. Configure
   email confirmation and allowed sign-up methods to suit your site.
3. Deploy the site. Netlify provisions the database and applies the checked-in
   migrations during deployment.
4. Open the deployed site over HTTPS to create an account or sign in. The app
   creates a player profile the first time an authenticated account accesses
   `/api/profile`.

Netlify Database is available on credit-based plans. For local development,
link the repository to your Netlify site and run `npx netlify-cli dev` from the
project directory so the Netlify functions and local database are available.

To update the database schema, edit `db/schema.ts`, generate a migration with
`npm run db:generate`, and commit the generated migration with the code change.
