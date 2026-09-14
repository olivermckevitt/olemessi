# Kody the Carpenter — Prompt Kit

Use this with ChatGPT image gen, or any line-art model. Generate **one page at a time**. Paste the locked character block every time. If you skip it, the hair and clothes will drift.

Reference image: `references/kody-character-locked.png`. Attach it on every generation. That is option D with five-digit hands.

## Locked character block (paste every time)

```
Children's colouring book page, pure black line art on plain white background, no grey fills, no shading, no screentone, no watercolor, no color.

Character: Kody, a cute cartoon boy about 5 years old. Big round head, small chibi body. Tight curly hair in clear separate ringlets (about 20 curls, colourable gaps between them), hair sticking out under a simple hard hat. Huge oval eyes with one circular highlight each, no eyelashes. Round cheeks, big open smile, two small upper teeth.

Clothes: short-sleeve t-shirt (NOT overalls, NOT sleeveless), simple work pants, chunky lace-up work boots with thick soles. A carpenter tool belt with a square buckle, tape measure in the left pouch, carpenter pencil and a small spirit level in the right pouch.

Hard hat is ALWAYS on. Friendly, not realistic. Hands have FIVE digits: four fingers plus a thumb. No cartoon three-finger gloves. Thick clean outlines, large colour-in shapes, very little inner detail. Full figure unless the page says close-up. Looking at the viewer. Print-ready colouring book illustration, single character, lots of white space, no background clutter, no text, no watermark, no logo.
```

## Negative block (paste every time)

```
Do not: color, grey shading, crosshatching, tiny texture, realistic anatomy, adult face, overalls, bare chest, tank top, three-finger cartoon hands, circular saw, table saw, mitre saw, nail gun, blood, injury, extra kids, parents, photorealism, 3D render, busy background, written words, brand logos, extra pouches, skinny fashion legs, small un-colourable details in the hair.
```

## How to run it

1. Attach `kody-character-v1.jpg`.
2. Paste locked character block + negative block + the page prompt below.
3. If the hat comes off, the shirt becomes overalls, or the hair turns into a black scribble, reject and rerun.
4. Crop to leave a caption band at the bottom (about 1.5 inches empty). You will typeset the caption in the layout file, not inside the drawing.

---

## Opening pages

### Page 1 — Meet Kody
Full-body Kody, standing tall, arms out in a ta-da pose, big grin, tool belt on, hard hat on, empty white space all around. No workshop. No extra tools in his hands.

### Page 2 — Workshop
Kody standing in a very simple workshop: one workbench, one pegboard with 5 empty tool outlines (hammer, saw, tape measure, screwdriver, drill), one small three-legged stool, one square window. Lots of white. No clutter.

### Page 3 — Hammer
Kody holding a claw hammer up proudly in one hand, other hand thumbs-up. Optional: one nail and a small scrap of wood on the floor. No other tools.

### Page 4 — Saw
Kody using a handsaw on a plank resting on a simple sawhorse. Two hands on the saw. A few big sawdust dots. Friendly, not dangerous. Handsaw only.

### Page 5 — Tape measure
Kody stretching a tape measure across a wooden board. Tape is a long rectangle with the numbers 1, 2, and 3 only. Focused happy face.

### Page 6 — Tool belt close-up
Close-up of Kody's tool belt at waist height. T-shirt hem and pants visible. Pouches hold: tape measure, screwdriver, carpenter pencil, small level. Hammer in a belt loop. Optional chunky cordless drill on the bench beside him. Big, colourable, not a tiny product diagram.

### Page 7 — Safety
Kody putting on the last of his safety gear: glasses already on, ear muffs on, pulling on simple work gloves. Hard hat stays on. Big happy face. Optional drill on the bench as the reason for ear muffs. No extra people.

### Page 8 — Ready
Full-body Kody in full gear (hat, glasses, ear muffs, gloves, tool belt) standing next to a neat stack of 5 wooden boards. Excited pose, arms wide. Clean white space.

---

## Build template

One image per build. Not three.

Kody building [OBJECT], which is finished enough to recognise. He uses [TOOL]. Safety glasses on. Ear muffs on only if the tool is a drill or saw. Object is simple, chunky, colourable. Minimal background. Large colour-in shapes.

| Build | Object | Tool | Extra |
| --- | --- | --- | --- |
| 1 | small birdhouse | hammer | one simple cartoon bird |
| 2 | rectangular planter box | screwdriver | one flower and a dirt mound |
| 3 | four-legged stool | hammer | Kody sitting on it, feet dangling |
| 4 | square picture frame | screwdriver | blank rectangle inside the frame |
| 5 | toy box with lid | screwdriver | 3 chunky toys inside |
| 6 | short bookshelf, 3 shelves | level | 5 chunky books |
| 7 | doghouse with round door | hammer | simple floppy-ear dog in the door |
| 8 | picnic table with two benches | hammer | plate and apple |
| 9 | lemonade stand with sign | hammer | outline letters LEMONADE, pitcher, 2 cups |
| 10 | kid-sized wooden fort with one square window | hammer | blank flag, Kody in the doorway |

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
Children's book cover illustration of Kody the carpenter, same character as the reference: curly hair, hard hat, t-shirt, tool belt, chunky boots, holding a hammer, thumbs up, big smile. Simple, bold, friendly. Yellow hard hat, otherwise limited flat colours, clean outlines, white or pale workshop background. Leave space at the top for the title. No other characters. Not a colouring page: this one may be coloured.
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
