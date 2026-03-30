---
title: "CH1.23 - Floating-Point Unit (Part 2)"
published: 2026-03-06
description: "Continuing the exploration of the floating-point unit covering SSE/SSE2 instructions and how compilers optimize float and double operations"
author: "0xV3n0m"
category: "Re4B"
tags: ["Reverse Engineering", "Books", "Assembly"]
image: "/assets/img/reversee26.jpg"
draft: false
lang: "eng"

# Series configuration
type: "course"
series: "re4b"
seriesOrder: 26
seriesTitle: "Reverse Engineering for Beginners"
seriesDescription: "A beginner-friendly book covering x86/x64 reverse engineering through real compiler output and code patterns."
seriesImage: "/assets/img/RE4B.png"
---
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<div style="line-height:1.9; font-size:21px; direction:ltr;">
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.25.7 Comparison example</b></h1>
<hr>

<p>
Let's try this:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="C" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
#include &lt;stdio.h&gt; // include standard I/O header

double d_max (double a, double b) // define function returning the larger of two doubles
{
    if (a&gt;b)      // check if a is greater than b
        return a; // return a if condition is true
    return b;     // otherwise return b
};

int main() // program entry point
{
    printf (&quot;%f\n&quot;, d_max (1.2, 3.4)); // print max of 1.2 and 3.4
    printf (&quot;%f\n&quot;, d_max (5.6, -4)); // print max of 5.6 and -4
};
</code>
  </pre>
</div>

<p>
Even though the function is simple, understanding it at the Assembly level will be a bit difficult.
</p>

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">x86</h2>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Non-optimizing MSVC</h3>

<p>
MSVC 2010 produces the following:
</p>
<p>
Listing 1.214: Non-optimizing MSVC 2010
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
PUBLIC _d_max

_TEXT SEGMENT

_a$ = 8  ; size = 8 ; parameter a offset on stack
_b$ = 16 ; size = 8 ; parameter b offset on stack

_d_max PROC
    push ebp                        ; save base pointer
    mov  ebp, esp                   ; set up stack frame

    fld  QWORD PTR _b$[ebp]         ; load b (8 bytes) from stack into ST(0)
    ; ST(0) = _b

    fcomp QWORD PTR _a$[ebp]        ; compare ST(0) with _a, then pop ST(0); sets C3/C2/C0 bits
    ; compare _b with _a and pop
    ; stack is empty here

    fnstsw ax                       ; copy FPU status word into AX (C3/C2/C0 bits land in AH)
    test ah, 5                      ; test bits 0 and 2 of AH (C0 and C2); 5 in binary = 00000101
    jp   SHORT $LN1@d_max           ; jump if parity flag set (means b &gt;= a or b == a)

    ; we reach here only if a &gt; b
    fld  QWORD PTR _a$[ebp]         ; load a into ST(0) to return it
    jmp  SHORT $LN2@d_max           ; jump to epilogue

$LN1@d_max:                         ; label reached when b &gt;= a
    fld  QWORD PTR _b$[ebp]         ; load b into ST(0) to return it

$LN2@d_max:                         ; function epilogue
    pop  ebp                        ; restore base pointer
    ret  0                          ; return (result is in ST(0))
_d_max ENDP
</code>
  </pre>
</div>

<p>
<code style="color:chartreuse;">FLD</code> loads <code style="color:chartreuse;">_b</code> into <code style="color:chartreuse;">ST(0)</code>.
</p>
<p>
<code style="color:chartreuse;">FCOMP</code> compares the value in <code style="color:chartreuse;">ST(0)</code> with the value of <code style="color:chartreuse;">_a</code> and sets the C3/C2/C0 bits in the <b style="color:cornflowerblue;">FPU status word register</b>. This is a 16-bit register that reflects the current state of the FPU. Also, <code style="color:chartreuse;">FCOMP</code> after the comparison pops the value from the stack. And that is the difference between it and <code style="color:chartreuse;">FCOM</code> which only compares without popping.
</p>
<p>
And I will explain to you simply why things are a bit complicated here. Processors before Intel P6 had no jump instructions that could test C3/C2/C0 directly, because back then the FPU was a separate chip.
</p>
<p>
Modern processors now have:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
FCOMI   ; compare ST(0) with ST(i) and set CPU flags directly (ZF / PF / CF)
FCOMIP  ; compare, set CPU flags, and pop ST(0)
FUCOMI  ; unordered compare and set CPU flags (handles NaN without exception)
FUCOMIP ; unordered compare, set CPU flags, and pop ST(0)
</code>
  </pre>
</div>

<p>
And these instructions modify the CPU flags directly (ZF / PF / CF).
</p>
<p>
<code style="color:chartreuse;">FNSTSW</code> copies the FPU status word into register AX. The C3/C2/C0 bits are placed at positions: 14 / 10 / 8 — meaning they all reside in the high part of AX which is AH. And so we understand AH, because AH takes bits 8 to 15, and AX is 16-bit, so they are all confined to the AH side.
</p>

<table style="width:70%; margin:auto; border-collapse:collapse; text-align:center; font-family:'Cascadia Code', monospace; background:#1e1e2e; color:#e0e0e0; border-radius:12px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.3);">
  <thead style="background:#9a3ba6; color:#fff;">
    <tr>
      <th style="padding:10px;">Condition</th>
      <th style="padding:10px;">C3</th>
      <th style="padding:10px;">C2</th>
      <th style="padding:10px;">C0</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:10px;">b &gt; a</td><td style="padding:10px;">0</td><td style="padding:10px;">0</td><td style="padding:10px;">0</td></tr>
    <tr><td style="padding:10px;">a &gt; b</td><td style="padding:10px;">0</td><td style="padding:10px;">0</td><td style="padding:10px;">1</td></tr>
    <tr><td style="padding:10px;">a = b</td><td style="padding:10px;">1</td><td style="padding:10px;">0</td><td style="padding:10px;">0</td></tr>
    <tr><td style="padding:10px;">error (NaN etc.)</td><td style="padding:10px;">1</td><td style="padding:10px;">1</td><td style="padding:10px;">1</td></tr>
  </tbody>
</table>

<p>
This is how the C3/C2/C0 bits are positioned in the AX register.
</p>
<img src="/assets/img/a_1.jpg" alt="1" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
This is how the C3/C2/C0 bits are positioned in the AH register.
</p>
<img src="/assets/img/a_2.jpg" alt="2" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
After executing the instruction:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
test ah, 5  ; AND AH with 00000101 (binary); isolates C0 (bit 0) and C2 (bit 2), ignores all others
</code>
  </pre>
</div>

<p>
Only the two bits C0 and C2 (at positions 0 and 2) are taken into consideration, and all other bits are ignored.
</p>
<p>
Now let's talk about the parity flag, which is another notable historical artifact.
</p>
<p>
The parity flag is set to 1 if the number of 1s in the result of the last arithmetic operation was even, and set to 0 if it was odd.
</p>
<p>
And the author at that point went and checked Wikipedia:
</p>
<p>
<b style="color:cornflowerblue;">A common reason to test the parity flag is actually unrelated to parity itself. The FPU has four condition flags (C0 through C3), but they cannot be tested directly and must first be copied to the flags register. When this happens, C0 is placed in the carry flag, C2 in the parity flag, and C3 in the zero flag. The C2 flag is set for example when incomparable floating point values (such as NaN or unsupported format) are compared using FUCOM instructions.</b>
</p>
<p>
As stated in Wikipedia, the parity flag is sometimes used in FPU code. Let's see how.
</p>
<p>
The PF flag is set to 1 if C0 and C2 are both 0 or both 1, and in that case the instruction <code style="color:chartreuse;">JP</code> (jump if PF==1) will execute.
</p>
<p>
If we recall the C3/C2/C0 values for the different cases, we can see that the conditional jump JP will execute in two cases:
</p>
<p>* if b &gt; a</p>
<p>* or if a = b</p>
<p>
(Because the C3 bit is not taken into consideration here, as it was zeroed out by <code style="color:chartreuse;">test ah, 5</code>).
</p>
<p>
After that the matter is simple. If the conditional jump happened, the <code style="color:chartreuse;">FLD</code> instruction will load the value of <code style="color:chartreuse;">_b</code> into <code style="color:chartreuse;">ST(0)</code>. And if the jump did not happen, the value of <code style="color:chartreuse;">_a</code> is what will be loaded there.
</p>
<p>
What about checking C2?
</p>
<p>
The C2 flag is set in case of an error (such as NaN, etc.), but our code does not check it. If the programmer cares about FPU errors, additional checks must be added.
</p>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">First OllyDbg example: a=1.2 and b=3.4</h2>

<p>
We will start by compiling the C code using this command:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="shell" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
cl /Od /Zi /arch:IA32 test.c  ; compile with no optimization, debug info, targeting IA32
</code>
  </pre>
</div>

<p>
Then we will run the exe on x32dbg, go to <code style="color:chartreuse;">symbols</code>, and select the function named <code style="color:chartreuse;">d_max</code>.
</p>
<img src="/assets/x32dbg2/fpu_1.png" alt="fpu_1" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
We will set a breakpoint at the beginning of the function, press F9 until we reach it, and then start stepping with F8.
</p>
<p>
We will start executing the first <code style="color:chartreuse;">FLD</code>:
</p>
<img src="/assets/x32dbg2/fpu_2.png" alt="fpu_2" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
The current function arguments are: a = 1.2 and b = 3.4 (we can see them in the stack: two pairs of 32-bit values). The value b (3.4) is already loaded in <code style="color:chartreuse;">ST(0)</code>. Now <code style="color:chartreuse;">FCOMP</code> is about to execute. x32dbg displays the second operand of <code style="color:chartreuse;">FCOMP</code>, which is currently on the stack.
</p>
<p>
FCOMP was executed:
</p>
<img src="/assets/x32dbg2/fpu_3.png" alt="fpu_3" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
We see the state of the FPU condition flags: all zeros.
</p>
<p>
FNSTSW was executed:
</p>
<img src="/assets/x32dbg2/fpu_4.png" alt="fpu_4" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
We see that register AX contains zeros: indeed all condition flags are zero. (OllyDbg decodes <code style="color:chartreuse;">FNSTSW</code> as <code style="color:chartreuse;">FSTSW</code> — they are synonyms).
</p>
<p>
TEST was executed:
</p>
<img src="/assets/x32dbg2/fpu_5.png" alt="fpu_5" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
The PF flag is set to 1. Indeed: the number of set bits in 0 is 0, and 0 is an even number. x32dbg decodes <code style="color:chartreuse;">JP</code> as <code style="color:chartreuse;">JPE</code> — they are synonyms. And it is about to execute now.
</p>
<p>
JPE executed, and FLD loaded the value b (3.4) into <code style="color:chartreuse;">ST(0)</code>.
</p>

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Second OllyDbg example: a=5.6 and b=-4</h2>

<p>
Let's do a second example:
</p>
<img src="/assets/x32dbg2/fpu_6.png" alt="fpu_6" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
The current function arguments are: a = 5.6 and b = −4. The value b (−4) is already loaded in <code style="color:chartreuse;">ST(0)</code>. <code style="color:chartreuse;">FCOMP</code> is about to execute now. x32dbg displays the second operand of <code style="color:chartreuse;">FCOMP</code>, which is currently on the stack.
</p>
<p>
Then we will execute FCOMP:
</p>
<img src="/assets/x32dbg2/fpu_7.png" alt="fpu_7" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
We see the state of the FPU condition flags: all zeros except C0.
</p>
<p>
Then FNSTSW will execute:
</p>
<img src="/assets/x32dbg2/fpu_8.png" alt="fpu_8" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
We see that register AX contains <b style="color:cornflowerblue;">0x100</b>: the C0 flag is present in bit number 8.
</p>
<p>
Then we will execute JP:
</p>
<img src="/assets/x32dbg2/fpu_9.png" alt="fpu_9" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
Here you will find that the PF flag is zeroed. Indeed: the number of set bits in <b style="color:cornflowerblue;">0x100</b> is 1, and 1 is an odd number.
</p>
<p>
JPE is now skipped (does not execute). And since JPE did not execute, FLD loaded the value a (5.6) into <code style="color:chartreuse;">ST(0)</code>:
</p>
<img src="/assets/x32dbg2/fpu_10.png" alt="fpu_10" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
After that the function finishes.
</p>

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing MSVC 2010</h2>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
_a$ = 8      ; size = 8 ; parameter a offset on stack
_b$ = 16     ; size = 8 ; parameter b offset on stack

_d_max PROC
    fld QWORD PTR _b$[esp-4]       ; load b into ST(0)
    fld QWORD PTR _a$[esp-4]       ; load a into ST(0), pushing b down to ST(1)

    ; current stack state:
    ; ST(0) = _a
    ; ST(1) = _b

    fcom ST(1)                     ; compare ST(0) (_a) with ST(1) (_b); sets C3/C2/C0 (no pop)
    fnstsw ax                      ; copy FPU status word into AX
    test ah, 65                    ; test C3 (bit 6) and C0 (bit 0) of AH; 65 = 01000001 binary
    jne SHORT $LN5@d_max           ; jump if not equal (b &gt; a, or a == b)

    ; a &gt; b: copy ST(0) to ST(1) and pop, leaving _a on top
    fstp ST(1)                     ; store ST(0) into ST(1) then pop; now ST(0) = _a

    ; current stack state:
    ; ST(0) = _a

    ret 0                          ; return with _a in ST(0)

$LN5@d_max:                        ; reached when b &gt; a or a == b

    ; b &gt; a: discard ST(0) (_a), leaving _b on top
    fstp ST(0)                     ; store ST(0) into itself (no-op), then pop; now ST(0) = _b

    ; current stack state:
    ; ST(0) = _b

    ret 0                          ; return with _b in ST(0)
_d_max ENDP
</code>
  </pre>
</div>

<p>
The <code style="color:chartreuse;">FCOM</code> instruction differs from <code style="color:chartreuse;">FCOMP</code> in that it only compares the values without modifying the FPU stack.
</p>
<p>
Unlike the previous example, here the operands are coming in reverse order, and therefore the comparison result in the C3/C2/C0 bits is different:
</p>
<p>* if <code style="color:chartreuse;">a &gt; b</code> in our example, then C3/C2/C0 bits will be: <b style="color:cornflowerblue;">0, 0, 0</b></p>
<p>* if <code style="color:chartreuse;">b &gt; a</code>, then the bits will be: <b style="color:cornflowerblue;">0, 0, 1</b></p>
<p>* if <code style="color:chartreuse;">a = b</code>, then the bits will be: <b style="color:cornflowerblue;">1, 0, 0</b></p>
<p>
The instruction:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
test ah, 65  ; AND AH with 01000001 (binary); isolates C3 (bit 6) and C0 (bit 0), ignores all others
</code>
  </pre>
</div>

<p>
Leaves only two bits — C3 and C0. Both will be zero if <code style="color:chartreuse;">a &gt; b</code>, and in that case the <b style="color:cornflowerblue;">JNE</b> jump will not execute.
</p>
<p>
After that comes:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
FSTP ST(1)  ; store ST(0) into ST(1) then pop ST(0); leaves _a as the new ST(0)
</code>
  </pre>
</div>

<p>
This instruction copies the value in <code style="color:chartreuse;">ST(0)</code> to the operand, and also pops a value from the FPU stack. In other words: it copies <code style="color:chartreuse;">ST(0)</code> (which currently holds <code style="color:chartreuse;">_a</code>) and places it into <code style="color:chartreuse;">ST(1)</code>. After that there will be two copies of <code style="color:chartreuse;">_a</code> at the top of the stack. Then one value is popped. In the end <code style="color:chartreuse;">ST(0)</code> contains <code style="color:chartreuse;">_a</code>, and the function finishes.
</p>

<hr>

<p>
The conditional jump <b style="color:cornflowerblue;">JNE</b> executes in two cases:
</p>
<p>* if <code style="color:chartreuse;">b &gt; a</code></p>
<p>* or if <code style="color:chartreuse;">a = b</code></p>
<p>
In that case:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
fstp ST(0)  ; store ST(0) into itself (no-op effectively), then pop; leaves _b as the new ST(0)
</code>
  </pre>
</div>

<p>
This will copy <code style="color:chartreuse;">ST(0)</code> into <code style="color:chartreuse;">ST(0)</code> itself (meaning it did nothing — like a NOP), and then one value is popped from the stack, so the top value in the stack (<code style="color:chartreuse;">ST(0)</code>) will become the value that was previously in <code style="color:chartreuse;">ST(1)</code> (which is <code style="color:chartreuse;">_b</code>). After that the function finishes.
</p>
<p>
The reason this instruction is used here is likely that the FPU has no other instruction that pops a value from the stack and discards it without copying it first.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">GCC 4.4.1</h2>

<p>
Listing 1.216: GCC 4.4.1
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
d_max proc near

b = qword ptr -10h          ; local variable b on stack
a = qword ptr -8            ; local variable a on stack

a_first_half  = dword ptr 8  ; low 32 bits of argument a
a_second_half = dword ptr 0Ch ; high 32 bits of argument a
b_first_half  = dword ptr 10h ; low 32 bits of argument b
b_second_half = dword ptr 14h ; high 32 bits of argument b

push ebp                            ; save base pointer
mov  ebp, esp                       ; set up stack frame
sub  esp, 10h                       ; allocate 16 bytes for local variables

; put a and b to local stack:
mov  eax, [ebp+a_first_half]        ; load low 32 bits of a into EAX
mov  dword ptr [ebp+a], eax         ; store low 32 bits of a to local slot

mov  eax, [ebp+a_second_half]       ; load high 32 bits of a into EAX
mov  dword ptr [ebp+a+4], eax       ; store high 32 bits of a to local slot

mov  eax, [ebp+b_first_half]        ; load low 32 bits of b into EAX
mov  dword ptr [ebp+b], eax         ; store low 32 bits of b to local slot

mov  eax, [ebp+b_second_half]       ; load high 32 bits of b into EAX
mov  dword ptr [ebp+b+4], eax       ; store high 32 bits of b to local slot

; load a and b to FPU stack:
fld  [ebp+a]                        ; push a onto FPU stack → ST(0) = a
fld  [ebp+b]                        ; push b onto FPU stack → ST(0) = b, ST(1) = a

; current stack state: ST(0) = b; ST(1) = a

fxch st(1)                          ; swap ST(0) and ST(1) → ST(0) = a, ST(1) = b

; current stack state: ST(0) = a; ST(1) = b

fucompp                             ; compare a and b (unordered), pop both values from FPU stack
fnstsw ax                           ; copy FPU status word into AX (C3/C2/C0 land in AH)
sahf                                ; transfer AH bits into CPU flags: C0→CF, C2→PF, C3→ZF

setnbe al                           ; set AL = 1 if CF=0 and ZF=0 (meaning a &gt; b), else AL = 0
test   al, al                       ; check if AL == 0

jz short loc_8048453                ; jump if AL == 0 (meaning a &lt;= b), go load b

fld [ebp+a]                         ; a &gt; b: load a into ST(0) to return it
jmp short locret_8048456            ; jump to return

loc_8048453:
fld [ebp+b]                         ; a &lt;= b: load b into ST(0) to return it

locret_8048456:
leave                               ; restore stack frame
retn                                ; return (result is in ST(0))

d_max endp
</code>
  </pre>
</div>

<p>
The <code style="color:chartreuse;">FUCOMPP</code> instruction is roughly like <code style="color:chartreuse;">FCOM</code>, but it pops both values from the stack and handles <b style="color:cornflowerblue;">not-a-numbers</b> differently.
</p>
<p>
A few words about <b style="color:cornflowerblue;">not-a-numbers</b>.
</p>
<p>
The FPU can deal with special values called <b style="color:cornflowerblue;">not-a-numbers</b> or <b style="color:cornflowerblue;">NaNs</b>. These are things like infinity, the result of division by zero, etc. Not-a-numbers can be either <b style="color:cornflowerblue;">quiet</b> or <b style="color:cornflowerblue;">signaling</b>.
</p>
<p>
It is possible to continue working with quiet NaNs, but if anyone tries to perform any operation with signaling NaNs, an exception occurs.
</p>
<p>
The <code style="color:chartreuse;">FCOM</code> instruction raises an exception if any operand is a NaN. But <code style="color:chartreuse;">FUCOM</code> only raises an exception if any operand is a <b style="color:cornflowerblue;">signaling NaN (SNaN)</b>.
</p>
<p>
The next instruction is <code style="color:chartreuse;">SAHF (Store AH into Flags)</code> — and this is a rare instruction in code that is not related to the FPU. 8 bits from AH are transferred to the first 8 bits of the CPU flags in the following order:
</p>
<img src="/assets/img/fpu_sahf_1.jpeg" alt="SAHF flags mapping" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
Let's recall that <code style="color:chartreuse;">FNSTSW</code> transfers the bits that matter to us (C3 / C2 / C0) into AH:
</p>
<img src="/assets/img/fpu_sahf_2.jpeg" alt="FNSTSW C3/C2/C0 in AH" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
And they are located at positions <b style="color:cornflowerblue;">6, 2, and 0</b> in register AH.
</p>
<p>
In other words, the pair of instructions:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
fnstsw ax  ; copy FPU status word into AX; C3→bit14(AH6), C2→bit10(AH2), C0→bit8(AH0)
sahf       ; copy AH into CPU flags; AH6→ZF, AH2→PF, AH0→CF
</code>
  </pre>
</div>

<p>
Transfer C3 / C2 / C0 into <b style="color:cornflowerblue;">ZF, PF, CF</b>.
</p>
<p>
Now let's recall the C3 / C2 / C0 values in the different cases:
</p>

<p>
If <b style="color:cornflowerblue;">a &gt; b</b> in our example:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Text" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
C3 = 0
C2 = 0
C0 = 0
</code>
  </pre>
</div>

<p>
If <b style="color:cornflowerblue;">a &lt; b</b>:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Text" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
C3 = 0
C2 = 0
C0 = 1
</code>
  </pre>
</div>

<p>
If <b style="color:cornflowerblue;">a = b</b>:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Text" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
C3 = 1
C2 = 0
C0 = 0
</code>
  </pre>
</div>

<p>
In other words, these CPU flag states are possible after the instructions:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
FUCOMPP  ; compare and pop both
FNSTSW   ; move FPU status to AX
SAHF     ; move AH into CPU flags
</code>
  </pre>
</div>

<table style="width:70%; margin:auto; border-collapse:collapse; text-align:center; font-family:'Cascadia Code', monospace; background:#1e1e2e; color:#e0e0e0; border-radius:12px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.3);">
  <thead style="background:#9a3ba6; color:#fff;">
    <tr>
      <th style="padding:10px;">Condition</th>
      <th style="padding:10px;">ZF</th>
      <th style="padding:10px;">PF</th>
      <th style="padding:10px;">CF</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:10px;">a &gt; b</td><td style="padding:10px;">0</td><td style="padding:10px;">0</td><td style="padding:10px;">0</td></tr>
    <tr><td style="padding:10px;">a &lt; b</td><td style="padding:10px;">0</td><td style="padding:10px;">0</td><td style="padding:10px;">1</td></tr>
    <tr><td style="padding:10px;">a = b</td><td style="padding:10px;">1</td><td style="padding:10px;">0</td><td style="padding:10px;">0</td></tr>
  </tbody>
</table>

<p>
Based on the flag state and the conditions, the <code style="color:chartreuse;">SETNBE</code> instruction places <b style="color:cornflowerblue;">1 or 0 into AL</b>. It is roughly the opposite of the <code style="color:chartreuse;">JNBE</code> instruction, but the difference is that <code style="color:chartreuse;">SETcc</code> places 1 or 0 into AL, while <code style="color:chartreuse;">Jcc</code> either jumps or does not.
</p>
<p>
<code style="color:chartreuse;">SETNBE</code> places <b style="color:cornflowerblue;">1</b> only if:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Text" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
CF = 0
ZF = 0
</code>
  </pre>
</div>

<p>
If this condition is not met, <b style="color:cornflowerblue;">0</b> is placed into AL.
</p>
<p>
The only case where both CF and ZF are 0 is when:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Text" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
a &gt; b
</code>
  </pre>
</div>

<p>
In that case <b style="color:cornflowerblue;">1</b> is stored in AL, the <code style="color:chartreuse;">JZ</code> instruction that follows <b style="color:cornflowerblue;">will not execute</b>, and the function <b style="color:cornflowerblue;">will return a</b>. In all other cases, <b style="color:cornflowerblue;">b</b> is what will be returned.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing GCC 4.4.1</h2>

<p>
Listing 1.217: Optimizing GCC 4.4.1
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
public d_max

d_max proc near

arg_0 = qword ptr 8   ; first argument (a) offset on stack
arg_8 = qword ptr 10h ; second argument (b) offset on stack

push    ebp                     ; save base pointer
mov     ebp, esp                ; set up stack frame

fld     [ebp+arg_0]             ; load a into ST(0)
fld     [ebp+arg_8]             ; load b into ST(0), pushing a down to ST(1)

; stack state now:
; ST(0) = _b
; ST(1) = _a

fxch    st(1)                   ; swap ST(0) and ST(1)

; stack state now:
; ST(0) = _a
; ST(1) = _b

fucom   st(1)                   ; compare ST(0) (a) with ST(1) (b); sets C3/C2/C0 (no pop)
fnstsw  ax                      ; copy FPU status word into AX
sahf                            ; transfer AH into CPU flags: C0→CF, C2→PF, C3→ZF

ja      short loc_8048448       ; jump if a &gt; b (CF=0 and ZF=0)

; a &lt;= b: discard ST(0) (a), leaving b on top
fstp    st                      ; store ST(0) into ST(0) itself (no-op), then pop; ST(0) = b
jmp     short loc_804844A       ; jump to return

loc_8048448:
; a &gt; b: copy a to ST(1), pop ST(0), leaving a on top
fstp    st(1)                   ; store ST(0) (a) into ST(1), then pop; ST(0) = a

loc_804844A:
pop     ebp                     ; restore base pointer
retn                            ; return (result is in ST(0))

d_max endp
</code>
  </pre>
</div>

<p>
It is roughly the same thing, the only difference is that the <code style="color:chartreuse;">JA</code> instruction was used after <code style="color:chartreuse;">SAHF</code>. In fact, the conditional jump instructions that check for <b style="color:cornflowerblue;">"greater", "less", or "equal"</b> in unsigned number comparisons (such as these instructions):
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
JA    ; jump if above (CF=0 and ZF=0)
JAE   ; jump if above or equal (CF=0)
JB    ; jump if below (CF=1)
JBE   ; jump if below or equal (CF=1 or ZF=1)
JE / JZ   ; jump if equal / zero (ZF=1)
JNA   ; jump if not above (CF=1 or ZF=1)
JNAE  ; jump if not above or equal (CF=1)
JNB   ; jump if not below (CF=0)
JNBE  ; jump if not below or equal (CF=0 and ZF=0)
JNE / JNZ ; jump if not equal / not zero (ZF=0)
</code>
  </pre>
</div>

<p>
Only check the flags:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Text" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
CF
ZF
</code>
  </pre>
</div>

<p>
Let's recall where the C3 / C2 / C0 bits are located in register AH after executing <code style="color:chartreuse;">FSTSW / FNSTSW</code>:
</p>
<img src="/assets/img/fpu_ah_bits_1.jpeg" alt="C3/C2/C0 in AH" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
Let's also recall how the bits from AH are stored into CPU flags after executing <code style="color:chartreuse;">SAHF</code>:
</p>
<img src="/assets/img/fpu_ah_bits_2.jpeg" alt="SAHF AH to CPU flags" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
After the comparison, the C3 and C0 bits are transferred into:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Text" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
ZF
CF
</code>
  </pre>
</div>

<p>
So that the conditional jump instructions can work after that. The <code style="color:chartreuse;">JA</code> instruction executes if <b style="color:cornflowerblue;">CF = 0</b> and <b style="color:cornflowerblue;">ZF = 0</b>.
</p>
<p>
And thus, the conditional jump instructions mentioned above can work after the pair of instructions:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
FNSTSW  ; move FPU status word into AX
SAHF    ; move AH into CPU flags
</code>
  </pre>
</div>

<p>
It is clear that the FPU condition bits C3 / C2 / C0 were placed in those positions <b style="color:cornflowerblue;">intentionally</b>, so that they can be easily converted to regular CPU flags without needing additional operations to rearrange the bits.
</p>

<hr>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">GCC 4.8.1 with -O3 optimization</h3>

<p>
Some new FPU instructions were added in the <b style="color:cornflowerblue;">Intel P6</b> family. These are <code style="color:chartreuse;">FUCOMI</code> (compares operands and sets the main CPU flags) and <code style="color:chartreuse;">FCMOVcc</code> (works like <code style="color:chartreuse;">CMOVcc</code>, but on FPU registers).
</p>
<p>
It is clear that the GCC developers decided to drop support for <b style="color:cornflowerblue;">Intel processors older than P6</b> (old Pentiums, 80486, etc.). Also, the FPU is no longer a separate unit in the Intel P6 family, so it is now possible to modify or check the main CPU flags through the FPU.
</p>
<p>
So what we get is the following:
</p>
<p>
Listing 1.218: Optimizing GCC 4.8.1
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
fld     QWORD PTR [esp+4]      ; load &quot;a&quot; into ST(0)
fld     QWORD PTR [esp+12]     ; load &quot;b&quot; into ST(0), pushing a down to ST(1)

; ST(0) = b, ST(1) = a

fxch    st(1)                  ; swap ST(0) and ST(1)

; ST(0) = a, ST(1) = b

fucomi  st, st(1)              ; compare ST(0) (a) with ST(1) (b), set CPU flags directly

; copy ST(1) (b) to ST(0) if a &lt;= b, leave a in ST(0) otherwise
fcmovbe st, st(1)              ; conditional move: ST(0) = ST(1) if CF=1 or ZF=1 (a &lt;= b)

fstp    st(1)                  ; discard ST(1) (now redundant copy), leaving result in ST(0)

ret                            ; return (result is in ST(0))
</code>
  </pre>
</div>

<p>
It is hard to guess why <code style="color:chartreuse;">FXCH</code> is present here. We could easily get rid of it by swapping the first two <code style="color:chartreuse;">FLD</code> instructions, or by replacing <code style="color:chartreuse;">FCMOVBE (below or equal)</code> with <code style="color:chartreuse;">FCMOVA (above)</code>. This may be imprecision from the compiler.
</p>
<p>
<code style="color:chartreuse;">FUCOMI</code> compares <code style="color:chartreuse;">ST(0) (a)</code> and <code style="color:chartreuse;">ST(1) (b)</code> and then sets some flags in the main CPU.
</p>
<p>
<code style="color:chartreuse;">FCMOVBE</code> checks the flags and copies <code style="color:chartreuse;">ST(1) (which is b here)</code> into <code style="color:chartreuse;">ST(0) (which is a here)</code> if <b style="color:cornflowerblue;">ST(0)(a) &lt;= ST(1)(b)</b>. Otherwise (a &gt; b) it leaves a in <code style="color:chartreuse;">ST(0)</code>.
</p>
<p>
The last <code style="color:chartreuse;">FSTP</code> instruction leaves <code style="color:chartreuse;">ST(0)</code> at the top of the stack and discards the content of <code style="color:chartreuse;">ST(1)</code>.
</p>
<p>
Let's trace this function in GDB:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="shell" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
dennis@ubuntuvm:~/polygon$ gcc -O3 d_max.c -o d_max -fno-inline  ; compile with O3, no inlining
dennis@ubuntuvm:~/polygon$ gdb d_max                              ; start GDB debugger
GNU gdb (GDB) 7.6.1-ubuntu
...
Reading symbols from /home/dennis/polygon/d_max...(no debugging symbols found)...done.

(gdb) b d_max                   ; set breakpoint at d_max
Breakpoint 1 at 0x80484a0

(gdb) run                       ; run the program
Starting program: /home/dennis/polygon/d_max

Breakpoint 1, 0x080484a0 in d_max ()

(gdb) ni                        ; step one instruction
0x080484a4 in d_max ()

(gdb) disas $eip                ; disassemble at current instruction pointer
Dump of assembler code for function d_max:

   0x080484a0 &lt;+0&gt;:  fldl   0x4(%esp)     ; load a
=&gt; 0x080484a4 &lt;+4&gt;:  fldl   0xc(%esp)     ; load b (current position)
   0x080484a8 &lt;+8&gt;:  fxch   %st(1)        ; swap ST(0) and ST(1)
   0x080484aa &lt;+10&gt;: fucomi %st(1),%st    ; compare a with b, set CPU flags
   0x080484ac &lt;+12&gt;: fcmovbe %st(1),%st   ; conditional move if a &lt;= b
   0x080484ae &lt;+14&gt;: fstp   %st(1)        ; discard ST(1)
   0x080484b0 &lt;+16&gt;: ret                  ; return

End of assembler dump.

(gdb) ni                        ; step one more instruction
0x080484a8 in d_max ()

(gdb) info float                ; display FPU register state
=&gt; R7: Valid   0x4000d999999999999800 +3.399999999999999911   ; ST(0) = 3.4 (b), top of stack
   R6: Empty  0x4000d999999999999800                          ; previous value still in register
   R5: Empty  0x00000000000000000000
   R4: Empty  0x00000000000000000000
   R3: Empty  0x00000000000000000000
   R2: Empty  0x00000000000000000000
   R1: Empty  0x00000000000000000000
   R0: Empty  0x00000000000000000000

   Status Word:   0x3800           ; TOP field = 7 (top of stack points to internal register 7)
       TOP: 7
   Control Word:  0x037f IM DM ZM OM UM PM
   PC: Extended Precision (64-bits)
   RC: Round to nearest
   Tag Word:      0x3fff
   Instruction Pointer: 0x73:0x080484ae
   Operand Pointer:     0x7b:0xbffff118
   Opcode: 0x0000

(gdb) quit
A debugging session is active.

Inferior 1 [process 30194] will be killed.
Quit anyway? (y or n) y
dennis@ubuntuvm:~/polygon$
</code>
  </pre>
</div>

<p>
As mentioned before, the FPU register set is a <b style="color:cornflowerblue;">circular buffer</b> not a real stack. GDB does not display <code style="color:chartreuse;">STx</code> registers, but instead displays the <b style="color:cornflowerblue;">internal FPU registers (Rx)</b>.
</p>
<p>
The arrow points to the current top of the stack. We can also see the value of the <code style="color:chartreuse;">TOP</code> register in the Status Word — it is <b style="color:cornflowerblue;">7 now</b>, meaning the top of the stack currently points to internal register number 7.
</p>
<p>
The values of a and b were swapped after executing <code style="color:chartreuse;">FXCH</code>. The <code style="color:chartreuse;">FUCOMI</code> instruction was executed — we can see that <b style="color:cornflowerblue;">CF is set</b>. The <code style="color:chartreuse;">FCMOVBE</code> copied the value of b. The <code style="color:chartreuse;">FSTP</code> left one value at the top of the stack. The <code style="color:chartreuse;">TOP</code> value is now <b style="color:cornflowerblue;">7</b>, so the top of the FPU stack points to internal register 7.
</p>

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM</h2>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing Xcode 4.6.3 (LLVM) (ARM mode)</h3>

<p>
Listing 1.220: Optimizing Xcode 4.6.3 (LLVM) (ARM mode)
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
VMOV    D16, R2, R3       ; load b from R2:R3 pair into D16
VMOV    D17, R0, R1       ; load a from R0:R1 pair into D17
VCMPE.F64 D17, D16        ; compare a (D17) with b (D16), set FPSCR flags
VMRS    APSR_nzcv, FPSCR  ; transfer 4 condition bits (N,Z,C,V) from FPSCR to APSR (CPU flags)
VMOVGT.F64 D16, D17       ; if a &gt; b (GT condition true): copy a into D16
VMOV    R0, R1, D16       ; move result from D16 into R0:R1 pair for return
BX      LR                ; return
</code>
  </pre>
</div>

<p>
Very simple. The incoming values are placed in registers D17 and D16 and then compared with <code style="color:chartreuse;">VCMPE</code>.
</p>
<p>
Just like the x86 coprocessor, the ARM coprocessor has its own status register and flags (FPSCR), because it needs to keep condition flags specific to the coprocessor. And just like x86, there are no conditional jump instructions in ARM that can directly check the coprocessor flags. That is why there is the <code style="color:chartreuse;">VMRS</code> instruction that transfers 4 bits (N, Z, C, V) from the coprocessor status register to the general purpose register (APSR).
</p>
<p>
<code style="color:chartreuse;">VMOVGT</code> is like <code style="color:chartreuse;">MOVGT</code> but for D registers, and it executes only if the first value is greater than the second (GT = Greater Than). If it executes, the value of a will be copied into D16 (which originally held b). If not, b remains in D16.
</p>
<p>
The second-to-last instruction (<code style="color:chartreuse;">VMOV</code>) prepares the value in D16 to be returned via the R0:R1 pair.
</p>

<hr>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing Xcode 4.6.3 (LLVM) (Thumb-2 mode)</h3>

<p>
Listing 1.221: Optimizing Xcode 4.6.3 (LLVM) (Thumb-2 mode)
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
VMOV    D16, R2, R3        ; load b from R2:R3 pair into D16
VMOV    D17, R0, R1        ; load a from R0:R1 pair into D17
VCMPE.F64 D17, D16         ; compare a with b, set FPSCR flags
VMRS    APSR_nzcv, FPSCR   ; transfer condition bits from FPSCR to APSR
IT      GT                 ; if-then block: next instruction executes only if GT condition is true
VMOVGT.F64 D16, D17        ; (conditional) copy a into D16 if a &gt; b
VMOV    R0, R1, D16        ; move result from D16 into R0:R1 pair for return
BX      LR                 ; return
</code>
  </pre>
</div>

<p>
Almost the same as before, but with a small difference. As we know, in ARM mode many instructions can have a predicate added to them. But in regular Thumb mode there is no space for that at all because instructions are 16-bit. However, Thumb-2 was extended to allow adding these conditions to some older instructions. In the listing produced by IDA, we see <code style="color:chartreuse;">VMOVGT</code> like before. In reality it is a regular <code style="color:chartreuse;">VMOV</code>, but IDA added the -GT suffix because there is an <code style="color:chartreuse;">IT GT</code> instruction immediately before it.
</p>
<p>
The <code style="color:chartreuse;">IT</code> instruction defines an "if-then" block. After it you can place up to 4 instructions, each with a condition suffix. In this example, <code style="color:chartreuse;">IT GT</code> means the instruction that follows will execute only if the GT condition is true.
</p>
<p>
A more complex example, from Angry Birds (iOS):
</p>
<p>
Listing 1.222: Angry Birds Classic
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
...
ITE     NE              ; if-then-else: next two instructions get NE and EQ suffixes respectively
VMOVNE  R2, R3, D16    ; executes if NE (not equal) is true
VMOVEQ  R2, R3, D17    ; executes if EQ (equal) is true (inverse of NE)
BLX     _objc_msgSend  ; no condition suffix, always executes
...
</code>
  </pre>
</div>

<p>
<code style="color:chartreuse;">ITE</code> means if-then-else, and assigns suffixes to the next two instructions. The first executes if the condition (NE = Not Equal) is true, and the second executes if the condition is not true (the inverse of NE is EQ). The instruction after <code style="color:chartreuse;">VMOVEQ</code> is a normal instruction with no suffix (<code style="color:chartreuse;">BLX</code>).
</p>
<p>
Another slightly more complex example, also from Angry Birds:
</p>
<p>
Listing 1.223: Angry Birds Classic
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
...
ITTTT   EQ              ; if-then-then-then-then: all 4 following instructions get EQ suffix
MOVEQ   R0, R4          ; executes if EQ
ADDEQ   SP, SP, #0x20   ; executes if EQ
POPEQ.W {R8,R10}        ; executes if EQ
POPEQ   {R4-R7,PC}      ; executes if EQ
BLX     ___stack_chk_fail ; no suffix, always executes
...
</code>
  </pre>
</div>

<p>
If it were for example <code style="color:chartreuse;">ITEEE EQ</code>, the suffixes would be: EQ, NE, NE, NE.
</p>
<p>
Another example from Angry Birds:
</p>
<p>
Listing 1.224: Angry Birds Classic
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
...
CMP.W   R0, #0xFFFFFFFF    ; compare R0 with -1
ITTE    LE                  ; if-then-then-else: first two get LE suffix, third gets GT suffix
SUBLE.W R10, R0, #1        ; executes if LE: R10 = R0 - 1
NEGLE   R0, R0             ; executes if LE: R0 = -R0
MOVGT   R10, R0            ; executes if GT (inverse of LE)
MOVS    R6, #0             ; no suffix, always executes
CBZ     R0, loc_1E7E32     ; no suffix, always executes
...
</code>
  </pre>
</div>

<p>
<code style="color:chartreuse;">ITTE (if-then-then-else)</code> means the first and second instructions execute if LE is true, and the third executes if the inverse condition (GT) is true.
</p>
<p>
Compilers generally do not use all combinations. In Angry Birds (Classic version) only the following were used: IT, ITE, ITT, ITTE, ITTT, ITTTT.
</p>

<hr>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Non-optimizing Xcode 4.6.3 (LLVM) (ARM mode)</h3>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
b               = -0x20   ; local slot for b
a               = -0x18   ; local slot for a
val_to_return   = -0x10   ; local slot for return value
saved_R7        = -4      ; saved frame pointer slot

STR     R7, [SP,#saved_R7]!     ; save R7 (frame pointer) on stack
MOV     R7, SP                  ; set frame pointer
SUB     SP, SP, #0x1C           ; allocate local stack space
BIC     SP, SP, #7              ; align stack to 8 bytes

VMOV    D16, R2, R3             ; load b from R2:R3 into D16
VMOV    D17, R0, R1             ; load a from R0:R1 into D17
VSTR    D17, [SP,#0x20+a]       ; store a to local stack slot
VSTR    D16, [SP,#0x20+b]       ; store b to local stack slot

VLDR    D16, [SP,#0x20+a]       ; reload a from local stack into D16
VLDR    D17, [SP,#0x20+b]       ; reload b from local stack into D17
VCMPE.F64 D16, D17              ; compare a with b, set FPSCR flags
VMRS    APSR_nzcv, FPSCR        ; transfer condition bits to APSR
BLE     loc_2E08                ; branch if a &lt;= b

VLDR    D16, [SP,#0x20+a]       ; a &gt; b: load a
VSTR    D16, [SP,#0x20+val_to_return] ; store a as return value
B       loc_2E10                ; jump to return

loc_2E08:
VLDR    D16, [SP,#0x20+b]       ; a &lt;= b: load b
VSTR    D16, [SP,#0x20+val_to_return] ; store b as return value

loc_2E10:
VLDR    D16, [SP,#0x20+val_to_return] ; load return value from stack
VMOV    R0, R1, D16             ; move return value into R0:R1 pair

MOV     SP, R7                  ; restore stack pointer
LDR     R7, [SP+0x20+b],#4     ; restore saved R7
BX      LR                      ; return
</code>
  </pre>
</div>

<p>
Almost the same idea, but there is a lot of extra code because a and b were sent to the local stack, and even the value to be returned is also on the stack.
</p>

<hr>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing Keil 6/2013 (Thumb mode)</h3>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
PUSH    {R3-R7,LR}      ; save registers and link register
MOVS    R4, R2          ; save low 32 bits of b in R4
MOVS    R5, R3          ; save high 32 bits of b in R5
MOVS    R6, R0          ; save low 32 bits of a in R6
MOVS    R7, R1          ; save high 32 bits of a in R7

BL      __aeabi_cdrcmple ; call library comparison function; sets flags based on result
BCS     loc_1C0          ; branch if carry set (a &gt;= b), meaning b is not the max

; b &gt;= a: return b
MOVS    R0, R6           ; load low 32 bits of a (wait — actually b was in R4/R5)
MOVS    R1, R7
POP     {R3-R7,PC}       ; restore and return

loc_1C0:
; a &gt; b: return a
MOVS    R0, R4           ; load low 32 bits of result
MOVS    R1, R5           ; load high 32 bits of result
POP     {R3-R7,PC}       ; restore and return
</code>
  </pre>
</div>

<p>
Keil does not generate FPU instructions directly because it is not guaranteed that the target CPU has an FPU at all, and it cannot do a normal bitwise comparison. So it calls the external function <code style="color:chartreuse;">__aeabi_cdrcmple</code> to perform the comparison and leave the result in the flags, after which <code style="color:chartreuse;">BCS (Carry Set = Greater or Equal)</code> acts on it directly.
</p>

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM64</h2>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing GCC (Linaro) 4.9</h3>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
d_max:
    fcmpe   d0, d1          ; compare D0 (a) and D1 (b), set APSR flags directly
    fcsel   d0, d0, d1, gt  ; if GT (a &gt; b): D0 = D0 (keep a); else: D0 = D1 (take b)
    ret                     ; return (result is in D0)
</code>
  </pre>
</div>

<p>
In ARM64 there are now FPU instructions that set the flags in APSR directly instead of FPSCR, which is much more convenient.
</p>
<p>
<code style="color:chartreuse;">FCMPE</code> compares the two values in D0 and D1 and sets the flags in APSR. <code style="color:chartreuse;">FCSEL (Floating Conditional Select)</code> copies D0 or D1 into D0 based on the GT condition, and also uses APSR flags. Much more convenient than the old way.
</p>
<p>
If the GT condition is true → D0 remains as it is (a). If not true → D1 (b) is copied into D0.
</p>

<hr>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Non-optimizing GCC (Linaro) 4.9</h3>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
d_max:
    sub     sp, sp, #16           ; allocate stack space
    str     d0, [sp,8]            ; save a to local stack
    str     d1, [sp]              ; save b to local stack

    ldr     x1, [sp,8]            ; reload a into x1
    ldr     x0, [sp]              ; reload b into x0

    fmov    d0, x1                ; move a into d0
    fmov    d1, x0                ; move b into d1

    fcmpe   d0, d1                ; compare a and b, set APSR flags
    ble     .L76                  ; branch if a &lt;= b

    ; a &gt; b: return a
    ldr     x0, [sp,8]            ; load a from stack
    b       .L74                  ; jump to return

.L76:
    ; a &lt;= b: return b
    ldr     x0, [sp]              ; load b from stack

.L74:
    fmov    d0, x0                ; move result into d0 for return
    add     sp, sp, 16            ; deallocate stack
    ret                           ; return
</code>
  </pre>
</div>

<p>
The non-optimizing version is much more verbose and repetitive. It saves the inputs to the stack (Register Save Area), reloads them, converts them back to D-registers for comparison, then uses an old-style conditional branch (BLE) instead of the clean <code style="color:chartreuse;">FCSEL</code>.
</p>

<hr>

<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing GCC (Linaro) 4.9 — float</h3>

<p>
If we change the function to use float instead of double:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="C" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
float f_max (float a, float b) // same logic but with 32-bit float instead of 64-bit double
{
    if (a &gt; b) return a;
    return b;
}
</code>
  </pre>
</div>

<p>
The code produced is:
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
f_max:
    fcmpe   s0, s1          ; compare S0 (a) and S1 (b) using 32-bit float registers
    fcsel   s0, s0, s1, gt  ; if GT: keep a in S0, else copy b into S0
    ret                     ; return
</code>
  </pre>
</div>

<p>
Exactly the same idea, but using S-registers (32-bit) instead of D-registers (64-bit), because float is passed in S0 and S1.
</p>

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">MIPS</h2>

<p>
The coprocessor in MIPS has a condition bit that can be set in the FPU and read in the CPU. The old MIPS had only one bit (FCC0), the new one has 8 (FCC0 through FCC7), and these are in a register called FCCR.
</p>
<p>
Listing 1.227: Optimizing GCC 4.4.5 (IDA)
</p>

<!-- 🧠 Code Block Component -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
d_max:
    c.lt.d     $f14, $f12      ; compare Less Than (double): if b &lt; a, set condition bit (True)
    or         $at, $zero      ; NOP (branch delay slot filler)
    bc1t       locret_14       ; Branch if Condition 1 True: jump if b &lt; a (a is greater)
    mov.d      $f0, $f12       ; delay slot: copy a into $f0 (always executes after bc1t)
    mov.d      $f0, $f14       ; if branch not taken (a &lt;= b): copy b into $f0

locret_14:
    jr         $ra             ; return (result is in $f0)
    or         $at, $zero      ; NOP (delay slot)
</code>
  </pre>
</div>

<p>
<code style="color:chartreuse;">c.lt.d</code> compares Less Than for double. If b &lt; a the condition bit is set (True). <code style="color:chartreuse;">bc1t</code> branches if Condition 1 is True (if the bit is set, jump). The delay slot is very important in MIPS — the instruction after the branch always executes.
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>1.25.8 Some constants</b></h2>

<p>
It is easy to find the representation of some constant numbers in IEEE 754 on Wikipedia. For example, 0.0 is represented by 32 zeros (float) or 64 zeros (double). This means that to zero a floating point variable in a register or in memory, it is possible to use <code style="color:chartreuse;">MOV</code> or <code style="color:chartreuse;">XOR reg, reg</code>. This is very useful in structures (structs) that contain many types, because with a single <code style="color:chartreuse;">memset</code> you can zero all integers to 0, booleans to false, pointers to NULL, and floats to 0.0.
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>1.25.9 Copying</b></h2>

<p>
One might think that FLD/FST must be used to copy IEEE 754 numbers, but in reality a regular <code style="color:chartreuse;">MOV</code> copies them bitwise just like any other data, and that is simpler and faster.
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>1.25.10 Stack, calculators and reverse Polish notation</b></h2>

<p>
Now we understand why old programmable calculators used Reverse Polish Notation (RPN). For example, to add 12 + 34, you enter 12, then 34, then press +. Because those calculators were stack machines, and that was much easier than dealing with parentheses and complex expressions. They are still present in many Unix distributions to this day: the program <code style="color:chartreuse;">dc</code>.
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>1.25.11 80 bits</b></h2>

<p>
The internal representation in the x86 FPU was 80-bit. A somewhat odd number since it is not a power of 2. There is a theory that this is due to historical reasons — the IBM card used in punching cards encoded 12 rows × 80 columns. Also the 80×25 text mode resolution was widespread back in those days.
</p>

</div>