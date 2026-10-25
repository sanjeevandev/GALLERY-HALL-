/**
 * Avatar Builder & Animation System for "Our Museum"
 * Procedurally models Kai and Mira avatars with articulated limbs, customization, and animations
 * (Idle, Walk, Sit on bench, Emote).
 */

class AvatarModel {
  constructor(options = {}) {
    this.type = options.type || 'kai'; // 'kai' or 'mira'
    this.height = options.height || 'average'; // 'short', 'average', 'tall'
    this.name = options.name || (this.type === 'kai' ? 'Kai' : 'Mira');
    
    // Customization Colors
    this.colors = {
      skin: options.skin || '#F2CDB9',
      hair: options.hair || '#2C1E18',
      eyes: options.eyes || '#3E2A20',
      brows: options.brows || '#241812',
      top: options.top || (this.type === 'kai' ? '#2A4E4F' : '#BC684C'),
      waistcoat: options.waistcoat || '#6A6158',
      trousers: options.trousers || (this.type === 'kai' ? '#4A4E58' : '#DED9CE'),
      shoes: options.shoes || '#452E23'
    };

    this.group = new THREE.Group();
    this.group.name = `avatar_${this.name}`;
    
    this.limbs = {};
    this.materials = {};
    
    this.animTime = 0;
    this.isWalking = false;
    this.isSitting = false;
    this.walkSpeed = 8.5;

    this.build();
    this.applyHeight();
  }

  createMaterial(color, roughness = 0.6, metalness = 0.05) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: roughness,
      metalness: metalness
    });
  }

  build() {
    // Clear any existing children
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }

    // Initialize materials
    this.materials.skin = this.createMaterial(this.colors.skin, 0.7, 0.0);
    this.materials.hair = this.createMaterial(this.colors.hair, 0.6, 0.05);
    this.materials.eyes = this.createMaterial(this.colors.eyes, 0.2, 0.1);
    this.materials.brows = this.createMaterial(this.colors.brows, 0.8, 0.0);
    this.materials.top = this.createMaterial(this.colors.top, 0.8, 0.05);
    this.materials.waistcoat = this.createMaterial(this.colors.waistcoat, 0.75, 0.05);
    this.materials.trousers = this.createMaterial(this.colors.trousers, 0.8, 0.02);
    this.materials.shoes = this.createMaterial(this.colors.shoes, 0.45, 0.15);

    // Main Body Pivot
    const bodyRoot = new THREE.Group();
    bodyRoot.position.y = 0;
    this.group.add(bodyRoot);
    this.limbs.bodyRoot = bodyRoot;

    // Pelvis
    const pelvisGeo = new THREE.BoxGeometry(0.32, 0.16, 0.22);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, this.materials.trousers);
    pelvisMesh.position.y = 0.95;
    pelvisMesh.castShadow = true;
    bodyRoot.add(pelvisMesh);
    this.limbs.pelvis = pelvisMesh;

    // Torso / Chest
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.1, 0);
    pelvisMesh.add(torsoGroup);
    this.limbs.torso = torsoGroup;

    if (this.type === 'kai') {
      // Kai's Chest + Vest
      const chestGeo = new THREE.BoxGeometry(0.36, 0.44, 0.24);
      const chestMesh = new THREE.Mesh(chestGeo, this.materials.top);
      chestMesh.position.y = 0.24;
      chestMesh.castShadow = true;
      torsoGroup.add(chestMesh);

      // Waistcoat front layer
      const vestGeo = new THREE.BoxGeometry(0.38, 0.38, 0.25);
      const vestMesh = new THREE.Mesh(vestGeo, this.materials.waistcoat);
      vestMesh.position.set(0, 0.21, 0.005);
      vestMesh.castShadow = true;
      torsoGroup.add(vestMesh);

      // Tie / collar accent
      const collarGeo = new THREE.BoxGeometry(0.14, 0.1, 0.16);
      const collarMesh = new THREE.Mesh(collarGeo, this.materials.top);
      collarMesh.position.set(0, 0.44, 0.05);
      torsoGroup.add(collarMesh);
    } else {
      // Mira's Fitted Top
      const chestGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.42, 16);
      const chestMesh = new THREE.Mesh(chestGeo, this.materials.top);
      chestMesh.position.y = 0.23;
      chestMesh.scale.set(1.15, 1.0, 0.75);
      chestMesh.castShadow = true;
      torsoGroup.add(chestMesh);

      // Belt
      const beltGeo = new THREE.CylinderGeometry(0.155, 0.155, 0.04, 16);
      const beltMat = this.createMaterial('#1F1B18', 0.5, 0.2);
      const beltMesh = new THREE.Mesh(beltGeo, beltMat);
      beltMesh.position.y = 0.02;
      beltMesh.scale.set(1.18, 1.0, 0.78);
      torsoGroup.add(beltMesh);
    }

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.12, 12);
    const neckMesh = new THREE.Mesh(neckGeo, this.materials.skin);
    neckMesh.position.y = 0.5;
    neckMesh.castShadow = true;
    torsoGroup.add(neckMesh);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.14, 0);
    neckMesh.add(headGroup);
    this.limbs.head = headGroup;

    // Face shape
    const headGeo = new THREE.SphereGeometry(0.16, 20, 20);
    headGeo.scale(0.9, 1.15, 1.0);
    const headMesh = new THREE.Mesh(headGeo, this.materials.skin);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.026, 12, 12);
    const leftEye = new THREE.Mesh(eyeGeo, this.materials.eyes);
    leftEye.position.set(0.058, 0.02, 0.14);
    const rightEye = new THREE.Mesh(eyeGeo, this.materials.eyes);
    rightEye.position.set(-0.058, 0.02, 0.14);
    headGroup.add(leftEye, rightEye);

    // Eyebrows
    const browGeo = new THREE.BoxGeometry(0.05, 0.012, 0.02);
    const leftBrow = new THREE.Mesh(browGeo, this.materials.brows);
    leftBrow.position.set(0.058, 0.06, 0.145);
    leftBrow.rotation.z = -0.08;
    const rightBrow = new THREE.Mesh(browGeo, this.materials.brows);
    rightBrow.position.set(-0.058, 0.06, 0.145);
    rightBrow.rotation.z = 0.08;
    headGroup.add(leftBrow, rightBrow);

    // Hair
    if (this.type === 'kai') {
      // Kai's Messy Anime Layered Hair
      const hairBase = new THREE.SphereGeometry(0.18, 16, 16);
      hairBase.scale(1.02, 1.08, 1.05);
      const hairMesh = new THREE.Mesh(hairBase, this.materials.hair);
      hairMesh.position.set(0, 0.06, -0.02);
      hairMesh.castShadow = true;
      headGroup.add(hairMesh);

      // Hair strands / tufts
      for (let i = 0; i < 7; i++) {
        const tuft = new THREE.ConeGeometry(0.045, 0.12, 6);
        const tMesh = new THREE.Mesh(tuft, this.materials.hair);
        const angle = -0.6 + i * 0.2;
        tMesh.position.set(Math.sin(angle) * 0.14, 0.11 + Math.cos(angle) * 0.04, 0.13);
        tMesh.rotation.set(-0.4, 0, -angle * 0.6);
        headGroup.add(tMesh);
      }
    } else {
      // Mira's Long Flowing Hair
      const hairTop = new THREE.SphereGeometry(0.18, 16, 16);
      hairTop.scale(1.02, 1.08, 1.05);
      const hairTopMesh = new THREE.Mesh(hairTop, this.materials.hair);
      hairTopMesh.position.set(0, 0.06, -0.02);
      hairTopMesh.castShadow = true;
      headGroup.add(hairTopMesh);

      // Back long hair flowing down past shoulders
      const hairBackGeo = new THREE.BoxGeometry(0.28, 0.46, 0.12);
      const hairBackMesh = new THREE.Mesh(hairBackGeo, this.materials.hair);
      hairBackMesh.position.set(0, -0.16, -0.11);
      hairBackMesh.rotation.x = -0.06;
      hairBackMesh.castShadow = true;
      headGroup.add(hairBackMesh);

      // Side strands framing face
      const sideGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.38, 8);
      const leftStrand = new THREE.Mesh(sideGeo, this.materials.hair);
      leftStrand.position.set(0.14, -0.1, 0.08);
      leftStrand.rotation.z = -0.1;
      const rightStrand = new THREE.Mesh(sideGeo, this.materials.hair);
      rightStrand.position.set(-0.14, -0.1, 0.08);
      rightStrand.rotation.z = 0.1;
      headGroup.add(leftStrand, rightStrand);
    }

    // Legs and Feet
    this.buildLegs(pelvisMesh);

    // Arms and Hands
    this.buildArms(torsoGroup);
  }

  buildLegs(pelvis) {
    const legRadius = this.type === 'kai' ? 0.065 : 0.058;
    const legLength = 0.42;

    // Left Leg
    const leftHip = new THREE.Group();
    leftHip.position.set(0.1, -0.08, 0);
    pelvis.add(leftHip);
    this.limbs.leftHip = leftHip;

    const leftThighGeo = new THREE.CylinderGeometry(legRadius * 1.1, legRadius, legLength, 12);
    const leftThigh = new THREE.Mesh(leftThighGeo, this.materials.trousers);
    leftThigh.position.y = -legLength / 2;
    leftThigh.castShadow = true;
    leftHip.add(leftThigh);

    const leftKnee = new THREE.Group();
    leftKnee.position.set(0, -legLength, 0);
    leftHip.add(leftKnee);
    this.limbs.leftKnee = leftKnee;

    const leftCalfGeo = new THREE.CylinderGeometry(legRadius, legRadius * 0.9, legLength, 12);
    const leftCalf = new THREE.Mesh(leftCalfGeo, this.materials.trousers);
    leftCalf.position.y = -legLength / 2;
    leftCalf.castShadow = true;
    leftKnee.add(leftCalf);

    const footGeo = new THREE.BoxGeometry(0.11, 0.08, 0.22);
    const leftFoot = new THREE.Mesh(footGeo, this.materials.shoes);
    leftFoot.position.set(0, -legLength, 0.04);
    leftFoot.castShadow = true;
    leftKnee.add(leftFoot);

    // Right Leg
    const rightHip = new THREE.Group();
    rightHip.position.set(-0.1, -0.08, 0);
    pelvis.add(rightHip);
    this.limbs.rightHip = rightHip;

    const rightThighGeo = new THREE.CylinderGeometry(legRadius * 1.1, legRadius, legLength, 12);
    const rightThigh = new THREE.Mesh(rightThighGeo, this.materials.trousers);
    rightThigh.position.y = -legLength / 2;
    rightThigh.castShadow = true;
    rightHip.add(rightThigh);

    const rightKnee = new THREE.Group();
    rightKnee.position.set(0, -legLength, 0);
    rightHip.add(rightKnee);
    this.limbs.rightKnee = rightKnee;

    const rightCalfGeo = new THREE.CylinderGeometry(legRadius, legRadius * 0.9, legLength, 12);
    const rightCalf = new THREE.Mesh(rightCalfGeo, this.materials.trousers);
    rightCalf.position.y = -legLength / 2;
    rightCalf.castShadow = true;
    rightKnee.add(rightCalf);

    const rightFoot = new THREE.Mesh(footGeo, this.materials.shoes);
    rightFoot.position.set(0, -legLength, 0.04);
    rightFoot.castShadow = true;
    rightKnee.add(rightFoot);
  }

  buildArms(torso) {
    const armRadius = this.type === 'kai' ? 0.052 : 0.045;
    const armLength = 0.38;

    // Left Arm
    const leftShoulder = new THREE.Group();
    leftShoulder.position.set(0.22, 0.38, 0);
    torso.add(leftShoulder);
    this.limbs.leftShoulder = leftShoulder;

    const leftArmGeo = new THREE.CylinderGeometry(armRadius, armRadius * 0.9, armLength, 12);
    const leftUpperArm = new THREE.Mesh(leftArmGeo, this.materials.top);
    leftUpperArm.position.y = -armLength / 2;
    leftUpperArm.castShadow = true;
    leftShoulder.add(leftUpperArm);

    const leftElbow = new THREE.Group();
    leftElbow.position.set(0, -armLength, 0);
    leftShoulder.add(leftElbow);
    this.limbs.leftElbow = leftElbow;

    const leftForearm = new THREE.Mesh(leftArmGeo, this.materials.top);
    leftForearm.position.y = -armLength / 2;
    leftForearm.castShadow = true;
    leftElbow.add(leftForearm);

    const handGeo = new THREE.SphereGeometry(0.045, 10, 10);
    const leftHand = new THREE.Mesh(handGeo, this.materials.skin);
    leftHand.position.set(0, -armLength, 0);
    leftElbow.add(leftHand);

    // Right Arm
    const rightShoulder = new THREE.Group();
    rightShoulder.position.set(-0.22, 0.38, 0);
    torso.add(rightShoulder);
    this.limbs.rightShoulder = rightShoulder;

    const rightArmGeo = new THREE.CylinderGeometry(armRadius, armRadius * 0.9, armLength, 12);
    const rightUpperArm = new THREE.Mesh(rightArmGeo, this.materials.top);
    rightUpperArm.position.y = -armLength / 2;
    rightUpperArm.castShadow = true;
    rightShoulder.add(rightUpperArm);

    const rightElbow = new THREE.Group();
    rightElbow.position.set(0, -armLength, 0);
    rightShoulder.add(rightElbow);
    this.limbs.rightElbow = rightElbow;

    const rightForearm = new THREE.Mesh(rightArmGeo, this.materials.top);
    rightForearm.position.y = -armLength / 2;
    rightForearm.castShadow = true;
    rightElbow.add(rightForearm);

    const rightHand = new THREE.Mesh(handGeo, this.materials.skin);
    rightHand.position.set(0, -armLength, 0);
    rightElbow.add(rightHand);
  }

  applyHeight() {
    let scaleY = 1.0;
    if (this.height === 'short') scaleY = 0.92;
    else if (this.height === 'tall') scaleY = 1.08;
    this.group.scale.set(1.0, scaleY, 1.0);
  }

  setCustomColor(category, hex) {
    this.colors[category] = hex;
    if (this.materials[category]) {
      this.materials[category].color.set(hex);
    }
  }

  setSitting(sitting) {
    this.isSitting = sitting;
    if (sitting) {
      this.isWalking = false;
      // Sitting Pose
      this.limbs.bodyRoot.position.y = -0.42;
      this.limbs.leftHip.rotation.x = -Math.PI / 2;
      this.limbs.rightHip.rotation.x = -Math.PI / 2;
      this.limbs.leftKnee.rotation.x = Math.PI / 2;
      this.limbs.rightKnee.rotation.x = Math.PI / 2;

      // Resting arms on lap
      this.limbs.leftShoulder.rotation.set(-0.35, 0, -0.15);
      this.limbs.rightShoulder.rotation.set(-0.35, 0, 0.15);
      this.limbs.leftElbow.rotation.set(-0.6, 0, 0);
      this.limbs.rightElbow.rotation.set(-0.6, 0, 0);
    } else {
      // Stand up pose
      this.limbs.bodyRoot.position.y = 0;
      this.limbs.leftHip.rotation.x = 0;
      this.limbs.rightHip.rotation.x = 0;
      this.limbs.leftKnee.rotation.x = 0;
      this.limbs.rightKnee.rotation.x = 0;
      this.limbs.leftShoulder.rotation.set(0, 0, 0);
      this.limbs.rightShoulder.rotation.set(0, 0, 0);
      this.limbs.leftElbow.rotation.set(0, 0, 0);
      this.limbs.rightElbow.rotation.set(0, 0, 0);
    }
  }

  update(delta) {
    this.animTime += delta;

    if (this.isSitting) {
      // Gentle breathing while sitting
      const breath = Math.sin(this.animTime * 1.5) * 0.02;
      this.limbs.torso.position.y = 0.1 + breath;
      return;
    }

    if (this.isWalking) {
      // Walking Animation
      const stride = Math.sin(this.animTime * this.walkSpeed);
      const bob = Math.abs(Math.sin(this.animTime * this.walkSpeed)) * 0.04;

      this.limbs.bodyRoot.position.y = bob;

      // Leg swings
      this.limbs.leftHip.rotation.x = stride * 0.65;
      this.limbs.rightHip.rotation.x = -stride * 0.65;

      // Knee bend on back swing
      this.limbs.leftKnee.rotation.x = Math.max(0, -stride * 0.5);
      this.limbs.rightKnee.rotation.x = Math.max(0, stride * 0.5);

      // Arm counter-swings
      this.limbs.leftShoulder.rotation.x = -stride * 0.5;
      this.limbs.rightShoulder.rotation.x = stride * 0.5;
      this.limbs.leftElbow.rotation.x = -0.2 - Math.max(0, stride * 0.3);
      this.limbs.rightElbow.rotation.x = -0.2 - Math.max(0, -stride * 0.3);

      // Subtle torso twist
      this.limbs.torso.rotation.y = -stride * 0.08;
    } else {
      // Idle Breathing
      const breath = Math.sin(this.animTime * 2.0) * 0.015;
      this.limbs.bodyRoot.position.y = 0;
      this.limbs.torso.position.y = 0.1 + breath;
      this.limbs.leftHip.rotation.x = 0;
      this.limbs.rightHip.rotation.x = 0;
      this.limbs.leftKnee.rotation.x = 0;
      this.limbs.rightKnee.rotation.x = 0;
      this.limbs.leftShoulder.rotation.set(0, 0, 0.08);
      this.limbs.rightShoulder.rotation.set(0, 0, -0.08);
      this.limbs.leftElbow.rotation.set(0, 0, 0);
      this.limbs.rightElbow.rotation.set(0, 0, 0);
      this.limbs.torso.rotation.y = 0;
    }
  }
}

window.AvatarModel = AvatarModel;
