# Beta tester guide (PDF)

The step-by-step TestFlight install guide sent to beta testers — Ukrainian, in the app's dark
palette (`src/theme/global.css`). Written for people who have never heard of TestFlight, and for
the **public link** route (External Testing), owner's choice 2026-10-01.

```bash
python3 -m venv .venv && .venv/bin/pip install "qrcode[pil]"
.venv/bin/python docs/beta-guide/build.py "https://testflight.apple.com/join/XXXXXXXX" ~/Desktop/Luna-Shoots-beta-guide.pdf
```

One page since 2026-10-02 (owner: "just the steps"): four steps and one line about Safari — no
phone sketches, notes or FAQ. The link argument is accepted but the template does not use it.
Rendering uses headless Chrome with its **own temporary profile** — never the running
browser — and stops it once the PDF is written, because headless Chrome does not always exit.

Button labels inside TestFlight («Прийняти», «Встановити», «Відкрити») are shown with their English
names beside them: TestFlight's Ukrainian wording was not verified on a device.
