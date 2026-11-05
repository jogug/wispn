# MASTER VISUAL, ANIMATION & INTERFACE SPECIFICATION: PANTOM (PHASE 2)

**STRICT DIRECTIVE FOR THE AI AGENT:**
Do **NOT** output programmer-art boxes, stiff linear CSS transitions, static images sliding across the screen, or standard HTML form buttons floating over the world. You are building a tactile, high-craft 2D procedural animation toy (think *Sky: Children of the Light*, *Journey*, or *LocoRoco* in 2D). Every single visual element, bone socket, cloth ripple, eye movement, and spatial interaction must follow the exact visual quality and behavioral rules defined below.

---

## 1. THE WISP ANATOMY, SKELETAL RIG & SOCKET FIDELITY

A Wisp is **never** a static sprite. It is a multi-layered, procedurally deformed skeletal figure with soft-body cloth dynamics, expressive eyes, and articulated limbs.

### 1.1 Exact Layering & Draw Order (Back-to-Front Z-Sorting per Wisp)
Every single frame, each Wisp must be drawn in this exact 9-layer painter's algorithm order so body parts and accessories overlap naturally:
1. **Layer 0 — Back Aura Glow:** A soft radial gradient circle centered at the Wisp's chest (`radius = 65px`, opacity pulsing between `0.15` and `0.30` at `0.8 Hz`, using `globalCompositeOperation = 'screen'`).
2. **Layer 1 — Back Arm (Further from movement direction):** The 2-bone IK arm that is currently angled behind the torso, drawn as a soft rounded capsule (`lineCap = 'round'`, `lineWidth = 8px`) with a tiny circular hand (`radius = 5px`).
3. **Layer 2 — Inner Cloth Shadow (Back Interior of Sheet):** At the bottom hem opening of the ghost sheet, draw a darker, desaturated ellipse (`#1a162b` at `0.45` opacity) connecting the left and right hem corners so the ghost sheet looks hollow and 3D from underneath.
4. **Layer 3 — Main Cloth Body (Procedural Verlet Sheet):** The continuous, smooth, closed spline hull driven by the 5-node Verlet spine (detailed in Section 2). Filled with a vertical linear gradient from the head (`100%` aura tint brightness, `0.95` opacity) down to the tail hem (`75%` brightness, `0.40` translucent fade).
5. **Layer 4 — Facial Blush & Eye Rig (With 2.5D Parallax):**
   * **Cheek Blushes:** Two soft pink/coral radial ovals (`10px x 6px`, `0.35` opacity) sitting just below and outside the eyes.
   * **Eyes:** Drawn from hot-swappable SVG/PNG eye assets (`assets/ghost/eyes/0..4.svg`), offset horizontally and vertically by the live gaze vector, plus procedural blinking (every `3.2` to `6.0` seconds, vertical scale squashes `1.0 -> 0.05 -> 1.0` over `140ms`).
6. **Layer 5 — Hat / Head Accessory Socket:** Drawn anchored to the top of the head dome, inheriting head tilt, squash-and-stretch, and secondary bounce lag.
7. **Layer 6 — Front Arm (Closer to viewer/target):** Drawn on top of the cloth body so the Wisp can cross its arms over its chest, cover its own eyes (`Shy Peek`), or reach forward toward a partner.
8. **Layer 7 — Held Item Socket (Pendulum-Coupled):** Attached to the Front Hand end-effector `(handX, handY)`, rotating with a physical pendulum swing lag and emitting its own micro-light or particle (e.g., lantern glow, teacup steam).
9. **Layer 8 — Rim Light / Specular Highlight:** A crisp, thin (`2.5px` wide, `0.6` opacity white) crescent curve traced along the upper-left contour of the head and shoulder cloth hull to give the Wisp a glossy, studio-lit vinyl/spirit finish.

---

### 1.2 The 5-Node Skeletal Spine & Exact Socket Coordinates
The Wisp's local coordinate space is scaled to a nominal height of `90px` and width of `56px`.
* **Node 0 (`Head_Core`):** The root driver node. Radius $R_0 = 26\text{px}$ (a perfectly round, squishy dome).
* **Node 1 (`Neck_Thorax`):** $14\text{px}$ below Node 0. Radius $R_1 = 28\text{px}$ (slightly wider belly/chest taper).
* **Node 2 (`Mid_Skirt`):** $15\text{px}$ below Node 1. Radius $R_2 = 25\text{px}$.
* **Node 3 (`Lower_Skirt`):** $16\text{px}$ below Node 2. Radius $R_3 = 20\text{px}$.
* **Node 4 (`Tail_Hem`):** $16\text{px}$ below Node 3. Radius $R_4 = 12\text{px}$.

**Strict Attachment Socket Rules (How Accessories Lock to the Body):**
Accessories must **NEVER** float statically or clip awkwardly through the head. Every accessory uses an explicit **Anchor Socket** with local pivot coordinates `(pivotX, pivotY)` defined in `assets/manifest.json`:

1. **`Hat_Socket` (Attached to Node 0 `Head_Core`):**
   * **Base Position:** Located at local offset `(0, -24px)` relative to `Node 0`, rotated by the head's pitch angle $\theta_{\text{head}}$ (the angle between Node 0 and Node 1).
   * **2.5D Parallax Counter-Shift:** When the eyes look right by $+\Delta x$, the `Hat_Socket` shifts slightly left by $-0.20 \cdot \Delta x$ and tilts by $-0.015 \cdot \Delta x$ radians. This sells the illusion that the head is a 3D sphere rotating in space.
   * **Secondary Spring Follow-Through (Overlap Principle):** When the Wisp stops moving upward or lands from a hop, the hat must **not** stop instantly. It has its own vertical spring-damper (`stiffness = 180`, `damping = 12`) that causes the hat to lift up `4px` off the head during a fast drop and squash down `3px` onto the brow upon landing.

2. **`Eye_Socket` (Attached to Node 0 `Head_Core`):**
   * **Base Position:** Local offset `(0, -4px)` relative to `Node 0`, rotating with $\theta_{\text{head}}$.
   * **Gaze Clamping Ellipsoid:** The entire facial assembly (eyes + cheek blush) translates inside an elliptical boundary (`maxHorizontal = 8px`, `maxVertical = 5px`) toward the current `Gaze_Target`.
   * **Perspective Foreshortening:** When the gaze offset is near the left or right edge (`|dx| > 5px`), the eye closer to the edge compresses horizontally to `82%` width (`scaleX = 0.82`), creating an authentic 3D head-turn perspective.

3. **`Shoulder_L` & `Shoulder_R` Sockets (Attached to Node 1 `Neck_Thorax`):**
   * Located at local offsets `(-20px, -2px)` and `(+20px, -2px)` perpendicular to the spine segment between Node 0 and Node 1.

4. **`Hand_Item_Socket` (Attached to the IK Hand End-Effector):**
   * The held item (Lantern, Sprout, Star Shard, Teacup, Seashell) snaps its custom `(pivotX, pivotY)` handle directly to the active hand's world coordinate `(handX, handY)`.
   * **Pendulum vs. Rigid Mode:**
     * *Dangling Items (Lantern, Teacup):* Hang downward from the hand with a gravity pendulum solver so they swing back and forth when the Wisp flies or waves its arm.
     * *Rigid Held Items (Sprout, Star Shard, Seashell):* Inherit the exact rotation angle of the forearm bone (`elbow -> hand` angle) plus a `45°` natural wrist tilt.

---

## 2. EFFICIENT, HIGH-CRAFT CLOTH SIMULATION

The ghost sheet must look fluid, billowy, and responsive to both flight speed and environmental wind—never like a rigid triangle or a jagged polygon.

1. **Verlet Rope Spine Dynamics:**
   * Only `Node 0` is pulled directly by the Wisp's steering force.
   * `Nodes 1..4` trail behind using Verlet integration with velocity damping and environmental wind/current forces.
   * **Angular Bend Limit:** No spine segment is allowed to bend more than `32°` relative to its parent segment. This prevents the ghost sheet from creasing sharply or turning inside-out during sudden U-turns.
2. **Smooth Contour Extrusion (No Sharp Corners):**
   * For each spine node $i \in [0..4]$, compute the left and right outer contour points by stepping perpendicular to the spine tangent by radius $R_i$.
   * **Squash and Stretch on `Node 0`:** When vertical acceleration is high (e.g., during a hop or sudden flight burst), `Node 0` stretches up to `115%` along the velocity vector and squashes to `87%` perpendicular to it (preserving volume).
3. **The Wavy Scalloped Bottom Hem (The "Ghost Sheet" Signature):**
   * Instead of ending in a pointy tail at `Node 4`, the bottom edge between Left Contour Point 4 and Right Contour Point 4 is bridged by a **4-scallop undulating wave** (5 control points across the bottom width).
   * Each hem control point oscillates vertically and horizontally using a traveling sine wave (`phase = time * 6.0 + pointIndex * 1.5 + velocity * 0.1`).
   * The entire outer silhouette (Head Dome $\rightarrow$ Right Side Curve $\rightarrow$ Wavy Scalloped Bottom Hem $\rightarrow$ Left Side Curve $\rightarrow$ Head Dome) is rendered as a single continuous, smooth cubic Bézier / Catmull-Rom path.

---

## 3. AUTONOMOUS LIFE: EYE GAZE, BLINKING & IDLE PERSONALITY

Even when nobody is clicking, a sanctuary of Wisps must feel teeming with quiet life and awareness:

1. **Intelligent Gaze Priority System (Where the Eyes Look):**
   Every Wisp continuously evaluates what to look at in this exact priority order:
   * **Priority 1 (Active Interaction):** Locked onto the eyes or held item of the Wisp it is flying toward or interacting with.
   * **Priority 2 (User Cursor / Finger Proximity):** If the user's cursor/finger moves within `220px` of a Wisp, the Wisp immediately glances at the cursor and tilts its head `8°` in curiosity.
   * **Priority 3 (Passing Neighbor):** If another Wisp drifts within `130px`, both Wisps glance at each other in passing for `1.2 seconds`.
   * **Priority 4 (Environmental Saccades):** Every `1.8` to `4.5` seconds, the Wisp darts its eyes (`saccade speed = 18.0`) to a new nearby ambient particle (a rising bubble, a falling snowflake, or a firefly).
2. **Micro-Expressions & Breathing:**
   * Every Wisp's chest (`Node 1` radius $R_1$) expands and contracts by $\pm 1.5\text{px}$ on a slow breathing rhythm.
   * Eye assets (`0..4`) support 5 distinct emotional states:
     * `0: Soft Wonder` (Large oval eyes with twin white specular catchlights that jiggle slightly when moving).
     * `1: Happy Arc` (`^ ‿ ^` crescent happy eyes).
     * `2: Wide Curious` (`⊙ _ ⊙` dilated pupils with rapid saccades).
     * `3: Peaceful Slumber` (`∪ ‿ ∪` closed serene lashes with slower breathing).
     * `4: Cozy Starry` (Pupils shaped like tiny 4-point stars that slowly rotate).

---

## 4. THE 2-BONE IK SOLVER & MIME CHOREOGRAPHY FIDELITY

The Wisp's arms must **never** just rotate from the shoulder like stiff clock hands. They use a true 2-Bone Inverse Kinematics solver (`Shoulder -> Elbow -> Hand`) where the hand (`End-Effector`) is driven toward specific world or local targets, and the elbow naturally bends outward.

### 4.1 The 8 Expressive Mime Primitives (Driven by IK Targets & Spine Poses)
Each Wisp loops a 3-beat choreography (`Beat 0 -> Beat 1 -> Beat 2`, `1.2 seconds` per beat with smooth cubic ease-in-out blending between beats):

1. **`0: Shy Peek`**
   * *IK Targets:* Both hands move directly over the `Eye_Socket` coordinates `(-7px, -4px)` and `(+7px, -4px)`. Halfway through the beat, the right hand slides down `10px` while the eye peeks out, and cheek blush opacity doubles to `0.75`.
2. **`1: Happy Hop`**
   * *Spine & IK:* Root `Node 0` executes two lively vertical parabolic hops (`height = 22px`) with squash-and-stretch on landing. Both IK hands reach high above the hat `(-22px, -34px)` and `(+22px, -34px)`, waving outward.
3. **`2: Slow Sway`**
   * *Spine & IK:* The head sways in a wide horizontal figure-eight (`±18px`), trailing the cloth sheet in an S-curve. Both IK hands clasp together softly over the heart `(0px, +8px)`.
4. **`3: Curious Tilt`**
   * *Spine & IK:* The Wisp leans forward toward its gaze target and tilts its head a full `28°` to the side. Left hand rests on its chin `(-8px, +4px)` while the right arm hangs relaxed.
5. **`4: Offering Bow`**
   * *Spine & IK:* The torso bends respectfully forward (`Node 0` dips down `14px` and tilts `25°` toward the partner), while both IK hands extend forward `(±10px, +12px)` presenting the `Held_Item` out in front of the body.
6. **`5: Joyful Twirl`**
   * *Spine & IK:* The Wisp executes a horizontal 3D-illusion turn-around (the eyes, blush, hat pivot, and arms smoothly translate across the horizontal profile from `-R` to `+R`, wrap around the back Z-layer, and return to the front while the cloth skirt flares outward by `+25%` width due to centrifugal force).
7. **`6: Cozy Huddle / Shiver`**
   * *Spine & IK:* The Wisp pulls its spine nodes closer together (`segLen` compresses from `14px` to `10px`), wraps both IK arms across its opposite shoulders in a self-hug, and vibrates horizontally by `±1.5px` at `20 Hz`.
8. **`7: Playful Orbit`**
   * *Spine & IK:* The Wisp banks at a `35°` flight angle and swoops in a `45px` circle around its home spot, arms trailing behind like superhero/airplane wings while its cloth tail traces a glowing ribbon trail.

---

## 5. PRE-JOIN "LIMBO DRESSING ROOM" (BEFORE JOINING — ZERO IN-WORLD MENUS)

**CRITICAL UX RULE:** You cannot open customization menus while inside the Sanctuary. All dressing, accessory fitting, and mime choreography programming happens **BEFORE** entering the world, inside the **Limbo Threshold**.

### 5.1 Visual Design of the Limbo Threshold
1. **Frosted Portal Backdrop:**
   * When a user opens a link (`/?s=...`), the live Sanctuary environment renders in the background canvas, but is covered by a translucent atmospheric veil (`backdrop-filter: blur(16px) brightness(0.65)` or a multi-pass canvas blur + dark vignette) with a glowing circular **Portal Arch / Aperture** at the top center of the screen.
2. **Center-Stage Hero Wisp (2.0x Scale):**
   * The user's Wisp floats in the center of the Limbo screen at **200% magnification** under a warm spotlight so every detail of the cloth simulation, eye tracking, and socket attachment is crisp and tactile.
   * As the user moves their mouse/finger around the dressing controls, the Hero Wisp's eyes actively watch the user's cursor!
3. **Tactile Dressing Controls (Physics-Coupled Feedback):**
   * **Aura Tint Orbs (5 glowing floating droplets):** Clicking an orb splashes a radial color wave from `Node 0` down to `Node 4` of the cloth sheet, while the Wisp does a tiny happy squash-bounce.
   * **Eye Expression Carousel:** Clicking a new eye style causes the Wisp to blink shut (`70ms`), swap the eye asset while closed, and open with the new expression.
   * **Hat Shelf (Physical Drop-On Animation):** Selecting a hat does **not** just pop it into existence. The hat spawns `40px` above the Wisp's head and physically drops down onto the `Hat_Socket`, compressing the `Hat_Socket` spring and squashing the Wisp's head down by `6px` on impact!
   * **Spirit Item Rack (IK Grab Animation):** Selecting a held item causes the Wisp's Front IK Arm to physically reach out toward the side of the screen, grab the item, and bring it back to its resting posture.
   * **3-Beat Mime Sequencer Ribbon:** Three circular beat slots (`Beat 1`, `Beat 2`, `Beat 3`). Whenever the user changes a beat slot, the Hero Wisp immediately performs that specific mime move on stage so the user sees the exact body language before joining.
4. **The "Cross Into Sanctuary" Portal Transition (Entering the World):**
   * Instead of a boring page reload or instant cut, clicking **"Release Into Sanctuary"** (or dragging the Wisp upward into the top Portal Arch) triggers a `1.1-second` continuous cinematic transition:
     1. The Limbo UI controls smoothly fade and slide away (`opacity: 0` over `300ms`).
     2. The Hero Wisp turns upward, stretches into flight posture, and flies through the glowing Portal Arch while shrinking from `2.0x` scale down to `1.0x` world scale.
     3. The background blur dissolves (`16px -> 0px`), revealing the crisp Sanctuary environment as the Wisp swoops down to take its place beside the Host.
5. **How to Re-Dress Later (Diegetic Exit):**
   * Inside the Sanctuary, there are **zero** "Edit Profile" buttons. A subtle glowing mist sits at the very bottom edge of the screen. If the Visitor or Host drags their own Wisp down into that bottom mist, they pull their Wisp back out into the Limbo Dressing Room, adjust their look, and fly back in.

---

## 6. DIEGETIC IN-WORLD INTERACTIONS: TAP-TO-FLY & PAIRED IK HANDSHAKES

Once inside the Sanctuary, the screen is **100% pure canvas world** (zero HTML popups, zero modal dialogs, zero floating toolbars). Every interaction is physical and spatial.

### 6.1 Hover & Touch Affordances
* Moving the cursor over any Wisp causes that Wisp to immediately look at the cursor, perk up (`+4px` vertical float), and emit a soft radial ripple ring around its aura.

### 6.2 Tap-to-Fly Flight Choreography (Cubic Bézier Swoop)
When a Visitor taps the Host Wisp (or when the Host taps any of the 100 Visitor Wisps):
1. **Anticipation Frame (`0ms - 120ms`):** The initiating Wisp squashes slightly downward (`4px`) and locks its eye gaze onto the target Wisp.
2. **Arcing Flight Path (`120ms - 850ms`):**
   * The Wisp does **not** move in a robotic straight line. It flies along a curved **Cubic Bézier arc** (curving slightly upward or downward around obstacles) toward a meeting point spaced `64px` horizontally to the left or right of the target Wisp (matching the target Wisp's exact Y elevation).
   * During flight, the Wisp's head pitches forward up to `35°` into the velocity vector, its Verlet cloth streams horizontally behind it, and a trail of 6 fading luminescence motes spawns from its hem.
3. **Braking & Arrival Flare (`850ms - 1050ms`):**
   * As the Wisp decelerates into the `64px` meeting spot, its cloth tail swings forward underneath it (pendulum follow-through), its hat bounces on its spring, and both Wisps turn to face each other eye-to-eye.

### 6.3 Paired Synchronized IK Interactions (Physical Contact Between Two Wisps)
Once the two Wisps are face-to-face (`flightState === 'INTERACTING'`), their **2-Bone IK Solvers couple together** in shared world space:

* **Visitor Initiating Greeting:**
  * Both Wisps lock eye contact. The Visitor Wisp performs its 3-beat mime sequence at close range while its front IK hand reaches toward the midpoint between the two Wisps. The Host Wisp tilts its head and watches attentively, nodding (`Node 0` bobbing `±3px`) on each beat.
* **Host Reacting to a Visitor (The Diegetic Spirit Orb Wheel):**
  * When the **Host** flies up to one of the 100 Visitor Wisps, no HTML menu appears. Instead, **5 tiny glowing Spirit Orbs** blossom outward in a semi-circular halo around the Visitor Wisp in world space, bobbing gently:
    1. **Orb 1 — Soul Embrace (Two-Wisp Hug):** Both Wisps glide `36px` closer together until their cloth bodies softly compress against each other. Both Wisps' Left and Right IK Arms solve directly onto the *other* Wisp's shoulder sockets, wrapping around each other while swaying side-to-side for `2.5 seconds` with a burst of warm peach heart-sparks.
    2. **Orb 2 — Double High-Five / Spark Clap:** Both Wisps rear back slightly (`anticipation`), then thrust both IK hands to the exact world midpoint $\mathbf{M} = \frac{\mathbf{P}_1 + \mathbf{P}_2}{2}$ between them. At the frame of contact, a bright radial starburst ring expands outward and both Wisps do a synchronized `Happy Hop`.
    3. **Orb 3 — Lantern / Light Share:** The Host Wisp raises its held item hand to the midpoint; the Visitor Wisp reaches both IK hands out to cup around the Host's hand. A warm golden glow transfers from the Host to the Visitor's aura, permanently tinting the Visitor's rim-light gold.
    4. **Orb 4 — Forehead Boop / Resonance:** Both Wisps lean their `Head_Core` nodes forward until their foreheads gently touch at the midpoint (`distance = 48px`), closing their eyes (`Peaceful Slumber` state) while concentric sound-wave rings ripple outward through the environment.
    5. **Orb 5 — Synchronized Mirror Dance:** Both Wisps perform a synchronized 3-beat `Joyful Twirl` + `Slow Sway` + `Offering Bow` in unison at identical phase and tempo.

* **Persistent Visual Proof of Host Reaction:**
  * Once a Host has reacted to a Visitor Wisp, a tiny glowing **Reaction Halo Charm** permanently orbits that Visitor Wisp's head so that when the Visitor returns to the Sanctuary later, their Wisp and the Host Wisp automatically fly together and replay that shared paired choreography!

---

## 7. CUSTOM MULTI-LAYER ENVIRONMENTS & ATMOSPHERIC PHYSICS

Each of the 6 selectable environments is a rich, multi-layered 2D parallax diorama with distinct lighting, particle ecosystems, foreground silhouettes, and fluid/wind physics that physically push every Wisp's cloth sheet.

### 7.1 The 4 Depth Planes (Rendered in Every Biome)
1. **Plane 0 — Skybox & Celestial Backdrop:** Deep multi-stop gradient sky + procedural stars, sun/moon disc, or underwater surface caustics.
2. **Plane 1 — Far Horizon Parallax (`0.2x` camera drift):** Distant mountain peaks, sunken ruins, cloud cathedrals, or desert mesas.
3. **Plane 2 — Midground Sanctuary Stage (`1.0x` main plane where Wisps live):** Interactive flora/props (swaying kelp, glowing mushrooms, sand ripples, cloud pillows) + the 101 Wisps sorted by Y/depth.
4. **Plane 3 — Foreground Bokeh & Vignette (`1.35x` drift, drawn *in front* of the Wisps):** Out-of-focus foreground silhouettes at the bottom corners and top edges + drifting foreground atmospheric particles that pass in front of the Wisps to create true depth.

### 7.2 Exact Visual & Physical Specification for Each of the 6 Biomes

1. **`0: Ancient Bioluminescent Forest`**
   * **Palette:** Deep midnight emerald (`#071714`) to moss teal (`#13382e`), lit by warm amber (`#ffcb6b`) and cyan (`#5ef2d6`) bioluminescence.
   * **Backdrop & Props:** Layered silhouettes of giant ancient cedar trunks; foreground hanging moss vines at the top corners and glowing mushroom clusters along the bottom floor that pulse softly when a Wisp flies near them.
   * **Particles & Physics:** 45 rising golden-green fireflies with sinusoidal glow trails. Gentle, warm rising thermal breeze (`damping = 0.90`).

2. **`1: Celestial Cloud Heaven`**
   * **Palette:** Iridescent pearl dawn (`#fdf6f0`), soft rose quartz (`#f7d6e0`), periwinkle sky (`#c8d9f8`), and champagne gold (`#ffe399`).
   * **Backdrop & Props:** Diagonal volumetric sunbeams (god-rays drawn as angled translucent additive polygons) slicing down through slow-drifting, multi-layered cumulus cloud banks at the bottom and sides.
   * **Particles & Physics:** 50 floating golden light motes and slow-falling white feathers. Near-weightless, dreamy slow-motion float physics (`gravity = -12 px/s²`, `damping = 0.94`) with an extra bloom halo around every Wisp.

3. **`2: Abyssal Under the Sea`**
   * **Palette:** Sunlit aquamarine top (`#16697a`) plunging into deep bioluminescent indigo (`#061a2e`) with neon coral and cyan accents.
   * **Backdrop & Props:** Animated sinusoidal caustic light web shimmering across the upper third; multi-segment Verlet kelp fronds rooted along the bottom floor that physically sway with the current and bend aside when a Wisp swims past them.
   * **Particles & Physics:** 60 rising translucent bubbles of varying sizes that wobble horizontally as they ascend. High-viscosity fluid drag (`damping = 0.84`) and a rhythmic underwater surge current that sways all Wisp tails and dangled items in unison like sea anemones.

4. **`3: Twilight Starlit Dunes`**
   * **Palette:** Deep violet-indigo night sky (`#140d26`) meeting warm burnt sienna (`#8c3b2b`) and golden ochre (`#d97f38`) sand ridges.
   * **Backdrop & Props:** Three overlapping S-curve desert dune ridges with sharp light/shadow crests; a giant crescent moon and shimmering constellation stars in the upper sky.
   * **Particles & Physics:** 70 fine golden sand-sparkle grains sweeping horizontally across the dune crests. Periodic warm desert wind gusts (`gust every 4.5s`) that make all Wisps' cloth sheets billow dramatically to the right and tilt their hats.

5. **`4: High Alpine Mountain Peak`**
   * **Palette:** Crisp glacier slate (`#0f203c`), alpenglow violet (`#4b3d60`), and stark snow white (`#e8f1fc`).
   * **Backdrop & Props:** Jagged, snow-capped rocky crags framing the left and right edges, with a ribbon of shimmering green-violet Aurora Borealis waving across the upper skybox.
   * **Particles & Physics:** 80 diagonal snowflakes falling across three depth sizes (tiny slow flakes in the far background, medium flakes on the stage, large blurred flakes streaking past the foreground). Brisk, crisp mountain crosswind that keeps Wisp tails fluttering rapidly.

6. **`5: Sunset Bioluminescent Beach`**
   * **Palette:** Warm magenta-coral sunset horizon (`#ff6b6b` to `#feca57`) reflecting over turquoise-violet shallow water (`#1dd1a1` to `#2e1f47`).
   * **Backdrop & Props:** Distant palm/cliff island silhouette on the horizon; at the bottom of the screen, an animated shoreline wave laps forward and recedes every `5.0 seconds`, leaving a wet, reflective mirror sheen on the sand where the bottom-most Wisps cast soft inverted reflections!
   * **Particles & Physics:** Sea-spray mist and glowing blue bioluminescent plankton sparkles washing along the shoreline wave edge. Rhythmic push-and-pull coastal breeze synchronized with the lapping wave.

---

## 8. HOT-SWAPPABLE ASSET CONTRACT (`public/assets/manifest.json`)

So the user can drop in custom hand-drawn PNGs, WebPs, or SVGs at any time without touching a single line of physics or rendering code, the engine loads all visual parts from `public/assets/manifest.json` using explicit socket pivots and bounding sizes:

* **Every Body Color/Texture (`bodies/0..4.svg`):** Can either tint the procedural Verlet cloth spline OR map a repeating/stretched texture pattern onto the cloth hull.
* **Every Eye Asset (`eyes/0..4.svg`):** Centered at `(32, 16)` in a `64x32` viewBox so both eyes scale, blink, and track together.
* **Every Hat Asset (`hats/0..4.svg`):** Defines `"pivotX"` and `"pivotY"` (the exact pixel coordinate of the hat's bottom brim center that locks onto `Hat_Socket`).
* **Every Held Item Asset (`items/0..4.svg`):** Defines `"pivotX"` and `"pivotY"` (the exact pixel coordinate of the handle where the IK hand grips the item) plus `"dangles": true/false` (whether it uses the pendulum swing solver or rigid wrist rotation) and `"glowColor"` (for automatic additive light emission around the item).

---

## 9. Implementation Status (Phase 2 engine, shipped)

One world canvas in `public/app.js` draws each wisp in the 9-layer order. The spine is 5 Verlet nodes (segments 14/15/16/16, radii 26/28/25/20/12) with a 32 degree bend limit, breathing chest, a 4-scallop travelling hem, and a Catmull-Rom hull. Arms are 2-bone IK. Eyes follow the gaze priority stack with ellipsoid clamp, foreshortening, and 140ms blinks. Hats sit on a spring socket (stiffness 180, damping 12). Items hang by pendulum when `dangles` is true and lock to forearm angle otherwise. Eye, hat, and item images load from `public/assets/manifest.json` entries.

The Limbo Threshold is a blurred overlay with a 2x hero wisp that watches the cursor. Release summons after a 1.1 second crossing. There is no in-world summon drawer. Dragging your own wisp into the bottom mist reopens Limbo. Tap-to-fly uses a cubic Bezier swoop to a 64px meeting point. Host flights open 5 canvas spirit orbs. Picking one posts host reactions 1..5, and the stored charm orbits that wisp on later visits.

Environments draw sky, horizon, stage, and foreground vignette planes with the spec palettes, particle counts (45/50/60/70/80/55), wind, and damping values.

Paired orb effects now run full timelines (about 2.6 seconds each). Hug glides both wisps 18px closer with arms solved onto the partner shoulders and heart sparks. High-five has a 400ms anticipation, hands to the midpoint, a 22-particle starburst on contact, and a synchronized hop. Light-share cups both visitor hands at the host hand, spawns gold motes, and sets a permanent gold rim on the visitor. Boop closes to forehead range, forces Peaceful Slumber eyes, and emits expanding rings every 500ms. Mirror-dance forces both wisps through Joyful Twirl, Slow Sway, and Offering Bow at shared phase. The twirl carries a face wrap. Eyes and hat translate across the profile with the sine of the spin and fade to 32 percent opacity on the back half. Held items at index 3 and above emit coloured particles from the manifest glow colour, and flight sheds fading motes from the hem.

Props are simulated. Sea kelp is 9 five-point Verlet strands that sway with the current and bend away from wisps within 60px. Forest mushrooms pulse brighter as a wisp approaches within 110px. Beach draws inverted wisp reflections for wisps in the lower half plus plankton sparkles on the 5 second wave. Dunes run a 4.5 second gust cycle that multiplies cloth wind. Snow, bubbles, and fireflies keep their per-biome motion.

Remaining limits. Reflections are a tinted ellipse silhouette, not a mirrored cloth hull. The boop ring cadence checks elapsed time per frame, so ring spacing is approximate. Visual playback is unverified in this environment because no browser is available.

## 10. Customisation, hair, drag, and painted backgrounds

Hair is configurable in Limbo (6 styles, 5 colours) and travels in the record padding byte. Style is the low nibble, colour the high nibble. Each strand is a Verlet point pulled toward its head anchor with gravity, wind, and dune gusts, drawn behind and in front of the body by style. Mime beats now blend. The last quarter of each 1.2 second beat smoothstep-mixes root motion, squash, head tilt, and both hand targets into the next beat, so choreography no longer snaps. Arms are drawn in the body cloth material with a tint gradient, tapered capsule segments, and tinted hands.

Dragging uses pointer events with mouse and touch fallbacks, works on any wisp, keeps the grab offset, shows grab and grabbing cursors, and sets the drop point as the new home. Dropping your own wisp in the bottom mist still opens Limbo. This replaces the own-wisp-only pointer handling that failed in LibreWolf.

All 6 environments now load generated painted backgrounds from `public/assets/environments/{name}_bg.jpg`, cover-fitted with a slow drift, with the canvas particles, props, and vignette composited on top. The procedural gradient remains as a loading fallback.

## 11. Beach rework, biome-first Limbo, button system (latest)

Beach was repainted end to end: `beach_bg.jpg` is a new sunset-lagoon painting, `beach_far.jpg` is its blurred far layer, and `beach_fg2.png` is an image-generated foreground frame (dark palm shoreline on a flat chroma background, keyed out with ImageMagick) regenerated from the new background so all layers share one style. `beach_fgapi.png` is a flipped, darkened derivative of that same frame. All four layers still draw behind the wisps with cover bleed.

Limbo now opens with the Biome selector as its first section. The top-bar button formerly labelled Open Sanctuary is now New Sanctuary: it opens Limbo with `pendingNew` set, and Release creates the sanctuary with the chosen biome and then summons into it. Enter Limbo only dresses and joins the sanctuary already open, so the two flows no longer duplicate each other.

Removed: the canvas-drawn glowing mushroom lights at the bottom of the forest, and the simulated sea kelp/seagrass strands (code deleted, not just disabled). Dark plant and mushroom silhouettes that are painted into the forest and sea foreground layer artwork remain part of those paintings.

Buttons follow one generated style reference, kept at `public/assets/ui/button-style.jpg`: a large warm amber pill for the primary action (Release Into Sanctuary, Enter Limbo), dark deep-teal pills with a green rim for secondary actions (Share, New Sanctuary, Close), and a gold rim on selected Limbo cards. The primary rule uses `#bottomBar #limboBtn` so it outranks the generic bottom-bar button rule. Dropdowns use the same teal pill treatment.

## 12. Memorable interactions, fat-finger closet, segmented hats (latest)

Pair interactions now have signature effects. Hug opens with a pink ring pulse and a ten-heart fountain. High-five bursts into alternating star sparkles with a shockwave ring. Light-share raises expanding gold halo ellipses and keeps the permanent gold rim. Boop floats sleepy Z particles from the partner while rings expand. Mirror-dance trails rising music notes and star sparkles. Tapping a wisp fires a small star burst before the flight, flights and drags shed motes, and reaction orbs grew to 42px with a gold rim and named toasts (Shared a hug, Shared light, and so on). Visitors no longer sit idle after flying to a wisp: a random effect auto-plays on arrival, since only the host gets the orb wheel.

The Limbo editor is built for thumbs. Cards are at least 64px tall, toggles 52px, swatches 48px circles, colour inputs 72 by 56px, and the tempo slider has a 48px hit area with an amber thumb accent. Every dropdown now uses the exact secondary-button treatment (deep-teal gradient, green rim, pill) including its option list, so fields and buttons share one language. Release Into Sanctuary is renamed Save, and Save plus Close live in a sticky action bar that stays on screen while the panel scrolls (lifted above the bottom nav on mobile). Behind the hero wisp, the editor now paints a generated cosy closet backdrop (`public/assets/ui/closet.jpg`, drawn cover-fit into the hero canvas): wardrobe, folded cloaks, hat stand, mirror, and rug.

Hats are rendered, not emoji. A five-hat sheet (top hat, leaf circlet, crown, cap, moon nightcap) was generated on a flat chroma-green background, keyed out, and segmented into `public/assets/ghost/hats/0..4.png`; the manifest points at the PNGs and the Limbo hat cards preview the actual sprites. The old hat SVGs remain on disk unused.

Five more hats were rendered the same way (second chroma sheet, keyed and segmented into `hats/5..9.png`): wizard hat, mushroom cap, angel halo, pirate tricorn, and sunflower bonnet. The hat slot widened from 5 to 10 styles plus None (low nibble modulo 11), the manifest lists all ten, and the Limbo cards preview each sprite.

## 13. Rendered items and orbs, facial-hair removal, Limbo layout (latest)

Items and interaction buttons are rendered sprites now, generated on chroma sheets, keyed, and segmented like the hats: `items/0..4.png` (blossom, star wand, mushroom, crystal ball, candle) and `public/assets/ui/orb0..4.png` (heart, hand, flame, swirl, notes medallions drawn at 48px in the orb wheel, emoji fallback only while loading). The manifest points at the item PNGs and the Limbo cards preview the real sprites.

Mustache and beard are removed: the Limbo sections, toggles, colour picker, renderer, and packed facial bits are gone (the byte keeps its layout, facial is always 0). Eye cards put each eye asset on a cream chip so the dark eye art reads against the panel. Limbo cards use an even auto-fill grid with centred content. New Sanctuary shrank in the bottom bar (flex .55, smaller type) beside Share and the amber Enter Limbo. Droop now lowers the hands to y=48 with a slow sway instead of 28. Regression coverage for the removal, droop, and sprite wiring lives in `tests/test_regressions.py`.

## 14. Idle wander, wordless bar, invisible host and guests (latest)

Idle wisps now wander. After 5 to 16 idle seconds a wisp flies off on an eased arc, most often to a slowly orbiting inspection point around another wisp (its gaze tracks neighbours as before), otherwise to a random scenic point, hovers there for a few seconds, then flies home and rests 6 to 18 seconds before the next trip. Wandering pauses while the wisp is dragged, flying to a tap, or in a pair interaction, and sheds the usual flight motes.

The bottom bar is wordless: Share, New Sanctuary, and Enter Limbo are inline SVG icons (share nodes, plus-in-circle, ghost) with aria-labels and tooltips.

The host is no longer drawn in the world and cannot be dragged or tapped; the host acts through the orb wheel only. Guest mode: when your stored visitor ID appears in another sanctuary's souls, the app loads that soul as your ghost (gold marker dot, badge reads guest), and both Enter Limbo and New Sanctuary are disabled with explanatory toasts, so a guest cannot dress or create from inside someone else's sanctuary. Verified with a DOM probe: guest=true, both buttons disabled, badge guest, own wisp flagged.

## 15. Tinted trails, one-sanctuary lock, wordless controls, audio, passwords (latest)

Flight sparkles now take the wisp's own tint (custom body colour or nearest preset), drift gently upward with a slow fade, twinkle as small stars a third of the time, and emit from random points across all five body nodes instead of only the tail tip.

One sanctuary per person: creating sets a `wispn_creator` cookie, and a create call carrying a known cookie returns that cookie's existing sanctuary instead of minting another. Creations are also capped at 30 per IP (429 beyond). When you already own a sanctuary elsewhere, the create button switches to a wordless visit icon (door-and-arrow) that jumps to it; guests visiting someone else still see the create button so they can start their own. Save and Close in Limbo are now check and X icons, and the eye, hat, and item cards show previews only with names moved to tooltips (the mime-gesture cards keep their names, as the moves have no icon form).

Audio is a tiny WebAudio synth, no assets: a two-note pop on tap, a rising sweep on flight, a four-note chime on reactions and on save, a soft blip on the orb wheel and bar buttons. The context only starts after the first pointer press.

Sanctuary passwords: creating a sanctuary requires a password, checked on the frontend as 4-32 ASCII characters (server validates the same) and stored only as a BLAKE3 hash. Opening a locked sanctuary while neither host nor guest shows an unlock gate; the right password returns the host secret for this device, the eye button just visits. There is no reset path, by design. A global `[hidden]` rule now guarantees hidden fields actually hide, which also fixed the environment selector leaking to visitors.

## 16. Direct-open gate with create-your-own, hands over head shine (latest)

Opening a sanctuary link directly now lands on the unlock gate first (checked once on first load, not re-raised by later refreshes): password to become host, a create-your-own button beside it that opens Limbo in new-sanctuary mode starting at the Biome picker, and a just-visit eye. In the wisp renderer, the head shine arc is drawn before the arms, so hands and held items stay in front of the head reflection.

## 17. Visitor lock button, highlighted New Sanctuary (latest)

A visitor with no wisp of their own in the open sanctuary no longer sees the ghost button: it becomes a lock that opens the password prompt (deep links into Limbo reroute there too). Hosts keep the ghost, guests keep it disabled. The New Sanctuary button is highlighted in create mode with the amber primary gradient and a soft gold pulse (stilled under prefers-reduced-motion); in visit mode it returns to teal.

Bug fix: unlocking a sanctuary created before passwords (or restored by the 404 recovery, which cannot carry a password) correctly reported "not password locked", but a second path made it worse: a create call carrying an older creator cookie returned that earlier unlocked sanctuary and silently ignored the new secret and password. The cookie shortcut now applies only when the request carries the same secret; a new secret always creates its own sanctuary and remaps the cookie. Re-creating an existing unlocked sanctuary with its secret plus a password now sets the lock, so such sanctuaries can be locked after the fact at the API level. Covered by regressions for cookie no-hijack and password-on-recreate.

## 18. Host presentation (latest)

The role badge is hidden entirely for hosts (guests and visitors keep theirs). As host, the sanctuary button is always the wordless visit button: it jumps to your own sanctuary from elsewhere, and inside your own sanctuary it simply closes Limbo instead of starting another creation.

## 19. Visit window (latest)

The visit button now opens a small window in the same style as the unlock gate: paste someone else's sanctuary link (or bare ID), press go, and the app extracts the 16-hex sanctuary ID and loads it. Invalid input gets a toast instead of a broken navigation.

Bug fix: editing your ghost after logging in on a new device produced a second ghost, because souls are keyed by the per-browser visitor token and the new device summoned under a fresh token. Host-authenticated summons now record the host's soul server-side and replace it (including its colours) when the host saves again, so one host always has exactly one ghost while guests are untouched. Regression: host summons from two different tokens keep the count at host plus guests.

## 20. Visiting brings your ghost (latest)

Going through the visit window now carries your own ghost along: after the target sanctuary loads, if you are neither its host nor already a guest there, your current customisation is summoned in under your visitor token and the view reloads as guest (badge, gold marker, your wisp controllable). Host-authenticated saves still replace that soul rather than duplicating it.

## 21. Guest accessories, return-home button, visit speed (latest)

Customisation now persists in localStorage (`wispn_cust`, saved on every picker change and on Save), so when your ghost joins a sanctuary as a guest it keeps your body colour, eyes, hat, item, and gesture instead of falling back to defaults.

As a guest, the sanctuary button becomes a wordless return-home button (house icon) that jumps back to your own sanctuary.

On visit slowness, measured: one sanctuary load costs 3 API fetches, and the visit flow repeated that load up to three times back to back (direct call, hashchange, guest-join reload). Loads are now serialised so duplicates collapse, and visit navigation loads once through hashchange. The face texture cache also held a single entry, so in a sanctuary with mixed eye styles every wisp rebuilt its face canvas every frame; it is now a per-style Map. Per-frame cost itself did not reproduce in headless Chromium (0 ms average over 90 driven frames at 12 wisps, rasterisation skipped there), so the claim is limited to the removed duplicate loads and cache rebuilds.

Bug fix: guest ghosts still arrived plain. Persistence alone was not enough, because in real use your accessories live in your home sanctuary's soul while this browser's picker state may hold defaults. Visiting now fetches your home sanctuary, finds your soul there, and copies its appearance, hat, item, mime loop, tempo, and body colour into the guest summon (falling back to picker state only when no home ghost is found). Hosting also re-syncs the picker from your actual ghost on load. Verified on the real path with no seeded picker state: the guest arrived with item_and_hat 90, eyes 6, and its pink colour, and renders them in the target world.

Bug fix, third attempt, premise tested first: both earlier fixes assumed the guest summon payload was wrong. Driving the real UI path (actual Limbo cards, the real Save handler, the real visit window) showed the payload was correct once sent; the failures were gated conditions. An already-existing plain guest soul was never updated, and arriving by a direct link as an existing guest never triggered any sync. The sync is now arrival-independent: on any load in someone else's sanctuary it copies your home ghost (found by visitor ID, or by the server-exposed host_vid for other browsers) over your guest soul, but only when the look actually changed, so it stays silent and idempotent. Verified by server packet bytes and by screenshot after a direct arrival with a pre-existing plain guest soul.

## 22. Guest gifts and the gift basket (latest)

Guests can leave gifts. Eight gift sprites (fly agaric, cake, carrot, broccoli, dirty sock, bouquet, cheese, honey) were rendered on a chroma sheet and segmented into `public/assets/gifts/0..7.png`. A wordless gift button appears in the bar while you are a guest and opens the picker; leaving a gift stores it server-side per sanctuary (action `gift`, validated 1..8, with your visitor ID and your home sanctuary code, capped at 100). On load, unseen gifts are placed along the ground: the nearest resident wisp (never the giver, unless it is the only one) flies over, hearts burst, and the gift floats away collected, remembered per browser so it plays once.

A wordless basket button opens the gift basket: each entry shows the gift sprite and the visiting code URL back to the giver's home sanctuary, limited to the 10 most recent distinct visitors (wandering guests without a home show without a link). Residents discover gifts on their next load, since the app syncs on actions rather than polling.

## 23. Minimal visitor bar (latest)

A plain visitor (in a sanctuary, neither host nor guest) now sees only the highlighted New Sanctuary button in the bottom bar: Share, the ghost/lock button, the gift button, and the basket button are all hidden for them. Hosts and guests keep the full bar. This supersedes the earlier lock-button treatment for wisp-less visitors; becoming host still runs through the unlock gate on locked sanctuaries.

## 24. Minimal bar everywhere for visitors, toasts top right (latest)

The minimal visitor bar (only the highlighted New Sanctuary button) now also applies on the empty root URL and on dead sanctuary links, where the visibility rules previously never ran. Plain visitors get the New Sanctuary button in every state; hosts and guests keep their full bars. Notifications moved from bottom centre to the top right corner, below the safe-area inset.

## 25. Go home button for returning visitors (latest)

A visitor who has previously logged in to a sanctuary of their own (a known home in this browser) now gets a wordless Go Home house button instead of the New Sanctuary button, in someone else's sanctuary and on the empty root URL alike. Clicking it jumps straight back to their sanctuary. Visitors with no known home keep the single highlighted New Sanctuary button; hosts keep the visit-window button.

## 26. Multiple gifts, random placement, dates, rendered basket (latest)

A guest can leave many gifts: every gift is stored with its own sequential ID and timestamp, and rapid repeats no longer collide in the seen-set. Unseen gifts are placed at random positions across the scene instead of a fixed row. The basket is now rendered as a basket: the generated wicker basket art fills with the latest gift sprites piled inside, and below it each of the 10 most recent visitors shows all of their gifts as chips stamped with the saved date, plus their visiting-code URL.

## 27. More hats, eyes, held items (latest)

Five more hats (beanie, sailor, pumpkin, frog, party) bring the closet to 15; the hat slot now uses the full nibble. Five new eye styles (Sad, Cute, Anime, Angry, Rainbow Swirl, hand-authored SVGs matching the existing eye format) bring eyes to 15. Five more held items (lantern, story book, umbrella, balloon, teapot) bring held items to 10, each with its own glow colour. All were verified live on summoned wisps.

Bug fix: the five new eye styles never appeared on wisps. The eye image loader still listed only the original ten files, so styles 10-14 had no image and the face texture drew without eyes (the Limbo cards, which load the SVGs directly, looked fine). The loader now follows EYE_NAMES, all 15 eye images load, and a regression pins it.

## 28. File store (latest)

Sanctuaries now persist in a simple file store. Every mutation (create, summon, react, host update, gift, eviction sweep) snapshots all sanctuaries and creator cookies into a small binary format, compresses it with zlib (flate2, fast level), and writes it atomically via a temp file plus rename. The path is `wispn.db`, overridable with `WISPN_DB`. Startup restores souls, colours, password hashes, host secrets, gifts, and creator cookies, so restarts no longer wipe sanctuaries. The store holds host secrets, so `wispn.db` is gitignored and must never be committed. A deadlock found in testing (saving while a DashMap write guard was still held) is fixed by dropping the guard before every save, and the regression suite now restarts its test server mid-run to prove souls, unlock, and 100 gifts survive.
