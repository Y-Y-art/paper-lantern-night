import * as THREE from 'three';

function canvas(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function noise(ctx: CanvasRenderingContext2D, size: number, alpha: number, scale = 1) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * alpha * scale;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n * 0.9));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.7));
  }
  ctx.putImageData(img, 0, 0);
}

export function paperTex(hex = '#f0d7a8'): THREE.CanvasTexture {
  return canvas(256, (ctx, s) => {
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(120,70,30,0.08)';
    ctx.lineWidth = 1;
    for (let y = 8; y < s; y += 11) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.sin(y) * 1.5);
      ctx.lineTo(s, y);
      ctx.stroke();
    }
    noise(ctx, s, 0.12);
  });
}

export function lanternPanelTex(): THREE.CanvasTexture {
  return canvas(512, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#ffd9a0');
    g.addColorStop(0.45, '#f0b45a');
    g.addColorStop(1, '#d47832');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);

    ctx.strokeStyle = 'rgba(140, 50, 20, 0.22)';
    ctx.lineWidth = 3;
    const step = s / 8;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * step);
      ctx.lineTo(s, i * step);
      ctx.stroke();
    }
    // faint double-happiness / diamond motif
    ctx.save();
    ctx.translate(s / 2, s / 2);
    ctx.strokeStyle = 'rgba(160, 30, 24, 0.28)';
    ctx.lineWidth = 6;
    ctx.strokeRect(-70, -70, 140, 140);
    ctx.rotate(Math.PI / 4);
    ctx.strokeRect(-52, -52, 104, 104);
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 220, 140, 0.18)';
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.42, 90, 0, Math.PI * 2);
    ctx.fill();
    noise(ctx, s, 0.1);
  });
}

export function woodTex(): THREE.CanvasTexture {
  const t = canvas(256, (ctx, s) => {
    ctx.fillStyle = '#4a2c18';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 18; i++) {
      ctx.strokeStyle = `rgba(${30 + i * 4},${16 + i},${8},0.35)`;
      ctx.lineWidth = 3 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(0, i * 14 + 4);
      for (let x = 0; x <= s; x += 16) {
        ctx.lineTo(x, i * 14 + 4 + Math.sin(x * 0.08 + i) * 3);
      }
      ctx.stroke();
    }
    noise(ctx, s, 0.08);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function tileTex(): THREE.CanvasTexture {
  const t = canvas(256, (ctx, s) => {
    ctx.fillStyle = '#241614';
    ctx.fillRect(0, 0, s, s);
    const cols = 6;
    const rows = 8;
    const tw = s / cols;
    const th = s / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const ox = y % 2 ? tw * 0.5 : 0;
        ctx.fillStyle = x % 2 === y % 2 ? '#3a2220' : '#2c1a18';
        ctx.beginPath();
        const px = ((x * tw + ox) % s);
        ctx.ellipse(px + tw / 2, y * th + th * 0.55, tw * 0.42, th * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(80,40,30,0.5)';
        ctx.stroke();
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function cobbleTex(): THREE.CanvasTexture {
  const t = canvas(512, (ctx, s) => {
    ctx.fillStyle = '#1a1e22';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const r = 8 + Math.random() * 18;
      ctx.fillStyle = `rgb(${22 + Math.random() * 18},${24 + Math.random() * 16},${28 + Math.random() * 14})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.7, Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }
    // warm lantern wash down the middle
    const g = ctx.createLinearGradient(0, 0, s, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(0.5, 'rgba(255,160,60,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    noise(ctx, s, 0.08);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function awningTex(a: string, b: string): THREE.CanvasTexture {
  const t = canvas(256, (ctx, s) => {
    const stripes = 8;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? a : b;
      ctx.fillRect((i * s) / stripes, 0, s / stripes + 1, s);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, s * 0.78, s, s * 0.22);
    noise(ctx, s, 0.06);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function signTex(glyph: string, bg = '#8c1e1e', fg = '#f3d48a'): THREE.CanvasTexture {
  return canvas(256, (ctx, s) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 18, s - 36, s - 36);
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, s - 56, s - 56);
    ctx.fillStyle = fg;
    ctx.font = `700 ${Math.floor(s * 0.46)}px "PingFang SC","Noto Sans SC","Microsoft YaHei",serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, s / 2, s / 2 + 6);
    noise(ctx, s, 0.08);
  });
}

export function wishTex(text: string): THREE.CanvasTexture {
  return canvas(256, (ctx, s) => {
    ctx.fillStyle = '#f6e6c8';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = 'rgba(180,40,30,0.9)';
    ctx.beginPath();
    ctx.arc(s * 0.72, s * 0.78, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6e6c8';
    ctx.font = '700 22px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('印', s * 0.72, s * 0.79);
    ctx.fillStyle = '#6a2a18';
    ctx.font = `600 ${Math.floor(s * 0.22)}px "PingFang SC","Noto Sans SC","Microsoft YaHei",serif`;
    ctx.save();
    ctx.translate(s * 0.5, s * 0.42);
    ctx.rotate(-0.08);
    ctx.fillText(text, 0, 0);
    ctx.restore();
    noise(ctx, s, 0.07);
  });
}

export function glowSprite(color = '#ffb24a'): THREE.CanvasTexture {
  return canvas(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, color);
    g.addColorStop(0.35, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

export function sparkTex(): THREE.CanvasTexture {
  return canvas(64, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, '#fff6d8');
    g.addColorStop(0.2, '#ffd36a');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

export function moonTex(): THREE.CanvasTexture {
  return canvas(256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const g = ctx.createRadialGradient(s * 0.42, s * 0.4, 20, s / 2, s / 2, s / 2);
    g.addColorStop(0, '#fff4d2');
    g.addColorStop(0.45, '#e8d8a8');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = 'rgba(180,170,140,0.18)';
    ctx.beginPath();
    ctx.arc(s * 0.38, s * 0.46, 18, 0, Math.PI * 2);
    ctx.arc(s * 0.58, s * 0.4, 10, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function facadeTex(): THREE.CanvasTexture {
  const t = canvas(256, (ctx, s) => {
    ctx.fillStyle = '#1c1416';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#2a1c1a';
    ctx.fillRect(0, 0, s, 28);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const lit = Math.random() > 0.35;
        ctx.fillStyle = lit ? `rgba(${220 + Math.random() * 30},${140 + Math.random() * 40},60,0.85)` : '#0d0c10';
        ctx.fillRect(28 + x * 76, 48 + y * 68, 40, 36);
      }
    }
    noise(ctx, s, 0.06);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export type TextureKit = ReturnType<typeof createTextures>;

export function createTextures() {
  const awningPalettes: [string, string][] = [
    ['#b4212a', '#f0c66a'],
    ['#8b1c24', '#f3e2c4'],
    ['#1f5c5a', '#e8c478'],
    ['#c45a1a', '#f6dca8'],
    ['#6b1d3a', '#f0c070'],
  ];
  const glyphs = ['福', '春', '茶', '灯', '酒', '愿', '安', '喜', '锦', '月', '花', '龙'];
  const wishes = ['平安', '顺遂', '锦鲤', '圆月', '长乐', '无恙', '灯明', '风顺'];
  return {
    paper: paperTex(),
    lantern: lanternPanelTex(),
    wood: woodTex(),
    tile: tileTex(),
    cobble: cobbleTex(),
    facade: facadeTex(),
    glow: glowSprite('#ffc36a'),
    glowRed: glowSprite('#ff6a4a'),
    glowTeal: glowSprite('#7ad0c8'),
    spark: sparkTex(),
    moon: moonTex(),
    awnings: awningPalettes.map(([a, b]) => awningTex(a, b)),
    signs: glyphs.map((g) => signTex(g)),
    goldSign: signTex('夜', '#2a1a10', '#f0c66a'),
    wishes: wishes.map((w) => wishTex(w)),
    streamer: paperTex('#d83a3a'),
  };
}
