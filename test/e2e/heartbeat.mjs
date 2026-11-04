// End-to-end test of the SF Heartbeat blueprints on a real Home Assistant. A template sensor goes unavailable on demand.
// Delays are shortened (6 s) through values the selectors would not offer in the UI but the blueprint accepts.
import { login, state, call, setBool, until, holds, sleep, createAutomation, checker, api } from "./lib.mjs";
const { check, done } = checker();
const P = "sensor.e2e_probe", ALIVE = "input_boolean.e2e_alive", ALIVE2 = "input_boolean.e2e_alive2";
const is = (id, v) => async () => (await state(id)) === v;
const num = async (id) => Number(await state(id));

await login();
for (const c of ["counter.e2e_silent", "counter.e2e_recovered"]) await call("counter", "reset", { entity_id: c });
await setBool(ALIVE, true); await setBool(ALIVE2, true);
for (const b of ["step1", "step2", "failed", "step2b", "failed2"]) await setBool("input_boolean.e2e_" + b, false);
const onAlert = [
  { choose: [{ conditions: "{{ event == 'silent' }}", sequence: [{ action: "counter.increment", target: { entity_id: "counter.e2e_silent" } }] },
             { conditions: "{{ event == 'recovered' }}", sequence: [{ action: "counter.increment", target: { entity_id: "counter.e2e_recovered" } }] }] },
  { action: "input_text.set_value", target: { entity_id: "input_text.e2e_names" }, data: { value: "{{ silent_names }}" } },
];
await createAutomation("e2e_alert", "E2E Alert", "sf_heartbeat/silent_sensor_alert.yaml", { watched: [P], max_silence: 1, grace_minutes: 0.1, recover_minutes: 0.1, on_alert: onAlert, reminder_hours: 0 });
const repairInput = (watched, s1, s2, fail) => ({ watched, max_silence: 1, grace_minutes: 0.1, wait_minutes: 0.1, cooldown_hours: 3, step_1: s1, step_2: s2, on_failure: fail });
const turnOn = (id) => [{ action: "input_boolean.turn_on", target: { entity_id: id } }];
await createAutomation("e2e_repair", "E2E Repair", "sf_heartbeat/silent_sensor_repair.yaml", repairInput([P], turnOn("input_boolean.e2e_step1"), turnOn("input_boolean.e2e_step2"), turnOn("input_boolean.e2e_failed")));
await createAutomation("e2e_repair2", "E2E Repair 2", "sf_heartbeat/silent_sensor_repair.yaml", repairInput(["sensor.e2e_probe_2"], turnOn(ALIVE2), turnOn("input_boolean.e2e_step2b"), turnOn("input_boolean.e2e_failed2")));
await sleep(3000);
check("starting point: everything reports, nothing fired", (await num("counter.e2e_silent")) === 0 && (await state("input_boolean.e2e_step1")) === "off");

// 1. A flap shorter than the grace period fires nothing
await setBool(ALIVE, false); await sleep(2000); await setBool(ALIVE, true); await sleep(10000);
check("a 2 s gap (< grace) raises no alert", (await num("counter.e2e_silent")) === 0);
check("... and starts no repair", (await state("input_boolean.e2e_step1")) === "off");

// 2. A real silence: one alert, names listed, no spam while it lasts
await setBool(ALIVE, false);
check("silence longer than the grace period raises exactly one alert", await until(async () => (await num("counter.e2e_silent")) === 1, 30000));
check("the alert lists the silent entity", (await state("input_text.e2e_names")).includes("E2E Probe"), await state("input_text.e2e_names"));
check("graded repair: step 1 runs", await until(is("input_boolean.e2e_step1", "on"), 30000));
check("graded repair: still silent -> step 2 runs", await until(is("input_boolean.e2e_step2", "on"), 30000));
check("graded repair: still silent -> the failure action runs", await until(is("input_boolean.e2e_failed", "on"), 30000));
check("no second alert while it stays silent (20 s)", await holds(async () => (await num("counter.e2e_silent")) === 1, 20000));

// 3. Recovery fires once
await setBool(ALIVE, true);
check("recovery event fires once", await until(async () => (await num("counter.e2e_recovered")) === 1, 30000));

// 4. Cooldown: a second silence right after does not restart the repair
for (const b of ["input_boolean.e2e_step1", "input_boolean.e2e_step2", "input_boolean.e2e_failed"]) await setBool(b, false);
await setBool(ALIVE, false);
check("a new silence still raises its own alert", await until(async () => (await num("counter.e2e_silent")) === 2, 30000));
check("... but the repair is on cooldown (no step 1 for 25 s)", await holds(is("input_boolean.e2e_step1", "off"), 25000));
await setBool(ALIVE, true);

// 5. A repair that works stops the escalation
await setBool(ALIVE2, false);
check("repair 2: step 1 brings the sensor back", await until(is(ALIVE2, "on"), 30000));
check("repair 2: step 2 and the failure action never run (20 s)", await holds(async () => (await state("input_boolean.e2e_step2b")) === "off" && (await state("input_boolean.e2e_failed2")) === "off", 20000));

// 6. No errors in the log
const r = await api("/api/error_log"); const log = typeof r.json === "string" ? r.json : "";
const bad = log.split("\n").filter((l) => /ERROR|WARNING/.test(l) && /e2e_|sf_heartbeat/i.test(l));
check("no automation / template errors in the Home Assistant log", bad.length === 0, bad.slice(-3).join(" | "));
done();
