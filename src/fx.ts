import * as THREE from 'three';
import type { TextureKit } from './textures';
import type { Collider } from './objects';

interface Particle {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  life: number;
  max: number;
  drag: number;
}

export class Effects {
  readonly root = new THREE.Group();
  readonly fireworks: Firework[] = [];
  private pool: Particle[] = [];
  private live: Particle[] = [];
  private sparkMat: THREE.SpriteMaterial;
  private glowMat: THREE.SpriteMaterial;
  private glowRed: THREE.SpriteMaterial;
  private bokeh: THREE.Sprite[] = [];
  readonly flash = new THREE.PointLight(0xffaa66, 0, 18, 2);

  constructor(tex: TextureKit) {
    this.sparkMat = new THREE.SpriteMaterial({
      map: tex.spark,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    this.glowMat = new THREE.SpriteMaterial({
      map: tex.glow,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    this.glowRed = new THREE.SpriteMaterial({
      map: tex.glowRed,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    this.root.add(this.flash);
    for (let i = 0; i < 160; i++) {
      const sprite = new THREE.Sprite(this.sparkMat.clone());
      sprite.visible = false;
      sprite.scale.setScalar(0.25);
      this.root.add(sprite);
      this.pool.push({ sprite, vel: new THREE.Vector3(), life: 0, max: 1, drag: 0.98 });
    }
    for (let i = 0; i < 24; i++) {
      const mat = (i % 3 === 0 ? this.glowRed : this.glowMat).clone();
      const s = new THREE.Sprite(mat);
      s.scale.setScalar(0.8 + Math.random() * 1.6);
      s.position.set((Math.random() - 0.5) * 18, 2 + Math.random() * 8, Math.random() * 80);
      s.material.opacity = 0.35;
      this.bokeh.push(s);
      this.root.add(s);
    }
  }

  emit(pos: THREE.Vector3, n: number, color: number, speed: number, life: number, size = 0.28) {
    for (let i = 0; i < n; i++) {
      const p = this.pool.pop();
      if (!p) break;
      p.sprite.material.color.setHex(color);
      p.sprite.material.opacity = 1;
      p.sprite.visible = true;
      p.sprite.position.copy(pos);
      p.sprite.scale.setScalar(size);
      p.vel.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random()));
      p.life = life * (0.6 + Math.random() * 0.4);
      p.max = p.life;
      p.drag = 0.96;
      this.live.push(p);
    }
  }

  collect(pos: THREE.Vector3) {
    this.emit(pos, 18, 0xffe08a, 3.2, 0.55, 0.22);
  }

  burstLift(pos: THREE.Vector3) {
    this.emit(pos, 10, 0xff9a40, 1.6, 0.35, 0.2);
  }

  crash(pos: THREE.Vector3) {
    this.emit(pos, 40, 0xff7040, 4.5, 0.9, 0.32);
    this.flash.position.copy(pos);
    this.flash.intensity = 8;
  }

  launchFirework(x: number, z: number, delay: number) {
    const fw = new Firework(x, z, delay, this.glowMat, this.sparkMat);
    this.fireworks.push(fw);
    this.root.add(fw.root);
    return fw;
  }

  clear() {
    for (const f of this.fireworks) this.root.remove(f.root);
    this.fireworks.length = 0;
    for (const p of this.live) {
      p.sprite.visible = false;
      this.pool.push(p);
    }
    this.live.length = 0;
    this.flash.intensity = 0;
  }

  colliders(): Collider[] {
    const list: Collider[] = [];
    for (const f of this.fireworks) {
      if (f.hurt) list.push(f.collider);
    }
    return list;
  }

  update(dt: number, playerZ: number) {
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 10);

    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.life -= dt;
      p.vel.y -= 2.2 * dt;
      p.vel.multiplyScalar(p.drag);
      p.sprite.position.addScaledVector(p.vel, dt);
      const k = Math.max(0, p.life / p.max);
      p.sprite.material.opacity = k;
      p.sprite.scale.setScalar(0.12 + k * 0.22);
      if (p.life <= 0) {
        p.sprite.visible = false;
        this.pool.push(p);
        this.live.splice(i, 1);
      }
    }

    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const f = this.fireworks[i];
      f.update(dt);
      if (f.done) {
        this.root.remove(f.root);
        this.fireworks.splice(i, 1);
      }
    }

    for (let i = 0; i < this.bokeh.length; i++) {
      const b = this.bokeh[i];
      if (b.position.z < playerZ - 8) b.position.z = playerZ + 40 + Math.random() * 40;
      b.position.x = Math.sin(playerZ * 0.02 + i) * 7 + (i % 5) - 2;
      b.material.opacity = 0.22 + Math.sin(playerZ * 0.1 + i) * 0.08;
    }
  }
}

export class Firework {
  root = new THREE.Group();
  collider: Collider;
  hurt = false;
  done = false;
  private phase: 'wait' | 'up' | 'boom' | 'fade' = 'wait';
  private t = 0;
  private wait: number;
  private spark: THREE.Sprite;
  private burst: THREE.Sprite[] = [];
  private vel = new THREE.Vector3(0, 11, 0);
  private light: THREE.PointLight;
  private hue: number;

  constructor(x: number, z: number, wait: number, glow: THREE.SpriteMaterial, sparkMat: THREE.SpriteMaterial) {
    this.wait = wait;
    this.hue = Math.random();
    this.spark = new THREE.Sprite(sparkMat.clone());
    this.spark.scale.setScalar(0.35);
    this.root.add(this.spark);
    this.root.position.set(x, 0.4, z);
    this.light = new THREE.PointLight(0xff8844, 0, 12, 2);
    this.root.add(this.light);
    this.collider = {
      kind: 'firework',
      min: new THREE.Vector3(),
      max: new THREE.Vector3(),
      center: this.root.position.clone(),
      radius: 2.3,
    };
    for (let i = 0; i < 28; i++) {
      const s = new THREE.Sprite(glow.clone());
      s.visible = false;
      s.scale.setScalar(0.45);
      this.root.add(s);
      this.burst.push(s);
    }
  }

  update(dt: number) {
    this.t += dt;
    if (this.phase === 'wait') {
      this.spark.visible = false;
      if (this.t >= this.wait) {
        this.phase = 'up';
        this.t = 0;
        this.spark.visible = true;
      }
      return;
    }
    if (this.phase === 'up') {
      this.root.position.y += this.vel.y * dt;
      this.vel.y -= 6 * dt;
      this.light.intensity = 1.8;
      this.spark.material.opacity = 1;
      if (this.vel.y < 1.5 || this.root.position.y > 7.4) {
        this.phase = 'boom';
        this.t = 0;
        this.hurt = true;
        this.collider.center = this.root.position.clone();
        const col = new THREE.Color().setHSL(this.hue, 0.75, 0.6);
        this.light.color.copy(col);
        this.light.intensity = 10;
        for (const s of this.burst) {
          s.visible = true;
          s.material.color.copy(col);
          s.userData.v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
            .normalize()
            .multiplyScalar(3 + Math.random() * 4);
          s.position.set(0, 0, 0);
        }
      }
      return;
    }
    if (this.phase === 'boom' || this.phase === 'fade') {
      const k = Math.max(0, 1 - this.t / 0.85);
      this.light.intensity = 8 * k;
      this.hurt = this.t < 0.55;
      this.collider.center = this.root.position.clone();
      this.collider.radius = 2.1 + this.t * 1.4;
      this.spark.visible = false;
      for (const s of this.burst) {
        const v = s.userData.v as THREE.Vector3;
        v.y -= 3.5 * dt;
        s.position.addScaledVector(v, dt);
        s.material.opacity = k;
        s.scale.setScalar(0.25 + k * 0.4);
      }
      if (this.t > 0.9) this.done = true;
    }
  }
}
