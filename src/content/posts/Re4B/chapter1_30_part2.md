---
title: "CH1.30(part2) Structures"
published: 2026-09-06
description: "How compilers align and pack struct fields in memory, padding behavior, and the effect of /Zp1 across x86, ARM, and MIPS"
author: "0xV3n0m"
category: "Re4B"
tags: ["Reverse Engineering", "Books", "Assembly"]
image: "/assets/img/reversee27.png"
draft: false
lang: "eng"

# Series configuration
type: "course"
series: "re4b"
seriesOrder: 34
seriesTitle: "Reverse Engineering for Beginners"
seriesDescription: "A beginner-friendly book covering x86/x64 reverse engineering through real compiler output and code patterns."
seriesImage: "/assets/img/RE4B.png"
---
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<div style="line-height:1.9; font-size:21px; direction:ltr;">
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.30.4 Fields packing in structure</b></h1>
<img src="/assets/img/fieldspacking.png" alt="Fields packing in structure" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<hr>

<p>
An important topic in structures is <b style="color:cornflowerblue;">packing</b>. Here is a simple example:
</p>

```c
#include <stdio.h>

struct s
{
    char a;   // 1 byte
    int b;    // 4 bytes
    char c;   // 1 byte
    int d;    // 4 bytes
};

void f(struct s s)
{
    printf("a=%d; b=%d; c=%d; d=%d\n", s.a, s.b, s.c, s.d);
}

int main()
{
    struct s tmp;
    tmp.a = 1;
    tmp.b = 2;
    tmp.c = 3;
    tmp.d = 4;
    f(tmp);
}
```

<p>
As we can see, we have two fields of type <code style="color:chartreuse;">char</code> (exactly 1 byte each) and two others of type <code style="color:chartreuse;">int</code> (4 bytes each).
</p>

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">x86</h2>

<p>
This compiles to:
</p>
<p>
<b>Listing 1.345: MSVC 2012 /GS- /Ob0</b>
</p>

```nasm
_tmp$ = -16
_main PROC
    push    ebp
    mov     ebp, esp
    sub     esp, 16
    mov     BYTE PTR _tmp$[ebp], 1      ; set field a (1 byte at offset 0)
    mov     DWORD PTR _tmp$[ebp+4], 2   ; set field b (4 bytes at offset 4 — 3 padding bytes skipped)
    mov     BYTE PTR _tmp$[ebp+8], 3    ; set field c (1 byte at offset 8)
    mov     DWORD PTR _tmp$[ebp+12], 4  ; set field d (4 bytes at offset 12 — 3 padding bytes skipped)
    sub     esp, 16                     ; allocate space for the temporary copy of the struct
    mov     eax, esp
    mov     ecx, DWORD PTR _tmp$[ebp]   ; copy our struct to the temporary — field by field
    mov     DWORD PTR [eax], ecx
    mov     edx, DWORD PTR _tmp$[ebp+4]
    mov     DWORD PTR [eax+4], edx
    mov     ecx, DWORD PTR _tmp$[ebp+8]
    mov     DWORD PTR [eax+8], ecx
    mov     edx, DWORD PTR _tmp$[ebp+12]
    mov     DWORD PTR [eax+12], edx
    call    _f
    add     esp, 16
    xor     eax, eax
    mov     esp, ebp
    pop     ebp
    ret     0
_main ENDP

_s$ = 8    ; size = 16  (not 10 — 6 bytes are padding)
?f@@YAXUs@@@Z PROC   ; f
    push    ebp
    mov     ebp, esp
    mov     eax, DWORD PTR _s$[ebp+12]      ; load d (offset 12)
    push    eax                              ; 4th printf argument
    movsx   ecx, BYTE PTR _s$[ebp+8]        ; load c (offset 8, sign-extend byte to 32-bit)
    push    ecx                              ; 3rd printf argument
    mov     edx, DWORD PTR _s$[ebp+4]       ; load b (offset 4)
    push    edx                              ; 2nd printf argument
    movsx   eax, BYTE PTR _s$[ebp]          ; load a (offset 0, sign-extend byte to 32-bit)
    push    eax                              ; 1st printf argument
    push    OFFSET $SG3842                   ; format string
    call    _printf
    add     esp, 20
    pop     ebp
    ret     0
?f@@YAXUs@@@Z ENDP   ; f
```

<p>
The author explains here that we are passing the struct by value, but in reality — as we can see — the struct is copied to a temporary one (space was allocated on line 10, then all 4 fields, one by one, were moved across on the lines that follow). After that, a pointer to this temporary is passed to <code style="color:chartreuse;">f()</code>.
</p>
<p>
The struct is copied because it is unknown whether <code style="color:chartreuse;">f()</code> will modify it or not. If it were modified, the struct inside <code style="color:chartreuse;">main()</code> must remain unchanged. We could use pointers in C/C++ instead, and the resulting code would be nearly the same but without the copy.
</p>
<p>
The total size here is <b style="color:cornflowerblue;">16 bytes</b>. Why 16 and not 10?
</p>
<p>
Because <code style="color:chartreuse;">int</code> requires 4-byte alignment. So <code style="color:chartreuse;">a</code> (1 byte) is followed by 3 padding bytes so that <code style="color:chartreuse;">b</code> starts at offset 4. The same happens for <code style="color:chartreuse;">c</code>. The resulting offsets are 0, 4, 8, 12 — all multiples of 4, meaning every field is aligned on a 4-byte boundary.
</p>
<p>
This happened because it is easier for the CPU to access memory at aligned addresses and cache aligned data. However, it is not very economical in terms of space.
</p>
<p>
Let's try compiling with the option <code style="color:chartreuse;">/Zp1</code> (<code style="color:chartreuse;">/Zp[n]</code> packs structures on an n-byte boundary):
</p>
<p>
<b>Listing 1.346: MSVC 2012 /GS- /Zp1</b>
</p>

```nasm
_main PROC
    push    ebp
    mov     ebp, esp
    sub     esp, 12
    mov     BYTE PTR _tmp$[ebp], 1      ; set field a at offset 0
    mov     DWORD PTR _tmp$[ebp+1], 2   ; set field b at offset 1 (no padding — packed tightly)
    mov     BYTE PTR _tmp$[ebp+5], 3    ; set field c at offset 5
    mov     DWORD PTR _tmp$[ebp+6], 4   ; set field d at offset 6
    sub     esp, 12                     ; allocate space for the 10-byte temporary copy
    mov     eax, esp
    mov     ecx, DWORD PTR _tmp$[ebp]   ; copy 10 bytes in 3 MOV pairs
    mov     DWORD PTR [eax], ecx
    mov     edx, DWORD PTR _tmp$[ebp+4]
    mov     DWORD PTR [eax+4], edx
    mov     cx, WORD PTR _tmp$[ebp+8]   ; last 2 bytes copied as WORD
    mov     WORD PTR [eax+8], cx
    call    _f
    add     esp, 12
    xor     eax, eax
    mov     esp, ebp
    pop     ebp
    ret     0
_main ENDP

_s$ = 8    ; size = 10  (tightly packed — no padding)
?f@@YAXUs@@@Z PROC   ; f
    push    ebp
    mov     ebp, esp
    mov     eax, DWORD PTR _s$[ebp+6]       ; load d (offset 6)
    push    eax
    movsx   ecx, BYTE PTR _s$[ebp+5]        ; load c (offset 5, sign-extend)
    push    ecx
    mov     edx, DWORD PTR _s$[ebp+1]       ; load b (offset 1)
    push    edx
    movsx   eax, BYTE PTR _s$[ebp]          ; load a (offset 0, sign-extend)
    push    eax
    push    OFFSET $SG3842
    call    _printf
    add     esp, 20
    pop     ebp
    ret     0
?f@@YAXUs@@@Z ENDP   ; f
```

<p>
Now the struct takes only <b style="color:cornflowerblue;">10 bytes</b>, and each <code style="color:chartreuse;">char</code> value takes exactly 1 byte. What does this give us? Space savings. The downside is that the CPU will be slower when accessing these fields compared to if they were aligned.
</p>
<p>
The struct is also copied inside <code style="color:chartreuse;">main()</code>  not field by field, but directly as 10 bytes, using three <code style="color:chartreuse;">MOV</code> pairs. Why not 4? The compiler decided it is better to copy 10 bytes using 3 <code style="color:chartreuse;">MOV</code> pairs rather than two 32-bit words and 2 bytes using 4 <code style="color:chartreuse;">MOV</code> pairs.
</p>
<p>
By the way, implementing copying using <code style="color:chartreuse;">MOV</code> instead of calling <code style="color:chartreuse;">memcpy()</code> is very common, because it is faster than making a function call.
</p>
<p>
As you might easily expect, if a struct is used across multiple source files and object files, all of them must be compiled with the same convention regarding struct packing.
</p>
<p>
Besides the MSVC <code style="color:chartreuse;">/Zp</code> option which specifies how each struct field gets packed, there is also the compiler option <code style="color:chartreuse;">#pragma pack</code>, which can be defined directly in the source code. It is available in both MSVC and GCC.
</p>
<p>
Let's go back to the <code style="color:chartreuse;">SYSTEMTIME</code> struct which consists of 16-bit fields. How did our compiler know to pack them on a 1-byte boundary?
</p>
<p>
The file <code style="color:chartreuse;">WinNT.h</code> contains this:
</p>
<p>
<b>Listing 1.347: WinNT.h</b>
</p>

```c
#include "pshpack1.h"
```

<p>
And also this:
</p>
<p>
<b>Listing 1.348: WinNT.h</b>
</p>

```c
#include "pshpack4.h" // 4 byte packing is the default
```

<p>
The file <code style="color:chartreuse;">PshPack1.h</code> looks like this:
</p>
<p>
<b>Listing 1.349: PshPack1.h</b>
</p>

```c
#if ! (defined(lint) || defined(RC_INVOKED))
#if ( _MSC_VER >= 800 && !defined(_M_I86)) || defined(_PUSHPOP_SUPPORTED)
#pragma warning(disable:4103)
#if !(defined( MIDL_PASS )) || defined( __midl )
#pragma pack(push,1)   // push current packing setting, set new packing to 1 byte
#else
#pragma pack(1)
#endif
#else
#pragma pack(1)
#endif
#endif /* ! (defined(lint) || defined(RC_INVOKED)) */
```

<p>
This tells the compiler how to pack the structs that are defined after this <code style="color:chartreuse;">#pragma pack</code>.
</p>

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">x32dbg — fields packed by default (4-byte alignment)</h2>

<p>
Let's try our example (where fields are aligned by default on 4-byte boundaries) in x32dbg:
</p>
<img src="/assets/x32dbg2/struct_pack_1.png" alt="struct default alignment in x32dbg" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
We can see our 4 fields in the data window.
</p>
<p>
But where do the random bytes (<code style="color:chartreuse;">0xFA</code>, <code style="color:chartreuse;">0x53</code>) next to the first field (<code style="color:chartreuse;">a</code>) and third field (<code style="color:chartreuse;">c</code>) come from?
</p>
<p>
We can see that the first and third fields are of type <code style="color:chartreuse;">char</code>, so only one byte gets written — 1 and 3 respectively. The remaining 3 bytes of the 32-bit word are <b style="color:cornflowerblue;">not modified in memory</b>. As a result, random garbage data stays there.
</p>
<p>
This garbage does not affect the output of <code style="color:chartreuse;">printf()</code> in any way, because the values are prepared using the <code style="color:chartreuse;">MOVSX</code> instruction, which takes <b style="color:cornflowerblue;">bytes</b>, not words.
</p>
<p>
By the way, <code style="color:chartreuse;">MOVSX</code> (sign-extend) is used here because <code style="color:chartreuse;">char</code> is signed by default in both MSVC and GCC. If the type <code style="color:chartreuse;">unsigned char</code> or <code style="color:chartreuse;">uint8_t</code> were used instead, the <code style="color:chartreuse;">MOVZX</code> instruction would be used.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">x32dbg — fields aligned on 1-byte boundary</h2>

<p>
Things are much clearer here: the 4 fields take 10 bytes and the values are stored right next to each other.
</p>
<img src="/assets/x32dbg2/struct_pack_2.png" alt="struct 1-byte alignment in x32dbg" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM</h2>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing Keil 6/2013 (Thumb mode)</h3>

<p>
<b>Listing 1.350: Optimizing Keil 6/2013 (Thumb mode)</b>
</p>

```nasm
.text:0000003E exit               ; CODE XREF: f+16
.text:0000003E 05 B0             ADD     SP, SP, #0x14   ; deallocate local stack
.text:00000040 00 BD             POP     {PC}            ; return

.text:00000280 f
.text:00000280 var_18 = -0x18
.text:00000280 a      = -0x14    ; field a on stack
.text:00000280 b      = -0x10    ; field b on stack
.text:00000280 c      = -0xC     ; field c on stack
.text:00000280 d      = -8       ; field d on stack

.text:00000280 0F B5             PUSH    {R0-R3,LR}          ; push struct fields and link register
.text:00000282 81 B0             SUB     SP, SP, #4          ; allocate extra local space
.text:00000284 04 98             LDR     R0, [SP,#16]        ; load d from stack
.text:00000286 02 9A             LDR     R2, [SP,#8]         ; load b from stack
.text:00000288 00 90             STR     R0, [SP]            ; push d as 4th arg for printf
.text:0000028A 68 46             MOV     R0, SP
.text:0000028C 03 7B             LDRB    R3, [R0,#12]        ; load c (byte load — 1 byte only)
.text:0000028E 01 79             LDRB    R1, [R0,#4]         ; load a (byte load — 1 byte only)
.text:00000290 59 A0             ADR     R0, aADBDCDDD       ; "a=%d; b=%d; c=%d; d=%d\n"
.text:00000292 05 F0 AD FF       BL      __2printf           ; call printf
.text:00000296 D2 E6             B       exit                ; jump to shared epilogue
```

<p>
As we may recall, the struct is passed by value (not by pointer), and since the first 4 function arguments in ARM are passed via registers, the struct fields are passed via registers R0–R3.
</p>
<p>
<code style="color:chartreuse;">LDRB</code> (Load Register Byte) loads one byte from memory and extends it to 32 bits with sign consideration. This is equivalent to <code style="color:chartreuse;">MOVSX</code> in x86. It is used here to load fields <code style="color:chartreuse;">a</code> and <code style="color:chartreuse;">c</code> from the struct.
</p>
<p>
Another thing we can easily notice: instead of a function epilogue, there is a jump to the epilogue of a <b style="color:cornflowerblue;">different function</b>. That was a completely different function, unrelated to ours in any way, but it had the exact same epilogue (probably because it also had 5 local variables, 5 × 4 = 0x14). It is also located nearby (notice the addresses). It does not matter which epilogue executes as long as it works as we need. It seems Keil decided to reuse a piece of another function to save space — the epilogue costs 4 bytes, while the jump costs only 2 bytes.
</p>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM + Optimizing Xcode 4.6.3 (LLVM) (Thumb-2 mode)</h3>

<p>
<b>Listing 1.351: Optimizing Xcode 4.6.3 (LLVM) (Thumb-2 mode)</b>
</p>

```nasm
var_C = -0xC

    PUSH    {R7,LR}
    MOV     R7, SP
    SUB     SP, SP, #4
    MOV     R9, R1              ; save b in R9
    MOV     R1, R0              ; R1 = a (will be sign-extended below)
    MOVW    R0, #0xF10          ; load address of format string (lower 16 bits)
    SXTB    R1, R1              ; sign-extend byte → 32-bit (prepare a for printf)
    MOVT.W  R0, #0              ; load address of format string (upper 16 bits)
    STR     R3, [SP,#0xC+var_C] ; push d onto stack as 4th argument for printf
    ADD     R0, PC              ; finalize format string address
    SXTB    R3, R2              ; sign-extend byte → 32-bit (prepare c for printf)
    MOV     R2, R9              ; R2 = b (second argument)
    BLX     _printf             ; call printf(format, a, b, c, d)
    ADD     SP, SP, #4
    POP     {R7,PC}             ; return
```

<p>
<code style="color:chartreuse;">SXTB</code> (Signed Extend Byte) is equivalent to <code style="color:chartreuse;">MOVSX</code> in x86. The rest is essentially the same.
</p>

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">MIPS</h2>

<p>
<b>Listing 1.352: Optimizing GCC 4.4.5 (IDA)</b>
</p>

```nasm
f:

var_18 = -0x18
var_10 = -0x10
var_4  = -4
arg_0  = 0      ; s.a
arg_4  = 4      ; s.b
arg_8  = 8      ; s.c
arg_C  = 0xC    ; s.d

; $a0 = s.a  (field a arrives in register $a0)
; $a1 = s.b  (field b arrives in register $a1)
; $a2 = s.c  (field c arrives in register $a2)
; $a3 = s.d  (field d arrives in register $a3)

    lui     $gp, (__gnu_local_gp >> 16)
    addiu   $sp, -0x28
    la      $gp, (__gnu_local_gp & 0xFFFF)
    sw      $ra, 0x28+var_4($sp)
    sw      $gp, 0x28+var_10($sp)

    ; extract the byte from the 32-bit big-endian integer (char field occupies high bits):
    sra     $t0, $a0, 24        ; arithmetic shift right 24 → sign-extended byte of a
    move    $v1, $a1            ; save b

    ; extract byte from the 32-bit big-endian integer for c:
    sra     $v0, $a2, 24        ; arithmetic shift right 24 → sign-extended byte of c

    lw      $t9, (printf & 0xFFFF)($gp)
    sw      $a0, 0x28+arg_0($sp)
    lui     $a0, ($LC0 >> 16)   ; "a=%d; b=%d; c=%d; d=%d\n"
    sw      $a3, 0x28+var_18($sp)
    sw      $a1, 0x28+arg_4($sp)
    sw      $a2, 0x28+arg_8($sp)
    sw      $a3, 0x28+arg_C($sp)
    la      $a0, ($LC0 & 0xFFFF) ; finalize format string address
    move    $a1, $t0            ; a (sign-extended) → 2nd printf arg
    move    $a2, $v1            ; b → 3rd printf arg
    jalr    $t9                 ; call printf
    move    $a3, $v0            ; branch delay slot: c (sign-extended) → 4th printf arg

    lw      $ra, 0x28+var_4($sp)
    or      $at, $zero          ; load delay slot, NOP
    jr      $ra                 ; return
    addiu   $sp, 0x28           ; branch delay slot: restore stack

$LC0: .ascii "a=%d; b=%d; c=%d; d=%d\n"<0>
```

<p>
The struct fields arrive in registers <code style="color:chartreuse;">$A0</code> to <code style="color:chartreuse;">$A3</code> and then get rearranged into <code style="color:chartreuse;">$A1</code> to <code style="color:chartreuse;">$A3</code> for <code style="color:chartreuse;">printf()</code>, while the fourth field (from <code style="color:chartreuse;">$A3</code>) is passed via the local stack using <code style="color:chartreuse;">SW</code>.
</p>
<p>
But there are two <code style="color:chartreuse;">SRA</code> ("Shift Word Right Arithmetic") instructions, which prepare the <code style="color:chartreuse;">char</code> fields. Why?
</p>
<p>
MIPS is a big-endian architecture by default  and the Debian Linux we are running on is also big-endian. When byte-sized variables are stored in 32-bit slots in a struct, they occupy the high bits 31..24. When a <code style="color:chartreuse;">char</code> variable needs to be extended to 32 bits, it must be shifted right by 24 bits. Since <code style="color:chartreuse;">char</code> is a signed type, an arithmetic shift is used here instead of a logical one.
</p>

<hr>

<p>
One final note: passing a struct as a function argument (instead of a pointer to the struct) is the same as passing all the struct's fields one by one. If the struct fields are packed by default, the function <code style="color:chartreuse;">f()</code> could be rewritten like this:
</p>

```c
void f(char a, int b, char c, int d)
{
    printf("a=%d; b=%d; c=%d; d=%d\n", a, b, c, d);
}
```

<p>
And it would produce the same machine code.
</p>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.30.5 Nested structures</b></h1>

<img src="/assets/img/nestedstructures.png" alt="Nested structures" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<hr>
<p>
Now what happens when a structure is defined inside another structure?
</p>


```c
#include <stdio.h>
 
struct inner_struct
{
    int a;   // 4 bytes
    int b;   // 4 bytes
};
 
struct outer_struct
{
    char a;                  // 1 byte  (+ 3 padding)
    int b;                   // 4 bytes
    struct inner_struct c;   // 8 bytes (nested struct embedded inline)
    char d;                  // 1 byte  (+ 3 padding)
    int e;                   // 4 bytes
};
 
void f(struct outer_struct s)
{
    printf("a=%d; b=%d; c.a=%d; c.b=%d; d=%d; e=%d\n",
           s.a, s.b, s.c.a, s.c.b, s.d, s.e);
}
 
int main()
{
    struct outer_struct s;
    s.a = 1;
    s.b = 2;
    s.c.a = 100;
    s.c.b = 101;
    s.d = 3;
    s.e = 4;
    f(s);
}
```
 
<p>
In this case, the two fields of <code style="color:chartreuse;">inner_struct</code> will be placed between fields <code style="color:chartreuse;">a, b</code> and <code style="color:chartreuse;">d, e</code> of <code style="color:chartreuse;">outer_struct</code>.
</p>
<p>
Let's compile (MSVC 2010):
</p>
<p>
<b>Listing 1.353: Optimizing MSVC 2010 /Ob0</b>
</p>



```nasm
$SG2802 DB 'a=%d; b=%d; c.a=%d; c.b=%d; d=%d; e=%d', 0aH, 00H
 
_TEXT SEGMENT
_s$ = 8
_f PROC
    mov     eax, DWORD PTR _s$[esp+16]  ; load e (offset 16)
    movsx   ecx, BYTE PTR _s$[esp+12]   ; load d (offset 12, sign-extend byte)
    mov     edx, DWORD PTR _s$[esp+8]   ; load c.b (offset 8)
    push    eax                          ; push e
    mov     eax, DWORD PTR _s$[esp+8]   ; load c.a (offset 4 from current esp)
    push    ecx                          ; push d
    mov     ecx, DWORD PTR _s$[esp+8]   ; load b
    push    edx                          ; push c.b
    movsx   edx, BYTE PTR _s$[esp+8]    ; load a (sign-extend byte)
    push    eax                          ; push c.a
    push    ecx                          ; push b
    push    edx                          ; push a
    push    OFFSET $SG2802              ; format string
    call    _printf
    add     esp, 28
    ret     0
_f ENDP
 
_s$ = -24
_main PROC
    sub     esp, 24
    push    ebx
    push    esi
    push    edi
    mov     ecx, 2
    sub     esp, 24
    mov     eax, esp
    ; from this point, EAX is equivalent to ESP:
    mov     BYTE PTR _s$[esp+60], 1         ; s.a = 1
    mov     ebx, DWORD PTR _s$[esp+60]
    mov     DWORD PTR [eax], ebx            ; copy s.a to temp struct
    mov     DWORD PTR [eax+4], ecx          ; s.b = 2
    lea     edx, DWORD PTR [ecx+98]         ; 100 = 2 + 98
    lea     esi, DWORD PTR [ecx+99]         ; 101 = 2 + 99
    lea     edi, DWORD PTR [ecx+2]          ; 4   = 2 + 2
    mov     DWORD PTR [eax+8], edx          ; s.c.a = 100
    mov     BYTE PTR _s$[esp+76], 3         ; s.d = 3
    mov     ecx, DWORD PTR _s$[esp+76]
    mov     DWORD PTR [eax+12], esi         ; s.c.b = 101
    mov     DWORD PTR [eax+16], ecx         ; s.d = 3 (copied to temp)
    mov     DWORD PTR [eax+20], edi         ; s.e = 4
    call    _f
    add     esp, 24
    pop     edi
    pop     esi
    xor     eax, eax
    pop     ebx
    add     esp, 24
    ret     0
_main ENDP
```
 
<p>
The interesting thing here is that by staring at this assembly code, we cannot even see that another struct was used inside it! So we can say that nested structures get <b style="color:cornflowerblue;">unfolded</b> into a flat, one-dimensional struct.
</p>
<p>
Of course, if we replaced <code style="color:chartreuse;">struct inner_struct c;</code> with <code style="color:chartreuse;">struct inner_struct *c;</code> (making it a pointer instead), the situation would be completely different.
</p>
<hr>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">x32dbg</h2>
 
<img src="/assets/x32dbg2/nested_struct.png" alt="nested struct in x32dbg" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
Here is how the values sit in memory:
</p>
<p>* <b style="color:cornflowerblue;">outer_struct.a</b> (byte) = 1, followed by 3 garbage bytes</p>
<p>* <b style="color:cornflowerblue;">outer_struct.b</b> (32-bit word) = 2</p>
<p>* <b style="color:cornflowerblue;">inner_struct.a</b> (32-bit word) = <code style="color:chartreuse;">0x64</code> (100)</p>
<p>* <b style="color:cornflowerblue;">inner_struct.b</b> (32-bit word) = <code style="color:chartreuse;">0x65</code> (101)</p>
<p>* <b style="color:cornflowerblue;">outer_struct.d</b> (byte) = 3, followed by 3 garbage bytes</p>
<p>* <b style="color:cornflowerblue;">outer_struct.e</b> (32-bit word) = 4</p>
<hr>
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.30.6 Bit fields in a structure</b></h1>
<hr>
<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>CPUID example</b></h2>
 
<p>
C/C++ allows you to define the exact number of bits for each field in a structure. This is very useful when you need to save memory space — one bit is enough for a <code style="color:chartreuse;">bool</code> variable, for example. Of course, it does not make sense when speed is the priority.
</p>
<p>
Let's take the <code style="color:chartreuse;">CPUID</code> instruction as an example. This instruction returns information about the current processor and its capabilities.
</p>
<p>
If <code style="color:chartreuse;">EAX</code> is set to 1 before executing the instruction, <code style="color:chartreuse;">CPUID</code> returns this information packed into register <code style="color:chartreuse;">EAX</code>:
</p>
<table style="border-collapse:collapse; width:100%; margin:20px 0; font-size:17px;">
  <thead>
    <tr style="background:#161b22;">
      <th style="border:1px solid #30363d; padding:10px 14px; text-align:left; color:#9a3ba6;">Field</th>
      <th style="border:1px solid #30363d; padding:10px 14px; text-align:left; color:#9a3ba6;">Bits</th>
      <th style="border:1px solid #30363d; padding:10px 14px; text-align:left; color:#9a3ba6;">Width</th>
      <th style="border:1px solid #30363d; padding:10px 14px; text-align:left; color:#9a3ba6;">Shift</th>
      <th style="border:1px solid #30363d; padding:10px 14px; text-align:left; color:#9a3ba6;">Mask</th>
      <th style="border:1px solid #30363d; padding:10px 14px; text-align:left; color:#9a3ba6;">Max value</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background:#0d1117; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 14px;"><b>Stepping</b></td>
      <td style="border:1px solid #30363d; padding:10px 14px;">3:0</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">4</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">0</td>
      <td style="border:1px solid #30363d; padding:10px 14px;"><code style="color:chartreuse;">0xF</code> (15)</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">15</td>
    </tr>
    <tr style="background:#161b22; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 14px;"><b>Model</b></td>
      <td style="border:1px solid #30363d; padding:10px 14px;">7:4</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">4</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">4</td>
      <td style="border:1px solid #30363d; padding:10px 14px;"><code style="color:chartreuse;">0xF</code> (15)</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">15</td>
    </tr>
    <tr style="background:#0d1117; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 14px;"><b>Family ID</b></td>
      <td style="border:1px solid #30363d; padding:10px 14px;">11:8</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">4</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">8</td>
      <td style="border:1px solid #30363d; padding:10px 14px;"><code style="color:chartreuse;">0xF</code> (15)</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">15</td>
    </tr>
    <tr style="background:#161b22; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 14px;"><b>Processor Type</b></td>
      <td style="border:1px solid #30363d; padding:10px 14px;">13:12</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">2</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">12</td>
      <td style="border:1px solid #30363d; padding:10px 14px;"><code style="color:chartreuse;">0x3</code> (3)</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">3</td>
    </tr>
    <tr style="background:#0d1117; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 14px;"><b>Reserved</b></td>
      <td style="border:1px solid #30363d; padding:10px 14px;">15:14</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">2</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">14</td>
      <td style="border:1px solid #30363d; padding:10px 14px;"><code style="color:chartreuse;">0x3</code> (3)</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">3</td>
    </tr>
    <tr style="background:#161b22; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 14px;"><b>Extended Model</b></td>
      <td style="border:1px solid #30363d; padding:10px 14px;">19:16</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">4</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">16</td>
      <td style="border:1px solid #30363d; padding:10px 14px;"><code style="color:chartreuse;">0xF</code> (15)</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">15</td>
    </tr>
    <tr style="background:#0d1117; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 14px;"><b>Extended Family</b></td>
      <td style="border:1px solid #30363d; padding:10px 14px;">27:20</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">8</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">20</td>
      <td style="border:1px solid #30363d; padding:10px 14px;"><code style="color:chartreuse;">0xFF</code> (255)</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">255</td>
    </tr>
    <tr style="background:#161b22; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 14px;"><b>Reserved</b></td>
      <td style="border:1px solid #30363d; padding:10px 14px;">31:28</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">4</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">28</td>
      <td style="border:1px solid #30363d; padding:10px 14px;"><code style="color:chartreuse;">0xF</code> (15)</td>
      <td style="border:1px solid #30363d; padding:10px 14px;">15</td>
    </tr>
  </tbody>
</table>
<p>
MSVC 2010 has a <code style="color:chartreuse;">CPUID</code> macro, but GCC 4.4.1 does not. So let's write this function ourselves for GCC using its built-in assembler.
</p>


```c
#include <stdio.h>
 
#ifdef __GNUC__
// GCC inline assembly wrapper for CPUID instruction
static inline void cpuid(int code, int *a, int *b, int *c, int *d) {
    asm volatile("cpuid":"=a"(*a),"=b"(*b),"=c"(*c),"=d"(*d):"a"(code));
}
#endif
 
#ifdef _MSC_VER
#include <intrin.h>
#endif
 
struct CPUID_1_EAX
{
    unsigned int stepping:4;           // bits 3:0   — 4 bits
    unsigned int model:4;              // bits 7:4   — 4 bits
    unsigned int family_id:4;          // bits 11:8  — 4 bits
    unsigned int processor_type:2;     // bits 13:12 — 2 bits
    unsigned int reserved1:2;          // bits 15:14 — 2 bits (unused)
    unsigned int extended_model_id:4;  // bits 19:16 — 4 bits
    unsigned int extended_family_id:8; // bits 27:20 — 8 bits
    unsigned int reserved2:4;          // bits 31:28 — 4 bits (unused)
};
 
int main()
{
    struct CPUID_1_EAX *tmp;
    int b[4];   // will hold EAX, EBX, ECX, EDX results
 
#ifdef _MSC_VER
    __cpuid(b, 1);       // MSVC intrinsic — fills b[0..3] with EAX/EBX/ECX/EDX
#endif
 
#ifdef __GNUC__
    cpuid(1, &b[0], &b[1], &b[2], &b[3]); // GCC inline asm version
#endif
 
    tmp = (struct CPUID_1_EAX *)&b[0]; // reinterpret b[0] (EAX) as the bit field struct
 
    printf("stepping=%d\n", tmp->stepping);
    printf("model=%d\n", tmp->model);
    printf("family_id=%d\n", tmp->family_id);
    printf("processor_type=%d\n", tmp->processor_type);
    printf("extended_model_id=%d\n", tmp->extended_model_id);
    printf("extended_family_id=%d\n", tmp->extended_family_id);
 
    return 0;
}
```
 
<p>
After <code style="color:chartreuse;">CPUID</code> fills the registers <code style="color:chartreuse;">EAX/EBX/ECX/EDX</code>, those registers will be written into the array <code style="color:chartreuse;">b[]</code>. Then we have a pointer to the <code style="color:chartreuse;">CPUID_1_EAX</code> struct, and we point it to the value in <code style="color:chartreuse;">EAX</code> from array <code style="color:chartreuse;">b[]</code>. In other words, we treat a 32-bit <code style="color:chartreuse;">int</code> value as a struct, and then read specific bits from it.
</p>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">MSVC</h2>
 
<p>
Let's compile it in MSVC 2008 with the <code style="color:chartreuse;">/Ox</code> option:
</p>
<p>
<b>Listing 1.354: Optimizing MSVC 2008</b>
</p>



```nasm
_b$ = -16      ; size = 16 ; local array b[4] on stack
_main PROC
    sub     esp, 16
    push    ebx
    xor     ecx, ecx            ; ECX = 0 (not used by CPUID with EAX=1, but cleared for safety)
    mov     eax, 1              ; EAX = 1 — request basic CPU info
    cpuid                       ; execute CPUID — fills EAX, EBX, ECX, EDX
    push    esi
    lea     esi, DWORD PTR _b$[esp+24]
    mov     DWORD PTR [esi], eax    ; b[0] = EAX (this is what we parse)
    mov     DWORD PTR [esi+4], ebx  ; b[1] = EBX
    mov     DWORD PTR [esi+8], ecx  ; b[2] = ECX
    mov     DWORD PTR [esi+12], edx ; b[3] = EDX
 
    mov     esi, DWORD PTR _b$[esp+24] ; ESI = b[0] = EAX value
 
    ; --- stepping (bits 3:0) ---
    mov     eax, esi
    and     eax, 15             ; EAX &= 0xF — keep lowest 4 bits (no shift needed)
    push    eax
    push    OFFSET $SG15435     ; "stepping=%d\n"
    call    _printf
 
    ; --- model (bits 7:4) ---
    mov     ecx, esi
    shr     ecx, 4              ; shift right 4 — model field moves to bits 3:0
    and     ecx, 15             ; keep only lowest 4 bits
    push    ecx
    push    OFFSET $SG15436     ; "model=%d\n"
    call    _printf
 
    ; --- family_id (bits 11:8) ---
    mov     edx, esi
    shr     edx, 8              ; shift right 8
    and     edx, 15             ; keep lowest 4 bits
    push    edx
    push    OFFSET $SG15437     ; "family_id=%d\n"
    call    _printf
 
    ; --- processor_type (bits 13:12) ---
    mov     eax, esi
    shr     eax, 12             ; shift right 12
    and     eax, 3              ; keep lowest 2 bits (field is 2 bits wide)
    push    eax
    push    OFFSET $SG15438     ; "processor_type=%d\n"
    call    _printf
 
    ; --- extended_model_id (bits 19:16) ---
    mov     ecx, esi
    shr     ecx, 16             ; shift right 16
    and     ecx, 15             ; keep lowest 4 bits
    push    ecx
    push    OFFSET $SG15439     ; "extended_model_id=%d\n"
    call    _printf
 
    ; --- extended_family_id (bits 27:20) ---
    shr     esi, 20             ; shift right 20
    and     esi, 255            ; keep lowest 8 bits (field is 8 bits wide)
    push    esi
    push    OFFSET $SG15440     ; "extended_family_id=%d\n"
    call    _printf
 
    add     esp, 48
    pop     esi
    xor     eax, eax
    pop     ebx
    add     esp, 16
    ret     0
_main ENDP
```
 
<p>
The <code style="color:chartreuse;">SHR</code> instruction shifts the value in <code style="color:chartreuse;">EAX</code> by the number of bits we need to skip — we are ignoring some bits on the right side. The <code style="color:chartreuse;">AND</code> instruction clears the unwanted bits on the left, or in other words, keeps only the bits we need in register <code style="color:chartreuse;">EAX</code>.
</p>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">MSVC + x32dbg</h2>
 
<p>
Let's load our example in x32dbg and see what values get set in <code style="color:chartreuse;">EAX/EBX/ECX/EDX</code> after executing <code style="color:chartreuse;">CPUID</code>:
</p>
<img src="/assets/x32dbg2/cpuid_1.png" alt="CPUID result in x32dbg" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
<code style="color:chartreuse;">EAX</code> here holds the value <code style="color:chartreuse;">0x000306C3</code>, which in binary is <code style="color:chartreuse;">0011 0000 0110 1100 0011</code>.
</p>
<p>
My processor is an <b style="color:cornflowerblue;">Intel Core i7-4610M</b>. Let's decode the fields:
</p>
<table style="border-collapse:collapse; width:100%; margin:20px 0; font-size:18px;">
  <thead>
    <tr style="background:#161b22;">
      <th style="border:1px solid #30363d; padding:10px 16px; text-align:left; color:#9a3ba6;">Field</th>
      <th style="border:1px solid #30363d; padding:10px 16px; text-align:left; color:#9a3ba6;">Bits</th>
      <th style="border:1px solid #30363d; padding:10px 16px; text-align:left; color:#9a3ba6;">Binary</th>
      <th style="border:1px solid #30363d; padding:10px 16px; text-align:left; color:#9a3ba6;">Decimal</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background:#0d1117; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;">stepping</td>
      <td style="border:1px solid #30363d; padding:10px 16px;">0–3</td>
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">0011</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">3</td>
    </tr>
    <tr style="background:#161b22; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;">model</td>
      <td style="border:1px solid #30363d; padding:10px 16px;">4–7</td>
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">1100</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">12 (0xC)</td>
    </tr>
    <tr style="background:#0d1117; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;">family_id</td>
      <td style="border:1px solid #30363d; padding:10px 16px;">8–11</td>
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">0110</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">6</td>
    </tr>
    <tr style="background:#161b22; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;">processor_type</td>
      <td style="border:1px solid #30363d; padding:10px 16px;">12–13</td>
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">00</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">0</td>
    </tr>
    <tr style="background:#0d1117; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;">reserved1</td>
      <td style="border:1px solid #30363d; padding:10px 16px;">14–15</td>
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">00</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">0</td>
    </tr>
    <tr style="background:#161b22; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;">extended_model_id</td>
      <td style="border:1px solid #30363d; padding:10px 16px;">16–19</td>
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">0011</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">3</td>
    </tr>
    <tr style="background:#0d1117; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;">extended_family_id</td>
      <td style="border:1px solid #30363d; padding:10px 16px;">20–27</td>
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">00000000</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">0</td>
    </tr>
    <tr style="background:#161b22; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;">reserved2</td>
      <td style="border:1px solid #30363d; padding:10px 16px;">28–31</td>
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">0000</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">0</td>
    </tr>
  </tbody>
</table>
<p>
And the output:
</p>
<img src="/assets/x32dbg2/cpuid_2.png" alt="CPUID printf output" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<hr>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">GCC</h2>
 
<p>
Let's try GCC 4.4.1 with the <code style="color:chartreuse;">-O3</code> option:
</p>


```nasm
main proc near                      ; DATA XREF: _start+17
    push    ebp
    mov     ebp, esp
    and     esp, 0FFFFFFF0h         ; align stack to 16 bytes
    push    esi
    mov     esi, 1                  ; EAX input = 1 for CPUID
    push    ebx
    mov     eax, esi
    sub     esp, 18h
    cpuid                           ; execute CPUID — results in EAX, EBX, ECX, EDX
    mov     esi, eax                ; save EAX result in ESI for repeated use
 
    ; --- stepping (bits 3:0) ---
    and     eax, 0Fh                ; EAX &= 0xF — no shift needed, field is at bottom
    mov     [esp+8], eax
    mov     dword ptr [esp+4], offset aSteppingD   ; "stepping=%d\n"
    mov     dword ptr [esp], 1
    call    ___printf_chk
 
    ; --- model (bits 7:4) ---
    mov     eax, esi
    shr     eax, 4                  ; shift right 4 bits
    and     eax, 0Fh                ; keep lowest 4 bits
    mov     [esp+8], eax
    mov     dword ptr [esp+4], offset aModelD       ; "model=%d\n"
    mov     dword ptr [esp], 1
    call    ___printf_chk
 
    ; --- family_id (bits 11:8) ---
    mov     eax, esi
    shr     eax, 8                  ; shift right 8 bits
    and     eax, 0Fh                ; keep lowest 4 bits
    mov     [esp+8], eax
    mov     dword ptr [esp+4], offset aFamily_idD   ; "family_id=%d\n"
    mov     dword ptr [esp], 1
    call    ___printf_chk
 
    ; --- processor_type (bits 13:12) ---
    mov     eax, esi
    shr     eax, 0Ch                ; shift right 12 bits
    and     eax, 3                  ; keep lowest 2 bits (field is 2 bits wide)
    mov     [esp+8], eax
    mov     dword ptr [esp+4], offset aProcessor_type ; "processor_type=%d\n"
    mov     dword ptr [esp], 1
    call    ___printf_chk
 
    ; --- extended_model_id AND extended_family_id computed together ---
    mov     eax, esi
    shr     eax, 10h                ; shift right 16 bits for extended_model_id
    shr     esi, 14h                ; shift right 20 bits for extended_family_id (done in parallel)
    and     eax, 0Fh                ; keep lowest 4 bits for extended_model_id
    and     esi, 0FFh               ; keep lowest 8 bits for extended_family_id
    mov     [esp+8], eax
    mov     dword ptr [esp+4], offset aExtended_model ; "extended_model_id=%d\n"
    mov     dword ptr [esp], 1
    call    ___printf_chk
 
    mov     [esp+8], esi
    mov     dword ptr [esp+4], offset unk_80486D0   ; "extended_family_id=%d\n"
    mov     dword ptr [esp], 1
    call    ___printf_chk
 
    add     esp, 18h
    xor     eax, eax
    pop     ebx
    pop     esi
    mov     esp, ebp
    pop     ebp
    retn
main endp
```
 
<p>
Nearly the same thing. The only noteworthy difference is that GCC somehow merges the calculation of <code style="color:chartreuse;">extended_model_id</code> and <code style="color:chartreuse;">extended_family_id</code> into a single block, instead of computing them separately before each <code style="color:chartreuse;">printf()</code> call.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Handling float data type as a structure</h2>
 <img src="/assets/x32dbg2/struct_pack_3.png" alt="struct default alignment in x32dbg" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
As we noticed before in the FPU section, the types <code style="color:chartreuse;">float</code> and <code style="color:chartreuse;">double</code> are composed of a sign, a significand (or fraction), and an exponent. But would it be possible to work with these fields directly? Let's try this with <code style="color:chartreuse;">float</code>.
</p>
 
```c
#include <stdio.h>
#include <assert.h>
#include <stdlib.h>
#include <memory.h>
 
struct float_as_struct
{
    unsigned int fraction : 23;   // the fractional part
    unsigned int exponent : 8;    // the exponent + 0x3FF
    unsigned int sign     : 1;    // the sign bit
};
 
float f(float _in)
{
    float f = _in;
    struct float_as_struct t;
    assert(sizeof(struct float_as_struct) == sizeof(float)); // must be the same size
    memcpy(&t, &f, sizeof(float));   // copy the float bits into the struct
    t.sign = 1;                      // make the sign negative
    t.exponent = t.exponent + 2;     // multiply the number by 2^2 = 4
    memcpy(&f, &t, sizeof(float));   // copy the modified bits back into the float
    return f;
}
 
int main()
{
    printf("%f\n", f(1.234)); // print the result of f(1.234)
}
```
 
<p>
The struct <code style="color:chartreuse;">float_as_struct</code> takes the same space as a <code style="color:chartreuse;">float</code>, which is 4 bytes or 32 bits.
</p>
<p>
Here we are setting the negative sign in the input value, and by adding 2 to the exponent we multiply the whole number by <code style="color:chartreuse;">2^2</code>, i.e. by 4.
</p>
<p>
Let's compile in MSVC 2008 without optimization:
</p>
 
```nasm
_t$ = -8      ; size = 4
_f$ = -4      ; size = 4
__in$ = 8     ; size = 4
 
?f@@YAMM@Z PROC     ; f
    push ebp
    mov ebp, esp
    sub esp, 8                          ; allocate space for local variables f and t
    fld DWORD PTR __in$[ebp]            ; load the input float argument
    fstp DWORD PTR _f$[ebp]             ; store it into local variable f
    push 4                              ; size argument to memcpy
    lea eax, DWORD PTR _f$[ebp]
    push eax                            ; source: address of f
    lea ecx, DWORD PTR _t$[ebp]
    push ecx                            ; destination: address of t
    call _memcpy                        ; copy float bits into struct t
    add esp, 12                         ; clean up stack after memcpy
    mov edx, DWORD PTR _t$[ebp]
    or edx, -2147483648                 ; 80000000H - set the negative sign bit
    mov DWORD PTR _t$[ebp], edx
    mov eax, DWORD PTR _t$[ebp]
    shr eax, 23                         ; 00000017H - shift away the fraction
    and eax, 255                        ; 000000FFH - keep only the exponent here
    add eax, 2                          ; add 2 to the exponent
    and eax, 255                        ; 000000FFH - mask to 8 bits
    shl eax, 23                         ; 00000017H - shift result into bits 30:23
    mov ecx, DWORD PTR _t$[ebp]
    and ecx, -2139095041                ; 807FFFFFH - clear the old exponent
    or ecx, eax                         ; merge the value without exponent with the new exponent
    mov DWORD PTR _t$[ebp], ecx
    push 4                              ; size argument to memcpy
    lea edx, DWORD PTR _t$[ebp]
    push edx                            ; source: address of t
    lea eax, DWORD PTR _f$[ebp]
    push eax                            ; destination: address of f
    call _memcpy                        ; copy modified bits back into float f
    add esp, 12                         ; clean up stack after memcpy
    fld DWORD PTR _f$[ebp]              ; load the result float to return it
    mov esp, ebp
    pop ebp
    ret 0
?f@@YAMM@Z ENDP     ; f
```
 
<p>
The code has some repetition. If compiled with the <code style="color:chartreuse;">/Ox</code> option, there would be no <code style="color:chartreuse;">memcpy()</code> calls, and the variable <code style="color:chartreuse;">f</code> would be used directly. But the code is easier to understand in its non-optimized version.
</p>
<p>
What will GCC 4.4.1 do with <code style="color:chartreuse;">-O3</code>?
</p>
 
```nasm
; f(float)
public _Z1ff
_Z1ff proc near
var_4 = dword ptr -4
arg_0 = dword ptr 8
 
    push ebp
    mov ebp, esp
    sub esp, 4
    mov eax, [ebp+arg_0]
    or eax, 80000000h            ; set the negative sign bit
    mov edx, eax
    and eax, 807FFFFFh           ; keep only the sign and fraction in EAX
    shr edx, 23                  ; prepare the exponent (shift away the fraction)
    add edx, 2                   ; add 2 to the exponent
    movzx edx, dl                ; clear all bits except 7:0 in EDX
    shl edx, 23                  ; shift the new exponent into its position
    or eax, edx                  ; merge the new exponent with the value without exponent
    mov [ebp+var_4], eax         ; store the result
    fld [ebp+var_4]              ; load the result float to return it
    leave
    retn
_Z1ff endp
 
public main
main proc near
    push ebp
    mov ebp, esp
    and esp, 0FFFFFFF0h          ; align stack to 16 bytes
    sub esp, 10h
    fld ds:dword_8048614         ; load precomputed result: -4.936
    fstp qword ptr [esp+8]       ; store as double for printf
    mov dword ptr [esp+4], offset asc_8048610  ; "%f\n"
    mov dword ptr [esp], 1
    call ___printf_chk           ; call printf
    xor eax, eax                 ; return 0
    leave
    retn
main endp
```
 
<p>
The function <code style="color:chartreuse;">f()</code> is fairly understandable. But the interesting thing is that GCC was able to compute the result of <code style="color:chartreuse;">f(1.234)</code> at compile time despite all this manipulation of struct fields, and prepared this argument for <code style="color:chartreuse;">printf()</code> as a precomputed value at compile time!
</p>
 
<hr>
 
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.31 The classic struct bug</b></h1>
<hr>
 
<p>
Up to this point everything is fine.
</p>
<p>
Now you add a third field to the struct, somewhere between the two fields:
</p>
 
```c
struct test
{
    int field1;
    int inserted;  // newly added field between field1 and field2
    int field2;
};
```
 
<p>
And you most likely update the <code style="color:chartreuse;">setter()</code> function, but forget the <code style="color:chartreuse;">printer()</code> function:
</p>
 
```c
void setter(struct test *t, int a, int b, int c)
{
    t->field1   = a; // write to offset +0
    t->inserted = b; // write to offset +4 (newly inserted field)
    t->field2   = c; // write to offset +8
}
```
 
<p>
You compile your project, but the C file containing <code style="color:chartreuse;">printer()</code> does not get recompiled, because your IDE or build system does not know that this module depends on the <code style="color:chartreuse;">test</code> struct definition. Perhaps because <code style="color:chartreuse;">#include &lt;new.h&gt;</code> is not present. Or perhaps <code style="color:chartreuse;">new.h</code> is included in <code style="color:chartreuse;">printer.c</code> through another header file. So the object file remains unchanged (the IDE thinks it does not need to be recompiled), while <code style="color:chartreuse;">setter()</code> has become a new version. These two object files (the old and the new) eventually get linked into a single executable.
</p>
<p>
Then you run the program, and <code style="color:chartreuse;">setter()</code> sets 3 fields at offsets <code style="color:chartreuse;">+0</code>, <code style="color:chartreuse;">+4</code>, and <code style="color:chartreuse;">+8</code>. But <code style="color:chartreuse;">printer()</code> only knows about two fields, and reads them from offsets <code style="color:chartreuse;">+0</code> and <code style="color:chartreuse;">+4</code> when printing.
</p>
<p>
This leads to very obscure and nasty bugs. The reason is that the IDE or the build system or the Makefile does not know that both C files (or modules) depend on the header file containing the <code style="color:chartreuse;">test</code> struct definition. The common fix is to clean everything and recompile.
</p>
<p>
This applies to C++ classes as well, because they work exactly like structs.
</p>
<p>
This is one of the diseases of C/C++, and a source of criticism, yes. Many newer programming languages have better support for modules and interfaces. But keep in mind, when the C compiler was created: in the seventies, on old PDP machines. So everything was simplified to this degree by the creators of the C language.
</p>
 

</div>