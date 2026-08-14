#!/usr/bin/env python3
import argparse
import json
import re
import tomllib
from collections import defaultdict, deque
from pathlib import Path

import yaml


BLAST_ORDER = {"Unknown": -1, "R0": 0, "R1": 1, "R2": 2, "R3": 3, "R4": 4}


def split_pnpm_key(value):
    value = value.lstrip("/").split("(", 1)[0]
    match = re.match(r"^(@[^/]+/[^@]+)@(.+)$", value)
    if match:
        return match.group(1), match.group(2)
    if "@" in value:
        return value.rsplit("@", 1)
    return value, ""


def ref_version(value):
    if isinstance(value, dict):
        value = value.get("version", "")
    value = str(value).split("(", 1)[0]
    if value.startswith(("link:", "workspace:", "file:")):
        return ""
    if value.startswith("npm:"):
        _, value = value.rsplit("@", 1)
    return value


def importer_class(importer, section):
    if section == "devDependencies":
        return ("build/dev" if importer == "." else "test/dev", "R1" if importer == "." else "R0")
    if importer.startswith("extensions/"):
        return "optional plugin runtime", "R2"
    if importer.startswith(("scripts/", "qa/", "examples/")):
        return "build/tooling", "R1"
    if section == "optionalDependencies":
        return "optional runtime", "R2"
    return "shipped runtime", "R3"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    repo = Path(args.repo).resolve()
    records = {}

    def add(ecosystem, name, version, source_file, **fields):
        if not name or not version:
            return
        key = (ecosystem, name, version)
        record = records.setdefault(
            key,
            {
                "ecosystem": ecosystem,
                "package": name,
                "version": version,
                "source_files": set(),
                "workspaces": set(),
                "usage": set(),
                "direct": False,
                "optional": False,
                "development": False,
                "blast_radius": "Unknown",
                "integrity": "",
                "license": "",
                "repository": "",
                "technical_risk": "Unknown",
                "microsoft_disposition": "Unknown",
                "recommended_action": "Review",
                "notes": "",
            },
        )
        record["source_files"].add(source_file)
        for field in ("workspaces", "usage"):
            value = fields.pop(field, None)
            if value:
                record[field].update(value if isinstance(value, (set, list)) else [value])
        for field in ("direct", "optional", "development"):
            record[field] = record[field] or bool(fields.pop(field, False))
        blast = fields.pop("blast_radius", "Unknown")
        if BLAST_ORDER.get(blast, -1) > BLAST_ORDER.get(record["blast_radius"], -1):
            record["blast_radius"] = blast
        for field, value in fields.items():
            if value and not record.get(field):
                record[field] = value

    pnpm_path = repo / "pnpm-lock.yaml"
    if pnpm_path.exists():
        data = yaml.safe_load(pnpm_path.read_text(encoding="utf-8"))
        graph = defaultdict(set)
        seeds = defaultdict(list)
        for key, metadata in (data.get("packages") or {}).items():
            name, version = split_pnpm_key(str(key))
            resolution = (metadata or {}).get("resolution") or {}
            add(
                "npm",
                name,
                version,
                "pnpm-lock.yaml",
                integrity=resolution.get("integrity", ""),
            )
        for importer, sections in (data.get("importers") or {}).items():
            for section in ("dependencies", "optionalDependencies", "devDependencies"):
                for name, spec in ((sections or {}).get(section) or {}).items():
                    version = ref_version(spec)
                    if not version:
                        continue
                    usage, blast = importer_class(importer, section)
                    seeds[(name, version)].append((usage, blast, importer))
                    add(
                        "npm",
                        name,
                        version,
                        "pnpm-lock.yaml",
                        direct=True,
                        optional=section == "optionalDependencies",
                        development=section == "devDependencies",
                        workspaces=importer,
                        usage=usage,
                        blast_radius=blast,
                    )
        for key, metadata in (data.get("snapshots") or {}).items():
            parent = tuple(split_pnpm_key(str(key)))
            for section in ("dependencies", "optionalDependencies"):
                for name, value in ((metadata or {}).get(section) or {}).items():
                    version = ref_version(value)
                    if version:
                        graph[parent].add((name, version))
        queue = deque((identity, evidence) for identity, values in seeds.items() for evidence in values)
        seen = set()
        while queue:
            identity, evidence = queue.popleft()
            marker = (identity, evidence)
            if marker in seen:
                continue
            seen.add(marker)
            usage, blast, importer = evidence
            add(
                "npm",
                identity[0],
                identity[1],
                "pnpm-lock.yaml",
                workspaces=importer,
                usage=usage,
                blast_radius=blast,
            )
            for child in graph.get(identity, ()):
                queue.append((child, evidence))

    for lock_path in repo.glob(".github/release/*/package-lock.json"):
        data = json.loads(lock_path.read_text(encoding="utf-8"))
        packages = data.get("packages") or {}
        root = packages.get("", {})
        root_name = root.get("name", lock_path.parent.name)
        direct_dependencies = set(root.get("dependencies", {})) | set(
            root.get("devDependencies", {})
        )
        for package_path, metadata in packages.items():
            if not package_path or "node_modules/" not in package_path:
                continue
            name = metadata.get("name") or package_path.rsplit("node_modules/", 1)[1]
            add(
                "npm",
                name,
                metadata.get("version", ""),
                str(lock_path.relative_to(repo)),
                direct=(
                    name in direct_dependencies
                    and package_path == f"node_modules/{name}"
                ),
                optional=metadata.get("optional", False),
                development=metadata.get("dev", False),
                workspaces=root_name,
                usage="release tooling",
                blast_radius="R1",
                integrity=metadata.get("integrity", ""),
                license=metadata.get("license", ""),
            )

    for lock_path in repo.rglob("Cargo.lock"):
        data = tomllib.loads(lock_path.read_text(encoding="utf-8"))
        for package in data.get("package", []):
            if not package.get("source") and not package.get("checksum"):
                continue
            add(
                "cargo",
                package.get("name", ""),
                package.get("version", ""),
                str(lock_path.relative_to(repo)),
                usage="shipped native application",
                blast_radius="R3",
                integrity=package.get("checksum", ""),
                repository=package.get("source", ""),
            )

    for resolved_path in repo.rglob("Package.resolved"):
        data = json.loads(resolved_path.read_text(encoding="utf-8"))
        for pin in data.get("pins", data.get("object", {}).get("pins", [])):
            state = pin.get("state") or {}
            add(
                "swiftpm",
                pin.get("identity") or pin.get("package", ""),
                state.get("version") or state.get("revision", ""),
                str(resolved_path.relative_to(repo)),
                usage="shipped Apple application",
                blast_radius="R3",
                repository=pin.get("location") or pin.get("repositoryURL", ""),
            )

    for package_swift in repo.rglob("Package.swift"):
        text = package_swift.read_text(encoding="utf-8")
        for url, requirement in re.findall(
            r'\.package\(\s*url:\s*"([^"]+)"\s*,\s*([^)]+)\)', text
        ):
            name = url.removesuffix(".git").rstrip("/").rsplit("/", 1)[-1].lower()
            version = " ".join(requirement.split())
            add(
                "swiftpm-declaration",
                name,
                version,
                str(package_swift.relative_to(repo)),
                direct=True,
                usage="Apple application declaration",
                blast_radius="R3",
                repository=url,
                notes="Resolve against Package.resolved before approval",
            )

    for sum_path in repo.rglob("go.sum"):
        modules = {}
        for line in sum_path.read_text(encoding="utf-8").splitlines():
            parts = line.split()
            if len(parts) >= 2:
                modules[(parts[0], parts[1].removesuffix("/go.mod"))] = parts[-1]
        direct = set()
        mod_path = sum_path.with_name("go.mod")
        if mod_path.exists():
            for name, version in re.findall(r"^\s*([\w./-]+)\s+(v[\w.+-]+)", mod_path.read_text(), re.M):
                direct.add((name, version))
        for (name, version), checksum in modules.items():
            add(
                "go",
                name,
                version,
                str(sum_path.relative_to(repo)),
                direct=(name, version) in direct,
                usage="documentation tooling",
                blast_radius="R1",
                integrity=checksum,
            )

    catalog = repo / "apps/android/gradle/libs.versions.toml"
    if catalog.exists():
        data = tomllib.loads(catalog.read_text(encoding="utf-8"))
        versions = data.get("versions", {})
        for alias, library in data.get("libraries", {}).items():
            module = library.get("module") or f"{library.get('group', '')}:{library.get('name', '')}"
            version = library.get("version", "")
            if isinstance(version, dict):
                version = version.get("ref", "")
            version = versions.get(version, version)
            add(
                "gradle",
                module,
                str(version),
                str(catalog.relative_to(repo)),
                direct=True,
                usage="shipped Android application",
                blast_radius="R3",
                notes=f"catalog alias: {alias}",
            )
        for alias, plugin in data.get("plugins", {}).items():
            version = plugin.get("version", "")
            if isinstance(version, dict):
                version = version.get("ref", "")
            version = versions.get(version, version)
            add(
                "gradle-plugin",
                plugin.get("id", alias),
                str(version),
                str(catalog.relative_to(repo)),
                direct=True,
                usage="Android build tooling",
                blast_radius="R1",
            )

    for gradle_file in repo.rglob("*.gradle.kts"):
        text = gradle_file.read_text(encoding="utf-8")
        for group, artifact, version in re.findall(
            r'(?:api|implementation|compileOnly|runtimeOnly|classpath|ksp|'
            r'testImplementation|androidTestImplementation|debugImplementation|'
            r'releaseImplementation)\(\s*["\']'
            r'([A-Za-z0-9_.-]+):([A-Za-z0-9_.-]+):([^"\']+)["\']',
            text,
        ):
            add(
                "gradle",
                f"{group}:{artifact}",
                version,
                str(gradle_file.relative_to(repo)),
                direct=True,
                usage="Android application or build declaration",
                blast_radius="R3",
            )

    for pyproject in repo.rglob("pyproject.toml"):
        data = tomllib.loads(pyproject.read_text(encoding="utf-8"))
        for spec in data.get("project", {}).get("dependencies", []):
            match = re.match(r"([A-Za-z0-9_.-]+)\s*([<>=!~].+)?", spec)
            if match:
                add(
                    "pypi",
                    match.group(1),
                    (match.group(2) or "unlocked").strip(),
                    str(pyproject.relative_to(repo)),
                    direct=True,
                    usage="skill tooling",
                    blast_radius="R1",
                )

    for dockerfile in repo.rglob("Dockerfile*"):
        if not dockerfile.is_file():
            continue
        text = dockerfile.read_text(encoding="utf-8")
        arguments = {
            name: value.strip('"\'')
            for name, value in re.findall(
                r"^\s*ARG\s+([A-Za-z_][A-Za-z0-9_]*)=([^\s#]+)",
                text,
                re.M,
            )
        }
        stages = set()
        for image, stage in re.findall(
            r"^\s*FROM\s+(?:--platform=\S+\s+)?(\S+)(?:\s+AS\s+(\S+))?",
            text,
            re.M | re.I,
        ):
            variable = re.fullmatch(r"\$\{([A-Za-z_][A-Za-z0-9_]*)\}", image)
            if variable:
                image = arguments.get(variable.group(1), "")
            if not image or image in stages:
                if stage:
                    stages.add(stage)
                continue
            if "@" in image:
                name, version = image.rsplit("@", 1)
            elif ":" in image.rsplit("/", 1)[-1]:
                name, version = image.rsplit(":", 1)
            else:
                name, version = image, "latest"
            add(
                "container",
                name,
                version,
                str(dockerfile.relative_to(repo)),
                direct=True,
                usage="build or runtime container base",
                blast_radius="R3",
            )
            if stage:
                stages.add(stage)

    workflows = repo / ".github" / "workflows"
    if workflows.exists():
        for workflow in list(workflows.glob("*.yml")) + list(workflows.glob("*.yaml")):
            for action in re.findall(r"^\s*uses:\s*([^\s#]+)", workflow.read_text(encoding="utf-8"), re.M):
                if action.startswith(("./", "docker://")) or "@" not in action:
                    continue
                name, version = action.rsplit("@", 1)
                add(
                    "github-action",
                    name,
                    version,
                    str(workflow.relative_to(repo)),
                    direct=True,
                    usage="CI or release automation",
                    blast_radius="R1",
                )

    output = []
    for record in records.values():
        for field in ("source_files", "workspaces", "usage"):
            record[field] = "; ".join(sorted(record[field]))
        output.append(record)
    output.sort(key=lambda row: (row["ecosystem"], row["package"].lower(), row["version"]))
    result = {
        "baseline": {
            "repository": "openclaw/openclaw",
            "commit": "",
            "lockfiles": sorted(
                str(path.relative_to(repo))
                for path in repo.rglob("*")
                if path.is_file()
                and path.name
                in {
                    "pnpm-lock.yaml",
                    "package-lock.json",
                    "Cargo.lock",
                    "Package.resolved",
                    "go.sum",
                    "libs.versions.toml",
                    "pyproject.toml",
                }
            ),
        },
        "inventory": output,
    }
    import subprocess

    result["baseline"]["commit"] = subprocess.check_output(
        ["git", "-C", str(repo), "rev-parse", "HEAD"], text=True
    ).strip()
    destination = Path(args.output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"rows": len(output), "commit": result["baseline"]["commit"]}))


if __name__ == "__main__":
    main()
