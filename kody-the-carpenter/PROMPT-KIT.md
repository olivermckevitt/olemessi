# Kody the Carpenter — Prompt Kit

Use this with ChatGPT image gen, or any line-art model. Generate **one page at a time**. Paste the locked character block every time. If you skip it, the hair and clothes will drift.

Reference image: `references/kody-character-locked.png`. Attach it on every generation. That is option D with five-digit hands.

## Locked character block (paste every time)

```
Children's colouring book page, pure black line art on plain white background, no grey fills, no shading, no screentone, no watercolor, no color.

Character: Kody, a cute cartoon boy about 5 years old. Big round head, small chibi body. Tight curly hair in clear separate ringlets (about 20 curls, colourable gaps between them), hair sticking out under a simple hard hat. Huge oval eyes with one circular highlight each, no eyelashes. Round cheeks, big open smile, two small upper teeth.

Clothes: short-sleeve t-shirt (NOT overalls, NOT sleeveless), simple work pants, chunky lace-up work boots with thick soles. A carpenter tool belt with a square buckle, tape measure in the left pouch, carpenter pencil and a small spirit level in the right pouch.

Hard hat is ALWAYS on. Dimples in both cheeks. Friendly, not realistic. Hands have FIVE digits: four fingers plus a clearly separate thumb. No cartoon three-finger gloves. No four-finger mittens. Thick extra-bold outlines (5-7pt), large colour-in shapes, very little inner detail. 70-80% white space. 1-2 oversized objects only. Tiny grass tufts OK. Full figure unless the page says close-up. Looking at the viewer. Print-ready colouring book illustration, A5 portrait, single character, no background clutter, no text, no watermark, no logo, no Koda Built.
```

## Negative block (paste every time)

```
Do not: color, grey shading, crosshatching, tiny texture, realistic anatomy, adult face, overalls, bare chest, tank top, three-finger cartoon hands, four-finger mittens, circular saw, table saw, mitre saw, skill saw, nail gun, blood, injury, extra kids, parents, photorealism, 3D render, busy background, fence clutter, written words, brand logos, Koda Built, extra pouches, skinny fashion legs, small un-colourable details in the hair, waving pose, thumbs-up, ta-da.
```

## How to run it

1. Attach `kody-character-locked.png`.
2. Paste locked character block + negative block + the page prompt below.
3. If the hat comes off, the shirt becomes overalls, or the hair turns into a black scribble, reject and rerun.
4. Crop to leave a caption band at the bottom (about 1.5 inches empty). You will typeset the caption in the layout file, not inside the drawing.

---

## Opening pages

Match `pages/opening/` which is already drawn. Do not regenerate unless a page fails the lock.

### Page 1 — Meet Kody
Kody walking toward a garage with a board under his arm. Working pose, not a wave.

### Page 2 — Workshop
Kody leaning over a plan on the workbench.

### Page 3 — Hammer
Kody hammering a nail into a board. Other hand steadies the wood.

### Page 4 — Saw
A long timber on TWO sawhorses. Handsaw blade IN the wood, mid-cut. Handsaw only. Not a skill saw.

### Page 5 — Tape measure
Kody kneeling, stretching a tape along the board. Numbers 1, 2, and 3 only.

### Page 6 — Level
Kody sets a spirit level on the board and checks the bubble. Not a belt close-up.

### Page 7 — Safety
Kody putting on a glove. Glasses and ear muffs already on. Hard hat stays on.

### Page 8 — Ready
Kody carrying a stack of cut boards with both hands. Walking toward the yard.

---

## Build template

One image per build. Not three.

Kody building [OBJECT], which is finished enough to recognise. He uses [TOOL]. Working pose: crouch, kneel, or bend. Safety glasses on. Ear muffs on only if the tool is a drill or saw. Object is simple, chunky, colourable. 70-80% white space. 1-2 oversized objects only.

| Build | Object | Tool | Extra | Pose |
| --- | --- | --- | --- | --- |
| 1 | three-step wooden stairs | hammer | review: `r21-stairs.png` | kneeling, nailing a step |
| 2 | 4-pane window going into a wall opening | hands | review: `r22-window.png` | lifting the window in |
| 3 | four-legged stool | hammer | nailing a leg | crouching |
| 4 | square picture frame | screwdriver | blank rectangle inside the frame | sitting at bench |
| 5 | toy box with lid | screwdriver | 3 chunky toys inside | bending over the box |
| 6 | short bookshelf, 3 shelves | level | 5 chunky books | standing, checking |
| 7 | picnic table with two benches | hammer | **cut** extra only: `15-picnic.png` | bending, nailing the top |
| 8 | lemonade stand with sign | hammer | outline letters LEMONADE, pitcher, 2 cups | assembling |
| 9 | kid-sized wooden fort with one square window | hammer | blank flag | carrying a board into the door. Not ta-da. |
| 10 | kid-sized wooden wishing well, bucket, pitched roof | hammer | drawn: `18-well.png` | on a short step ladder, nailing VERTICAL scalloped shingles (tall with rounded bottoms, not horizontal timber) |
| extra | Victorian door architrave with 45-degree mitre | hammer | review: `r32-architrave.png` | nailing the mitred head corner, stepped ogee casing |
| extra | simple slim skirting board | hammer | review: `r33-skirting.png` | kneeling, holding a boot-height bevelled board |

---

## Close pages

### Clean up
Kody sweeping with a broom. Pegboard now has tools hanging in the outlines. Small scrap bin. Happy, not tired.

### Pegboard
The workshop pegboard filled: hammer, saw, tape, screwdriver, drill each in a matching outline. Kody standing beside it, small. Big colourable tools.

### Your turn
Kody holding a large blank rectangular board like a sign, facing the viewer, big grin, hard hat and tool belt on. The board is empty so a child can draw on it. No other objects.

### High five
Close-up of Kody, one hand raised for a high five, hard hat and tool belt on, big smile. Lots of white space.

---

## Cover prompt (coloured)

```
Children's book cover illustration of Kody the carpenter, same character as the reference: curly hair with dimples, hard hat, t-shirt, tool belt, chunky boots, crouching or carrying a board, big smile. Simple, bold, friendly. Yellow hard hat, otherwise limited flat colours, clean outlines, lots of white. Leave space at the top for the title. No other characters. Not a colouring page: this one may be coloured. No Koda Built logo.
```

Still no logos. Still no overalls.

---

## Quick reject checklist

Rerun if any of these show up:

- Overalls or a bare midriff
- Hard hat missing
- Hair is a black scribble with no colourable gaps
- Grey shading inside the drawing
- Circular saw or any bench power tool
- Adult proportions
- Extra people
- Text baked into the image (except the lemonade sign and the optional "LEMONADE" outlines)
- Tiny unreadable tools on the belt
- Three-finger cartoon hands. Need four fingers plus a thumb.
