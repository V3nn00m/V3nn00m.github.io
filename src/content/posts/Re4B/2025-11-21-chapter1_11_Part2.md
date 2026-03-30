---
title: "CH1.11 - printf() With Several Arguments (Part 2)"
published: 2025-11-22
description: "Continuing the analysis of printf() with multiple arguments, covering ARM and MIPS calling conventions"
author: "0xV3n0m"
category: "Re4B"
tags: ["Reverse Engineering", "Books", "Assembly"]
image: "/assets/img/reverse10.png"
draft: false
lang: "eng"

# Series configuration
type: "course"
series: "re4b"
seriesOrder: 10
seriesTitle: "Reverse Engineering for Beginners"
seriesDescription: "A beginner-friendly book covering x86/x64 reverse engineering through real compiler output and code patterns."
seriesImage: "/assets/img/RE4B.png"
---

<div style="line-height:1.9; font-size:21px; direction:ltr;">

<h1 style="color:#9a3ba6;"><b>ARM</b></h1>
<img src="/assets/img/Arm2.png" alt="Arm2" style="display:block; margin:20px auto; border-radius:12px; max-width:60%;">


<hr>

<h2 style="color:#3ba2a6;"><b>ARM: 3 integer arguments</b></h2>

<p>
The author said that the traditional ARM method for passing arguments (the calling convention) works as follows:
</p>

<p>
The first 4 arguments are sent through the registers <b style = "color: chartreuse;">R0 to R3</b>, and the rest through the stack.
And he said that this is similar to the method of passing arguments in <b style = "color: #de0e65; ">fast-call or Win64</b> but this will be explained a little bit later.
</p>

<h2 style="color:#3ba2a6;"><b>ARM 32-bit</b></h2>

<h3 style="color:#3ba2a6;"><b>Keil 6/2013 (without Optimization) – ARM mode</b></h3>

```assembly
Listing 1.53: Non-optimizing Keil 6/2013 (ARM mode)

.text:00000000 main
.text:00000000 10 40 2D E9   STMFD   SP!, {R4,LR}      ; save R4 and LR (return address) on stack
.text:00000004 03 30 A0 E3   MOV     R3, #3            ; move value 3 into R3 (third argument)
.text:00000008 02 20 A0 E3   MOV     R2, #2            ; move value 2 into R2 (second argument)
.text:0000000C 01 10 A0 E3   MOV     R1, #1            ; move value 1 into R1 (first argument)
.text:00000010 08 00 8F E2   ADR     R0, aADBDCD       ; load address of format string into R0
                                                        ; "a=%d; b=%d; c=%d"
.text:00000014 06 00 00 EB   BL      __2printf         ; branch with link to printf (call printf)
.text:00000018 00 00 A0 E3   MOV     R0, #0            ; move 0 into R0 (return value)
.text:0000001C 10 80 BD E8   LDMFD   SP!, {R4,PC}      ; restore R4 and PC from stack (return)
```

<p>
So the first 4 arguments were sent through the registers <b style="color: chartreuse;">R0 – R3</b> in this order:
</p>

<ul>
  <li>The pointer of the printf string went in <b style="color: chartreuse;">R0</b></li>
  <li>Then the value <b>1</b> in <b style="color: chartreuse;">R1</b></li>
  <li>The value <b>2</b> in <b style="color: chartreuse;">R2</b></li>
  <li>The value <b>3</b> in <b style="color: chartreuse;">R3</b></li>
</ul>

<p>
And the instruction at address <b style="color: chartreuse;">0x18</b> writes 0 in <b style="color: chartreuse;">R0</b> — and this means the <code style = "color: chartreuse;">return 0</code> statement in C.
</p>

<p>
Until now there is nothing strange.
</p>

<p>
<b style = "color: chocolate;">Keil 6/2013 when working with optimization generates the same code.</b>
</p>

<h3 style="color:#3ba2a6;"><b>Keil 6/2013 — with Optimization (Thumb mode)</b></h3>

```assembly
Listing 1.54: Optimizing Keil 6/2013 (Thumb mode)

.text:00000000 main
.text:00000000 10 B5       PUSH    {R4,LR}             ; save R4 and LR on stack
.text:00000002 03 23       MOVS    R3, #3              ; move value 3 into R3 (third argument)
.text:00000004 02 22       MOVS    R2, #2              ; move value 2 into R2 (second argument)
.text:00000006 01 21       MOVS    R1, #1              ; move value 1 into R1 (first argument)
.text:00000008 02 A0       ADR     R0, aADBDCD         ; load address of format string into R0
                                                        ; "a=%d; b=%d; c=%d"
.text:0000000A 00 F0 0D F8 BL      __2printf           ; branch with link to printf (call printf)
.text:0000000E 00 20       MOVS    R0, #0              ; move 0 into R0 (return value)
.text:00000010 10 BD       POP     {R4,PC}             ; restore R4 and PC from stack (return)
```

<p>
There is no big difference between this code and the one without optimization in ARM mode.
</p>

<h3 style="color:#3ba2a6;"><b>Keil 6/2013 — Optimization (ARM mode) + we removed return</b></h3>

<p>
Let's modify the example and remove <code style = "color: chartreuse;">return 0</code>:
</p>

```c
#include <stdio.h>
void main()
{
    printf("a=%d; b=%d; c=%d", 1, 2, 3);
};
```

<p>
The result will be a little bit strange:
</p>

```assembly
Listing 1.55: Optimizing Keil 6/2013 (ARM mode)

.text:00000014 main
.text:00000014 03 30 A0 E3   MOV   R3, #3              ; move value 3 into R3 (third argument)
.text:00000018 02 20 A0 E3   MOV   R2, #2              ; move value 2 into R2 (second argument)
.text:0000001C 01 10 A0 E3   MOV   R1, #1              ; move value 1 into R1 (first argument)
.text:00000020 1E 0E 8F E2   ADR   R0, aADBDCD         ; load address of format string into R0
                                                        ; "a=%d; b=%d; c=%d\n"
.text:00000024 CB 18 00 EA   B     __2printf           ; unconditional branch (jump) to printf
                                                        ; no prologue/epilogue - tail call optimization
```

<p>
Let's focus a little bit together.
</p>

<p>
This is supposed to be the optimized version (-O3) in ARM mode which we will notice that the last instruction is <code style = "color: chartreuse;">B</code> not <code style = "color: chartreuse;">BL</code> as usual.
</p>

<p>
This is besides another difference which is that there is <b>no prologue or epilogue at all</b> (which are the instructions that save the values of R0 and LR).
</p>

<p>
The <code style = "color: chartreuse;">B</code> instruction makes a direct jump to another address without modifying LR—like <b>JMP</b> in x86.
</p>

<p>
But why does this work in the first place?
</p>

<p>
Because the code is actually equivalent to the one before it, and the reason goes back to two important things:
</p>

<ol>
  <li><b style = "color: chocolate;">The stack and SP (stack pointer) were not touched.</b></li>
  <li><b style = "color: chocolate;">The call to printf() is the last instruction in the function</b>, meaning after the call there are no other instructions.</li>
</ol>

<p>
So when printf finishes, it will return with the return to the address that exists in LR.
</p>

<p>
LR already has the address of the place from which main was called, so there is no need for us to save it.
</p>

<p>
And we don't need to modify LR because there are no other function calls except printf.
</p>

<p>
And after printf we won't do anything else at all!
</p>

<p>
That's why this shortcut can happen.
</p>

<p>
This type of optimization is done a lot in functions where the last line in them is a call to another function.
</p>

<hr>


<h1 style="color:#9a3ba6;"><b>ARM64</b></h1>
<img src="/assets/img/ARM64.png" alt="Arm64" style="display:block; margin:20px auto; border-radius:12px; max-width:60%;">

<hr>

<h2 style="color:#3ba2a6;"><b>GCC (Linaro) 4.9 without Optimization</b></h2>

```assembly
Listing 1.56: Non-optimizing GCC (Linaro) 4.9
.LC1:
    .string "a=%d; b=%d; c=%d"
f2:
; save FP and LR in stack frame:
    stp     x29, x30, [sp, -16]!
; set stack frame (FP=SP):
    add     x29, sp, 0
    adrp    x0, .LC1
    add     x0, x0, :lo12:.LC1
    mov     w1, 1
    mov     w2, 2
    mov     w3, 3
    bl      printf
    mov     w0, 0
; restore FP and LR
    ldp     x29, x30, [sp], 16
    ret
```

<p>The first instruction <b style="color: chartreuse;">STP (Store Pair)</b> stores the frame pointer <b style="color: chartreuse;">FP (X29)</b> and the link register <b style="color: chartreuse;">LR (X30)</b> onto the stack.</p>

<p>The next instruction <b style="color: chartreuse;">ADD X29, SP, 0</b> creates the stack frame — it simply copies the current value of SP into X29.</p>

<p>Then we see the familiar <b style="color: chartreuse;">ADRP / ADD</b> pair that builds a pointer to the string.</p>

<p>The token <b style="color: chartreuse;">lo12</b> means “lower 12 bits”, i.e., the linker will write the lower 12 bits of the address of .LC1 into the opcode of the ADD instruction.</p>

<p>The values <b>1, 2, 3</b> are 32-bit integers, so they are loaded into the lower 32-bit parts of the registers (the W- registers).</p>

<p>GCC (Linaro) 4.9 with optimization enabled generates exactly the same code.</p>

<hr>

<h2 style="color:#3ba2a6;"><b>ARM: 8 integer arguments</b></h2>

<p>We’ll reuse the same example from before, but now with 8 arguments (actually 9 including the format string):</p>

```c
#include <stdio.h>

int main()
{
    printf("a=%d; b=%d; c=%d; d=%d; e=%d; f=%d; g=%d; h=%d\n",
           1, 2, 3, 4, 5, 6, 7, 8);
    return 0;
};
```

<h3 style="color:#3ba2a6;"><b>Optimizing Keil 6/2013: ARM mode</b></h3>

```assembly
.text:00000028 main
.text:00000028 var_18         = -0x18
.text:00000028 var_14         = -0x14
.text:00000028 var_4          = -4

.text:00000028 04 E0 2D E5    STR     LR, [SP,#var_4]!
.text:0000002C 14 D0 4D E2    SUB     SP, SP, #0x14
.text:00000030 08 30 A0 E3    MOV     R3, #8
.text:00000034 07 20 A0 E3    MOV     R2, #7
.text:00000038 06 10 A0 E3    MOV     R1, #6
.text:0000003C 05 00 A0 E3    MOV     R0, #5
.text:00000040 04 C0 8D E2    ADD     R12, SP, #0x18+var_14
.text:00000044 0F 00 8C E8    STMIA   R12, {R0-R3}
.text:00000048 04 00 A0 E3    MOV     R0, #4
.text:0000004C 00 00 8D E5    STR     R0, [SP,#0x18+var_18]
.text:00000050 03 30 A0 E3    MOV     R3, #3
.text:00000054 02 20 A0 E3    MOV     R2, #2
.text:00000058 01 10 A0 E3    MOV     R1, #1
.text:0000005C 6E 0F 8F E2    ADR     R0, aADBDCDDDEDFDGD ; "a=%d; b=%d; c=%d; ..."
.text:00000060 BC 18 00 EB    BL      __2printf
.text:00000064 14 D0 8D E2    ADD     SP, SP, #0x14
.text:00000068 04 F0 9D E4    LDR     PC, [SP+4+var_4],#4
```

<p>We can break this code into several parts:</p>

<h3 style="color:#3ba2a6;"><b>Function prologue</b></h3>
<p><b style = "color: deeppink;">First instruction:</b></p>
<p><code style="color: chartreuse;">STR LR, [SP,#var_4]!</code><br>
Stores LR onto the stack because we’re going to use that register for the call to printf().<br>
The exclamation mark means this is a <b>pre-index</b> operation:<br>
- First SP is decremented by 4<br>
- Then the value in LR is stored at the address now pointed to by SP<br>
This is analogous to PUSH in x86.</p>

<p> <b style = "color: deeppink;">Next instruction:</b></p>
<p><code style="color: chartreuse;">SUB SP, SP, #0x14</code><br>
Decrements SP to allocate 0x14 (20 bytes) on the stack.<br>
We need to store <b>five 32-bit values</b> on the stack before calling printf, and each takes 4 bytes → 5 × 4 = 20 exactly.<br>
The first four arguments are passed in registers.</p>

<h3 style="color: deeppink;"><b>Passing arguments 5, 6, 7, 8 via the stack</b></h3>
<p>These values are first placed in R0–R3:</p>
<ul>
  <li><b style = "color: seagreen;">R0 = 5</b></li>
  <li><b style = "color: seagreen;">R1 = 6</b></li>
  <li><b style = "color: seagreen;">R2 = 7</b></li>
  <li><b style = "color: seagreen;">R3 = 8</b></li>
</ul>
<p>Then:</p>
<p><code style="color: chartreuse;" >ADD R12, SP, #0x18+var_14</code><br>
This puts into R12 the address where these four values should be stored on the stack.<br>
var_14 is an IDA macro meaning -0x14.<br>
So effectively: <code style="color: chartreuse;">SP + 4</code> is placed into R12.</p>

<p>Then:</p>
<p><code style="color: chartreuse;">STMIA R12, {R0-R3}</code><br>
Writes the contents of R0–R3 into memory pointed to by R12.<br>
“Increment After” means R12 is increased by 4 after each store.</p>

<h3 style="color: deeppink;"><b>Passing argument 4 via the stack</b></h3>
<p>The value 4 is placed in R0, then:</p>
<p><code style="color: chartreuse;">STR R0, [SP,#0x18+var_18]</code><br>
writes it to a location on the stack.<br>
var_18 = -0x18 → offset = 0.<br>
So the value 4 is written at the address currently pointed to by SP.</p>

<h3 style="color: deeppink;"> <b>Passing 1, 2, 3 via registers</b></h3>
<p>Just before the call to printf:</p>
<ul>
  <li><b style = "color: seagreen;">R1 = 1</b></li>
  <li><b style = "color: seagreen;">R2 = 2</b></li>
  <li><b style = "color: seagreen;">R3 = 3</b></li>
</ul>
<p>These are the first three actual arguments.</p>

<h3 style="color: deeppink;"><b>Calling printf()</b></h3>
<p><code style="color: chartreuse;">BL __2printf</code></p>

<h3 style="color: deeppink;"><b>Function epilogue</b></h3>
<p><code  style="color: chartreuse;">ADD SP, SP, #0x14</code><br>
Restores SP to its value before we allocated stack space.<br>
The values that were on the stack remain there but will be overwritten by future calls.</p>

<p>Then:</p>
<p><code  style="color: chartreuse;">LDR PC, [SP+4+var_4],#4</code><br>
Loads the previously saved LR into PC (i.e., returns from the function).<br>
There is no exclamation mark, so this is <b>post-index</b>:<br>
- First PC receives the value pointed to by SP<br>
- Then SP is incremented by 4<br>
IDA writes it this way to clearly show variable locations on the stack.<br>
This instruction is very similar to <b>POP PC</b> in x86.</p>

<hr>

<h3 style="color:#3ba2a6;"><b>Optimizing Keil 6/2013: Thumb mode</b></h3>

```assembly
.text:0000001C printf_main2
.text:0000001C var_18         = -0x18
.text:0000001C var_14         = -0x14
.text:0000001C var_8          = -8

.text:0000001C 00 B5          PUSH    {LR}
.text:0000001E 08 23          MOVS    R3, #8
.text:00000020 85 B0          SUB     SP, SP, #0x14
.text:00000022 04 93          STR     R3, [SP,#0x18+var_8]
.text:00000024 07 22          MOVS    R2, #7
.text:00000026 06 21          MOVS    R1, #6
.text:00000028 05 20          MOVS    R0, #5
.text:0000002A 01 AB          ADD     R3, SP, #0x18+var_14
.text:0000002C 07 C3          STMIA   R3!, {R0-R2}
.text:0000002E 04 20          MOVS    R0, #4
.text:00000030 00 90          STR     R0, [SP,#0x18+var_18]
.text:00000032 03 23          MOVS    R3, #3
.text:00000034 02 22          MOVS    R2, #2
.text:00000036 01 21          MOVS    R1, #1
.text:00000038 A0 A0          ADR     R0, aADBDCDDDEDFDGD ; "a=%d; b=%d; c=%d; d=%d; e=%d; f=%d; g=%"...
.text:0000003A 06 F0 D9 F8    BL      __2printf

.text:0000003E loc_3E
.text:0000003E 05 B0          ADD     SP, SP, #0x14
.text:00000040 00 BD          POP     {PC}
```

<p>The output is almost identical to the previous example.<br>
The only real difference is that we are now in <b>Thumb mode</b>, which causes the values to be placed on the stack in a slightly different order:</p>
<ul>
  <li><b style =  "color: chocolate;">Value <b>8</b> is stored first</b></li>
  <li><b style =  "color: chocolate;">Then <b>5, 6, 7</b></b></li>
  <li><b style =  "color: chocolate;">And value <b>4</b> comes third</b></li>
</ul>

<hr>

<h3 style="color:#3ba2a6;"><b>Optimizing Xcode 4.6.3 (LLVM): ARM mode</b></h3>

```assembly
__text:0000290C _printf_main2
__text:0000290C var_1C         = -0x1C
__text:0000290C var_C          = -0xC

__text:0000290C 80 40 2D E9    STMFD   SP!, {R7,LR}
__text:00002910 0D 70 A0 E1    MOV     R7, SP
__text:00002914 14 D0 4D E2    SUB     SP, SP, #0x14
__text:00002918 70 05 01 E3    MOV     R0, #0x1570
__text:0000291C 07 C0 A0 E3    MOV     R12, #7
__text:00002920 00 00 40 E3    MOVT    R0, #0
__text:00002924 04 20 A0 E3    MOV     R2, #4
__text:00002928 00 00 8F E0    ADD     R0, PC, R0
__text:0000292C 06 30 A0 E3    MOV     R3, #6
__text:00002930 05 10 A0 E3    MOV     R1, #5
__text:00002934 00 20 8D E5    STR     R2, [SP,#0x1C+var_1C]
__text:00002938 0A 10 8D E9    STMFA   SP, {R1,R3,R12}
__text:0000293C 08 90 A0 E3    MOV     R9, #8
__text:00002940 01 10 A0 E3    MOV     R1, #1
__text:00002944 02 20 A0 E3    MOV     R2, #2
__text:00002948 03 30 A0 E3    MOV     R3, #3
__text:0000294C 10 90 8D E5    STR     R9, [SP,#0x1C+var_C]
__text:00002950 A4 05 00 EB    BL      _printf
__text:00002954 07 D0 A0 E1    MOV     SP, R7
__text:00002958 80 80 BD E8    LDMFD   SP!, {R7,PC}
```

<p>Essentially the same as what we’ve seen before, except for the <b style = "color: blueviolet;">STMFA</b> instruction (Store Multiple Full Ascending), which is a synonym for <b style = "color: blueviolet;">STMIB</b> (Store Multiple Increment Before).<br>
This instruction increments the address in SP first and then writes the register values — the opposite order of the usual store-multiple.</p>

<p>Another noticeable thing is that the instructions appear to be ordered somewhat randomly.<br>
For example, register R0 is touched in three different places (addresses 0x2918, 0x2920, and 0x2928), even though it could have been done in one place.<br>
Nevertheless, an optimizing compiler may have good reasons for scheduling instructions this way to achieve higher execution efficiency.<br>
Modern processors try to execute nearby instructions in parallel when possible.<br>
For instance, instructions like <code style="color: chartreuse;">MOVT R0, #0</code> and <code style="color: chartreuse;">ADD R0, PC, R0</code> cannot run together because both modify R0.<br>
But <code style="color: chartreuse;">MOVT R0, #0</code> and <code style="color: chartreuse;">MOV R2, #4</code> can execute simultaneously because there is no conflict.<br>
The compiler presumably tries to generate code in this style.</p>

<hr>

<h3 style="color:#3ba2a6;"><b>Optimizing Xcode 4.6.3 (LLVM): Thumb-2 mode</b></h3>

```assembly
__text:00002BA0 _printf_main2
__text:00002BA0 var_1C         = -0x1C
__text:00002BA0 var_18         = -0x18
__text:00002BA0 var_C          = -0xC

__text:00002BA0 80 B5          PUSH    {R7,LR}
__text:00002BA2 6F 46          MOV     R7, SP
__text:00002BA4 85 B0          SUB     SP, SP, #0x14
__text:00002BA6 41 F2 D8 20    MOVW    R0, #0x12D8
__text:00002BAA 4F F0 07 0C    MOV.W   R12, #7
__text:00002BAE C0 F2 00 00    MOVT.W  R0, #0
__text:00002BB2 04 22          MOVS    R2, #4
__text:00002BB4 78 44          ADD     R0, PC           ; char *
__text:00002BB6 06 23          MOVS    R3, #6
__text:00002BB8 05 21          MOVS    R1, #5
__text:00002BBA 0D F1 04 0E    ADD.W   LR, SP, #0x1C+var_18
__text:00002BBE 00 92          STR     R2, [SP,#0x1C+var_1C]
__text:00002BC0 4F F0 08 09    MOV.W   R9, #8
__text:00002BC4 8E E8 0A 10    STMIA.W LR, {R1,R3,R12}
__text:00002BC8 01 21          MOVS    R1, #1
__text:00002BCA 02 22          MOVS    R2, #2
__text:00002BCC 03 23          MOVS    R3, #3
__text:00002BCE CD F8 10 90    STR.W   R9, [SP,#0x1C+var_C]
__text:00002BD2 01 F0 0A EA    BLX     _printf
__text:00002BD6 05 B0          ADD     SP, SP, #0x14
__text:00002BD8 80 BD          POP     {R7,PC}
```

<p>Exactly the same idea as the previous example — the only difference is the use of Thumb/Thumb-2 instructions instead of full ARM instructions.</p>

<hr>

<h2 style="color:#3ba2a6;"><b>ARM64: Non-optimizing GCC (Linaro) 4.9</b></h2>

```assembly
.LC2:
    .string "a=%d; b=%d; c=%d; d=%d; e=%d; f=%d; g=%d; h=%d\n"
f3:
; allocate more space on stack:
    sub     sp, sp, #32
; save FP and LR in stack frame:
    stp     x29, x30, [sp,16]
; set frame pointer (FP=SP+16):
    add     x29, sp, 16
    adrp    x0, .LC2
    add     x0, x0, :lo12:.LC2
    mov     w1, 8           ; 9th argument (value 8)
    str     w1, [sp]        ; store 9th argument on the stack
    mov     w1, 1
    mov     w2, 2
    mov     w3, 3
    mov     w4, 4
    mov     w5, 5
    mov     w6, 6
    mov     w7, 7
    bl      printf
    sub     sp, x29, #16
; restore FP and LR
    ldp     x29, x30, [sp,16]
    add     sp, sp, 32
    ret
```

<p>In ARM64 (AArch64), the first eight arguments are passed in X- or W- registers [Procedure Call Standard for the ARM 64-bit Architecture (AArch64), 2013].<br>
The format string pointer is 64-bit, so it goes in X0.<br>
All remaining values are 32-bit ints, so they are placed in the lower 32-bit halves of the registers (the W- registers).<br>
The ninth argument (the value 8) is passed via the stack.<br>
Indeed, you cannot pass an arbitrarily large number of arguments in registers because the number of registers is finite.</p>

<p>Optimized GCC (Linaro) 4.9 produces exactly the same code.</p>


<hr>


<h1 style="color:#9a3ba6;"><b>MIPS</b></h1>  
<img src="/assets/img/MIPS2.png" alt="MIPS2" style="display:block; margin:20px auto; border-radius:12px; max-width:60%;">

<hr>  

<h2 style="color:#3ba2a6;"><b>3 integer arguments</b></h2>  

<h3 style="color:#3ba2a6;"><b>Optimizing GCC 4.4.5</b></h3>  

<p> The main difference from the “Hello, world!” example is that in this case printf() is called instead of puts(), and 3 additional arguments are passed through the registers $5…$7 (or $A1…$A3). And for this reason these registers are marked with the prefix A-, which means that they are used to pass function arguments. </p>  

```assembly
Listing 1.58: Optimizing GCC 4.4.5 (assembly output)  

$LC0:  
        .ascii  "a=%d; b=%d; c=%d\000"  
main:  
; function prologue:  
        lui     $28,%hi(__gnu_local_gp)     ; Load upper immediate: load high part of __gnu_local_gp address into $28  
        addiu   $sp,$sp,-32                 ; Add immediate unsigned: allocate 32 bytes on stack by subtracting from stack pointer  
        addiu   $28,$28,%lo(__gnu_local_gp) ; Add immediate unsigned: add low part of __gnu_local_gp to $28 to complete address  
        sw      $31,28($sp)                 ; Store word: save return address ($31) at stack offset 28  
; load address of printf():  
        lw      $25,%call16(printf)($28)    ; Load word: load printf address (16-bit offset) from $28 into $25  
; load address of the text string and set 1st argument of printf():  
        lui     $4,%hi($LC0)                ; Load upper immediate: load high part of text string address into $4 (1st arg)  
        addiu   $4,$4,%lo($LC0)             ; Add immediate unsigned: add low part to complete text string address in $4  
; set 2nd argument of printf():  
        li      $5,1 # 0x1                  ; Load immediate: set 2nd arg to 1 in $5  
; set 3rd argument of printf():  
        li      $6,2 # 0x2                  ; Load immediate: set 3rd arg to 2 in $6  
; call printf():  
        jalr    $25                         ; Jump and link register: jump to printf address in $25, save return in $31  
; set 4th argument of printf() (branch delay slot):  
        li      $7,3 # 0x3                  ; Load immediate: set 4th arg to 3 in $7 (executes in delay slot)  
; function epilogue:  
        lw      $31,28($sp)                 ; Load word: restore return address from stack offset 28 into $31  
; set return value to 0:  
        move    $2,$0                       ; Move: set return value ($2) to 0  
; return  
        j       $31                         ; Jump: jump to address in $31 (return)  
        addiu   $sp,$sp,32                  ; Add immediate unsigned: deallocate stack space (delay slot)
```  

```assembly
Listing 1.59: Optimizing GCC 4.4.5 (IDA)  

.text:00000000 main:  
.text:00000000  
.text:00000000 var_10          = -0x10  
.text:00000000 var_4           = -4  
.text:00000000  
; function prologue:  
.text:00000000                 lui     $gp, (__gnu_local_gp >> 16)    ; Load upper immediate: load high 16 bits of __gnu_local_gp into $gp  
.text:00000004                 addiu   $sp, -0x20                      ; Add immediate unsigned: allocate 32 bytes on stack  
.text:00000008                 la      $gp, (__gnu_local_gp & 0xFFFF)  ; Load address (pseudo): complete __gnu_local_gp address in $gp  
.text:0000000C                 sw      $ra, 0x20+var_4($sp)            ; Store word: save return address ($ra) on stack  
.text:00000010                 sw      $gp, 0x20+var_10($sp)           ; Store word: save $gp on stack  
; load address of printf():  
.text:00000014                 lw      $t9, (printf & 0xFFFF)($gp)     ; Load word: load printf address into $t9  
; load address of the text string and set 1st argument of printf():  
.text:00000018                 la      $a0, $LC0 # "a=%d; b=%d; c=%d" ; Load address (pseudo): set 1st arg to text string address  
; set 2nd argument of printf():  
.text:00000020                 li      $a1, 1                          ; Load immediate: set 2nd arg to 1  
; set 3rd argument of printf():  
.text:00000024                 li      $a2, 2                          ; Load immediate: set 3rd arg to 2  
; call printf():  
.text:00000028                 jalr    $t9                             ; Jump and link register: call printf, save return in $ra  
; set 4th argument of printf() (branch delay slot):  
.text:0000002C                 li      $a3, 3                          ; Load immediate: set 4th arg to 3 (delay slot)  
; function epilogue:  
.text:00000030                 lw      $ra, 0x20+var_4($sp)            ; Load word: restore return address  
; set return value to 0:  
.text:00000034                 move    $v0, $zero                      ; Move: set return value to 0  
; return  
.text:00000038                 jr      $ra                             ; Jump register: return  
.text:0000003C                 addiu   $sp, 0x20                       ; Add immediate unsigned: deallocate stack (delay slot)
```  

<p> Here IDA merged the pair of LUI and ADDIU instructions into the pseudo instruction LA. And for this reason there is no instruction at address 0x1C: because the LA instruction occupies 8 bytes. </p>  

<hr>  

<h3 style="color:#3ba2a6;"><b>GCC 4.4.5 Non-optimizing</b></h3>  

<p> The non-optimizing GCC is more verbose: </p>  

```assembly
$LC0:  
        .ascii  "a=%d; b=%d; c=%d\000"  
main:  
; function prologue:  
        addiu   $sp,$sp,-32                 ; Add immediate unsigned: allocate 32 bytes on stack  
        sw      $31,28($sp)                 ; Store word: save return address ($31)  
        sw      $fp,24($sp)                 ; Store word: save frame pointer ($fp)  
        move    $fp,$sp                     ; Move: set frame pointer to current stack pointer  
        lui     $28,%hi(__gnu_local_gp)     ; Load upper immediate: load high part of __gnu_local_gp  
        addiu   $28,$28,%lo(__gnu_local_gp) ; Add immediate unsigned: complete __gnu_local_gp address  
; load address of the text string:  
        lui     $2,%hi($LC0)                ; Load upper immediate: load high part of text string address into $2  
        addiu   $2,$2,%lo($LC0)             ; Add immediate unsigned: complete text string address in $2  
; set 1st argument of printf():  
        move    $4,$2                       ; Move: set 1st arg ($4) to text string address  
; set 2nd argument of printf():  
        li      $5,1 # 0x1                  ; Load immediate: set 2nd arg to 1  
; set 3rd argument of printf():  
        li      $6,2 # 0x2                  ; Load immediate: set 3rd arg to 2  
; set 4th argument of printf():  
        li      $7,3 # 0x3                  ; Load immediate: set 4th arg to 3  
; get address of printf():  
        lw      $2,%call16(printf)($28)     ; Load word: load printf address into $2  
        nop                                 ; No operation: delay slot filler  
; call printf():  
        move    $25,$2                      ; Move: set $25 to printf address  
        jalr    $25                         ; Jump and link register: call printf  
        nop                                 ; No operation: delay slot filler  
; function epilogue:  
        lw      $28,16($fp)                 ; Load word: restore $28 from frame pointer offset  
; set return value to 0:  
        move    $2,$0                       ; Move: set return value to 0  
        move    $sp,$fp                     ; Move: restore stack pointer from frame pointer  
        lw      $31,28($sp)                 ; Load word: restore return address  
        lw      $fp,24($sp)                 ; Load word: restore frame pointer  
        addiu   $sp,$sp,32                  ; Add immediate unsigned: deallocate stack  
; return  
        j       $31                         ; Jump: return  
        nop                                 ; No operation: delay slot filler
```  

```assembly
Listing 1.61: Non-optimizing GCC 4.4.5 (IDA)  

.text:00000000 main:  
.text:00000000  
.text:00000000 var_10          = -0x10  
.text:00000000 var_8           = -8  
.text:00000000 var_4           = -4  
.text:00000000  
; function prologue:  
.text:00000000                 addiu   $sp, -0x20                  ; Add immediate unsigned: allocate 32 bytes on stack  
.text:00000004                 sw      $ra, 0x20+var_4($sp)        ; Store word: save return address  
.text:00000008                 sw      $fp, 0x20+var_8($sp)        ; Store word: save frame pointer  
.text:0000000C                 move    $fp, $sp                    ; Move: set frame pointer to stack pointer  
.text:00000010                 la      $gp, __gnu_local_gp         ; Load address (pseudo): set $gp to __gnu_local_gp  
.text:00000018                 sw      $gp, 0x20+var_10($sp)       ; Store word: save $gp on stack  
; load address of the text string:  
.text:0000001C                 la      $v0, aADBDCD # "a=%d; b=%d; c=%d" ; Load address (pseudo): load text string address into $v0  
; set 1st argument of printf():  
.text:00000024                 move    $a0, $v0                    ; Move: set 1st arg to text string  
; set 2nd argument of printf():  
.text:00000028                 li      $a1, 1                      ; Load immediate: set 2nd arg to 1  
; set 3rd argument of printf():  
.text:0000002C                 li      $a2, 2                      ; Load immediate: set 3rd arg to 2  
; set 4th argument of printf():  
.text:00000030                 li      $a3, 3                      ; Load immediate: set 4th arg to 3  
; get address of printf():  
.text:00000034                 lw      $v0, (printf & 0xFFFF)($gp) ; Load word: load printf address into $v0  
.text:00000038                 or      $at, $zero                  ; Or: no operation (NOP)  
; call printf():  
.text:0000003C                 move    $t9, $v0                    ; Move: set $t9 to printf address  
.text:00000040                 jalr    $t9                         ; Jump and link register: call printf  
.text:00000044                 or      $at, $zero ; NOP            ; Or: no operation (delay slot)  
; function epilogue:  
.text:00000048                 lw      $gp, 0x20+var_10($fp)       ; Load word: restore $gp  
; set return value to 0:  
.text:0000004C                 move    $v0, $zero                  ; Move: set return value to 0  
.text:00000050                 move    $sp, $fp                    ; Move: restore stack pointer  
.text:00000054                 lw      $ra, 0x20+var_4($sp)        ; Load word: restore return address  
.text:00000058                 lw      $fp, 0x20+var_8($sp)        ; Load word: restore frame pointer  
.text:0000005C                 addiu   $sp, 0x20                   ; Add immediate unsigned: deallocate stack  
; return  
.text:00000060                 jr      $ra                         ; Jump register: return  
.text:00000064                 or      $at, $zero ; NOP            ; Or: no operation (delay slot)
```  

<hr>  

<h2 style="color:#3ba2a6;"><b>8 integer arguments</b></h2>  

<p> Let's use again the example with 9 arguments from a previous part: </p>  

```c
#include <stdio.h>  
int main()  
{  
        printf("a=%d; b=%d; c=%d; d=%d; e=%d; f=%d; g=%d; h=%d\n", 1, 2, 3, 4, 5, 6, 7, 8);  
        return 0;  
};
```  

<hr>  

<h3 style="color:#3ba2a6;"><b>Optimizing GCC 4.4.5</b></h3>  

<p> But only the first 4 arguments are passed in the registers $A0 … $A3, and the rest are passed via the stack. </p>  

<p> And this is called O32 calling convention (and this is the most used one in the MIPS world). </p>  

<p> Other calling conventions, or hand-written Assembly code, can use the registers for other purposes. </p>  

<p> SW is short for “Store Word” (from register to memory). </p>  

<p> MIPS does not have direct instructions for storing a value in memory, so it uses a pair of commands (LI / SW) to do that. </p>  

```assembly
$LC0:  
        .ascii  "a=%d; b=%d; c=%d; d=%d; e=%d; f=%d; g=%d; h=%d\012\000"  
main:  
; function prologue:  
        lui     $28,%hi(__gnu_local_gp)     ; Load upper immediate: load high part of __gnu_local_gp  
        addiu   $sp,$sp,-56                 ; Add immediate unsigned: allocate 56 bytes on stack  
        addiu   $28,$28,%lo(__gnu_local_gp) ; Add immediate unsigned: complete __gnu_local_gp address  
        sw      $31,52($sp)                 ; Store word: save return address at offset 52  
; pass 5th argument in stack:  
        li      $2,4 # 0x4                  ; Load immediate: load 4 into $2  
        sw      $2,16($sp)                  ; Store word: pass 5th arg (4) on stack at offset 16  
; pass 6th argument in stack:  
        li      $2,5 # 0x5                  ; Load immediate: load 5 into $2  
        sw      $2,20($sp)                  ; Store word: pass 6th arg (5) on stack at offset 20  
; pass 7th argument in stack:  
        li      $2,6 # 0x6                  ; Load immediate: load 6 into $2  
        sw      $2,24($sp)                  ; Store word: pass 7th arg (6) on stack at offset 24  
; pass 8th argument in stack:  
        li      $2,7 # 0x7                  ; Load immediate: load 7 into $2  
        lw      $25,%call16(printf)($28)    ; Load word: load printf address into $25  
        sw      $2,28($sp)                  ; Store word: pass 8th arg (7) on stack at offset 28  
; pass 1st argument in $a0:  
        lui     $4,%hi($LC0)                ; Load upper immediate: load high part of text string into $4 (1st arg)  
; pass 9th argument in stack:  
        li      $2,8 # 0x8                  ; Load immediate: load 8 into $2  
        sw      $2,32($sp)                  ; Store word: pass 9th arg (8) on stack at offset 32  
        addiu   $4,$4,%lo($LC0)             ; Add immediate unsigned: complete text string address in $4  
; pass 2nd argument in $a1:  
        li      $5,1                        ; Load immediate: set 2nd arg to 1  
; pass 3rd argument in $a2:  
        li      $6,2                        ; Load immediate: set 3rd arg to 2  
; call printf():  
        jalr    $25                         ; Jump and link register: call printf  
; pass 4th argument in $a3 (branch delay slot):  
        li      $7,3                        ; Load immediate: set 4th arg to 3 (delay slot)  
; function epilogue:  
        lw      $31,52($sp)                 ; Load word: restore return address  
; return value = 0:  
        move    $2,$0                       ; Move: set return value to 0  
; return:  
        j       $31                         ; Jump: return  
        addiu   $sp,$sp,56                  ; Add immediate unsigned: deallocate stack (delay slot)
```  

```assembly
Listing 1.63: Optimizing GCC 4.4.5 (IDA)  

.text:00000000 main:  
.text:00000000  
.text:00000000 var_28          = -0x28  
.text:00000000 var_24          = -0x24  
.text:00000000 var_20          = -0x20  
.text:00000000 var_1C          = -0x1C  
.text:00000000 var_18          = -0x18  
.text:00000000 var_10          = -0x10  
.text:00000000 var_4           = -4  
; function prologue:  
.text:00000000                 lui     $gp, (__gnu_local_gp >> 16)    ; Load upper immediate: high 16 bits of __gnu_local_gp  
.text:00000004                 addiu   $sp, -0x38                      ; Add immediate unsigned: allocate 56 bytes on stack  
.text:00000008                 la      $gp, (__gnu_local_gp & 0xFFFF)  ; Load address (pseudo): complete __gnu_local_gp  
.text:0000000C                 sw      $ra, 0x38+var_4($sp)            ; Store word: save return address  
.text:00000010                 sw      $gp, 0x38+var_10($sp)           ; Store word: save $gp  
; pass 5th argument:  
.text:00000014                 li      $v0, 4                          ; Load immediate: 4 into $v0 for 5th arg  
.text:00000018                 sw      $v0, 0x38+var_28($sp)           ; Store word: pass 5th arg on stack  
; pass 6th:  
.text:0000001C                 li      $v0, 5                          ; Load immediate: 5 into $v0 for 6th arg  
.text:00000020                 sw      $v0, 0x38+var_24($sp)           ; Store word: pass 6th arg on stack  
; pass 7th:  
.text:00000024                 li      $v0, 6                          ; Load immediate: 6 into $v0 for 7th arg  
.text:00000028                 sw      $v0, 0x38+var_20($sp)           ; Store word: pass 7th arg on stack  
; pass 8th:  
.text:0000002C                 li      $v0, 7                          ; Load immediate: 7 into $v0 for 8th arg  
.text:00000030                 lw      $t9, (printf & 0xFFFF)($gp)     ; Load word: load printf address  
.text:00000034                 sw      $v0, 0x38+var_1C($sp)           ; Store word: pass 8th arg on stack  
; prepare $a0:  
.text:00000038                 lui     $a0, ($LC0 >> 16)               ; Load upper immediate: high part of text string for 1st arg  
.text:0000003C                 li      $v0, 8                          ; Load immediate: 8 into $v0 for 9th arg  
.text:00000040                 sw      $v0, 0x38+var_18($sp)           ; Store word: pass 9th arg on stack  
.text:00000044                 la      $a0, ($LC0 & 0xFFFF)            ; Load address (pseudo): complete text string address  
; $a1, $a2:  
.text:00000048                 li      $a1, 1                          ; Load immediate: 2nd arg to 1  
.text:0000004C                 li      $a2, 2                          ; Load immediate: 3rd arg to 2  
; call printf():  
.text:00000050                 jalr    $t9                             ; Jump and link register: call printf  
.text:00000054                 li      $a3, 3                          ; Load immediate: 4th arg to 3 (delay slot)  
; function epilogue:  
.text:00000058                 lw      $ra, 0x38+var_4($sp)            ; Load word: restore return address  
.text:0000005C                 move    $v0, $zero                      ; Move: return value to 0  
; return:  
.text:00000060                 jr      $ra                             ; Jump register: return  
.text:00000064                 addiu   $sp, 0x38                       ; Add immediate unsigned: deallocate stack (delay slot)
```  

<hr>  

<h2 style="color:#9a3ba6;"><b>1.11.4 Conclusion</b></h2>  

<h3 style="color:#3ba2a6;"><b>Skeleton of a function call on different architectures</b></h3>  

```assembly
Listing 1.66: x86  

PUSH 3rd argument   ; Push 3rd argument onto stack  
PUSH 2nd argument   ; Push 2nd argument onto stack  
PUSH 1st argument   ; Push 1st argument onto stack  
CALL function       ; Call the function  
; modify stack pointer (if needed) ; Adjust stack pointer if necessary after call
```  

```assembly
Listing 1.67: x64 (MSVC)  

MOV RCX, 1st argument   ; Move 1st argument into RCX  
MOV RDX, 2nd argument   ; Move 2nd argument into RDX  
MOV R8, 3rd argument    ; Move 3rd argument into R8  
MOV R9, 4th argument    ; Move 4th argument into R9  
...  
PUSH 5th, 6th argument, etc. (if needed) ; Push additional arguments onto stack if needed  
CALL function           ; Call the function  
; modify stack pointer (if needed) ; Adjust stack pointer if necessary
```  

```assembly
Listing 1.68: x64 (GCC)  

MOV RDI, 1st argument   ; Move 1st argument into RDI  
MOV RSI, 2nd argument   ; Move 2nd argument into RSI  
MOV RDX, 3rd argument   ; Move 3rd argument into RDX  
MOV RCX, 4th argument   ; Move 4th argument into RCX  
MOV R8, 5th argument    ; Move 5th argument into R8  
MOV R9, 6th argument    ; Move 6th argument into R9  
...  
PUSH 7th, 8th argument, etc. (if needed) ; Push additional arguments onto stack if needed  
CALL function           ; Call the function  
; modify stack pointer (if needed) ; Adjust stack pointer if necessary
```  

```assembly
Listing 1.69: ARM (32-bit)  

MOV R0, 1st argument    ; Move 1st argument into R0  
MOV R1, 2nd argument    ; Move 2nd argument into R1  
MOV R2, 3rd argument    ; Move 3rd argument into R2  
MOV R3, 4th argument    ; Move 4th argument into R3  
; pass 5th, 6th argument, etc. in stack (if needed) ; Pass additional args on stack if needed  
BL function             ; Branch with link: call function  
; modify stack pointer (if needed) ; Adjust stack pointer if necessary
```  

```assembly
Listing 1.70: ARM64  

MOV X0, 1st argument    ; Move 1st argument into X0  
MOV X1, 2nd argument    ; Move 2nd argument into X1  
MOV X2, 3rd argument    ; Move 3rd argument into X2  
MOV X3, 4th argument    ; Move 4th argument into X3  
MOV X4, 5th argument    ; Move 5th argument into X4  
MOV X5, 6th argument    ; Move 6th argument into X5  
MOV X6, 7th argument    ; Move 7th argument into X6  
MOV X7, 8th argument    ; Move 8th argument into X7  
; pass 9th, 10th argument, etc. in stack (if needed) ; Pass additional args on stack if needed  
BL function             ; Branch with link: call function  
; modify stack pointer (if needed) ; Adjust stack pointer if necessary
```  

```assembly
Listing 1.71: MIPS (O32 calling convention)  

LI $4, 1st argument ; AKA $A0     ; Load immediate: set 1st arg in $4 ($A0)  
LI $5, 2nd argument ; AKA $A1     ; Load immediate: set 2nd arg in $5 ($A1)  
LI $6, 3rd argument ; AKA $A2     ; Load immediate: set 3rd arg in $6 ($A2)  
LI $7, 4th argument ; AKA $A3     ; Load immediate: set 4th arg in $7 ($A3)  
; pass 5th, 6th, ... arguments in stack (if needed) ; Pass additional args on stack if needed  
LW temp_reg, address_of_function    ; Load word: load function address into temp_reg  
JALR temp_reg                       ; Jump and link register: call function
```  

<hr>  

<h2 style="color:#9a3ba6;"><b>1.11.5 By the way</b></h2>  

<p> The difference between the ways of passing arguments in x86, x64, fastcall, ARM, and MIPS shows an important fact: </p>  

<p> - <b>The processor (CPU) does not know anything about calling conventions.</b> </p>  

<p> - Registers like </p>  
    <ul>  
        <li style="color: chartreuse;">$A0 … $A3 in MIPS</li>  
        <li style="color: chartreuse;">RCX/RDX/... in x64</li>  
    </ul>  
<p>       are just <b>agreements between the compiler and the linker</b>. </p>  

<p> - You can write <b>hand-written assembly</b> and pass arguments in any order, through: </p>  
    <ul>  
        <li>any register you choose</li>  
        <li>or even through global variables (!!)</li>  
    </ul>  
<p> The processor does not care at all <b>how</b> the variables were passed it just executes the instructions. </p>  



</div>