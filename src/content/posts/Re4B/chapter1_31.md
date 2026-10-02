---
title: "CH1.32 Unions"
published: 2026-10-02
description: "C unions in practice — PRNG float generation and machine epsilon calculation across x86, ARM, ARM64, and MIPS"
author: "0xV3n0m"
category: "Re4B"
tags: ["Reverse Engineering", "Books", "Assembly"]
image: "/assets/img/reversee28.png"
draft: false
lang: "eng"

# Series configuration
type: "course"
series: "re4b"
seriesOrder: 41
seriesTitle: "Reverse Engineering for Beginners"
seriesDescription: "A beginner-friendly book covering x86/x64 reverse engineering through real compiler output and code patterns."
seriesImage: "/assets/img/RE4B.png"
---
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<div style="line-height:1.9; font-size:21px; direction:ltr;">
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.32 Unions</b></h1>
<hr>

<p>
A union in C/C++ is a data type that allows you to store different types in <b style="color:cornflowerblue;">the same memory location</b>. This means all members of the union share the same space. The difference between a union and a struct is that in a struct each member has its own dedicated location, but in a union all members start at the same address.
</p>

<hr>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.32.1 Pseudo-random number generator example</b></h1>

<img src="/assets/img/prng_example.png" alt="PRNG example" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<hr>

<p>
The author begins by explaining that if we need random <code style="color:chartreuse;">float</code> numbers between 0 and 1, the simplest approach is to use a PRNG (Pseudorandom Number Generator) such as the Mersenne Twister. It generates random unsigned 32-bit values (in other words, 32 random bits). We can then convert that value to a <code style="color:chartreuse;">float</code> and divide by <code style="color:chartreuse;">RAND_MAX</code> (which is <code style="color:chartreuse;">0xFFFFFFFF</code> in our case) to get a value in the range 0 to 1.
</p>
<p>
However, as we know, division is slow. And we also want to minimize the number of FPU operations. Can we eliminate the division?
</p>
<p>
Let's remember that a floating-point number consists of: a sign bit, significand bits, and exponent bits. We only need to store random bits in all the significand bits to get a random <code style="color:chartreuse;">float</code>.
</p>
<p>
The exponent cannot be zero (the number becomes denormalized in that case), so we store <code style="color:chartreuse;">0b01111111</code> in the exponent — meaning exponent = 1. Then we fill the significand with random bits, set the sign bit to 0 (positive number) and voilà. The generated numbers will be between 1 and 2, so we also need to subtract 1.
</p>
<p>
In my example I use a very simple linear congruential random number generator that produces 32-bit numbers. The PRNG is seeded with the current time as a UNIX timestamp.
</p>
<p>
Here we represent the <code style="color:chartreuse;">float</code> type as a union — a C/C++ construct that lets us interpret a piece of memory as different types. In our case, we can declare a union variable and then access it either as a <code style="color:chartreuse;">float</code> or as a <code style="color:chartreuse;">uint32_t</code>.
</p>

```c
#include <stdio.h>
#include <stdint.h>
#include <time.h>

// True PRNG definitions, data and functions:
// Constants from Numerical Recipes
const uint32_t RNG_a = 1664525;
const uint32_t RNG_c = 1013904223;
uint32_t RNG_state; // global state variable

void my_srand(uint32_t i)
{
    RNG_state = i; // seed the generator
}

uint32_t my_rand()
{
    RNG_state = RNG_state * RNG_a + RNG_c; // advance state
    return RNG_state;
}

// Floating-point PRNG definitions and functions:
union uint32_t_float
{
    uint32_t i; // access the bits as an integer
    float f;    // access the same bits as a float
};

float float_rand()
{
    union uint32_t_float tmp;
    // mask off the exponent and sign, then OR in exponent = 1 (0x3F800000)
    // this gives a float in [1.0, 2.0)
    tmp.i = my_rand() & 0x007fffff | 0x3F800000;
    return tmp.f - 1; // shift range to [0.0, 1.0)
}

// Test
int main()
{
    my_srand(time(NULL)); // seed the PRNG with current time
    for (int i = 0; i < 100; i++)
        printf("%f\n", float_rand());
    return 0;
}
```

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">x86</h2>

<p>
<b>Listing 1.359: Optimizing MSVC 2010</b>
</p>

```nasm
$SG4238 DB '%f', 0aH, 00H
__real@3ff0000000000000 DQ 03ff0000000000000r   ; constant 1.0 in double format

tv130 = -4
_tmp$ = -4

?float_rand@@YAMXZ PROC
    push    ecx
    call    ?my_rand@@YAIXZ             ; call my_rand() — result in EAX
    ; EAX = random value
    and     eax, 8388607                ; EAX &= 0x007FFFFF — clear exponent and sign bits
    or      eax, 1065353216             ; EAX |= 0x3F800000 — set exponent to 1 (IEEE 754)
    ; EAX = random_value & 0x007FFFFF | 0x3F800000 — a float in [1.0, 2.0)
    mov     DWORD PTR _tmp$[esp+4], eax ; store manipulated bits on local stack
    fld     DWORD PTR _tmp$[esp+4]      ; load those bits as IEEE 754 float into ST0
    fsub    QWORD PTR __real@3ff0000000000000 ; ST0 -= 1.0 — shift to [0.0, 1.0)
    ; the following FST/FLD pair is redundant — compiler didn't optimize it out:
    fstp    DWORD PTR tv130[esp+4]      ; spill ST0 to stack (unnecessary)
    fld     DWORD PTR tv130[esp+4]      ; reload from stack (unnecessary)
    pop     ecx
    ret     0
?float_rand@@YAMXZ ENDP

_main PROC
    push    esi
    xor     eax, eax
    call    _time                       ; get current UNIX timestamp
    push    eax
    call    ?my_srand@@YAXI@Z           ; seed the PRNG
    add     esp, 4
    mov     esi, 100                    ; loop counter = 100
$LL3@main:
    call    ?float_rand@@YAMXZ          ; get random float in [0.0, 1.0)
    sub     esp, 8
    fstp    QWORD PTR [esp]             ; convert ST0 from float to double for printf
    push    OFFSET $SG4238              ; "%f\n"
    call    _printf
    add     esp, 12
    dec     esi
    jne     SHORT $LL3@main             ; loop 100 times
    xor     eax, eax
    pop     esi
    ret     0
_main ENDP
```

<p>
The function names here look strange because this example was compiled as C++ — that is called <b style="color:cornflowerblue;">name mangling</b> in C++, which we will talk about later. If compiled in MSVC 2012 it would use SIMD instructions for the FPU instead.
</p>

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM (ARM mode)</h2>

<p>
<b>Listing 1.360: Optimizing GCC 4.6.3 (IDA)</b>
</p>

```nasm
float_rand
    STMFD   SP!, {R3,LR}
    BL      my_rand                 ; call my_rand() — result in R0
    ; R0 = random value
    FLDS    S0, =1.0                ; S0 = 1.0 (constant loaded into FPU)
    BIC     R3, R0, #0xFF000000     ; clear top byte (first step of clearing exponent+sign)
    BIC     R3, R3, #0x800000       ; clear bit 23 (second step — clears sign of significand)
    ORR     R3, R3, #0x3F800000     ; set exponent to 1 — gives float in [1.0, 2.0)
    ; R3 = random_value & 0x007FFFFF | 0x3F800000
    FMSR    S15, R3                 ; copy R3 bits into FPU register S15 (bitwise copy, no conversion)
    FSUBS   S0, S15, S0             ; S0 = S15 - 1.0 — shift to [0.0, 1.0)
    LDMFD   SP!, {R3,PC}            ; return

flt_5C DCFS 1.0                     ; constant 1.0 stored in literal pool

main
    STMFD   SP!, {R4,LR}
    MOV     R0, #0
    BL      time                    ; get UNIX timestamp
    BL      my_srand                ; seed the PRNG
    MOV     R4, #0x64               ; R4 = 100 (loop counter)
loc_78:
    BL      float_rand              ; get random float — result in S0
    LDR     R0, =aF                 ; "%f"
    FCVTDS  D7, S0                  ; convert float S0 to double D7 (printf needs double)
    FMRRD   R2, R3, D7              ; copy D7 bits into R2/R3 pair for printf
    BL      printf
    SUBS    R4, R4, #1              ; R4--
    BNE     loc_78                  ; loop until R4 == 0
    MOV     R0, R4                  ; return 0
    LDMFD   SP!, {R4,PC}
aF  DCB "%f",0xA,0
```

<p>
Let's also dump with <code style="color:chartreuse;">objdump</code> and we will notice that FPU instructions have different names than in IDA. It seems the IDA developers and the binutils developers used different reference manuals. It is probably good to know both naming conventions.
</p>
<p>
<b>Listing 1.361: Optimizing GCC 4.6.3 (objdump)</b>
</p>

```nasm
00000038 <float_rand>:
38: e92d4008    push {r3, lr}
3c: ebfffffe    bl 10 <my_rand>
40: ed9f0a05    vldr s0, [pc, #20]      ; load 1.0 from literal pool
44: e3c034ff    bic r3, r0, #-16777216  ; r3 = r0 & ~0xFF000000
48: e3c33502    bic r3, r3, #8388608    ; r3 &= ~0x800000
4c: e38335fe    orr r3, r3, #1065353216 ; r3 |= 0x3F800000
50: ee073a90    vmov s15, r3            ; bitwise copy from GPR to FPU
54: ee370ac0    vsub.f32 s0, s15, s0    ; s0 = s15 - 1.0
58: e8bd8008    pop {r3, pc}
5c: 3f800000    svccc 0x00800000        ; this is actually the 1.0 constant in the literal pool

00000000 <main>:
 0: e92d4010    push {r4, lr}
 4: e3a00000    mov r0, #0
 8: ebfffffe    bl 0 <time>
 c: ebfffffe    bl 0 <my_srand>
10: e3a04064    mov r4, #100
14: ebfffffe    bl 38 <float_rand>
18: e59f0018    ldr r0, [pc, #24]       ; "%f"
1c: eeb77ac0    vcvt.f64.f32 d7, s0     ; float → double
20: ec532b17    vmov r2, r3, d7         ; copy to R2/R3 for printf
24: ebfffffe    bl 0 <printf>
28: e2544001    subs r4, r4, #1
2c: 1afffff8    bne 14 <float_rand call>
30: e1a00004    mov r0, r4
34: e8bd8010    pop {r4, pc}
```

<p>
The instructions at address <code style="color:chartreuse;">0x5c</code> in <code style="color:chartreuse;">float_rand()</code> and at address <code style="color:chartreuse;">0x38</code> in <code style="color:chartreuse;">main()</code> are (near-)random-looking noise — they are the raw bytes of the floating-point constant <code style="color:chartreuse;">1.0</code> stored in the literal pool, not executable instructions.
</p>

<hr>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.32.2 Calculating machine epsilon</b></h1>
<img src="/assets/img/machineepsilon.png" alt="Calculating machine epsilon" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<p>
Machine epsilon is the smallest value that the FPU can work with. The more bits allocated to the significand, the smaller the machine epsilon. It is <code style="color:chartreuse;">2^-23 ≈ 1.19e-07</code> for <code style="color:chartreuse;">float</code> and <code style="color:chartreuse;">2^-52 ≈ 2.22e-16</code> for <code style="color:chartreuse;">double</code>.
</p>
<p>
Interestingly, it is very easy to calculate machine epsilon:
</p>

```c
#include <stdio.h>
#include <stdint.h>

union uint_float
{
    uint32_t i; // access the IEEE 754 bits as an integer
    float f;    // access the same bits as a float
};

float calculate_machine_epsilon(float start)
{
    union uint_float v;
    v.f = start;    // store the input float
    v.i++;          // increment the raw integer representation by 1 (adds 1 ULP)
    return v.f - start; // the difference is exactly one unit in the last place (epsilon)
}

void main()
{
    printf("%g\n", calculate_machine_epsilon(1.0));
}
```

<p>
What we do here is treat the significand (fraction) of an IEEE 754 number as an integer and add 1 to it. The resulting floating-point number equals <code style="color:chartreuse;">starting_value + machine_epsilon</code>, so we subtract the starting value (using floating-point arithmetic) to measure what difference one bit of single-precision represents. The union serves here as a way to access an IEEE 754 number as a plain integer. Adding 1 to it actually adds 1 to the significand part of the number, though of course overflow can happen, which would add 1 to the exponent part as well.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">x86</h2>

<p>
<b>Listing 1.362: Optimizing MSVC 2010</b>
</p>

```nasm
tv130  = 8
_v$    = 8
_start$ = 8

_calculate_machine_epsilon PROC
    fld     DWORD PTR _start$[esp-4]    ; load the input float into ST0
    ; the following FST is redundant — stores input to same location v$ overlaps start$:
    fst     DWORD PTR _v$[esp-4]        ; spill ST0 to v (unnecessary — same slot as input)
    inc     DWORD PTR _v$[esp-4]        ; v.i++ — increment raw integer representation
    fsubr   DWORD PTR _v$[esp-4]        ; ST0 = v.f - ST0 = (start + epsilon) - start
    ; the following FSTP/FLD pair is also redundant:
    fstp    DWORD PTR tv130[esp-4]      ; spill result to stack (unnecessary)
    fld     DWORD PTR tv130[esp-4]      ; reload result (unnecessary)
    ret     0
_calculate_machine_epsilon ENDP
```

<p>
The second <code style="color:chartreuse;">FST</code> instruction is redundant: there is no need to store the input value in the same place (the compiler decided to allocate the variable <code style="color:chartreuse;">v</code> at the same point on the local stack as the input argument). Then it gets incremented with <code style="color:chartreuse;">INC</code> as a plain integer. Then it gets loaded into the FPU as a 32-bit IEEE 754 number. <code style="color:chartreuse;">FSUBR</code> does the remaining work and the result ends up in <code style="color:chartreuse;">ST0</code>. The final <code style="color:chartreuse;">FSTP/FLD</code> pair is also redundant, but the compiler did not optimize it out.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM64</h2>

<p>
Let's extend our example to 64-bit:
</p>

```c
#include <stdio.h>
#include <stdint.h>

typedef union
{
    uint64_t i; // 64-bit integer view of the bits
    double d;   // double-precision float view of the same bits
} uint_double;

double calculate_machine_epsilon(double start)
{
    uint_double v;
    v.d = start;    // store the input double
    v.i++;          // increment raw 64-bit integer by 1 (adds 1 ULP)
    return v.d - start; // difference = machine epsilon for double
}

void main()
{
    printf("%g\n", calculate_machine_epsilon(1.0));
}
```

<p>
ARM64 has no instruction that can add a number directly to a D-register (FPU). So the input value (which arrived in D0) is first copied to a GPR, incremented there, copied to an FPU register D1, and then the subtraction happens.
</p>
<p>
<b>Listing 1.363: Optimizing GCC 4.9 ARM64</b>
</p>

```nasm
calculate_machine_epsilon:
    fmov    x0, d0      ; copy input double bits from FPU register D0 into integer register X0
    add     x0, x0, 1   ; X0++ (increment raw 64-bit representation — adds 1 ULP)
    fmov    d1, x0      ; copy incremented bits back to FPU register D1
    fsub    d0, d1, d0  ; D0 = D1 - D0 = (start + epsilon) - start
    ret
```

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">MIPS</h2>

<p>
The new instruction here is <code style="color:chartreuse;">MTC1</code> ("Move To Coprocessor 1"), which moves data from a GPR to FPU registers.
</p>
<p>
<b>Listing 1.364: Optimizing GCC 4.4.5 (IDA)</b>
</p>

```nasm
calculate_machine_epsilon:
    mfc1    $v0, $f12       ; Move From Coprocessor 1: copy input float bits from $f12 to $v0 (GPR)
    or      $at, $zero      ; NOP (load delay slot)
    addiu   $v1, $v0, 1     ; $v1 = $v0 + 1 (increment raw integer representation — adds 1 ULP)
    mtc1    $v1, $f2        ; Move To Coprocessor 1: copy incremented bits into FPU register $f2
    jr      $ra             ; return
    sub.s   $f0, $f2, $f12  ; branch delay slot: $f0 = $f2 - $f12 = (start+eps) - start
```

</div>