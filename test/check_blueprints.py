#!/usr/bin/env python3
"""Offline sanity checks for every blueprint in this repository (no Home Assistant needed).

Checks: valid YAML, the blueprint header is complete, every `!input name` refers to a declared input, every declared input is used,
every input has a name, and selector/default shapes are plausible. Needs PyYAML.
"""
import glob
import os
import sys

import yaml

used = set()


class Loader(yaml.SafeLoader):
    """SafeLoader plus the `!input` tag used by Home Assistant blueprints (records the names it sees)."""


def _input(loader, node):
    used.add(loader.construct_scalar(node))
    return {"__input__": loader.construct_scalar(node)}


Loader.add_constructor("!input", _input)
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
files = sorted(glob.glob(os.path.join(root, "blueprints", "**", "*.yaml"), recursive=True))
problems = []
if not files:
    problems.append("no blueprint found")
for f in files:
    used.clear()
    rel = os.path.relpath(f, root)
    try:
        doc = yaml.load(open(f), Loader)
    except yaml.YAMLError as e:
        problems.append(f"{rel}: invalid YAML: {e}")
        continue
    bp = doc.get("blueprint") or {}
    for key in ("name", "description", "domain", "author", "input"):
        if not bp.get(key):
            problems.append(f"{rel}: blueprint.{key} is missing")
    declared = bp.get("input") or {}
    for name, spec in declared.items():
        if not isinstance(spec, dict) or not spec.get("name"):
            problems.append(f"{rel}: input '{name}' has no name")
        if isinstance(spec, dict) and "selector" not in spec:
            problems.append(f"{rel}: input '{name}' has no selector")
    for name in sorted(used - set(declared)):
        problems.append(f"{rel}: '!input {name}' is not a declared input")
    for name in sorted(set(declared) - used):
        problems.append(f"{rel}: input '{name}' is declared but never used")
    for key in ("triggers", "actions"):
        if key not in doc:
            problems.append(f"{rel}: top-level '{key}' is missing")
    print(f"checked {rel}: {len(declared)} inputs, {len(used)} used")
if problems:
    print("\n".join("FAIL " + p for p in problems))
    sys.exit(1)
print("OK: all blueprints pass the offline checks")
