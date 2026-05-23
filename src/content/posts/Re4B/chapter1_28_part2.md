---
title: "CH1.28 Manipulating specific bit(s) (part2)"
published: 2026-05-23
description: "Setting and clearing bits in IEEE 754 float values without FPU instructions — across x86, MIPS, and ARM compilers"
author: "0xV3n0m"
category: "Re4B"
tags: ["Reverse Engineering", "Books", "Assembly"]
image: "/assets/img/reversee31.jpg"
draft: false
lang: "eng"

# Series configuration
type: "course"
series: "re4b"
seriesOrder: 31
seriesTitle: "Reverse Engineering for Beginners"
seriesDescription: "A beginner-friendly book covering x86/x64 reverse engineering through real compiler output and code patterns."
seriesImage: "/assets/img/RE4B.png"
---
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<div style="line-height:1.9; font-size:21px; direction:ltr;">
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.28.4 Setting and clearing specific bits: FPU example</b></h1>
<hr>
<p>
Here is the layout of the bits present in the float type in IEEE 754 format:
</p>
<img src="/assets/img/ieee754_float.jpeg" alt="IEEE 754 float bit layout" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
Since I don't like passing over something without explaining and interpreting it, let me break this down quickly:
</p>
<p>* <b style="color:cornflowerblue;">S (Sign)</b> — the highest bit (Most Significant Bit - MSB). If it is 0 the number is positive, if 1 the number is negative.</p>
<p>* <b style="color:cornflowerblue;">Exponent</b> — 8 bits that determine the power of 2 for the number, but in a biased representation (add 127).</p>
<p>* <b style="color:cornflowerblue;">Mantissa</b> — 23 bits that define the digits after the decimal point.</p>
<p>
So if you want to change the sign of a number from positive to negative or vice versa, all you need to do is flip <b style="color:cornflowerblue;">bit 31</b> from 0 to 1 or from 1 to 0. The rest of the number (the exponent and mantissa) stays exactly as it is.
</p>
<p>
Getting back to our topic — the sign of the number lives in the highest bit (MSB). Is it possible to change the sign of a floating point number without any FPU instructions?
</p>


```c
#include <stdio.h>
 
float my_abs (float i)
{
    // clear bit 31 (sign bit) — force the number to be positive
    unsigned int tmp = (*(unsigned int*)&i) & 0x7FFFFFFF; // AND with mask: all 1s except bit 31
    return *(float*)&tmp; // reinterpret the modified bits as float
};
 
float set_sign (float i)
{
    // set bit 31 (sign bit) — force the number to be negative
    unsigned int tmp = (*(unsigned int*)&i) | 0x80000000; // OR with mask: only bit 31 is 1
    return *(float*)&tmp; // reinterpret the modified bits as float
};
 
float negate (float i)
{
    // flip bit 31 (sign bit) — toggle the sign
    unsigned int tmp = (*(unsigned int*)&i) ^ 0x80000000; // XOR with mask: flips only bit 31
    return *(float*)&tmp; // reinterpret the modified bits as float
};
 
int main()
{
    printf ("my_abs():\n");
    printf ("%f\n", my_abs (123.456));   // should print 123.456
    printf ("%f\n", my_abs (-456.123));  // should print 456.123
    printf ("set_sign():\n");
    printf ("%f\n", set_sign (123.456)); // should print -123.456
    printf ("%f\n", set_sign (-456.123)); // should print -456.123
    printf ("negate():\n");
    printf ("%f\n", negate (123.456));   // should print -123.456
    printf ("%f\n", negate (-456.123));  // should print 456.123
};
```

<p>
We need this trick in C/C++ to copy to and from a float value without any actual conversion. There are three functions: <code style="color:chartreuse;">my_abs()</code> clears the MSB (sets it to 0); <code style="color:chartreuse;">set_sign()</code> sets the MSB (forces it to 1); and <code style="color:chartreuse;">negate()</code> flips it. <code style="color:chartreuse;">XOR</code> can be used to flip a bit.
</p>
<hr>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">x86</h2>
 
<p>
The code is straightforward at this point.
</p>
<p>
<b>Listing 1.286: Optimizing MSVC 2012</b>
</p>


```nasm
_tmp$ = 8
_i$   = 8
 
_my_abs PROC
    and DWORD PTR _i$[esp-4], 2147483647    ; AND with 0x7FFFFFFF — clear bit 31 (sign bit)
    fld DWORD PTR _tmp$[esp-4]              ; load the modified float from stack into ST0 (FPU return register)
    ret 0
_my_abs ENDP
 
_tmp$ = 8
_i$   = 8
 
_set_sign PROC
    or  DWORD PTR _i$[esp-4], -2147483648  ; OR with 0x80000000 — set bit 31 (sign bit)
    fld DWORD PTR _tmp$[esp-4]             ; load the modified float into ST0
    ret 0
_set_sign ENDP
 
_tmp$ = 8
_i$   = 8
 
_negate PROC
    xor DWORD PTR _i$[esp-4], -2147483648  ; XOR with 0x80000000 — flip bit 31 (sign bit)
    fld DWORD PTR _tmp$[esp-4]             ; load the modified float into ST0
    ret 0
_negate ENDP
```

 
<p>
A quick explanation:
</p>
<p>* <code style="color:chartreuse;">DWORD PTR _i$[esp-4]</code> — points to the first parameter on the stack (because in Win32 the function receives a float on the stack).</p>
<p>* <code style="color:chartreuse;">and ... 0x7FFFFFFF</code> — modifies the bit directly in memory.</p>
<p>* <code style="color:chartreuse;">fld</code> — loads the modified value from its new location into the FPU register <code style="color:chartreuse;">ST0</code> in order to return it.</p>
<p>
<code style="color:chartreuse;">AND</code> clears and <code style="color:chartreuse;">OR</code> sets the desired bit. <code style="color:chartreuse;">XOR</code> flips it. Finally, the modified value is loaded into <code style="color:chartreuse;">ST0</code>, because floating point values are returned in that register.
</p>
<p>
Now let's try MSVC 2012 optimizing for x64:
</p>


```nasm
tmp$ = 8
i$   = 8
 
my_abs PROC
    movss DWORD PTR [rsp+8], xmm0       ; spill float argument from XMM0 onto stack
    mov   eax, DWORD PTR i$[rsp]        ; load the 32-bit representation into EAX
    btr   eax, 31                       ; BTR: test bit 31 then reset (clear) it
    mov   DWORD PTR tmp$[rsp], eax      ; store modified value back onto stack
    movss xmm0, DWORD PTR tmp$[rsp]     ; load modified float into XMM0 (return register in Win64)
    ret   0
my_abs ENDP
 
set_sign PROC
    movss DWORD PTR [rsp+8], xmm0       ; spill float argument from XMM0 onto stack
    mov   eax, DWORD PTR i$[rsp]        ; load the 32-bit representation into EAX
    bts   eax, 31                       ; BTS: test bit 31 then set it
    mov   DWORD PTR tmp$[rsp], eax      ; store modified value back onto stack
    movss xmm0, DWORD PTR tmp$[rsp]     ; load modified float into XMM0
    ret   0
set_sign ENDP
 
negate PROC
    movss DWORD PTR [rsp+8], xmm0       ; spill float argument from XMM0 onto stack
    mov   eax, DWORD PTR i$[rsp]        ; load the 32-bit representation into EAX
    btc   eax, 31                       ; BTC: test bit 31 then complement (flip) it
    mov   DWORD PTR tmp$[rsp], eax      ; store modified value back onto stack
    movss xmm0, DWORD PTR tmp$[rsp]     ; load modified float into XMM0
    ret   0
negate ENDP
```
 

<p>
Here the first float parameter arrives in <code style="color:chartreuse;">xmm0</code> and is temporarily copied to the local stack. Then three new instructions appear:
</p>
<p>* <b style="color:cornflowerblue;">BTR</b> (Bit Test and Reset) — tests the bit value (puts it in the Carry Flag), then clears it (sets it to zero). A shorthand for AND with an inverted mask.</p>
<p>* <b style="color:cornflowerblue;">BTS</b> (Bit Test and Set) — tests then sets the bit.</p>
<p>* <b style="color:cornflowerblue;">BTC</b> (Bit Test and Complement) — tests then flips the bit.</p>
<p>
Finally, the result is copied into <code style="color:chartreuse;">XMM0</code>, because floating point values are returned through <code style="color:chartreuse;">XMM0</code> in the Win64 environment.
</p>
<hr>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">MIPS</h2>
 

```nasm
my_abs:
    ; move from coprocessor 1 (FPU) to integer register:
    mfc1    $v1, $f12               ; $v1 = float argument from FPU register $f12
    li      $v0, 0x7FFFFFFF         ; $v0 = 0x7FFFFFFF (mask to clear sign bit)
    and     $v0, $v1                ; $v0 = $v1 & 0x7FFFFFFF — clear bit 31
    mtc1    $v0, $f0                ; move result back to FPU register $f0 (return value)
    jr      $ra                     ; return
    or      $at, $zero              ; branch delay slot (NOP)
 
set_sign:
    ; move from coprocessor 1 (FPU) to integer register:
    mfc1    $v0, $f12               ; $v0 = float argument from FPU register $f12
    lui     $v1, 0x8000             ; $v1 = 0x80000000 (load upper immediate: 0x8000 << 16)
    or      $v0, $v1, $v0           ; $v0 = $v0 | 0x80000000 — set bit 31
    mtc1    $v0, $f0                ; move result back to FPU register $f0
    jr      $ra                     ; return
    or      $at, $zero              ; branch delay slot (NOP)
 
negate:
    ; move from coprocessor 1 (FPU) to integer register:
    mfc1    $v0, $f12               ; $v0 = float argument from FPU register $f12
    lui     $v1, 0x8000             ; $v1 = 0x80000000
    xor     $v0, $v1, $v0           ; $v0 = $v0 ^ 0x80000000 — flip bit 31
    mtc1    $v0, $f0                ; move result back to FPU register $f0
    jr      $ra                     ; return
    or      $at, $zero              ; branch delay slot (NOP)
```
 

<p>
GCC 4.4.5 for MIPS does roughly the same thing:
</p>
<p>
<b>Listing 1.288: Optimizing GCC 4.4.5 (IDA)</b>
</p>


```nasm
my_abs:
    mfc1    $v1, $f12               ; Move From Coprocessor 1: transfer float from $f12 to integer $v1
    li      $v0, 0x7FFFFFFF         ; load mask 0x7FFFFFFF into $v0
    and     $v0, $v1                ; $v0 = float_bits & 0x7FFFFFFF — clear sign bit
    mtc1    $v0, $f0                ; Move To Coprocessor 1: transfer result to FPU return register $f0
    jr      $ra                     ; return
    or      $at, $zero              ; branch delay slot (NOP)
 
set_sign:
    mfc1    $v0, $f12               ; transfer float from $f12 to integer $v0
    lui     $v1, 0x8000             ; $v1 = 0x8000 << 16 = 0x80000000
    or      $v0, $v1, $v0           ; $v0 = float_bits | 0x80000000 — set sign bit
    mtc1    $v0, $f0                ; transfer result to FPU return register $f0
    jr      $ra                     ; return
    or      $at, $zero              ; branch delay slot (NOP)
 
negate:
    mfc1    $v0, $f12               ; transfer float from $f12 to integer $v0
    lui     $v1, 0x8000             ; $v1 = 0x80000000
    xor     $v0, $v1, $v0           ; $v0 = float_bits ^ 0x80000000 — flip sign bit
    mtc1    $v0, $f0                ; transfer result to FPU return register $f0
    jr      $ra                     ; return
    or      $at, $zero              ; branch delay slot (NOP)
```
 
<p>
A quick explanation:
</p>
<p>* <code style="color:chartreuse;">mfc1 $v1, $f12</code> — Move From Coprocessor 1. Transfers from <code style="color:chartreuse;">$f12</code> (first parameter) to <code style="color:chartreuse;">$v1</code> (integer CPU register).</p>
<p>* The modification is done using <code style="color:chartreuse;">and</code>/<code style="color:chartreuse;">or</code>/<code style="color:chartreuse;">xor</code> with the appropriate mask.</p>
<p>* <code style="color:chartreuse;">mtc1 $v0, $f0</code> — Move To Coprocessor 1. Returns the result in <code style="color:chartreuse;">$f0</code> (FPU return register).</p>
<p>
Loading <code style="color:chartreuse;">0x80000000</code> is done with <code style="color:chartreuse;">lui $v1, 0x8000</code> (Load Upper Immediate): it places <code style="color:chartreuse;">0x8000</code> in the upper 16 bits and zeros the lower 16 bits, producing <code style="color:chartreuse;">0x80000000</code> because <code style="color:chartreuse;">0x8000 << 16 = 0x80000000</code>. This saves us from needing an extra <code style="color:chartreuse;">ori</code>.
</p>
<hr>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM</h2>
 
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing Keil 6/2013 (ARM mode)</h3>
 

```nasm
my_abs PROC
    BIC r0, r0, #0x80000000     ; clear bit 31 — BIC = Bitwise bit Clear (AND with inverted mask)
    BX  lr                      ; return
    ENDP
 
set_sign PROC
    ORR r0, r0, #0x80000000     ; set bit 31 — ORR = logical OR
    BX  lr                      ; return
    ENDP
 
negate PROC
    EOR r0, r0, #0x80000000     ; flip bit 31 — EOR = Exclusive OR (ARM name for XOR)
    BX  lr                      ; return
    ENDP
```
 
<p>
All good so far. ARM has the <code style="color:chartreuse;">BIC</code> instruction that clears specific bits explicitly. <code style="color:chartreuse;">EOR</code> is the ARM instruction name for the XOR operation ("Exclusive OR").
</p>
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing Keil 6/2013 (Thumb mode)</h3>
 
```nasm
my_abs PROC
    LSLS r0, r0, #1             ; R0 = i << 1  (shifts out the sign bit MSB)
    LSRS r0, r0, #1             ; R0 = (i << 1) >> 1  (shifts back, MSB is now 0)
    BX   lr                     ; return
    ENDP
 
set_sign PROC
    MOVS r1, #1                 ; R1 = 1
    LSLS r1, r1, #31            ; R1 = 1 << 31 = 0x80000000  (build the mask)
    ORRS r0, r0, r1             ; R0 = R0 | 0x80000000 — set bit 31
    BX   lr                     ; return
    ENDP
 
negate PROC
    MOVS r1, #1                 ; R1 = 1
    LSLS r1, r1, #31            ; R1 = 1 << 31 = 0x80000000  (build the mask)
    EORS r0, r0, r1             ; R0 = R0 ^ 0x80000000 — flip bit 31
    BX   lr                     ; return
    ENDP
```
 
<p>
Thumb mode in ARM offers 16-bit instructions, and not much data can be encoded in them, so the <code style="color:chartreuse;">MOVS/LSLS</code> instruction pair is used here to build the constant <code style="color:chartreuse;">0x80000000</code>. It works like this: <code style="color:chartreuse;">1 << 31 = 0x80000000</code>.
</p>
<p>
The <code style="color:chartreuse;">my_abs</code> code looks strange — it is effectively doing <code style="color:chartreuse;">(i << 1) >> 1</code>. That expression seems meaningless. But when <code style="color:chartreuse;">input << 1</code> executes, the MSB (the sign bit) gets dropped. When the result is then <code style="color:chartreuse;">>> 1</code>, all bits shift back to their positions, but the MSB is now zero, because all "new" bits that appear from shift operations are always zeros. So the <code style="color:chartreuse;">LSLS/LSRS</code> pair effectively clears the MSB.
</p>
<hr>
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing GCC 4.6.3 (Raspberry Pi, ARM mode)</h3>
 
<p>
<b>Listing 1.291: Optimizing GCC 4.6.3 for Raspberry Pi (ARM mode)</b>
</p>


```nasm
my_abs:
    FMRS R2, S0                 ; copy float from FPU register S0 to integer register R2
    BIC  R3, R2, #0x80000000    ; clear bit 31 — R3 = R2 & ~0x80000000
    FMSR S0, R3                 ; copy result from R3 back to FPU register S0 (return value)
    BX   LR                     ; return
 
set_sign:
    FMRS R2, S0                 ; copy float from FPU register S0 to integer register R2
    ORR  R3, R2, #0x80000000    ; set bit 31 — R3 = R2 | 0x80000000
    FMSR S0, R3                 ; copy result back to FPU register S0
    BX   LR                     ; return
 
negate:
    FMRS R2, S0                 ; copy float from FPU register S0 to integer register R2
    ADD  R3, R2, #0x80000000    ; flip bit 31 using ADD — equivalent to XOR here (see explanation below)
    FMSR S0, R3                 ; copy result back to FPU register S0
    BX   LR                     ; return
```
 
<p>
We are running Raspberry Pi Linux in QEMU which emulates the ARM FPU, so S-registers are used here for floating point numbers instead of R-registers.
</p>
<p>
The <code style="color:chartreuse;">FMRS</code> instruction moves data between GPR (general purpose registers) and the FPU and vice versa.
</p>
<p>
<code style="color:chartreuse;">my_abs()</code> and <code style="color:chartreuse;">set_sign()</code> work as expected, but what about <code style="color:chartreuse;">negate()</code>? Why is there <code style="color:chartreuse;">ADD</code> instead of <code style="color:chartreuse;">XOR</code>?
</p>
<p>
Hard to believe, but the instruction <code style="color:chartreuse;">ADD register, 0x80000000</code> works exactly like <code style="color:chartreuse;">XOR register, 0x80000000</code>. First, what is our goal? The goal is to flip the MSB. Forget XOR for a moment. From school math we may remember that adding values like 1000 to other numbers does not affect the last 3 digits at all. Example: 1234567 + 10000 = 1244567 (the last 4 digits are unaffected).
</p>
<p>
But here we are working in binary, and <code style="color:chartreuse;">0x80000000</code> is <code style="color:chartreuse;">0b10000000000000000000000000000000</code> — meaning only the highest bit is set.
</p>
<p>
Adding <code style="color:chartreuse;">0x80000000</code> to any value never affects the lower 31 bits — it only affects the MSB. Adding 1 to 0 gives 1. Adding 1 to 1 gives <code style="color:chartreuse;">0b10</code> in binary, but bit 32 (counting from zero) gets dropped because our registers are 32 bits wide, so the result becomes 0. That is why <code style="color:chartreuse;">XOR</code> can be replaced by <code style="color:chartreuse;">ADD</code> here. It is hard to say why GCC decided to do it this way, but it works correctly.
</p>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.28.5 Counting bits set to 1</b></h1>
<img src="/assets/img/Counting.png" alt="Counting" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<hr>
<p>
This is a simple example of a function that counts the number of bits whose value is 1 in the input value.
</p>
<p>
These operations are also called "population count".
</p>


```c
#include <stdio.h>
#define IS_SET(flag, bit) ((flag) & (bit)) // macro: checks if a specific bit is set in flag using bitwise AND
 
int f(unsigned int a)
{
    int i;
    int rt = 0;                      // bit counter, starts at 0
    for (i = 0; i < 32; i++)         // iterate over all 32 bit positions
        if (IS_SET(a, 1 << i))       // check if bit i is set in a
            rt++;                    // if set, increment counter
    return rt;                       // return total count of set bits
}
 
int main()
{
    f(0x12345678);                   // test call
}
```
 

<p>
In this loop, the counter i counts from 0 to 31, so <code style="color:chartreuse;">1 &lt;&lt; i</code> produces values from 1 to <code style="color:chartreuse;">0x80000000</code>. To describe this operation in natural language, we say "shift 1 left by n bits". In other words, <code style="color:chartreuse;">1 &lt;&lt; i</code> sequentially produces every possible bit position in a 32-bit number. The bit that is freed on the right is always zeroed (set to 0).
</p>
<table style="border-collapse:collapse; width:100%; font-size:16px;">
<thead>
<tr style="background:#161b22; color:#c9d1d9;">
<th style="border:1px solid #30363d; padding:8px;">C/C++ expression</th>
<th style="border:1px solid #30363d; padding:8px;">Power of 2</th>
<th style="border:1px solid #30363d; padding:8px;">Decimal</th>
<th style="border:1px solid #30363d; padding:8px;">Hexadecimal</th>
</tr>
</thead>
<tbody style="color:#c9d1d9;">
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 0</td><td style="border:1px solid #30363d;padding:6px;">2^0</td><td style="border:1px solid #30363d;padding:6px;">1</td><td style="border:1px solid #30363d;padding:6px;">1</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 1</td><td style="border:1px solid #30363d;padding:6px;">2^1</td><td style="border:1px solid #30363d;padding:6px;">2</td><td style="border:1px solid #30363d;padding:6px;">2</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 2</td><td style="border:1px solid #30363d;padding:6px;">2^2</td><td style="border:1px solid #30363d;padding:6px;">4</td><td style="border:1px solid #30363d;padding:6px;">4</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 3</td><td style="border:1px solid #30363d;padding:6px;">2^3</td><td style="border:1px solid #30363d;padding:6px;">8</td><td style="border:1px solid #30363d;padding:6px;">8</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 4</td><td style="border:1px solid #30363d;padding:6px;">2^4</td><td style="border:1px solid #30363d;padding:6px;">16</td><td style="border:1px solid #30363d;padding:6px;">0x10</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 5</td><td style="border:1px solid #30363d;padding:6px;">2^5</td><td style="border:1px solid #30363d;padding:6px;">32</td><td style="border:1px solid #30363d;padding:6px;">0x20</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 6</td><td style="border:1px solid #30363d;padding:6px;">2^6</td><td style="border:1px solid #30363d;padding:6px;">64</td><td style="border:1px solid #30363d;padding:6px;">0x40</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 7</td><td style="border:1px solid #30363d;padding:6px;">2^7</td><td style="border:1px solid #30363d;padding:6px;">128</td><td style="border:1px solid #30363d;padding:6px;">0x80</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 8</td><td style="border:1px solid #30363d;padding:6px;">2^8</td><td style="border:1px solid #30363d;padding:6px;">256</td><td style="border:1px solid #30363d;padding:6px;">0x100</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 9</td><td style="border:1px solid #30363d;padding:6px;">2^9</td><td style="border:1px solid #30363d;padding:6px;">512</td><td style="border:1px solid #30363d;padding:6px;">0x200</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 10</td><td style="border:1px solid #30363d;padding:6px;">2^10</td><td style="border:1px solid #30363d;padding:6px;">1024</td><td style="border:1px solid #30363d;padding:6px;">0x400</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 11</td><td style="border:1px solid #30363d;padding:6px;">2^11</td><td style="border:1px solid #30363d;padding:6px;">2048</td><td style="border:1px solid #30363d;padding:6px;">0x800</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 12</td><td style="border:1px solid #30363d;padding:6px;">2^12</td><td style="border:1px solid #30363d;padding:6px;">4096</td><td style="border:1px solid #30363d;padding:6px;">0x1000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 13</td><td style="border:1px solid #30363d;padding:6px;">2^13</td><td style="border:1px solid #30363d;padding:6px;">8192</td><td style="border:1px solid #30363d;padding:6px;">0x2000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 14</td><td style="border:1px solid #30363d;padding:6px;">2^14</td><td style="border:1px solid #30363d;padding:6px;">16384</td><td style="border:1px solid #30363d;padding:6px;">0x4000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 15</td><td style="border:1px solid #30363d;padding:6px;">2^15</td><td style="border:1px solid #30363d;padding:6px;">32768</td><td style="border:1px solid #30363d;padding:6px;">0x8000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 16</td><td style="border:1px solid #30363d;padding:6px;">2^16</td><td style="border:1px solid #30363d;padding:6px;">65536</td><td style="border:1px solid #30363d;padding:6px;">0x10000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 17</td><td style="border:1px solid #30363d;padding:6px;">2^17</td><td style="border:1px solid #30363d;padding:6px;">131072</td><td style="border:1px solid #30363d;padding:6px;">0x20000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 18</td><td style="border:1px solid #30363d;padding:6px;">2^18</td><td style="border:1px solid #30363d;padding:6px;">262144</td><td style="border:1px solid #30363d;padding:6px;">0x40000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 19</td><td style="border:1px solid #30363d;padding:6px;">2^19</td><td style="border:1px solid #30363d;padding:6px;">524288</td><td style="border:1px solid #30363d;padding:6px;">0x80000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 20</td><td style="border:1px solid #30363d;padding:6px;">2^20</td><td style="border:1px solid #30363d;padding:6px;">1048576</td><td style="border:1px solid #30363d;padding:6px;">0x100000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 21</td><td style="border:1px solid #30363d;padding:6px;">2^21</td><td style="border:1px solid #30363d;padding:6px;">2097152</td><td style="border:1px solid #30363d;padding:6px;">0x200000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 22</td><td style="border:1px solid #30363d;padding:6px;">2^22</td><td style="border:1px solid #30363d;padding:6px;">4194304</td><td style="border:1px solid #30363d;padding:6px;">0x400000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 23</td><td style="border:1px solid #30363d;padding:6px;">2^23</td><td style="border:1px solid #30363d;padding:6px;">8388608</td><td style="border:1px solid #30363d;padding:6px;">0x800000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 24</td><td style="border:1px solid #30363d;padding:6px;">2^24</td><td style="border:1px solid #30363d;padding:6px;">16777216</td><td style="border:1px solid #30363d;padding:6px;">0x1000000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 25</td><td style="border:1px solid #30363d;padding:6px;">2^25</td><td style="border:1px solid #30363d;padding:6px;">33554432</td><td style="border:1px solid #30363d;padding:6px;">0x2000000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 26</td><td style="border:1px solid #30363d;padding:6px;">2^26</td><td style="border:1px solid #30363d;padding:6px;">67108864</td><td style="border:1px solid #30363d;padding:6px;">0x4000000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 27</td><td style="border:1px solid #30363d;padding:6px;">2^27</td><td style="border:1px solid #30363d;padding:6px;">134217728</td><td style="border:1px solid #30363d;padding:6px;">0x8000000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 28</td><td style="border:1px solid #30363d;padding:6px;">2^28</td><td style="border:1px solid #30363d;padding:6px;">268435456</td><td style="border:1px solid #30363d;padding:6px;">0x10000000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 29</td><td style="border:1px solid #30363d;padding:6px;">2^29</td><td style="border:1px solid #30363d;padding:6px;">536870912</td><td style="border:1px solid #30363d;padding:6px;">0x20000000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 30</td><td style="border:1px solid #30363d;padding:6px;">2^30</td><td style="border:1px solid #30363d;padding:6px;">1073741824</td><td style="border:1px solid #30363d;padding:6px;">0x40000000</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">1 &lt;&lt; 31</td><td style="border:1px solid #30363d;padding:6px;">2^31</td><td style="border:1px solid #30363d;padding:6px;">2147483648</td><td style="border:1px solid #30363d;padding:6px;">0x80000000</td></tr>
</tbody>
</table>
<p>
These constants (bit masks) appear very frequently in code, and the reverse engineer must be able to recognize them quickly. Decimal numbers below 65536 and hexadecimal ones are very easy to memorize. Decimal numbers above 65536 are generally not worth memorizing. These constants are used very heavily to set flags for specific bits. Example: a portion of <code style="color:chartreuse;">ssl_private.h</code> from Apache 2.4.6 source code:
</p>



```c
#define SSL_OPT_NONE           (0)       // no options set
#define SSL_OPT_RELSET         (1<<0)    // bit 0: relative set
#define SSL_OPT_STDENVVARS     (1<<1)    // bit 1: standard environment variables
#define SSL_OPT_EXPORTCERTDATA (1<<3)    // bit 3: export certificate data
#define SSL_OPT_FAKEBASICAUTH  (1<<4)    // bit 4: fake basic auth
#define SSL_OPT_STRICTREQUIRE  (1<<5)    // bit 5: strict require
#define SSL_OPT_OPTRENEGOTIATE (1<<6)    // bit 6: optional renegotiation
#define SSL_OPT_LEGACYDNFORMAT (1<<7)    // bit 7: legacy DN format
```
 

<p>
Let's return to our example.
</p>
<p>
The <code style="color:chartreuse;">IS_SET</code> macro checks for the presence of a bit in <code style="color:chartreuse;">a</code>. The <code style="color:chartreuse;">IS_SET</code> macro is in fact an <code style="color:chartreuse;">AND</code> operation (logical AND) and returns 0 if the specified bit is not present, or returns the bit mask itself if the bit is present. The <code style="color:chartreuse;">if</code> statement in C/C++ fires if the expression inside it is non-zero (it can even be 123456), and that is why it always works correctly.
</p>
<hr>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">x86</h2>
 
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">MSVC</h3>
 
<p>Listing 1.292: MSVC 2010</p>



```nasm
_rt$ = -8      ; size = 4 bytes
_i$  = -4      ; size = 4 bytes
_a$  = 8       ; size = 4 bytes
 
_f PROC
    push ebp
    mov ebp, esp
    sub esp, 8                            ; allocate 8 bytes on stack for rt and i
    mov DWORD PTR _rt$[ebp], 0            ; rt = 0
    mov DWORD PTR _i$[ebp], 0            ; i = 0
    jmp SHORT $LN4@f                     ; jump to loop condition check
$LN3@f:
    mov eax, DWORD PTR _i$[ebp]          ; load i into EAX
    add eax, 1                           ; EAX = i + 1
    mov DWORD PTR _i$[ebp], eax          ; i++
$LN4@f:
    cmp DWORD PTR _i$[ebp], 32           ; compare i with 32 (0x20)
    jge SHORT $LN2@f                     ; if i >= 32, exit loop
    mov edx, 1                           ; EDX = 1 (base bit mask)
    mov ecx, DWORD PTR _i$[ebp]          ; ECX = i (shift amount)
    shl edx, cl                          ; EDX = 1 << i  (build the bit mask)
    and edx, DWORD PTR _a$[ebp]          ; EDX = mask & a  (test if bit i is set)
    je SHORT $LN1@f                      ; AND result was 0? skip increment
    mov eax, DWORD PTR _rt$[ebp]         ; load rt
    add eax, 1                           ; rt + 1
    mov DWORD PTR _rt$[ebp], eax         ; rt++
$LN1@f:
    jmp SHORT $LN3@f                     ; loop back to increment
$LN2@f:
    mov eax, DWORD PTR _rt$[ebp]         ; return rt in EAX
    mov esp, ebp
    pop ebp
    ret 0
_f ENDP
```
 


<hr>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">x32dbg</h2>
 
<p>
We will run the above example in x32dbg, using the value <code style="color:chartreuse;">0x12345678</code> (God willing I will explain it in detail so everything is clear and easy).
</p>
<img src="/assets/x32dbg2/bits_1_1.png" alt="bits_1" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
Let's step into the first iteration when <code style="color:chartreuse;">i = 0</code>, and see how <code style="color:chartreuse;">i</code> is loaded into <code style="color:chartreuse;">ECX</code>:
</p>
<p>
The first instruction <code style="color:chartreuse;">mov edx, 1</code> places the value 1 into <code style="color:chartreuse;">EDX</code> — this is the mask for bit zero.
</p>
<p>
Then the instruction <code style="color:chartreuse;">mov ecx, dword ptr ss:[ebp-0x04]</code> loads the value of <code style="color:chartreuse;">i</code> into <code style="color:chartreuse;">ECX</code>, which is 0 since this is the beginning of the loop.
</p>
<p>
Then the instruction <code style="color:chartreuse;">shl edx, cl</code> — the most important one (Shift Logical Left) — shifts the value of <code style="color:chartreuse;">EDX</code> (which is 1) left by the number of bits in <code style="color:chartreuse;">CL</code> (the low byte of <code style="color:chartreuse;">ECX</code>, containing <code style="color:chartreuse;">i=0</code>). Result: 1 &lt;&lt; 0 = 1.
</p>
<p>
So <code style="color:chartreuse;">EDX</code> is still 1, and it is the mask that will check bit zero.
</p>
<img src="/assets/x32dbg2/bits_2_2.png" alt="bits_2" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
After that it will execute <code style="color:chartreuse;">je</code>.
</p>
<p>
When <code style="color:chartreuse;">i = 1</code>, we see how <code style="color:chartreuse;">i</code> is loaded into <code style="color:chartreuse;">ECX</code>:
</p>
<img src="/assets/x32dbg2/bits_3_3.png" alt="bits_3" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
<code style="color:chartreuse;">EDX</code> holds 1. And <code style="color:chartreuse;">SHL</code> will now execute.
</p>
<img src="/assets/x32dbg2/bits_4_4.png" alt="bits_4" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
<code style="color:chartreuse;">EDX</code> now holds <code style="color:chartreuse;">1 &lt;&lt; 1</code> (i.e. 2). This is the bit mask as we said before.
</p>
<p>
The <code style="color:chartreuse;">AND</code> sets <code style="color:chartreuse;">ZF</code> to 1, which means that the input value (<code style="color:chartreuse;">0x12345678</code>) ANDed with 2:
</p>
<img src="/assets/x32dbg2/bits_5.png" alt="bits_5" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
So, there is no corresponding bit set in the input value.
</p>
<p>
The part of the code that increments the counter will not execute: the <code style="color:chartreuse;">JZ</code> instruction skips it.
</p>
<p>
Let's trace a bit more. Now <code style="color:chartreuse;">i = 4</code>. <code style="color:chartreuse;">SHL</code> will execute:
</p>
<img src="/assets/x32dbg2/bits_6.png" alt="bits_6" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
<code style="color:chartreuse;">EDX = 1 &lt;&lt; 4</code> (i.e. <code style="color:chartreuse;">0x10</code> or 16):
</p>
<img src="/assets/x32dbg2/bits_7.png" alt="bits_7" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
Another mask.
</p>
<p>
When the <code style="color:chartreuse;">AND</code> executes:
</p>
<img src="/assets/x32dbg2/bits_8.png" alt="bits_8" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
<code style="color:chartreuse;">ZF</code> became 0 because this bit is present in the input value.
</p>
<p>
Indeed, <code style="color:chartreuse;">0x12345678 &amp; 0x10 = 0x10</code>. This bit gets counted: the jump does not take place, and the bit counter is incremented.
</p>
<p>
The function returns 13. That is the total count of bits set to 1 in <code style="color:chartreuse;">0x12345678</code>.
</p>
<hr>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">GCC</h2>
 
<p>Let's compile it in GCC 4.4.1:</p>
<p>Listing 1.293: GCC 4.4.1</p>



```nasm
public f
f proc near
rt      = dword ptr -0Ch   ; local variable: bit counter
i       = dword ptr -8     ; local variable: loop index
arg_0   = dword ptr  8     ; function argument: input value a
 
    push ebp
    mov ebp, esp
    push ebx                       ; save EBX (callee-saved register)
    sub esp, 10h                   ; allocate 16 bytes on stack
    mov [ebp+rt], 0                ; rt = 0
    mov [ebp+i], 0                 ; i = 0
    jmp short loc_80483EF          ; jump to loop condition check
loc_80483D0:
    mov eax, [ebp+i]               ; load i into EAX (shift amount)
    mov edx, 1                     ; EDX = 1 (base value for mask)
    mov ebx, edx                   ; EBX = 1 (copy to working register)
    mov ecx, eax                   ; ECX = i (shift amount)
    shl ebx, cl                    ; EBX = 1 << i  (build the bit mask)
    mov eax, ebx                   ; EAX = 1 << i
    and eax, [ebp+arg_0]           ; EAX = mask & a  (test if bit i is set)
    test eax, eax                  ; is EAX zero?
    jz short loc_80483EB           ; if zero, skip increment
    add [ebp+rt], 1                ; rt++
loc_80483EB:
    add [ebp+i], 1                 ; i++
loc_80483EF:
    cmp [ebp+i], 1Fh               ; compare i with 31 (0x1F)
    jle short loc_80483D0          ; if i <= 31, continue loop
    mov eax, [ebp+rt]              ; return rt in EAX
    add esp, 10h
    pop ebx                        ; restore EBX
    pop ebp
    retn
f endp
```
 


<hr>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">x64</h2>
 
<p>
Let's modify the example slightly to extend it to 64-bit:
</p>



```c
#include <stdio.h>
#include <stdint.h>
#define IS_SET(flag, bit) ((flag) & (bit)) // macro: tests whether a specific bit is set
 
int f(uint64_t a)
{
    uint64_t i;
    int rt = 0;                        // bit counter
    for (i = 0; i < 64; i++)           // iterate over all 64 bit positions
        if (IS_SET(a, 1ULL << i))      // 1ULL ensures a 64-bit shift
            rt++;
    return rt;
}
```
 

<p>Non-optimizing GCC 4.8.2</p>
<p>Listing 1.294: Non-optimizing GCC 4.8.2</p>



```nasm
f:
    push rbp
    mov rbp, rsp
    mov QWORD PTR [rbp-24], rdi    ; store argument a on stack
    mov DWORD PTR [rbp-12], 0      ; rt = 0
    mov QWORD PTR [rbp-8], 0       ; i = 0
    jmp .L2                        ; jump to loop condition
.L4:
    mov rax, QWORD PTR [rbp-8]     ; RAX = i
    mov rdx, QWORD PTR [rbp-24]    ; RDX = a
    mov ecx, eax                   ; ECX = i (shift amount)
    shr rdx, cl                    ; RDX = a >> i  (shift a right by i bits)
    mov rax, rdx                   ; RAX = a >> i
    and eax, 1                     ; EAX = (a>>i) & 1  (isolate lowest bit)
    test rax, rax                  ; is lowest bit zero?
    je .L3                         ; if zero, skip increment
    add DWORD PTR [rbp-12], 1      ; rt++
.L3:
    add QWORD PTR [rbp-8], 1       ; i++
.L2:
    cmp QWORD PTR [rbp-8], 63      ; i <= 63?
    jbe .L4                        ; if yes, jump back to loop body
    mov eax, DWORD PTR [rbp-12]    ; rt into EAX for return
    pop rbp
    ret
```
 


<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing GCC 4.8.2</h3>
<p>Listing 1.295: Optimizing GCC 4.8.2</p>



```nasm
f:
    xor eax, eax             ; rt lives in EAX, initialize to 0
    xor ecx, ecx             ; i lives in ECX, initialize to 0
.L3:
    mov rsi, rdi             ; load input value (a)
    lea edx, [rax+1]         ; EDX = EAX + 1  (proposed new value of rt)
    shr rsi, cl              ; RSI = RSI >> CL  (i.e. a >> i)
    and esi, 1               ; ESI = (a>>i) & 1  (isolate lowest bit)
    cmovne eax, edx          ; if ZF=0 (bit was set): EAX = EDX (commit rt++)
    add rcx, 1               ; i++
    cmp rcx, 64              ; i == 64?
    jne .L3                  ; if not, repeat loop
    rep ret                  ; FATRET — AMD-recommended return after conditional jump
```
 


<p>
This code is shorter, but a bit unusual.
</p>
<p>
In all the examples we have seen so far, we incremented the value of "rt" after comparing a specific bit, but here the code increments "rt" beforehand (line 6), writing the new value into register EDX. This means: if the last bit was 1, the <code style="color:chartreuse;">CMOVNE</code> instruction (which is equivalent to <code style="color:chartreuse;">CMOVNZ</code>) commits the new value of "rt" by moving EDX ("proposed rt value") into EAX ("the current rt that will be returned").
</p>
<p>
Consequently, the increment operation happens at every step of the loop — that is, 64 times — regardless of the input value.
</p>
<p>
The advantage of this code is that it contains only one conditional jump (at the end of the loop) instead of two (one to skip the rt++ increment and one at the end of the loop). This can make it faster on modern processors that have branch predictors: section 2.4.1 on page 575.
</p>
<p>
The last instruction is <code style="color:chartreuse;">REP RET</code> (opcode F3 C3), also called <code style="color:chartreuse;">FATRET</code> by MSVC. This is an optimized variant of <code style="color:chartreuse;">RET</code>, recommended by AMD to be placed at the end of a function when <code style="color:chartreuse;">RET</code> immediately follows a conditional jump.
</p>
<hr>
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing MSVC 2010</h3>
<p>Listing 1.296: Optimizing MSVC 2010</p>



```nasm
a$ = 8
f PROC
    ; RCX = input value
    xor eax, eax                          ; rt = 0
    mov edx, 1                            ; RDX = 1 (initial bit mask)
    lea r8d, QWORD PTR [rax+64]           ; R8D = 64 (loop counter, counts down)
    npad 5                                ; padding for alignment
$LL4@f:
    test rdx, rcx                         ; is this bit set in the input value?
    je SHORT $LN3@f                       ; if not, skip increment
    inc eax                               ; rt++
$LN3@f:
    rol rdx, 1                            ; RDX rotated left by 1 (cycles the bit, same as SHL here)
    dec r8                                ; R8--
    jne SHORT $LL4@f                      ; if R8 != 0, continue loop
    fatret 0                              ; optimized return (AMD FATRET)
f ENDP
```
 


<p>
Here the <code style="color:chartreuse;">ROL</code> instruction is used instead of <code style="color:chartreuse;">SHL</code>; it is actually "rotate left" rather than "shift left", but in this example it works exactly like <code style="color:chartreuse;">SHL</code>.
</p>
<p>
<code style="color:chartreuse;">R8</code> counts down from <code style="color:chartreuse;">64</code> to <code style="color:chartreuse;">0</code>. It is like i but in reverse. This is a table of some register values during execution:
</p>
<table style="border-collapse:collapse; width:60%; font-size:16px;">
<thead>
<tr style="background:#161b22; color:#c9d1d9;">
<th style="border:1px solid #30363d; padding:8px;">RDX</th>
<th style="border:1px solid #30363d; padding:8px;">R8</th>
</tr>
</thead>
<tbody style="color:#c9d1d9;">
<tr><td style="border:1px solid #30363d;padding:6px;">0x0000000000000001</td><td style="border:1px solid #30363d;padding:6px;">64</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">0x0000000000000002</td><td style="border:1px solid #30363d;padding:6px;">63</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">0x0000000000000004</td><td style="border:1px solid #30363d;padding:6px;">62</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">0x0000000000000008</td><td style="border:1px solid #30363d;padding:6px;">61</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">...</td><td style="border:1px solid #30363d;padding:6px;">...</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">0x4000000000000000</td><td style="border:1px solid #30363d;padding:6px;">2</td></tr>
<tr><td style="border:1px solid #30363d;padding:6px;">0x8000000000000000</td><td style="border:1px solid #30363d;padding:6px;">1</td></tr>
</tbody>
</table>
<p>
At the end we see the <code style="color:chartreuse;">FATRET</code> instruction.
</p>
<hr>
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing MSVC 2012</h3>
<p>Listing 1.297: Optimizing MSVC 2012</p>



```nasm
a$ = 8
f PROC
    ; RCX = input value
    xor eax, eax
    mov edx, 1
    lea r8d, QWORD PTR [rax+32]           ; R8D = 32 (loop runs 32 times, 2 bits per iteration)
    npad 5
$LL4@f:
    ; first pass --------------------------------
    test rdx, rcx                         ; is bit set in input?
    je SHORT $LN3@f
    inc eax                               ; rt++
$LN3@f:
    rol rdx, 1                            ; rotate mask left (advance to next bit)
    ; second pass --------------------------------
    test rdx, rcx                         ; test the next bit (loop unrolling: 2 bits per iteration)
    je SHORT $LN11@f
    inc eax                               ; rt++
$LN11@f:
    rol rdx, 1                            ; rotate mask left again
    ; -------------------------------------------
    dec r8                                ; R8--
    jne SHORT $LL4@f                      ; if R8 != 0, continue
    fatret 0
f ENDP
```
 

<p>
Optimizing MSVC 2012 does almost the same work as MSVC 2010, but somehow it generates two identical loop bodies and the iteration count became 32 instead of 64.
</p>
<p>
Honestly, it is hard to say why. Perhaps an optimization trick? Perhaps a longer loop body is faster? Either way, this code is shown here to demonstrate that compiler output can sometimes be very strange and illogical — yet it works perfectly.
</p>
<hr>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM</h2>
 
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM + Optimizing Xcode 4.6.3 (LLVM) (ARM mode)</h3>
<p>Listing 1.298: Optimizing Xcode 4.6.3 (LLVM) (ARM mode)</p>



```nasm
MOV R1, R0              ; R1 = input value a (preserve it)
MOV R0, #0              ; R0 = 0 (rt counter)
MOV R2, #1              ; R2 = 1 (base mask value)
MOV R3, R0              ; R3 = 0 (i counter)
loc_2E54:
TST R1, R2, LSL R3      ; set flags based on R1 & (R2 << R3)  i.e. a & (1<<i)
ADD R3, R3, #1          ; R3++ (i++)
ADDNE R0, R0, #1        ; if ZF was cleared by TST (bit was set), increment R0 (rt++)
CMP R3, #32             ; compare i with 32
BNE loc_2E54            ; if i != 32, continue loop
BX LR                   ; return
```
 


<p>
<code style="color:chartreuse;">TST</code> is the same as <code style="color:chartreuse;">TEST</code> in x86.
</p>
<p>
As we said before, there are no separate shift instructions in ARM mode. Instead there are modifiers such as <code style="color:chartreuse;">LSL</code> (Logical Shift Left), <code style="color:chartreuse;">LSR</code> (Logical Shift Right), <code style="color:chartreuse;">ASR</code> (Arithmetic Shift Right), <code style="color:chartreuse;">ROR</code> (Rotate Right), and <code style="color:chartreuse;">RRX</code> (Rotate Right with Extend), which can be appended to instructions like <code style="color:chartreuse;">MOV</code>, <code style="color:chartreuse;">TST</code>, <code style="color:chartreuse;">CMP</code>, <code style="color:chartreuse;">ADD</code>, <code style="color:chartreuse;">SUB</code>, <code style="color:chartreuse;">RSB</code>.
</p>
<p>
These modifiers specify how to shift the second operand and by how many bits. So the instruction <code style="color:chartreuse;">TST R1, R2, LSL R3</code> works here as:
</p>



```nasm
R1 ∧ (R2 ≪ R3)   ; bitwise AND of R1 with (R2 shifted left by R3 positions)
```
 
<hr>
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM + Optimizing Xcode 4.6.3 (LLVM) (Thumb-2 mode)</h3>
 
<p>
Almost the same thing, but here two instructions <code style="color:chartreuse;">LSL.W/TST</code> are used instead of a single <code style="color:chartreuse;">TST</code>, because in Thumb mode it is not possible to embed an <code style="color:chartreuse;">LSL</code> modifier directly into <code style="color:chartreuse;">TST</code>.
</p>



```nasm
MOV R1, R0              ; R1 = input value a
MOVS R0, #0             ; R0 = 0 (rt counter)
MOV.W R9, #1            ; R9 = 1 (base mask)
MOVS R3, #0             ; R3 = 0 (i counter)
loc_2F7A:
LSL.W R2, R9, R3        ; R2 = R9 << R3  i.e. 1 << i  (separate shift, required in Thumb)
TST R2, R1              ; set flags based on R2 & R1  i.e. (1<<i) & a
ADD.W R3, R3, #1        ; i++
IT NE                   ; if-then block: execute next instruction only if NE (ZF=0)
ADDNE R0, #1            ; rt++  (only if bit was set)
CMP R3, #32             ; compare i with 32
BNE loc_2F7A            ; if i != 32, continue loop
BX LR                   ; return
```
 



<hr>
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM64 + Optimizing GCC 4.9</h3>
 
<p>Let's take the 64-bit example we used before.</p>
<p>Listing 1.299: Optimizing GCC (Linaro) 4.8</p>




```nasm
f:
    mov w2, 0            ; rt = 0
    mov x5, 1            ; X5 = 1 (base mask value)
    mov w1, w2           ; i = 0
.L2:
    lsl x4, x5, x1       ; X4 = X5 << X1  i.e. 1 << i  (build 64-bit mask)
    add w3, w2, 1        ; W3 = rt + 1  (proposed new rt)
    tst x4, x0           ; (1 << i) & a  (test if bit i is set in a)
    add w1, w1, 1        ; i++
    csel w2, w3, w2, ne  ; if NE (bit was set): w2 = w3 (rt = new_rt), else w2 = w2 (no change)
    cmp w1, 64           ; i < 64?
    bne .L2              ; if not done, repeat loop
    mov w0, w2           ; rt into W0 for return
    ret
```
 


<p>
The <code style="color:chartreuse;">CSEL</code> instruction is "Conditional SELect". It selects one of two values based on the flags set by <code style="color:chartreuse;">TST</code>, and copies the selected value into <code style="color:chartreuse;">W2</code>, which holds the variable <code style="color:chartreuse;">rt</code>.
</p>
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM64 + Non-optimizing GCC 4.9</h3>
<p>Listing 1.300: Non-optimizing GCC (Linaro) 4.8</p>



```nasm
f:
    sub sp, sp, #32
    str x0, [sp,8]           ; store argument "a" in register save area
    str wzr, [sp,24]         ; rt = 0
    str wzr, [sp,28]         ; i = 0
    b .L2                    ; jump to loop condition
.L4:
    ldr w0, [sp,28]          ; load i
    mov x1, 1                ; X1 = 1
    lsl x0, x1, x0           ; X0 = X1 << X0  i.e. 1 << i  (build mask)
    mov x1, x0               ; X1 = 1 << i
    ldr x0, [sp,8]           ; X0 = a
    and x0, x1, x0           ; X0 = (1<<i) & a
    cmp x0, xzr              ; compare X0 with zero
    beq .L3                  ; if zero, skip rt++
    ldr w0, [sp,24]          ; load rt
    add w0, w0, 1            ; rt + 1
    str w0, [sp,24]          ; rt++
.L3:
    ldr w0, [sp,28]          ; load i
    add w0, w0, 1            ; i + 1
    str w0, [sp,28]          ; i++
.L2:
    ldr w0, [sp,28]          ; load i
    cmp w0, 63               ; i <= 63?
    ble .L4                  ; if yes, jump to loop body
    ldr w0, [sp,24]          ; rt into W0 for return
    add sp, sp, 32
    ret
```
 

<hr>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">MIPS</h2>
 
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Non-optimizing GCC</h3>
 


```nasm
f:
    ; IDA does not know variable names, we assigned them manually:
    ; rt = -0x10,  i = -0xC,  var_4 = -4,  a = 0
 
    addiu $sp, -0x18                     ; allocate 24 bytes on stack
    sw $fp, 0x18+var_4($sp)              ; save frame pointer
    move $fp, $sp                        ; set frame pointer
    sw $a0, 0x18+a($fp)                  ; store argument a on stack
    sw $zero, 0x18+rt($fp)               ; rt = 0
    sw $zero, 0x18+i($fp)               ; i = 0
    b loc_68                             ; jump to loop condition check
    or $at, $zero                        ; branch delay slot (NOP)
loc_20:
    li $v1, 1                            ; $v1 = 1 (base mask value)
    lw $v0, 0x18+i($fp)                  ; $v0 = i (shift amount)
    or $at, $zero                        ; load delay slot (NOP)
    sllv $v0, $v1, $v0                   ; $v0 = 1 << i  (SLLV: variable shift amount from register)
    move $v1, $v0                        ; $v1 = mask
    lw $v0, 0x18+a($fp)                  ; $v0 = a
    or $at, $zero                        ; load delay slot (NOP)
    and $v0, $v1, $v0                    ; $v0 = a & (1<<i)
    beqz $v0, loc_58                     ; if zero (bit not set), skip rt++
    or $at, $zero                        ; branch delay slot (NOP)
    lw $v0, 0x18+rt($fp)                 ; load rt
    or $at, $zero                        ; load delay slot (NOP)
    addiu $v0, 1                         ; rt + 1
    sw $v0, 0x18+rt($fp)                ; rt++
loc_58:
    lw $v0, 0x18+i($fp)                  ; load i
    or $at, $zero                        ; load delay slot (NOP)
    addiu $v0, 1                         ; i + 1
    sw $v0, 0x18+i($fp)                 ; i++
loc_68:
    lw $v0, 0x18+i($fp)                  ; load i
    or $at, $zero                        ; load delay slot (NOP)
    slti $v0, 0x20                       ; $v0 = (i < 32) ? 1 : 0
    bnez $v0, loc_20                     ; if i < 32, loop back
    or $at, $zero                        ; branch delay slot (NOP)
    lw $v0, 0x18+rt($fp)                 ; return rt
    move $sp, $fp                        ; load delay slot: restore stack pointer
    lw $fp, 0x18+var_4($sp)              ; restore frame pointer
    addiu $sp, 0x18                      ; load delay slot: deallocate stack
    jr $ra                               ; return to caller
    or $at, $zero                        ; branch delay slot (NOP)
```
 

<p>
This code is long: all local variables live in the local stack and are loaded every time they are needed.
</p>
<p>
The <code style="color:chartreuse;">SLLV</code> instruction is "Shift Word Left Logical Variable" — it differs from <code style="color:chartreuse;">SLL</code> in that the shift amount in <code style="color:chartreuse;">SLL</code> is embedded in the instruction itself (and therefore fixed), whereas <code style="color:chartreuse;">SLLV</code> takes the shift amount from a register.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing GCC</h2>
 
<p>
This code is shorter. There are two shift instructions instead of one. Why?
</p>
<p>
We could replace the first <code style="color:chartreuse;">SLLV</code> instruction with an unconditional branch that jumps directly to the second <code style="color:chartreuse;">SLLV</code>. But that would be an extra jump instruction in the function, and it is always better to get rid of it.
</p>
 
```nasm
f:
    ; $a0 = a
    ; variable rt will be in $v0:
    move $v0, $zero
    ; variable i will be in $v1:
    move $v1, $zero
    li $t0, 1
    li $a3, 32
    sllv $a1, $t0, $v1      ; $a1 = $t0 << $v1 = 1 << i
loc_14:
    and $a1, $a0            ; $a1 = a & (1<<i)
    ; increment i:
    addiu $v1, 1
    ; jump to loc_28 if a&(1<<i) == 0 and increment rt:
    beqz $a1, loc_28
    addiu $a2, $v0, 1
    ; if BEQZ was not triggered, store the updated rt in $v0:
    move $v0, $a2
loc_28:
    ; if i != 32, jump to loc_14 and prepare the next shifted value:
    bne $v1, $a3, loc_14
    sllv $a1, $t0, $v1
    ; return
    jr $ra
    or $at, $zero           ; branch delay slot, NOP
```
 
<hr>
 
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.28.6 Conclusion</b></h1>
 
<p>
Just like the <code style="color:chartreuse;">&lt;&lt;</code> and <code style="color:chartreuse;">&gt;&gt;</code> operations in C/C++, the shift instructions in x86 are <code style="color:chartreuse;">SHR</code>/<code style="color:chartreuse;">SHL</code> (for unsigned values) and <code style="color:chartreuse;">SAR</code>/<code style="color:chartreuse;">SHL</code> (for signed values).
</p>
<p>
The shift instructions in ARM are <code style="color:chartreuse;">LSR</code>/<code style="color:chartreuse;">LSL</code> (for unsigned values) and <code style="color:chartreuse;">ASR</code>/<code style="color:chartreuse;">LSL</code> (for signed values).
</p>
<p>
It is also possible to add a shift suffix to some instructions (called "data processing instructions").
</p>
 
<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>Checking a specific bit (known at compile time)</b></h2>
 
<p>
Test if bit <code style="color:chartreuse;">0b1000000</code> (0x40) is present in a register value:
</p>
 
<p><b style="color:cornflowerblue;">Listing 1.303: C/C++</b></p>
 
```c
if (input & 0x40) ...
```
 
<p><b style="color:cornflowerblue;">Listing 1.304: x86</b></p>
 
```nasm
TEST REG, 40h
JNZ is_set
; bit is not set
```
 
<p><b style="color:cornflowerblue;">Listing 1.305: x86</b></p>
 
```nasm
TEST REG, 40h
JZ is_cleared
; bit is set
```
 
<p><b style="color:cornflowerblue;">Listing 1.306: ARM (ARM mode)</b></p>
 
```nasm
TST REG, #0x40
BNE is_set
; bit is not set
```
 
<p>
Sometimes, <code style="color:chartreuse;">AND</code> is used instead of <code style="color:chartreuse;">TEST</code>, but the flags that get set are the same.
</p>
 
<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>Checking a specific bit (determined at runtime)</b></h2>
 
<p>
This is usually done via this C/C++ code snippet (shift the value n bits to the right, then mask the lowest bit):
</p>
 
<p><b style="color:cornflowerblue;">Listing 1.307: C/C++</b></p>
 
```c
if ((value >> n) & 1) ...
```
 
<p>
This is typically implemented in x86 code as:
</p>
 
<p><b style="color:cornflowerblue;">Listing 1.308: x86</b></p>
 
```nasm
; REG = input_value
; CL = n
SHR REG, CL
AND REG, 1
```
 
<p>
Or (shift 1 bit n times to the left, isolate that bit in the input value and test if it is non-zero):
</p>
 
<p><b style="color:cornflowerblue;">Listing 1.309: C/C++</b></p>
 
```c
if (value & (1 << n)) ...
```
 
<p>
This is typically implemented in x86 code as:
</p>
 
<p><b style="color:cornflowerblue;">Listing 1.310: x86</b></p>
 
```nasm
; CL = n
MOV REG, 1
SHL REG, CL
AND input_value, REG
```
 
<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>Setting a specific bit (known at compile time)</b></h2>
 
<p><b style="color:cornflowerblue;">Listing 1.311: C/C++</b></p>
 
```c
value = value | 0x40;
```
 
<p><b style="color:cornflowerblue;">Listing 1.312: x86</b></p>
 
```nasm
OR REG, 40h
```
 
<p><b style="color:cornflowerblue;">Listing 1.313: ARM (ARM mode) and ARM64</b></p>
 
```nasm
ORR R0, R0, #0x40
```
 
<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>Setting a specific bit (determined at runtime)</b></h2>
 
<p><b style="color:cornflowerblue;">Listing 1.314: C/C++</b></p>
 
```c
value = value | (1 << n);
```
 
<p>
This is typically implemented in x86 code as:
</p>
 
<p><b style="color:cornflowerblue;">Listing 1.315: x86</b></p>
 
```nasm
; CL = n
MOV REG, 1
SHL REG, CL
OR input_value, REG
```
 
<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>Clearing a specific bit (known at compile time)</b></h2>
 
<p>
Simply apply an <code style="color:chartreuse;">AND</code> operation with the inverted value:
</p>
 
<p><b style="color:cornflowerblue;">Listing 1.316: C/C++</b></p>
 
```c
value = value & (~0x40);
```
 
<p><b style="color:cornflowerblue;">Listing 1.317: x86</b></p>
 
```nasm
AND REG, 0FFFFFFBFh
```
 
<p><b style="color:cornflowerblue;">Listing 1.318: x64</b></p>
 
```nasm
AND REG, 0FFFFFFFFFFFFFFBFh
```
 
<p>
This effectively causes all bits to be set except one.
</p>
<p>
ARM in ARM mode has the <code style="color:chartreuse;">BIC</code> instruction, which works like the <code style="color:chartreuse;">NOT + AND</code> instruction pair:
</p>
 
<p><b style="color:cornflowerblue;">Listing 1.319: ARM (ARM mode)</b></p>
 
```nasm
BIC R0, R0, #0x40
```
 
<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>Clearing a specific bit (determined at runtime)</b></h2>
 
<p><b style="color:cornflowerblue;">Listing 1.320: C/C++</b></p>
 
```c
value = value & (~(1 << n));
```
 
<p><b style="color:cornflowerblue;">Listing 1.321: x86</b></p>
 
```nasm
; CL = n
MOV REG, 1
SHL REG, CL
NOT REG
AND input_value, REG
```
 


</div>