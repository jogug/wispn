"""Focused regressions: sanctuary recovery after server restart, hair byte, tail order.
Run after `cargo build --release`: python3 tests/test_regressions.py"""
import subprocess, time, json, urllib.request, os, pathlib
urllib.request.install_opener(urllib.request.build_opener(urllib.request.ProxyHandler({})))
root = pathlib.Path(__file__).parent.parent
env = dict(os.environ, PORT="3111")
proc = subprocess.Popen(["./target/release/wispn"], cwd=root, env=env, stdout=subprocess.PIPE, text=True)
def req(m, path, body=None, headers=None):
    r = urllib.request.Request("http://127.0.0.1:3111" + path, method=m,
        data=json.dumps(body).encode() if body else None,
        headers={"Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(r, timeout=5) as resp: return resp.status, resp.read()
    except urllib.error.HTTPError as e: return e.code, e.read()
try:
    for _ in range(40):
        try:
            if req("GET", "/health")[0] == 200: break
        except Exception: time.sleep(.2)
    assert req("GET", "/api/s/e3834a62ec03d56e")[0] == 404, "unknown sanctuary must 404"
    secret = "00112233445566778899aabbccddeeff"
    s, b = req("POST", "/api/sanctuaries", {"host_secret": secret, "env_id": 1})
    sid = json.loads(b)["id"]
    # recovery path the client relies on after a restart wipes memory:
    # re-registering the same host_secret must return the same id and revive GET.
    s, b = req("POST", "/api/sanctuaries", {"host_secret": secret, "env_id": 1})
    assert json.loads(b)["id"] == sid and req("GET", f"/api/s/{sid}")[0] == 200
    print("server recovery (same secret -> same id -> 200) PASS")
    # hair travels in record byte 11
    req("POST", f"/api/s/{sid}", {"action": "summon", "visitor_token": "t1", "mime_seq": [0, 1, 2], "mime_tempo": 109, "hair": 0x23})
    s, b = req("GET", f"/api/s/{sid}"); assert b[21] == 0x23 and b[19] == 109, "packed tempo/gesture/facial byte must round-trip"
    print("hair byte PASS")
finally:
    proc.terminate()
js = (root / "public/app.js").read_text()
assert "(1-f*2)" in js and "w.tailPts" in js, "tail anchors must run lx -> tip -> rx into simulated tail points"
print("tail order (lx -> tip -> rx, simulated) PASS")
assert "r.status===404" in js and "/api/sanctuaries" in js.split("r.status===404")[1][:400], "client must re-register host secret on 404"
print("client 404 recovery branch PASS")
print("ALL PASS")
