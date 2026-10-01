# Beta tester guide (PDF)

The step-by-step TestFlight install guide sent to beta testers — Ukrainian, in the app's dark
palette (`src/theme/global.css`). Written for people who have never heard of TestFlight, and for
the **public link** route (External Testing), owner's choice 2026-10-01.

```bash
python3 -m venv .venv && .venv/bin/pip install "qrcode[pil]"
.venv/bin/python docs/beta-guide/build.py "https://testflight.apple.com/join/XXXXXXXX" ~/Desktop/Luna-Shoots-beta-guide.pdf
```

Two pages since 2026-10-01 (owner): what is needed, and the three install steps. The
registration, feedback and FAQ pages were cut, and with them the page that carried the link and
QR code — the link argument is accepted but nothing in the template uses it now. Rendering uses headless Chrome with its **own temporary profile** — never the running
browser — and stops it once the PDF is written, because headless Chrome does not always exit.

Button labels inside TestFlight («Прийняти», «Встановити», «Відкрити») are shown with their English
names beside them: TestFlight's Ukrainian wording was not verified on a device.
