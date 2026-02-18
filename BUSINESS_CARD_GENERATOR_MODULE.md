# FEATURE SPEC: Business Card Generator (SVG Engine)

## 1. Context & Scope
**Type:** Feature Integration
**Goal:** Implement a "Business Card System" where templates are **manually curated SVGs** (exported from Figma). The system loads these SVGs and **programmatically injects** user data.
**Primary Workflow:**
1.  **Curation (Manual):** Designer imports Freepik EPS to Figma $\rightarrow$ Cleans layers $\rightarrow$ Naming convention (e.g., layer name `#name`) $\rightarrow$ Export as SVG.
2.  **Suggest:** App loads the SVG $\rightarrow$ Finds elements with IDs (`#name`) $\rightarrow$ Injects user data.
3.  **Edit:** User modifies the card in the browser (Fabric.js).
4.  **Print:** App generates PDF.

## 2. Dependencies & Stack Integration
* **Frontend:** React + `fabric` (v6.x).
* **Backend:** Node.js + `puppeteer` (for PDF generation).
* **Assets:** A folder `/public/templates/` containing your `.svg` files.

---

## 3. Phase 1: The Core Engine (Frontend)
**Objective:** Render SVGs and make them editable.

### Task 1.1: The Canvas Component
* **File:** `/src/components/BusinessCard/CardEditor.tsx`
* **Logic:**
    * Initialize `fabric.Canvas` (1050px x 600px).
    * **Loader:** Use `fabric.loadSVGFromURL(url, (objects, options) => { ... })`.
    * **Critical Step:** Pass the objects through the `hydrateSVG` utility (Task 3.1) before adding them to the canvas.

### Task 1.2: The Suggestion Grid
* **File:** `/src/components/BusinessCard/SuggestionGrid.tsx`
* **Logic:**
    * Load 4 different SVG files from `/public/templates/`.
    * For each, run the "Hydration & Injection" logic purely for display (static canvas).
    * **Interaction:** Clicking a card routes to the Editor with that specific SVG loaded.

---

## 4. Phase 2: The Rendering Service (Backend)
**Objective:** Generate a print-ready PDF.

### Task 2.1: PDF Route
* **Endpoint:** `POST /api/cards/render`
* **Body:** `{ "fabricJson": JSON, "width": 1050, "height": 600 }`
* **Logic:**
    1.  Launch **Puppeteer**.
    2.  Load `fabric.js` and the `fabricJson` (which represents the *modified* SVG state).
    3.  Wait for `canvas.renderAll()`.
    4.  Call `page.pdf({ width: '3.5in', height: '2in', printBackground: true })`.

---

## 5. Phase 3: The SVG "Hydration" Pipeline (The Magic)
**Objective:** The logic that turns a dumb SVG file into a smart, injected template.

### Task 3.1: The SVG Hydrator Utility
* **File:** `/src/utils/svgHydrator.ts`
* **Goal:** Convert static SVG paths into editable Fabric objects based on their ID.
* **Logic:** `function hydrateAndInject(objects, options, userData)`
    1.  **Group:** Group the objects using `fabric.util.groupSVGElements(objects, options)`.
    2.  **Ungroup & Traverse:** We need to traverse the group to find specific IDs.
    3.  **The "ID Mapping" Rule:**
        * Check `object.id` (which comes from the SVG `id` attribute).
        * **If id == `#name`**:
            * Create a new `fabric.IText` object.
            * Copy properties (font, size, color, x, y) from the original SVG element.
            * Set text content to `userData.name`.
            * *Replace* the original SVG object with this new IText object.
        * **If id == `#bg`**:
            * Set `object.selectable = false` (Lock background).
        * **If id == `#logo`**:
            * Replace with `fabric.Image.fromURL(userData.logoUrl)`.
    4.  **Return:** The final, interactive Fabric Group (or array of objects).

### Task 3.2: Manual Template Setup (Designer Guide)
* **Action:** Create a `README_DESIGNERS.md` with rules for Figma export:
    1.  **Text:** Must be "live text" (not outlined) if possible, or simple paths.
    2.  **Naming:** You MUST rename layers in Figma to match our keys:
        * `#name` (User's Name)
        * `#title` (Job Title)
        * `#phone` (Phone Number)
        * `#email` (Email)
        * `#website` (Website)
        * `#logo` (The Logo placeholder)
    3.  **Export:** In Figma Export settings, check **"Include 'id' Attribute"**. This is required for the code to find the layers.

---

## 6. Execution Checklist
- [ ] **Assets:** `/public/templates/card_01.svg` exists and has a layer named `#name`.
- [ ] **Logic:** Loading the SVG automatically replaces the `#name` layer with the user's actual name.
- [ ] **Edit:** The injected text is editable (clickable, typeable).
- [ ] **Output:** The PDF generator works with the modified canvas.