import * as THREE from 'three';
import type { TextureKit } from './textures';
import {
  createHangingSign,
  createMaterials,
  createPaifang,
  createStall,
  createStreamers,
  createWish,
  createWire,
  type Collider,
  type MatKit,
} from './objects';

export const CHUNK_LEN = 38;

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Chunk {
  index: number;
  z0: number;
  group: THREE.Group;
  colliders: Collider[];
  lights: THREE.PointLight[];
  streamers: THREE.Group[];
  wishes: THREE.Group[];
  fireworks: { x: number; z: number; fuse: number }[];
}

export class World {
  readonly root = new THREE.Group();
  readonly mats: MatKit;
  private chunks = new Map<number, Chunk>();
  private streetGeo: THREE.BoxGeometry;
  private streetMat: THREE.MeshStandardMaterial;

  constructor(private tex: TextureKit) {
    this.mats = createMaterials(tex);
    this.streetGeo = new THREE.BoxGeometry(16, 0.2, CHUNK_LEN);
    this.streetMat = this.mats.cobble;
    this.tex.cobble.repeat.set(3, 5);
  }

  reset() {
    for (const ch of this.chunks.values()) this.root.remove(ch.group);
    this.chunks.clear();
  }

  sync(playerZ: number, difficulty: number) {
    const center = Math.floor(playerZ / CHUNK_LEN);
    const keep = new Set<number>();
    for (let i = center - 1; i <= center + 3; i++) {
      keep.add(i);
      if (!this.chunks.has(i)) this.spawn(i, difficulty);
    }
    for (const [idx, ch] of this.chunks) {
      if (!keep.has(idx)) {
        this.root.remove(ch.group);
        this.chunks.delete(idx);
      }
    }
  }

  allColliders(): Collider[] {
    const list: Collider[] = [];
    for (const ch of this.chunks.values()) list.push(...ch.colliders);
    return list;
  }

  pendingFireworks(z: number): Chunk['fireworks'] {
    const out: Chunk['fireworks'] = [];
    for (const ch of this.chunks.values()) {
      for (const f of ch.fireworks) {
        if (!f.fuse && Math.abs(f.z - z) < 28) out.push(f);
      }
    }
    return out;
  }

  update(t: number) {
    for (const ch of this.chunks.values()) {
      for (const s of ch.streamers) {
        s.rotation.z = Math.sin(t * 1.6 + s.userData.sway) * 0.18;
        for (const c of s.children) {
          c.rotation.z = Math.sin(t * 2.2 + (c.userData.phase || 0)) * 0.12;
        }
      }
      for (const w of ch.wishes) {
        if (w.userData.dead) continue;
        w.rotation.y = t * 0.6 + w.userData.bob;
        w.position.y += Math.sin(t * 2 + w.userData.bob) * 0.004;
      }
    }
  }

  nearestLights(pos: THREE.Vector3, n = 5): THREE.PointLight[] {
    const lights: THREE.PointLight[] = [];
    for (const ch of this.chunks.values()) lights.push(...ch.lights);
    lights.sort((a, b) => a.position.distanceToSquared(pos) - b.position.distanceToSquared(pos));
    lights.forEach((l, i) => {
      const on = i < n;
      l.visible = on;
      l.intensity = on ? Math.max(0.8, 2.6 - i * 0.22) : 0;
    });
    return lights.slice(0, n);
  }

  private spawn(index: number, difficulty: number) {
    const rng = mulberry32((index + 17) * 977);
    const z0 = index * CHUNK_LEN;
    const group = new THREE.Group();
    const colliders: Collider[] = [];
    const lights: THREE.PointLight[] = [];
    const streamers: THREE.Group[] = [];
    const wishes: THREE.Group[] = [];
    const fireworks: Chunk['fireworks'] = [];

    const street = new THREE.Mesh(this.streetGeo, this.streetMat);
    street.position.set(0, -0.1, z0 + CHUNK_LEN / 2);
    group.add(street);

    // side curbs
    for (const side of [-1, 1] as const) {
      const curb = new THREE.Mesh(this.streetGeo, this.mats.wood);
      curb.scale.set(0.12, 1.6, 1);
      curb.position.set(side * 5.9, 0.12, z0 + CHUNK_LEN / 2);
      group.add(curb);
    }

    const stallCount = 2;
    for (let i = 0; i < stallCount; i++) {
      const zz = z0 + 8 + i * 16 + rng() * 3;
      for (const side of [-1, 1] as const) {
        const s = createStall(rng, side, zz, this.tex, this.mats);
        group.add(s.group);
        colliders.push(...s.colliders);
        lights.push(s.light);
      }
    }

    const hasGate = index === 0 || index % 2 === 0 || rng() < 0.5;
    if (hasGate) {
      const gz = z0 + 4 + rng() * 6;
      const p = createPaifang(gz, this.tex, this.mats, rng);
      group.add(p.group);
      colliders.push(...p.colliders);
    }

    group.add(createWire(z0 + 18, this.mats));
    group.add(createWire(z0 + 32, this.mats));

    const signN = index === 0 ? 0 : 1 + Math.floor(difficulty * 2.5 + rng() * 2);
    for (let i = 0; i < signN; i++) {
      const x = (rng() - 0.5) * 7.2;
      const y = 2.6 + rng() * 4.2;
      const z = z0 + 10 + rng() * (CHUNK_LEN - 14);
      const s = createHangingSign(x, y, z, this.tex, this.mats, rng);
      group.add(s.group);
      colliders.push(s.collider);
    }

    const streamN = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < streamN; i++) {
      const st = createStreamers((rng() - 0.5) * 6, 8.2, z0 + 8 + rng() * 24, this.mats, rng);
      group.add(st);
      streamers.push(st);
    }

    const wishN = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < wishN; i++) {
      const x = (rng() - 0.5) * 6.4;
      const y = 2.4 + rng() * 4.6;
      const z = z0 + 6 + rng() * (CHUNK_LEN - 10);
      const w = createWish(x, y, z, this.tex);
      group.add(w.group);
      wishes.push(w.group);
      colliders.push(w.collider);
    }

    if (index > 1 && rng() < 0.35 + difficulty * 0.5) {
      const fn = 1 + Math.floor(rng() * (1 + difficulty * 2));
      for (let i = 0; i < fn; i++) {
        fireworks.push({
          x: (rng() - 0.5) * 6,
          z: z0 + 12 + rng() * 20,
          fuse: 0,
        });
      }
    }

    // decorative distant hanging globes along eaves
    for (let i = 0; i < 4; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 10, 8),
        this.mats.paper,
      );
      globe.position.set(side * 5.4, 4.6 + rng() * 0.6, z0 + 6 + i * 8);
      group.add(globe);
    }

    // festival string lights across the street (pass-through)
    for (let k = 0; k < 2; k++) {
      const zz = z0 + 14 + k * 16;
      for (let i = 0; i < 9; i++) {
        const globe = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 8, 6),
          i % 2 ? this.mats.paper : this.mats.crimson,
        );
        globe.position.set(-5.2 + i * 1.3, 7.7 + Math.sin(i + index) * 0.15, zz);
        group.add(globe);
      }
    }

    this.root.add(group);
    this.chunks.set(index, { index, z0, group, colliders, lights, streamers, wishes, fireworks });
  }
}
