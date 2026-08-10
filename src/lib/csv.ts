const UTF8_BOM = "﻿";

function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Builds a UTF-8 BOM-prefixed CSV string (Excel-friendly) from column headers + row objects. */
export function toCsv<T>(headers: (keyof T & string)[], rows: T[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvField(row[h])).join(","));
  }
  return UTF8_BOM + lines.join("\r\n") + "\r\n";
}
