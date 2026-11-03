// All game art. Runs at build time only, pxl never ships.
// Figures have no outline here, the game adds it.

pal({
  k: "#1a1c2c", // outline, eyes, mouth
  w: "#f4f4f4",
  y: "#ffd75e", // muzzle flash, bullets, mask lenses
  s: "#f2c49b", // skin
  h: "#2a2a33", H: "#44444f", // hair
  b: "#6f7a45", B: "#535c32", // jacket
  p: "#4f5636", // player pants
  d: "#232830", // boots
  R: "#8e2233", U: "#5e1622", // beanie, R is also blood
  z: "#6e5a3c", // backpack
  m: "#5a6472", // gas mask, gun, empty heart
  n: "#aab2bd", // gun
  g: "#86b05a", G: "#587a3d", A: "#a9cc7c", // zombie skin, swapped per type
  c: "#8a6f55", // zombie clothes, swapped per type
  q: "#39424e", // zombie pants
  r: "#d8343f", // zombie eyes, hearts
  e: "#3f3d36", E: "#35332d", t: "#4a4a3a", // ground
  J: "#3f5a2e", // tank skin
  P: "#7a4fb8", V: "#4e2f86", i: "#ff9ec4", // purple, growths
  F: "#e0d8b8", f: "#a89f80", C: "#5f4a3a", // bone, staff
  x: "#fff3a0", // glow
  O: "#e08a2c", o: "#a85f1c", // attack speed power-up
})

// --- Helpers ---

// Checked rows: a wrong width stops the build.
const part = (s) => {
  const rows = s.trim().split("\n").map((r) => r.trim())
  rows.forEach((r) => { if (r.length !== 20) throw new Error(`row ${r} has ${r.length} characters, expected 20`) })
  return rows
}
const canvas = (h) => Array.from({ length: h }, () => Array(20).fill("."))
// "." keeps what is underneath.
const paint = (cv, rows, dx = 0, dy = 0) => {
  rows.forEach((r, y) => [...r].forEach((c, x) => {
    if (c !== "." && cv[y + dy] && x + dx >= 0 && x + dx < 20) cv[y + dy][x + dx] = c
  }))
}
const block = (cv, x, y, w, h, c) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (cv[j] && i >= 0 && i < 20) cv[j][i] = c
}
const gridText = (cv) => cv.map((r) => r.join("")).join("\n")
// Each character becomes 2x2.
const x2 = (g) => g.trim().split("\n").map((r) => r.trim().replace(/./g, (c) => c + c))
  .map((r) => r + "\n" + r).join("\n")

const VIEWS = ["S", "SE", "E", "NE", "N"] // W, SW, NW are mirrored in the game
const FRONTAL = (v) => v === "S" || v === "N"

// Straight legs. f: 0 = stand, 1 = left up, 3 = right up.
function legs(xL, xR, leg, top, bottom, f) {
  const cv = canvas(6)
  const put = (x, lifted) => paint(cv, lifted ? [leg, leg, top, bottom] : [leg, leg, leg, leg, top, bottom], x)
  put(xL, f === 1)
  put(xR, f === 3)
  return cv.map((r) => r.join(""))
}

// --- Player: gas mask, beanie, backpack. 20x24 ---

const P_ARMS = {
  S: part(`
    ....................
    ...bb..........bB...
    ...bb..........bB...
    ...ss..........ss...
    ...ss..........ss...
    ...ss..........ss...`),
  SE: part(`
    ....................
    bb..........bB......
    bb..........bB......
    ss..........ss......
    ss..........ss......
    ss..........ss......`),
  E: part(`
    ....................
    .....BbbB...........
    .....BbbB...........
    .....BbbB...........
    .....ssss...........
    .....ssss...........`),
}
P_ARMS.NE = P_ARMS.SE
P_ARMS.N = P_ARMS.S

const P_BODY = {
  S: part(`
    .....bbbbbbbbbb.....
    .....bbbbbbbbbb.....
    .....bbbbbbbbbB.....
    .....bbbbbbbbbB.....
    .....bbbbbbbbbB.....
    .....bbbbbbbbbB.....
    .....bbbbbbbbbB.....
    .....pppppppppp.....`),
  SE: part(`
    ..bbbbbbbbbb........
    ..bbbbbbbbbb........
    ..bbbbbbbbbB........
    ..bbbbbbbbbB........
    ..bbbbbbbbbB........
    ..bbbbbbbbbB........
    ..bbbbbbbbbB........
    ..pppppppppp........`),
  E: part(`
    ...bbbbbbbbb........
    ...bbbbbbbbb........
    ...bbbbbbbbB........
    ...bbbbbbbbB........
    ...bbbbbbbbB........
    ...bbbbbbbbB........
    ...bbbbbbbbB........
    ...ppppppppp........`),
}
P_BODY.NE = P_BODY.SE
P_BODY.N = P_BODY.S

const P_LEGS_E = {
  0: part(`
    ....pppppp..........
    ....pppppp..........
    ....pppppp..........
    ....pppppp..........
    ....ddddddd.........
    ....ddddddd.........`),
  1: part(`
    ...pppppppp.........
    ...ppp..ppp.........
    ..ppp....ppp........
    ..pp......pp........
    .ddd......dddd......
    .ddd......dddd......`),
}
P_LEGS_E[3] = P_LEGS_E[1]

const pLegs = (v, f) => (v === "E" ? P_LEGS_E[f] : FRONTAL(v) ? legs(5, 11, "pppp", "dddd", "dddd", f) : legs(2, 8, "pppp", "dddd", "dddd", f))

const P_HAIR = part(`
  .......hhhhhh.......
  ......hHHhhhhh......
  .....hHHhhhhhhh.....
  .....hhhhhhhhhh.....
  .....hhhhhhhhhh.....
  .....hhhhhhhhhh.....
  .....hhhhhhhhhh.....
  .....hhhhhhhhhh.....
  ......hhhhhhhh......`)

// Face, 10 wide, rows 3-8.
const P_FACE = {
  S: [".ssssssss.", ".ssksskss.", ".ssksskss.", ".ssssssss.", ".ssssssss.", "..ssssss.."],
  SE: ["..ssssssss", "..sskssks.", "..sskssks.", "..ssssssss", "..ssssssss", "...ssssss."],
  E: ["....ssssss", "....ssssk.", "....ssssk.", "....ssssss", "....ssssss", ".....ssss."],
  NE: ["........ss", ".......sss", ".......sss", ".......sss", "........ss", ".........."],
}

function pack(cv, v) {
  const z = "z"
  if (v === "S") { block(cv, 6, 10, 2, 5, z); block(cv, 12, 10, 2, 5, z) }
  if (v === "SE") { block(cv, 3, 10, 2, 5, z); block(cv, 9, 10, 2, 5, z) }
  if (v === "E") { block(cv, 0, 11, 3, 6, z); block(cv, 4, 10, 2, 6, z) }
  if (v === "NE") block(cv, 1, 11, 7, 6, z)
  if (v === "N") block(cv, 6, 11, 8, 6, z)
}

// Beanie and gas mask.
function gear(cv, v) {
  const x = FRONTAL(v) ? 7 : 5
  block(cv, x, 0, 6, 1, "R")
  block(cv, x - 1, 1, 8, 1, "R")
  block(cv, x - 2, 2, 10, 1, "U")
  if (v === "S") { block(cv, 6, 4, 8, 4, "m"); block(cv, 7, 5, 2, 1, "y"); block(cv, 11, 5, 2, 1, "y"); block(cv, 8, 7, 4, 2, "m") }
  if (v === "SE") { block(cv, 5, 4, 8, 4, "m"); block(cv, 6, 5, 2, 1, "y"); block(cv, 10, 5, 2, 1, "y"); block(cv, 8, 7, 5, 2, "m") }
  if (v === "E") { block(cv, 8, 4, 5, 4, "m"); block(cv, 10, 5, 2, 1, "y"); block(cv, 11, 7, 3, 2, "m") }
  if (v === "NE") block(cv, 11, 5, 2, 3, "m")
}

function player(v, f) {
  const cv = canvas(24), behind = v === "NE" || v === "N", face = FRONTAL(v) ? 5 : 3
  paint(cv, pLegs(v, f), 0, 18)
  if (behind) paint(cv, P_ARMS[v], 0, 10)
  paint(cv, P_BODY[v], 0, 10)
  pack(cv, v)
  paint(cv, P_HAIR, FRONTAL(v) ? 0 : -2)
  block(cv, face + 2, 9, 6, 1, "s")
  if (P_FACE[v]) paint(cv, P_FACE[v], face, 3)
  gear(cv, v)
  if (!behind) paint(cv, P_ARMS[v], 0, 10)
  return gridText(cv)
}

// --- Zombie: 20x25. The head leads the walk ---

const Z_HEAD = {
  S: part(`
    ......gAAAAggg......
    ......AAgggggg......
    ....ggAggggggggg....
    ....gAgggggggggG....
    ....gggrrggrrggG....
    ....gggrrggrrggG....
    ....gggkwkkwkggG....
    ....gggkkkkkkggG....
    ......GggggggG......
    ......GGGGGGGG......`),
  SE: part(`
    ....gAAAAggg........
    ....AAgggggg........
    ..ggAggggggggg......
    ..gAgggggggggG......
    ..ggggrrggrrgG......
    ..ggggrrggrrgG......
    ..ggggkwkkwkgG......
    ..ggggkkkkkkgG......
    ....GggggggG........
    ....GGGGGGGG........`),
  E: part(`
    ....gAAAAggg........
    ....AAgggggg........
    ..ggAggggggggg......
    ..gAgggggggggG......
    ..ggggggggrrgG......
    ..ggggggggrrgG......
    ..ggggggkwkwkG......
    ..ggggggkkkkkG......
    ....GggggggG........
    ....GGGGGGGG........`),
  NE: part(`
    ....gAAAAggg........
    ....AAgggggg........
    ..ggAggggggggg......
    ..gAgggggggggG......
    ..ggGGgggggggG......
    ..ggGGgggggrgG......
    ..gggggggggggG......
    ..GggggggggggG......
    ....GggggggG........
    ....GGGGGGGG........`),
  N: part(`
    ......gAAAAggg......
    ......AAgggggg......
    ....ggAggggggggg....
    ....gAgggggggggG....
    ....ggggggggggGG....
    ....gggGGggggggG....
    ....ggggggggggGG....
    ....ggggggggggGG....
    ......GggggggG......
    ......GGGGGGGG......`),
}

const Z_BODY = {
  S: part(`
    .....cccccccccc.....
    .....cccccccccc.....
    .....cccccccccc.....
    .....cccccccccc.....
    .....ccccRRcccc.....
    .....cccRRRcccc.....
    .....cckkcccccc.....
    .....cckk.cccc......`),
  SE: part(`
    ..cccccccc..........
    ..cccccccc..........
    ..cccccccc..........
    ..cccccccc..........
    ..ccccRRcccc........
    ..cccRRRcccc........
    ..cckkcccccc........
    ..cckk.cccc.........`),
  E: part(`
    ...ccccccc..........
    ...ccccccc..........
    ...ccccccc..........
    ...ccccccc..........
    ...ccccRcccc........
    ...cccRRcccc........
    ...cckkccccc........
    ...cck.cccc.........`),
  NE: part(`
    ..cccccccc..........
    ..cccccccc..........
    ..cccccccc..........
    ..cccccccc..........
    ..cccccccccc........
    ..cccccccccc........
    ..cccccccccc........
    ..c.cccc.ccc........`),
  N: part(`
    .....cccccccccc.....
    .....cccccccccc.....
    .....cccccccccc.....
    .....cccccccccc.....
    .....cccccccccc.....
    .....cccccccccc.....
    .....cccccccccc.....
    .....c.cccc.ccc.....`),
}

const Z_LEGS_E = {
  0: part(`
    ....qqqqqq..........
    ....qqqqqq..........
    ....qqqqqq..........
    ....qqqqqq..........
    ....AgggggG.........
    ....GGGGGGG.........`),
  1: part(`
    ...qqqqqqqq.........
    ...qqq..qqq.........
    ..qqq....qqq........
    ..qq......qq........
    .AgG......AggG......
    .GGG......GGGG......`),
}
Z_LEGS_E[3] = Z_LEGS_E[1]

const zLegs = (v, f) => (v === "E" ? Z_LEGS_E[f] : FRONTAL(v) ? legs(5, 11, "qqqq", "AggG", "GGGG", f) : legs(2, 8, "qqqq", "AggG", "GGGG", f))

const Z_ARM = part(`
  ..........AAAAAAAA..
  ..........gggggggg..
  ..........GGGGGGGG..
  ..........GGGGGGkG..`)
const Z_ELBOWS = part(`
  ....................
  ...gg..........gg...
  ...gG..........gG...
  ...GG..........GG...`)
const Z_SPREAD = part(`
  .AAAA..........AAAA.
  .gggg..........gggg.
  .GGGG..........GGGG.`)

// Per view: arm, whether it is behind the body, head offset.
const Z_VIEWS = {
  S: { arm: Z_SPREAD },
  SE: { arm: Z_ARM, headX: 1, headY: 1 },
  E: { arm: Z_ARM, headX: 2 },
  NE: { arm: Z_ARM, behind: true, headX: 1, headY: -1 },
  N: { arm: Z_ELBOWS, behind: true, headY: -1 },
}

function zombie(view, f) {
  const v = Z_VIEWS[view], cv = canvas(25)
  paint(cv, zLegs(view, f), 0, 19)
  if (v.behind) paint(cv, v.arm, 0, 11)
  paint(cv, Z_BODY[view], 0, 11)
  paint(cv, Z_HEAD[view], v.headX || 0, (v.headY || 0) + 1)
  if (!v.behind) paint(cv, v.arm, 0, 11)
  return gridText(cv)
}

// Three frames per view: stand, left step, right step.
for (const v of VIEWS) {
  anim(`player_${v}`, { w: 20, h: 24, fps: 8 },
    frame(grid(0, 0, player(v, 0))), frame(grid(0, 0, player(v, 1))), frame(grid(0, 0, player(v, 3))))
  anim(`zombie_${v}`, { w: 20, h: 25, fps: 5 },
    frame(grid(0, 0, zombie(v, 0))), frame(grid(0, 0, zombie(v, 1))), frame(grid(0, 0, zombie(v, 3))))
}

// --- Tank: 28x32. Slow mutant with growths ---

const T_SKIN = { skin: "G", light: "g", dark: "J", chest: "J", cloth: "c", pants: "V", footL: "g", foot: "J" }

// One leg, rows 26-31. Lifted legs end 2 rows higher.
function tankLeg(c, x, lifted) {
  const s = T_SKIN, top = lifted ? 28 : 30
  c.rect(x, 26, 6, top - 26, s.pants)
  c.rect(x, top, 6, 1, s.footL)
  c.rect(x, top + 1, 6, 1, s.foot)
}

function tankLegs(c, v, f) {
  const s = T_SKIN
  if (v === "E") {
    if (f === 0) { c.rect(9, 26, 8, 4, s.pants); c.rect(9, 30, 10, 1, s.footL); c.rect(9, 31, 10, 1, s.foot); return }
    const backUp = f === 3
    c.rect(9, 26, 9, 1, s.pants)
    c.rect(7, 27, 5, backUp ? 2 : 3, s.pants); c.rect(6, backUp ? 29 : 30, 6, 1, s.footL); c.rect(6, backUp ? 30 : 31, 6, 1, s.foot)
    c.rect(15, 27, 5, backUp ? 3 : 2, s.pants); c.rect(15, backUp ? 30 : 29, 7, 1, s.footL); c.rect(15, backUp ? 31 : 30, 7, 1, s.foot)
    return
  }
  const xs = FRONTAL(v) ? [6, 16] : [6, 14]
  tankLeg(c, xs[0], f === 1)
  tankLeg(c, xs[1], f === 3)
}

function tankHead(c, v) {
  const s = T_SKIN, x = FRONTAL(v) ? 9 : v === "E" ? 12 : 11, o = v === "SE" ? 1 : 0
  c.rect(x + 1, 0, 8, 1, s.skin); c.rect(x, 1, 10, 6, s.skin); c.rect(x + 1, 7, 8, 1, s.dark); c.rect(x + 1, 1, 6, 1, s.light)
  if (v === "S" || v === "SE") {
    c.rect(x + 2 + o, 2, 2, 2, "r"); c.rect(x + 6 + o, 2, 2, 2, "r")
    c.rect(x + 2 + o, 4, 6, 2, "k"); c.px(x + 3 + o, 4, "w"); c.px(x + 6 + o, 4, "w")
  }
  if (v === "E") { c.rect(x + 6, 2, 2, 2, "r"); c.rect(x + 5, 4, 5, 2, "k"); c.px(x + 6, 4, "w") }
  if (v === "NE") { c.rect(x + 2, 3, 3, 2, s.dark); c.px(x + 8, 3, "r") }
  if (v === "N") c.rect(x + 3, 3, 4, 2, s.dark)
}

function tankBody(c, v) {
  const s = T_SKIN
  if (FRONTAL(v)) {
    c.rect(1, 8, 26, 5, s.skin); c.rect(1, 8, 26, 1, s.light)
    c.rect(0, 12, 5, 11, s.skin); c.rect(23, 12, 5, 11, s.skin); c.rect(0, 22, 5, 3, s.dark); c.rect(23, 22, 5, 3, s.dark)
    c.rect(5, 13, 18, 9, s.chest)
    if (v === "S") c.rect(6, 17, 16, 1, s.skin); else c.rect(13, 13, 2, 9, s.skin)
    c.rect(5, 22, 18, 4, s.cloth)
  } else if (v === "E") {
    c.rect(6, 8, 16, 5, s.skin); c.rect(6, 8, 16, 1, s.light)
    c.rect(7, 13, 13, 9, s.chest)
    c.rect(7, 22, 13, 4, s.cloth)
    c.rect(11, 11, 7, 12, s.skin); c.rect(11, 11, 1, 11, s.dark); c.rect(17, 11, 1, 11, s.dark); c.rect(11, 22, 7, 3, s.dark)
  } else {
    c.rect(2, 8, 23, 5, s.skin); c.rect(2, 8, 23, 1, s.light)
    c.rect(1, 12, 4, 10, s.skin); c.rect(1, 21, 4, 3, s.dark)
    c.rect(21, 12, 6, 11, s.skin); c.rect(21, 22, 6, 3, s.dark)
    c.rect(5, 13, 16, 9, s.chest)
    if (v === "SE") c.rect(6, 17, 14, 1, s.skin); else c.rect(10, 13, 2, 9, s.skin)
    c.rect(5, 22, 16, 4, s.cloth)
  }
}

// Growths follow the turn of the body.
const T_GROWTHS = {
  S: [[5, 8, 5], [23, 7, 3], [25, 18, 3]],
  SE: [[4, 8, 5], [21, 7, 3], [3, 18, 3]],
  E: [[7, 8, 5], [9, 15, 3]],
  NE: [[6, 8, 5], [22, 8, 3], [14, 17, 3]],
  N: [[22, 8, 5], [6, 7, 3], [14, 17, 3]],
}

function tankFrame(c, v, f) {
  tankLegs(c, v, f)
  tankBody(c, v)
  tankHead(c, v)
  for (const [x, y, r] of T_GROWTHS[v]) {
    c.circ(x, y, r, "P"); c.circ(x - 1, y - 1, r > 3 ? 2 : 1, "i"); c.px(x - 2, y - 2, "w")
  }
}

// --- Boss: necromancer, 48x52. Floats in the game, the hem waves ---

const skull = (c, x, y) => {
  c.circ(x, y, 4, "F")
  c.rect(x - 2, y - 1, 2, 2, "k"); c.rect(x + 1, y - 1, 2, 2, "k"); c.px(x - 2, y - 1, "x"); c.px(x + 2, y - 1, "x"); c.px(x, y + 2, "k")
}
const staff = (c, x) => { c.rect(x, 8, 2, 44, "C"); skull(c, x + 1, 5) }

const BOSS_VIEWS = {
  S(c) {
    staff(c, 2)
    c.poly([24, 12, 41, 22, 44, 52, 4, 52, 7, 22], "V")
    c.poly([24, 22, 33, 26, 36, 52, 12, 52, 15, 26], "P")
    c.rect(23, 18, 2, 34, "V")
    c.ellipse(24, 11, 11, 11, "V"); c.ellipse(24, 13, 8, 8, "k")
    c.rect(19, 11, 3, 2, "x"); c.rect(26, 11, 3, 2, "x"); c.px(20, 11, "w"); c.px(27, 11, "w")
    c.rect(20, 16, 8, 1, "F"); c.rect(21, 17, 6, 2, "f")
    c.rect(7, 26, 8, 4, "P"); c.rect(33, 26, 8, 4, "P"); c.rect(5, 29, 4, 3, "F"); c.rect(39, 29, 4, 3, "F")
    c.rect(17, 30, 14, 2, "y"); c.rect(22, 30, 4, 4, "x")
  },
  SE(c) {
    staff(c, 3)
    c.poly([27, 12, 40, 22, 46, 52, 8, 52, 14, 22], "V")
    c.poly([27, 24, 36, 28, 40, 52, 14, 52, 18, 28], "P")
    c.rect(27, 20, 2, 32, "V")
    c.ellipse(27, 11, 11, 11, "V"); c.ellipse(29, 13, 7, 8, "k")
    c.rect(26, 11, 3, 2, "x"); c.rect(32, 11, 3, 2, "x"); c.px(27, 11, "w"); c.px(33, 11, "w")
    c.rect(27, 16, 7, 1, "F"); c.rect(28, 17, 5, 2, "f")
    c.rect(10, 26, 7, 4, "P"); c.rect(8, 29, 4, 3, "F")
    c.rect(36, 26, 8, 4, "P"); c.rect(41, 29, 4, 3, "F")
    c.rect(20, 30, 16, 2, "y"); c.rect(27, 30, 4, 4, "x")
  },
  E(c) {
    c.poly([22, 12, 34, 16, 38, 26, 42, 52, 8, 52, 12, 26], "V")
    c.poly([24, 26, 32, 30, 36, 52, 14, 52, 16, 30], "P")
    c.ellipse(26, 11, 10, 11, "V"); c.ellipse(31, 13, 5, 7, "k")
    c.rect(32, 11, 3, 2, "x"); c.px(33, 11, "w"); c.rect(31, 16, 4, 1, "F"); c.rect(31, 17, 3, 2, "f")
    c.rect(16, 30, 18, 2, "y")
    staff(c, 39)
    c.rect(24, 26, 15, 4, "P"); c.rect(24, 26, 15, 1, "V"); c.rect(37, 27, 4, 3, "F")
  },
  NE(c) {
    c.poly([23, 12, 36, 22, 42, 52, 6, 52, 10, 22], "V")
    c.poly([23, 24, 32, 28, 38, 52, 10, 52, 14, 28], "P")
    c.rect(21, 20, 2, 32, "V")
    staff(c, 42)
    c.ellipse(23, 11, 11, 11, "V"); c.ellipse(22, 9, 6, 4, "P"); c.ellipse(32, 13, 2, 5, "k"); c.px(32, 12, "x")
    c.rect(8, 26, 6, 4, "P"); c.rect(34, 26, 8, 4, "P"); c.rect(39, 29, 4, 3, "F")
  },
  N(c) {
    c.poly([24, 12, 41, 22, 44, 52, 4, 52, 7, 22], "V")
    c.poly([24, 22, 33, 26, 36, 52, 12, 52, 15, 26], "P")
    c.rect(23, 18, 2, 34, "V")
    staff(c, 42)
    c.ellipse(24, 11, 11, 11, "V"); c.ellipse(24, 9, 6, 4, "P")
    c.rect(7, 26, 8, 4, "P"); c.rect(33, 26, 8, 4, "P"); c.rect(5, 29, 4, 3, "F"); c.rect(39, 29, 4, 3, "F")
  },
}

// Cuts a moving wave out of the hem, rows 49-51.
const bossHem = (c, f) => {
  for (let x = 0; x < 48; x++) {
    const d = (x + f * 4) % 16
    if (d < 4) c.rect(x, 49, 1, 3, "_")
    else if (d < 8) c.rect(x, 51, 1, 1, "_")
  }
}

for (const v of VIEWS) {
  anim(`tank_${v}`, { w: 28, h: 32, fps: 5 },
    frame((c) => tankFrame(c, v, 0)), frame((c) => tankFrame(c, v, 1)), frame((c) => tankFrame(c, v, 3)))
  anim(`boss_${v}`, { w: 48, h: 52, fps: 5 },
    ...[0, 1, 2].map((f) => frame((c) => { BOSS_VIEWS[v](c); bossHem(c, f) })))
}

// --- Power-ups: the game adds the outline and the spin ---

sprite("pick_spd", `
  .....ooooo.....
  ...ooOOOOOoo...
  ..oOOOOOxxOOo..
  .oOOOOOxxOOOOo.
  .oOOOOxxxOOOOo.
  oOOOOxxxOOOOOOo
  oOOOxxxxxxxOOOo
  oOOOOOOxxxOOOOo
  oOOOOOxxxOOOOOo
  oOOOOxxxOOOOOOo
  .oOOOxxOOOOOOo.
  .oOOOxOOOOOOOo.
  ..oOOOOOOOOOo..
  ...ooOOOOOoo...
  .....ooooo.....`)

sprite("pick_dmg", `
  .....RRRRR.....
  ...RRrrrrrRR...
  ..RrrrrrrrwwR..
  .RrrrrrrrwwwrR.
  .RrrrrrrwwwrrR.
  RrrrrrrwwwrrrrR
  RrrrrrwwwrrrrrR
  RrryrwwwrrrrrrR
  RrrryywrrrrrrrR
  RrrrryyrrrrrrrR
  .RrrwryyrrrrrR.
  .RrwwrrryrrrrR.
  ..RrrrrrrrrrR..
  ...RRrrrrrRR...
  .....RRRRR.....`)

// Boss orb.
sprite("orb", { outline: "k" }, `
  ..PPPP..
  .PiiPPP.
  PiwiPPPV
  PiiPPPPV
  PPPPPPVV
  PPPPPVVV
  .PPVVVV.
  ..VVVV..`)

// Heart: gives back one life.
sprite("pick_hp", `
  ..rrrr...rrrr..
  .rrrrrr.rrrrrr.
  rwwrrrrrrrrrrrR
  rwwrrrrrrrrrrrR
  rwrrrrrrrrrrrRR
  rrrrrrrrrrrrrRR
  .rrrrrrrrrrrRR.
  ..rrrrrrrrrRR..
  ...rrrrrrrRR...
  ....rrrrrRR....
  .....rrrRR.....
  ......rRR......
  .......R.......`)

// --- Gun and HUD ---

// Pivot near (3, 3), see GUN_PIVOT.
sprite("gun", x2(`
  mmnnnnn
  .mmmnnn
  .mm....`), grid(0, 0, `
  .....wwwwwwww.`))

sprite("cross", x2(`
  ...w...
  ...w...
  .......
  ww...ww
  .......
  ...w...
  ...w...`))

sprite("heart", x2(`
  .rr.rr.
  rwrrrwr
  rrrrrrr
  .rrrrr.
  ..rrr..`), grid(0, 0, `
  ..............
  ..............
  ..........rr..
  ..........rr..
  ............RR
  ............RR
  ..........RR..
  ..........RR..
  ........RR....
  ........RR....`))

// --- Ground ---

sprite("tuft", x2(`
  t..t
  .tt.`))
sprite("pebble", x2(`
  .E
  EE`))
