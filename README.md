# GALLERY-HALL- (Our Museum 3D)

> *A private 3D museum gallery experience for your beloved ones — walking together, illuminated memories, and personalized dedications.*

A high-fidelity rebuild and reverse-engineering of **Giftvera's "Our Museum"** (`https://giftvera.com/product/our-museum`).

---

## 🏛 Project Highlights

1. **The Rebuilt 3D Museum Experience (`index.html`)**
   - **Lobby & Entrance ("Choose who walks in"):**
     - 3D neoclassical stone exterior facade with carved double entrance doors, brass knockers, and stone steps.
     - 3D avatar customizer featuring **Kai** and **Mira** with real-time 360-degree drag rotation and close-up views.
     - Full customization palette: skin tones (Original, Sand, Honey, Sienna, Umber), hair shades, eye colors, eyebrows, shirts, waistcoats, trousers, and leather boots.
     - Height configuration (Short, Average, Tall).
     - Live presence badge (e.g., *"Emma is inside"*).
   - **Main Centerpiece Rotunda:**
     - Elevated podium platform with black monolithic feature wall.
     - Illuminated Centerpiece framed photograph with warm spotlights.
     - Angled stone dedication pedestal with gold/white lettering: *"A PERMANENT COLLECTION • For [Recipient] • [Your Message] • Always yours, [Sender]"*.
   - **East & West Gallery Wings:**
     - Minimalist museum halls with polished marble tile floors.
     - Framed photographs hung at eye level with individual track spotlight fixtures.
     - Glass display vitrines with flowers on white pedestals.
     - Wooden museum benches placed throughout.
   - **Cinema Screening Room:**
     - Large wall-mounted cinema screen playing the authentic teaser film via Three.js `VideoTexture`.
     - Front-row viewing bench for co-watching.
   - **In-Game Custom Photo Uploads & Wall Placement:**
     - Upload and hang your own photos from your device directly onto the 3D museum walls.
     - Real-time texture updating using IndexedDB & LocalStorage persistence.
     - Cross-tab live synchronization via `BroadcastChannel`.
   - **Interactivity & Gameplay:**
     - **Artwork Inspection:** Click any photo to zoom in for a high-res frontal view with custom captions and titles.
     - **Bench Sitting:** Walk up to any bench and press `E` or click to sit down and relax.
     - **Camera Views:** Toggle between cinematic Third-Person and First-Person (`👁`).
     - **Desktop & Mobile Controls:** WASD / Arrow keys, mouse orbit look, click-to-walk, and mobile virtual analog joystick.
   - **Multiplayer & Social Presence:**
     - Real-time synchronization across browser tabs (via `BroadcastChannel` and `LocalStorage`).
     - Companion AI co-visitor (**Emma** or **Luca**) that walks through the halls, inspects art, sits on benches, and responds in chat.
     - 3D projected floating nametags and speech bubbles.
     - Emote reaction wheel (❤️, 👋, ✨, 😊, 👏).
     - Live in-game chat drawer (`💬`).
     - Ambient museum audio synthesis via Web Audio API (gentle reverberant piano chords, footstep sounds on marble, inspection chimes).

2. **The Product Storefront (`product.html`)**
   - Recreated Giftvera store page with authentic copy, price tags ($45.99 one-time), highlights, and trust indicators.
   - Interactive media player with `02-teaser.mp4` video and thumbnail reel.
   - Live photo collection manager with wall position slots (`★ Centerpiece`, `West Gallery 1`, etc.).
   - Personalization card with AI draft assistant ("Need help with the words?").

3. **Museum Creation Studio (`create.html`)**
   - Studio interface to curate your own photos, select the centerpiece, write personalized dedications, and generate shareable gift links.

---

## 🚀 Running Locally

Serve the directory with any static HTTP server:
```bash
python -m http.server 8080
```

Open your browser to:
- **3D Museum Experience:** [http://localhost:8080/index.html](http://localhost:8080/index.html)
- **Product Storefront:** [http://localhost:8080/product.html](http://localhost:8080/product.html)
- **Studio Creator:** [http://localhost:8080/create.html](http://localhost:8080/create.html)
