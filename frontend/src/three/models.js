import * as THREE from 'three'

/* Maquetas en escala de grises. Todo en metros, y hacia arriba. */

export const M = {
  white: new THREE.MeshStandardMaterial({ color: 0xf8f8f8, roughness: 0.75 }),
  light: new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.8 }),
  mid: new THREE.MeshStandardMaterial({ color: 0xa9a9a9, roughness: 0.65 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x4b4b4b, roughness: 0.55 }),
  black: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.45 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x8d8d8d, roughness: 0.3, metalness: 0.6 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.38, depthWrite: false }),
  glassEdge: new THREE.LineBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.6 }),
  card: new THREE.MeshStandardMaterial({ color: 0xbdbdbd, roughness: 0.95 }),
}

let hatchTex = null
export function hatchTexture() {
  if (hatchTex) return hatchTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  g.fillStyle = '#f2f2f2'
  g.fillRect(0, 0, 128, 128)
  g.strokeStyle = '#1a1a1a'
  g.lineWidth = 14
  for (let i = -128; i < 256; i += 40) {
    g.beginPath()
    g.moveTo(i, 128)
    g.lineTo(i + 128, 0)
    g.stroke()
  }
  hatchTex = new THREE.CanvasTexture(c)
  hatchTex.wrapS = hatchTex.wrapT = THREE.RepeatWrapping
  hatchTex.colorSpace = THREE.SRGBColorSpace
  hatchTex.anisotropy = 8
  return hatchTex
}

export function box(parent, w, h, d, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y + h / 2, z)
  m.castShadow = shadow
  m.receiveShadow = true
  parent.add(m)
  return m
}

export function cyl(parent, r, h, mat, x = 0, y = 0, z = 0, axis = 'y', seg = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat)
  if (axis === 'x') m.rotation.z = Math.PI / 2
  if (axis === 'z') m.rotation.x = Math.PI / 2
  m.position.set(x, y + (axis === 'y' ? h / 2 : 0), z)
  m.castShadow = true
  m.receiveShadow = true
  parent.add(m)
  return m
}

export function sheet(parent, w, h, x, y, z, rx = 0, ry = 0, rz = 0) {
  const geo = new THREE.BoxGeometry(w, h, 0.03)
  const m = new THREE.Mesh(geo, M.glass)
  m.position.set(x, y, z)
  m.rotation.set(rx, ry, rz)
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), M.glassEdge)
  m.add(e)
  parent.add(m)
  return m
}

function zoneFloor(g, w, d) {
  const tex = hatchTexture().clone()
  tex.needsUpdate = true
  tex.repeat.set(w / 2.2, d / 2.2)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = 0.025
  floor.receiveShadow = true
  g.add(floor)
  const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.02, d)), new THREE.LineBasicMaterial({ color: 0x000000 }))
  border.position.y = 0.04
  g.add(border)
}

function aframe(g, x, z, len, sheets = 3, w = 1.6) {
  box(g, 0.08, 1.7, len, M.black, x, 0, z)
  box(g, 0.9, 0.12, len, M.dark, x, 0, z)
  for (let i = 0; i < sheets; i++) {
    const side = i % 2 ? 1 : -1
    sheet(g, len * 0.86, w, x + side * (0.18 + 0.05 * i), 0.95, z, 0, Math.PI / 2, side * -0.18)
  }
}

const builders = {
  rack(g, w, d) {
    box(g, w, 0.12, d, M.dark)
    const n = 4
    for (let i = 0; i < n; i++) aframe(g, -w / 2 + (w / n) * (i + 0.5), 0, d * 0.82, 4, 2)
  },
  table(g, w, d) {
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, 0.12, 0.85, 0.12, M.black, lx * (w / 2 - 0.2), 0, lz * (d / 2 - 0.2))
    box(g, w, 0.1, d, M.white, 0, 0.85, 0)
    sheet(g, w * 0.78, d * 0.72, -0.2, 0.98, 0, -Math.PI / 2)
    box(g, 0.25, 0.25, d + 0.3, M.black, w * 0.12, 1.1, 0)
    box(g, 0.4, 0.35, 0.4, M.dark, w * 0.12, 1.05, -0.4)
    box(g, 0.2, 1.3, d + 0.3, M.steel, -w / 2 - 0.1, 0, 0).scale.set(1, 1, 1)
  },
  bench(g, w, d) {
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, 0.1, 0.85, 0.1, M.black, lx * (w / 2 - 0.15), 0, lz * (d / 2 - 0.15))
    box(g, w, 0.08, d, M.light, 0, 0.85, 0)
    for (let i = 0; i < 5; i++) sheet(g, 0.5 + (i % 3) * 0.3, 0.4 + (i % 2) * 0.3, -w / 2 + 0.6 + i * 0.7, 0.96, (i % 2 ? 0.4 : -0.4), -Math.PI / 2, 0, i * 0.5)
    box(g, 0.9, 0.5, 0.7, M.mid, w / 2 - 0.6, 0, d / 2 + 0.45)
  },
  polisher(g, w, d) {
    const body = w * 0.55
    box(g, body, 1.05, d * 0.7, M.light, 0, 0, 0)
    box(g, body * 0.8, 0.45, d * 0.6, M.black, 0, 1.05, 0)
    for (let i = 0; i < 6; i++) box(g, 0.14, 0.12, 0.14, M.white, -body * 0.35 + i * (body * 0.14), 1.5, -d * 0.18)
    for (const side of [-1, 1]) {
      const cx = side * (body / 2 + (w - body) / 4)
      const len = (w - body) / 2
      box(g, len, 0.75, d * 0.5, M.dark, cx, 0, 0)
      for (let i = 0; i < 5; i++) cyl(g, 0.06, d * 0.5, M.steel, cx - len / 2 + 0.2 + i * (len / 5), 0.82, 0, 'z', 10)
    }
    sheet(g, 1.6, d * 0.4, -body / 2 - (w - body) / 4, 0.92, 0, -Math.PI / 2)
    box(g, 0.5, 1.4, 0.3, M.black, body / 2 - 0.4, 0, d * 0.4)
  },
  booth(g, w, d) {
    box(g, w * 0.66, 2.3, d * 0.9, M.white, -w * 0.15, 0, 0)
    box(g, w * 0.4, 1.0, 0.05, M.black, -w * 0.15, 0.9, d * 0.45 + 0.03)
    box(g, w * 0.66 + 0.1, 0.12, d * 0.9 + 0.1, M.dark, -w * 0.15, 2.3, 0)
    cyl(g, 0.65, 2.8, M.mid, w * 0.32, 0, -d * 0.2, 'y', 24)
    cyl(g, 0.7, 0.2, M.black, w * 0.32, 2.8, -d * 0.2, 'y', 24)
    box(g, 1.0, 0.3, 0.3, M.dark, w * 0.12, 2.2, -d * 0.2)
  },
  washer(g, w, d) {
    box(g, w * 0.62, 1.15, d * 0.75, M.white, 0, 0, 0)
    box(g, w * 0.62, 0.08, d * 0.75, M.black, 0, 1.15, 0)
    for (let i = 0; i < 4; i++) cyl(g, 0.16, d * 0.62, M.dark, -w * 0.22 + i * w * 0.15, 1.3, 0, 'z', 14)
    for (const side of [-1, 1]) {
      const cx = side * (w * 0.31 + w * 0.095)
      box(g, w * 0.19, 0.75, d * 0.5, M.dark, cx, 0, 0)
      for (let i = 0; i < 3; i++) cyl(g, 0.05, d * 0.5, M.steel, cx - w * 0.07 + i * w * 0.07, 0.8, 0, 'z', 10)
    }
  },
  pack(g, w, d) {
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, 0.1, 0.85, 0.1, M.black, lx * (w * 0.3 - 0.15), 0, lz * (d * 0.3 - 0.15))
    box(g, w * 0.6, 0.08, d * 0.6, M.white, 0, 0.85, 0)
    sheet(g, w * 0.4, d * 0.35, 0, 0.98, 0, -Math.PI / 2)
    for (let i = 0; i < 3; i++) for (let j = 0; j <= i % 2; j++) box(g, 0.8, 0.55, 0.6, M.card, w * 0.36, j * 0.55, -d * 0.3 + i * 0.75)
    cyl(g, 0.35, 1.0, M.light, -w * 0.38, 0, d * 0.3, 'y', 18)
  },
  zone(g, w, d, opts = {}) {
    zoneFloor(g, w, d)
    if (opts.id === 'recepcion') {
      aframe(g, -w * 0.15, 0, d * 0.55, 3, 2.2)
      box(g, 1.2, 0.15, 1.0, M.dark, w * 0.3, 0, d * 0.2)
    } else if (opts.sorted) {
      for (let i = 0; i < 3; i++) aframe(g, -w / 2 + (w / 3) * (i + 0.5), 0, d * 0.6, 2 + (i % 2), 1.5)
    } else {
      for (let i = 0; i < 9; i++) {
        const x = -w / 2 + 0.8 + ((i * 1.7) % (w - 1.4))
        const z = -d / 2 + 0.8 + ((i * 1.3) % (d - 1.4))
        sheet(g, 1.2 + (i % 3) * 0.3, 1.0 + (i % 2) * 0.4, x, 0.6, z, 0.25 * ((i % 3) - 1), i * 0.7, 0.2)
      }
      box(g, 0.9, 0.5, 0.7, M.card, w * 0.25, 0, -d * 0.3)
      box(g, 0.9, 0.5, 0.7, M.card, w * 0.3, 0.5, -d * 0.25)
    }
  },
  office(g, w, d) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.white)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0.03
    floor.receiveShadow = true
    g.add(floor)
    const h = 2.3
    for (const [len, x, z, rot] of [[w, 0, -d / 2, 0], [w, 0, d / 2, 0], [d, -w / 2, 0, Math.PI / 2], [d, w / 2, 0, Math.PI / 2]]) {
      const pane = sheet(g, len, h, x, h / 2, z, 0, rot, 0)
      pane.material = M.glass
      box(g, rot ? 0.08 : len, 0.08, rot ? len : 0.08, M.black, x, h, z)
    }
    for (let i = 0; i < 3; i++) {
      box(g, 1.4, 0.75, 0.7, M.light, -w / 2 + 1.4 + i * 1.9, 0, -d / 2 + 0.9)
      box(g, 0.45, 0.32, 0.05, M.black, -w / 2 + 1.4 + i * 1.9, 0.75, -d / 2 + 0.75)
      cyl(g, 0.25, 0.5, M.black, -w / 2 + 1.4 + i * 1.9, 0, -d / 2 + 1.6, 'y', 12)
    }
    cyl(g, 0.7, 0.75, M.light, w * 0.22, 0, d * 0.12, 'y', 28)
    for (let i = 0; i < 4; i++) cyl(g, 0.22, 0.45, M.black, w * 0.22 + Math.cos(i * 1.57) * 1.05, 0, d * 0.12 + Math.sin(i * 1.57) * 1.05, 'y', 12)
    box(g, 0.6, 1.8, 0.4, M.mid, w / 2 - 0.5, 0, -d / 2 + 0.4)
  },
  restroom(g, w, d) {
    box(g, w, 2.2, 0.12, M.white, 0, 0, -d / 2)
    box(g, 0.12, 2.2, d, M.white, -w / 2, 0, 0)
    box(g, 0.12, 2.2, d, M.white, w / 2, 0, 0)
    box(g, 0.08, 2.0, d * 0.6, M.light, 0, 0, -d * 0.2)
    box(g, w * 0.36, 2.0, 0.08, M.light, -w * 0.25, 0, d * 0.1)
    box(g, w * 0.36, 2.0, 0.08, M.light, w * 0.25, 0, d * 0.1)
    for (const s of [-1, 1]) {
      cyl(g, 0.22, 0.42, M.white, s * w * 0.25, 0, -d * 0.3, 'y', 16)
      box(g, 0.4, 0.5, 0.18, M.white, s * w * 0.25, 0.3, -d / 2 + 0.2)
    }
    box(g, w * 0.7, 0.85, 0.5, M.light, 0, 0, d / 2 - 0.4)
  },
}

export function makeMachine(kind, w, d, opts = {}) {
  const g = new THREE.Group()
  ;(builders[kind] || builders.bench)(g, w, d, opts)
  return g
}

/* El pulpo: grúa de columna con una ventosa de cuatro brazos para mover láminas. */
export function makeCrane() {
  const g = new THREE.Group()
  cyl(g, 0.22, 4.2, M.black, 0, 0, 0, 'y', 16)
  box(g, 0.9, 0.2, 0.9, M.dark, 0, 0, 0)
  const arm = new THREE.Group()
  arm.position.y = 4.0
  box(arm, 4.4, 0.24, 0.24, M.black, 2.1, 0, 0)
  box(arm, 0.5, 0.35, 0.4, M.dark, 4.2, -0.1, 0)
  const cable = box(arm, 0.04, 1.6, 0.04, M.black, 4.0, -1.8, 0)
  cable.castShadow = false
  const head = new THREE.Group()
  head.position.set(4.0, -2.15, 0)
  box(head, 1.4, 0.08, 0.08, M.dark, 0, 0, 0)
  box(head, 0.08, 0.08, 1.4, M.dark, 0, 0, 0)
  for (const [x, z] of [[0.65, 0], [-0.65, 0], [0, 0.65], [0, -0.65]]) cyl(head, 0.16, 0.06, M.black, x, -0.08, z, 'y', 14)
  arm.add(head)
  g.add(arm)
  g.userData.arm = arm
  return g
}

export function makeOperator() {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.75, 4, 10), M.black)
  body.position.y = 0.6
  body.castShadow = true
  g.add(body)
  const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.35, 12), M.white)
  vest.position.y = 0.85
  g.add(vest)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), M.light)
  head.position.y = 1.32
  head.castShadow = true
  g.add(head)
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.white)
  helmet.position.y = 1.36
  g.add(helmet)
  return g
}

export function makeTruck(load = 'glass') {
  const g = new THREE.Group()
  box(g, 2.3, 0.35, 8.2, M.black, 0, 0.45, 0)
  for (const z of [-2.8, -1.6, 2.6]) for (const s of [-1, 1]) cyl(g, 0.45, 0.35, M.black, s * 1.05, 0.45, z, 'x', 18)
  box(g, 2.4, 2.1, 2.1, M.white, 0, 0.8, 3.1)
  box(g, 2.2, 0.8, 0.05, M.black, 0, 1.9, 4.16)
  if (load === 'box') {
    box(g, 2.4, 2.6, 5.6, M.white, 0, 0.8, -1.0)
    box(g, 2.42, 0.25, 5.62, M.dark, 0, 2.3, -1.0)
  } else {
    box(g, 2.4, 0.15, 5.6, M.light, 0, 0.8, -1.0)
    aframe(g, 0, -1.0, 4.8, 4, 1.9)
  }
  return g
}

export function makeTree() {
  const g = new THREE.Group()
  cyl(g, 0.18, 1.6, M.dark, 0, 0, 0, 'y', 8)
  const mat = new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 1, flatShading: true })
  for (const [x, y, z, r] of [[0, 2.4, 0, 1.3], [0.7, 2.0, 0.3, 0.9], [-0.6, 2.1, -0.3, 0.95]]) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat)
    s.position.set(x, y, z)
    s.castShadow = true
    g.add(s)
  }
  return g
}
