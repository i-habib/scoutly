import argparse
import json
import re
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE_URL = "https://www.scouting.org"
MERIT_BADGE_INDEX = f"{BASE_URL}/merit-badges/all/"
DEFAULT_DELAY = 0.35
HEADERS = {
    "User-Agent": "ScoutlyRequirementScraper/1.0 (+https://scoutly.app)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Eagle-required merit badges
EAGLE_REQUIRED = [
    "First Aid",
    "Citizenship in the Community",
    "Citizenship in the Nation",
    "Citizenship in Society",
    "Citizenship in the World",
    "Communication",
    "Cooking",
    "Personal Fitness",
    "Emergency Preparedness",
    "Lifesaving",
    "Environmental Science",
    "Sustainability",
    "Personal Management",
    "Swimming",
    "Hiking",
    "Cycling",
    "Camping",
    "Family Life",
]

# Fixed list of merit badges to scrape (navigate by canonical URL slug)
MERIT_BADGES = [
    "American Business",
    "American Cultures",
    "American Heritage",
    "American Labor",
    "Animal Science",
    "Animation",
    "Archaeology",
    "Archery",
    "Architecture",
    "Art",
    "Astronomy",
    "Athletics",
    "Automotive Maintenance",
    "Aviation",
    "Backpacking",
    "Basketry",
    "Bird Study",
    "Bugling",
    "Camping",
    "Canoeing",
    "Chemistry",
    "Chess",
    "Citizenship in Society",
    "Citizenship in the Community",
    "Citizenship in the Nation",
    "Citizenship in the World",
    "Climbing",
    "Coin Collecting",
    "Collections",
    "Communication",
    "Composite Materials",
    "Cooking",
    "Crime Prevention",
    "Cycling",
    "Dentistry",
    "Digital Technology",
    "Disabilities Awareness",
    "Dog Care",
    "Drafting",
    "Electricity",
    "Electronics",
    "Emergency Preparedness",
    "Energy",
    "Engineering",
    "Entrepreneurship",
    "Environmental Science",
    "Exploration",
    "Family Life",
    "Farm Mechanics",
    "Fingerprinting",
    "Fire Safety",
    "First Aid",
    "Fish and Wildlife Management",
    "Fishing",
    "Fly-Fishing",
    "Forestry",
    "Game Design",
    "Gardening",
    "Genealogy",
    "Geocaching",
    "Geology",
    "Golf",
    "Graphic Arts",
    "Hiking",
    "Home Repairs",
    "Horsemanship",
    "Indian Lore",
    "Insect Study",
    "Inventing",
    "Journalism",
    "Kayaking",
    "Landscape Architecture",
    "Law",
    "Leatherwork",
    "Lifesaving",
    "Mammal Study",
    "Medicine",
    "Metalwork",
    "Mining in Society",
    "Model Design and Building",
    "Motorboating",
    "Moviemaking",
    "Music",
    "Nature",
    "Nuclear Science",
    "Oceanography",
    "Orienteering",
    "Painting",
    "Personal Fitness",
    "Personal Management",
    "Pets",
    "Photography",
    "Pioneering",
    "Plant Science",
    "Plumbing",
    "Pottery",
    "Programming",
    "Public Health",
    "Public Speaking",
    "Pulp and Paper",
    "Radio",
    "Railroading",
    "Reading",
    "Reptile and Amphibian Study",
    "Rifle Shooting",
    "Robotics",
    "Rowing",
    "Safety",
    "Salesmanship",
    "Scholarship",
    "Scouting Heritage",
    "Scuba Diving",
    "Sculpture",
    "Shotgun Shooting",
    "Signs, Signals, and Codes",
    "Skating",
    "Small-Boat Sailing",
    "Snow Sports",
    "Soil and Water Conservation",
    "Space Exploration",
    "Sports",
    "Stamp Collecting",
    "Sustainability",
    "Surveying",
    "Swimming",
    "Textile",
    "Theater",
    "Traffic Safety",
    "Truck Transportation",
    "Veterinary Medicine",
    "Water Sports",
    "Weather",
    "Welding",
    "Whitewater",
    "Wilderness Survival",
    "Wood Carving",
    "Woodwork",
]


def build_session() -> requests.Session:
    retry = Retry(
        total=5,
        backoff_factor=0.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
    )
    adapter = HTTPAdapter(max_retries=retry)
    session = requests.Session()
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update(HEADERS)
    return session


def clean_text(value: str) -> str:
    return " ".join(value.split()) if value else ""


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower().strip()).strip("_")

def url_slugify(name: str) -> str:
    # Convert to URL path part expected by scouting.org, e.g. "American Business" -> "american-business"
    return re.sub(r"[^a-z0-9]+", "-", name.lower().strip()).strip("-")


def get_merit_badge_catalog(session: requests.Session) -> List[Dict[str, str]]:
    # Build catalog from the fixed list instead of scraping the index
    seen: set[str] = set()
    catalog: List[Dict[str, str]] = []
    for name in sorted(MERIT_BADGES):
        clean_name = clean_text(name)
        id_slug = slugify(clean_name)
        url_slug = url_slugify(clean_name)
        if not id_slug or id_slug in seen:
            continue
        seen.add(id_slug)
        catalog.append(
            {
                "id": f"mb_{id_slug}",
                "name": clean_name,
                "url": f"{BASE_URL}/merit-badges/{url_slug}/",
            }
        )
    print(f"Prepared {len(catalog)} merit badges to scrape from fixed list.")
    return catalog


def scrape_badge_requirements(session: requests.Session, badge_url: str) -> Optional[List[Dict[str, List[str]]]]:
    try:
        response = session.get(badge_url, timeout=30)
        response.raise_for_status()
    except requests.exceptions.RequestException as exc:
        print(f"  [warn] Could not fetch {badge_url}: {exc}")
        return None

    soup = BeautifulSoup(response.content, "html.parser")
    container = soup.select_one("div.mb-requirement-container")
    if not container:
        container = soup.select_one("div.entry-content")
    if not container:
        print("  [warn] No requirement container found; skipping.")
        return []

    items = container.select("div.mb-requirement-item")
    if not items:
        print("  [warn] Structured requirement items missing; using paragraph fallback.")
        fallback = []
        for paragraph in container.select("p"):
            text = clean_text(paragraph.get_text(" "))
            if text and not text.upper().startswith("NOTE:"):
                fallback.append({"text": text, "sub_requirements": []})
        return fallback

    parsed: List[Dict[str, List[str]]] = []
    for item in items:
        parent = item.select_one("div.mb-requirement-parent")
        if not parent:
            continue
        main_text = clean_text(parent.get_text(" "))
        if not main_text or main_text.upper().startswith("NOTE:"):
            continue

        sub_requirements: List[str] = []
        child_selectors = [
            "ul.mb-requirement-children-list li",
            "div.mb-requirement-child",
            "ol li",
        ]
        for selector in child_selectors:
            for child in item.select(selector):
                child_text = clean_text(child.get_text(" "))
                if child_text:
                    sub_requirements.append(child_text)

        parsed.append({"text": main_text, "sub_requirements": sub_requirements})

    return parsed


def filter_badges(badges: List[Dict[str, str]], filters: Optional[List[str]]) -> List[Dict[str, str]]:
    if not filters:
        return badges

    tokens = [token.lower() for token in filters]
    filtered = []
    for badge in badges:
        name_lower = badge["name"].lower()
        slug = badge["id"].lower()
        if any(token in name_lower or token == slug for token in tokens):
            filtered.append(badge)

    if not filtered:
        print("No merit badges matched the provided filters.")
    else:
        print(f"Filtered down to {len(filtered)} merit badges.")

    return filtered


def collect_badges(session: requests.Session, delay: float, filters: Optional[List[str]]) -> List[Dict[str, object]]:
    catalog = get_merit_badge_catalog(session)
    targets = filter_badges(catalog, filters)
    if not targets:
        return []

    results: List[Dict[str, object]] = []
    total = len(targets)
    for index, badge in enumerate(targets, start=1):
        print(f"[{index}/{total}] Scraping {badge['name']} ...")
        requirements = scrape_badge_requirements(session, badge["url"])
        if requirements is None:
            continue
        normalized_name = badge["name"].replace(" Merit Badge", "").strip()
        badge_record = {
            "id": badge["id"],
            "name": normalized_name,
            "eagleRequired": normalized_name in EAGLE_REQUIRED,
            "requirements": requirements,
        }
        results.append(badge_record)
        if index < total:
            time.sleep(delay)

    return results


def write_output(payload: Dict[str, object], output_path: Path, pretty: bool) -> None:
    output_path = output_path.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    indent = 2 if pretty else None
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=indent)
    print(f"Wrote data for {len(payload['meritBadges'])} merit badges to {output_path}.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape BSA merit badge requirements.")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("scrape/merit_badges_scraped.json"),
        help="File path to write the resulting JSON payload.",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=DEFAULT_DELAY,
        help="Seconds to wait between badge requests.",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print the JSON output with indentation.",
    )
    parser.add_argument(
        "--badge",
        action="append",
        dest="badges",
        help="Filter to specific badges by name fragment or id (can be repeated).",
    )
    parser.add_argument(
        "--stdout",
        action="store_true",
        help="Print JSON to stdout instead of writing to a file.",
    )

    args = parser.parse_args()

    session = build_session()

    try:
        merit_badges = collect_badges(session, delay=args.delay, filters=args.badges)
    except KeyboardInterrupt:
        print("\nScrape interrupted by user.")
        sys.exit(130)

    payload: Dict[str, object] = {"meritBadges": merit_badges}
    print(f"Scraped {len(merit_badges)} merit badges.")

    if args.stdout:
        indent = 2 if args.pretty else None
        print(json.dumps(payload, indent=indent))
    else:
        write_output(payload, args.output, args.pretty)


if __name__ == "__main__":
    main()

