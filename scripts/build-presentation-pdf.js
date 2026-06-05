/**
 * Builds Cahier_de_Presentation_Lika.pdf from the Markdown source.
 *
 *   1. Markdown -> HTML (tiny self-contained converter, no deps)
 *   2. Wrap in a print-styled HTML document
 *   3. Microsoft Edge headless --print-to-pdf
 *
 * Run:  node scripts/build-presentation-pdf.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MD = path.join(ROOT, 'Cahier_de_Presentation_Lika.md');
const HTML = path.join(ROOT, 'Cahier_de_Presentation_Lika.html');
const PDF = path.join(ROOT, 'Cahier_de_Presentation_Lika.pdf');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

// ── Minimal Markdown → HTML ────────────────────────────────────────────────
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inline(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function convert(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0;
  const flushTable = (rows) => {
    // rows: array of raw "| a | b |" strings; second row is the separator
    const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    const head = cells(rows[0]);
    const body = rows.slice(2).map(cells);
    out.push('<table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>');
    for (const r of body) out.push('<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>');
    out.push('</tbody></table>');
  };

  while (i < lines.length) {
    let line = lines[i];

    if (/^\s*$/.test(line)) { i++; continue; }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) { out.push('<hr/>'); i++; continue; }

    // Headings
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { const lv = h[1].length; out.push(`<h${lv}>${inline(h[2])}</h${lv}>`); i++; continue; }

    // Blockquote (possibly multi-line)
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
      continue;
    }

    // Table
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s:\-|]+\|?\s*$/.test(lines[i + 1])) {
      const buf = [];
      while (i < lines.length && /^\|/.test(lines[i])) { buf.push(lines[i]); i++; }
      flushTable(buf);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      out.push('<ol>');
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        out.push(`<li>${inline(lines[i].replace(/^\d+\.\s+/, ''))}</li>`); i++;
      }
      out.push('</ol>');
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      out.push('<ul>');
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        out.push(`<li>${inline(lines[i].replace(/^[-*]\s+/, ''))}</li>`); i++;
      }
      out.push('</ul>');
      continue;
    }

    // Paragraph (gather until blank)
    const buf = [line];
    i++;
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#|>|\||[-*]\s|\d+\.\s|---)/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}

const GOLD = '#B5822D';
const css = `
  @page { size: A4; margin: 20mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; color: #1f2328; font-size: 11pt; line-height: 1.55; }
  h1 { color: ${GOLD}; font-size: 26pt; border-bottom: 3px solid ${GOLD}; padding-bottom: 8px; margin: 0 0 4px; }
  h2 { color: #111; font-size: 16pt; margin: 26px 0 8px; border-left: 4px solid ${GOLD}; padding-left: 10px; }
  h3 { color: ${GOLD}; font-size: 13pt; margin: 18px 0 4px; }
  h4 { color: #333; font-size: 11.5pt; margin: 14px 0 4px; }
  p { margin: 6px 0; }
  a { color: ${GOLD}; text-decoration: none; }
  code { background: #f4efe6; padding: 1px 5px; border-radius: 4px; font-family: Consolas, monospace; font-size: 9.5pt; }
  hr { border: none; border-top: 1px solid #e5ddcd; margin: 16px 0; }
  ul, ol { margin: 6px 0 6px 4px; padding-left: 22px; }
  li { margin: 3px 0; }
  blockquote { background: #faf6ee; border-left: 4px solid ${GOLD}; margin: 12px 0; padding: 8px 14px; color: #4a4133; font-size: 10.5pt; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10pt; }
  th { background: ${GOLD}; color: #fff; text-align: left; padding: 7px 10px; }
  td { border: 1px solid #e5ddcd; padding: 6px 10px; vertical-align: top; }
  tr:nth-child(even) td { background: #faf7f0; }
  h2 { page-break-after: avoid; }
  table, blockquote { page-break-inside: avoid; }
`;

const bodyHtml = convert(fs.readFileSync(MD, 'utf8'));
const doc = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Cahier de Présentation — Lika</title><style>${css}</style></head><body>${bodyHtml}</body></html>`;
fs.writeFileSync(HTML, doc, 'utf8');
console.log('HTML écrit :', HTML);

execFileSync(EDGE, [
  '--headless',
  '--disable-gpu',
  '--no-pdf-header-footer',
  `--print-to-pdf=${PDF}`,
  'file:///' + HTML.replace(/\\/g, '/'),
], { stdio: 'inherit' });

console.log('PDF généré :', PDF);
