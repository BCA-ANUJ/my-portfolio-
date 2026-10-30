# Anuj Kumar Portfolio

A responsive portfolio with a Node.js admin workspace and SQLite-backed content, contact inbox, ratings and website feedback.

## Requirements

- Node.js 22.5 or later (the server uses Node's built-in SQLite driver).
- No npm packages are required.

## Run locally

1. Copy `.env.example` to `.env`.
2. Set `ADMIN_USERNAME` and choose an `ADMIN_PASSWORD` with at least 12 characters.
3. (Optional, before production) Set `SITE_URL` to your public HTTPS domain and `GOOGLE_ANALYTICS_ID` to your GA4 measurement ID. Analytics is not loaded until a visitor opts in.
4. Start the server:

   ```powershell
   node server.js
   ```

   Or, if npm is available in your terminal:

   ```powershell
   npm start
   ```

5. Open `http://localhost:3000` for the portfolio or `http://localhost:3000/admin.html` for the admin panel.

The initial profile, projects, skills, education, goals and social links are seeded into `data/portfolio.sqlite` on first start. The website accepts categorized project enquiries, private chat messages, and optional anonymous 1–5 star ratings and suggestions. Successful forms open a thank-you page. These submissions are stored in SQLite and appear in the matching admin inbox or feedback section. The admin inbox checks for new submissions every 30 seconds; email replies open your email app when a visitor shared their address. Basic honeypot and per-IP rate limits help reduce spam.

The site also includes a branded custom 404 page, unique page titles and descriptions, social-sharing metadata and a 1200 x 630 preview image, descriptive image alt text, a downloadable resume PDF, public links to seven selected course and training certificates, FAQs, an honest privacy policy, a favicon, a crawlable `robots.txt`, and a generated `sitemap.xml`. Academic marksheets and the unverified large PDF were not published. Admin and thank-you pages are excluded from indexing. Visitor ratings remain private; no invented testimonials are published. Fonts and icons are provided by Google Fonts and cdnjs.

The resume is copied byte-for-byte from the provided PDF. It contains contact details, including a mobile phone number, so downloading it will share the details already printed in that resume. The privacy policy explains this to visitors.

Once the live domain is running, verify it in Google Search Console and submit `https://your-domain.com/sitemap.xml`; the app generates the sitemap but cannot verify ownership of your Search Console account.

Update the sample email address and other profile details in the admin panel before publishing. The login page linked from the projects section is a front-end demo only; it does not authenticate or store passwords.

## Deployment and data

Run the app on a Node.js host that supports Node 22.5+ and persistent local disk storage. Configure `ADMIN_USERNAME`, a unique `ADMIN_PASSWORD`, `SITE_URL=https://your-domain.com`, `PORT`, and `NODE_ENV=production` in the host's environment settings. Set `GOOGLE_ANALYTICS_ID=G-...` only if you want to enable consent-based Google Analytics. Put the app behind an HTTPS reverse proxy that sets `X-Forwarded-Proto: https` in production; the server redirects HTTP traffic to your configured site URL, enables HSTS for HTTPS requests, and marks the admin session cookie `Secure`.

Back up the `data` folder to preserve portfolio content and contact messages. Keep `.env` and the SQLite database private; neither is served by the web server.
