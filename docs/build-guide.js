// Builds Agent-Hub-User-Guide.docx. Run: node docs/build-guide.js   (needs the "docx" npm package)
const fs = require('fs');
const path = require('path');
const D = require('docx');
const { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, HeadingLevel, AlignmentType, LevelFormat, Footer, PageNumber, PageBreak } = D;

const IMG = path.join(__dirname, 'img');
const W = 9360; // content width, US Letter with 1" margins
const BLUE = '2457D6', GREY = '5F6773', INK = '14181F';

const png = (p) => { const b = fs.readFileSync(p); return { data: b, w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const image = (rel, widthPx = 620, alt = '') => {
  const i = png(path.join(IMG, rel));
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, children: [new ImageRun({ type: 'png', data: i.data, transformation: { width: widthPx, height: Math.round(widthPx * i.h / i.w) }, altText: { title: alt, description: alt, name: alt } })] });
};
const caption = (t) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: t, italics: true, size: 20, color: GREY })] });

const runs = (t, o = {}) => String(t).split(/(\*\*[^*]+\*\*|`[^`]+`)/).filter(Boolean).map((s) =>
  s.startsWith('**') ? new TextRun({ text: s.slice(2, -2), bold: true, ...o })
    : s.startsWith('`') ? new TextRun({ text: s.slice(1, -1), font: 'Menlo', size: 20, ...o })
      : new TextRun({ text: s, ...o }));
const p = (t, o = {}) => new Paragraph({ spacing: { after: 120 }, ...o, children: runs(t) });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun(t)] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const bullet = (t) => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 60 }, children: runs(t) });
const num = (t, ref = 'num') => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 80 }, children: runs(t) });

const bd = { style: BorderStyle.SINGLE, size: 4, color: 'D5D9E0' };
const borders = { top: bd, bottom: bd, left: bd, right: bd };
const cell = (t, w, o = {}) => new TableCell({
  width: { size: w, type: WidthType.DXA }, borders, margins: { top: 70, bottom: 70, left: 110, right: 110 },
  shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
  children: [new Paragraph({ children: runs(t, o.head ? { bold: true, color: INK } : {}) })],
});
const table = (head, rows, widths) => new Table({
  width: { size: W, type: WidthType.DXA }, columnWidths: widths,
  rows: [new TableRow({ tableHeader: true, children: head.map((t, i) => cell(t, widths[i], { fill: 'EEF0F3', head: true })) }),
    ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, widths[i])) }))],
});
const spacer = () => new Paragraph({ spacing: { after: 120 }, children: [] });

// grey code block with a blue bar
const code = (lines) => lines.map((l, i) => new Paragraph({
  spacing: { after: i === lines.length - 1 ? 160 : 0 }, indent: { left: 200 },
  shading: { type: ShadingType.CLEAR, fill: 'F1F3F6', color: 'auto' },
  border: { left: { style: BorderStyle.SINGLE, size: 24, color: BLUE, space: 8 } },
  children: [new TextRun({ text: l || ' ', font: 'Menlo', size: 20 })],
}));
const callout = (label, text, fill, color) => new Table({
  width: { size: W, type: WidthType.DXA }, columnWidths: [W],
  rows: [new TableRow({ children: [new TableCell({
    width: { size: W, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 160, right: 160 },
    borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.SINGLE, size: 24, color } },
    shading: { fill, type: ShadingType.CLEAR, color: 'auto' },
    children: [new Paragraph({ children: [new TextRun({ text: label + '  ', bold: true, color }), ...runs(text)] })],
  })] })],
});
const tip = (t) => [callout('Tip', t, 'E8EEFC', BLUE), spacer()];
const see = (t) => [callout('You should see', t, 'EAF3DE', '3B6D11'), spacer()];
const fix = (t) => [callout('If it does not work', t, 'FAEEDA', 'B86E00'), spacer()];

const c = [];

// ---------- Cover
c.push(new Paragraph({ spacing: { before: 2400, after: 120 }, children: [new TextRun({ text: 'Agent Hub', bold: true, size: 84, color: INK })] }));
c.push(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: 'User Guide', size: 48, color: BLUE })] }));
c.push(p('One local web page for the Performance Agent Team, the QA Agent Team and Pretty CSV. This guide starts with getting it running, then shows how to use each part.', { spacing: { after: 400 } }));
c.push(image('architecture.png', 600, 'How the pieces fit together'));
c.push(caption('Everything runs on your own computer.'));
// ---------- Contents (plain list)
c.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun('What is in this guide')] }));
[['Part 1', 'Get it running, step by step'], ['Part 2', 'A tour of the Agent Hub page'], ['Part 3', 'Using the Performance Agent Team'], ['Part 4', 'Using the QA Agent Team'], ['Part 5', 'Using Pretty CSV'], ['Part 6', 'What it costs, and staying safe'], ['Part 7', 'When something goes wrong']]
  .forEach(([a, b]) => c.push(p(`**${a}.** ${b}`)));
c.push(spacer());
c.push(h2('What each part is, in plain English'));
c.push(table(['Part', 'What it does'], [
  ['**Agent Hub**', 'The one page you open. It starts the other two teams for you, shows what each is doing, and tracks what each run cost.'],
  ['**Performance team**', 'Five AI helpers that find out how fast your site is and how many people it can handle. They first write a plan for you to approve, then run the tests.'],
  ['**QA team**', 'Five AI helpers that write and run tests for a website or app, then give you reports on what works and what is broken.'],
  ['**Pretty CSV**', 'A viewer that turns any CSV file into a clean table you can sort, style and export. Your data never leaves your computer.'],
], [2200, 7160]));

// ---------- Part 1
c.push(h1('Part 1. Get it running, step by step'));
c.push(p('There are six steps and they take about 15 minutes. You do not need to be technical. If you can copy and paste, you can do this.'));
c.push(image('setup.png', 620, 'The six setup steps'));
c.push(caption('The six steps, in order.'));
c.push(callout('What is Terminal?', 'It is a Mac app where you type commands. Press **Cmd + Space**, type **Terminal** and press **Return**. Keep the same window open for the whole setup. Grey boxes with a blue bar are text to copy into it, followed by Return.', 'F1F3F6', GREY));
c.push(spacer());

c.push(h2('Step 1. Check you have what you need'));
c.push(table(['You need', 'How to check', 'If missing'], [
  ['Node.js 18 or newer', '`node --version`', 'Install from nodejs.org'],
  ['Git', '`git --version`', 'Install from git-scm.com'],
  ['Claude Code', '`claude --version`', 'Follow the steps at claude.com/claude-code'],
  ['k6 (only for Performance tests)', '`k6 version`', '`brew install k6`'],
], [3000, 3000, 3360]));
c.push(spacer());
c.push(...see('A version number after each command. The exact numbers will differ.'));

c.push(h2('Step 2. Download the three projects'));
c.push(p('Everything is in one repository: the hub, the Performance team, the QA team and Pretty CSV.'));
c.push(...code(['git clone https://github.com/kranmal/agent-hub.git', 'cd agent-hub']));
c.push(...see('A folder called agent-hub that contains qa-agent-team and perf-agent-team.'));
c.push(...tip('Keep the folder where it is. The hub finds the two teams inside it. If you keep copies elsewhere, see the settings in Part 7.'));

c.push(h2('Step 3. Install the helpers'));
c.push(p('Each team is a group of helpers. This copies them to where Claude Code can find them. You only do this once.'));
c.push(...code(['(cd qa-agent-team && ./install.sh)', '(cd perf-agent-team && ./install.sh)']));
c.push(...see('Lines starting with "Installed:" and then "Done." for each team.'));
c.push(...fix('If you see "Exists, skipping", the helpers are already there, which is fine. If you see "Permission denied", type `chmod +x install.sh` and try again.'));

c.push(h2('Step 4. Sign in to Claude Code'));
c.push(p('The teams do their work through Claude Code, which signs in separately from the Claude desktop app. Skipping this is the most common reason a first run fails.'));
c.push(...code(['claude auth login']));
c.push(p('Your browser opens. Sign in with your Claude account and approve the request.'));
c.push(...see('The words "Login successful". To check later, type `claude auth status`.'));

c.push(h2('Step 5. Start the Agent Hub'));
c.push(...code(['node server.mjs']));
c.push(...see('A line saying the hub is listening on http://127.0.0.1:4750. Leave this window open while you use the hub.'));
c.push(p('The hub starts the Performance and QA dashboards for you in the background if they are not already running.'));

c.push(h2('Step 6. Open it'));
c.push(p('Go to **http://127.0.0.1:4750** in your web browser. The left side shows Overview, Perf team, QA team, Pretty CSV, Estimate, Spend, Reports and Run history. At the bottom left it says whether the Perf and QA servers are up.'));
c.push(p('**Setup is finished.** The next parts show how to use it.'));
c.push(h2('Optional: start runs from a Claude desktop chat'));
c.push(p('Both teams can also be driven from a normal Claude desktop chat. Run this once in each team folder, then quit Claude desktop fully (Cmd + Q) and open it again:'));
c.push(...code(['node interface/setup.mjs --write']));
c.push(p('It saves a backup of your Claude desktop settings first. Run it without `--write` to see what it would change without changing anything. The hub works fine without this step.'));

// ---------- Part 2
c.push(h1('Part 2. A tour of the Agent Hub page'));
c.push(h2('The top bar'));
c.push(table(['Control', 'What it does'], [
  ['**Target**', 'What to test: a website address (https://...) or a project folder on your Mac. Every tool uses this. Addresses you used before appear as suggestions.'],
  ['**Model**', 'Which Claude model the agents use. The default is Sonnet, which is the cheapest sensible choice. Opus and Fable are stronger and cost more. Haiku is the cheapest.'],
  ['**Effort**', 'How hard the agents think. The default is Low. Higher settings can find more but take longer and cost more.'],
  ['**Theme**', 'Cycles Auto, Light and Dark. Auto follows your computer.'],
  ['**Run all**', 'Runs the Performance strategy and then the full QA run, one after the other.'],
], [2000, 7360]));
c.push(spacer());
c.push(p('Your choices for target, model, effort and theme are remembered in your browser.'));
c.push(h2('The pages'));
c.push(table(['Page', 'What you will find'], [
  ['**Overview**', 'Totals for spend and runs, a card for each tool with its latest status, the Run all progress, cost by tool, and live activity showing which helpers are working right now.'],
  ['**Perf team / QA team**', 'Start a run, see the helpers and their status, read the latest message from the lead, and open or download the reports.'],
  ['**Pretty CSV**', 'The CSV viewer, inside the page.'],
  ['**Estimate**', 'Type a website, a public GitHub repo address or a folder, and get a low, expected and high cost for each run before you start anything.'],
  ['**Spend**', 'What each finished run cost, as a bar chart, with totals and the average per run.'],
  ['**Reports**', 'Every report from the latest Perf and QA runs in one list.'],
  ['**Run history**', 'Every run with its target, status, cost, time and model.'],
], [2400, 6960]));
c.push(spacer());
c.push(h2('Run all'));
c.push(image('run-all.png', 600, 'Run all'));
c.push(caption('Run all does the two steps in order and stops if one fails.'));
c.push(p('Click **Run all** after entering a target. The hub runs the Performance strategy first, then the full QA run. If a step fails, the chain stops and tells you why. You can cancel at any time from the Overview.'));
c.push(callout('Important', 'Run all never starts the Performance load tests by itself. After the strategy is written, you read it and approve it on the Perf team page. See Part 3.', 'FAEEDA', 'B86E00'));
c.push(spacer());
c.push(h2('Estimating cost before you run'));
c.push(p('Open **Estimate**, enter a target in the top bar and click **Estimate cost**. The hub looks at the site or code, guesses how many feature areas it has, and shows a low, expected and high figure for the QA run, the Performance strategy and the Performance build-and-run. The figures change with the model and effort you picked, and they get more accurate as you complete real runs. Treat them as a guide, not a quote.'));

// ---------- Part 3
c.push(h1('Part 3. Using the Performance Agent Team'));
c.push(p('The Performance team tells you how fast your site is and how many people it can serve before it slows down or breaks. It uses a tool called k6 to simulate visitors.'));
c.push(image('perf-flow.png', 620, 'Performance team phases'));
c.push(caption('Two phases, with a gate in the middle that only you can open.'));
c.push(h2('The five helpers'));
c.push(table(['Helper', 'Its job'], [
  ['perf-lead', 'The manager. Plans the work, calls the other helpers, and owns the approval gate.'],
  ['perf-analyst', 'Reads your site or code without changing anything and writes down what it finds, with evidence.'],
  ['perf-script-writer', 'After you approve, writes the k6 scripts for real user journeys such as log in, search and check out.'],
  ['perf-test-runner', 'Runs the tests one at a time and checks that the test machine itself was not the bottleneck.'],
  ['perf-report-builder', 'Builds and checks the two PDFs.'],
], [2600, 6760]));
c.push(spacer());
c.push(h2('Step by step'));
[
  'Open the hub and go to **Perf team**.',
  'Enter your target in the top bar, for example a site you own or `http://localhost:3000` for an app running on your Mac.',
  'Click **Start strategy**. The helpers read the target and write a strategy PDF. Nothing is tested yet.',
  'Watch the helpers and the "Latest message" box. When the status says succeeded, open the **perf-strategy.pdf** from the Reports list.',
  'Read it. It lists what was found, the user journeys it will test, how many visitors it will simulate, the targets for speed, and any open questions.',
  'If you are happy, click **Approve strategy and run tests** and confirm. If not, change your target or notes and run the strategy again.',
  'Phase 2 builds the scripts and runs smoke, load, stress and spike tests. When it finishes, open **perf-report-latest.pdf**.',
].forEach((t) => c.push(num(t, 'perf')));
c.push(spacer());
c.push(h2('What the results report tells you'));
c.push(bullet('Whether each speed target passed or failed.'));
c.push(bullet('How response times looked, including the slowest few percent.'));
c.push(bullet('A table for each page or endpoint.'));
c.push(bullet('Where the site starts to struggle under heavy load.'));
c.push(bullet('Analysis and recommendations, in plain language.'));
c.push(h2('The test types'));
c.push(table(['Test', 'What it asks'], [
  ['Smoke', 'Does it work at all with a handful of visitors?'],
  ['Load', 'Does it cope with a normal busy day?'],
  ['Stress', 'How much can it take before it breaks?'],
  ['Spike', 'What happens if a crowd arrives suddenly?'],
  ['Soak', 'Does it stay healthy over a long time? (optional)'],
], [2200, 7160]));
c.push(spacer());
c.push(callout('Safety', 'Remote websites are refused unless they are on an allow-list in `perf.config.json`. Heavy tests on remote sites need an extra switch that the hub never turns on. Only test sites you own. Never test production or other people\'s sites.', 'FAEEDA', 'B86E00'));

// ---------- Part 4
c.push(h1('Part 4. Using the QA Agent Team'));
c.push(p('The QA team tests a website or app for you. You point it at a site, and it works out what to test, writes the tests, runs them, and hands you reports you can read and share.'));
c.push(image('qa-flow.png', 640, 'QA team helpers'));
c.push(caption('The lead plans, the writers and runner do the work, the builder makes the reports.'));
c.push(h2('The five helpers'));
c.push(table(['Helper', 'Its job'], [
  ['qa-lead', 'The manager. Looks at your project, plans the work, splits it into areas, starts the others, and writes a summary at the end.'],
  ['qa-change-scanner', 'Used for update runs. Works out what changed since the last full run so only new or changed parts need new tests.'],
  ['qa-spec-writer', 'Writes the tests for one area. Several run at once. They cover normal use, edge cases such as very long or empty input, error handling and accessibility.'],
  ['qa-test-runner', 'Runs every test. For each failure it decides if it is a real bug, a mistake in the test, or just flaky, fixes test mistakes and records real bugs.'],
  ['qa-report-builder', 'Builds the three PDF reports and the Zephyr CSV, and checks each one looks right.'],
], [2600, 6760]));
c.push(spacer());
c.push(h2('Step by step'));
[
  'Go to **QA team** in the hub and enter your target. It can be a website address or a project folder.',
  'Click **Start full run** for a first run. After your site changes, use **Start update run** instead, which is quicker and cheaper because only missing tests are written.',
  'Watch the helpers. A blue status means working and green means finished. The "Latest message" box is the lead\'s plain-words update.',
  'When the status says succeeded, open the reports from the list. Start with the bug report.',
].forEach((t) => c.push(num(t, 'qa')));
c.push(spacer());
c.push(image('shots/qa-dashboard.png', 560, 'QA dashboard'));
c.push(caption('The QA dashboard that sits behind the hub, showing a run in progress.'));
c.push(image('shots/qa-finished.png', 480, 'QA finished run'));
c.push(caption('A finished run. Reports are listed under Outputs.'));
c.push(h2('The reports you get'));
c.push(table(['File', 'What it is'], [
  ['`reports/bug-report-latest.pdf`', 'The bugs found, how serious each is, how to reproduce it, and screenshots. **Start here.**'],
  ['`reports/qa-report-latest.pdf`', 'The main test report: coverage, edge cases, error handling, test data and screenshots.'],
  ['`reports/a11y-report-latest.pdf`', 'Accessibility problems, based on the WCAG standard.'],
  ['`manual/zephyr-import.csv`', 'Manual tests (things a person must check) in the format Zephyr Scale imports.'],
  ['`coverage/COVERAGE.md`', 'A running record of what is covered.'],
], [3800, 5560]));
c.push(spacer());
c.push(callout('Good to know', 'Tests that fail in the report are normal. Real bugs are meant to fail. A run keeps going even if you close the browser, so come back later and check the status. If your site has a test login, put it in the notes. Never give it a real password.', 'E8EEFC', BLUE));
c.push(spacer());
c.push(p('A real example: on https://example.com a full run took about 12 minutes and cost about $2.56. It wrote 39 tests, 37 passed, and it found 3 real accessibility problems. Larger sites take longer and cost more.'));

// ---------- Part 5
c.push(h1('Part 5. Using Pretty CSV'));
c.push(p('Pretty CSV turns any CSV file into a clean, readable table. Format it your way and export it as CSV, JSON, Excel or Zephyr Scale. Everything runs in your browser and your data is never uploaded.'));
c.push(callout('Two ways to open it', 'Click **Pretty CSV** in the hub, or open the file `PrettyCSV.html` by double-clicking it. It works offline and remembers your style choices.', 'E8EEFC', BLUE));
c.push(spacer());
c.push(image('shots/csv-start.png', 600, 'Pretty CSV start screen'));
c.push(caption('The start screen: settings on the left, the drop zone on the right.'));
c.push(h2('1. Load your CSV'));
c.push(bullet('Drag a .csv file onto the page.'));
c.push(bullet('Click **CSV...** to browse for a file.'));
c.push(bullet('Paste text into the box on the left and click **Load pasted text**.'));
c.push(bullet('Click **Try sample** to explore with demo data.'));
c.push(p('It detects the delimiter (comma, semicolon, tab or pipe) and whether each column holds text, numbers or dates. If columns look wrong, change **Delimiter**. Untick **First row is header** if your file has no header row.'));
c.push(image('shots/csv-table.png', 600, 'Sample data loaded'));
c.push(caption('Sample data: dates, currency, percentages, status badges and links.'));
c.push(h2('2. Search and sort'));
c.push(p('Type in **Search rows...** to keep only matching rows. Click a column heading to sort ascending, again for descending, and a third time to clear. Use **Rows per page** to show 25, 100, 500 or all rows.'));
c.push(h2('3. Make it pretty'));
c.push(p('The **Look and theme** section changes the whole appearance instantly.'));
c.push(image('shots/csv-look.png', 220, 'Look and theme controls'));
c.push(table(['Control', 'What it does'], [
  ['Colour swatches', 'Seven colour themes for headers, accents, bars and badges.'],
  ['Mode', 'Light or Dark.'],
  ['Header style', 'Solid, Tint or Line.'],
  ['Header text', 'Normal, UPPERCASE or Title Case.'],
  ['Font, Text size, Spacing, Lines', 'Pick the font, make text bigger or smaller, set row height, and choose row lines or a full grid.'],
], [3000, 6360]));
c.push(spacer());
c.push(p('Below that are tick boxes for zebra stripes, wrapped text, row numbers, a sticky header, a frozen first column, rounded corners, red negatives, clickable links, a table title and a totals row (sum or average of every number column).'));
c.push(h2('4. Format individual columns'));
c.push(p('In the **Columns** section, click a column name to open its settings. Untick the box beside a name to hide it, including in exports.'));
c.push(table(['Setting', 'Options'], [
  ['Name and Align', 'Rename the heading. Auto, Left, Centre or Right.'],
  ['Type', 'Text, Number or Date. Change it if Pretty CSV guessed wrong.'],
  ['Number format', 'Commas, $ EUR GBP currency, percent, or compact (1.2K).'],
  ['Date format', 'Oct 24, 2026 or Saturday, October 24, 2026 or 2026-10-24 or 10/24/2026.'],
  ['Visual', 'Data bars or a heat map for numbers; coloured badges for text such as statuses.'],
], [3000, 6360]));
c.push(spacer());
c.push(h2('5. Zephyr Scale view'));
c.push(p('If your CSV holds test cases, Pretty CSV can show it the way Zephyr Scale would after an import: one card per test case with its details and a table of steps.'));
[
  'Load your file and click **Zephyr Scale** in the toolbar.',
  'Check the column mapping. Headings are matched automatically. Change any match with the drop-downs and pick a default Status and Priority for blanks.',
  'Click **Show Zephyr Scale view**. Rows that share the same Name are treated as steps of one test case.',
  'Click **Download Zephyr CSV** for a file ready to import into Zephyr Scale. Click **Table** to go back.',
].forEach((t) => c.push(num(t, 'zeph')));
c.push(spacer());
c.push(image('shots/csv-zephyr.png', 600, 'Zephyr Scale view'));
c.push(caption('Test cases with status, priority, folder, labels and steps.'));
c.push(h2('6. Export your work'));
c.push(p('Exports use what you currently see: your search, sort, hidden columns and renamed headings.'));
c.push(table(['Button', 'What you get'], [
  ['Copy as TSV', 'Copies the table. Paste straight into Excel or Google Sheets.'],
  ['Download CSV / JSON', 'A clean CSV, or JSON with real numbers, ISO dates and null for blanks.'],
  ['Excel (.xlsx)', 'A real workbook with a coloured header row, frozen header, filters and sized columns.'],
  ['Zephyr Scale...', 'Opens the mapping window, then downloads an import CSV.'],
  ['Styled HTML', 'One web page that keeps your colours. Good for emailing.'],
  ['Print / PDF', 'Opens the print dialog. Choose Save as PDF.'],
  ['Reset formatting', 'Puts every look and table option back to default.'],
], [3000, 6360]));
c.push(spacer());
c.push(h2('Quick fixes'));
c.push(table(['Problem', 'Fix'], [
  ['Everything is in one column', 'Set Delimiter to the right character.'],
  ['The first data row became the heading, or the reverse', 'Tick or untick First row is header.'],
  ['A number column shows as text', 'Open the column and change Type.'],
  ['Zip codes or IDs lost leading zeros', 'Set the column Type to Text.'],
  ['My settings disappeared', 'They are stored in your browser. Private windows or cleared site data reset them.'],
  ['A large file is slow', 'Keep Rows per page at 100 or 500, not All.'],
], [4000, 5360]));

// ---------- Part 6
c.push(h1('Part 6. What it costs, and staying safe'));
c.push(h2('Cost'));
c.push(p('Every run uses your Claude usage through the account Claude Code is signed in to. The hub shows what each finished run cost in three places: the Overview (totals and cost by tool), **Spend** (each run as a bar) and **Run history** (every run with model and time).'));
c.push(bullet('The default of **Sonnet at Low effort** keeps cost down. Raise it only when you need more depth.'));
c.push(bullet('Use **Estimate** before a big run to see a low, expected and high figure.'));
c.push(bullet('After a site changes, use the QA **update run**, not a full run.'));
c.push(bullet('The Performance strategy is much cheaper than the build-and-run phase. Read the strategy first.'));
c.push(h2('Safety'));
c.push(bullet('**Private by design.** The hub and both dashboards only listen on your own computer, reject requests from other websites and other host names, and only serve files from the report folders.'));
c.push(bullet('**Agents can run commands.** A background run cannot stop and ask permission, so it is pre-approved to read and write files and run commands in the project being tested. Only point it at projects where that is acceptable.'));
c.push(bullet('**Performance tests are rate-limited by rules.** Remote hosts need an allow-list entry, and the hub never switches on heavy remote tests.'));
c.push(bullet('**Never give real passwords.** If your site needs a login, use a test account.'));
c.push(bullet('**Phase 2 always needs your approval.** Run all stops after the Performance strategy.'));
c.push(h2('Where things are kept'));
c.push(table(['Where', 'What is there'], [
  ['Your agent-hub folder', 'The hub, both teams and Pretty CSV.'],
  ['`~/.claude/agents/`', 'The helpers copied there by install.sh.'],
  ['`~/.qa-agent-team-ui/`', 'A record of every QA run and the folders for each website tested, including its reports.'],
  ['`~/.perf-agent-team-ui/`', 'The same for Performance runs.'],
], [3600, 5760]));

// ---------- Part 7
c.push(h1('Part 7. When something goes wrong'));
c.push(table(['Problem', 'What to do'], [
  ['The hub says "address already in use"', 'A copy is already running on port 4750. Open http://127.0.0.1:4750 or stop the other copy. To use another port, run `HUB_PORT=4760 node server.mjs`.'],
  ['The footer says Perf or QA server is down', 'Wait a few seconds; the hub starts them. If it stays down, check the team folders are next to agent-hub, or set `HUB_QA_DIR` and `HUB_PERF_DIR` to their paths.'],
  ['"Claude Code CLI is not logged in"', 'Run `claude auth login` in Terminal. The desktop app signs in separately.'],
  ['"qa-lead agent not found" or "perf-lead not found"', 'Run `./install.sh` from that team\'s folder.'],
  ['A run fails straight away', 'Open the run and read the red error. It is almost always a sign-in problem.'],
  ['Performance run refuses the target', 'The host is not on the allow-list in `perf.config.json`. Add it only if you own the site.'],
  ['k6 not found', 'Run `brew install k6`.'],
  ['Claude desktop does not show the QA or Perf tools', 'Run `node interface/setup.mjs --write` again in that team folder, then quit with Cmd + Q and reopen.'],
  ['Cost shows n/a', 'The run has not finished yet, or it was cancelled before Claude reported a total.'],
  ['You moved a team folder', 'Move it back, or set `HUB_QA_DIR` / `HUB_PERF_DIR`. Run the desktop setup again if you use it.'],
], [3600, 5760]));
c.push(spacer());
c.push(h2('Settings you can change'));
c.push(table(['Setting', 'Default', 'What it does'], [
  ['`HUB_PORT`', '4750', 'Port for the Agent Hub.'],
  ['`HUB_QA_DIR`', './qa-agent-team', 'Where the QA team project is.'],
  ['`HUB_PERF_DIR`', './perf-agent-team', 'Where the Performance team project is.'],
  ['`QA_UI_PORT`', '4747', 'Port for the QA dashboard.'],
  ['`PERF_UI_PORT`', '4748', 'Port for the Performance dashboard.'],
], [2800, 2800, 3760]));
c.push(spacer());
c.push(p('To remove everything, delete the three project folders and the two hidden `~/.qa-agent-team-ui` and `~/.perf-agent-team-ui` folders. If you ran the Claude desktop setup, remove the entries it added from the Claude desktop settings file, or restore the backup it saved.'));

const doc = new Document({
  creator: 'Agent Hub', title: 'Agent Hub User Guide',
  styles: {
    default: { document: { run: { font: 'Arial', size: 22, color: INK } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 40, bold: true, font: 'Arial', color: INK }, paragraph: { spacing: { before: 120, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, font: 'Arial', color: BLUE }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1, keepNext: true } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      ...['num', 'perf', 'qa', 'zeph'].map((r) => ({ reference: r, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] })),
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Agent Hub User Guide  |  page ', size: 18, color: GREY }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GREY })] })] }) },
    children: c,
  }],
});
Packer.toBuffer(doc).then((b) => { const out = path.join(__dirname, 'Agent-Hub-User-Guide.docx'); fs.writeFileSync(out, b); console.log('wrote', out); });
