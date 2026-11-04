# Project Outline: Pantom (Anonymous Ghost-Mime Sanctuary)

A lightning-fast, self-contained web toy and micro-social sanctuary built with a high-performance Rust backend and a lightweight Vanilla JavaScript frontend. It features ephemeral 100-slot FIFO memory buffers, random IDs (zero-signup), hot-swappable graphic assets, and expressive ghost-miming choreography instead of text.

---

## 1. Hype Name & Domain Candidates
Short, coined, phonetically soft compounds optimized for open `.sh`, `.gg`, `.space`, or `.xyz` TLDs and clean bio links:
* **`wispn`** (`wispn.sh` / `wispn.space`) — *Wisp + Haven*.
* **`mimikri`** (`mimikri.gg` / `mimikri.space`) — *Mime + Mimicry + Spirit*.
* **`pantom`** (`pantom.sh` / `pantom.space`) — *Pantomime + Phantom*.

---

## 2. Core Architectural Principles
* **Zero Registration / Random IDs:** No usernames or user accounts. Host and visitor identities are managed via cryptographically derived 64-bit random IDs (`u64`) and local storage tokens.
* **Bounded Scarcity ($N=100$):** Each sanctuary maintains a strict FIFO memory buffer of the last 100 visitor ghost souls. The oldest ghost automatically drifts off the edge when the 101st arrives.
* **Binary Wire Protocol:** Communication avoids bloated JSON in favor of tight, packed binary buffers (12 bytes per ghost record) for instant loading and minimal server overhead.
* **Non-Verbal Miming:** Replaces text comments with 3-step animated choreographies, eliminating linguistic barriers and ego-signaling.

---

## 3. Data & Cryptographic Routing Architecture

### A. Cryptographic Random IDs (`u64`)
* **URL Structure:** `https://pantom.sh/#9x4m2p8q` (using URL hash for single-page app state routing).
* **Host Verification:** When a user clicks "Open Sanctuary," the client generates a random 128-bit `host_secret`. The public sanctuary ID is derived via truncated hash:
  $$\text{sanctuary\_id} = \text{u64::from\_le\_bytes}(\text{BLAKE3}(\text{host\_secret})[0..8])$$
* **Zero Database Required:** The server does not store accounts. Any request with a valid `host_secret` pre-image automatically unlocks Host privileges.

### B. Rust Memory Structure (`DashMap` + `VecDeque`)
```rust
#[repr(C, packed)]
#[derive(Clone, Copy)]
struct SoulRecord {
    visitor_id: u32,      // 4B: Truncated hash of visitor's local token
    appearance: u8,       // 1B: 4 bits body_tint | 4 bits eye_style
    item_and_hat: u8,     // 1B: 4 bits held_item | 4 bits hat
    mime_seq: [u8; 3],    // 3B: [beat_0, beat_1, beat_2] (0..7 mime primitives)
    mime_tempo: u8,       // 1B: Speed of mime animation
    host_react: u8,       // 1B: 0 = unread, 1..8 = Host reaction mime ID
    padding: u8,          // 1B: Alignment padding -> Exactly 12 Bytes
}

struct Sanctuary {
    last_active: u32,     // Unix timestamp for 30-day auto-eviction
    env_id: u8,           // 0: Forest, 1: Heaven, 2: Sea, 3: Dunes, 4: Mountain, 5: Beach
    host_ghost: [u8; 7],  // Host appearance + mime loop state
    souls: VecDeque<SoulRecord>, // Bounded max capacity of 100 (~1.2 KB)
}
```

---

## 4. Hot-Swappable Asset Pipeline
Decouples the rendering engine from graphic files via a strict directory structure and a `manifest.json` file, allowing you to swap vector SVGs for hand-painted assets in seconds without touching code:

```text
/public
  ├── index.html
  ├── app.js
  ├── style.css
  └── /assets
        ├── manifest.json
        ├── /environments
        │     ├── forest_bg.webp, heaven_bg.webp, sea_bg.webp
        │     └── dunes_bg.webp, mountain_bg.webp, beach_bg.webp
        └── /ghost
              ├── bodies/   (0.svg .. 4.svg)
              ├── eyes/     (0.svg .. 4.svg)
              ├── hands/    (0.svg .. 2.svg)
              └── items/    (0.svg .. 4.svg)
```

---

## 5. The Ghost-Mime Choreography Engine
Visitors choose a **3-Beat Mime Loop** from 8 core primitives executed via CSS transforms:
1. **Shy Peek** (Covers eyes, peeks through)
2. **Happy Hop** (Vertical bounce & wave)
3. **Slow Sway** (Side-to-side drift)
4. **Curious Tilt** (Leans in closely)
5. **Offering Bow** (Extends held item)
6. **Dizzy Spin** (360-degree twirl)
7. **Shiver / Huddle** (Curling inward)
8. **Orbit Dance** (Circles the room)

---

## 6. 2.5-Hour Implementation Plan

1. **Phase 1: Rust Backend (30 mins)**
   * Set up `axum`, `tokio`, `dashmap`, and `blake3`.
   * Implement `GET /api/s/:id` (binary packet delivery based on Host vs. Visitor role) and `POST /api/s/:id` (summon/react handlers).
   * Add a background cleanup task to drop sanctuaries inactive for >30 days.

2. **Phase 2: Environments & Mime CSS (45 mins)**
   * Code the 6 environment themes with CSS gradients and ambient particle animations.
   * Write the 8 `@keyframes` rules for the ghost mime primitives.

3. **Phase 3: Vanilla JS Client (45 mins)**
   * Build the binary packet encoder/decoder using native `Uint8Array` and `fetch()`.
   * Implement the 1.2-second choreography ticker cycling through the 3-step mime sequence.
   * Create the minimalist Summon Drawer (visitor) and Host Tap-to-React radial menu.

4. **Phase 4: Polish & Deploy (30 mins)**
   * Compile release binary (`cargo build --release`).
   * Deploy on Fly.io or a cheap VPS, point domain, and test live.
--
* KISS
* Commit on Feature changes
* Pragmatic Solutions
* E2E testing locally
