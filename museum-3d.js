/**
 * 3D Museum World Engine for "Our Museum"
 * Constructs modern gallery architecture, centerpiece rotunda, east/west galleries,
 * cinema room with video texture, spotlights, interactive framed art, and benches.
 */

class MuseumWorld {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // Player and Controls
    this.playerAvatar = null;
    this.myProfile = {
      name: 'Luca',
      type: 'kai',
      height: 'average',
      color: '#E08238'
    };
    this.cameraMode = 'third'; // 'third' or 'first'
    this.cameraDistance = 3.8;
    this.cameraAngle = { x: 0, y: 0.15 };
    this.keys = {};
    this.touchJoystick = { x: 0, y: 0 };
    this.touchRotating = false;
    this.lastTouchPos = { x: 0, y: 0 };

    // Interactive objects
    this.artworks = []; // { mesh, id, title, imageSrc, caption, position, normal }
    this.benches = [];  // { mesh, sitPosition, sitRotation, isOccupied }
    this.dedicationPlaque = null;
    this.videoMesh = null;
    this.videoElement = null;
    this.activeInteractable = null;
    this.isSitting = false;
    this.currentBench = null;
    this.isInspecting = false;
    this.inspectSavedCam = null;

    // Subsystems
    this.multiplayer = null;

    // Custom Museum Data
    this.museumData = {
      recipient: 'Emma',
      sender: 'Luca',
      dedication: 'Twenty-seven rooms of you, and I still ran out of walls.',
      dedicationSign: 'Always yours, Luca',
      centerpiecePhoto: 'assets/03-at-the-centrepiece.webp',
      photos: [],
      videoSrc: 'assets/02-teaser.mp4'
    };

    this.init();
  }

  async loadInitialPhotos() {
    if (window.galleryManager) {
      const photos = await window.galleryManager.getAllPhotos();
      photos.forEach(p => {
        if (p.isCenterpiece) {
          this.museumData.centerpiecePhoto = p.src;
        }
      });
      return photos;
    }
    return [];
  }

  setTextureOnMesh(mesh, src) {
    if (!mesh || !mesh.material || !src) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.encoding = THREE.sRGBEncoding;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      if (mesh.material.map && mesh.material.map.dispose) {
        mesh.material.map.dispose();
      }
      mesh.material.map = tex;
      mesh.material.needsUpdate = true;
    };
    img.onerror = (e) => {
      console.warn('Could not load image texture:', src, e);
    };
    img.src = src;
  }

  resolveWallPhotos() {
    const wallMapping = new Map();
    const defaults = {
      'centerpiece': { title: `The Centerpiece (For ${this.museumData.recipient})`, src: this.museumData.centerpiecePhoto, caption: this.museumData.dedication },
      'monolith_back': { title: 'Moments in Rome', src: 'assets/08-a-photo-up-close.webp', caption: 'A moment captured at the Colosseum.' },
      'gallery_0': { title: 'The East Gallery View', src: 'assets/07-the-east-gallery.webp', caption: 'Quiet halls lit with warm gallery spotlights.' },
      'gallery_1': { title: 'Looking at a Photo', src: 'assets/06-looking-at-a-photo.webp', caption: 'Admiring details in every frame.' },
      'gallery_2': { title: 'Our Moments Together', src: 'assets/01-cover.webp', caption: 'The collection begins here.' },
      'gallery_3': { title: 'On the Wooden Bench', src: 'assets/10-on-the-bench.webp', caption: 'Sitting in stillness together.' },
      'gallery_4': { title: 'The Dedication Wall', src: 'assets/05-the-dedication.webp', caption: 'Every word written straight from the heart.' },
      'gallery_5': { title: 'A Closer Look', src: 'assets/08-a-photo-up-close.webp', caption: 'Memories immortalized in gold.' },
      'gallery_6': { title: 'Exploring Hand in Hand', src: 'assets/11-walking-on-a-phone.webp', caption: 'Walking side by side across distance.' },
      'gallery_7': { title: 'A Glimpse into Tomorrow', src: 'assets/12-a-photo-on-a-phone.webp', caption: 'Forever framed in our private sanctuary.' }
    };

    Object.keys(defaults).forEach(id => {
      wallMapping.set(id, { ...defaults[id], id });
    });

    if (!this.customPhotos || this.customPhotos.length === 0) {
      return wallMapping;
    }

    // 1. If any photo has isCenterpiece or id === 'centerpiece'
    const cp = this.customPhotos.find(p => p.isCenterpiece || p.id === 'centerpiece');
    if (cp) {
      wallMapping.set('centerpiece', cp);
    }

    // 2. Direct matching IDs
    this.customPhotos.forEach(p => {
      if (wallMapping.has(p.id)) {
        wallMapping.set(p.id, p);
      }
    });

    // 3. Any additional uploaded photos with arbitrary or timestamp IDs
    const currentSources = Array.from(wallMapping.values()).map(v => v.src);
    const unassigned = this.customPhotos.filter(p => !currentSources.includes(p.src));

    const slotSequence = ['centerpiece', 'gallery_0', 'gallery_1', 'gallery_2', 'gallery_3', 'gallery_4', 'gallery_5', 'gallery_6', 'gallery_7', 'monolith_back'];
    for (const slot of slotSequence) {
      if (unassigned.length === 0) break;
      const current = wallMapping.get(slot);
      if (current && defaults[slot] && current.src === defaults[slot].src) {
        const nextPhoto = unassigned.shift();
        wallMapping.set(slot, { ...nextPhoto, id: slot });
      }
    }

    return wallMapping;
  }

  updateArtwork(id, newSrc, newTitle, newCaption) {
    const art = this.artworks.find(a => a.id === id);
    if (!art) {
      console.warn('Artwork not found with ID:', id);
      return;
    }

    this.setTextureOnMesh(art.photoMesh, newSrc);
    art.imageSrc = newSrc;
    if (newTitle) art.title = newTitle;
    if (newCaption) art.caption = newCaption;

    // Update inspection overlay if currently open on this photo
    if (this.isInspecting && this.currentInspectingArt && this.currentInspectingArt.id === id) {
      const imgEl = document.getElementById('inspect-image');
      const titleEl = document.getElementById('inspect-title');
      const captionEl = document.getElementById('inspect-caption');
      if (imgEl) imgEl.src = newSrc;
      if (titleEl && newTitle) titleEl.textContent = newTitle;
      if (captionEl && newCaption) captionEl.textContent = newCaption;
    }

    // Persist in GalleryManager
    if (window.galleryManager) {
      window.galleryManager.savePhoto({
        id: art.id,
        title: art.title,
        src: newSrc,
        caption: art.caption,
        isCenterpiece: art.id === 'centerpiece'
      });
    }

    if (window.museumAudio) window.museumAudio.playInteract();
  }

  async init() {
    // 1. Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0A0709');
    this.scene.fog = new THREE.FogExp2('#0A0709', 0.015);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 150);
    this.camera.position.set(0, 1.8, 6);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // Load any custom photos saved by the user
    this.customPhotos = await this.loadInitialPhotos();

    // 4. Build Museum Architecture
    this.buildMuseumArchitecture();

    // 5. Build Centerpiece Rotunda
    this.buildCenterpiece();

    // 6. Build East & West Gallery Wings
    this.buildGalleries();

    // 7. Build Cinema Screening Room
    this.buildCinemaRoom();

    // 8. Event Listeners
    this.setupControls();
    window.addEventListener('resize', () => this.onResize());

    // Live Gallery Photo Synchronization
    if (window.galleryManager) {
      window.galleryManager.onPhotoUpdated((photo) => {
        if (photo && photo.id) {
          const art = this.artworks.find(a => a.id === photo.id);
          if (art && art.imageSrc !== photo.src) {
            this.setTextureOnMesh(art.photoMesh, photo.src);
            art.imageSrc = photo.src;
            if (photo.title) art.title = photo.title;
            if (photo.caption) art.caption = photo.caption;
          }
        }
      });
    }

    // 9. Multiplayer Subsystem
    this.multiplayer = new MultiplayerSystem(this);

    // Start render loop
    this.animate();
  }

  buildMuseumArchitecture() {
    // Ambient Light - soft, warm gallery bounce
    const ambientLight = new THREE.AmbientLight(0xfff5ea, 0.7);
    this.scene.add(ambientLight);

    // Subtle overall directional light
    const dirLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    dirLight.position.set(10, 20, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    const d = 25;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // Floor: Polished warm off-white stone tiles with specular gloss
    const floorGeo = new THREE.PlaneGeometry(80, 50);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xEEE9E0,
      roughness: 0.28,
      metalness: 0.1
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    // Grid Floor tile lines (procedural visual refinement)
    const gridHelper = new THREE.GridHelper(80, 40, 0xDDD6C8, 0xE4DDD0);
    gridHelper.position.y = 0.005;
    this.scene.add(gridHelper);

    // Ceiling: Dark charcoal modular architectural ceiling
    const ceilingGeo = new THREE.PlaneGeometry(80, 50);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x18161A,
      roughness: 0.9,
      metalness: 0.2
    });
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceilingMesh.position.y = 6.0;
    ceilingMesh.rotation.x = Math.PI / 2;
    this.scene.add(ceilingMesh);

    // Ceiling track beams (dark architectural grid)
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x0D0B0E, roughness: 0.7 });
    for (let x = -30; x <= 30; x += 6) {
      const beamGeo = new THREE.BoxGeometry(0.15, 0.25, 48);
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(x, 5.85, 0);
      this.scene.add(beam);
    }

    // Main Museum Boundary Walls (Clean off-white gallery plaster)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xE8E3DA,
      roughness: 0.85
    });

    // North Wall (Back)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(80, 6, 0.4), wallMat);
    backWall.position.set(0, 3, -15);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // South Wall (Entrance with archway)
    const southWallLeft = new THREE.Mesh(new THREE.BoxGeometry(36, 6, 0.4), wallMat);
    southWallLeft.position.set(-22, 3, 15);
    southWallLeft.receiveShadow = true;
    const southWallRight = new THREE.Mesh(new THREE.BoxGeometry(36, 6, 0.4), wallMat);
    southWallRight.position.set(22, 3, 15);
    southWallRight.receiveShadow = true;
    this.scene.add(southWallLeft, southWallRight);

    // Grand Entrance Doors in South Wall center
    this.buildEntranceDoors();

    // East Wall
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 30), wallMat);
    eastWall.position.set(38, 3, 0);
    eastWall.receiveShadow = true;
    this.scene.add(eastWall);

    // West Wall
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 30), wallMat);
    westWall.position.set(-38, 3, 0);
    westWall.receiveShadow = true;
    this.scene.add(westWall);
  }

  buildEntranceDoors() {
    const doorGroup = new THREE.Group();
    doorGroup.position.set(0, 0, 14.8);

    // Stone Frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xDCD5CA, roughness: 0.6 });
    const topArch = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.6, 0.6), frameMat);
    topArch.position.set(0, 4.5, 0);
    topArch.castShadow = true;
    doorGroup.add(topArch);

    // Carved Double Wooden Doors
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4A2711, roughness: 0.5 });
    const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(2.6, 4.2, 0.15), woodMat);
    leftDoor.position.set(-1.3, 2.1, 0);
    leftDoor.castShadow = true;
    const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(2.6, 4.2, 0.15), woodMat);
    rightDoor.position.set(1.3, 2.1, 0);
    rightDoor.castShadow = true;
    doorGroup.add(leftDoor, rightDoor);

    // Brass handles / rings
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, roughness: 0.25, metalness: 0.85 });
    const ringGeo = new THREE.TorusGeometry(0.14, 0.025, 12, 24);
    const leftRing = new THREE.Mesh(ringGeo, brassMat);
    leftRing.position.set(-0.35, 2.0, 0.12);
    const rightRing = new THREE.Mesh(ringGeo, brassMat);
    rightRing.position.set(0.35, 2.0, 0.12);
    doorGroup.add(leftRing, rightRing);

    // Neoclassical Pediment text banner: "Our Museum"
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.5, 0.1), frameMat);
    signBoard.position.set(0, 4.9, 0.1);
    doorGroup.add(signBoard);

    this.scene.add(doorGroup);
  }

  buildCenterpiece() {
    const cpGroup = new THREE.Group();
    cpGroup.position.set(0, 0, 0);

    const resolvedPhotos = this.resolveWallPhotos();

    // 1. Raised White Rectangular Podium Platform
    const podiumMat = new THREE.MeshStandardMaterial({ color: 0xFAFAFA, roughness: 0.3 });
    const podium = new THREE.Mesh(new THREE.BoxGeometry(10, 0.35, 6.5), podiumMat);
    podium.position.set(0, 0.175, 0);
    podium.receiveShadow = true;
    podium.castShadow = true;
    cpGroup.add(podium);

    // 2. Large Sleek Black Monolithic Feature Wall
    const monolithMat = new THREE.MeshStandardMaterial({ color: 0x111012, roughness: 0.4, metalness: 0.15 });
    const monolith = new THREE.Mesh(new THREE.BoxGeometry(6.4, 5.0, 0.5), monolithMat);
    monolith.position.set(0, 2.85, 0);
    monolith.castShadow = true;
    monolith.receiveShadow = true;
    cpGroup.add(monolith);

    // 3. Centerpiece Framed Photograph on SOUTH Face of Monolith (Facing entrance / visitor)
    const cpData = resolvedPhotos.get('centerpiece') || {
      src: this.museumData.centerpiecePhoto,
      title: `The Centerpiece (For ${this.museumData.recipient})`,
      caption: this.museumData.dedication
    };

    // Clean White Matting
    const cpMatBorder = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 2.95), new THREE.MeshBasicMaterial({ color: 0xFFFFFF }));
    cpMatBorder.position.set(0, 3.1, 0.258);
    cpGroup.add(cpMatBorder);

    // Front Photo Mesh (Facing South into the hall)
    const cpPhotoMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.25 });
    const cpPhotoMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.8), cpPhotoMat);
    cpPhotoMesh.position.set(0, 3.1, 0.262);
    cpGroup.add(cpPhotoMesh);
    this.setTextureOnMesh(cpPhotoMesh, cpData.src);

    // Front Frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.4 });
    const cpFrame = new THREE.Mesh(new THREE.BoxGeometry(2.45, 3.05, 0.06), frameMat);
    cpFrame.position.set(0, 3.1, 0.23);
    cpFrame.castShadow = true;
    cpGroup.add(cpFrame);

    this.artworks.push({
      mesh: cpFrame,
      photoMesh: cpPhotoMesh,
      id: 'centerpiece',
      title: cpData.title,
      imageSrc: cpData.src,
      caption: cpData.caption,
      position: new THREE.Vector3(0, 1.8, 3.8),
      lookAt: new THREE.Vector3(0, 3.1, 0.26)
    });

    // 4. Centerpiece Artwork on NORTH Face of Monolith (Back Wall)
    const backData = resolvedPhotos.get('monolith_back') || {
      src: 'assets/08-a-photo-up-close.webp',
      title: 'Moments in Rome',
      caption: 'A moment captured at the Colosseum.'
    };

    const backMatBorder = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 2.95), new THREE.MeshBasicMaterial({ color: 0xFFFFFF }));
    backMatBorder.position.set(0, 3.1, -0.258);
    backMatBorder.rotation.y = Math.PI;
    cpGroup.add(backMatBorder);

    const backPhotoMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.25 });
    const backPhotoMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.8), backPhotoMat);
    backPhotoMesh.position.set(0, 3.1, -0.262);
    backPhotoMesh.rotation.y = Math.PI;
    cpGroup.add(backPhotoMesh);
    this.setTextureOnMesh(backPhotoMesh, backData.src);

    const backFrame = new THREE.Mesh(new THREE.BoxGeometry(2.45, 3.05, 0.06), frameMat);
    backFrame.position.set(0, 3.1, -0.23);
    backFrame.castShadow = true;
    cpGroup.add(backFrame);

    this.artworks.push({
      mesh: backFrame,
      photoMesh: backPhotoMesh,
      id: 'monolith_back',
      title: backData.title,
      imageSrc: backData.src,
      caption: backData.caption,
      position: new THREE.Vector3(0, 1.8, -3.8),
      lookAt: new THREE.Vector3(0, 3.1, -0.26)
    });

    // 5. Dedicated Spotlights for the Centerpiece
    const spotSouth = new THREE.SpotLight(0xfffaed, 2.8, 12, Math.PI / 4, 0.4, 1.2);
    spotSouth.position.set(0, 5.5, 3.2);
    spotSouth.target = monolith;
    spotSouth.castShadow = true;
    cpGroup.add(spotSouth);

    const spotNorth = new THREE.SpotLight(0xfffaed, 2.8, 12, Math.PI / 4, 0.4, 1.2);
    spotNorth.position.set(0, 5.5, -3.2);
    spotNorth.target = monolith;
    spotNorth.castShadow = true;
    cpGroup.add(spotNorth);

    // 6. Angled Dedication Pedestal Plaque in front of South Centerpiece (Facing entrance)
    const plaquePedestal = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 0.8), podiumMat);
    plaquePedestal.position.set(0, 0.75, 2.4);
    plaquePedestal.castShadow = true;
    cpGroup.add(plaquePedestal);

    // Angled plaque surface
    const plaqueSurface = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.8), new THREE.MeshStandardMaterial({
      color: 0x1A1618,
      roughness: 0.5
    }));
    plaqueSurface.position.set(0, 1.2, 2.4);
    plaqueSurface.rotation.x = Math.PI / 5;
    cpGroup.add(plaqueSurface);

    // Plaque canvas texture (displays "A PERMANENT COLLECTION", "For Emma", etc.)
    const plaqueCanvas = document.createElement('canvas');
    plaqueCanvas.width = 1024;
    plaqueCanvas.height = 512;
    const pctx = plaqueCanvas.getContext('2d');
    pctx.fillStyle = '#1A1618';
    pctx.fillRect(0, 0, 1024, 512);

    pctx.fillStyle = '#8A8387';
    pctx.font = '22px "Instrument Sans", sans-serif';
    pctx.textAlign = 'center';
    pctx.letterSpacing = '4px';
    pctx.fillText('A PERMANENT COLLECTION', 512, 80);

    pctx.fillStyle = '#FFFFFF';
    pctx.font = '54px "Instrument Serif", Georgia, serif';
    pctx.fillText(`For ${this.museumData.recipient}`, 512, 175);

    pctx.fillStyle = '#CCCCCC';
    pctx.font = '26px "Instrument Sans", sans-serif';
    pctx.fillText(this.museumData.dedication, 512, 260);

    pctx.fillStyle = '#FFFFFF';
    pctx.font = 'italic 34px "Instrument Serif", Georgia, serif';
    pctx.fillText(this.museumData.dedicationSign, 512, 380);

    const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
    plaqueTex.encoding = THREE.sRGBEncoding;
    const plaqueFace = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.65), new THREE.MeshBasicMaterial({ map: plaqueTex }));
    plaqueFace.position.set(0, 1.22, 2.4);
    plaqueFace.rotation.x = Math.PI / 5 - Math.PI / 2;
    cpGroup.add(plaqueFace);

    this.dedicationPlaque = {
      mesh: plaquePedestal,
      title: `Dedication for ${this.museumData.recipient}`,
      body: this.museumData.dedication,
      sign: this.museumData.dedicationSign,
      position: new THREE.Vector3(0, 1.8, 3.8)
    };

    this.scene.add(cpGroup);
  }

  buildGalleries() {
    const resolvedPhotos = this.resolveWallPhotos();

    // Gallery Artworks Configuration
    const galleryItems = [
      // West Gallery Wall (X = -20 to -35)
      { id: 'gallery_0', title: 'The East Gallery View', pos: new THREE.Vector3(-14, 2.7, -14.7), rotY: 0 },
      { id: 'gallery_1', title: 'Looking at a Photo', pos: new THREE.Vector3(-22, 2.7, -14.7), rotY: 0 },
      { id: 'gallery_2', title: 'Our Moments Together', pos: new THREE.Vector3(-30, 2.7, -14.7), rotY: 0 },
      
      // East Gallery Wall (X = 14 to 35)
      { id: 'gallery_3', title: 'On the Wooden Bench', pos: new THREE.Vector3(14, 2.7, -14.7), rotY: 0 },
      { id: 'gallery_4', title: 'The Dedication Wall', pos: new THREE.Vector3(22, 2.7, -14.7), rotY: 0 },
      { id: 'gallery_5', title: 'A Closer Look', pos: new THREE.Vector3(30, 2.7, -14.7), rotY: 0 },

      // South Gallery Artworks
      { id: 'gallery_6', title: 'Exploring Hand in Hand', pos: new THREE.Vector3(-24, 2.7, 14.7), rotY: Math.PI },
      { id: 'gallery_7', title: 'A Glimpse into Tomorrow', pos: new THREE.Vector3(24, 2.7, 14.7), rotY: Math.PI }
    ];

    galleryItems.forEach((item) => {
      const artId = item.id;
      const data = resolvedPhotos.get(artId) || {
        src: 'assets/01-cover.webp',
        title: item.title,
        caption: ''
      };

      const width = 2.0;
      const height = 2.6;

      // Frame
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.35 });
      const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, height + 0.3, 0.08), frameMat);
      frame.position.copy(item.pos);
      frame.rotation.y = item.rotY;
      frame.castShadow = true;
      this.scene.add(frame);

      // White Passe-partout / Matting
      const matMesh = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.2, height + 0.2), new THREE.MeshBasicMaterial({ color: 0xFAFAFA }));
      matMesh.position.set(0, 0, 0.045);
      frame.add(matMesh);

      // Photo Mesh
      const photoMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.25 });
      const photo = new THREE.Mesh(new THREE.PlaneGeometry(width, height), photoMat);
      photo.position.set(0, 0, 0.05);
      frame.add(photo);
      this.setTextureOnMesh(photo, data.src);

      // Directional Track Spotlight pointing down onto artwork
      const spot = new THREE.SpotLight(0xfffaec, 2.2, 8, Math.PI / 4, 0.5, 1.2);
      const spotOffset = item.rotY === 0 ? 2.5 : -2.5;
      spot.position.set(item.pos.x, 5.6, item.pos.z + spotOffset);
      spot.target = frame;
      spot.castShadow = true;
      this.scene.add(spot);

      // Light fixture mesh on ceiling track
      const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x121013, metalness: 0.8 });
      const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.22, 12), fixtureMat);
      fixture.position.set(item.pos.x, 5.75, item.pos.z + spotOffset);
      fixture.lookAt(frame.position);
      this.scene.add(fixture);

      // Register interactable artwork immediately
      const inspectPos = item.pos.clone();
      inspectPos.z += item.rotY === 0 ? 2.6 : -2.6;
      inspectPos.y = 1.8;

      this.artworks.push({
        mesh: frame,
        photoMesh: photo,
        id: artId,
        title: data.title,
        imageSrc: data.src,
        caption: data.caption,
        position: inspectPos,
        lookAt: item.pos.clone()
      });
    });

    // Vitrine Pedestals with Flower Displays
    this.buildVitrine(new THREE.Vector3(-14, 0, 4));
    this.buildVitrine(new THREE.Vector3(14, 0, 4));

    // Wooden Museum Benches
    this.buildBench(new THREE.Vector3(0, 0, 6.5), Math.PI);      // Opposite Centerpiece facing North
    this.buildBench(new THREE.Vector3(-22, 0, -8), 0);          // West Gallery
    this.buildBench(new THREE.Vector3(22, 0, -8), 0);           // East Gallery
  }

  buildVitrine(pos) {
    const vitGroup = new THREE.Group();
    vitGroup.position.copy(pos);

    // White Plinth
    const plinthMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.3 });
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.8), plinthMat);
    plinth.position.y = 0.55;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    vitGroup.add(plinth);

    // Glass Cover
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.3,
      roughness: 0.05,
      transmission: 0.9,
      thickness: 0.2
    });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.75, 0.72), glassMat);
    glass.position.y = 1.48;
    vitGroup.add(glass);

    // Vase inside glass
    const vaseMat = new THREE.MeshStandardMaterial({ color: 0xF0ECE1, roughness: 0.2 });
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.24, 16), vaseMat);
    vase.position.y = 1.22;
    vitGroup.add(vase);

    // Green flower stems
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x3E5B37, roughness: 0.8 });
    for (let i = 0; i < 5; i++) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 6), stemMat);
      const angle = (i / 5) * Math.PI * 2;
      stem.position.set(Math.sin(angle) * 0.02, 1.4, Math.cos(angle) * 0.02);
      stem.rotation.set((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3);
      vitGroup.add(stem);
    }

    this.scene.add(vitGroup);
  }

  buildBench(pos, rotY = 0) {
    const benchGroup = new THREE.Group();
    benchGroup.position.copy(pos);
    benchGroup.rotation.y = rotY;

    // Wooden Seat Plank
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xDDD1BE, roughness: 0.45 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.65), woodMat);
    seat.position.y = 0.48;
    seat.castShadow = true;
    benchGroup.add(seat);

    // Metal Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x141215, roughness: 0.6, metalness: 0.8 });
    const legLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.55), legMat);
    legLeft.position.set(-0.9, 0.24, 0);
    legLeft.castShadow = true;
    const legRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.55), legMat);
    legRight.position.set(0.9, 0.24, 0);
    legRight.castShadow = true;
    benchGroup.add(legLeft, legRight);

    this.scene.add(benchGroup);

    // Register Bench
    this.benches.push({
      mesh: seat,
      sitPosition: new THREE.Vector3(pos.x, 0, pos.z),
      sitRotation: rotY,
      isOccupied: false
    });
  }

  buildCinemaRoom() {
    const cinemaGroup = new THREE.Group();
    cinemaGroup.position.set(37.6, 0, 0); // East Gallery Wall Alcove

    // Setup Video Texture
    this.videoElement = document.createElement('video');
    this.videoElement.src = this.museumData.videoSrc;
    this.videoElement.crossOrigin = 'anonymous';
    this.videoElement.loop = true;
    this.videoElement.muted = true;
    this.videoElement.playsInline = true;
    this.videoElement.preload = 'auto';

    // Start playing on first user gesture
    const startVid = () => {
      this.videoElement.play().catch(() => {});
      window.removeEventListener('click', startVid);
      window.removeEventListener('keydown', startVid);
    };
    window.addEventListener('click', startVid, { once: true });
    window.addEventListener('keydown', startVid, { once: true });

    const videoTex = new THREE.VideoTexture(this.videoElement);
    videoTex.encoding = THREE.sRGBEncoding;
    videoTex.minFilter = THREE.LinearFilter;
    videoTex.magFilter = THREE.LinearFilter;

    // Cinema Screen on Wall
    const screenMat = new THREE.MeshBasicMaterial({ map: videoTex });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.6), screenMat);
    screen.position.set(0, 3.0, 0);
    screen.rotation.y = -Math.PI / 2;
    cinemaGroup.add(screen);
    this.videoMesh = screen;

    // Cinema Black Border Frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.3 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.8, 6.6), frameMat);
    frame.position.set(0.04, 3.0, 0);
    cinemaGroup.add(frame);

    // Cinema Viewing Bench
    this.buildBench(new THREE.Vector3(33.5, 0, 0), -Math.PI / 2);

    this.scene.add(cinemaGroup);
  }

  setupControls() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'e' || e.key === ' ') {
        this.handleActionKey();
      }
      if (e.key === 'Escape' && this.isInspecting) {
        this.exitInspect();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Mouse Drag for Camera Orbiting
    let isMouseDown = false;
    let prevMousePos = { x: 0, y: 0 };

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0 && !this.isInspecting) {
        isMouseDown = true;
        prevMousePos = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isMouseDown && !this.isInspecting) {
        const deltaX = e.clientX - prevMousePos.x;
        const deltaY = e.clientY - prevMousePos.y;
        prevMousePos = { x: e.clientX, y: e.clientY };

        this.cameraAngle.x -= deltaX * 0.005;
        this.cameraAngle.y = Math.max(-0.25, Math.min(0.65, this.cameraAngle.y + deltaY * 0.004));
      }
    });

    window.addEventListener('mouseup', () => {
      isMouseDown = false;
    });

    // Touch Controls
    this.setupTouchControls();

    // Raycast on Click to inspect photo / bench
    this.canvas.addEventListener('click', (e) => {
      if (this.isInspecting) return;
      this.handlePointerClick(e.clientX, e.clientY);
    });
  }

  setupTouchControls() {
    const joystickZone = document.getElementById('joystick-zone');
    const joystickThumb = document.getElementById('joystick-thumb');
    if (!joystickZone || !joystickThumb) return;

    let touchId = null;
    let startPos = { x: 0, y: 0 };

    joystickZone.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      touchId = t.identifier;
      const rect = joystickZone.getBoundingClientRect();
      startPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === touchId) {
          const dx = t.clientX - startPos.x;
          const dy = t.clientY - startPos.y;
          const dist = Math.min(45, Math.hypot(dx, dy));
          const angle = Math.atan2(dy, dx);

          this.touchJoystick.x = (Math.cos(angle) * dist) / 45;
          this.touchJoystick.y = -(Math.sin(angle) * dist) / 45;

          joystickThumb.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
        }
      }
    }, { passive: false });

    const resetTouch = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          touchId = null;
          this.touchJoystick = { x: 0, y: 0 };
          joystickThumb.style.transform = 'translate(0px, 0px)';
        }
      }
    };

    window.addEventListener('touchend', resetTouch);
    window.addEventListener('touchcancel', resetTouch);

    // Action Trigger Button on Mobile
    const actionBtn = document.getElementById('action-trigger');
    if (actionBtn) {
      actionBtn.addEventListener('click', () => {
        this.handleActionKey();
      });
    }
  }

  spawnPlayerAvatar(profile) {
    this.myProfile = profile;
    if (this.playerAvatar) {
      this.scene.remove(this.playerAvatar.group);
    }

    this.playerAvatar = new AvatarModel({
      type: profile.type || 'kai',
      name: profile.name || 'Luca',
      height: profile.height || 'average',
      skin: profile.skin,
      hair: profile.hair,
      top: profile.top,
      waistcoat: profile.waistcoat,
      trousers: profile.trousers,
      shoes: profile.shoes
    });

    // Start inside rotunda entrance
    this.playerAvatar.group.position.set(0, 0, 11);
    this.playerAvatar.group.rotation.y = Math.PI; // facing into museum north
    this.scene.add(this.playerAvatar.group);

    // Initialize Companion AI as the second visitor
    const companionName = profile.type === 'kai' ? this.museumData.recipient : this.museumData.sender;
    const companionType = profile.type === 'kai' ? 'mira' : 'kai';
    this.multiplayer.spawnCompanionAI(companionName, companionType);
  }

  handleActionKey() {
    if (this.isInspecting) {
      this.exitInspect();
      return;
    }

    if (this.isSitting) {
      // Stand up
      this.isSitting = false;
      this.playerAvatar.setSitting(false);
      if (this.currentBench) this.currentBench.isOccupied = false;
      this.currentBench = null;
      this.hideInteractionPrompt();
      return;
    }

    if (this.activeInteractable) {
      if (this.activeInteractable.type === 'art') {
        this.inspectArtwork(this.activeInteractable.data);
      } else if (this.activeInteractable.type === 'bench') {
        this.sitOnBench(this.activeInteractable.data);
      } else if (this.activeInteractable.type === 'plaque') {
        this.openDedicationModal();
      }
    }
  }

  handlePointerClick(clientX, clientY) {
    const mouse = new THREE.Vector2(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    // Check artworks
    const artMeshes = this.artworks.map(a => a.mesh);
    const intersects = raycaster.intersectObjects(artMeshes, true);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const foundArt = this.artworks.find(a => a.mesh === hit.object || a.mesh.children.includes(hit.object));
      if (foundArt) {
        this.inspectArtwork(foundArt);
        return;
      }
    }

    // Check dedication plaque
    if (this.dedicationPlaque) {
      const plaqueHits = raycaster.intersectObject(this.dedicationPlaque.mesh, true);
      if (plaqueHits.length > 0) {
        this.openDedicationModal();
      }
    }
  }

  inspectArtwork(artData) {
    if (this.isInspecting) return;
    this.isInspecting = true;
    this.currentInspectingArt = artData;
    if (window.museumAudio) window.museumAudio.playInspect();

    // Show Inspection Overlay UI
    const overlay = document.getElementById('inspect-overlay');
    const imgEl = document.getElementById('inspect-image');
    const titleEl = document.getElementById('inspect-title');
    const captionEl = document.getElementById('inspect-caption');

    imgEl.src = artData.imageSrc;
    titleEl.textContent = artData.title;
    captionEl.textContent = artData.caption;

    overlay.classList.add('show');
    this.hideInteractionPrompt();
  }

  exitInspect() {
    this.isInspecting = false;
    this.currentInspectingArt = null;
    const overlay = document.getElementById('inspect-overlay');
    overlay.classList.remove('show');
  }

  sitOnBench(benchData) {
    if (this.isSitting) return;
    this.isSitting = true;
    this.currentBench = benchData;
    benchData.isOccupied = true;

    if (window.museumAudio) window.museumAudio.playInteract();

    // Move player avatar into bench position
    this.playerAvatar.group.position.copy(benchData.sitPosition);
    this.playerAvatar.group.position.y = 0;
    this.playerAvatar.group.rotation.y = benchData.sitRotation;
    this.playerAvatar.setSitting(true);

    this.showInteractionPrompt('Press E to stand up');
  }

  openDedicationModal() {
    const modal = document.getElementById('dedication-modal');
    modal.classList.add('show');
    if (window.museumAudio) window.museumAudio.playInteract();
  }

  closeDedicationModal() {
    const modal = document.getElementById('dedication-modal');
    modal.classList.remove('show');
  }

  checkInteractions() {
    if (this.isInspecting || this.isSitting || !this.playerAvatar) return;

    const playerPos = this.playerAvatar.group.position;
    let closest = null;
    let minDist = 2.8;

    // 1. Check nearby artworks
    for (const art of this.artworks) {
      const d = playerPos.distanceTo(art.mesh.position);
      if (d < minDist) {
        minDist = d;
        closest = { type: 'art', data: art, label: `View "${art.title}"` };
      }
    }

    // 2. Check benches
    for (const bench of this.benches) {
      if (bench.isOccupied) continue;
      const d = playerPos.distanceTo(bench.sitPosition);
      if (d < 2.0 && d < minDist) {
        minDist = d;
        closest = { type: 'bench', data: bench, label: 'Sit on bench' };
      }
    }

    // 3. Check Dedication Plaque
    if (this.dedicationPlaque) {
      const d = playerPos.distanceTo(this.dedicationPlaque.mesh.position);
      if (d < 2.4 && d < minDist) {
        minDist = d;
        closest = { type: 'plaque', data: this.dedicationPlaque, label: 'Read Dedication' };
      }
    }

    if (closest) {
      this.activeInteractable = closest;
      this.showInteractionPrompt(closest.label);
    } else {
      this.activeInteractable = null;
      this.hideInteractionPrompt();
    }
  }

  showInteractionPrompt(text) {
    const prompt = document.getElementById('interaction-prompt');
    const label = document.getElementById('prompt-text');
    if (prompt && label) {
      label.textContent = text;
      prompt.classList.add('show');
    }
  }

  hideInteractionPrompt() {
    const prompt = document.getElementById('interaction-prompt');
    if (prompt) prompt.classList.remove('show');
  }

  updatePresenceCount(count) {
    const el = document.getElementById('presence-count');
    if (el) el.textContent = `${count} here`;
  }

  addChatMessage(sender, text) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const msg = document.createElement('div');
    msg.className = 'chat-msg';
    msg.innerHTML = `<span class="sender">${sender}:</span><span>${text}</span>`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }

  updatePlayer(delta) {
    if (!this.playerAvatar || this.isSitting || this.isInspecting) return;

    let moveX = 0;
    let moveZ = 0;

    if (this.keys['w'] || this.keys['arrowup']) moveZ -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) moveZ += 1;
    if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
    if (this.keys['d'] || this.keys['arrowright']) moveX += 1;

    // Apply touch joystick input
    if (Math.abs(this.touchJoystick.x) > 0.05 || Math.abs(this.touchJoystick.y) > 0.05) {
      moveX += this.touchJoystick.x;
      moveZ -= this.touchJoystick.y;
    }

    const inputLen = Math.hypot(moveX, moveZ);
    if (inputLen > 0.1) {
      const normX = moveX / inputLen;
      const normZ = moveZ / inputLen;

      // Rotate movement relative to camera angle
      const camYaw = this.cameraAngle.x;
      const worldMoveX = normX * Math.cos(camYaw) + normZ * Math.sin(camYaw);
      const worldMoveZ = -normX * Math.sin(camYaw) + normZ * Math.cos(camYaw);

      const speed = 4.2 * delta;
      const newX = this.playerAvatar.group.position.x + worldMoveX * speed;
      const newZ = this.playerAvatar.group.position.z + worldMoveZ * speed;

      // Museum Collision Boundaries
      const clampedX = Math.max(-36.5, Math.min(36.5, newX));
      const clampedZ = Math.max(-13.8, Math.min(13.8, newZ));

      // Monolith obstacle collision
      const inMonolith = Math.abs(clampedX) < 3.4 && Math.abs(clampedZ) < 0.6;
      if (!inMonolith) {
        this.playerAvatar.group.position.x = clampedX;
        this.playerAvatar.group.position.z = clampedZ;
      }

      // Turn avatar in direction of travel
      const targetAngle = Math.atan2(worldMoveX, worldMoveZ);
      this.playerAvatar.group.rotation.y = THREE.MathUtils.lerp(
        this.playerAvatar.group.rotation.y,
        targetAngle,
        0.18
      );

      this.playerAvatar.isWalking = true;
      if (window.museumAudio) window.museumAudio.playFootstep();
    } else {
      this.playerAvatar.isWalking = false;
    }

    this.playerAvatar.update(delta);

    // Broadcast multiplayer state
    if (this.multiplayer) {
      this.multiplayer.broadcastMyState(
        this.playerAvatar.group.position,
        this.playerAvatar.group.rotation,
        this.playerAvatar.isWalking,
        this.isSitting
      );
    }
  }

  updateCamera() {
    if (!this.playerAvatar) return;

    if (this.cameraMode === 'third') {
      const avatarPos = this.playerAvatar.group.position.clone();
      avatarPos.y += 1.45; // target avatar chest/head height

      const dist = this.cameraDistance;
      const offsetX = dist * Math.sin(this.cameraAngle.x) * Math.cos(this.cameraAngle.y);
      const offsetY = dist * Math.sin(this.cameraAngle.y) + 0.5;
      const offsetZ = dist * Math.cos(this.cameraAngle.x) * Math.cos(this.cameraAngle.y);

      const targetCamPos = avatarPos.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ));

      // Soft clamp camera inside museum ceiling and floor
      targetCamPos.y = Math.max(0.6, Math.min(5.5, targetCamPos.y));

      this.camera.position.lerp(targetCamPos, 0.12);
      this.camera.lookAt(avatarPos);
    } else {
      // First Person Camera
      const avatarPos = this.playerAvatar.group.position.clone();
      avatarPos.y += 1.62; // Eye height

      this.camera.position.copy(avatarPos);
      const lookTarget = avatarPos.clone().add(new THREE.Vector3(
        Math.sin(this.cameraAngle.x),
        Math.sin(this.cameraAngle.y),
        Math.cos(this.cameraAngle.x)
      ));
      this.camera.lookAt(lookTarget);
    }
  }

  toggleCameraMode() {
    this.cameraMode = this.cameraMode === 'third' ? 'first' : 'third';
    if (this.playerAvatar) {
      this.playerAvatar.group.visible = this.cameraMode === 'third';
    }
    return this.cameraMode;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.updatePlayer(delta);
    this.updateCamera();
    this.checkInteractions();

    if (this.multiplayer) {
      this.multiplayer.update(delta, this.camera);
    }

    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

window.MuseumWorld = MuseumWorld;
