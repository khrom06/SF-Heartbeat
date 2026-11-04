#!/usr/bin/env python3
"""Renders the real templates of the SF Heartbeat blueprints on a live Home Assistant with controlled inputs.

POST /api/template is read-only: nothing is created, changed or triggered on the instance.
Usage:  HA_URL=http://homeassistant.local:8123 HA_TOKEN=<long-lived token> python3 test/blueprint_templates.py
Without HA_URL / HA_TOKEN the test is skipped (exit 0), so it never blocks CI.
Needs PyYAML.
"""
import ast
import json
import os
import sys
import urllib.request

import yaml

if not os.environ.get("HA_URL") or not os.environ.get("HA_TOKEN"):
    print("SKIP: set HA_URL and HA_TOKEN to run the blueprint template tests against a live Home Assistant")
    sys.exit(0)

BASE = os.environ["HA_URL"].rstrip("/")
HEAD = {"Authorization": "Bearer " + os.environ["HA_TOKEN"], "User-Agent": "curl/8", "Content-Type": "application/json"}
BP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "blueprints", "automation", "sf_heartbeat")


class Loader(yaml.SafeLoader):
    """SafeLoader plus the `!input` tag Home Assistant blueprints use (no arbitrary object construction)."""


Loader.add_constructor("!input", lambda loader, node: {"__input__": loader.construct_scalar(node)})


def get(path):
    return json.load(urllib.request.urlopen(urllib.request.Request(BASE + path, headers=HEAD), timeout=30))


def render(tpl):
    req = urllib.request.Request(BASE + "/api/template", data=json.dumps({"template": tpl}).encode(), headers=HEAD)
    return urllib.request.urlopen(req, timeout=30).read().decode().strip()


def load(name):
    return yaml.load(open(os.path.join(BP, name)), Loader)


alert, repair = load("silent_sensor_alert.yaml"), load("silent_sensor_repair.yaml")
silent_tpl, recovered_tpl = alert["triggers"][0]["value_template"], alert["triggers"][1]["value_template"]
list_tpl = alert["variables"]["silent_list"]
repair_tpl = repair["triggers"][0]["value_template"]


def run(tpl, watched, limit):
    return render("{% set watched = " + json.dumps(watched) + " %}{% set limit_h = " + str(limit) + " %}" + tpl)


states = {s["entity_id"]: s for s in get("/api/states")}
fresh = next(i for i, s in states.items() if i.startswith("sensor.") and s["state"] not in ("unavailable", "unknown"))
unavailable = next((i for i, s in states.items() if s["state"] == "unavailable"), None)
failures = 0


def expect(name, got, want):
    global failures
    ok = got == want
    failures += 0 if ok else 1
    print(("OK   " if ok else "FAIL ") + name + ("" if ok else f" (got {got!r}, want {want!r})"))


expect("reporting entity, generous limit -> not silent", run(silent_tpl, [fresh], 100000), "False")
expect("same entity, tiny limit -> silent (stale)", run(silent_tpl, [fresh], 0.00001), "True")
expect("missing entity -> silent", run(silent_tpl, ["sensor.sf_heartbeat_does_not_exist"], 100000), "True")
expect("empty list -> not silent", run(silent_tpl, [], 2), "False")
expect("recovered template is the inverse of silent (reporting)", run(recovered_tpl, [fresh], 100000), "True")
expect("recovered template is the inverse of silent (missing)", run(recovered_tpl, ["sensor.sf_heartbeat_does_not_exist"], 100000), "False")
expect("repair trigger template matches the alert trigger", run(repair_tpl, [fresh], 0.00001), "True")
watched = [fresh, "sensor.sf_heartbeat_does_not_exist"] + ([unavailable] if unavailable else [])
reasons = sorted(r["reason"] for r in ast.literal_eval(run(list_tpl, watched, 0.00001)))  # HA renders a Python-literal list
expect("silent_list reasons", reasons, sorted(["stale", "missing"] + (["unavailable"] if unavailable else [])))
expect("silent_list is empty when everything reports", run(list_tpl, [fresh], 100000), "[]")
print("FAILED: %d" % failures if failures else "All blueprint template checks passed")
sys.exit(1 if failures else 0)
