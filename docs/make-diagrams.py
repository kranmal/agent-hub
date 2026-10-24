"""Draws the guide's diagrams as PNGs into docs/img (needs Pillow)."""
from PIL import Image, ImageDraw, ImageFont
import os
OUT = os.path.join(os.path.dirname(__file__), 'img')
FONT = '/System/Library/Fonts/Helvetica.ttc'
def f(size, bold=False): return ImageFont.truetype(FONT, size, index=1 if bold else 0)
BLUE, GREEN, AMBER, GREY, INK = '#2457d6', '#3b6d11', '#b86e00', '#eef0f3', '#14181f'
FILL = {'blue': '#e8eefc', 'green': '#eaf3de', 'amber': '#faeeda', 'grey': GREY}
EDGE = {'blue': BLUE, 'green': GREEN, 'amber': AMBER, 'grey': '#8a919c'}

def canvas(w, h):
    im = Image.new('RGB', (w, h), 'white'); return im, ImageDraw.Draw(im)
def box(d, x, y, w, h, title, sub='', color='grey'):
    d.rounded_rectangle((x, y, x + w, y + h), 18, fill=FILL[color], outline=EDGE[color], width=3)
    tf = f(30, True); tw = d.textlength(title, font=tf)
    ty = y + (h - (38 + (34 * len(sub.split('\n')) if sub else 0))) / 2
    d.text((x + (w - tw) / 2, ty), title, font=tf, fill=INK)
    for i, line in enumerate(sub.split('\n') if sub else []):
        sf = f(24); sw = d.textlength(line, font=sf)
        d.text((x + (w - sw) / 2, ty + 42 + i * 32), line, font=sf, fill='#5f6773')
def arrow(d, x1, y1, x2, y2, label=''):
    d.line((x1, y1, x2, y2), fill='#5f6773', width=4)
    import math
    a = math.atan2(y2 - y1, x2 - x1)
    for s in (-0.45, 0.45):
        d.line((x2, y2, x2 - 22 * math.cos(a + s), y2 - 22 * math.sin(a + s)), fill='#5f6773', width=4)
    if label:
        lf = f(22); lw = d.textlength(label, font=lf)
        d.text(((x1 + x2) / 2 - lw / 2, (y1 + y2) / 2 - 34), label, font=lf, fill='#5f6773')
def title(d, t, w): d.text((40, 28), t, font=f(36, True), fill=INK)

# 1. architecture
im, d = canvas(1800, 980); title(d, 'How the pieces fit together', 1800)
box(d, 60, 400, 300, 150, 'You', 'in your web browser', 'amber')
box(d, 480, 380, 380, 190, 'Agent Hub', 'one page: localhost:4750\nstarts and watches the rest', 'blue')
box(d, 1000, 130, 340, 150, 'Perf server', 'port 4748', 'grey')
box(d, 1000, 395, 340, 150, 'QA server', 'port 4747', 'grey')
box(d, 1000, 700, 340, 150, 'Pretty CSV', 'runs inside the page', 'green')
box(d, 1460, 255, 300, 190, 'Claude Code', 'runs the agent teams\nin the background', 'blue')
box(d, 1460, 520, 300, 190, 'Reports', 'PDFs, CSV, results\nsaved on your Mac', 'green')
arrow(d, 360, 475, 480, 475); arrow(d, 860, 440, 1000, 205); arrow(d, 860, 475, 1000, 470); arrow(d, 860, 520, 1000, 775)
arrow(d, 1340, 205, 1460, 330); arrow(d, 1340, 470, 1460, 400); arrow(d, 1610, 445, 1610, 520)
d.text((60, 900), 'Everything runs on your own computer. Nothing is opened to the internet.', font=f(26), fill='#5f6773')
im.save(os.path.join(OUT, 'architecture.png'))

# 2. setup journey
steps = [('1', 'Check tools', 'Node, Git,\nClaude Code, k6'), ('2', 'Download', 'three projects\nside by side'),
         ('3', 'Install agents', 'run install.sh\nin both teams'), ('4', 'Sign in', 'claude auth login'),
         ('5', 'Start the hub', 'node server.mjs'), ('6', 'Open it', 'localhost:4750')]
im, d = canvas(1800, 420); title(d, 'Getting set up: six steps', 1800)
for i, (n, t, s) in enumerate(steps):
    x = 40 + i * 290
    box(d, x, 120, 240, 230, f'{n}. {t}', s, 'blue' if i < 5 else 'green')
    if i < 5: arrow(d, x + 240, 235, x + 290, 235)
im.save(os.path.join(OUT, 'setup.png'))

# 3. perf two phases
im, d = canvas(1800, 520); title(d, 'Performance team: two phases and one approval', 1800)
box(d, 40, 150, 380, 220, 'Phase 1: Strategy', 'reads your site or code\nwrites a strategy PDF\nnothing is tested yet', 'blue')
box(d, 560, 150, 300, 220, 'You approve', 'read the PDF,\nthen click Approve', 'amber')
box(d, 1000, 150, 380, 220, 'Phase 2: Build and run', 'writes k6 scripts\nsmoke, load, stress, spike', 'blue')
box(d, 1500, 150, 260, 220, 'Results PDF', 'pass/fail, speed,\nlimits, advice', 'green')
arrow(d, 420, 260, 560, 260); arrow(d, 860, 260, 1000, 260); arrow(d, 1380, 260, 1500, 260)
d.text((40, 440), 'Remote sites are refused unless allow-listed. Never point it at production or other people\'s sites.', font=f(26), fill='#5f6773')
im.save(os.path.join(OUT, 'perf-flow.png'))

# 4. QA team
im, d = canvas(1800, 640); title(d, 'QA team: five helpers, one order', 1800)
box(d, 40, 230, 280, 190, 'qa-lead', 'plans the work', 'amber')
box(d, 420, 110, 330, 170, 'change-scanner', 'update runs only', 'grey')
box(d, 420, 350, 330, 190, 'spec-writers', 'one per area,\nall at the same time', 'blue')
box(d, 860, 230, 300, 190, 'test-runner', 'runs every test,\ntriages failures', 'blue')
box(d, 1260, 230, 280, 190, 'report-builder', '3 PDFs + Zephyr CSV', 'green')
box(d, 1620, 255, 150, 140, 'You', '', 'amber')
arrow(d, 320, 300, 420, 195); arrow(d, 320, 350, 420, 440); arrow(d, 750, 440, 860, 350); arrow(d, 1160, 325, 1260, 325); arrow(d, 1540, 325, 1620, 325)
im.save(os.path.join(OUT, 'qa-flow.png'))

# 5. run all
im, d = canvas(1800, 380); title(d, 'Run all: one click, two teams, in order', 1800)
box(d, 60, 130, 400, 190, '1. Perf strategy', 'PDF, then it stops', 'blue')
box(d, 640, 130, 400, 190, '2. QA full run', 'tests and reports', 'blue')
box(d, 1220, 130, 480, 190, 'Perf phase 2 is separate', 'only after you approve', 'amber')
arrow(d, 460, 225, 640, 225, 'then'); arrow(d, 1040, 225, 1220, 225)
im.save(os.path.join(OUT, 'run-all.png'))
