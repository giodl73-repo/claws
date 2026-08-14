#!/usr/bin/env python3
import argparse
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


USER_AGENT = "OpenClaw-Dependency-Governance/1.0"


def fetch_json(url, data=None):
    request = urllib.request.Request(
        url,
        data=None if data is None else json.dumps(data).encode(),
        headers={"User-Agent": USER_AGENT, "Content-Type": "application/json"},
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return json.load(response)
        except (urllib.error.URLError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(1 + attempt * 2)


def npm_metadata(identity):
    name, version = identity
    if version.startswith("@") and "@" in version[1:]:
        name, version = version.rsplit("@", 1)
    elif "@" in version:
        name, version = version.rsplit("@", 1)
    url = (
        "https://registry.npmjs.org/"
        + urllib.parse.quote(name, safe="@")
        + "/"
        + urllib.parse.quote(version, safe="")
    )
    data = fetch_json(url)
    repository = data.get("repository") or ""
    if isinstance(repository, dict):
        repository = repository.get("url", "")
    scripts = data.get("scripts") or {}
    lifecycle = {
        key: scripts[key]
        for key in ("preinstall", "install", "postinstall")
        if scripts.get(key)
    }
    return {
        "license": data.get("license") or "",
        "repository": repository,
        "deprecated": data.get("deprecated") or "",
        "maintainers": len(data.get("maintainers") or []),
        "lifecycle_scripts": "; ".join(f"{key}: {value}" for key, value in lifecycle.items()),
        "integrity": (data.get("dist") or {}).get("integrity", ""),
    }


def npm_osv_identity(name, version):
    if version.startswith("@") and "@" in version[1:]:
        return tuple(version.rsplit("@", 1))
    if "@" in version:
        return tuple(version.rsplit("@", 1))
    return name, version


def cargo_metadata(identity):
    name, version = identity
    data = fetch_json(
        "https://crates.io/api/v1/crates/"
        + urllib.parse.quote(name, safe="")
        + "/"
        + urllib.parse.quote(version, safe="")
    )
    version_data = data.get("version") or {}
    crate = data.get("crate") or {}
    return {
        "license": version_data.get("license") or "",
        "repository": crate.get("repository") or "",
        "deprecated": "",
        "maintainers": "",
        "lifecycle_scripts": "",
    }


def osv_ecosystem(ecosystem):
    return {
        "npm": "npm",
        "cargo": "crates.io",
        "go": "Go",
        "gradle": "Maven",
        "pypi": "PyPI",
    }.get(ecosystem)


def exact_version(version):
    return version and not any(token in version for token in (" ", ">", "<", "*", "unlocked", "branch:", "from:"))


def preliminary_rating(row):
    license_name = row.get("license", "")
    if row.get("deprecated"):
        return "High", "Published package is deprecated."
    if row.get("vulnerability_ids"):
        return "High", "One or more exact-version OSV records require reachability and fix review."
    if not license_name:
        return "Unknown", "License evidence is missing."
    if row.get("blast_radius") in {"R2", "R3", "R4"}:
        return "Moderate", "Shipped or privileged exposure requires usage-specific review."
    if row.get("lifecycle_scripts"):
        return "Moderate", "Install lifecycle scripts require provenance review."
    return "Low", "No exact-version OSV record found and current evidence shows build/test-only exposure."


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--inventory", required=True)
    parser.add_argument("--cache", required=True)
    args = parser.parse_args()
    inventory_path = Path(args.inventory)
    cache_path = Path(args.cache)
    document = json.loads(inventory_path.read_text(encoding="utf-8"))
    cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}

    jobs = {}
    for row in document["inventory"]:
        if row["ecosystem"] not in {"npm", "cargo"} or not exact_version(row["version"]):
            continue
        key = f'{row["ecosystem"]}:{row["package"]}@{row["version"]}'
        if key not in cache or cache[key].get("metadata_error"):
            jobs[key] = (row["ecosystem"], (row["package"], row["version"]))

    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = {}
        for key, (ecosystem, identity) in jobs.items():
            function = npm_metadata if ecosystem == "npm" else cargo_metadata
            futures[executor.submit(function, identity)] = key
        for future in as_completed(futures):
            key = futures[future]
            try:
                cache[key] = future.result()
            except Exception as error:
                cache[key] = {"metadata_error": str(error)}
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(cache, indent=2) + "\n", encoding="utf-8")

    query_rows = []
    query_indexes = []
    for index, row in enumerate(document["inventory"]):
        ecosystem = osv_ecosystem(row["ecosystem"])
        if ecosystem and exact_version(row["version"]):
            name, version = (
                npm_osv_identity(row["package"], row["version"])
                if row["ecosystem"] == "npm"
                else (row["package"], row["version"])
            )
            query_rows.append(
                {"package": {"ecosystem": ecosystem, "name": name}, "version": version}
            )
            query_indexes.append(index)
    vulnerabilities = {}
    for offset in range(0, len(query_rows), 500):
        batch = query_rows[offset : offset + 500]
        result = fetch_json("https://api.osv.dev/v1/querybatch", {"queries": batch})
        for relative, entry in enumerate(result.get("results", [])):
            vulnerabilities[query_indexes[offset + relative]] = [
                vulnerability.get("id", "") for vulnerability in entry.get("vulns", [])
            ]

    for index, row in enumerate(document["inventory"]):
        key = f'{row["ecosystem"]}:{row["package"]}@{row["version"]}'
        metadata = cache.get(key, {})
        for field in ("license", "repository", "integrity"):
            if metadata.get(field) and not row.get(field):
                row[field] = metadata[field]
        for field in ("deprecated", "maintainers", "lifecycle_scripts", "metadata_error"):
            row[field] = metadata.get(field, "")
        row["vulnerability_ids"] = "; ".join(vulnerabilities.get(index, []))
        row["security_evidence"] = (
            f'OSV exact-version: {len(vulnerabilities.get(index, []))}'
            if index in vulnerabilities
            else "OSV not available for this ecosystem or version shape"
        )
        row["technical_risk"], row["rating_basis"] = preliminary_rating(row)
        if row["technical_risk"] == "High":
            row["recommended_action"] = "Investigate and remediate"
        elif row["technical_risk"] == "Moderate":
            row["recommended_action"] = "Retain pending focused review"
        elif row["technical_risk"] == "Low":
            row["recommended_action"] = "Retain and monitor"
        else:
            row["recommended_action"] = "Collect missing evidence"

    inventory_path.write_text(json.dumps(document, indent=2) + "\n", encoding="utf-8")
    counts = {}
    for row in document["inventory"]:
        counts[row["technical_risk"]] = counts.get(row["technical_risk"], 0) + 1
    print(json.dumps({"metadata_cache": len(cache), "ratings": counts}))


if __name__ == "__main__":
    main()
