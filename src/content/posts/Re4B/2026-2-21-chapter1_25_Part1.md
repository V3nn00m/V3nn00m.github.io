---
title: "CH1.23 - Floating-Point Unit (Part 1)"
published: 2026-02-21
description: "Understanding how the floating-point unit works in x86/x64 and how compilers handle float and double operations in assembly"
author: "0xV3n0m"
category: "Re4B"
tags: ["Reverse Engineering", "Books", "Assembly"]
image: "/assets/img/reversee25.jpg"
draft: false
lang: "eng"

# Series configuration
type: "course"
series: "re4b"
seriesOrder: 25
seriesTitle: "Reverse Engineering for Beginners"
seriesDescription: "A beginner-friendly book covering x86/x64 reverse engineering through real compiler output and code patterns."
seriesImage: "/assets/img/RE4B.png"
---
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<div style="line-height:1.9; font-size:21px; direction:ltr;">
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.25 Floating-point unit</b></h1>
<img src="/assets/img/Floatingpointunit.jpg" alt="Floatingpointunit" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>


<p>
The author started explaining that the <b style="color:cornflowerblue;">FPU</b> is a part inside the main CPU, specialized in dealing with floating point numbers.
</p>
<p>
In the old days it was called "coprocessor" and it was somewhat separate from the main processor.
</p>

<hr>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.25.1 IEEE 754</b></h1>

<p>
A number in IEEE 754 format consists of:
</p>
<p>* a sign</p>
<p>* a fractional part (significand or fraction)</p>
<p>* an exponent</p>

<hr>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.25.2 x86</b></h1>

<p>
The author said it is important to look into the idea of <b style="color:cornflowerblue;">stack machines</b> or learn the basics of the <b style="color:cornflowerblue;">Forth</b> language before studying the FPU in x86.
</p>
<p>
An interesting thing is that in the old days (before the 80486 processor) the coprocessor was a separate chip, and was not always installed on the motherboard. It was possible to buy it separately and install it. Starting from the <b style="color:cornflowerblue;">80486 DX</b> processor, the FPU became integrated inside the CPU itself.
</p>
<p>
The <code style="color:chartreuse;">FWAIT</code> instruction reminds us of this fact — it puts the CPU in a wait state until the FPU finishes its work.
</p>
<p>
There are also remnants from that era, which is that FPU instructions start with what are called "escape opcodes" (D8..DF), meaning opcodes that used to be sent to a separate coprocessor.
</p>
<p>
The FPU has a Stack that can hold 8 registers, each one 80-bit.
</p>
<p>
And these registers are named:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Text" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
ST(0) .. ST(7)
</code>
  </pre>
</div>

<p>
And for simplicity, IDA and OllyDbg display <code style="color:chartreuse;">ST(0)</code> by the name:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Text" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
ST
</code>
  </pre>
</div>

<p>
And this is called in books: <b style="color:cornflowerblue;">Stack Top</b>
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>1.25.3 ARM, MIPS, x86/x64 SIMD</b></h2>

<p>
In ARM and MIPS the FPU is not a Stack. It is a set of registers we can access any one of them directly, just like the GPR exactly. The same idea is present in the SIMD extensions of x86/x64.
</p>

<hr>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.25.4 C/C++</b></h1>

<p>
The C and C++ languages provide at least two floating types:
</p>
<p>* <code style="color:chartreuse;">float</code> → single precision (32-bit)</p>
<p>* <code style="color:chartreuse;">double</code> → double precision (64-bit)</p>
<p>
And it is known that:
</p>
<p>* single-precision means the number is stored in a single 32-bit word</p>
<p>* double-precision means it is stored in two words (64-bit)</p>
<p>
GCC also supports the type:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="C" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
long double
</code>
  </pre>
</div>

<p>
With extended precision (80-bit), but MSVC does not support it.
</p>
<p>
The <code style="color:chartreuse;">float</code> type takes the same number of bits as <code style="color:chartreuse;">int</code> in a 32-bit environment, but the representation of the number is completely different.
</p>

<hr>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.25.5 Simple example</b></h1>

<p>
Let's look at this simple example:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="C" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
#include &lt;stdio.h&gt; // include standard I/O header

double f (double a, double b) // define function f taking two double parameters
{
    return a/3.14 + b*4.1; // divide a by 3.14, multiply b by 4.1, return their sum
};

int main() // program entry point
{
    printf (&quot;%f\n&quot;, f(1.2, 3.4)); // call f with 1.2 and 3.4, print result as float
};
</code>
  </pre>
</div>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">x86</h2>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">MSVC</h3>

<p>
Let's compile it in MSVC 2010:
</p>
<p>
Listing 1.207: MSVC 2010: f()
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
CONST SEGMENT
__real@4010666666666666 DQ 04010666666666666r ; 4.1 ; constant 4.1 stored as IEEE 754 64-bit
CONST ENDS

CONST SEGMENT
__real@40091eb851eb851f DQ 040091eb851eb851fr ; 3.14 ; constant 3.14 stored as IEEE 754 64-bit
CONST ENDS

_TEXT SEGMENT

_a$ = 8  ; size = 8 ; parameter a offset on stack
_b$ = 16 ; size = 8 ; parameter b offset on stack

_f PROC
    push ebp                                    ; save base pointer
    mov  ebp, esp                               ; set up stack frame

    fld  QWORD PTR _a$[ebp]                     ; load a (8 bytes) from stack into ST(0)
    ; current stack state: ST(0) = _a

    fdiv QWORD PTR __real@40091eb851eb851f      ; divide ST(0) by 3.14
    ; current stack state:
    ; ST(0) = result of _a divided by 3.14

    fld  QWORD PTR _b$[ebp]                     ; load b (8 bytes) from stack, push onto FPU stack
    ; current stack state:
    ; ST(0) = _b
    ; ST(1) = result of _a divided by 3.14

    fmul QWORD PTR __real@4010666666666666      ; multiply ST(0) by 4.1
    ; current stack state:
    ; ST(0) = result of _b * 4.1
    ; ST(1) = result of _a divided by 3.14

    faddp ST(1), ST(0)                          ; add ST(0) and ST(1), pop ST(0), result stays in ST(0)
    ; current stack state:
    ; ST(0) = result of addition

    pop ebp                                     ; restore base pointer
    ret 0                                       ; return (result is in ST(0))
_f ENDP
</code>
  </pre>
</div>

<p>
The <code style="color:chartreuse;">FLD</code> instruction takes 8 bytes from the stack and loads the number into register <code style="color:chartreuse;">ST(0)</code>, and it is automatically converted to the internal 80-bit format (extended precision).
</p>
<p>
The <code style="color:chartreuse;">FDIV</code> instruction divides the value in <code style="color:chartreuse;">ST(0)</code> by the number stored at the address:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Text" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
__real@40091eb851eb851f
</code>
  </pre>
</div>

<p>
And that is the number 3.14 stored in IEEE 754 64-bit format. Because assembly does not support writing floating numbers directly, we are seeing the hex representation.
</p>
<p>
After executing <code style="color:chartreuse;">FDIV</code>, <code style="color:chartreuse;">ST(0)</code> contains the result of the division.
</p>
<p>
By the way, there is an instruction called <code style="color:chartreuse;">FDIVP</code> that divides <code style="color:chartreuse;">ST(1)</code> by <code style="color:chartreuse;">ST(0)</code>, pops both values from the stack, and puts the result in their place. If you know the Forth language you will quickly understand that this is a Stack Machine.
</p>
<hr>
<p>
After that the <code style="color:chartreuse;">FLD</code> instruction adds the value of <code style="color:chartreuse;">b</code> onto the stack.
</p>
<p>
As a result:
</p>
<p>* <code style="color:chartreuse;">ST(0)</code> = b</p>
<p>* <code style="color:chartreuse;">ST(1)</code> = result of <code style="color:chartreuse;">a/3.14</code></p>
<hr>
<p>
After that the <code style="color:chartreuse;">FMUL</code> instruction multiplies <code style="color:chartreuse;">b</code> (which is in ST(0)) by the number stored at:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Text" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
__real@4010666666666666
</code>
  </pre>
</div>

<p>
Which is 4.1. And the result is stored in <code style="color:chartreuse;">ST(0)</code>.
</p>
<hr>
<p>
The last instruction <code style="color:chartreuse;">FADDP</code> adds the two values on top of the stack:
</p>
<p>* The result is placed in <code style="color:chartreuse;">ST(1)</code></p>
<p>* Then <code style="color:chartreuse;">ST(0)</code> is popped</p>
<p>
So the final result remains in:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Text" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
ST(0)
</code>
  </pre>
</div>

<p>
The function must return the result in <code style="color:chartreuse;">ST(0)</code> because that is the calling convention in x86 for floating point. And that is why there are no other instructions besides the function epilogue after <code style="color:chartreuse;">FADDP</code>.
</p>
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">MSVC + OllyDbg</h3>

<p>
We will do this also on x32dbg and we will compile it this way:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="shell" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
cl /arch:IA32 /fp:precise /Od test.c
</code>
  </pre>
</div>

<p>
And then we will run the exe on x32dbg.
</p>
<img src="/assets/x32dbg2/9_1.png" alt="9_1" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<p>
Two pairs of 32-bit words highlighted in red in the stack. Each pair is a double number in IEEE 754 format, and they were sent from <code style="color:chartreuse;">main()</code>.
</p>
<p>
We are seeing how the first <code style="color:chartreuse;">FLD</code> instruction loaded the value (1.2) from the stack and placed it in <code style="color:chartreuse;">ST(0)</code>:
</p>
<img src="/assets/x32dbg2/9_2.png" alt="9_2" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<p>
Due to unavoidable conversion errors from 64-bit IEEE 754 to 80-bit (which the FPU uses internally), we are seeing <b style="color:cornflowerblue;">1.1999…</b> which is close to 1.2.
</p>
<p>
Now <code style="color:chartreuse;">EIP</code> is pointing to the next instruction (<code style="color:chartreuse;">FDIV</code>), which loads a double (constant) number from memory.
</p>
<p>
The FDIV instruction was executed, and now <code style="color:chartreuse;">ST(0)</code> contains <b style="color:cornflowerblue;">0.382…</b> (the result of the division):
</p>
<img src="/assets/x32dbg2/9_3.png" alt="9_3" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<p>
The next <code style="color:chartreuse;">FLD</code> instruction was executed, and loaded 3.4 into <code style="color:chartreuse;">ST(0)</code> (here we see the approximate value <b style="color:cornflowerblue;">3.39999…</b>):
</p>
<img src="/assets/x32dbg2/9_4.png" alt="9_4" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<p>
At the same time, the result of the division was pushed into <code style="color:chartreuse;">ST(1)</code>. Now <code style="color:chartreuse;">EIP</code> is pointing to the next instruction: <code style="color:chartreuse;">FMUL</code>. It loads the constant 4.1 from memory.
</p>
<p>
After that: the FMUL instruction was executed, so the result of the multiplication is now in <code style="color:chartreuse;">ST(0)</code>.
</p>
<img src="/assets/x32dbg2/9_5.png" alt="9_5" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
After that: the FADDP instruction was executed, and now the result of the addition is in <code style="color:chartreuse;">ST(0)</code> and <code style="color:chartreuse;">ST(1)</code> was cleared:
</p>
<img src="/assets/x32dbg2/9_6.png" alt="9_6" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<p>
The result remained in <code style="color:chartreuse;">ST(0)</code>, because the function returns its value in <code style="color:chartreuse;">ST(0)</code>. <code style="color:chartreuse;">main()</code> then takes this value from the register.
</p>
<p>
We also see something slightly strange: the value <b style="color:cornflowerblue;">13.93…</b> is now present in <code style="color:chartreuse;">ST(7)</code>. Why?
</p>
<p>
As we read earlier in the book, the FPU registers are a Stack. But that is a simplification. Imagine if it were implemented literally in hardware that way, the contents of the 7 registers would have to be moved or copied every time a push or pop happens — and that is a lot of work.
</p>
<p>
In reality, the FPU has only 8 registers and a pointer called <code style="color:chartreuse;">TOP</code> that contains the number of the register which is the current "top of the stack".
</p>
<p>
When a value is pushed, <code style="color:chartreuse;">TOP</code> moves to the next available register, and then the value is written there.
</p>
<p>
When a pop happens, the operation is done in reverse, but the register that was cleared is not zeroed out (it could be zeroed, but that is extra work and reduces performance).
</p>
<p>
And that is why this is what we are seeing here.
</p>
<p>
We could say that <code style="color:chartreuse;">FADDP</code> stored the sum in the stack and then popped an element. But in reality, the instruction stored the result and then moved the <code style="color:chartreuse;">TOP</code> pointer.
</p>
<p>
And to be more precise, the FPU registers are a <b style="color:cornflowerblue;">circular buffer</b>.
</p>
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">GCC</h3>

<p>
GCC 4.4.1 (with the <code style="color:chartreuse;">-O3</code> option) produces almost the same code, but with a small difference:
</p>
<p>
Listing 1.208: Optimizing GCC 4.4.1
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
public f
f proc near

arg_0 = qword ptr 8  ; first argument (a) offset on stack
arg_8 = qword ptr 10h ; second argument (b) offset on stack

    push ebp                        ; save base pointer

    fld  ds:dbl_8048608             ; load constant 3.14 into ST(0)
    ; stack state now: ST(0) = 3.14

    mov  ebp, esp                   ; set up stack frame

    fdivr [ebp+arg_0]               ; reverse divide: ST(0) = arg_0 / ST(0)  (a / 3.14)
    ; stack state now: ST(0) = result of division

    fld  ds:dbl_8048610             ; load constant 4.1, push onto FPU stack
    ; stack state now:
    ; ST(0) = 4.1
    ; ST(1) = result of division

    fmul [ebp+arg_8]                ; multiply ST(0) by b (arg_8)
    ; stack state now:
    ; ST(0) = result of multiplication
    ; ST(1) = result of division

    pop ebp                         ; restore base pointer

    faddp st(1), st                 ; add ST(0) and ST(1), pop ST(0), result in ST(0)
    ; stack state now: ST(0) = result of addition

    retn                            ; return (result is in ST(0))
f endp
</code>
  </pre>
</div>

<p>
The difference is that first 3.14 is placed on the stack (in ST(0)), and then the value of <code style="color:chartreuse;">arg_0</code> is divided by the value in ST(0). <code style="color:chartreuse;">FDIVR</code> means <b style="color:cornflowerblue;">Reverse Divide</b> — meaning it divides with the dividend and divisor swapped.
</p>
<p>
There is no similar instruction for multiplication, because multiplication is a commutative operation, so we use <code style="color:chartreuse;">FMUL</code> normally without an -R version.
</p>
<p>
<code style="color:chartreuse;">FADDP</code> adds the two values and also pops one of them. After this operation, <code style="color:chartreuse;">ST(0)</code> contains the sum.
</p>

<hr>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM: Optimizing Xcode 4.6.3 (LLVM) (ARM mode)</h3>

<p>
The author mentioned that before ARM unified its floating point support, many companies used to add their own custom extensions. Then VFP (Vector Floating Point) became standard.
</p>
<p>
An important difference from x86 is that in ARM there is no stack, you work with registers directly.
</p>
<p>
Listing 1.209: Optimizing Xcode 4.6.3 (LLVM) (ARM mode)
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
f
    VLDR D16, =3.14          ; load constant 3.14 into D16
    VMOV D17, R0, R1         ; load &quot;a&quot; from R0:R1 pair into D17
    VMOV D18, R2, R3         ; load &quot;b&quot; from R2:R3 pair into D18

    VDIV.F64 D16, D17, D16   ; D16 = D17 / D16  (a / 3.14)

    VLDR D17, =4.1           ; load constant 4.1 into D17
    VMUL.F64 D17, D18, D17   ; D17 = D18 * D17  (b * 4.1)

    VADD.F64 D16, D17, D16   ; D16 = D17 + D16  (b*4.1 + a/3.14)

    VMOV R0, R1, D16         ; move result from D16 into R0:R1 pair for return
    BX LR                    ; return

dbl_2C98 DCFD 3.14           ; constant 3.14 stored in memory
dbl_2CA0 DCFD 4.1            ; constant 4.1 stored in memory
</code>
  </pre>
</div>

<p>
We are seeing new registers with the letter D. These are 64-bit registers, and there are 32 of them. They can be used for double, and also for SIMD (NEON). There are also 32 S registers (32-bit) for float.
</p>
<p>
Easy to remember:
</p>
<p>* <b style="color:cornflowerblue;">D = Double</b></p>
<p>* <b style="color:cornflowerblue;">S = Single</b></p>
<p>
The constants 3.14 and 4.1 are stored in memory in IEEE 754 format. <code style="color:chartreuse;">VLDR</code> and <code style="color:chartreuse;">VMOV</code> are like <code style="color:chartreuse;">LDR</code> and <code style="color:chartreuse;">MOV</code> but they work on D-registers.
</p>
<p>
Functions receive arguments in R-registers, but each double is 64-bit, so it needs two registers.
</p>
<p>
<code style="color:chartreuse;">VMOV D17, R0, R1</code> combines R0 and R1 into 64-bit and places them in D17. And the reverse is true when returning.
</p>
<p>
<code style="color:chartreuse;">VDIV</code>, <code style="color:chartreuse;">VMUL</code>, <code style="color:chartreuse;">VADD</code> are floating point instructions for division, multiplication and addition.
</p>

<hr>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM (Thumb mode – without FPU)</h3>

<p>
Keil here generated code for a processor that has no FPU or NEON:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
BL __aeabi_dmul  ; call library function to emulate double multiplication
BL __aeabi_ddiv  ; call library function to emulate double division
BL __aeabi_dadd  ; call library function to emulate double addition
</code>
  </pre>
</div>

<p>
Instead of using FPU instructions, it calls library functions that emulate these operations. This is called:
</p>
<p>* <b style="color:cornflowerblue;">soft float / armel</b> (emulation)</p>
<p>* <b style="color:cornflowerblue;">hard float / armhf</b> (using a real FPU)</p>

<hr>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM64: Optimizing GCC (Linaro) 4.9</h3>

<p>
Very concise code:
</p>
<p>
Listing 1.210
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
f:
    ; D0 = a, D1 = b

    ldr d2, .LC25        ; load constant 3.14 into D2
    fdiv d0, d0, d2      ; D0 = D0 / D2  (a / 3.14)

    ldr d2, .LC26        ; load constant 4.1 into D2
    fmadd d0, d1, d2, d0 ; D0 = D1*D2 + D0  (b*4.1 + a/3.14) in one instruction

    ret                  ; return (result in D0)
</code>
  </pre>
</div>

<p>
<code style="color:chartreuse;">FMADD</code> does:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Text" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
D0 = D1*D2 + D0
</code>
  </pre>
</div>

<p>
In a single instruction.
</p>

<hr>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM64: Non-optimizing GCC</h3>

<p>
The code is much longer, with many value transfers between registers and memory, and there are <code style="color:chartreuse;">FMOV</code> instructions that are clearly redundant. It is obvious that GCC 4.9 at that time was not yet strong in generating ARM64 code.
</p>
<p>
An important point: ARM64 registers are 64-bit, so it is possible to store a double directly in a GPR, and this is not possible in a 32-bit CPU.
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>1.25.6 Passing floating point numbers via arguments</b></h2>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="C" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
#include &lt;math.h&gt;   // include math header for pow()
#include &lt;stdio.h&gt;  // include standard I/O header

int main () // program entry point
{
    printf (&quot;32.01 ^ 1.54 = %lf\n&quot;, pow (32.01,1.54)); // compute 32.01 raised to power 1.54 and print result
    return 0; // return 0 to indicate successful termination
}
</code>
  </pre>
</div>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">x86</h2>

<p>
Let's see what came out in (MSVC 2010):
</p>
<p>
Listing 1.212: MSVC 2010
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
CONST SEGMENT
__real@40400147ae147ae1 DQ 040400147ae147ae1r ; 32.01 ; constant 32.01 stored as IEEE 754 64-bit
__real@3ff8a3d70a3d70a4 DQ 03ff8a3d70a3d70a4r ; 1.54  ; constant 1.54 stored as IEEE 754 64-bit
CONST ENDS

_main PROC
    push ebp                                   ; save base pointer
    mov  ebp, esp                              ; set up stack frame

    sub  esp, 8                                ; allocate 8 bytes on stack for second argument
    fld  QWORD PTR __real@3ff8a3d70a3d70a4     ; load 1.54 into ST(0)
    fstp QWORD PTR [esp]                       ; store ST(0) (1.54) onto stack, pop FPU stack

    sub  esp, 8                                ; allocate 8 bytes on stack for first argument
    fld  QWORD PTR __real@40400147ae147ae1     ; load 32.01 into ST(0)
    fstp QWORD PTR [esp]                       ; store ST(0) (32.01) onto stack, pop FPU stack

    call _pow                                  ; call pow(32.01, 1.54)

    add  esp, 8                                ; clean up one argument from stack
    ; result is in ST(0)

    fstp QWORD PTR [esp]                       ; store result (double) onto stack for printf
    push OFFSET $SG2651                        ; push format string address
    call _printf                               ; call printf

    add  esp, 12                               ; clean up stack (format string + double)
    xor  eax, eax                              ; set return value to 0
    pop  ebp                                   ; restore base pointer
    ret  0                                     ; return
_main ENDP
</code>
  </pre>
</div>

<p>
<code style="color:chartreuse;">FLD</code> and <code style="color:chartreuse;">FSTP</code> transfer values between the data segment and the FPU stack. <code style="color:chartreuse;">pow()</code> takes the two values from the stack and returns the result in <code style="color:chartreuse;">ST(0)</code>. <code style="color:chartreuse;">printf()</code> takes 8 bytes from the local stack and interprets them as a double.
</p>
<p>
By the way, it was possible to use a pair of <code style="color:chartreuse;">MOV</code> instructions instead of <code style="color:chartreuse;">FLD/FSTP</code>, because the values in memory are already in IEEE 754 format, and <code style="color:chartreuse;">pow()</code> also takes them in the same format, so no conversion is needed.
</p>

<hr>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM + Non-optimizing Xcode 4.6.3 (Thumb-2)</h3>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
_main
    PUSH {R7,LR}              ; save R7 and link register
    MOV  R7, SP               ; set frame pointer
    SUB  SP, SP, #4           ; allocate stack space

    VLDR D16, =32.01          ; load constant 32.01 into D16
    VMOV R0, R1, D16          ; move D16 into R0:R1 pair (first argument to pow)

    VLDR D16, =1.54           ; load constant 1.54 into D16
    VMOV R2, R3, D16          ; move D16 into R2:R3 pair (second argument to pow)

    BLX _pow                  ; call pow(32.01, 1.54)

    VMOV D16, R0, R1          ; move result from R0:R1 back into D16

    MOV  R0, 0xFC1            ; load format string offset
    ADD  R0, PC               ; calculate absolute address of format string
    VMOV R1, R2, D16          ; move result into R1:R2 pair for printf
    BLX _printf               ; call printf

    MOVS R1, 0                ; set return value to 0
    MOV  R0, R1               ; move 0 into R0

    ADD  SP, SP, #4           ; deallocate stack space
    POP  {R7,PC}              ; restore and return

dbl_2F90 DCFD 32.01           ; constant 32.01 stored in memory
dbl_2F98 DCFD 1.54            ; constant 1.54 stored in memory
</code>
  </pre>
</div>

<p>
As said before, double numbers (64-bit) are passed in pairs of R-registers. <code style="color:chartreuse;">_pow</code> takes:
</p>
<p>* the first argument in R0 and R1</p>
<p>* the second in R2 and R3</p>
<p>
And returns the result in R0 and R1. The result is moved to D16 and then to R1 and R2 so that <code style="color:chartreuse;">printf()</code> can take it. The code has some redundancy because optimization is disabled.
</p>

<hr>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM + Non-optimizing Keil (ARM mode)</h3>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
_main
    STMFD SP!, {R4-R6,LR}        ; save registers and link register on stack

    LDR R2, =0xA3D70A4           ; load low 32 bits of 1.54 (IEEE 754)
    LDR R3, =0x3FF8A3D7          ; load high 32 bits of 1.54

    LDR R0, =0xAE147AE1          ; load low 32 bits of 32.01 (IEEE 754)
    LDR R1, =0x40400147          ; load high 32 bits of 32.01

    BL pow                       ; call pow(32.01, 1.54); R0:R1 = first arg, R2:R3 = second arg

    MOV R4, R0                   ; save low 32 bits of result
    MOV R2, R4                   ; move low bits to R2 for printf
    MOV R3, R1                   ; move high bits to R3 for printf

    ADR R0, a32_011_54Lf         ; load address of format string
    BL __2printf                 ; call printf

    MOV R0, #0                   ; set return value to 0
    LDMFD SP!, {R4-R6,PC}        ; restore registers and return
</code>
  </pre>
</div>

<p>
Here there is no use of D-registers, but pairs of R-registers.
</p>

<hr>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM64 + Optimizing GCC (Linaro) 4.9</h3>

<p>
Listing 1.213
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
f:
    stp x29, x30, [sp, -16]!     ; save frame pointer and link register on stack
    add x29, sp, 0               ; set frame pointer

    ldr d1, .LC1                 ; load constant 1.54 into D1 (second argument to pow)
    ldr d0, .LC0                 ; load constant 32.01 into D0 (first argument to pow)

    bl  pow                      ; call pow(32.01, 1.54); result returned in D0
    ; result is in D0

    adrp x0, .LC2                ; load page address of format string
    add  x0, x0, :lo12:.LC2     ; add page offset to get full address
    bl   printf                  ; call printf(format, D0); D0 passed directly

    mov  w0, 0                   ; set return value to 0
    ldp  x29, x30, [sp], 16     ; restore frame pointer and link register
    ret                          ; return

.LC0:
    .word -1374389535            ; low 32 bits of 32.01 (IEEE 754)
    .word 1077936455             ; high 32 bits of 32.01

.LC1:
    .word 171798692              ; low 32 bits of 1.54 (IEEE 754)
    .word 1073259479             ; high 32 bits of 1.54

.LC2:
    .string &quot;32.01 ^ 1.54 = %lf\n&quot; ; format string for printf
</code>
  </pre>
</div>

<p>
The constants are loaded into <code style="color:chartreuse;">D0</code> and <code style="color:chartreuse;">D1</code>. <code style="color:chartreuse;">pow()</code> takes them from there. The result returns in <code style="color:chartreuse;">D0</code>. And it is passed to <code style="color:chartreuse;">printf()</code> without any modification, because:
</p>
<p>* <b style="color:cornflowerblue;">Integers and pointers</b> are passed in X-registers</p>
<p>* <b style="color:cornflowerblue;">Floating point numbers</b> are passed in D-registers</p>
</div>