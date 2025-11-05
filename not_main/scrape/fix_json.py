#!/usr/bin/env python3
"""
Fix malformed JSON files by applying safe heuristics:
- Trim non-JSON prefix/suffix (logs) outside the outermost braces/brackets
- Replace smart quotes with straight quotes
- Remove trailing commas before ']' or '}'
- Strip control characters (except standard whitespace)

Usage:
  python scrape/fix_json.py --input scrape/scrape/merit_badges_scraped.json --output scrape/merit_badges_scraped.cleaned.json
  # To fix in place:
  python scrape/fix_json.py --input scrape/scrape/merit_badges_scraped.json --in-place
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


SMART_QUOTES = {
    "\u2018": "'",
    "\u2019": "'",
    "\u201C": '"',
    "\u201D": '"',
}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def write_json(obj, path: Path, pretty: bool = True) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2 if pretty else None, ensure_ascii=False)


def try_parse_json(text: str):
    return json.loads(text)


def trim_to_json_block(text: str) -> str:
    # Prefer object payload; fall back to array if no object braces found
    start_obj = text.find("{")
    end_obj = text.rfind("}")
    start_arr = text.find("[")
    end_arr = text.rfind("]")

    candidates: list[tuple[int, int]] = []
    if start_obj != -1 and end_obj != -1 and end_obj > start_obj:
        candidates.append((start_obj, end_obj))
    if start_arr != -1 and end_arr != -1 and end_arr > start_arr:
        candidates.append((start_arr, end_arr))

    if not candidates:
        return text

    # Choose the longest plausible block
    s, e = max(candidates, key=lambda p: p[1] - p[0])
    return text[s : e + 1]


def replace_smart_quotes(text: str) -> str:
    for k, v in SMART_QUOTES.items():
        text = text.replace(k, v)
    return text


def remove_trailing_commas(text: str) -> str:
    # Remove trailing commas before ] or }
    return re.sub(r",(\s*[\]\}])", r"\1", text)


def strip_illegal_control_chars(text: str) -> str:
    # Keep tabs/newlines/carriage returns; remove other C0 control chars
    return re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F]", "", text)


def fix_json_text(text: str) -> str:
    # Apply fixes iteratively and test parseability after each step
    steps = [
        ("trim_to_json_block", trim_to_json_block),
        ("replace_smart_quotes", replace_smart_quotes),
        ("remove_trailing_commas", remove_trailing_commas),
        ("strip_illegal_control_chars", strip_illegal_control_chars),
    ]

    for name, func in steps:
        candidate = func(text)
        try:
            try_parse_json(candidate)
            return candidate
        except Exception:
            text = candidate
            continue
    # Final attempt: return last candidate; caller will still try to parse
    return text


def main() -> None:
    parser = argparse.ArgumentParser(description="Repair malformed JSON files with common fixes.")
    parser.add_argument("--input", type=Path, required=True, help="Path to the malformed JSON file")
    parser.add_argument("--output", type=Path, help="Path to write the repaired JSON")
    parser.add_argument("--in-place", action="store_true", help="Overwrite the input file with repaired JSON")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print the output")
    args = parser.parse_args()

    if not args.input.exists():
        raise SystemExit(f"Input file not found: {args.input}")

    raw = read_text(args.input)

    # Fast path: parseable as-is
    try:
        obj = try_parse_json(raw)
        output_path = args.input if args.in_place or not args.output else args.output
        write_json(obj, output_path, pretty=args.pretty or True)
        print(f"JSON was already valid. Wrote to {output_path}.")
        return
    except Exception:
        pass

    fixed_text = fix_json_text(raw)
    try:
        obj = try_parse_json(fixed_text)
    except Exception as e:
        # Provide context for debugging
        snippet = fixed_text[:500]
        raise SystemExit(f"Unable to repair JSON: {e}\nFirst 500 chars after fixes:\n{snippet}")

    output_path = args.input if args.in_place or not args.output else args.output
    write_json(obj, output_path, pretty=args.pretty or True)
    print(f"Repaired JSON written to {output_path}.")


if __name__ == "__main__":
    main()
