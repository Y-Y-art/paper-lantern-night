import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GameAudio } from './audio';
import { Effects } from './fx';
import { Input } from './input';
import { createPlayerLantern } from './objects';
import { createTextures } from './textures';
import { CHUNK_LEN, World } from './world';

type Mode = 'title' | 'playing' | 'paused' | 'crashed';

const BEST_KEY = 'pln-best';
const HIT_R = 0.48;

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private clock = new THREE.Clock();
  private input: Input;
  private audio = new GameAudio();
  private tex = createTextures();
  private world: World;
  private fx: Effects;
  private lantern: THREE.Group;
  private camTarget = new THREE.Vector3();
  private camPos = new THREE.Vector3(0, 4.2, -8);
  private look = new THREE.Vector3();

  private mode: Mode = 'title';
  private pos = new THREE.Vector3(0, 4.2, 0);
  private vel = new THREE.Vector3();
  private tilt = new THREE.Vector2();
  private speed = 11;
  private wind = new THREE.Vector2();
  private burstCd = 0;
  private elapsed = 0;
  private score = 0;
  private dist = 0;
  private wishes = 0;
  private bonus = 0;
  private best = Number(localStorage.getItem(BEST_KEY) || 0);
  private crashTapArmed = false;
  private launched = new Set<string>();
  private tmp = new THREE.Vector3();
  private moon: THREE.Sprite;
  private stars: THREE.Points;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.setClearColor(0x07141c, 1);

    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 180);
    this.camera.position.copy(this.camPos);

    this.scene.fog = new THREE.FogExp2(0x081820, 0.028);
    this.scene.background = new THREE.Color(0x07141c);

    const hemi = new THREE.HemisphereLight(0x6a8aaa, 0x2a120c, 0.55);
    this.scene.add(hemi);
    const moonLight = new THREE.DirectionalLight(0x88aacc, 0.35);
    moonLight.position.set(-20, 30, 10);
    this.scene.add(moonLight);
    const fill = new THREE.AmbientLight(0x1a2430, 0.25);
    this.scene.add(fill);

    this.world = new World(this.tex);
    this.scene.add(this.world.root);
    this.fx = new Effects(this.tex);
    this.scene.add(this.fx.root);

    this.lantern = createPlayerLantern(this.tex, this.world.mats);
    this.scene.add(this.lantern);

    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.tex.moon,
      transparent: true,
      depthWrite: false,
    }));
    this.moon.scale.set(18, 18, 1);
    this.scene.add(this.moon);

    this.stars = this.makeStars();
    this.scene.add(this.stars);

    // distant ridge silhouette
    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(80, 10, 4),
      new THREE.MeshBasicMaterial({ color: 0x050b10 }),
    );
    ridge.position.set(0, 2, 70);
    ridge.name = 'ridge';
    this.scene.add(ridge);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.7, 0.35);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.input = new Input(canvas);
    this.bindUi();
    window.addEventListener('resize', this.onResize);
    this.world.sync(0, 0);
    this.updateBestUi();
    this.loop();
  }

  private makeStars() {
    const n = 400;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 120;
      pos[i * 3 + 1] = 8 + Math.random() * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xcfe8ee, size: 0.12, transparent: true, opacity: 0.7 });
    return new THREE.Points(geo, mat);
  }

  private bindUi() {
    const $ = (id: string) => document.getElementById(id)!;
    $('btn-play').addEventListener('click', () => this.start());
    $('btn-retry').addEventListener('click', () => this.start());
    $('btn-resume').addEventListener('click', () => this.setPaused(false));
    $('btn-pause').addEventListener('click', () => this.setPaused(this.mode === 'playing'));
    $('btn-mute').addEventListener('click', () => this.toggleMute());
    $('crash').addEventListener('pointerdown', (e) => {
      if (this.mode !== 'crashed' || !this.crashTapArmed) return;
      if ((e.target as HTMLElement).closest('button')) return;
      this.start();
    });
  }

  private async start() {
    await this.audio.resume();
    this.mode = 'playing';
    this.elapsed = 0;
    this.score = 0;
    this.dist = 0;
    this.wishes = 0;
    this.bonus = 0;
    this.speed = 11.5;
    this.pos.set(0, 4.1, 2);
    this.vel.set(0, 0.4, this.speed);
    this.tilt.set(0, 0);
    this.burstCd = 0.35;
    this.launched.clear();
    this.input.burstQueued = false;
    this.crashTapArmed = false;
    this.lantern.rotation.set(0, 0, 0);
    this.fx.clear();
    this.world.reset();
    this.world.sync(this.pos.z, 0);
    document.getElementById('title')!.classList.add('hidden');
    document.getElementById('crash')!.classList.add('hidden');
    document.getElementById('pause')!.classList.add('hidden');
    document.getElementById('hud')!.classList.remove('hidden');
    this.hud();
  }

  private setPaused(p: boolean) {
    if (this.mode !== 'playing' && this.mode !== 'paused') return;
    this.mode = p ? 'paused' : 'playing';
    document.getElementById('pause')!.classList.toggle('hidden', !p);
    if (!p) this.clock.getDelta();
  }

  private toggleMute() {
    const muted = this.audio.toggleMute();
    document.getElementById('btn-mute')!.textContent = muted ? '静音' : '音响';
  }

  private crash() {
    if (this.mode !== 'playing') return;
    this.mode = 'crashed';
    this.audio.crash();
    this.fx.crash(this.pos);
    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem(BEST_KEY, String(this.best));
    }
    document.getElementById('hud')!.classList.add('hidden');
    document.getElementById('crash')!.classList.remove('hidden');
    this.crashTapArmed = false;
    window.setTimeout(() => { this.crashTapArmed = true; }, 400);
    document.getElementById('final-score')!.textContent = String(this.score);
    document.getElementById('final-best')!.textContent = String(this.best);
    this.updateBestUi();
  }

  private updateBestUi() {
    const line = document.getElementById('best-line')!;
    if (this.best > 0) {
      line.classList.remove('hidden');
      document.getElementById('best')!.textContent = String(this.best);
    }
  }

  private hud() {
    document.getElementById('score')!.textContent = String(this.score);
    document.getElementById('dist')!.textContent = String(Math.floor(this.dist));
    document.getElementById('wishes')!.textContent = String(this.wishes);
    const fill = document.getElementById('burst-fill')!;
    const k = 1 - Math.min(1, this.burstCd / 1.15);
    fill.style.transform = `scaleX(${k})`;
  }

  private onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
  };

  private loop = () => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.033, this.clock.getDelta());
    this.handleQueues();
    if (this.mode === 'paused') {
      this.composer.render();
      return;
    }
    this.update(dt);
    this.composer.render();
  };

  private handleQueues() {
    if (this.input.muteQueued) {
      this.input.muteQueued = false;
      this.toggleMute();
    }
    if (this.input.pauseQueued) {
      this.input.pauseQueued = false;
      if (this.mode === 'playing') this.setPaused(true);
      else if (this.mode === 'paused') this.setPaused(false);
    }
    if (this.input.restartQueued) {
      this.input.restartQueued = false;
      if (this.mode === 'crashed' || this.mode === 'playing') this.start();
    }
    if (this.mode === 'title' && this.input.burstQueued) {
      this.input.burstQueued = false;
      this.start();
    }
  }

  private update(dt: number) {
    const t = this.clock.elapsedTime;
    const difficulty = this.mode === 'playing' ? Math.min(1, this.elapsed / 75) : 0.15;

    if (this.mode === 'title') {
      this.pos.x = Math.sin(t * 0.35) * 1.2;
      this.pos.y = 4.1 + Math.sin(t * 0.8) * 0.25;
      this.pos.z = (this.pos.z + dt * 4) % (CHUNK_LEN * 8);
      this.world.sync(this.pos.z, 0.1);
      this.world.update(t);
      this.world.nearestLights(this.pos, 5);
      this.fx.update(dt, this.pos.z);
      this.animateLantern(t, dt, 0.2, 0);
      this.cameraWork(dt, true);
      this.placeSky();
      return;
    }

    if (this.mode === 'crashed') {
      this.vel.y -= 6 * dt;
      this.pos.addScaledVector(this.vel, dt);
      this.lantern.position.copy(this.pos);
      this.lantern.rotation.z += dt * 1.8;
      this.lantern.rotation.x += dt * 0.6;
      this.fx.update(dt, this.pos.z);
      this.cameraWork(dt, false);
      this.placeSky();
      return;
    }

    this.elapsed += dt;
    this.speed = 11.5 + difficulty * 10;
    this.wind.x = Math.sin(t * 0.42) * (0.4 + difficulty * 1.8) + Math.sin(t * 1.7) * 0.25;
    this.wind.y = Math.sin(t * 0.31 + 1.2) * (0.15 + difficulty * 0.7);
    this.audio.setWind(difficulty);

    const inp = this.input.sample();
    this.tilt.x = THREE.MathUtils.lerp(this.tilt.x, inp.x, 1 - Math.pow(0.001, dt));
    this.tilt.y = THREE.MathUtils.lerp(this.tilt.y, inp.y, 1 - Math.pow(0.001, dt));

    this.burstCd = Math.max(0, this.burstCd - dt);
    if (this.input.burstQueued) {
      this.input.burstQueued = false;
      if (this.burstCd <= 0) {
        this.vel.y += 6.2;
        this.burstCd = 1.15;
        this.audio.burst();
        this.fx.burstLift(this.pos);
      }
    }

    this.vel.x += this.tilt.x * 18 * dt + this.wind.x * dt * 3.2;
    this.vel.y += this.tilt.y * 12 * dt + this.wind.y * dt * 2.2 - 0.55 * dt;
    this.vel.x *= Math.pow(0.08, dt);
    this.vel.y *= Math.pow(0.12, dt);
    this.vel.z = this.speed;
    this.pos.addScaledVector(this.vel, dt);

    this.pos.x = THREE.MathUtils.clamp(this.pos.x, -5.35, 5.35);
    this.pos.y = THREE.MathUtils.clamp(this.pos.y, 1.15, 9.2);

    this.dist = this.pos.z;
    this.score = Math.floor(this.dist * 1.2) + this.wishes * 50 + this.bonus;

    this.world.sync(this.pos.z, difficulty);
    this.world.update(t);
    this.maybeFireworks();
    this.fx.update(dt, this.pos.z);
    this.collide();
    this.animateLantern(t, dt, this.tilt.x, this.tilt.y);
    this.cameraWork(dt, false);
    this.placeSky();
    this.hud();

    this.world.nearestLights(this.pos, 5);

    if (this.pos.y <= 1.18) this.crash();
  }

  private maybeFireworks() {
    for (const f of this.world.pendingFireworks(this.pos.z)) {
      const key = `${f.x.toFixed(1)}:${f.z.toFixed(1)}`;
      if (this.launched.has(key)) continue;
      if (f.z - this.pos.z < 22 && f.z > this.pos.z - 2) {
        this.launched.add(key);
        f.fuse = 1;
        this.fx.launchFirework(f.x, f.z, 0.05 + Math.random() * 0.4);
        this.audio.firework();
      }
    }
  }

  private collide() {
    const colliders = this.world.allColliders().concat(this.fx.colliders());
    for (const c of colliders) {
      if (c.kind === 'collect') {
        if (c.taken || !c.center) continue;
        if (this.pos.distanceTo(c.center) < (c.radius || 0.7) + HIT_R) {
          c.taken = true;
          if (c.mesh) {
            c.mesh.visible = false;
            c.mesh.userData.dead = true;
          }
          this.wishes += 1;
          this.score += 50;
          this.audio.collect();
          this.fx.collect(c.center);
        }
        continue;
      }
      if (c.kind === 'gate') {
        if (!c.scored && this.pos.z > (c.min.z + c.max.z) * 0.5 && this.pos.z < c.max.z + 2) {
          if (this.pos.x > c.min.x && this.pos.x < c.max.x && this.pos.y > c.min.y && this.pos.y < c.max.y) {
            c.scored = true;
            const edge = Math.min(this.pos.x - c.min.x, c.max.x - this.pos.x, this.pos.y - c.min.y, c.max.y - this.pos.y);
            if (edge < 0.85) {
              this.bonus += 80;
              this.audio.gate();
            } else {
              this.bonus += 20;
            }
          }
        }
        continue;
      }
      if (c.kind === 'firework' && c.center) {
        if (this.pos.distanceTo(c.center) < (c.radius || 2) + HIT_R) {
          this.crash();
          return;
        }
        continue;
      }
      if (c.kind === 'solid') {
        if (this.aabbHit(c.min, c.max)) {
          this.crash();
          return;
        }
      }
    }
  }

  private aabbHit(min: THREE.Vector3, max: THREE.Vector3) {
    return (
      this.pos.x + HIT_R > min.x &&
      this.pos.x - HIT_R < max.x &&
      this.pos.y + HIT_R > min.y &&
      this.pos.y - HIT_R < max.y &&
      this.pos.z + HIT_R > min.z &&
      this.pos.z - HIT_R < max.z
    );
  }

  private animateLantern(t: number, dt: number, tx: number, ty: number) {
    this.lantern.position.copy(this.pos);
    this.lantern.rotation.z = THREE.MathUtils.lerp(this.lantern.rotation.z, -tx * 0.45, 1 - Math.pow(0.02, dt));
    this.lantern.rotation.x = THREE.MathUtils.lerp(this.lantern.rotation.x, ty * 0.28, 1 - Math.pow(0.02, dt));
    this.lantern.position.y += Math.sin(t * 3.2) * 0.015;
    const flame = this.lantern.getObjectByName('flame');
    if (flame) {
      const s = 0.9 + Math.sin(t * 18) * 0.12;
      flame.scale.set(s, 1.1 + Math.sin(t * 22) * 0.15, s);
    }
    const halo = this.lantern.getObjectByName('halo') as THREE.Sprite | undefined;
    if (halo) halo.material.opacity = 0.7 + Math.sin(t * 6) * 0.12;
  }

  private cameraWork(dt: number, cinematic: boolean) {
    const back = cinematic ? 7.4 : 6.6;
    const up = cinematic ? 2.6 : 2.35;
    this.camTarget.set(this.pos.x * 0.7, this.pos.y + up, this.pos.z - back);
    this.camPos.lerp(this.camTarget, 1 - Math.pow(0.012, dt));
    this.camera.position.copy(this.camPos);
    this.look.set(this.pos.x, this.pos.y + 0.35, this.pos.z + 6);
    this.camera.lookAt(this.look);
    this.camera.rotation.z = -this.tilt.x * 0.08;
  }

  private placeSky() {
    this.moon.position.set(this.pos.x - 18, 22, this.pos.z + 42);
    this.stars.position.set(this.pos.x, 0, this.pos.z);
    const ridge = this.scene.getObjectByName('ridge');
    if (ridge) ridge.position.set(this.pos.x, 1.5, this.pos.z + 78);
  }
}
