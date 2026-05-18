import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, useColorScheme, View } from 'react-native';
import styled, { useMediaQuery } from 'styled-components/native';

type Vec3 = [number, number, number];
type Quat = [number, number, number, number];
type Mat4 = number[];

const PHI = (1 + Math.sqrt(5)) / 2;

function vNorm(v: Vec3): Vec3 {
  const r = Math.hypot(v[0], v[1], v[2]);
  return r > 0 ? [v[0] / r, v[1] / r, v[2] / r] : v;
}
function vSub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function vCross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function vDot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function qMul(a: Quat, b: Quat): Quat {
  return [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
  ];
}
function qNorm(q: Quat): Quat {
  const r = Math.hypot(q[0], q[1], q[2], q[3]);
  return r > 0 ? [q[0] / r, q[1] / r, q[2] / r, q[3] / r] : q;
}
function qFromAxisAngle(axis: Vec3, rad: number): Quat {
  const half = rad / 2;
  const s = Math.sin(half);
  return [Math.cos(half), axis[0] * s, axis[1] * s, axis[2] * s];
}

// Quaternion → 3×3 rotation (row-major nine-element array).
function qToRot(q: Quat): number[] {
  const [w, x, y, z] = q;
  return [
    1 - 2 * y * y - 2 * z * z,
    2 * x * y - 2 * w * z,
    2 * x * z + 2 * w * y,
    2 * x * y + 2 * w * z,
    1 - 2 * x * x - 2 * z * z,
    2 * y * z - 2 * w * x,
    2 * x * z - 2 * w * y,
    2 * y * z + 2 * w * x,
    1 - 2 * x * x - 2 * y * y,
  ];
}

// Build column-major Mat4 from row-major 3×3 rotation + translation.
function buildMat4(rot: number[], tx: number, ty: number, tz: number): Mat4 {
  return [
    rot[0],
    rot[3],
    rot[6],
    0,
    rot[1],
    rot[4],
    rot[7],
    0,
    rot[2],
    rot[5],
    rot[8],
    0,
    tx,
    ty,
    tz,
    1,
  ];
}

// Mat4 multiply (column-major), C = A × B.
function mat4Mul(a: Mat4, b: Mat4): Mat4 {
  const r = new Array<number>(16);
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      r[j * 4 + i] =
        a[0 * 4 + i] * b[j * 4 + 0] +
        a[1 * 4 + i] * b[j * 4 + 1] +
        a[2 * 4 + i] * b[j * 4 + 2] +
        a[3 * 4 + i] * b[j * 4 + 3];
    }
  }
  return r;
}

// Solid definitions - vertices on unit sphere, faces by vertex index.
function nv(verts: Vec3[]): Vec3[] {
  return verts.map(vNorm);
}

const SOLIDS: { name: string; verts: Vec3[]; faces: number[][] }[] = [
  {
    name: 'tetrahedron',
    verts: nv([
      [1, 1, 1],
      [-1, -1, 1],
      [-1, 1, -1],
      [1, -1, -1],
    ]),
    faces: [
      [0, 1, 2],
      [0, 3, 1],
      [0, 2, 3],
      [1, 3, 2],
    ],
  },
  {
    name: 'cube',
    verts: nv([
      [-1, -1, -1],
      [-1, -1, 1],
      [-1, 1, -1],
      [-1, 1, 1],
      [1, -1, -1],
      [1, -1, 1],
      [1, 1, -1],
      [1, 1, 1],
    ]),
    faces: [
      [0, 1, 3, 2],
      [4, 6, 7, 5],
      [0, 4, 5, 1],
      [2, 3, 7, 6],
      [0, 2, 6, 4],
      [1, 5, 7, 3],
    ],
  },
  {
    name: 'octahedron',
    verts: nv([
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ]),
    faces: [
      [0, 2, 4],
      [0, 4, 3],
      [0, 3, 5],
      [0, 5, 2],
      [1, 4, 2],
      [1, 3, 4],
      [1, 5, 3],
      [1, 2, 5],
    ],
  },
  {
    name: 'dodecahedron',
    verts: nv([
      [1, 1, 1],
      [1, 1, -1],
      [1, -1, 1],
      [1, -1, -1],
      [-1, 1, 1],
      [-1, 1, -1],
      [-1, -1, 1],
      [-1, -1, -1],
      [0, 1 / PHI, PHI],
      [0, 1 / PHI, -PHI],
      [0, -1 / PHI, PHI],
      [0, -1 / PHI, -PHI],
      [1 / PHI, PHI, 0],
      [1 / PHI, -PHI, 0],
      [-1 / PHI, PHI, 0],
      [-1 / PHI, -PHI, 0],
      [PHI, 0, 1 / PHI],
      [PHI, 0, -1 / PHI],
      [-PHI, 0, 1 / PHI],
      [-PHI, 0, -1 / PHI],
    ]),
    faces: [
      [0, 8, 4, 14, 12],
      [0, 12, 1, 17, 16],
      [0, 16, 2, 10, 8],
      [3, 11, 7, 15, 13],
      [3, 13, 2, 16, 17],
      [3, 17, 1, 9, 11],
      [4, 8, 10, 6, 18],
      [4, 18, 19, 5, 14],
      [5, 19, 7, 11, 9],
      [1, 12, 14, 5, 9],
      [2, 13, 15, 6, 10],
      [6, 15, 7, 19, 18],
    ],
  },
  {
    name: 'icosahedron',
    verts: nv([
      [-1, PHI, 0],
      [1, PHI, 0],
      [-1, -PHI, 0],
      [1, -PHI, 0],
      [0, -1, PHI],
      [0, 1, PHI],
      [0, -1, -PHI],
      [0, 1, -PHI],
      [PHI, 0, -1],
      [PHI, 0, 1],
      [-PHI, 0, -1],
      [-PHI, 0, 1],
    ]),
    faces: [
      [0, 11, 5],
      [0, 5, 1],
      [0, 1, 7],
      [0, 7, 10],
      [0, 10, 11],
      [1, 5, 9],
      [5, 11, 4],
      [11, 10, 2],
      [10, 7, 6],
      [7, 1, 8],
      [3, 9, 4],
      [3, 4, 2],
      [3, 2, 6],
      [3, 6, 8],
      [3, 8, 9],
      [4, 9, 5],
      [2, 4, 11],
      [6, 2, 10],
      [8, 6, 7],
      [9, 8, 1],
    ],
  },
];

type FaceData = {
  vertCount: 3 | 4 | 5;
  /** Face center on unit sphere (used for translation × SOLID_RADIUS). */
  center: Vec3;
  /** Row-major 3×3: face local plane (u, v, n) → world. */
  basis: number[];
};

function computeFaces(verts: Vec3[], faces: number[][]): FaceData[] {
  return faces.map(f => {
    const fv = f.map(i => verts[i]);
    const n = fv.length as 3 | 4 | 5;
    const c: Vec3 = [
      fv.reduce((s, v) => s + v[0], 0) / n,
      fv.reduce((s, v) => s + v[1], 0) / n,
      fv.reduce((s, v) => s + v[2], 0) / n,
    ];
    let normal = vNorm(vCross(vSub(fv[1], fv[0]), vSub(fv[2], fv[0])));
    if (vDot(c, normal) < 0) normal = [-normal[0], -normal[1], -normal[2]];
    const u = vNorm(vSub(fv[1], fv[0]));
    // `cross(normal, u)` lands on either side of edge 01 depending on the
    // face's CCW-vs-CW winding, which differs across the five solids. The
    // rendered shape (TriangleFace, PentagonFace) draws its apex / first
    // slice in the −v direction of wrapper space, so we need v pointing
    // *away* from vertex 2 - that way the rendered apex lands at the real
    // vertex 2 in world coords. Without this flip, octa / icosa triangles
    // are mirrored across edge 01 and don't interlock at vertices.
    let v = vNorm(vCross(normal, u));
    if (vDot(v, vSub(fv[2], fv[0])) > 0) {
      v = [-v[0], -v[1], -v[2]];
    }
    return {
      vertCount: n,
      center: c,
      basis: [u[0], v[0], normal[0], u[1], v[1], normal[1], u[2], v[2], normal[2]],
    };
  });
}

const ALL_FACES = SOLIDS.map(s => computeFaces(s.verts, s.faces));

// Per-solid edge length on the unit sphere. All faces of a Platonic solid are
// congruent, so one sample (vertex 0 → vertex 1 of face 0) suffices.
const SOLID_SIDE: number[] = SOLIDS.map(s => {
  const v0 = s.verts[s.faces[0][0]];
  const v1 = s.verts[s.faces[0][1]];
  return Math.hypot(v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]);
});

// One scale factor per solid maps unit-sphere coordinates to pixels. Used for
// BOTH the matrix translations (face center × r) AND the rendered polygon
// edge length (sideLength × r). Sharing the factor is what makes adjacent
// face edges actually meet - they're both at the same 3D position and they
// both render with the same length, so the seams align.
const SOLID_RADIUS_PX = 65;

const ALL_LOCAL_MATS: Mat4[][] = ALL_FACES.map(faces =>
  faces.map(face =>
    buildMat4(
      face.basis,
      face.center[0] * SOLID_RADIUS_PX,
      face.center[1] * SOLID_RADIUS_PX,
      face.center[2] * SOLID_RADIUS_PX
    )
  )
);

// ---------------------------------------------------------------------------
// Render: face shapes
// ---------------------------------------------------------------------------

// Stage diameter sized just above the rotating polyhedron's bounding sphere
// (= 2 × SOLID_RADIUS_PX). Generous extra padding wastes vertical space
// and shows up as a phantom gap before the heading text below.
const STAGE_SIZE = SOLID_RADIUS_PX * 2 + 16;

const Stage = styled.View`
  width: ${STAGE_SIZE}px;
  height: ${STAGE_SIZE}px;
  align-items: center;
  justify-content: center;
  overflow: visible;
`;

// Stage flex-centers SceneOrigin to (STAGE/2, STAGE/2). All FaceWrappers
// are absolute children of SceneOrigin, so their (0, 0) is the scene
// center - matrix translations then read directly as 3D pixel offsets.
const SceneOrigin = styled.View`
  width: 0;
  height: 0;
`;

const FaceWrapper = styled.View`
  position: absolute;
  width: 0;
  height: 0;
  align-items: center;
  justify-content: center;
`;

// Square face (cube only) - solid color block. No border: the 3D arrangement
// already separates faces by their distinct colors, and a 1px ink border
// would z-fight with neighboring faces along shared cube edges.
const SquareFace = styled.View<{ $color: string; $size: number }>`
  width: ${p => p.$size}px;
  height: ${p => p.$size}px;
  background-color: ${p => p.$color};
`;

/**
 * Equilateral triangle via the CSS triangle border trick. The View has zero
 * intrinsic size; its three transparent borders define the triangle shape.
 * Pointing-up by default (apex at top); we wrap and recenter so the visual
 * centroid (not the bounding box) sits at the wrapper origin.
 */
const TriangleShape = styled.View<{ $color: string; $size: number }>`
  width: 0;
  height: 0;
  border-left-width: ${p => p.$size / 2}px;
  border-right-width: ${p => p.$size / 2}px;
  border-bottom-width: ${p => (p.$size * Math.sqrt(3)) / 2}px;
  border-left-color: transparent;
  border-right-color: transparent;
  border-bottom-color: ${p => p.$color};
`;

function TriangleFace({ size, color }: { size: number; color: string }) {
  const h = (size * Math.sqrt(3)) / 2;
  // Centroid of an equilateral triangle is h/3 above the base. The shape's
  // bounding box is `size × h` with the apex at the top-center; shift up by
  // h/3 so the centroid coincides with the wrapper origin.
  return (
    <View style={{ width: size, height: h, transform: [{ translateY: -h / 6 }] }}>
      <TriangleShape $color={color} $size={size} />
    </View>
  );
}

/**
 * Regular pentagon as 5 isoceles triangles fanning from the center. Each
 * slice subtends 72° with its apex at the pentagon center.
 *
 * `size` is the pentagon's edge length (the side it shares with adjacent
 * pentagons in 3D). For an isoceles slice with that base, height (apothem)
 * is `size · cot(π/5) / 2`. Slice border-box width = `size`, height = apothem.
 *
 * The slight 1.01 scale on each slice closes hairline seams along the
 * diagonals where subpixel antialiasing would otherwise leave faint cracks.
 *
 * All slice styles are inline rather than styled-component interpolations:
 * the geometry and per-slice color all change per render, so styled-component
 * compile gives no cache benefit here.
 */
function PentagonFace({ size, color }: { size: number; color: string }) {
  const half = size / 2;
  const apothem = (size * Math.cos(Math.PI / 5)) / (2 * Math.sin(Math.PI / 5));
  return (
    <View style={{ width: 0, height: 0 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            top: 0,
            left: -half,
            borderLeftWidth: half,
            borderRightWidth: half,
            borderBottomWidth: apothem,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
            transformOrigin: '50% 0%',
            transform: [{ rotate: `${i * 72}deg` }, { scale: 1.01 }],
          }}
        />
      ))}
    </View>
  );
}

function FaceShape({
  vertCount,
  size,
  color,
}: {
  vertCount: 3 | 4 | 5;
  size: number;
  color: string;
}) {
  if (vertCount === 4) return <SquareFace $color={color} $size={size} />;
  if (vertCount === 3) return <TriangleFace size={size} color={color} />;
  return <PentagonFace size={size} color={color} />;
}

// ---------------------------------------------------------------------------
// Color palette - sRGB cusp colors (Ottosson max-saturation per hue) run
// through qlab's `harmonize` optimizer (medium drift tolerance, ΔE target
// 8.0). The cusp seeds give max chroma per hue; harmonize then trims a
// few percent off the saturation peaks to spread perceptual distance more
// evenly, smoothing the transitions at near-similar hues like adjacent
// oranges/ambers without sacrificing the vivid character.
//
// Anchored at h=28° (matches the website logo's first hue). Pentagon slices
// render via inline `style` so static hex is required.
// ---------------------------------------------------------------------------

const PALETTE_STEPS = 20;

export const RING_PALETTE: string[] = [
  '#F52728', // h=28   red
  '#F7742A', // h=46   orange
  '#F59B35', // h=64   amber-orange
  '#F8BC3F', // h=82   amber
  '#F7E23E', // h=102  yellow
  '#DFFB3B', // h=118  chartreuse
  '#80F92D', // h=136  green
  '#38FA8B', // h=152  mint
  '#44FBCC', // h=171  cyan-mint
  '#34FBF3', // h=190  cyan
  '#2FE3F7', // h=207  light blue
  '#35C5F5', // h=225  sky
  '#2BA4F2', // h=243  blue
  '#175DF8', // h=263  pure blue
  '#4A00F6', // h=278  violet
  '#8A22F5', // h=298  purple
  '#C61CF5', // h=317  magenta
  '#F930E0', // h=334  pink-magenta
  '#F927A2', // h=352  hot pink
  '#F62569', // h=10   rose
];

/**
 * Per-solid palette indices, ordered by face-normal azimuth (sampling axis
 * rotated −45° around Y, like the website). Faces pointing in similar
 * directions get adjacent ring positions, so the colored solid reads as
 * a smooth gradient rather than a random scatter.
 */
function paletteAssignmentForFaces(faces: FaceData[]): number[] {
  const cos45 = Math.cos(-Math.PI / 4);
  const sin45 = Math.sin(-Math.PI / 4);
  const indexed = faces.map((face, idx) => {
    const c = face.center;
    const r = Math.hypot(c[0], c[1], c[2]) || 1;
    const nx = c[0] / r;
    const nz = c[2] / r;
    const rx = nx * cos45 + nz * sin45;
    const rz = -nx * sin45 + nz * cos45;
    return { idx, az: Math.atan2(rx, rz) };
  });
  indexed.sort((a, b) => a.az - b.az);

  const result = new Array<number>(faces.length);
  const n = faces.length;
  for (let rank = 0; rank < n; rank++) {
    result[indexed[rank].idx] = Math.round((rank * PALETTE_STEPS) / n) % PALETTE_STEPS;
  }
  return result;
}

const SOLID_PALETTE_IDX: number[][] = ALL_FACES.map(paletteAssignmentForFaces);

// ---------------------------------------------------------------------------
// Component - hero variant. Auto-cycles through all 5 solids while idle,
// drag-to-rotate, no surrounding chrome. Lives at the top of the catalog
// as the brand mark, not as a widget.
// ---------------------------------------------------------------------------

// Idle angular velocity, expressed as pixel-equivalent (dx, dy) so it composes
// with pointer-derived velocity from drag. After a fling, current velocity
// blends toward this idle target so the logo settles back into its rest spin.
const IDLE_VEL = { dx: 1.0, dy: -0.4 };
const FLING_SENSITIVITY = 0.01; // pixels → radians factor
// Reference per-frame blend assumed to fire at 60fps; the tick scales it by
// `dt * 60` so the per-second decay is preserved on 120Hz displays (web,
// ProMotion iPhones, etc.).
const VELOCITY_BLEND_RATE = 0.04;
const INITIAL_TILT: Quat = qMul(qFromAxisAngle([1, 0, 0], -0.4), qFromAxisAngle([0, 1, 0], 0.5));
const SOLID_CYCLE_MS = 5000;
// Total collapse-and-expand duration. Faces shrink to origin then expand
// back out; the "from" solid renders before peak, the "to" solid after.
// The swap happens at peak (collapseT=1, fully invisible).
const TRANSITION_MS = 700;

// Persist the user-controllable parts of the logo: which solid is showing
// and whether the auto-cycle is paused. Orientation is intentionally NOT
// persisted - the idle spin would consume it within a frame anyway, and
// JSON-serialized quaternions don't round-trip exactly.
const STORAGE_KEY = 'sc-showcase:logo';
const DEFAULT_SOLID_IDX = 4; // icosahedron - visually richest at rest
type PersistedLogoState = { paused: boolean; solidIdx: number };

function parsePersistedState(raw: string | null): Partial<PersistedLogoState> {
  if (raw == null) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || typeof parsed !== 'object') return {};
    const out: Partial<PersistedLogoState> = {};
    const p = (parsed as Record<string, unknown>).paused;
    const s = (parsed as Record<string, unknown>).solidIdx;
    if (typeof p === 'boolean') out.paused = p;
    if (typeof s === 'number' && s >= 0 && s < SOLIDS.length && Number.isInteger(s)) {
      out.solidIdx = s;
    }
    return out;
  } catch {
    return {};
  }
}

type TransitionState = {
  startTime: number;
  fromSolid: number;
  toSolid: number;
  /** Orientation captured at transition start; held constant through the
   *  entire collapse → expand sequence. Idle spin resumes after the
   *  transition finishes. Without this, the new solid emerges ~25° off
   *  from where the old one disappeared and the expand reads as a
   *  different motion than the collapse. */
  freezeQuat: Quat;
};

// Asymmetric collapse-expand easing. Collapse takes the first 35% of the
// transition (snappy), expand takes the remaining 65% (softer reveal). The
// "to" solid takes over at t=0.35, which is also the curve's peak - the
// moment of full invisibility. Returns collapseT (0..1, scale = 1 - collapseT).
const SWAP_AT = 0.35;
function collapseEase(t: number): number {
  if (t <= SWAP_AT) {
    const u = t / SWAP_AT;
    return u * u * (3 - 2 * u); // smoothstep collapse
  }
  const u = (t - SWAP_AT) / (1 - SWAP_AT);
  return (1 - u) * (1 - u) * (1 - u); // ease-out cubic expand
}

/** Build a face's local matrix scaled and translated by `s` (1 = full
 *  position, 0 = collapsed to origin with zero size). Used by the collapse-
 *  expand animation to interpolate between resting and collapsed states. */
function buildScaledLocalMat(face: FaceData, s: number): Mat4 {
  const b = face.basis;
  const r = SOLID_RADIUS_PX * s;
  return buildMat4(
    [b[0] * s, b[1] * s, b[2] * s, b[3] * s, b[4] * s, b[5] * s, b[6] * s, b[7] * s, b[8] * s],
    face.center[0] * r,
    face.center[1] * r,
    face.center[2] * r
  );
}

// ---------------------------------------------------------------------------
// Controls - small playback chrome above the stage. Four discrete buttons
// (prev / pause / play / next) so each affordance is unambiguous; the
// non-active member of pause↔play renders dimmed but stays clickable for
// idempotent affordance ("press the icon you want to be in").
//
// Glyphs come from Feather via @expo/vector-icons - clean monoline set
// that matches the showcase's restrained type. Hand-rolled View borders
// would render quirkily at sub-16px sizes under rn-web's flex layout, and
// emoji are too platform-skewed (color, baseline, scaling) to use as UI
// chrome.
// ---------------------------------------------------------------------------

const ICON_SIZE = 14;

const HeroColumn = styled.View`
  align-items: center;
  gap: 6px;
`;

const Controls = styled.View`
  flex-direction: row;
  gap: 4px;
  opacity: 0.75;
`;

const CtrlBtn = styled.Pressable<{ $dim?: boolean }>`
  width: 28px;
  height: 22px;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  opacity: ${p => (p.$dim ? 0.3 : 1)};
  transition: opacity 120ms ease-out;

  &:hover {
    opacity: ${p => (p.$dim ? 0.5 : 1)};
  }

  &:active {
    opacity: ${p => (p.$dim ? 0.25 : 0.6)};
  }
`;

export function PlatonicLogo() {
  const [, forceTick] = useState(0);
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  // Vector-icon color bypasses the styled-components pipeline, so the
  // light-dark() polyfill doesn't apply. Resolve in JS instead.
  const scheme = useColorScheme();
  const iconColor = scheme === 'dark' ? '#f5f3ee' : '#0e0e10';

  const quatRef = useRef<Quat>(INITIAL_TILT);
  const draggingRef = useRef(false);
  const lastTouchRef = useRef({ x: 0, y: 0 });
  // Pointer-equivalent angular velocity in (dx, dy) per frame. Initialized
  // to IDLE_VEL so the resting state is a slow tumble; drag updates this
  // via EMA smoothing of pointer deltas; release leaves it as the captured
  // fling velocity, and the tick blends it back toward IDLE_VEL.
  const velocityRef = useRef({ ...IDLE_VEL });
  // The solid currently displayed when no transition is in flight. Mirrors
  // `activeSolid` state below - the ref is read synchronously by the rAF
  // closure and the transition machinery, the state drives persistence
  // and is the value rendered.
  const activeSolidRef = useRef(DEFAULT_SOLID_IDX);
  // When set, a collapse → expand animation is in flight: the "from" solid
  // shrinks to origin, the "to" solid expands back out. Cleared on completion.
  const transitionRef = useRef<TransitionState | null>(null);

  // User-controllable settings, persisted to AsyncStorage on change.
  // `restored` gates writes so the first paint doesn't echo defaults back
  // into storage before the load has had a chance to surface anything.
  const [paused, setPaused] = useState(false);
  const [activeSolid, setActiveSolid] = useState(DEFAULT_SOLID_IDX);
  const [restored, setRestored] = useState(false);

  // Restore on mount.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (cancelled) return;
        const next = parsePersistedState(raw);
        if (next.paused !== undefined) setPaused(next.paused);
        if (next.solidIdx !== undefined) {
          setActiveSolid(next.solidIdx);
          activeSolidRef.current = next.solidIdx;
        }
        setRestored(true);
      })
      .catch(() => {
        if (!cancelled) setRestored(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on change. One write per change is fine - AsyncStorage is
  // async and these toggles are user-driven, not high-frequency.
  useEffect(() => {
    if (!restored) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ paused, solidIdx: activeSolid } satisfies PersistedLogoState)
    ).catch(() => undefined);
  }, [paused, activeSolid, restored]);

  // Kick off a transition to a specific solid. Used by both the auto-cycle
  // interval and the manual prev/next buttons. No-ops if a transition is
  // already in flight or the target equals the current solid.
  const startTransition = useCallback((toSolid: number) => {
    if (transitionRef.current) return;
    const fromSolid = activeSolidRef.current;
    if (fromSolid === toSolid) return;
    transitionRef.current = {
      startTime: performance.now(),
      fromSolid,
      toSolid,
      freezeQuat: [...quatRef.current] as Quat,
    };
  }, []);

  // Cycle through all five solids on a timer. Skipped under reduce-motion
  // (settles on whatever solid was last shown) and when the user has paused.
  // Each tick starts a collapse-expand transition; the rAF loop advances it.
  useEffect(() => {
    if (reduce || paused) return;
    const id = setInterval(() => {
      if (draggingRef.current || transitionRef.current) return;
      startTransition((activeSolidRef.current + 1) % SOLIDS.length);
    }, SOLID_CYCLE_MS);
    return () => clearInterval(id);
  }, [reduce, paused, startTransition]);

  const handlePrev = useCallback(() => {
    startTransition((activeSolidRef.current - 1 + SOLIDS.length) % SOLIDS.length);
  }, [startTransition]);
  const handleNext = useCallback(() => {
    startTransition((activeSolidRef.current + 1) % SOLIDS.length);
  }, [startTransition]);
  const handlePause = useCallback(() => setPaused(true), []);
  const handlePlay = useCallback(() => {
    // Drop any captured fling velocity so unpause resumes at idle. Without
    // this, a drag-release-pause within one frame leaves the captured fling
    // sitting in velocityRef, and the next tick after unpause replays it as
    // a phantom flick.
    velocityRef.current.dx = IDLE_VEL.dx;
    velocityRef.current.dy = IDLE_VEL.dy;
    setPaused(false);
  }, []);

  // Drive idle spin + drag + transition advance via a single rAF loop. The
  // per-frame deltas are scaled by `dt * 60` so visual rate is constant
  // across display refresh rates (60Hz native baseline, 120Hz web /
  // ProMotion). Re-render is triggered by toggling a counter rather than
  // reading the quaternion directly, so we don't allocate a new state
  // object per frame. Transition completion finalizes activeSolidRef
  // in-tick so the next render reads the new solid via the existing
  // forceTick.
  useEffect(() => {
    let last = 0;
    let cancelled = false;
    const tick = (now: number) => {
      if (cancelled) return;
      const dt = last === 0 ? 0 : Math.min((now - last) / 1000, 1 / 30);
      last = now;
      // 1.0 on a 60Hz display, 0.5 on 120Hz, capped at 2.0 by the dt clamp
      // above (covers tab-resume cases without runaway rotation jumps).
      const tickScale = dt * 60;
      // Advance velocity-driven rotation when not dragging, not paused, not
      // under reduce-motion, and not mid-transition. The velocity vector
      // composes pointer-equivalent (dx, dy) deltas: IDLE_VEL at rest,
      // fling-velocity immediately after release, blending back toward idle
      // each frame.
      if (!draggingRef.current && !paused && !reduce && !transitionRef.current) {
        const vel = velocityRef.current;
        const dq = qMul(
          qFromAxisAngle([1, 0, 0], -vel.dy * FLING_SENSITIVITY * tickScale),
          qFromAxisAngle([0, 1, 0], vel.dx * FLING_SENSITIVITY * tickScale)
        );
        quatRef.current = qNorm(qMul(dq, quatRef.current));
        // Exponential blend toward IDLE_VEL: fast flings decay quickly while
        // small drifts stabilise without a visible jump back to idle. Same
        // per-second decay across refresh rates via tickScale, capped at 1
        // so a stalled tab doesn't overshoot.
        const blend = Math.min(VELOCITY_BLEND_RATE * tickScale, 1);
        vel.dx = vel.dx * (1 - blend) + IDLE_VEL.dx * blend;
        vel.dy = vel.dy * (1 - blend) + IDLE_VEL.dy * blend;
      }
      const trans = transitionRef.current;
      if (trans && now - trans.startTime >= TRANSITION_MS) {
        activeSolidRef.current = trans.toSolid;
        transitionRef.current = null;
        // Mirror into state so the persistence effect picks it up. Batched
        // with `forceTick` below by React 19's automatic batching.
        setActiveSolid(trans.toSolid);
      }
      forceTick(c => (c + 1) & 0xffff);
      rafId = requestAnimationFrame(tick);
    };
    let rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [reduce, paused]);

  // PanResponder: drag the solid by accumulating quaternion rotations
  // proportional to pointer delta.
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (_, g) => {
          draggingRef.current = true;
          lastTouchRef.current = { x: g.x0, y: g.y0 };
          // Stop existing motion on grab so the drag feels stuck to the
          // pointer instead of inheriting any in-flight fling velocity.
          velocityRef.current.dx = 0;
          velocityRef.current.dy = 0;
        },
        onPanResponderMove: (_, g) => {
          const x = g.moveX;
          const y = g.moveY;
          const dx = x - lastTouchRef.current.x;
          const dy = y - lastTouchRef.current.y;
          lastTouchRef.current = { x, y };
          // Apply rotation directly for instant pointer feedback.
          const dq = qMul(
            qFromAxisAngle([1, 0, 0], -dy * FLING_SENSITIVITY),
            qFromAxisAngle([0, 1, 0], dx * FLING_SENSITIVITY)
          );
          quatRef.current = qNorm(qMul(dq, quatRef.current));
          // EMA-smooth pointer delta into velocity. Weighting recent samples
          // 40% keeps the captured velocity reflective of the user's intent
          // at release without spiking on a single noisy frame.
          const vel = velocityRef.current;
          vel.dx = dx * 0.4 + vel.dx * 0.6;
          vel.dy = dy * 0.4 + vel.dy * 0.6;
        },
        onPanResponderRelease: () => {
          draggingRef.current = false;
          // velocity already holds the smoothed pointer delta - tick blends
          // it back toward IDLE_VEL, producing the fling.
        },
        onPanResponderTerminate: () => {
          draggingRef.current = false;
        },
      }),
    []
  );

  // Resolve which solid is currently visible and how collapsed it is.
  // The "from" solid renders before SWAP_AT, the "to" solid after. The
  // parent rotation is frozen at transition start so collapse and expand
  // share the same orientation reference (the spin keeps moving the world
  // through ~25° during the 700ms transition otherwise, and the new solid
  // emerges off-axis from where the old one disappeared).
  let renderSolidIdx = activeSolidRef.current;
  let scale = 1;
  let renderQuat = quatRef.current;
  const trans = transitionRef.current;
  if (trans) {
    const t = Math.min(1, (performance.now() - trans.startTime) / TRANSITION_MS);
    scale = 1 - collapseEase(t);
    renderSolidIdx = t < SWAP_AT ? trans.fromSolid : trans.toSolid;
    renderQuat = trans.freezeQuat;
  }

  const faces = ALL_FACES[renderSolidIdx];
  const paletteIdx = SOLID_PALETTE_IDX[renderSolidIdx];
  const parentRot = qToRot(renderQuat);
  const parentMat = buildMat4(parentRot, 0, 0, 0);

  // Face polygon edge length in pixels. Same scale factor (SOLID_RADIUS_PX)
  // used by the matrix translation, so each face's rendered edge ends exactly
  // at the polyhedron's edge - adjacent faces' edges meet without gaps.
  // Constant during transition; the matrix scale handles shrinking.
  const facePixelSize = SOLID_SIDE[renderSolidIdx] * SOLID_RADIUS_PX;

  return (
    <HeroColumn>
      <Controls>
        <CtrlBtn
          accessibilityRole="button"
          accessibilityLabel="Previous solid"
          onPress={handlePrev}
        >
          <MaterialIcons name="fast-rewind" size={ICON_SIZE} color={iconColor} />
        </CtrlBtn>
        <CtrlBtn
          accessibilityRole="button"
          accessibilityLabel="Pause motion"
          accessibilityState={{ selected: paused }}
          onPress={handlePause}
          $dim={paused}
        >
          <MaterialIcons name="pause" size={ICON_SIZE} color={iconColor} />
        </CtrlBtn>
        <CtrlBtn
          accessibilityRole="button"
          accessibilityLabel="Resume auto-cycle"
          accessibilityState={{ selected: !paused }}
          onPress={handlePlay}
          $dim={!paused}
        >
          <MaterialIcons name="play-arrow" size={ICON_SIZE} color={iconColor} />
        </CtrlBtn>
        <CtrlBtn accessibilityRole="button" accessibilityLabel="Next solid" onPress={handleNext}>
          <MaterialIcons name="fast-forward" size={ICON_SIZE} color={iconColor} />
        </CtrlBtn>
      </Controls>
      <Stage {...responder.panHandlers}>
        <SceneOrigin>
          {faces.map((face, i) => {
            // Use the cached static matrix only when no transition is running.
            // During transitions, scale varies frame-to-frame so we rebuild.
            const localMat = trans
              ? buildScaledLocalMat(face, scale)
              : ALL_LOCAL_MATS[renderSolidIdx][i];
            const composed = mat4Mul(parentMat, localMat);
            // Painter's z-sort: faces farther from the camera (more negative
            // resolved z) get lower zIndex so closer faces draw on top.
            const z = composed[14];
            // Backface cull: the face's local +Z basis vector becomes column 2
            // of the composed matrix (indices 8, 9, 10), scaled by the current
            // collapse scale. When the unscaled vector points toward the camera
            // (positive resolved Z) the face is visible. Threshold scales with
            // `scale` so culling stays consistent during the collapse animation.
            // Use `display: none` instead of returning null so the face stays
            // mounted across rotation frames - the React DevTools tree was
            // unusable while every face mounted/unmounted continuously.
            const normalZ = composed[10];
            const culled = normalZ < 0.02 * scale;
            return (
              <FaceWrapper
                key={i}
                style={{
                  transform: [{ matrix: composed }],
                  zIndex: Math.round(z * 100) + 1000,
                  display: culled ? 'none' : 'flex',
                }}
                pointerEvents="none"
              >
                <FaceShape
                  vertCount={face.vertCount}
                  size={facePixelSize}
                  color={RING_PALETTE[paletteIdx[i]]}
                />
              </FaceWrapper>
            );
          })}
        </SceneOrigin>
      </Stage>
    </HeroColumn>
  );
}
