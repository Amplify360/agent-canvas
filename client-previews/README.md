# Client Previews

Store client-facing HTML preview files in this directory.

## Usage

- Put raw HTML files here (for example: `acme-demo.html`).
- Serve them through a signed route handler (for example: `app/client-preview/[slug]/route.ts`).
- Do not place sensitive preview HTML directly in `public/`.

## Naming

- Use lowercase, hyphenated slugs that match your share link path.
- Example file: `acme-demo.html`
