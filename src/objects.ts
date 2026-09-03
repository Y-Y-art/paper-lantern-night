import * as THREE from 'three';
import type { TextureKit } from './textures';

export interface Collider {
  kind: 'solid' | 'collect' | 'gate' | 'firework';
  min: THREE.Vector3;
  max: THREE.Vector3;
  radius?: number;
  center?: THREE.Vector3;
  mesh?: THREE.Object3D;
  taken?: boolean;
  scored?: boolean;
}

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const sphereGeo = new THREE.SphereGeometry(1, 12, 10);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
const planeGeo = new THREE.PlaneGeometry(1, 1);
const coneGeo = new THREE.ConeGeometry(1, 1, 6);

function mesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  sx: number,
  sy: number,
  sz: number,
  x: number,
  y: number,
  z: number,
) {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

export function createMaterials(tex: TextureKit) {
  const paper = new THREE.MeshStandardMaterial({
    map: tex.lantern,
    color: 0xffd9a0,
    emissive: 0xff9a3c,
    emissiveIntensity: 0.55,
    roughness: 0.86,
    metalness: 0.02,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });
  const inner = new THREE.MeshBasicMaterial({
    color: 0xffc878,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  const bamboo = new THREE.MeshStandardMaterial({
    color: 0x6a4424,
    roughness: 0.7,
    map: tex.wood,
  });
  const crimson = new THREE.MeshStandardMaterial({
    color: 0x9e1c22,
    roughness: 0.55,
    metalness: 0.08,
    map: tex.paper,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xe0b24a,
    roughness: 0.35,
    metalness: 0.55,
    emissive: 0x3a2808,
    emissiveIntensity: 0.4,
  });
  const wood = new THREE.MeshStandardMaterial({
    map: tex.wood,
    roughness: 0.8,
    color: 0x8a5a32,
  });
  const roof = new THREE.MeshStandardMaterial({
    map: tex.tile,
    color: 0x3a2420,
    roughness: 0.9,
  });
  const cobble = new THREE.MeshStandardMaterial({
    map: tex.cobble,
    color: 0x8a9098,
    roughness: 0.95,
  });
  cobble.map!.repeat.set(4, 6);
  const facade = new THREE.MeshStandardMaterial({
    map: tex.facade,
    color: 0x6a5a58,
    roughness: 0.9,
    emissive: 0x221008,
    emissiveIntensity: 0.25,
  });
  const tassel = new THREE.MeshStandardMaterial({
    color: 0xc43b3b,
    roughness: 0.6,
  });
  const flame = new THREE.MeshBasicMaterial({
    color: 0xffe6a0,
    transparent: true,
    opacity: 0.95,
  });
  return { paper, inner, bamboo, crimson, gold, wood, roof, cobble, facade, tassel, flame };
}

export type MatKit = ReturnType<typeof createMaterials>;

export function createPlayerLantern(tex: TextureKit, mats: MatKit): THREE.Group {
  const g = new THREE.Group();
  g.name = 'lantern';

  const w = 0.74;
  const h = 1.08;
  const d = 0.74;

  const body = new THREE.Group();
  const sides: [number, number, number, number, number, number][] = [
    [w, h, 0.012, 0, h / 2, d / 2],
    [w, h, 0.012, 0, h / 2, -d / 2],
    [0.012, h, d, w / 2, h / 2, 0],
    [0.012, h, d, -w / 2, h / 2, 0],
  ];
  for (const s of sides) {
    const p = mesh(boxGeo, mats.paper, s[0], s[1], s[2], s[3], s[4], s[5]);
    body.add(p);
  }
  const top = mesh(boxGeo, mats.paper, w * 1.02, 0.04, d * 1.02, 0, h + 0.02, 0);
  body.add(top);
  const cap = mesh(coneGeo, mats.crimson, 0.18, 0.16, 0.18, 0, h + 0.12, 0);
  body.add(cap);

  const glow = mesh(boxGeo, mats.inner, w * 0.86, h * 0.86, d * 0.86, 0, h / 2, 0);
  body.add(glow);

  const addEdge = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
    const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
    const len = Math.hypot(dx, dy, dz);
    const c = mesh(cylGeo, mats.bamboo, 0.018, len, 0.018, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
    body.add(c);
  };
  const xs = [-w / 2, w / 2];
  const zs = [-d / 2, d / 2];
  for (const x of xs) for (const z of zs) addEdge(x, 0.02, z, x, h, z);
  for (const y of [0.02, h]) {
    addEdge(-w / 2, y, -d / 2, w / 2, y, -d / 2);
    addEdge(-w / 2, y, d / 2, w / 2, y, d / 2);
    addEdge(-w / 2, y, -d / 2, -w / 2, y, d / 2);
    addEdge(w / 2, y, -d / 2, w / 2, y, d / 2);
  }

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 8, 16), mats.bamboo);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.02;
  body.add(rim);

  const flame = mesh(sphereGeo, mats.flame, 0.09, 0.14, 0.09, 0, 0.22, 0);
  flame.name = 'flame';
  body.add(flame);

  const spriteMat = new THREE.SpriteMaterial({
    map: tex.glow,
    color: 0xffc878,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(1.8, 1.8, 1);
  sprite.position.set(0, 0.5, 0);
  sprite.name = 'halo';
  body.add(sprite);

  const tasselRoot = new THREE.Group();
  tasselRoot.position.y = -0.02;
  const knot = mesh(sphereGeo, mats.gold, 0.06, 0.05, 0.06, 0, 0, 0);
  tasselRoot.add(knot);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const strand = mesh(
      cylGeo,
      i % 2 ? mats.gold : mats.tassel,
      0.012,
      0.38 + (i % 3) * 0.08,
      0.012,
      Math.cos(a) * 0.05,
      -0.22,
      Math.sin(a) * 0.05,
    );
    tasselRoot.add(strand);
  }
  body.add(tasselRoot);

  const light = new THREE.PointLight(0xffb45a, 4.2, 16, 1.6);
  light.position.set(0, 0.45, 0);
  body.add(light);

  body.position.y = -0.2;
  g.add(body);
  return g;
}

export function createStall(
  rng: () => number,
  side: -1 | 1,
  z: number,
  tex: TextureKit,
  mats: MatKit,
): { group: THREE.Group; colliders: Collider[]; light: THREE.PointLight } {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const xWall = side * 8.4;
  const stallX = side * 6.55;
  const width = 3.4 + rng() * 0.6;
  const depth = 4.6 + rng() * 1.4;
  const roofH = 3.15 + rng() * 0.45;

  const facade = mesh(boxGeo, mats.facade, 3.2, 7.2, depth + 0.4, xWall, 3.4, z);
  group.add(facade);

  const counter = mesh(boxGeo, mats.wood, 1.8, 1.05, depth * 0.85, stallX, 0.55, z);
  group.add(counter);

  const postGeoH = roofH;
  for (const dz of [-depth * 0.38, depth * 0.38]) {
    const post = mesh(cylGeo, mats.wood, 0.08, postGeoH, 0.08, stallX - side * 0.7, postGeoH / 2, z + dz);
    group.add(post);
  }

  const awningMat = new THREE.MeshStandardMaterial({
    map: tex.awnings[Math.floor(rng() * tex.awnings.length)],
    roughness: 0.78,
    side: THREE.DoubleSide,
  });
  const awning = mesh(boxGeo, awningMat, 2.4, 0.06, depth * 0.92, stallX - side * 0.15, roofH - 0.35, z);
  awning.rotation.z = side * 0.18;
  group.add(awning);

  const roof = mesh(boxGeo, mats.roof, 3.6, 0.28, depth + 0.5, stallX + side * 0.4, roofH + 0.2, z);
  roof.rotation.z = side * -0.12;
  group.add(roof);

  const ridge = mesh(boxGeo, mats.gold, 0.12, 0.12, depth + 0.2, stallX + side * 0.9, roofH + 0.42, z);
  group.add(ridge);

  // hanging shop lanterns
  const lanternCount = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < lanternCount; i++) {
    const lz = z - depth * 0.3 + i * (depth * 0.35);
    const ly = roofH - 0.9 - rng() * 0.3;
    const lx = stallX - side * 0.35;
    const bulb = mesh(sphereGeo, mats.paper, 0.18, 0.22, 0.18, lx, ly, lz);
    group.add(bulb);
    const cap = mesh(cylGeo, mats.crimson, 0.08, 0.06, 0.08, lx, ly + 0.22, lz);
    group.add(cap);
  }

  // hanging goods
  const goods = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < goods; i++) {
    const gz = z + (rng() - 0.5) * depth * 0.6;
    const gy = 1.4 + rng() * 1.1;
    const gx = stallX - side * (0.1 + rng() * 0.4);
    const kind = rng();
    if (kind < 0.4) {
      group.add(mesh(sphereGeo, mats.crimson, 0.12, 0.16, 0.12, gx, gy, gz));
    } else if (kind < 0.75) {
      const m = mesh(boxGeo, mats.gold, 0.18, 0.28, 0.06, gx, gy, gz);
      group.add(m);
    } else {
      group.add(mesh(cylGeo, mats.wood, 0.07, 0.32, 0.07, gx, gy, gz));
    }
  }

  const light = new THREE.PointLight(0xffb060, 2.4, 11, 1.8);
  light.position.set(stallX - side * 0.2, roofH - 0.7, z);
  group.add(light);

  // roof / stall solid
  colliders.push({
    kind: 'solid',
    min: new THREE.Vector3(stallX - 1.35, 0, z - depth / 2 - 0.15),
    max: new THREE.Vector3(stallX + 1.35, roofH + 0.35, z + depth / 2 + 0.15),
  });
  // building wall
  colliders.push({
    kind: 'solid',
    min: new THREE.Vector3(xWall - 1.7, 0, z - depth / 2 - 0.4),
    max: new THREE.Vector3(xWall + 1.7, 7.4, z + depth / 2 + 0.4),
  });

  return { group, colliders, light };
}

export function createPaifang(
  z: number,
  tex: TextureKit,
  mats: MatKit,
  rng: () => number,
): { group: THREE.Group; colliders: Collider[] } {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const innerW = 3.55;
  const pillarW = 0.55;
  const lintelY = 6.55;
  const plaque = ['灯火万家', '夜市', '太平盛世'][Math.floor(rng() * 3)];

  for (const side of [-1, 1]) {
    const px = side * (innerW + pillarW * 0.5);
    const pillar = mesh(boxGeo, mats.crimson, pillarW, lintelY, 0.55, px, lintelY / 2, z);
    group.add(pillar);
    const base = mesh(boxGeo, mats.gold, 0.85, 0.28, 0.8, px, 0.14, z);
    group.add(base);
    const cap = mesh(boxGeo, mats.gold, 0.72, 0.18, 0.68, px, lintelY + 0.1, z);
    group.add(cap);
    colliders.push({
      kind: 'solid',
      min: new THREE.Vector3(px - pillarW * 0.7, 0, z - 0.45),
      max: new THREE.Vector3(px + pillarW * 0.7, lintelY + 0.3, z + 0.45),
    });
  }

  const beam = mesh(boxGeo, mats.crimson, innerW * 2 + 1.6, 0.55, 0.5, 0, lintelY + 0.15, z);
  group.add(beam);
  const beamGold = mesh(boxGeo, mats.gold, innerW * 2 + 1.8, 0.12, 0.58, 0, lintelY + 0.48, z);
  group.add(beamGold);

  const board = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({
    color: 0x6a1518,
    roughness: 0.55,
    emissive: 0x2a0808,
    emissiveIntensity: 0.3,
  }));
  board.scale.set(3.2, 0.7, 0.12);
  board.position.set(0, lintelY + 0.15, z + 0.32);
  group.add(board);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#6a1518';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#f0c66a';
  ctx.font = '700 64px "PingFang SC","Noto Sans SC","Microsoft YaHei",serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(plaque, 256, 70);
  const ctex = new THREE.CanvasTexture(canvas);
  ctex.colorSpace = THREE.SRGBColorSpace;
  const plaqueMesh = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ map: ctex, transparent: true }));
  plaqueMesh.scale.set(3.0, 0.62, 1);
  plaqueMesh.position.set(0, lintelY + 0.15, z + 0.39);
  group.add(plaqueMesh);

  // flying eaves
  const roof = mesh(boxGeo, mats.roof, innerW * 2 + 3.2, 0.22, 1.6, 0, lintelY + 0.95, z);
  group.add(roof);
  for (const s of [-1, 1]) {
    const eave = mesh(boxGeo, mats.roof, 1.6, 0.1, 0.7, s * (innerW + 1.5), lintelY + 0.82, z);
    eave.rotation.z = s * 0.35;
    group.add(eave);
  }
  const ridge = mesh(boxGeo, mats.gold, innerW * 2 + 2.4, 0.1, 0.16, 0, lintelY + 1.12, z);
  group.add(ridge);

  colliders.push({
    kind: 'solid',
    min: new THREE.Vector3(-innerW - 1.8, lintelY - 0.15, z - 0.7),
    max: new THREE.Vector3(innerW + 1.8, lintelY + 1.4, z + 0.7),
  });
  colliders.push({
    kind: 'gate',
    min: new THREE.Vector3(-innerW, 0.4, z - 0.5),
    max: new THREE.Vector3(innerW, lintelY - 0.2, z + 0.5),
    scored: false,
  });

  return { group, colliders };
}

export function createHangingSign(
  x: number,
  y: number,
  z: number,
  tex: TextureKit,
  mats: MatKit,
  rng: () => number,
): { group: THREE.Group; collider: Collider } {
  const group = new THREE.Group();
  const signMap = tex.signs[Math.floor(rng() * tex.signs.length)];
  const mat = new THREE.MeshStandardMaterial({
    map: signMap,
    roughness: 0.55,
    metalness: 0.05,
    emissive: 0x220808,
    emissiveIntensity: 0.2,
  });
  const w = 0.62;
  const h = 1.15;
  const board = mesh(boxGeo, mat, w, h, 0.07, x, y, z);
  group.add(board);
  const rail = mesh(boxGeo, mats.wood, 0.7, 0.06, 0.08, x, y + h / 2 + 0.06, z);
  group.add(rail);
  const rope = mesh(cylGeo, mats.wood, 0.012, 1.4, 0.012, x, y + h / 2 + 0.75, z);
  group.add(rope);
  return {
    group,
    collider: {
      kind: 'solid',
      min: new THREE.Vector3(x - w / 2 - 0.05, y - h / 2 - 0.05, z - 0.12),
      max: new THREE.Vector3(x + w / 2 + 0.05, y + h / 2 + 0.1, z + 0.12),
    },
  };
}

export function createStreamers(x: number, y: number, z: number, mats: MatKit, rng: () => number): THREE.Group {
  const group = new THREE.Group();
  group.userData.sway = rng() * Math.PI * 2;
  const n = 5 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const s = mesh(
      boxGeo,
      mats.tassel,
      0.06 + rng() * 0.04,
      1.6 + rng() * 1.4,
      0.01,
      x + (i - n / 2) * 0.12,
      y - 0.8,
      z,
    );
    s.userData.phase = rng() * 6;
    group.add(s);
  }
  return group;
}

export function createWish(x: number, y: number, z: number, tex: TextureKit): { group: THREE.Group; collider: Collider } {
  const group = new THREE.Group();
  const map = tex.wishes[Math.floor(Math.random() * tex.wishes.length)];
  const mat = new THREE.MeshStandardMaterial({
    map,
    roughness: 0.7,
    side: THREE.DoubleSide,
    emissive: 0x332010,
    emissiveIntensity: 0.25,
  });
  const card = new THREE.Mesh(planeGeo, mat);
  card.scale.set(0.42, 0.56, 1);
  group.add(card);
  const back = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ color: 0xe8d2a8, side: THREE.BackSide }));
  back.scale.copy(card.scale);
  group.add(back);
  group.position.set(x, y, z);
  group.userData.bob = Math.random() * Math.PI * 2;
  return {
    group,
    collider: {
      kind: 'collect',
      min: new THREE.Vector3(x - 0.5, y - 0.5, z - 0.5),
      max: new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5),
      center: group.position,
      radius: 0.7,
      mesh: group,
      taken: false,
    },
  };
}

export function createWire(z: number, mats: MatKit): THREE.Mesh {
  const w = mesh(cylGeo, mats.wood, 0.012, 12.4, 0.012, 0, 8.4, z);
  w.rotation.z = Math.PI / 2;
  return w;
}
