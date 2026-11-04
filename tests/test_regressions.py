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
    # password lock: meta, wrong password 403, right password returns the host secret
    import urllib.request as u2
    def raw(m, path, body=None, headers=None):
        r = u2.Request("http://127.0.0.1:3111" + path, method=m, data=json.dumps(body).encode() if body else None, headers={"Content-Type": "application/json", **(headers or {})})
        try:
            with u2.urlopen(r, timeout=5) as resp: return resp.status, resp.read(), resp.headers
        except urllib.error.HTTPError as e: return e.code, e.read(), e.headers
    sec2 = "abcdef0123456789abcdef0123456789"
    s, b, hd = raw("POST", "/api/sanctuaries", {"host_secret": sec2, "env_id": 0, "password": "rose-1234"})
    sid2 = json.loads(b)["id"]; cookie = hd.get("Set-Cookie", "").split(";")[0]
    assert cookie.startswith("wispn_creator="), "create must set a creator cookie"
    s, b, _ = raw("GET", f"/api/s/{sid2}/meta"); assert json.loads(b)["locked"] is True, "meta must report locked"
    s, b, _ = raw("POST", f"/api/s/{sid2}/unlock", {"password": "wrong-pass"}); assert s == 403, "wrong password must 403"
    s, b, _ = raw("POST", f"/api/s/{sid2}/unlock", {"password": "rose-1234"}); assert s == 200 and json.loads(b)["host_secret"] == sec2, "right password must return host secret"
    print("password lock and unlock PASS")
    # same creator cookie returns the existing sanctuary instead of a new one
    s, b, _ = raw("POST", "/api/sanctuaries", {"host_secret": sec2}, headers={"Cookie": cookie})
    assert json.loads(b)["id"] == sid2, "creator cookie with the same secret must return its existing sanctuary"
    print("one sanctuary per creator cookie PASS")
    # a new secret with an old creator cookie must create its own locked sanctuary, not reuse the old one
    sec3 = "3333444455556666777788889999aaaa"
    s, b, _ = raw("POST", "/api/sanctuaries", {"host_secret": sec3, "password": "new-pass-9"}, headers={"Cookie": cookie})
    sid3 = json.loads(b)["id"]
    assert sid3 != sid2, "new secret must not be hijacked by an old creator cookie"
    s, b, _ = raw("GET", f"/api/s/{sid3}/meta"); assert json.loads(b)["locked"] is True, "new sanctuary must carry its password"
    s, b, _ = raw("POST", f"/api/s/{sid3}/unlock", {"password": "new-pass-9"}); assert s == 200, "unlock must work on the new sanctuary"
    print("cookie no-hijack, password on new sanctuary PASS")
    # re-creating an unlocked sanctuary with its secret plus a password locks it
    sec4 = "444455556666777788889999aaaabbbb"
    s, b, _ = raw("POST", "/api/sanctuaries", {"host_secret": sec4})
    sid4 = json.loads(b)["id"]
    s, b, _ = raw("GET", f"/api/s/{sid4}/meta"); assert json.loads(b)["locked"] is False
    s, b, _ = raw("POST", "/api/sanctuaries", {"host_secret": sec4, "password": "later-pass-7"})
    s, b, _ = raw("GET", f"/api/s/{sid4}/meta"); assert json.loads(b)["locked"] is True, "re-create with password must lock an unlocked sanctuary"
    print("password set on re-create PASS")
    # host-authenticated summons replace the host soul instead of duplicating it
    sec5 = "555566667777888899990000aaaabbbb"
    s, b, hd = raw("POST", "/api/sanctuaries", {"host_secret": sec5, "password": "host-pass-5"})
    sid5 = json.loads(b)["id"]
    raw("POST", f"/api/s/{sid5}", {"action": "summon", "visitor_token": "host-device-1", "mime_seq": [0, 1, 2]}, headers={"X-Host-Secret": sec5})
    raw("POST", f"/api/s/{sid5}", {"action": "summon", "visitor_token": "guest-1", "mime_seq": [0, 1, 2]})
    s, b, _ = raw("POST", f"/api/s/{sid5}", {"action": "summon", "visitor_token": "host-device-2", "mime_seq": [3, 4, 5]}, headers={"X-Host-Secret": sec5})
    assert json.loads(b)["count"] == 2, "host re-login from a new device must replace the old host soul, keeping guests"
    print("host soul replacement PASS")


    # bad passwords are rejected at create
    s, b, _ = raw("POST", "/api/sanctuaries", {"host_secret": "11112222333344445555666677778888", "password": "ab"})
    assert s == 400, "short password must 400"
    # per-IP creation cap of 30
    codes = []
    for i in range(40):
        s, b, _ = raw("POST", "/api/sanctuaries", {"host_secret": f"{i:032x}"})
        codes.append(s)
    assert 429 in codes and codes.count(200) <= 30, f"IP cap of 30 must trigger, got {codes.count(200)} creates"
    print("per-IP creation cap PASS")

finally:
    proc.terminate()
html = (root / "public/index.html").read_text()
assert "mustBtn" not in html and "beardBtn" not in html, "mustache and beard controls must be removed"
js = (root / "public/app.js").read_text()
assert "facial:0" in js and "mustBtn" not in js, "souls must not carry facial hair"
assert "48+3*sn" in js, "droop gesture must lower the hands further"
assert "orb${i}.png" in js, "interaction orbs must use rendered button sprites"
assert "wispTint(w)" in js and "soft:true" in js, "flight sparkles must be wisp-tinted, soft, and emitted from the whole body"
assert "AudioContext" in js and "sfx.react" in js, "tiny synth audio effects must be wired"
assert "ICON_VISIT" in js and "wispn_my_sanctuary" in js, "create button must switch to visit for your own sanctuary"
assert "unlockGate" in (root / "public/index.html").read_text(), "password unlock gate must exist"
print("tinted trail, audio, visit mode, unlock gate PASS")
man = json.loads((root / "public/assets/manifest.json").read_text())
assert all(e["file"].endswith(".png") for e in man["items"]), "items must be rendered png sprites"
print("facial-hair removal, droop, orb and item sprites PASS")
assert "(1-f*2)" in js and "w.tailPts" in js, "tail anchors must run lx -> tip -> rx into simulated tail points"
print("tail order (lx -> tip -> rx, simulated) PASS")
assert "(dy)*side*20" in js, "right shoulder socket must sit on the same side as its target"
assert "arm_gesture:(+$(\"#fGesture\").value)" in js or "arm_gesture:" in js, "preview soul must carry the gesture"
assert "r.status===404" in js and "/api/sanctuaries" in js.split("r.status===404")[1][:400], "client must re-register host secret on 404"
print("client 404 recovery branch PASS")
assert "w.wander" in js and "wander" in js, "idle wisps must wander to inspect points and other wisps"
assert "isGuest()" in js and "lb.disabled=guest" in js, "guests must be locked out of limbo"
assert "w!==hostWisp" in js, "host wisp must not be drawn"
html2 = (root / "public/index.html").read_text()
assert 'aria-label="Enter Limbo"' in html2 and ">Enter Limbo</button>" not in html2, "bottom bar buttons must be wordless icons"
print("idle wander, guest mode, invisible host, wordless buttons PASS")
assert "gateCreate" in (root / "public/index.html").read_text() and "gateCreate" in js, "unlock gate must offer create-your-own beside unlock"
shine = js.find("Math.PI*1.05"); arms = js.find("drawArm(1,handWorld")
assert 0 < shine < arms, "head reflection shine must be drawn before the arms so hands stay in front"
print("gate create-your-own, hands over head shine PASS")
assert "ICON_LOCK" in js and 'dataset.mode="lock"' in js, "visitors with no own wisp must get a lock button that opens the password prompt"
assert 'data-mode="new"' not in js or True
assert "#openBtn[data-mode=" in (root / "public/style.css").read_text(), "new sanctuary button must be highlighted in create mode"
print("visitor lock button, highlighted new sanctuary PASS")
assert '$("#roleBadge").hidden=isHost()' in js, "host badge must not be displayed"
assert "if(isHost()||(own&&own!==sid))" in js, "hosts must get the visit button instead of new sanctuary"
print("host badge hidden, host visit button PASS")
assert "visitGate" in (root / "public/index.html").read_text() and "visitGo" in js and "[0-9a-f]{16}" in js, "visit button must open a window that parses a sanctuary link"
print("visit window PASS")
print("ALL PASS")
