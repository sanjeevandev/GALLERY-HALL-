/**
 * Multiplayer & Social Synchronization System for "Our Museum"
 * Supports real-time multi-tab synchronization via BroadcastChannel / WebSockets / LocalStorage
 * and provides responsive companion AI when exploring solo.
 */

class MultiplayerSystem {
  constructor(museumScene) {
    this.museum = museumScene;
    this.channelName = 'giftvera_our_museum_room';
    this.channel = null;
    this.players = new Map(); // id -> { avatar, data, nametagEl, bubbleEl }
    this.myId = 'p_' + Math.random().toString(36).substring(2, 9);
    this.lastBroadcast = 0;
    this.companionAI = null;

    this.initNetwork();
  }

  initNetwork() {
    try {
      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (e) => this.handleMessage(e.data);
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported, falling back to local simulation');
    }

    // Window storage listener fallback
    window.addEventListener('storage', (e) => {
      if (e.key === this.channelName && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          this.handleMessage(data);
        } catch (err) {}
      }
    });

    // Announce entrance
    this.broadcast({
      type: 'join',
      id: this.myId,
      time: Date.now()
    });
  }

  broadcast(msg) {
    msg.sender = this.myId;
    if (this.channel) {
      this.channel.postMessage(msg);
    }
    try {
      localStorage.setItem(this.channelName, JSON.stringify(msg));
    } catch (e) {}
  }

  broadcastMyState(pos, rot, isWalking, isSitting) {
    const now = performance.now();
    if (now - this.lastBroadcast < 60) return; // 16fps sync
    this.lastBroadcast = now;

    const myProfile = this.museum.myProfile || {
      name: 'Luca',
      type: 'kai',
      color: '#E08238'
    };

    this.broadcast({
      type: 'update',
      id: this.myId,
      profile: myProfile,
      pos: { x: pos.x, y: pos.y, z: pos.z },
      rot: rot.y,
      isWalking: isWalking,
      isSitting: isSitting
    });
  }

  broadcastChat(text) {
    const myProfile = this.museum.myProfile || { name: 'You' };
    this.broadcast({
      type: 'chat',
      id: this.myId,
      name: myProfile.name,
      text: text
    });
    this.showSpeechBubble(this.museum.playerAvatar, text, myProfile.name);
  }

  broadcastEmote(emoji) {
    const myProfile = this.museum.myProfile || { name: 'You' };
    this.broadcast({
      type: 'emote',
      id: this.myId,
      name: myProfile.name,
      emoji: emoji
    });
    this.showSpeechBubble(this.museum.playerAvatar, emoji, myProfile.name, true);
    if (window.museumAudio) window.museumAudio.playEmote();
  }

  handleMessage(msg) {
    if (!msg || msg.sender === this.myId) return;

    if (msg.type === 'update') {
      this.updateRemotePlayer(msg);
    } else if (msg.type === 'chat') {
      const p = this.players.get(msg.id);
      if (p) {
        this.showSpeechBubble(p.avatar, msg.text, msg.name);
        this.museum.addChatMessage(msg.name, msg.text);
      }
    } else if (msg.type === 'emote') {
      const p = this.players.get(msg.id);
      if (p) {
        this.showSpeechBubble(p.avatar, msg.emoji, msg.name, true);
        if (window.museumAudio) window.museumAudio.playEmote();
      }
    }
  }

  updateRemotePlayer(msg) {
    let p = this.players.get(msg.id);
    if (!p) {
      // Create new remote avatar
      const avatar = new AvatarModel({
        type: msg.profile.type || 'mira',
        name: msg.profile.name || 'Emma',
        height: msg.profile.height || 'average'
      });
      this.museum.scene.add(avatar.group);

      const nametagEl = document.createElement('div');
      nametagEl.className = 'player-nametag';
      nametagEl.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#06B6D4"></span><span>${msg.profile.name}</span>`;
      document.getElementById('nametag-layer').appendChild(nametagEl);

      p = {
        avatar: avatar,
        data: msg,
        nametagEl: nametagEl,
        targetPos: new THREE.Vector3(msg.pos.x, msg.pos.y, msg.pos.z),
        targetRot: msg.rot
      };
      this.players.set(msg.id, p);
      this.museum.updatePresenceCount(this.players.size + 1);
    }

    p.targetPos.set(msg.pos.x, msg.pos.y, msg.pos.z);
    p.targetRot = msg.rot;
    p.avatar.isWalking = msg.isWalking;
    if (p.avatar.isSitting !== msg.isSitting) {
      p.avatar.setSitting(msg.isSitting);
    }
  }

  spawnCompanionAI(name = 'Emma', type = 'mira') {
    if (this.companionAI) return;

    const avatar = new AvatarModel({
      type: type,
      name: name,
      height: 'average',
      skin: '#F2CDB9',
      hair: '#2C1E18',
      top: '#232023',
      trousers: '#DED9CE',
      shoes: '#302621'
    });

    avatar.group.position.set(-2, 0, 0);
    avatar.group.rotation.y = Math.PI / 4;
    this.museum.scene.add(avatar.group);

    const nametagEl = document.createElement('div');
    nametagEl.className = 'player-nametag';
    nametagEl.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#06B6D4"></span><span>${name}</span>`;
    document.getElementById('nametag-layer').appendChild(nametagEl);

    this.companionAI = {
      avatar: avatar,
      nametagEl: nametagEl,
      name: name,
      state: 'look_centerpiece',
      timer: 0,
      targetPos: new THREE.Vector3(-2, 0, 0),
      waypoints: [
        new THREE.Vector3(-1.8, 0, 0.5),   // Centerpiece
        new THREE.Vector3(-1.5, 0, -2.5),  // Dedication
        new THREE.Vector3(-9.5, 0, 0),     // West Gallery Art
        new THREE.Vector3(-6, 0, 0),       // Vitrine
        new THREE.Vector3(12, 0, 0),       // Cinema Bench
        new THREE.Vector3(10, 0, 1.2)      // East Gallery Art
      ],
      currentWp: 0
    };

    this.museum.updatePresenceCount(2);

    // Initial greeting after 3 seconds
    setTimeout(() => {
      this.showSpeechBubble(avatar, "It's so wonderful walking through this together ✨", name);
      this.museum.addChatMessage(name, "It's so wonderful walking through this together ✨");
    }, 3200);
  }

  update(delta, camera) {
    // Update remote players
    this.players.forEach((p) => {
      p.avatar.group.position.lerp(p.targetPos, 0.15);
      p.avatar.group.rotation.y = THREE.MathUtils.lerp(p.avatar.group.rotation.y, p.targetRot, 0.15);
      p.avatar.update(delta);
      this.updateNametagPos(p.avatar, p.nametagEl, camera);
    });

    // Update companion AI
    if (this.companionAI) {
      const ai = this.companionAI;
      ai.timer += delta;

      // Simple graceful museum stroll behavior
      if (ai.state === 'walk') {
        const target = ai.waypoints[ai.currentWp];
        const dir = new THREE.Vector3().subVectors(target, ai.avatar.group.position);
        dir.y = 0;
        const dist = dir.length();

        if (dist > 0.1) {
          dir.normalize();
          ai.avatar.group.position.addScaledVector(dir, delta * 1.6);
          const targetAngle = Math.atan2(dir.x, dir.z);
          ai.avatar.group.rotation.y = THREE.MathUtils.lerp(ai.avatar.group.rotation.y, targetAngle, 0.1);
          ai.avatar.isWalking = true;
        } else {
          ai.avatar.isWalking = false;
          ai.state = 'admire';
          ai.timer = 0;

          // If reached cinema bench, sit down
          if (ai.currentWp === 4) {
            ai.avatar.setSitting(true);
            ai.avatar.group.rotation.y = Math.PI / 2;
          }
        }
      } else if (ai.state === 'admire') {
        if (ai.timer > 7.0) {
          if (ai.avatar.isSitting) {
            ai.avatar.setSitting(false);
          }
          ai.currentWp = (ai.currentWp + 1) % ai.waypoints.length;
          ai.state = 'walk';
          ai.timer = 0;
        }
      } else if (ai.state === 'look_centerpiece') {
        if (ai.timer > 5.0) {
          ai.state = 'walk';
          ai.currentWp = 1;
        }
      }

      ai.avatar.update(delta);
      this.updateNametagPos(ai.avatar, ai.nametagEl, camera);
    }
  }

  updateNametagPos(avatar, el, camera) {
    if (!el) return;
    const pos = new THREE.Vector3();
    avatar.group.getWorldPosition(pos);
    pos.y += 1.95; // above avatar head

    // Check if behind camera
    const screenPos = pos.clone().project(camera);
    if (screenPos.z > 1.0) {
      el.style.opacity = '0';
      return;
    }

    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.opacity = '1';
  }

  showSpeechBubble(avatar, text, sender, isEmote = false) {
    const bubble = document.createElement('div');
    bubble.className = 'player-bubble';
    bubble.textContent = isEmote ? text : text;
    if (isEmote) bubble.style.fontSize = '1.8rem';
    document.getElementById('nametag-layer').appendChild(bubble);

    const updatePos = () => {
      const pos = new THREE.Vector3();
      avatar.group.getWorldPosition(pos);
      pos.y += 2.05;
      const screenPos = pos.clone().project(this.museum.camera);
      if (screenPos.z > 1.0) {
        bubble.style.opacity = '0';
        return;
      }
      const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;
      bubble.style.left = `${x}px`;
      bubble.style.top = `${y}px`;
    };

    updatePos();
    const interval = setInterval(updatePos, 16);

    setTimeout(() => {
      clearInterval(interval);
      bubble.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      bubble.style.opacity = '0';
      bubble.style.transform = 'translate(-50%, -200%) scale(0.8)';
      setTimeout(() => bubble.remove(), 400);
    }, 4500);
  }
}

window.MultiplayerSystem = MultiplayerSystem;
