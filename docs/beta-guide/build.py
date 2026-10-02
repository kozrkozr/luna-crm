import base64, io, os, subprocess, sys, tempfile, time
here = os.path.dirname(os.path.abspath(__file__))
link = sys.argv[1] if len(sys.argv) > 1 else ''
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, 'guide.pdf')
icon = 'data:image/png;base64,' + base64.b64encode(open(os.path.join(here, 'icon.png'), 'rb').read()).decode()
html = open(os.path.join(here, 'guide.html')).read().replace('{{ICON}}', icon)
import re
def shot(m):
    path = os.path.join(here, 'screens', m.group(1) + '.jpg')
    return 'data:image/jpeg;base64,' + base64.b64encode(open(path, 'rb').read()).decode()
html = re.sub(r'\{\{SHOT:(\d+)\}\}', shot, html)
if not link:
    sys.exit('usage: build.py <testflight public link> [out.pdf] — the guide carries the link and its QR code')
import qrcode
buf = io.BytesIO(); qrcode.make(link, border=1).save(buf, format='PNG')
html = (html.replace('{{QR_SRC}}', 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode())
            .replace('{{LINK_URL}}', link)
            .replace('{{LINK_TEXT}}', link.replace('https://', '').replace('/join/', '<br>/join/')))
src = os.path.join(here, 'rendered.html'); open(src, 'w').write(html)
profile = tempfile.mkdtemp(prefix='guide-chrome-')  # its own profile: never the user's running Chrome
chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
if os.path.exists(out): os.remove(out)
proc = subprocess.Popen([chrome, '--headless=new', '--disable-gpu', '--no-first-run', f'--user-data-dir={profile}',
    '--no-pdf-header-footer', f'--print-to-pdf={out}', 'file://' + src],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
# Headless Chrome writes the PDF and then does not always exit on its own.
deadline = time.time() + 90
last = -1
while time.time() < deadline:
    size = os.path.getsize(out) if os.path.exists(out) else -1
    if size > 0 and size == last: break
    last = size; time.sleep(1.5)
proc.terminate()
try: proc.wait(10)
except subprocess.TimeoutExpired: proc.kill()
if not os.path.exists(out): sys.exit('no PDF produced')
print(out)
