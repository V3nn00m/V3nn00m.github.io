---
title: "CH1.27 Example: a bug in Angband"
published: 2026-04-24
description: "A real-world array overflow bug in the classic rogue-like game Angband and how players exploited it"
author: "0xV3n0m"
category: "Re4B"
tags: ["Reverse Engineering", "Books", "Assembly"]
image: "/assets/img/reversee29.jpeg"
draft: false
lang: "eng"

# Series configuration
type: "course"
series: "re4b"
seriesOrder: 29
seriesTitle: "Reverse Engineering for Beginners"
seriesDescription: "A beginner-friendly book covering x86/x64 reverse engineering through real compiler output and code patterns."
seriesImage: "/assets/img/RE4B.png"
---
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<div style="line-height:1.9; font-size:21px; direction:ltr;">
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.27 Example: a bug in Angband</b></h1>
<hr>

<p>
The author mentioned that there was a bug in an old rogue-like game from the nineties that had a fascinating bug carrying the spirit of "Roadside Picnic" by the Strugatsky brothers or the TV series "The Lost Room":
</p>
<p>
The frog-knows version was full of bugs. The funniest one allowed a devilish cheating technique in the game, which players called "mushroom farming".
If there were more than a certain number (around five hundred) of objects in the dungeon, the game would corrupt, and many old things would turn into objects thrown on the floor.
So the player would enter the dungeon, dig long corridors (with a special spell), and walk through those corridors creating mushrooms using another spell.
When there were enough mushrooms, the player would drop and pick up, drop and pick up any useful item, and the mushrooms one by one would turn into that item.
The player would then exit with hundreds of copies of the useful item.
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>How the bug works</b></h2>

<p>
In short, the game used <b style="color:cornflowerblue;">fixed-size global arrays</b> to store all the objects (weapons, armor, mushrooms, treasures...) present on the floor of the level. The game counted the number of items on the floor, and when that count exceeded a certain limit (around 256 items) the bug would trigger.
</p>
<p>
The game used a fixed-size array (such as <code style="color:chartreuse;">t_list[MAX_TALLOC]</code> or <code style="color:chartreuse;">sorted_objects[MAX_DUNGEON_OBJ]</code>).
</p>
<p>
The <code style="color:chartreuse;">MAX_DUNGEON_OBJ</code> was 423, but when the number of items on the floor exceeded <b style="color:cornflowerblue;">256</b> (not 423!), the index would wrap around or cause a memory overflow. The result was that every old thing (artifacts, weapons, etc.) would turn into "objects thrown to the floor". Players discovered they could exploit this by doing "mushroom farming" creating hundreds of mushrooms with a spell, then dropping and picking up a useful item, and the mushrooms would turn into that item one by one. They would exit with hundreds of copies.
</p>
<p>
Here is the code the author found in the source (version 2.4 fk):
</p>

```c
#define MAX_DUNGEON_OBJ 423           // maximum number of objects allowed on dungeon floor

int16 sorted_objects[MAX_DUNGEON_OBJ]; // array of sorted object indices (fixed size = 423)
int8u object_ident[OBJECT_IDENT_SIZE]; // object identification flags
int16 t_level[MAX_OBJ_LEVEL+1];        // object level table
inven_type t_list[MAX_TALLOC];         // full inventory list of all dungeon objects
inven_type inventory[INVEN_ARRAY_SIZE]; // player's personal inventory
```

<p>
Since I don't like just reading, I decided to download this old game, find the version that contains the bug, and try to reproduce it myself. I found it, and to be honest I also modified several things in the game so that when the bug triggers it would give me something like an alert to confirm that it actually fired.
</p>
<p>
Anyway, let's try it.
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>Reproducing the bug</b></h2>

<p>
First thing after launching the game I set up the character:
</p>
<img src="/assets/x32dbg2/angband_1.png" alt="angband character setup" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
Then I entered the game:
</p>
<img src="/assets/x32dbg2/angband_2.png" alt="angband in-game" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
I set the level to the highest level as the book described, and started placing 300 elements to trigger the bug:
</p>
<img src="/assets/x32dbg2/angband_3.png" alt="angband placing items" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
Then I used <code style="color:chartreuse;">Ctrl+G</code> to drop items:
</p>
<img src="/assets/x32dbg2/angband_4.png" alt="angband dropping items" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
And indeed they were placed around me. I started moving and trying to pick up whatever was there and drop it until the alert appeared:
</p>
<img src="/assets/x32dbg2/angband_5.png" alt="angband bug triggered alert" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
And that is exactly what we explained above.
</p>
<p>
Of course I tried to make this as hands-on as possible so the concept would be explained and understood more clearly and be visible nothing more. Besides, the game has newer versions released, but I did this just to apply it myself and share the experience that's all.
</p>

</div>