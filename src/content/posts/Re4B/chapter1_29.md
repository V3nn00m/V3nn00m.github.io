---
title: "CH1.29 Linear congruential generator as pseudorandom number generator"
published: 2026-06-11
description: "Implementing and reverse engineering a simple linear congruential PRNG across x86, x64, ARM, and MIPS compilers"
author: "0xV3n0m"
category: "Re4B"
tags: ["Reverse Engineering", "Books", "Assembly"]
image: "/assets/img/reversee32.jpg"
draft: false
lang: "eng"

# Series configuration
type: "course"
series: "re4b"
seriesOrder: 32
seriesTitle: "Reverse Engineering for Beginners"
seriesDescription: "A beginner-friendly book covering x86/x64 reverse engineering through real compiler output and code patterns."
seriesImage: "/assets/img/RE4B.png"
---
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<div style="line-height:1.9; font-size:21px; direction:ltr;">
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.29 Linear congruential generator as pseudorandom number generator</b></h1>
<hr>

<p>
The author began by saying that the linear congruential generator is perhaps the simplest possible way to generate random numbers  it is not a great choice nowadays (not widely used anymore), but it is extremely simple (just one multiplication, one addition, and one AND operation), which makes it useful as an example.
</p>

```c
#include <stdint.h>

// Constants from Numerical Recipes book
#define RNG_a 1664525
#define RNG_c 1013904223

static uint32_t rand_state; // internal state — persists between calls

void my_srand (uint32_t init)
{
    rand_state = init; // seed the generator with an initial value
}

int my_rand ()
{
    rand_state = rand_state * RNG_a;  // multiply state by constant a
    rand_state = rand_state + RNG_c;  // add constant c
    return rand_state & 0x7fff;       // return lower 15 bits (range 0..32767)
}
```

<p>
There are two functions in this code: the first one initializes the internal state, and the second one is called to generate pseudorandom numbers.
</p>
<p>
We can see two constants used in the algorithm, taken from [William H. Press and Saul A. Teukolsky and William T. Vetterling and Brian P. Flannery, Numerical Recipes, (2007)].
</p>
<p>
We define them using C/C++ <code style="color:chartreuse;">#define</code>  this is a macro. The difference between a macro in C/C++ and a constant is that all macros are replaced by their values by the C/C++ preprocessor, and they do not take up any memory space, unlike variables. In contrast, a constant is a read-only variable. It is possible to take a pointer (or address) of a constant variable, but it is impossible to do that with a macro.
</p>
<p>
The final AND operation is needed because according to the C standard, <code style="color:chartreuse;">my_rand()</code> must return a value in the range 0 to 32767. If you want 32-bit pseudorandom values, simply remove the final AND operation.
</p>

<hr>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.29.1 x86</b></h1>
<hr>

<p>
<b>Listing 1.322: Optimizing MSVC 2013</b>
</p>


```nasm
_BSS SEGMENT
_rand_state DD 01H DUP (?)   ; uninitialized data segment — rand_state lives here
_BSS ENDS

_init$ = 8
_srand PROC
    mov eax, DWORD PTR _init$[esp-4]    ; load input value from stack
    mov DWORD PTR _rand_state, eax      ; store it in rand_state
    ret 0
_srand ENDP

_TEXT SEGMENT
_rand PROC
    imul eax, DWORD PTR _rand_state, 1664525   ; EAX = rand_state * RNG_a (constant embedded directly)
    add  eax, 1013904223                        ; EAX += RNG_c  (3c6ef35fH)
    mov  DWORD PTR _rand_state, eax             ; store new rand_state
    and  eax, 32767                             ; EAX &= 0x7FFF — keep only lower 15 bits
    ret  0
_rand ENDP
_TEXT ENDS
```


<p>
Here we can see it: both constants are embedded directly in the code (they appear as immediate values). No memory is allocated for them.
</p>
<p>
<code style="color:chartreuse;">my_srand()</code> simply copies the input value into the internal variable <code style="color:chartreuse;">rand_state</code>. <code style="color:chartreuse;">my_rand()</code> takes it, computes the new <code style="color:chartreuse;">rand_state</code>, truncates it (AND), and leaves it in EAX (the return register).
</p>
<p>
The non-optimizing version is longer:
</p>
<p>
<b>Listing 1.323: Non-optimizing MSVC 2013</b>
</p>



```nasm
_BSS SEGMENT
_rand_state DD 01H DUP (?)   ; uninitialized global rand_state
_BSS ENDS

_init$ = 8
_srand PROC
    push    ebp
    mov     ebp, esp
    mov     eax, DWORD PTR _init$[ebp]      ; load seed from stack
    mov     DWORD PTR _rand_state, eax      ; rand_state = seed
    pop     ebp
    ret     0
_srand ENDP

_TEXT SEGMENT
_rand PROC
    push    ebp
    mov     ebp, esp
    imul    eax, DWORD PTR _rand_state, 1664525  ; rand_state * RNG_a
    mov     DWORD PTR _rand_state, eax            ; store intermediate result
    mov     ecx, DWORD PTR _rand_state            ; reload (redundant without optimization)
    add     ecx, 1013904223                       ; ECX += RNG_c  (3c6ef35fH)
    mov     DWORD PTR _rand_state, ecx            ; store final rand_state
    mov     eax, DWORD PTR _rand_state            ; reload to EAX for masking
    and     eax, 32767                            ; EAX &= 0x7FFF
    pop     ebp
    ret     0
_rand ENDP
_TEXT ENDS
```



<hr>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.29.2 x64</b></h1>
<hr>

<p>
The x64 version is mostly the same, using 32-bit registers instead of 64-bit (since we are working with <code style="color:chartreuse;">int</code> values here). But <code style="color:chartreuse;">my_srand()</code> receives its input from register ECX instead of from the stack:
</p>
<p>
<b>Listing 1.324: Optimizing MSVC 2013 x64</b>
</p>



```nasm
_BSS SEGMENT
rand_state DD 01H DUP (?)   ; uninitialized global rand_state
_BSS ENDS

init$ = 8
my_srand PROC
    ; ECX = input (seed value passed in register, x64 calling convention)
    mov DWORD PTR rand_state, ecx   ; rand_state = seed
    ret 0
my_srand ENDP

_TEXT SEGMENT
my_rand PROC
    imul eax, DWORD PTR rand_state, 1664525   ; EAX = rand_state * RNG_a  (0019660dH)
    add  eax, 1013904223                      ; EAX += RNG_c  (3c6ef35fH)
    mov  DWORD PTR rand_state, eax            ; store new rand_state
    and  eax, 32767                           ; EAX &= 0x7FFF — return lower 15 bits
    ret  0
my_rand ENDP
_TEXT ENDS
```



<p>
GCC generates nearly identical code.
</p>

<hr>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.29.3 32-bit ARM</b></h1>
<hr>

<p>
<b>Listing 1.325: Optimizing Keil 6/2013 (ARM mode)</b>
</p>



```nasm
my_srand PROC
    LDR r1,|L0.52|          ; load pointer (address) of rand_state into R1
    STR r0,[r1,#0]          ; store seed (R0) into rand_state
    BX  lr                  ; return
    ENDP

my_rand PROC
    LDR r0,|L0.52|          ; load pointer of rand_state into R0
    LDR r2,|L0.56|          ; load RNG_a constant (1664525) into R2
    LDR r1,[r0,#0]          ; load current rand_state value into R1
    MUL r1,r2,r1            ; R1 = rand_state * RNG_a
    LDR r2,|L0.60|          ; load RNG_c constant (1013904223) into R2
    ADD r1,r1,r2            ; R1 = R1 + RNG_c
    STR r1,[r0,#0]          ; store new rand_state
    ; AND with 0x7FFF using shift pair:
    LSL r0,r1,#17           ; R0 = rand_state << 17  (shift out upper 17 bits)
    LSR r0,r0,#17           ; R0 = R0 >> 17 (logical)  (shift back — upper 17 bits are now 0)
    BX  lr                  ; return (R0 holds lower 15 bits = result)
    ENDP

|L0.52|
    DCD ||.data||           ; address of rand_state variable
|L0.56|
    DCD 0x0019660d          ; RNG_a = 1664525
|L0.60|
    DCD 0x3c6ef35f          ; RNG_c = 1013904223

AREA ||.data||, DATA, ALIGN=2
rand_state
    DCD 0x00000000          ; rand_state initialized to 0
```



<p>
32-bit constants cannot be embedded directly in ARM instructions, which is why Keil had to place them externally and load them additionally. An interesting thing: the constant <code style="color:chartreuse;">0x7FFF</code> cannot be embedded either. So Keil does this: shift <code style="color:chartreuse;">rand_state</code> left by 17 bits and then shift right by 17 bits. This is equivalent to the C/C++ expression <code style="color:chartreuse;">(rand_state << 17) >> 17</code>. It looks like a useless operation, but what it actually does is clear the upper 17 bits while leaving the lower 15 bits intact  which is exactly our goal.
</p>
<p>
The Thumb-optimizing version of Keil generates nearly identical code.
</p>

<hr>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.29.4 MIPS</b></h1>
<hr>

<p>
<b>Listing 1.326: Optimizing GCC 4.4.5 (IDA)</b>
</p>



```nasm
my_srand:
    ; store $a0 in rand_state:
    lui $v0, (rand_state >> 16)         ; load upper 16 bits of rand_state address into $v0
    jr  $ra                             ; return (jump fires after the delay slot)
    sw  $a0, rand_state                 ; store seed in rand_state (branch delay slot)

my_rand:
    ; load rand_state into $v0:
    lui $v1, (rand_state >> 16)         ; upper 16 bits of rand_state address in $v1
    lw  $v0, rand_state                 ; load rand_state value from memory
    or  $at, $zero                      ; dummy NOP for load delay slot
    ; multiply rand_state * 1664525 (RNG_a) using shifts and additions only:
    sll $a1, $v0, 2                     ; $a1 = rand_state * 4
    sll $a0, $v0, 4                     ; $a0 = rand_state * 16
    addu $a0, $a1, $a0                  ; $a0 = rand_state * 20
    sll $a1, $a0, 6                     ; $a1 = rand_state * 1280
    subu $a0, $a1, $a0                  ; $a0 = rand_state * 1260
    addu $a0, $v0                       ; $a0 = rand_state * 1261
    sll $a1, $a0, 5                     ; $a1 = rand_state * 40352
    addu $a0, $a1                       ; $a0 = rand_state * 41613
    sll $a0, 3                          ; $a0 = rand_state * 332904
    addu $v0, $a0, $v0                  ; $v0 = rand_state * 332905
    sll $a0, $v0, 2                     ; $a0 = rand_state * 1331620
    addu $v0, $a0                       ; $v0 = rand_state * 1664525  (RNG_a done!)
    ; add 1013904223 (RNG_c):
    ; LI assembled by IDA from LUI + ORI pair:
    li  $a0, 0x3C6EF35F                 ; load RNG_c constant
    addu $v0, $a0                       ; $v0 = $v0 + RNG_c
    ; store in rand_state:
    sw  $v0, (rand_state & 0xFFFF)($v1) ; store new rand_state using prepared address
    jr  $ra                             ; return
    andi $v0, 0x7FFF                    ; branch delay slot: mask lower 15 bits (return value)
```



<p>
Something strange here we only see one constant (<code style="color:chartreuse;">0x3C6EF35F</code> or 1013904223). Where is the other constant (1664525)?
</p>
<p>
The multiplication by 1664525 was apparently done using only shifts and additions. Let's verify that assumption:
</p>

```c
#define RNG_a 1664525
int f (int a)
{
    return a * RNG_a; // compiler will replace this with shifts and additions
}
```

<p>
<b>Listing 1.327: Optimizing GCC 4.4.5 (IDA)</b>
</p>



```nasm
f:
    sll  $v1, $a0, 2        ; $v1 = a * 4
    sll  $v0, $a0, 4        ; $v0 = a * 16
    addu $v0, $v1, $v0      ; $v0 = a * 20
    sll  $v1, $v0, 6        ; $v1 = a * 1280
    subu $v0, $v1, $v0      ; $v0 = a * 1260
    addu $v0, $a0           ; $v0 = a * 1261
    sll  $v1, $v0, 5        ; $v1 = a * 40352
    addu $v0, $v1           ; $v0 = a * 41613
    sll  $v0, 3             ; $v0 = a * 332904
    addu $a0, $v0, $a0      ; $a0 = a * 332905
    sll  $v0, $a0, 2        ; $v0 = a * 1331620
    jr   $ra
    addu $v0, $a0, $v0      ; branch delay slot: $v0 = a * 1664525  (final result)
```



<p>
Indeed  this code achieves the multiplication using only shifts and additions.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">MIPS relocations</h2>

<p>
Let's also focus on how operations like loading from memory and storing to memory actually work.
</p>
<p>
The listings here were produced by IDA, which hides some details. We will run <code style="color:chartreuse;">objdump</code> twice: to get a disassembly listing and also a relocation listing:
</p>
<p>
<b>Listing 1.328: Optimizing GCC 4.4.5 (objdump)</b>
</p>



```nasm
# objdump -D rand_O3.o
...
00000000 <my_srand>:
   0: 3c020000    lui  v0,0x0          ; upper 16 bits of rand_state address (to be filled by linker)
   4: 03e00008    jr   ra
   8: ac440000    sw   a0,0(v0)        ; store seed at rand_state address (lower 16 bits = 0 for now)

0000000c <my_rand>:
   c: 3c030000    lui  v1,0x0          ; upper 16 bits of rand_state address (to be filled by linker)
  10: 8c620000    lw   v0,0(v1)        ; load rand_state value
  14: 00200825    move at,at           ; NOP (load delay slot)
  18: 00022880    sll  a1,v0,0x2       ; multiply stage: * 4
  1c: 00022100    sll  a0,v0,0x4       ; multiply stage: * 16
  20: 00a42021    addu a0,a1,a0        ; * 20
  24: 00042980    sll  a1,a0,0x6       ; * 1280
  28: 00a42023    subu a0,a1,a0        ; * 1260
  2c: 00822021    addu a0,a0,v0        ; * 1261
  30: 00042940    sll  a1,a0,0x5       ; * 40352
  34: 00852021    addu a0,a0,a1        ; * 41613
  38: 000420c0    sll  a0,a0,0x3       ; * 332904
  3c: 00821021    addu v0,a0,v0        ; * 332905
  40: 00022080    sll  a0,v0,0x2       ; * 1331620
  44: 00441021    addu v0,v0,a0        ; * 1664525 — multiplication complete
  48: 3c043c6e    lui  a0,0x3c6e       ; upper 16 bits of RNG_c
  4c: 3484f35f    ori  a0,a0,0xf35f    ; lower 16 bits of RNG_c → a0 = 0x3C6EF35F
  50: 00441021    addu v0,v0,a0        ; v0 = result + RNG_c
  54: ac620000    sw   v0,0(v1)        ; store new rand_state (lower 16 bits of address filled by linker)
  58: 03e00008    jr   ra
  5c: 30427fff    andi v0,v0,0x7fff    ; branch delay slot: mask lower 15 bits

# objdump -r rand_O3.o
...
RELOCATION RECORDS FOR [.text]:
OFFSET   TYPE              VALUE
00000000 R_MIPS_HI16       .bss      ; linker fills upper 16 bits of rand_state address here
00000008 R_MIPS_LO16       .bss      ; linker fills lower 16 bits of rand_state address here
0000000c R_MIPS_HI16       .bss      ; same for my_rand
00000010 R_MIPS_LO16       .bss
00000054 R_MIPS_LO16       .bss
...
```



<p>
Let's look at the two relocations for the function <code style="color:chartreuse;">my_srand()</code>. The first, at address 0, is of type <code style="color:chartreuse;">R_MIPS_HI16</code>, and the second at address 8 is of type <code style="color:chartreuse;">R_MIPS_LO16</code>. This means the start address of the <code style="color:chartreuse;">.bss</code> section will be written into the instruction at address 0 (the high part of the address) and into the instruction at address 8 (the low part of the address). The variable <code style="color:chartreuse;">rand_state</code> lives at the beginning of the <code style="color:chartreuse;">.bss</code> section.
</p>
<p>
That is why we see zeros in the operands of the <code style="color:chartreuse;">LUI</code> and <code style="color:chartreuse;">SW</code> instructions  there is nothing the compiler can write there yet. The linker will fix this: the high part of the address will be written into the <code style="color:chartreuse;">LUI</code> operand, and the low part into the <code style="color:chartreuse;">SW</code> operand. <code style="color:chartreuse;">SW</code> will then add the low part of the address to whatever is in register <code style="color:chartreuse;">$V0</code> (which holds the high part).
</p>
<p>
The same story applies to <code style="color:chartreuse;">my_rand()</code>: the <code style="color:chartreuse;">R_MIPS_HI16</code> relocation asks the linker to write the high part of the <code style="color:chartreuse;">.bss</code> section address into the <code style="color:chartreuse;">LUI</code> instruction. So the high part of the <code style="color:chartreuse;">rand_state</code> address ends up in register <code style="color:chartreuse;">$V1</code>. The <code style="color:chartreuse;">LW</code> instruction at address <code style="color:chartreuse;">0x10</code> combines both parts and loads the value of <code style="color:chartreuse;">rand_state</code> into <code style="color:chartreuse;">$V0</code>. The <code style="color:chartreuse;">SW</code> instruction at address <code style="color:chartreuse;">0x54</code> does the combining again and then stores the new value into the global variable <code style="color:chartreuse;">rand_state</code>.
</p>
<p>
IDA processes relocations at load time and therefore hides these details, but we must be aware of them.
</p>

<hr>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.29.5 Thread-safe version of the example</b></h1>
<hr>

<p>
The thread-safe version of the example will be discussed later. But here is a quick overview to connect the ideas together.
</p>
<p>
If a program runs with a single thread, instructions execute one after another in order. But if it runs with multiple threads, more than one thread tries to work at the same time.
</p>
<p>
<b style="color:cornflowerblue;">The problem</b>  if two threads call <code style="color:chartreuse;">my_rand()</code> at exactly the same moment, both will read the same value of <code style="color:chartreuse;">rand_state</code> before either one has modified it. The result could be that you get the same "random" number twice in a row, or the state gets corrupted entirely.
</p>
<p>
There are two approaches to make this thread-safe:
</p>
<p>
<b style="color:cornflowerblue;">1. Mutex (Lock)</b> — put a lock around the shared variable. The downside is that it blocks threads, which can slow the program down.
</p>
<p>
<b style="color:cornflowerblue;">2. Thread-Local Storage (TLS)</b> — make the variable private to each thread. Each thread gets its own copy of <code style="color:chartreuse;">rand_state</code>, so the numbers never interfere with each other.
</p>
<p>
The book mentioned it will cover this in detail later, but this quick overview is just to connect the concepts together — and we will revisit it more thoroughly when the time comes.
</p>

</div>