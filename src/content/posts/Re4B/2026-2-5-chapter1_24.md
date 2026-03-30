---
title: "CH1.22 - Replacing Arithmetic Instructions to Other Ones"
published: 2026-02-05
description: "Exploring how compilers replace expensive arithmetic operations with cheaper equivalents and the optimization tricks used in x86/x64 assembly"
author: "0xV3n0m"
category: "Re4B"
tags: ["Reverse Engineering", "Books", "Assembly"]
image: "/assets/img/reversee24.jpg"
draft: false
lang: "eng"

# Series configuration
type: "course"
series: "re4b"
seriesOrder: 24
seriesTitle: "Reverse Engineering for Beginners"
seriesDescription: "A beginner-friendly book covering x86/x64 reverse engineering through real compiler output and code patterns."
seriesImage: "/assets/img/RE4B.png"
---
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<div style="line-height:1.9; font-size:21px; direction:ltr;">
<hr>
<p>
For the sake of optimization, an instruction can be replaced with another instruction, or even with a group of instructions.
</p>
<p>
For example, <code style="color: chartreuse;">ADD</code> and <code style="color: chartreuse;">SUB</code> can replace each other.
</p>
<p>
Also, the <code style="color: chartreuse;">LEA</code> instruction is often used for simple arithmetic calculations.
</p>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.24.1 Multiplication</b></h1>
<img src="/assets/img/muultiplication.jpg" alt="1.24.1 Multiplication" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">Multiplication using addition</h3>

<p>
A simple example:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="C" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
unsigned int f(unsigned int a)
{
    return a*8;
};
</code>
  </pre>
</div>

<p>
Multiplication by 8 was replaced with 3 addition instructions, which do the same thing.
</p>
<p>
It is obvious that the MSVC optimizer decided that this code could be faster.
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
_TEXT SEGMENT
_a$ = 8                                  ; size = 4
_f PROC
    mov     eax, DWORD PTR _a$[esp-4]    ; load a into EAX
    add     eax, eax                     ; EAX = EAX + EAX = a*2
    add     eax, eax                     ; EAX = EAX + EAX = a*4
    add     eax, eax                     ; EAX = EAX + EAX = a*8
    ret     0
_f ENDP
_TEXT ENDS
END
</code>
  </pre>
</div>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">Multiplication using shifting</h3>

<p>
Multiplication and division instructions by numbers that are powers of 2 are often replaced with shift instructions.
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="C" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
unsigned int f(unsigned int a)
{
    return a*4;
};
</code>
  </pre>
</div>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
_a$ = 8                                  ; size = 4
_f PROC
    push    ebp
    mov     ebp, esp
    mov     eax, DWORD PTR _a$[ebp]      ; load a
    shl     eax, 2                       ; shift left by 2 bits = multiply by 4
    pop     ebp
    ret     0
_f ENDP
</code>
  </pre>
</div>

<p>
The instruction named <code style="color: chartreuse;">SHL</code> is an abbreviation for SHift Left.
</p>
<p>
Multiplication by 4 is just shifting the number left by 2 bits and adding two zero bits on the right (as the least significant bits).
</p>
<p>
This is like multiplying 3 by 100 — we simply add two zeros on the right.
</p>
<p>
This is how the shift left instruction works:
</p>
<img src="/assets/x32dbg2/shl1.png" alt="Shift left example" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<p>
The bits added on the right are always zeros.
</p>
<p>
To make it clearer in case you got confused:
</p>
<p>
Let us say:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="C" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
a = 3
</code>
  </pre>
</div>

<p>
3 in binary:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Text" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
3 = 00000011
</code>
  </pre>
</div>

<p>
If we do:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
shl eax, 2
</code>
  </pre>
</div>

<p>
Meaning shift left twice:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Text" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
00000011 &lt;&lt; 2 = 00001100
</code>
  </pre>
</div>

<p>
The result 00001100 in decimal = 12
</p>
<p>
Which is indeed: 3 * 4 = 12
</p>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">Multiplication by 4 on ARM</h3>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
f PROC
    LSL r0, r0, #2                       ; shift left by 2 bits = multiply by 4
    BX  lr
ENDP
</code>
  </pre>
</div>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">Multiplication by 4 on MIPS</h3>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
jr      $ra
    sll     $v0, $a0, 2                  ; shift left by 2 = multiply by 4 (delay slot)
</code>
  </pre>
</div>

<p>
<code style="color: chartreuse;">SLL</code> means "Shift Left Logical".
</p>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">Multiplication using shifting, subtracting, and adding</h3>

<p>
It is still possible to get rid of multiplication when multiplying by numbers like 7 or 17, also using shifting. The math used here is relatively simple.
</p>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">32-bit</h3>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="C" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
#include &lt;stdint.h&gt;

int f1(int a)
{
    return a*7;
};

int f2(int a)
{
    return a*28;
};

int f3(int a)
{
    return a*17;
};
</code>
  </pre>
</div>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">x86</h3>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
; a*7
_a$ = 8
_f1 PROC
    mov     ecx, DWORD PTR _a$[esp-4]    ; ECX = a
    lea     eax, DWORD PTR [ecx*8]       ; EAX = ECX*8 = a*8
    sub     eax, ecx                     ; EAX = EAX - ECX = a*8 - a = a*7
    ret     0
_f1 ENDP

; a*17
_a$ = 8
_f3 PROC
    mov     eax, DWORD PTR _a$[esp-4]    ; EAX = a
    shl     eax, 4                       ; EAX = EAX &lt;&lt; 4 = a*16
    add     eax, DWORD PTR _a$[esp-4]    ; EAX = EAX + a = a*16 + a = a*17
    ret     0
_f3 ENDP
</code>
  </pre>
</div>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">ARM</h3>

<p>
Keil in ARM mode exploits the second operand shift modifiers:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
; a*7
||f1|| PROC
    RSB     r0, r0, r0, LSL #3           ; R0 = (R0 &lt;&lt; 3) - R0 = a*8 - a = a*7
    BX      lr
ENDP

; a*28
||f2|| PROC
    RSB     r0, r0, r0, LSL #3           ; R0 = (R0 &lt;&lt; 3) - R0 = a*8 - a = a*7
    LSL     r0, r0, #2                   ; R0 = R0 &lt;&lt; 2 = a*7 * 4 = a*28
    BX      lr
ENDP

; a*17
||f3|| PROC
    ADD     r0, r0, r0, LSL #4           ; R0 = R0 + (R0 &lt;&lt; 4) = a + a*16 = a*17
    BX      lr
ENDP
</code>
  </pre>
</div>

<p>
But there are no such modifiers in Thumb mode. It also cannot optimize f2():
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
; a*7
||f1|| PROC
    LSLS    r1, r0, #3                   ; R1 = R0 &lt;&lt; 3 = a*8
    SUBS    r0, r1, r0                    ; R0 = R1 - R0 = a*8 - a = a*7
    BX      lr
ENDP

; a*28
||f2|| PROC
    MOVS    r1, #0x1c                    ; R1 = 28
    MULS    r0, r1, r0                   ; R0 = 28 * a
    BX      lr
ENDP

; a*17
||f3|| PROC
    LSLS    r1, r0, #4                   ; R1 = R0 &lt;&lt; 4 = a*16
    ADDS    r0, r0, r1                   ; R0 = a + a*16 = a*17
    BX      lr
ENDP
</code>
  </pre>
</div>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">MIPS</h3>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
_f1:
    sll     $v0, $a0, 3                  ; $v0 = $a0 &lt;&lt; 3 = a*8
    jr      $ra
    subu    $v0, $a0                     ; $v0 = $v0 - $a0 = a*8 - a = a*7 (delay slot)

_f2:
    sll     $v0, $a0, 5                  ; $v0 = $a0 &lt;&lt; 5 = a*32
    sll     $a0, 2                       ; $a0 = $a0 &lt;&lt; 2 = a*4
    jr      $ra
    subu    $v0, $a0                     ; $v0 = a*32 - a*4 = a*28 (delay slot)

_f3:
    sll     $v0, $a0, 4                  ; $v0 = $a0 &lt;&lt; 4 = a*16
    jr      $ra
    addu    $v0, $a0                     ; $v0 = a*16 + a = a*17 (delay slot)
</code>
  </pre>
</div>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">64-bit</h3>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="C" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
#include &lt;stdint.h&gt;

int64_t f1(int64_t a)
{
    return a*7;
};

int64_t f2(int64_t a)
{
    return a*28;
};

int64_t f3(int64_t a)
{
    return a*17;
};
</code>
  </pre>
</div>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">x64</h3>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
; a*7
f1:
    lea     rax, [0+rdi*8]               ; RAX = RDI*8 = a*8
    sub     rax, rdi                     ; RAX = RAX - RDI = a*8 - a = a*7
    ret

; a*28
f2:
    lea     rax, [0+rdi*4]               ; RAX = RDI*4 = a*4
    sal     rdi, 5                       ; RDI = RDI &lt;&lt; 5 = a*32
    sub     rdi, rax                     ; RDI = a*32 - a*4 = a*28
    mov     rax, rdi
    ret

; a*17
f3:
    mov     rax, rdi
    sal     rax, 4                       ; RAX = RAX &lt;&lt; 4 = a*16
    add     rax, rdi                     ; RAX = a*16 + a = a*17
    ret
</code>
  </pre>
</div>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">ARM64</h3>

<p>
GCC 4.9 for ARM64 is also concise, thanks to shift modifiers:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
; a*7
f1:
    lsl     x1, x0, 3                    ; X1 = X0 &lt;&lt; 3 = a*8
    sub     x0, x1, x0                   ; X0 = X1 - X0 = a*8 - a = a*7
    ret

; a*28
f2:
    lsl     x1, x0, 5                    ; X1 = X0 &lt;&lt; 5 = a*32
    sub     x0, x1, x0, lsl 2             ; X0 = X1 - (X0 &lt;&lt; 2) = a*32 - a*4 = a*28
    ret

; a*17
f3:
    add     x0, x0, x0, lsl 4            ; X0 = X0 + (X0 &lt;&lt; 4) = a + a*16 = a*17
    ret
</code>
  </pre>
</div>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">Booth’s multiplication algorithm</h3>

<p>
There was a time when computers were big and expensive to the point that some did not have hardware support for multiplication inside the CPU, like the Data General Nova.
</p>
<p>
When multiplication was needed, it could be done at the software level, for example using Booth’s multiplication algorithm.
</p>
<p>
This is a multiplication algorithm that uses only addition and shifts. What modern optimizing compilers do is not the same thing, but the goal (multiplication) and resources (faster operations) are the same.
</p>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.24.2 Division</b></h1>
<img src="/assets/img/Division.jpg" alt="arithmetic optimizations" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">Division using shifts</h3>

<p>
An example of division by 4:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="C" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
unsigned int f(unsigned int a)
{
    return a/4;
};
</code>
  </pre>
</div>

<p>
We get (MSVC 2010):
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
_a$ = 8
_f PROC
    mov     eax, DWORD PTR _a$[esp-4]
    shr     eax, 2                       ; shift right by 2 bits = divide by 4
    ret     0
_f ENDP
</code>
  </pre>
</div>

<p>
The <code style="color: chartreuse;">SHR</code> (SHift Right) instruction in this example shifts the number right by 2 bits.
</p>
<p>
The two bits that were freed on the left (most significant bits) are filled with zeros.
</p>
<p>
The two bits on the right (least significant bits) are discarded.
</p>
<p>
In fact, these two discarded bits are the division remainder.
</p>
<p>
The <code style="color: chartreuse;">SHR</code> instruction works exactly like <code style="color: chartreuse;">SHL</code>, but in the opposite direction.
</p>
<img src="/assets/x32dbg2/shl2.png" alt="Shift right example" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<p>
It is easy to understand if you imagine the number 23 in the decimal system.
</p>
<p>
23 can be easily divided by 10 by simply removing the last digit (3 — this is the remainder).
</p>
<p>
What remains after the operation is 2 as the quotient.
</p>
<p>
The remainder is discarded, but that's fine because we are working on integer values anyway, these are not real numbers!
</p>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">Division by 4 on ARM</h3>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
f PROC
    LSR     r0, r0, #2                   ; logical shift right by 2 bits = divide by 4
    BX      lr
ENDP
</code>
  </pre>
</div>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">Division by 4 on MIPS</h3>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
jr      $ra
    srl     $v0, $a0, 2                  ; shift right logical by 2 = divide by 4 (delay slot)
</code>
  </pre>
</div>

<p>
<code style="color: chartreuse;">SRL</code> means "Shift Right Logical".
</p>

</div>