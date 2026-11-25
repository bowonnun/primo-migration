import JSZip from "jszip";

/**
 * Minimal single-sheet .xlsx writer (no extra dependency — JSZip is already used
 * for the export zip).
 *
 * Why: a CSV carries no types, so Excel / Google Sheets turn "0812345678" into
 * 812345678 and "00000" into 0 when they open it. In an .xlsx every JS string is
 * written as a text cell and every JS number as a number cell, so phone_no,
 * zipcode and the date strings stay exactly as exported.
 */

// XML 1.0 forbids most control characters; drop them rather than produce a broken file.
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

function escapeXml(value: string): string {
  return value
    .replace(INVALID_XML_CHARS, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 0 → "A", 25 → "Z", 26 → "AA". */
function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

/**
 * Cells carry no r="A1" reference (it's optional), so every column is written —
 * a blank one as <c/> — to keep each value in its column. Keeps a 400k-row sheet
 * noticeably smaller.
 */
function cell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "<c/>";
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c><v>${value}</v></c>`;
  }
  const text = escapeXml(String(value));
  // xml:space keeps leading/trailing spaces, so the text matches the CSV exactly.
  const space = /^\s|\s$/.test(text) ? ` xml:space="preserve"` : "";
  return `<c t="inlineStr"><is><t${space}>${text}</t></is></c>`;
}

/** Rows per chunk; the full-DB sheet is too big for one JS string, so it's built as Buffers. */
const CHUNK_ROWS = 5000;

/** Builds an .xlsx (one sheet, header row + data rows) from column headers + row objects. */
export async function toXlsx<T>(headers: (keyof T & string)[], rows: T[], sheetName = "Sheet1"): Promise<Buffer> {
  const chunks: Buffer[] = [
    Buffer.from(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<dimension ref="A1:${columnName(headers.length - 1)}${rows.length + 1}"/>` +
        `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
        `<sheetData><row>${headers.map((h) => cell(h)).join("")}</row>`
    ),
  ];
  for (let start = 0; start < rows.length; start += CHUNK_ROWS) {
    let xml = "";
    for (const row of rows.slice(start, start + CHUNK_ROWS)) {
      xml += `<row>${headers.map((h) => cell(row[h])).join("")}</row>`;
    }
    chunks.push(Buffer.from(xml));
  }
  chunks.push(Buffer.from(`</sheetData></worksheet>`));
  const sheetXml = Buffer.concat(chunks);

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
      `</Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      `</Relationships>`
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
      `</Relationships>`
  );
  zip.file("xl/worksheets/sheet1.xml", sheetXml);

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
