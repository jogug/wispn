# wispn (Pantom)

## What it is

wispn is an anonymous ghost sanctuary that runs in the browser. You open a sanctuary, pick one of six painted biomes, and share the link. Anyone who opens the link can watch the wisps. Guests arrive as ghosts of their own, with the look they saved at home.

Nobody signs up. The app has no accounts and no database. A sanctuary lives in server memory and holds the last 100 souls. Each soul takes 12 bytes on the wire.

## What you can do

* Open a sanctuary and lock it with a password. The password has 4 to 32 ASCII characters. A lost password cannot be reset.
* Pick the biome first, then dress your wisp in the Limbo closet. The closet has body colours, 15 eye styles, 15 hats, 10 held items, mime loops, and arm gestures.
* Tap a wisp to fly to it. Hosts pick a shared mime from the orb wheel: hug, high-five, shared light, boop, or mirror dance. Visitors get a random one on arrival.
* Visit a friend's sanctuary from the visit window. Your ghost comes with you, accessories included.
* Leave gifts as a guest. Fly agaric, cake, carrot, broccoli, a dirty sock, a bouquet, cheese, or honey. A resident wisp flies over, picks the gift up in its second hand, and carries it into the basket.
* Open the gift basket to see who visited. It shows the gifts of the 10 most recent visitors, the date of each gift, and a link back to each visitor's sanctuary. The basket holds at most 100 gifts.
* Watch the wisps between visits. Idle wisps fly off to inspect the biome and each other, then drift home.

## How it extends a social profile

Put your sanctuary link where your bio link goes. A normal bio link is a static list of links. A sanctuary link is a small room that changes while people watch.

Visitors do not need an account, so the link works for followers on any platform. Each guest arrives as a dressed ghost, so a busy sanctuary shows real visits instead of a view counter. Gifts make the visit stick: a guest leaves something behind, and the basket keeps their gift, its date, and a link back to their own sanctuary. That backlink turns one-way traffic into a loop, because your visitors can follow it and leave a gift in return.

## Running

You need a Rust toolchain.

```sh
cargo build --release
./target/release/wispn
```

Open http://localhost:3000 in a browser.

Set `PORT` to change the port:

```sh
PORT=8080 ./target/release/wispn
```

The server keeps sanctuaries in memory. A restart wipes them. The host browser restores its own sanctuary from its stored secret. A password-locked sanctuary can be unlocked from any device with the password. Anyone else gets the link fresh from the host.

## Technical notes

`src/main.rs` is the whole backend. It uses axum, DashMap, and BLAKE3. The sanctuary ID is the first 8 bytes of BLAKE3 of the host secret, printed as 16 hex characters. `GET /api/s/:id` returns a binary packet with the biome, the soul count, and 12 bytes per soul. `POST /api/s/:id` takes the actions `summon`, `react`, `host_update`, and `gift`. Custom colours travel on a side channel because they do not fit in 12 bytes.

One browser can create one sanctuary. The server sets a creator cookie and returns the existing sanctuary for a known cookie. Creation is capped at 30 per IP address.

`public/` holds the frontend and the rendered assets. Swap the files in `public/assets/ghost/` and `public/assets/gifts/` to reskin the ghosts and gifts without code changes.
