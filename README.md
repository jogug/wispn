# wispn (Pantom)

## Start here: a bio link that answers back

Put a wispn sanctuary link in your social media bio, and the link stops being a list. It becomes a small haunted room that your followers can walk into.

Anyone who taps the link lands in your sanctuary. No account, no install, no form. They watch your wisps drift between painted biomes. If they have a sanctuary of their own, their ghost arrives dressed as them. They can leave you a gift, from a cake to a dirty sock, and your basket keeps the gift, its date, and a link back to their sanctuary. Your next visitor can follow that link and leave a gift in return. Visits turn into a loop instead of a counter.

That is the engagement offer. A static bio link asks for a tap. A sanctuary gives the tap somewhere to go, something to touch, and a reason to come back tomorrow to see who else showed up.

## What it is

wispn is an anonymous ghost sanctuary that runs in the browser. You open a sanctuary, pick one of six painted biomes, and share the link. Guests arrive as ghosts of their own, with the look they saved at home.

Nobody signs up. The app has no accounts. A sanctuary holds the last 100 souls, each 12 bytes on the wire, and the server saves them to a small compressed file so they survive restarts.

## What you can do

* Open a sanctuary and lock it with a password. The password has 4 to 32 ASCII characters. A lost password cannot be reset.
* Pick the biome first, then dress your wisp in the Limbo closet. The closet has body colours, 15 eye styles, 15 hats, 10 held items, mime loops, and arm gestures.
* Tap a wisp to fly to it. Hosts pick a shared mime from the orb wheel: hug, high-five, shared light, boop, or mirror dance. Visitors get a random one on arrival.
* Visit a friend's sanctuary from the visit window. Your ghost comes with you, accessories included.
* Leave gifts as a guest, as many as you like. Fly agaric, cake, carrot, broccoli, a dirty sock, a bouquet, cheese, or honey. Gifts land at random spots. A resident wisp flies over, stays until it has picked the gift up in its second hand, and carries it into the basket, one gift at a time.
* Open the gift basket to see who visited. It shows the gifts of the 10 most recent visitors, the date of each gift, and a link back to each visitor's sanctuary. The basket holds at most 100 gifts.
* Watch the wisps between visits. Idle wisps fly off to inspect the biome and each other, then drift home.

## Running

You need a Rust toolchain.

```sh
cargo build --release
./target/release/wispn
```

Open http://localhost:3000 in a browser.

Run the regression suite after a build:

```sh
python3 tests/test_regressions.py
```

Set `PORT` to change the port:

```sh
PORT=8080 ./target/release/wispn
```

The server saves sanctuaries to `wispn.db` after every change and reloads them at startup, so a restart keeps your souls, gifts, and password. Set `WISPN_DB` to move the file. The file holds host secrets, so do not share or commit it.

## Technical notes

`src/main.rs` is the whole backend. It uses axum, DashMap, and BLAKE3. The sanctuary ID is the first 8 bytes of BLAKE3 of the host secret, printed as 16 hex characters. `GET /api/s/:id` returns a binary packet with the biome, the soul count, and 12 bytes per soul. `POST /api/s/:id` takes the actions `summon`, `react`, `host_update`, and `gift`. `GET /api/s/:id/gifts` lists gifts. `GET /api/s/:id/meta` reports whether a sanctuary is password locked. `POST /api/s/:id/unlock` trades a correct password for the host secret. Custom colours travel on a side channel because they do not fit in 12 bytes.

The file store is a zlib-compressed binary snapshot at `wispn.db`. The server writes it after every change through a temp file and a rename. It restores souls, colours, password hashes, host secrets, gifts, and creator cookies at startup.

One browser can create one sanctuary. The server sets a creator cookie and returns the existing sanctuary for a known cookie. Creation is capped at 30 per IP address.

`public/` holds the frontend and the rendered assets. Swap the files in `public/assets/ghost/` and `public/assets/gifts/` to reskin the ghosts and gifts without code changes.
