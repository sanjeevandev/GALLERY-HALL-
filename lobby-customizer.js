/**
 * Lobby & Avatar Customizer Controller for "Our Museum"
 * Manages the 3D neoclassical entrance scene, avatar preview, color palettes,
 * 360 degree drag rotation, close-up zoom, and seamless transition into the 3D museum world.
 */

class LobbyManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    this.currentAvatar = null;
    this.avatarType = 'kai';
    this.avatarHeight = 'average';
    this.activeSubtab = 'skin';
    this.isCloseUp = false;

    // Customization state
    this.lookState = {
      kai: {
        skin: '#F2CDB9',
        hair: '#2C1E18',
        eyes: '#3E2A20',
        brows: '#241812',
        top: '#2A4E4F',
        waistcoat: '#6A6158',
        trousers: '#4A4E58',
        shoes: '#452E23'
      },
      mira: {
        skin: '#F2CDB9',
        hair: '#2C1E18',
        eyes: '#3E2A20',
        brows: '#241812',
        top: '#BC684C',
        waistcoat: '#6A6158',
        trousers: '#DED9CE',
        shoes: '#452E23'
      }
    };

    // Palettes
    this.palettes = {
      skin: [
        { label: 'Original', color: '#F2CDB9' },
        { label: 'Sand', color: '#E0B89C' },
        { label: 'Honey', color: '#BA8764' },
        { label: 'Sienna', color: '#87553A' },
        { label: 'Umber', color: '#543224' }
      ],
      hair: [
        { label: 'Dark Brown', color: '#2C1E18' },
        { label: 'Raven', color: '#121010' },
        { label: 'Blonde', color: '#CBB079' },
        { label: 'Chestnut', color: '#5B2C1B' },
        { label: 'Silver', color: '#8F8D8B' }
      ],
      eyes: [
        { label: 'Dark Espresso', color: '#231812' },
        { label: 'Hazel', color: '#57412A' },
        { label: 'Slate Blue', color: '#3A4E5E' },
        { label: 'Forest Green', color: '#284029' },
        { label: 'Amber', color: '#825424' }
      ],
      brows: [
        { label: 'Dark Brown', color: '#241812' },
        { label: 'Black', color: '#141212' },
        { label: 'Soft Taupe', color: '#5A4638' },
        { label: 'Auburn', color: '#4D2517' },
        { label: 'Ash', color: '#73706E' }
      ],
      top: [
        { label: 'Teal', color: '#2A4E4F' },
        { label: 'Terracotta', color: '#BC684C' },
        { label: 'Midnight', color: '#1B171A' },
        { label: 'Alabaster', color: '#E6E1D8' },
        { label: 'Burgundy', color: '#561A24' }
      ],
      waistcoat: [
        { label: 'Taupe Vest', color: '#6A6158' },
        { label: 'Charcoal', color: '#302E35' },
        { label: 'Navy Wool', color: '#222938' },
        { label: 'Camel', color: '#857053' },
        { label: 'Mocha', color: '#3C2A1E' }
      ],
      trousers: [
        { label: 'Charcoal', color: '#4A4E58' },
        { label: 'Cream', color: '#DED9CE' },
        { label: 'Black', color: '#1B171A' },
        { label: 'Tan', color: '#B09E86' },
        { label: 'Navy', color: '#273142' }
      ],
      shoes: [
        { label: 'Leather Brown', color: '#452E23' },
        { label: 'Onyx Black', color: '#181517' },
        { label: 'Tan Oxblood', color: '#6B3E26' },
        { label: 'Dark Cordovan', color: '#3B181E' },
        { label: 'Sand Suede', color: '#8C7456' }
      ]
    };

    // Rotation dragging
    this.targetRotation = 0;
    this.currentRotation = 0;
    this.isDragging = false;
    this.dragStartX = 0;

    this.init();
  }

  init() {
    // 1. Setup Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#FAF7F2');

    // 2. Setup Camera
    this.camera = new THREE.PerspectiveCamera(45, (window.innerWidth - 440) / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 1.35, 3.8);
    this.camera.lookAt(0, 1.1, 0);

    // 3. Setup Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.onResize();
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // 4. Lighting & Architecture
    this.buildLobbyArchitecture();

    // 5. Spawn Initial Avatar
    this.switchAvatar(this.avatarType);

    // 6. Bind DOM UI controls
    this.bindUI();

    // 7. Input drag handlers
    this.setupDragControls();

    // 8. Animation loop
    this.animate();
  }

  buildLobbyArchitecture() {
    // Soft sunny exterior lighting
    const hemiLight = new THREE.HemisphereLight(0xfffaed, 0xe2dcd3, 0.85);
    this.scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xfff5e6, 1.4);
    sun.position.set(4, 8, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    // Neoclassical stone facade wall
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xF3EEE8, roughness: 0.6 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 0.5), stoneMat);
    wall.position.set(0, 4.5, -2.5);
    wall.receiveShadow = true;
    this.scene.add(wall);

    // Neoclassical Door Frame & Columns
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xEAE3D8, roughness: 0.5 });
    const leftCol = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.0, 0.6), frameMat);
    leftCol.position.set(-2.2, 2.5, -2.2);
    leftCol.castShadow = true;
    const rightCol = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.0, 0.6), frameMat);
    rightCol.position.set(2.2, 2.5, -2.2);
    rightCol.castShadow = true;
    const topEntablature = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.7, 0.7), frameMat);
    topEntablature.position.set(0, 5.2, -2.15);
    topEntablature.castShadow = true;
    this.scene.add(leftCol, rightCol, topEntablature);

    // Double carved wood entrance doors
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5C381C, roughness: 0.45 });
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(1.85, 4.5, 0.1), woodMat);
    doorL.position.set(-0.95, 2.35, -2.25);
    const doorR = new THREE.Mesh(new THREE.BoxGeometry(1.85, 4.5, 0.1), woodMat);
    doorR.position.set(0.95, 2.35, -2.25);
    this.scene.add(doorL, doorR);

    // Brass handles
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, roughness: 0.3, metalness: 0.85 });
    const ringGeo = new THREE.TorusGeometry(0.12, 0.02, 12, 24);
    const ringL = new THREE.Mesh(ringGeo, brassMat);
    ringL.position.set(-0.35, 2.3, -2.18);
    const ringR = new THREE.Mesh(ringGeo, brassMat);
    ringR.position.set(0.35, 2.3, -2.18);
    this.scene.add(ringL, ringR);

    // "Our Museum" pediment plaque above door
    const signPlaque = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 0.12), frameMat);
    signPlaque.position.set(0, 4.85, -2.18);
    this.scene.add(signPlaque);

    // Stone Steps & Terrace
    const stepMat = new THREE.MeshStandardMaterial({ color: 0xEEE7DE, roughness: 0.4 });
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(8, 0.18, 2.5), stepMat);
    step1.position.set(0, 0.09, -1.25);
    step1.receiveShadow = true;
    this.scene.add(step1);

    // Polished stone floor with soft reflection
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xFAF6EF,
      roughness: 0.18,
      metalness: 0.05
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  switchAvatar(type) {
    this.avatarType = type;
    if (this.currentAvatar) {
      this.scene.remove(this.currentAvatar.group);
    }

    const state = this.lookState[type];
    this.currentAvatar = new AvatarModel({
      type: type,
      height: this.avatarHeight,
      name: type === 'kai' ? 'Kai' : 'Mira',
      skin: state.skin,
      hair: state.hair,
      eyes: state.eyes,
      brows: state.brows,
      top: state.top,
      waistcoat: state.waistcoat,
      trousers: state.trousers,
      shoes: state.shoes
    });

    this.currentAvatar.group.position.set(0, 0, 0);
    this.currentAvatar.group.rotation.y = this.currentRotation;
    this.scene.add(this.currentAvatar.group);

    // Update customizer subtabs according to type (e.g. Kai has Waistcoat + Shirt; Mira has Top)
    this.renderSubtabs();
    this.renderSwatches(this.activeSubtab);
  }

  setHeight(h) {
    this.avatarHeight = h;
    if (this.currentAvatar) {
      this.currentAvatar.height = h;
      this.currentAvatar.applyHeight();
    }
  }

  setColor(category, hex) {
    this.lookState[this.avatarType][category] = hex;
    if (this.currentAvatar) {
      this.currentAvatar.setCustomColor(category, hex);
    }
    this.renderSwatches(category);
  }

  toggleCloseUp() {
    this.isCloseUp = !this.isCloseUp;
    const btn = document.getElementById('btn-close-up');
    if (btn) btn.textContent = this.isCloseUp ? 'Full view' : 'Close-up';
  }

  bindUI() {
    // Character type buttons (Kai vs Mira)
    const btnKai = document.getElementById('type-kai');
    const btnMira = document.getElementById('type-mira');
    if (btnKai && btnMira) {
      btnKai.addEventListener('click', () => {
        btnKai.classList.add('active');
        btnMira.classList.remove('active');
        this.switchAvatar('kai');
      });
      btnMira.addEventListener('click', () => {
        btnMira.classList.add('active');
        btnKai.classList.remove('active');
        this.switchAvatar('mira');
      });
    }

    // Height buttons
    document.querySelectorAll('.height-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.height-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setHeight(btn.dataset.height);
      });
    });

    // Close-up button
    const closeUpBtn = document.getElementById('btn-close-up');
    if (closeUpBtn) {
      closeUpBtn.addEventListener('click', () => this.toggleCloseUp());
    }

    // Turn arrows
    const turnLeft = document.getElementById('turn-left');
    const turnRight = document.getElementById('turn-right');
    if (turnLeft) {
      turnLeft.addEventListener('click', () => {
        this.targetRotation -= 0.6;
      });
    }
    if (turnRight) {
      turnRight.addEventListener('click', () => {
        this.targetRotation += 0.6;
      });
    }

    // Reset look
    const resetBtn = document.getElementById('reset-look-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.lookState.kai = {
          skin: '#F2CDB9',
          hair: '#2C1E18',
          eyes: '#3E2A20',
          brows: '#241812',
          top: '#2A4E4F',
          waistcoat: '#6A6158',
          trousers: '#4A4E58',
          shoes: '#452E23'
        };
        this.lookState.mira = {
          skin: '#F2CDB9',
          hair: '#2C1E18',
          eyes: '#3E2A20',
          brows: '#241812',
          top: '#BC684C',
          waistcoat: '#6A6158',
          trousers: '#DED9CE',
          shoes: '#452E23'
        };
        this.switchAvatar(this.avatarType);
      });
    }
  }

  renderSubtabs() {
    const container = document.getElementById('custom-subtabs');
    if (!container) return;

    // Define categories
    const categories = this.avatarType === 'kai'
      ? [
          { id: 'skin', label: 'Skin' },
          { id: 'hair', label: 'Hair' },
          { id: 'eyes', label: 'Eyes' },
          { id: 'brows', label: 'Brows' },
          { id: 'top', label: 'Shirt' },
          { id: 'waistcoat', label: 'Waistcoat' },
          { id: 'trousers', label: 'Trousers' },
          { id: 'shoes', label: 'Shoes' }
        ]
      : [
          { id: 'skin', label: 'Skin' },
          { id: 'hair', label: 'Hair' },
          { id: 'eyes', label: 'Eyes' },
          { id: 'brows', label: 'Brows' },
          { id: 'top', label: 'Top' },
          { id: 'trousers', label: 'Trousers' },
          { id: 'shoes', label: 'Shoes' }
        ];

    // Ensure valid active category
    if (!categories.find(c => c.id === this.activeSubtab)) {
      this.activeSubtab = 'skin';
    }

    container.innerHTML = '';
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `subtab-link ${cat.id === this.activeSubtab ? 'active' : ''}`;
      btn.textContent = cat.label;
      btn.addEventListener('click', () => {
        container.querySelectorAll('.subtab-link').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeSubtab = cat.id;
        this.renderSwatches(cat.id);
      });
      container.appendChild(btn);
    });
  }

  renderSwatches(category) {
    const grid = document.getElementById('swatch-grid');
    const headerTitle = document.getElementById('swatch-category-title');
    if (!grid) return;

    const items = this.palettes[category] || this.palettes.top;
    if (headerTitle) {
      headerTitle.textContent = `${category.charAt(0).toUpperCase() + category.slice(1)} tone`;
    }

    const currentHex = this.lookState[this.avatarType][category];

    grid.innerHTML = '';
    items.forEach(item => {
      const wrap = document.createElement('div');
      wrap.className = `swatch-item ${currentHex.toLowerCase() === item.color.toLowerCase() ? 'active' : ''}`;

      const circle = document.createElement('div');
      circle.className = 'swatch-circle';
      circle.style.backgroundColor = item.color;

      const label = document.createElement('span');
      label.className = 'swatch-label';
      label.textContent = item.label;

      wrap.appendChild(circle);
      wrap.appendChild(label);

      wrap.addEventListener('click', () => {
        this.setColor(category, item.color);
      });

      grid.appendChild(wrap);
    });
  }

  setupDragControls() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.dragStartX;
        this.dragStartX = e.clientX;
        this.targetRotation += dx * 0.012;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Touch dragging
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.dragStartX = e.touches[0].clientX;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - this.dragStartX;
        this.dragStartX = e.touches[0].clientX;
        this.targetRotation += dx * 0.012;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  getProfile() {
    const nameInput = document.getElementById('player-name-field');
    const name = nameInput && nameInput.value.trim() ? nameInput.value.trim() : (this.avatarType === 'kai' ? 'Luca' : 'Emma');
    const look = this.lookState[this.avatarType];

    return {
      name: name,
      type: this.avatarType,
      height: this.avatarHeight,
      ...look
    };
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);

    // Smooth rotation lerping
    this.currentRotation = THREE.MathUtils.lerp(this.currentRotation, this.targetRotation, 0.15);
    if (this.currentAvatar) {
      this.currentAvatar.group.rotation.y = this.currentRotation;
      this.currentAvatar.update(delta);
    }

    // Camera close-up interpolation
    const targetCamPos = this.isCloseUp
      ? new THREE.Vector3(0, 1.55, 1.35)
      : new THREE.Vector3(0, 1.35, 3.8);
    const targetLookAt = this.isCloseUp
      ? new THREE.Vector3(0, 1.5, 0)
      : new THREE.Vector3(0, 1.1, 0);

    this.camera.position.lerp(targetCamPos, 0.08);
    this.camera.lookAt(targetLookAt);

    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    if (!this.renderer || !this.camera) return;
    const isMobile = window.innerWidth <= 900;
    const width = isMobile ? window.innerWidth : window.innerWidth - 440;
    const height = isMobile ? window.innerHeight * 0.52 : window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}

window.LobbyManager = LobbyManager;
