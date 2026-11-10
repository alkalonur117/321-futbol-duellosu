#!/usr/bin/env python3
"""Small, manual API-Football identity audit. Never stores raw API responses."""
import argparse
import datetime as dt
import json
import os
import re
import sys
import unicodedata
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE = "https://v3.football.api-sports.io"
ROOT = Path(__file__).resolve().parents[1]


class ApiProblem(Exception):
    pass


def norm(value):
    value = str(value or "").replace("ı", "i").replace("İ", "I").casefold()
    value = unicodedata.normalize("NFKD", value)
    return " ".join(re.findall(r"[a-z0-9]+", "".join(c for c in value if not unicodedata.combining(c))))


def birth_year(profile):
    raw = (profile.get("birth") or {}).get("date")
    try:
        return int(str(raw)[:4])
    except (ValueError, TypeError):
        return None


def full_name(profile):
    combined = " ".join(str(profile.get(k) or "").strip() for k in ("firstname", "lastname")).strip()
    return combined or profile.get("name") or "Unknown"


def name_match(profile, case):
    actual = [norm(profile.get("name")), norm(full_name(profile)), norm(profile.get("lastname"))]
    for alias in case["aliases"]:
        a = norm(alias)
        if not a:
            continue
        if a in actual:
            return True
        # Match all parts of a full-name alias even if middle names are omitted.
        if len(a.split()) >= 2 and any(all(w in v.split() for w in a.split()) for v in actual):
            return True
    return False


def club_match(expected, actual):
    a, b = norm(expected).replace(" ", ""), norm(actual).replace(" ", "")
    return bool(a and b and (a == b or (len(a) >= 7 and a in b) or (len(b) >= 7 and b in a)))


class FootballApi:
    def __init__(self, key, max_calls):
        self.key, self.max_calls, self.calls = key, max_calls, 0
        self.remaining = None

    def get(self, endpoint, **params):
        if endpoint not in {"players/profiles", "players/teams", "transfers", "teams"}:
            raise ApiProblem("Unexpected endpoint")
        if self.calls >= self.max_calls:
            raise ApiProblem("Request budget reached")
        if self.remaining is not None and self.remaining <= 1:
            raise ApiProblem("API daily quota nearly exhausted")
        url = BASE + "/" + endpoint + "?" + urlencode(params)
        request = Request(url, headers={"x-apisports-key": self.key})
        self.calls += 1
        try:
            with urlopen(request, timeout=22) as response:
                raw = response.read(6_000_000)
                remaining = response.headers.get("x-ratelimit-requests-remaining")
                if remaining is not None and remaining.isdigit():
                    self.remaining = int(remaining)
        except HTTPError as exc:
            raise ApiProblem(f"HTTP {exc.code} at {endpoint}") from None
        except (URLError, TimeoutError, OSError):
            raise ApiProblem(f"Connection error at {endpoint}") from None
        try:
            data = json.loads(raw)
        except (ValueError, UnicodeError):
            raise ApiProblem(f"Invalid JSON at {endpoint}") from None
        if data.get("errors"):
            # Avoid logging provider error payloads or request headers.
            raise ApiProblem(f"API returned an error at {endpoint} (check plan, key and quota)")
        return data.get("response") or [], data.get("paging") or {}


def profiles_from_search(api, term):
    profiles = []
    for page in (1, 2):  # max 500 results per term; deliberately capped
        rows, paging = api.get("players/profiles", search=term, page=page)
        for row in rows:
            profile = row.get("player", row) if isinstance(row, dict) else {}
            if isinstance(profile, dict) and profile.get("id"):
                profiles.append(profile)
        if int(paging.get("current") or page) >= int(paging.get("total") or 1):
            break
    return profiles


def get_profile(api, player_id):
    rows, _ = api.get("players/profiles", player=int(player_id))
    if not rows:
        return None
    row = rows[0]
    return row.get("player", row) if isinstance(row, dict) else None


def get_clubs(api, player_id):
    rows, _ = api.get("players/teams", player=int(player_id))
    clubs = []
    for row in rows:
        team = row.get("team", {}) if isinstance(row, dict) else {}
        if isinstance(team, dict) and team.get("name"):
            clubs.append({"id": team.get("id"), "name": team["name"]})
    return list({(str(x["id"]), norm(x["name"])): x for x in clubs}.values())


def find_transfer_ids(api, anchor, aliases, cache):
    if anchor not in cache:
        teams, _ = api.get("teams", search=anchor)
        matched = [x.get("team", {}) for x in teams if isinstance(x, dict)]
        matched = [t for t in matched if club_match(anchor, t.get("name", "")) and t.get("id")]
        if not matched:
            cache[anchor] = []
        else:
            team = min(matched, key=lambda t: abs(len(norm(t.get("name"))) - len(norm(anchor))))
            rows, _ = api.get("transfers", team=team["id"])
            cache[anchor] = [r.get("player", {}) for r in rows if isinstance(r, dict)]
    result = []
    for player in cache[anchor]:
        name = norm(player.get("name"))
        if not name or not player.get("id"):
            continue
        for alias in aliases:
            a = norm(alias)
            if a == name or (len(a.split()) == 1 and a in name.split()) or (len(a.split()) > 1 and all(w in name.split() for w in a.split())):
                result.append(int(player["id"]))
                break
    return list(dict.fromkeys(result))[:6]


def audit_case(api, case, transfer_cache):
    result = {"name": case["name"], "birth_year_expected": case["birth_year"],
              "id": None, "full_name": None, "birth_date": None, "status": "not_found",
              "matched_clubs": [], "missing_clubs": case["expected_clubs"], "club_count_in_api": None,
              "source": None, "notes": []}
    candidates = {}
    try:
        if case.get("known_id"):
            p = get_profile(api, case["known_id"])
            if p:
                candidates[int(p["id"])] = (p, "known_id")
        else:
            for term in case["searches"]:
                for p in profiles_from_search(api, term):
                    if name_match(p, case) and birth_year(p) in (None, case["birth_year"]):
                        candidates[int(p["id"])] = (p, "profiles")
        inspected = set()
        assessed = []

        def inspect_candidates():
            for pid, (p, source) in list(candidates.items()):
                if pid in inspected:
                    continue
                inspected.add(pid)
                clubs = get_clubs(api, pid)
                names = [c["name"] for c in clubs]
                matched = [expected for expected in case["expected_clubs"]
                           if any(club_match(expected, name) for name in names)]
                assessed.append((len(matched), pid, p, source, clubs, matched))

        inspect_candidates()
        if not assessed or max(x[0] for x in assessed) == 0:
            if case.get("transfer_anchor"):
                for pid in find_transfer_ids(api, case["transfer_anchor"], case["aliases"], transfer_cache):
                    if pid not in candidates:
                        p = get_profile(api, pid)
                        if p and name_match(p, case) and birth_year(p) in (None, case["birth_year"]):
                            candidates[pid] = (p, "transfers")
                inspect_candidates()
        if not assessed:
            result["notes"].append("No matching profile; historical data may be missing")
            return result
        assessed.sort(key=lambda x: (x[0], birth_year(x[2]) == case["birth_year"], x[3] == "known_id"), reverse=True)
        top = assessed[0]
        ties = [x for x in assessed if x[0] == top[0] and birth_year(x[2]) == birth_year(top[2])]
        _, pid, p, source, clubs, matched = top
        result.update(id=pid, full_name=full_name(p), birth_date=(p.get("birth") or {}).get("date"),
                      matched_clubs=matched, missing_clubs=[x for x in case["expected_clubs"] if x not in matched],
                      club_count_in_api=len(clubs), source=source)
        if len(ties) > 1:
            result["status"] = "ambiguous"
            result["notes"].append("Multiple possible player IDs: " + ", ".join(str(x[1]) for x in ties[:4]))
        elif birth_year(p) == case["birth_year"] and matched:
            result["status"] = "confirmed"
        else:
            result["status"] = "needs_review"
        if result["missing_clubs"]:
            result["notes"].append("Unmatched clubs may be missing from API history")
        if birth_year(p) is None:
            result["notes"].append("Birth date unavailable")
    except ApiProblem as exc:
        result["status"] = "api_error"
        result["notes"].append(str(exc))
    return result


def escape_cell(value):
    return str(value if value is not None else "—").replace("|", "\\|").replace("\n", " ")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-calls", type=int, default=30)
    parser.add_argument("--include-burak", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--out", default="api-football-audit")
    args = parser.parse_args()
    if not 1 <= args.max_calls <= 60:
        parser.error("--max-calls must be between 1 and 60")
    cases = json.loads((ROOT / "tests" / "api_football_cases.json").read_text(encoding="utf-8"))
    if args.include_burak:
        cases.append({"name": "Burak Yılmaz (control)", "birth_year": 1985,
                      "aliases": ["Burak Yılmaz"], "searches": [], "known_id": 2006,
                      "expected_clubs": ["Galatasaray", "Lille", "Fortuna Sittard"]})
    if args.dry_run:
        print("Dry run; no API calls. Test cases: " + ", ".join(c["name"] for c in cases))
        return 0
    key = os.getenv("APISPORTS_KEY", "")
    if not key:
        print("Missing APISPORTS_KEY GitHub Actions repository secret", file=sys.stderr)
        return 2
    api = FootballApi(key, args.max_calls)
    cache, results = {}, []
    for case in cases:
        result = audit_case(api, case, cache)
        results.append(result)
        print(f"{result['name']}: {result['status']} | ID: {result['id'] or '—'} | calls: {api.calls}")
        if result["status"] == "api_error" and any("budget" in x.lower() or "quota" in x.lower() for x in result["notes"]):
            break
    report = {"generated_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
              "calls": api.calls, "daily_remaining": api.remaining,
              "note": "Limited API coverage check; not proof of complete professional or youth career history",
              "players": results}
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = ["# API-Football – 5 oyuncu kimlik/kariyer testi", "",
             f"API çağrısı: **{api.calls}** / {api.max_calls}. Sonuçlar ham API yanıtı değildir.", "",
             "| Oyuncu | ID | API tam adı | Doğum | Durum | Doğrulanan kulüpler | API'de eşleşmeyen kulüpler |",
             "|---|---:|---|---|---|---|---|"]
    for r in results:
        vals = [r["name"], r["id"], r["full_name"], r["birth_date"], r["status"],
                ", ".join(r["matched_clubs"]) or "—", ", ".join(r["missing_clubs"]) or "—"]
        lines.append("| " + " | ".join(escape_cell(v) for v in vals) + " |")
    lines.extend(["", "**Not:** 'confirmed' yalnızca ad + doğum yılı + en az bir kulüp eşleşmesini doğrular; tüm kariyerin eksiksiz olduğu anlamına gelmez.",
                  "Altyapı kulüpleri ve eski transferler eksik olabilir. Soru üretiminde doğrulanmamış kariyer sayısı kullanılmamalıdır.", ""])
    for r in results:
        if r["notes"]:
            lines.append(f"- **{r['name']}:** " + "; ".join(r["notes"]))
    (out / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return 1 if any(r["status"] == "api_error" for r in results) else 0


if __name__ == "__main__":
    sys.exit(main())
