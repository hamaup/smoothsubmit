"""Explicit online test setup; never invoked by the CLI or ordinary Skill audit."""
import argparse
import json
from pathlib import Path
import shutil
import tarfile
import urllib.request

PINNED = [
    ("Dimillian/IceCubesApp", "9efcb16e720f337a401cf61c8e300dd043368282"),
    ("keepassium/KeePassium", "e651df4f89b0b8550371566ca9aa55a964d2904e"),
    ("Ranchero-Software/NetNewsWire", "7a2f27f324f2e8a59eefedb4eface4732e1febcc"),
]
parser = argparse.ArgumentParser(description="Fetch pinned public OSS text inputs for opt-in validation.")
parser.add_argument("destination", type=Path)
args = parser.parse_args()
base = args.destination.resolve()
base.mkdir(parents=True, exist_ok=True)
records = []
for repo, commit in PINNED:
    name = repo.split("/")[1]
    target = base / name
    if target.exists():
        raise SystemExit("Refusing to overwrite existing input: " + str(target))
    target.mkdir()
    archive = base / (name + ".tar.gz")
    url = "https://codeload.github.com/" + repo + "/tar.gz/" + commit
    with urllib.request.urlopen(url, timeout=60) as response, archive.open("xb") as out:
        shutil.copyfileobj(response, out)
    count = size = 0
    with tarfile.open(archive, "r:gz") as tar:
        for member in tar:
            parts = Path(member.name).parts[1:]
            if not parts or any(p in {"..", "node_modules", ".git", ".build", "Pods", "Carthage"} or p.startswith(".env") for p in parts):
                continue
            path = Path(*parts)
            if path.is_absolute() or not member.isfile() or member.size > 5 * 1024 * 1024:
                continue
            if path.suffix.lower() not in {".swift", ".plist", ".xcprivacy", ".pbxproj", ".xcconfig", ".xcworkspacedata", ".strings", ".xcstrings", ".entitlements", ".storekit", ".resolved", ".lock", ".md", ".json"} and path.name not in {"Podfile", "Package.swift", "LICENSE"}:
                continue
            destination = target / path
            destination.parent.mkdir(parents=True, exist_ok=True)
            with tar.extractfile(member) as source, destination.open("xb") as out:
                shutil.copyfileobj(source, out)
            count += 1
            size += member.size
    record = {"repo": repo, "commit": commit, "path": str(target), "files": count, "bytes": size, "downloadBytes": archive.stat().st_size}
    records.append(record)
    print(json.dumps(record), flush=True)
(base / "sources.json").write_text(json.dumps(records, indent=2) + "\n")
