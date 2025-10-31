"""Small helper to peek into XLSX sheets without needing extra dependencies."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Iterable
import xml.etree.ElementTree as ET
import zipfile

NAMESPACE = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def load_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    xml_bytes = zf.read("xl/sharedStrings.xml")
    root = ET.fromstring(xml_bytes)
    strings: list[str] = []
    for si in root.findall("m:si", NAMESPACE):
        text = "".join(t.text or "" for t in si.findall(".//m:t", NAMESPACE))
        strings.append(text)
    return strings


def read_sheet(zf: zipfile.ZipFile, rel_id: str, shared: list[str]) -> list[list[Any]]:
    sheet_xml = zf.read(f"xl/worksheets/{rel_id}.xml")
    root = ET.fromstring(sheet_xml)
    rows: list[list[Any]] = []
    for row in root.findall(".//m:row", NAMESPACE):
        row_values: list[Any] = []
        for cell in row.findall("m:c", NAMESPACE):
            cell_type = cell.get("t")
            value_el = cell.find("m:v", NAMESPACE)
            if value_el is None:
                row_values.append("")
                continue
            value = value_el.text or ""
            if cell_type == "s":
                index = int(value)
                value = shared[index]
            else:
                try:
                    if "." in value:
                        value = float(value)
                    else:
                        value = int(value)
                except ValueError:
                    pass
            row_values.append(value)
        rows.append(row_values)
    return rows


def load_relationships(zf: zipfile.ZipFile) -> dict[str, str]:
    rels_xml = zf.read("xl/_rels/workbook.xml.rels")
    root = ET.fromstring(rels_xml)
    relationships: dict[str, str] = {}
    for rel in root.findall("m:Relationship", {"m": "http://schemas.openxmlformats.org/package/2006/relationships"}):
        target = rel.get("Target", "")
        if target.startswith("worksheets/"):
            rel_id = rel.get("Id")
            sheet_name = Path(target).stem
            if rel_id:
                relationships[rel_id] = sheet_name
    return relationships


def list_sheets(zf: zipfile.ZipFile) -> list[dict[str, str]]:
    workbook_xml = zf.read("xl/workbook.xml")
    root = ET.fromstring(workbook_xml)
    sheets = []
    for sheet in root.findall("m:sheets/m:sheet", NAMESPACE):
        sheets.append(
            {
                "name": sheet.get("name", ""),
                "sheetId": sheet.get("sheetId", ""),
                "relationshipId": sheet.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id", ""),
            }
        )
    return sheets


def preview_rows(rows: list[list[Any]], limit: int) -> list[list[Any]]:
    preview = []
    for row in rows:
        preview.append(row)
        if len(preview) >= limit:
            break
    return preview


def main() -> None:
    parser = argparse.ArgumentParser(description="Preview XLSX sheet contents.")
    parser.add_argument("path", type=Path, help="Path to the .xlsx file")
    parser.add_argument("--sheet", help="Target sheet name. Lists all sheets when omitted.")
    parser.add_argument("--limit", type=int, default=10, help="Number of rows to display (default 10)")
    args = parser.parse_args()

    with zipfile.ZipFile(args.path) as zf:
        shared = load_shared_strings(zf)
        sheets = list_sheets(zf)
        rels = load_relationships(zf)

        if not args.sheet:
            print(json.dumps(sheets, ensure_ascii=False, indent=2))
            return

        sheet_info = next((sheet for sheet in sheets if sheet["name"] == args.sheet), None)
        if not sheet_info:
            raise SystemExit(
                f"Sheet '{args.sheet}' not found. Available: {[s['name'] for s in sheets]}"
            )

        rel_id = sheet_info["relationshipId"]
        rel_name = rels.get(rel_id)
        if not rel_name:
            raise SystemExit(
                f"Could not locate XML file for sheet {sheet_info['name']}."
            )

        rows = read_sheet(zf, rel_name, shared)
        preview = preview_rows(rows, args.limit)
        print(json.dumps(preview, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
