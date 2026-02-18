
# ARCHITECTURE_MASTERPLAN.md

## 1. Project Overview
**Product Name:** Automated Brand Identity Engine (SaaS)
**Goal:** A "Magic" branding platform where users upload a logo and business info, and the system automatically generates hundreds of branded assets (business cards, social posts, invoices) by injecting their unique identity into "Smart Templates."

**Core Value Proposition:**
1.  **Zero-Config Design:** User uploads a logo -> System extracts colors -> All assets update instantly.
2.  **AI-Powered Content:** System writes the marketing copy (taglines, bios) using OpenAI.
3.  **Scalable Templating:** Admin can upload raw SVGs, which become dynamic assets.

---

## 2. Technical Stack

### Frontend (The Dynamic Renderer)
* **Framework:** Next.js 14+ (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS (Crucial for the CSS Variable logic)
* **State Management:** React Context or Zustand (to manage the "Brand Kit" state globally)
* **Color Extraction:** `colorthief` or `react-color-extractor` (Client-side analysis)
* **SVG Handling:** Inline SVGs (`@svgr/webpack` or raw string injection)

### Backend (The Data & Asset Store)
* **BaaS:** Supabase
    * **Auth:** Google & Email Login
    * **Database:** PostgreSQL
    * **Storage:** Buckets for User Logos and Generated PDFs
* **AI:** OpenAI API (GPT-4o) for text generation + DALL-E 3 (optional backup for logo generation)

---

## 3. System Architecture & Data Flow

### System A: The Brand Extractor (Step 1 & 2)
* **Input:** User uploads `logo.png`.
* **Process:**
    1.  Frontend uses `colorthief` to scan pixel data.
    2.  Extracts top 3 dominant colors (Primary, Secondary, Accent).
    3.  User confirms or tweaks colors via a color picker.
    4.  **Output:** A JSON object stored in the `Brands` table:
        ```json
        {
          "palette": {
            "primary": "#FF5733",
            "secondary": "#1A1A1A",
            "accent": "#F0F0F0"
          },
          "typography": "Inter"
        }
        ```

### System B: The Smart Template Engine (The "Magic")
* **Concept:** Templates are not static images. They are **Code Components**.
* **Mechanism:**
    1.  **Storage:** Templates are stored in the DB as sanitized SVG strings.
    2.  **Injection (CSS Variables):**
        * The App Wrapper sets CSS variables at the root level based on the User's Brand:
            * `--brand-primary: #FF5733;`
            * `--brand-font: 'Inter', sans-serif;`
    3.  **Injection (Content):**
        * The SVG strings contain "Handlebars" style placeholders:
            * `<text>{{company_name}}</text>`
            * `<rect fill="var(--brand-primary)" />`
    4.  **Runtime Replacement:**
        * React component receives the SVG string.
        * Performs a string `replace()` to swap `{{company_name}}` with real data.
        * CSS Variables handle the color swapping instantly without re-rendering the DOM structure.

### System C: The Asset Factory (Export)
* **Web Preview:** Direct SVG rendering (fast, crisp).
* **Download:**
    * **PNG:** Canvas API or `html-to-image` library to rasterize the DOM node.
    * **PDF:** `react-pdf` or server-side Puppeteer generation for high-res print output (Phase 3).

---

## 4. Database Schema (Supabase)

### Table: `profiles`
* `id` (uuid, PK) - linked to auth.users
* `email`
* `subscription_tier` (free, pro)

### Table: `brands`
* `id` (uuid, PK)
* `user_id` (fk -> profiles.id)
* `business_name` (text)
* `tagline` (text)
* `description` (text)
* `logo_url` (text - Supabase Storage URL)
* `colors` (jsonb) -> `{"primary": "...", "secondary": "..."}`
* `contact_info` (jsonb) -> `{"phone": "...", "website": "...", "address": "..."}`
* `social_links` (jsonb)

### Table: `templates` (Admin Managed)
* `id` (uuid, PK)
* `name` (text)
* `category` (enum: 'business_card', 'invoice', 'instagram_post')
* `svg_content` (text) - The raw SVG string with placeholders
* `dimensions` (jsonb) -> `{"width": 1080, "height": 1080}`
* `is_active` (boolean)

---

## 5. Implementation Roadmap

### Phase 1: The Skeleton & Brand Capture
1.  **Setup:** Next.js + Supabase Auth.
2.  **Onboarding Flow:**
    * Form to collect Business Info.
    * Logo Upload + Color Extraction Logic.
3.  **Dashboard:** Display the collected data and the extracted color palette.

### Phase 2: The Template Engine (Core Logic)
1.  **Admin Upload:** Create a script to seed the DB with 3 sample SVG templates (Business Card, Post, Invoice).
2.  **The Renderer:** Build a React component `<SmartTemplate template={data} brand={userBrand} />`.
3.  **Variable Mapping:** Implement the string replacement logic for text and CSS variables for colors.

### Phase 3: AI & Export
1.  **OpenAI Integration:** "Generate Description" button that fills the `description` and `tagline` fields.
2.  **Download Feature:** Implement `html-to-image` to download the rendered SVGs as PNGs.

---

## 6. Admin/Developer Note: How to Prepare SVGs
*When adding a new template to the system:*
1.  **Clean:** Remove all base64 images inside the SVG if possible (keep it vector).
2.  **Map Colors:** Change specific hex codes to `var(--brand-primary)` or `var(--brand-secondary)`.
3.  **Map Text:** Replace lorem ipsum with `{{company_name}}`, `{{phone}}`, `{{tagline}}`.