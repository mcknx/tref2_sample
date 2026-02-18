
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function POST(req: NextRequest) {
    try {
        const { templateData, width = 1050, height = 600 } = await req.json();

        if (!templateData) {
            return NextResponse.json({ error: "Missing templateData" }, { status: 400 });
        }

        // Launch Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'], // Safe for most containerized envs
        });
        const page = await browser.newPage();

        // Set Viewport to match card size
        await page.setViewport({ width, height, deviceScaleFactor: 2 }); // 2x for retina-like quality if captured as screenshot, PDF handles vectors naturally

        // Inject HTML with Fabric.js (CDN for simplicity in backend logic)
        // We construct a simple page that:
        // 1. Loads Fabric.js
        // 2. Creates a canvas
        // 3. Loads the JSON
        // 4. Signals "completion" via a hidden div or special console log
        const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0; overflow: hidden; }
          canvas { display: block; }
        </style>
        <!-- Load Fabric.js v6 -->
        <script src="https://cdn.jsdelivr.net/npm/fabric@6.0.0-rc3/dist/index.min.js"></script> 
        <!-- Note: pinned to rc3 or latest stable v6 equivalent -->
      </head>
      <body>
        <canvas id="c" width="${width}" height="${height}"></canvas>
        <script>
          // We need to wait for fabric to be available, but script tag is blocking so it should be fine.
          
          async function init() {
            try {
               const canvas = new fabric.Canvas('c');
               const data = ${JSON.stringify(templateData)};

               // Load data
               await canvas.loadFromJSON(data);
               
               // Render
               canvas.requestRenderAll();
               
               // Signal done
               const div = document.createElement('div');
               div.id = 'render-complete';
               document.body.appendChild(div);
            } catch(e) {
                const div = document.createElement('div');
                div.id = 'render-error';
                div.innerText = e.message;
                document.body.appendChild(div);
            }
          }

          // Initial delay slightly to ensure fonts if any? 
          // Fabric loadFromJSON usually handles it if they are standard. 
          // Custom fonts might need FontFaceObserver logic, but we skip for Phase 1.
          window.onload = init;
        </script>
      </body>
      </html>
    `;

        await page.setContent(htmlContent);

        // Wait for the signal
        try {
            await page.waitForSelector('#render-complete', { timeout: 10000 }); // 10s timeout
        } catch (e) {
            // If timeout, check if error occurred
            const errorEl = await page.$('#render-error');
            if (errorEl) {
                const msg = await page.evaluate((el: any) => el.innerText, errorEl);
                await browser.close();
                return NextResponse.json({ error: "Canvas Render Error: " + msg }, { status: 500 });
            }
            await browser.close();
            return NextResponse.json({ error: "Render Timeout" }, { status: 500 });
        }

        // Generate PDF
        // 1050px / 300dpi = 3.5 inches
        // 600px / 300dpi = 2 inches
        const pdfBuffer = await page.pdf({
            width: '3.5in',
            height: '2in',
            printBackground: true,
            pageRanges: '1'
        });

        await browser.close();

        // Return PDF
        return new NextResponse(Buffer.from(pdfBuffer), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": "attachment; filename=business_card.pdf",
            },
        });

    } catch (error: any) {
        console.error("PDF Render Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
