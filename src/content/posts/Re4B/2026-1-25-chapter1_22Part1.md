---
title: "CH1.20 - switch()/case/default (Part 1)"
published: 2026-01-25
description: "Examining how compilers translate switch/case/default statements into assembly and the different jump table optimizations used"
author: "0xV3n0m"
category: "Re4B"
tags: ["Reverse Engineering", "Books", "Assembly"]
image: "/assets/img/reverse21.jpg"
draft: false
lang: "eng"

# Series configuration
type: "course"
series: "re4b"
seriesOrder: 21
seriesTitle: "Reverse Engineering for Beginners"
seriesDescription: "A beginner-friendly book covering x86/x64 reverse engineering through real compiler output and code patterns."
seriesImage: "/assets/img/RE4B.png"
---
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<div style="line-height:1.9; font-size:21px; direction:ltr;">
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.22.1 Small number of cases</b></h1>
<img src="/assets/img/switch1.jpg" alt="switch" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<hr>

```c
#include <stdio.h> // include standard I/O header

void f (int a) // define function f taking int a
{
    switch (a) // switch on value of a
    {
        case 0: printf ("zero\n"); break; // if a==0, print "zero" and break
        case 1: printf ("one\n"); break; // if a==1, print "one" and break
        case 2: printf ("two\n"); break; // if a==2, print "two" and break
        default: printf ("something unknown\n"); break; // otherwise print "something unknown" and break
    };
};

int main() // program entry point
{
    f (2); // test with value 2
};
```

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">x86: Non-optimizing MSVC</h3>

```assembly
tv64 = -4                                ; temporary variable offset
_a$ = 8                                  ; parameter a offset
_f PROC
    push    ebp                          ; save EBP
    mov     ebp, esp                     ; set up stack frame
    push    ecx                          ; allocate space for temporary

    mov     eax, DWORD PTR _a$[ebp]      ; load a into EAX
    mov     DWORD PTR tv64[ebp], eax     ; store copy in temporary tv64

    cmp     DWORD PTR tv64[ebp], 0       ; compare temporary with 0
    je      SHORT $LN4@f                 ; if equal, jump to zero case

    cmp     DWORD PTR tv64[ebp], 1       ; compare with 1
    je      SHORT $LN3@f                 ; if equal, jump to one case

    cmp     DWORD PTR tv64[ebp], 2       ; compare with 2
    je      SHORT $LN2@f                 ; if equal, jump to two case

    jmp     SHORT $LN1@f                 ; otherwise jump to default

$LN4@f:                                      ; zero case
    push    OFFSET $SG739                ; push address of "zero\n"
    call    _printf                      ; call printf
    add     esp, 4                       ; clean up stack
    jmp     SHORT $LN7@f                 ; jump to exit

$LN3@f:                                      ; one case
    push    OFFSET $SG741                ; push address of "one\n"
    call    _printf                      ; call printf
    add     esp, 4                       ; clean up stack
    jmp     SHORT $LN7@f                 ; jump to exit

$LN2@f:                                      ; two case
    push    OFFSET $SG743                ; push address of "two\n"
    call    _printf                      ; call printf
    add     esp, 4                       ; clean up stack
    jmp     SHORT $LN7@f                 ; jump to exit

$LN1@f:                                      ; default case
    push    OFFSET $SG745                ; push address of "something unknown\n"
    call    _printf                      ; call printf
    add     esp, 4                       ; clean up stack

$LN7@f:                                      ; function exit
    mov     esp, ebp                     ; restore ESP
    pop     ebp                          ; restore EBP
    ret     0                            ; return
_f ENDP
```

<p>
This function with a small number of cases in <code style="color: chartreuse;">switch()</code> will look like this:
</p>

```c
void f (int a)
{
    if (a==0)
        printf ("zero\n");
    else if (a==1)
        printf ("one\n");
    else if (a==2)
        printf ("two\n");
    else
        printf ("something unknown\n");
};
```

<p>
The author began explaining that when dealing with a <code style="color: chartreuse;">switch()</code> with a small number of cases, it is impossible to determine whether the source code actually contained a <code style="color: chartreuse;">switch()</code> or just several <code style="color: chartreuse;">if()</code> statements chained together.
</p>
<p>
This means that <code style="color: chartreuse;">switch()</code> is merely syntactic sugar for a large number of nested <code style="color: chartreuse;">if()</code> statements.
</p>
<p>
There is nothing particularly new in the generated code, except that the compiler copied the value of variable <code style="color: chartreuse;">a</code> to a temporary local variable named <code style="color: chartreuse;">tv64</code>. If we compile this with GCC 4.4.1, even with maximum optimization (-O3), the result will be very similar.
</p>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing MSVC</h3>

<p>
Now let us enable optimization in MSVC using /Ox:
</p>

```text
cl 1.c /Fa1.asm /Ox
```

```assembly
_a$ = 8                                  ; parameter a offset
_f PROC
    mov     eax, DWORD PTR _a$[esp-4]    ; load a into EAX
    sub     eax, 0                       ; subtract 0 (sets flags for comparison with 0)
    je      SHORT $LN4@f                 ; if result zero (a==0), jump to zero case

    sub     eax, 1                       ; subtract 1
    je      SHORT $LN3@f                 ; if result zero (a==1), jump to one case

    sub     eax, 1                       ; subtract 1 again
    je      SHORT $LN2@f                 ; if result zero (a==2), jump to two case

    mov     DWORD PTR _a$[esp-4], OFFSET $SG791 ; load address of "something unknown\n"
    jmp     _printf                      ; jump to printf

$LN2@f:                                      ; two case
    mov     DWORD PTR _a$[esp-4], OFFSET $SG789 ; load address of "two\n"
    jmp     _printf                      ; jump to printf

$LN3@f:                                      ; one case
    mov     DWORD PTR _a$[esp-4], OFFSET $SG787 ; load address of "one\n"
    jmp     _printf                      ; jump to printf

$LN4@f:                                      ; zero case
    mov     DWORD PTR _a$[esp-4], OFFSET $SG785 ; load address of "zero\n"
    jmp     _printf                      ; jump to printf
_f ENDP
```

<p>
Let us simply explain what happened here:
</p>
<p>
First:
</p>
<p>
The value of <code style="color: chartreuse;">a</code> is placed in the <code style="color: chartreuse;">EAX</code> register, then:
</p>

```assembly
sub eax, 0
```

<p>
This looks strange, but the goal is to test whether the value is zero.
</p>
<ul>
  <li>If the result is zero → ZF flag is set</li>
  <li>Then the <code style="color: chartreuse;">JE</code> (Jump if Equal or JZ) instruction works</li>
  <li>And we jump directly to label <code style="color: chartreuse;">$LN4@f</code></li>
  <li>And "zero" is printed</li>
</ul>
<p>
If the jump did not occur:
</p>
<ul>
  <li>Subtract 1</li>
  <li>Then subtract 1 again</li>
  <li>As soon as the result becomes zero → the appropriate jump occurs</li>
</ul>
<p>
If no jump occurred, print "something unknown".
</p>
<p>
Second:
</p>
<p>
We see that the string address is placed in the variable <code style="color: chartreuse;">a</code> itself, then <code style="color: chartreuse;">printf()</code> is called with <code style="color: chartreuse;">JMP</code> instead of <code style="color: chartreuse;">CALL</code>.
</p>
<p>
Why?
</p>
<ul>
  <li>The caller of function <code style="color: chartreuse;">f()</code> did:</li>
  <ul>
    <li><code style="color: chartreuse;">CALL f</code></li>
    <li>This pushed the return address (RA) onto the stack</li>
  </ul>
  <li>While <code style="color: chartreuse;">f()</code> is executing, the stack layout is:</li>
  <ul>
    <li>ESP → return address</li>
    <li>ESP+4 → variable a</li>
  </ul>
  <li>When calling <code style="color: chartreuse;">printf()</code>:</li>
  <ul>
    <li>We need exactly the same stack layout</li>
    <li>But the difference is that the first argument should be the string address</li>
  </ul>
</ul>
<p>
This is what the code did:
</p>
<ul>
  <li>Replaced the value of <code style="color: chartreuse;">a</code> with the string address</li>
  <li>Jumped directly with <code style="color: chartreuse;">JMP</code> to <code style="color: chartreuse;">printf()</code></li>
</ul>
<p>
<code style="color: chartreuse;">printf()</code> prints the string and then executes <code style="color: chartreuse;">RET</code>, popping the return address from the stack and returning directly to the caller of <code style="color: chartreuse;">f()</code> without returning to <code style="color: chartreuse;">f()</code> itself. Thus <code style="color: chartreuse;">f()</code> is completely bypassed at the end. This technique is somewhat similar to the idea of <code style="color: chartreuse;">longjmp()</code>, and of course it is all done for speed.
</p>
<p>
We can summarize this a bit: if the last thing in a function is a call to another function with no code after it, the compiler can:
</p>
<ul>
  <li>Modify the arguments</li>
  <li>Jump with <code style="color: chartreuse;">JMP</code></li>
  <li>And let <code style="color: chartreuse;">RET</code> happen from the other function</li>
</ul>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">x32dbg (EX2)</h3>

<p>
Note: I could not get this example to work perfectly because the compiler is newer than the one in the book, which made a slight difference. I will try to explain the example as much as possible.
</p>
<p>
We run the same example in x32dbg after compiling and start running it in the debugger.
</p>
<p>
EAX value is 2 initially, which is the input value of the function.
</p>
<img src="/assets/x32dbg2/7_1.png" alt="EAX = 2" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<p>
0 is subtracted from 2 in EAX. Of course, EAX still has 2. But the ZF flag is now 0, meaning the result is not zero:
</p>
<img src="/assets/x32dbg2/7_2.png" alt="After first SUB" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<p>
Then another SUB is performed. EAX finally becomes 0 and the ZF flag is set because the result became zero:
</p>
<img src="/assets/x32dbg2/7_3.png" alt="After second SUB" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<p>
Now the current argument to the function is 2, and 2 is currently on the stack.
</p>
<p>
The pointer to the string is written, and then the jump occurs. This is the first instruction in <code style="color: chartreuse;">printf()</code> in MSVCR100.DLL.
</p>
<p>
After that, <code style="color: chartreuse;">printf()</code> takes the string as the only argument and prints it. This is the last instruction in <code style="color: chartreuse;">printf()</code>.
</p>
<p>
The string "two" is now printed on the console window.
</p>
<p>
And the jump was direct from inside <code style="color: chartreuse;">printf()</code> to <code style="color: chartreuse;">main()</code> because the RA on the stack does not point to a location in <code style="color: chartreuse;">f()</code>, but points to <code style="color: chartreuse;">main()</code>.
</p>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">ARM: Optimizing Keil 6/2013 (ARM mode)</h3>

```assembly
.text:0000014C f1:
    CMP     R0, #0                       ; compare input with 0
    ADREQ   R0, aZero                    ; if equal, load address of "zero\n" into R0
    BEQ     loc_170                      ; if equal, jump to printf call

    CMP     R0, #1                       ; compare with 1
    ADREQ   R0, aOne                     ; if equal, load address of "one\n"
    BEQ     loc_170                      ; if equal, jump to printf

    CMP     R0, #2                       ; compare with 2
    ADRNE   R0, aSomethingUnkno          ; if not equal, load address of "something unknown\n"
    ADREQ   R0, aTwo                     ; if equal, load address of "two\n"

loc_170:
    B       __2printf                    ; unconditional jump to printf
```

<p>
Again, looking at this code we cannot determine whether it was a <code style="color: chartreuse;">switch()</code> or just several <code style="color: chartreuse;">if</code> statements.
</p>
<p>
In general, we see conditional instructions here (like <code style="color: chartreuse;">ADREQ</code> which means "Equal") which execute only if R0 = 0, and then load the address of the string "zero\n" into R0.
</p>
<p>
The following <code style="color: chartreuse;">BEQ</code> instruction transfers control to <code style="color: chartreuse;">loc_170</code> if R0 = 0.
</p>
<p>
The question is: will <code style="color: chartreuse;">BEQ</code> work correctly since <code style="color: chartreuse;">ADREQ</code> just changed the value of R0 before it?
</p>
<p>
Yes, it will work because <code style="color: chartreuse;">BEQ</code> checks the flags set by the <code style="color: chartreuse;">CMP</code> instruction, and <code style="color: chartreuse;">ADREQ</code> does not change any flags at all.
</p>
<p>
The rest of the instructions are familiar to us. There is only one call to <code style="color: chartreuse;">printf()</code> at the end, and we have explained this trick before.
</p>
<p>
In the end, there are 3 paths leading to <code style="color: chartreuse;">printf()</code>.
</p>
<p>
The last <code style="color: chartreuse;">CMP R0, #2</code> instruction exists to check if a = 2. If not, the <code style="color: chartreuse;">ADRNE</code> instruction loads the pointer to the string "something unknown\n" into R0, since we are sure at this stage that the variable a is not equal to those numbers.
</p>
<p>
If R0 = 2, the pointer to the string "two\n" will be loaded into R0 via <code style="color: chartreuse;">ADREQ</code>.
</p>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">ARM: Optimizing Keil 6/2013 (Thumb mode)</h3>

```assembly
.text:000000D4 f1:
    PUSH    {R4, LR}                     ; save R4 and LR

    CMP     R0, #0                       ; compare input with 0
    BEQ     zero_case                    ; if equal, jump to zero case

    CMP     R0, #1                       ; compare with 1
    BEQ     one_case                     ; if equal, jump to one case

    CMP     R0, #2                       ; compare with 2
    BEQ     two_case                     ; if equal, jump to two case

    ADR     R0, aSomethingUnkno          ; load address of "something unknown\n"
    B       default_case                 ; jump to printf call

zero_case:
    ADR     R0, aZero                    ; load address of "zero\n"
    B       default_case                 ; jump to printf call

one_case:
    ADR     R0, aOne                     ; load address of "one\n"
    B       default_case                 ; jump to printf call

two_case:
    ADR     R0, aTwo                     ; load address of "two\n"

default_case:
    BL      __2printf                    ; call printf
    POP     {R4, PC}                     ; restore R4 and return
```

<p>
As mentioned before, it is not possible to add conditional predicates to most instructions in Thumb mode, so the Thumb code here is similar to CISC-style x86 code and is very easy to understand.
</p>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">ARM64: Non-optimizing GCC (Linaro) 4.9</h3>

```assembly
.LC12: .string "zero"
.LC13: .string "one"
.LC14: .string "two"
.LC15: .string "something unknown"

f12:
    stp     x29, x30, [sp, -32]!          ; save frame pointer and link register
    add     x29, sp, 0                   ; set frame pointer

    str     w0, [x29, 28]                ; store input argument on stack
    ldr     w0, [x29, 28]                ; load it back into W0

    cmp     w0, #1                       ; compare with 1
    beq     .L34                         ; if equal, jump to one case

    cmp     w0, #2                       ; compare with 2
    beq     .L35                         ; if equal, jump to two case

    cmp     w0, wzr                      ; compare with zero (WZR is always zero)
    bne     .L38                         ; if not zero, jump to default

    adrp    x0, .LC12                    ; load page address of "zero"
    add     x0, x0, :lo12:.LC12          ; add low 12 bits offset
    bl      puts                         ; call puts
    b       .L32                         ; jump to exit

.L34:                                        ; one case
    adrp    x0, .LC13                    ; load page address of "one"
    add     x0, x0, :lo12:.LC13
    bl      puts
    b       .L32

.L35:                                        ; two case
    adrp    x0, .LC14                    ; load page address of "two"
    add     x0, x0, :lo12:.LC14
    bl      puts
    b       .L32

.L38:                                        ; default case
    adrp    x0, .LC15                    ; load page address of "something unknown"
    add     x0, x0, :lo12:.LC15
    bl      puts
    nop                                  ; no operation

.L32:                                        ; function exit
    ldp     x29, x30, [sp], 32           ; restore FP/LR and deallocate
    ret                                  ; return
```

<p>
The input value type is int, so the W0 register is used instead of the full X0 register.
</p>
<p>
String pointers are passed to <code style="color: chartreuse;">puts()</code> using the ADRP/ADD pair of instructions.
</p>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">ARM64: Optimizing GCC (Linaro) 4.9</h3>

```assembly
f12:
    cmp     w0, #1                       ; compare input with 1
    beq     .L31                         ; if equal, jump to one case

    cmp     w0, #2                       ; compare with 2
    beq     .L32                         ; if equal, jump to two case

    cbz     w0, .L35                     ; compare and branch if zero (jump to zero case)

    ; default case
    adrp    x0, .LC15                    ; load page address of "something unknown"
    add     x0, x0, :lo12:.LC15
    b       puts                         ; unconditional jump to puts

.L35:                                        ; zero case
    adrp    x0, .LC12                    ; load page address of "zero"
    add     x0, x0, :lo12:.LC12
    b       puts                         ; jump to puts

.L32:                                        ; two case
    adrp    x0, .LC14                    ; load page address of "two"
    add     x0, x0, :lo12:.LC14
    b       puts                         ; jump to puts

.L31:                                        ; one case
    adrp    x0, .LC13                    ; load page address of "one"
    add     x0, x0, :lo12:.LC13
    b       puts                         ; jump to puts
```

<p>
More optimized code. The <code style="color: chartreuse;">CBZ</code> (Compare and Branch on Zero) instruction jumps if W0 is zero.
</p>
<p>
There is also a direct jump to <code style="color: chartreuse;">puts()</code> instead of calling it, as explained before.
</p>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">MIPS</h3>

```assembly
f:
    lui     $gp, (__gnu_local_gp >> 16)  ; load upper 16 bits of global pointer

    ; is it 1?
    li      $v0, 1                       ; load immediate 1 into $v0
    beq     $a0, $v0, loc_60             ; if input == 1, jump to one case
    la      $gp, (__gnu_local_gp & 0xFFFF) ; load lower bits (delay slot)

    ; is it 2?
    li      $v0, 2                       ; load immediate 2
    beq     $a0, $v0, loc_4C             ; if input == 2, jump to two case
    or      $at, $zero                   ; NOP (delay slot)

    ; jump if not equal to 0
    bnez    $a0, loc_38                  ; if input != 0, jump to default
    or      $at, $zero                   ; NOP (delay slot)

    ; zero case
    lui     $a0, ($LC0 >> 16)            ; load upper bits of "zero" address
    lw      $t9, (puts & 0xFFFF)($gp)    ; load puts address from global pointer
    or      $at, $zero                   ; NOP (load delay slot)
    jr      $t9                          ; jump to puts (delay slot)
    la      $a0, ($LC0 & 0xFFFF)         ; load lower bits of "zero" (delay slot)

loc_38:                                      ; default case
    lui     $a0, ($LC3 >> 16)            ; load upper bits of "something unknown"
    lw      $t9, (puts & 0xFFFF)($gp)    ; load puts address
    or      $at, $zero                   ; NOP
    jr      $t9                          ; jump to puts
    la      $a0, ($LC3 & 0xFFFF)         ; load lower bits (delay slot)

loc_4C:                                      ; two case
    lui     $a0, ($LC2 >> 16)            ; load upper bits of "two"
    lw      $t9, (puts & 0xFFFF)($gp)    ; load puts address
    or      $at, $zero                   ; NOP
    jr      $t9                          ; jump to puts
    la      $a0, ($LC2 & 0xFFFF)         ; load lower bits (delay slot)

loc_60:                                      ; one case
    lui     $a0, ($LC1 >> 16)            ; load upper bits of "one"
    lw      $t9, (puts & 0xFFFF)($gp)    ; load puts address
    or      $at, $zero                   ; NOP
    jr      $t9                          ; jump to puts
    la      $a0, ($LC1 & 0xFFFF)         ; load lower bits (delay slot)
```

<p>
This function always ends with a call to <code style="color: chartreuse;">puts()</code>, so we see a direct jump to <code style="color: chartreuse;">puts()</code> (JR means Jump Register) instead of using "jump and link".
</p>
<p>
We also see many NOP instructions after LW instructions. This is called a load delay slot: another type of delay slot in MIPS.
</p>
<p>
The instruction after LW can execute simultaneously while LW is still loading the value from memory. But the instruction after that cannot use the result just loaded by LW.
</p>
<p>
Modern MIPS processors have a feature to stall if the next instruction uses the result of LW, so this issue is considered obsolete. But GCC still adds NOP instructions to support older MIPS processors.
</p>
<hr>
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.22.2 A lot of cases</b></h1>
<img src="/assets/img/lotofcases.jpg" alt="lotofcases" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
If the <code style="color: chartreuse;">switch()</code> statement has many cases, it is not convenient for the compiler to generate large code with many <code style="color: chartreuse;">JE/JNE</code> instructions.
</p>

```c
#include <stdio.h>

void f (int a)
{
    switch (a)
    {
        case 0: printf ("zero\n"); break;
        case 1: printf ("one\n"); break;
        case 2: printf ("two\n"); break;
        case 3: printf ("three\n"); break;
        case 4: printf ("four\n"); break;
        default: printf ("something unknown\n"); break;
    };
};

int main()
{
    f (2); // test
};
```

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">x86: Non-optimizing MSVC</h3>

```assembly
tv64 = -4                                ; temporary variable
_a$ = 8                                  ; parameter a offset
_f PROC
    push    ebp
    mov     ebp, esp
    push    ecx

    mov     eax, DWORD PTR _a$[ebp]      ; load a
    mov     DWORD PTR tv64[ebp], eax      ; store in temporary

    cmp     DWORD PTR tv64[ebp], 4       ; compare with maximal case value (4)
    ja      SHORT $LN1@f                 ; if greater, jump to default

    mov     ecx, DWORD PTR tv64[ebp]     ; load temporary into ECX
    jmp     DWORD PTR $LN11@f[ecx*4]     ; indirect jump using jump table

$LN6@f:                                      ; case 0
    push    OFFSET $SG739                ; "zero"
    call    _printf
    add     esp, 4
    jmp     SHORT $LN9@f

$LN5@f:                                      ; case 1
    push    OFFSET $SG741                ; "one"
    call    _printf
    add     esp, 4
    jmp     SHORT $LN9@f

$LN4@f:                                      ; case 2
    push    OFFSET $SG743                ; "two"
    call    _printf
    add     esp, 4
    jmp     SHORT $LN9@f

$LN3@f:                                      ; case 3
    push    OFFSET $SG745                ; "three"
    call    _printf
    add     esp, 4
    jmp     SHORT $LN9@f

$LN2@f:                                      ; case 4
    push    OFFSET $SG747                ; "four"
    call    _printf
    add     esp, 4
    jmp     SHORT $LN9@f

$LN1@f:                                      ; default case
    push    OFFSET $SG749                ; "something unknown"
    call    _printf
    add     esp, 4

$LN9@f:                                      ; function exit
    mov     esp, ebp
    pop     ebp
    ret     0

    npad    2                            ; align next label

$LN11@f:
    DD      $LN6@f                       ; table entry for case 0
    DD      $LN5@f                       ; case 1
    DD      $LN4@f                       ; case 2
    DD      $LN3@f                       ; case 3
    DD      $LN2@f                       ; case 4
_f ENDP
```

<p>
What we see here is a set of <code style="color: chartreuse;">printf()</code> calls with different arguments. Each not only has a memory address in the process, but also internal symbolic labels generated by the compiler. All these labels are also listed in an internal table named <code style="color: chartreuse;">$LN11@f</code>.
</p>
<p>
At the beginning of the function, if <code style="color: chartreuse;">a</code> is greater than 4, control flow is passed to label <code style="color: chartreuse;">$LN1@f</code>, where <code style="color: chartreuse;">printf()</code> is called with the argument "something unknown".
</p>
<p>
But if the value of <code style="color: chartreuse;">a</code> is less than or equal to 4, it is multiplied by 4 and added to the address of table <code style="color: chartreuse;">$LN11@f</code>. This forms an address inside the table that points exactly to the element we need.
</p>
<p>
For example, let us say <code style="color: chartreuse;">a</code> equals 2.
</p>
<p>
2 * 4 = 8 (each table element is an address in a 32-bit process, so each element is 4 bytes in size). The address of table <code style="color: chartreuse;">$LN11@f</code> + 8 is the table element that stores the label named <code style="color: chartreuse;">$LN4@f</code>. The <code style="color: chartreuse;">JMP</code> instruction fetches the address <code style="color: chartreuse;">$LN4@f</code> from the table and jumps there.
</p>
<p>
This table is sometimes called a jumptable or branch table.
</p>
<p>
Then the appropriate <code style="color: chartreuse;">printf()</code> is called with the argument "two".
</p>
<p>
Literally, the instruction:
</p>

```assembly
jmp DWORD PTR $LN11@f[ecx*4]
```

<p>
means: jump to the DWORD stored at address <code style="color: chartreuse;">$LN11@f + ecx * 4</code>.
</p>
<p>
<code style="color: chartreuse;">npad</code> is a macro in assembly language that aligns the next label to a 4-byte (or 16-byte) boundary. This is very suitable for the processor because it can fetch 32-bit values from memory via the memory bus, cache memory, etc., more efficiently when they are aligned.
</p>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">x32dbg</h3>

<p>
We run the same example in x32dbg after compiling and start running it in the debugger.
</p>
<img src="/assets/x32dbg2/7_4.png" alt="EAX = 2" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
The input value of the function (2) is loaded into EAX:
</p>
<img src="/assets/x32dbg2/7_5.png" alt="EAX = 2" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<p>
Then the input value is checked: is it greater than 4? If not, the "default" jump is not taken:
</p>
<img src="/assets/x32dbg2/7_6.png" alt="CMP with 4" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<p>
Then we can view the jumptable by choosing Follow in Dump → Constant:
</p>
<img src="/assets/x32dbg2/7_7.png" alt="Jumptable in dump" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<p>
Now we see the jumptable in the data window. These are 5 32-bit values.
</p>
<img src="/assets/x32dbg2/7_8.png" alt="Jumptable in dump" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
Now ECX is 2, so the third element (index 2) in the table will be used.
</p>
<p>
After the jump we are at 0x907218 — the code that prints "two" will now execute:
</p>
<img src="/assets/x32dbg2/7_9.png" alt="At two case" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">Non-optimizing GCC</h3>

<p>
Let us see what GCC 4.4.1 produces:
</p>

```assembly
public f
f proc near
var_18 = dword ptr -18h
arg_0  = dword ptr  8

    push    ebp
    mov     ebp, esp
    sub     esp, 18h

    cmp     [ebp+arg_0], 4               ; compare input with 4
    ja      short loc_8048444            ; if greater, jump to default

    mov     eax, [ebp+arg_0]             ; load input
    shl     eax, 2                       ; multiply by 4 (shift left by 2)
    mov     eax, ds:off_804855C[eax]     ; load address from table
    jmp     eax                          ; jump to loaded address

loc_80483FE:                                 ; case 0
    mov     [esp+18h+var_18], offset aZero ; "zero"
    call    _puts
    jmp     short locret_8048450

loc_804840C:                                 ; case 1
    mov     [esp+18h+var_18], offset aOne ; "one"
    call    _puts
    jmp     short locret_8048450

loc_804841A:                                 ; case 2
    mov     [esp+18h+var_18], offset aTwo ; "two"
    call    _puts
    jmp     short locret_8048450

loc_8048428:                                 ; case 3
    mov     [esp+18h+var_18], offset aThree ; "three"
    call    _puts
    jmp     short locret_8048450

loc_8048436:                                 ; case 4
    mov     [esp+18h+var_18], offset aFour ; "four"
    call    _puts
    jmp     short locret_8048450

loc_8048444:                                 ; default case
    mov     [esp+18h+var_18], offset aSomethingUnkno ; "something unknown"
    call    _puts

locret_8048450:
    leave
    retn
f endp

off_804855C dd offset loc_80483FE            ; jump table
            dd offset loc_804840C
            dd offset loc_804841A
            dd offset loc_8048428
            dd offset loc_8048436
```

<p>
This is almost the same thing, with a small difference: the argument <code style="color: chartreuse;">arg_0</code> is multiplied by 4 by shifting left by 2 bits (which is essentially the same as multiplying by 4), then the label address is taken from the array <code style="color: chartreuse;">off_804855C</code>, stored in EAX, and then <code style="color: chartreuse;">JMP EAX</code> performs the actual jump.
</p>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">ARM: Optimizing Keil 6/2013 (ARM mode)</h3>

```assembly
.text:00000174 f2
    CMP     R0, #5                       ; compare input with 5 (max case + 1)
    ADDCC   PC, PC, R0,LSL#2             ; if less than 5, add (input * 4) to PC
    B       default_case                 ; otherwise jump to default

loc_180:                                     ; case 0
    B       zero_case

loc_184:                                     ; case 1
    B       one_case

loc_188:                                     ; case 2
    B       two_case

loc_18C:                                     ; case 3
    B       three_case

loc_190:                                     ; case 4
    B       four_case

zero_case:
    ADR     R0, aZero                    ; load "zero"
    B       loc_1B8

one_case:
    ADR     R0, aOne                     ; load "one"
    B       loc_1B8

two_case:
    ADR     R0, aTwo                     ; load "two"
    B       loc_1B8

three_case:
    ADR     R0, aThree                   ; load "three"
    B       loc_1B8

four_case:
    ADR     R0, aFour                    ; load "four"

loc_1B8:
    B       __2printf                    ; call printf

default_case:
    ADR     R0, aSomethingUnkno          ; load "something unknown"
    B       loc_1B8                      ; jump to printf
```

<p>
This code exploits the fact that all instructions in ARM mode are fixed size (4 bytes).
</p>
<p>
Recall that the maximum value of <code style="color: chartreuse;">a</code> is 4 and any larger value will cause the string "something unknown\n" to be printed.
</p>
<p>
The first instruction <code style="color: chartreuse;">CMP R0, #5</code> compares the input value of <code style="color: chartreuse;">a</code> with 5.
</p>
<p>
The next instruction <code style="color: chartreuse;">ADDCC PC, PC, R0,LSL#2</code> executes only if R0 < 5 (CC = Carry clear / Less than).
</p>
<p>
Thus, if <code style="color: chartreuse;">ADDCC</code> did not execute (i.e., R0 ≥ 5 case), a jump to label <code style="color: chartreuse;">default_case</code> occurs.
</p>
<p>
But if R0 < 5 and <code style="color: chartreuse;">ADDCC</code> executed, what happens is: the value of R0 is multiplied by 4. In fact, <code style="color: chartreuse;">LSL#2</code> at the end of the instruction means "shift left by 2 bits". But as we will see later in the "Shifts" section, shift left by 2 bits equals multiplication by 4.
</p>
<p>
Then R0 * 4 is added to the current value in PC, thus jumping to one of the <code style="color: chartreuse;">B</code> (Branch) instructions below.
</p>
<p>
At the moment of executing <code style="color: chartreuse;">ADDCC</code>, the value of PC is 8 bytes (0x180) ahead of the address of the <code style="color: chartreuse;">ADDCC</code> instruction itself (0x178), or in other words, two instructions ahead.
</p>
<p>
This is how the pipeline works in ARM processors: when <code style="color: chartreuse;">ADDCC</code> is executed, the processor is already processing the instruction two steps ahead, so PC points there. This point must be memorized.
</p>
<p>
If <code style="color: chartreuse;">a</code> = 0, 0 is added to the PC value, and the actual PC value (which is 8 bytes ahead) is written to PC, resulting in a jump to label <code style="color: chartreuse;">loc_180</code>, which is 8 bytes ahead of where the <code style="color: chartreuse;">ADDCC</code> instruction is.
</p>
<p>
If <code style="color: chartreuse;">a</code> = 1: PC + 8 + a*4 = PC + 8 + 4 = PC + 12 = 0x184, which is the address of label <code style="color: chartreuse;">loc_184</code>.
</p>
<p>
With each increment of <code style="color: chartreuse;">a</code>, the resulting PC value increases by 4. And 4 is the length of an instruction in ARM mode, and also the length of each <code style="color: chartreuse;">B</code> instruction, of which there are 5 in a row.
</p>
<p>
Each of these five <code style="color: chartreuse;">B</code> instructions transfers control forward to what is programmed in the <code style="color: chartreuse;">switch()</code>.
</p>
<p>
Loading the appropriate string pointer happens there, etc.
</p>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">ARM: Optimizing Keil 6/2013 (Thumb mode)</h3>

```assembly
.text:000000F6 f2
    PUSH    {R4,LR}
    MOVS    R3, R0
    BL      __ARM_common_switch8_thumb   ; call helper function
    DCB     5                            ; number of cases (excluding default)
    DCB     4, 6, 8, 0xA, 0xC, 0x10      ; offsets for each case

zero_case:
    ADR     R0, aZero
    B       loc_118

one_case:
    ADR     R0, aOne
    B       loc_118

two_case:
    ADR     R0, aTwo
    B       loc_118

three_case:
    ADR     R0, aThree
    B       loc_118

four_case:
    ADR     R0, aFour

loc_118:
    BL      __2printf
    POP     {R4,PC}

default_case:
    ADR     R0, aSomethingUnkno
    B       loc_118
```

<p>
It is not possible to be sure that all instructions in Thumb and Thumb-2 have the same size.
</p>
<p>
One could also say that in these modes instructions have variable length, like in x86.
</p>
<p>
Therefore, a special table is added containing information about the number of cases (excluding default-case) and also the offset for each case with the label to which control should go in the appropriate case.
</p>
<p>
There is a special function here to handle the table and transfer control, named <code style="color: chartreuse;">__ARM_common_switch8_thumb</code>. It starts with <code style="color: chartreuse;">BX PC</code>, whose purpose is to switch the processor to ARM mode.
</p>
<p>
Then the function responsible for handling the table is executed. It is too advanced to explain here now, so let us leave it.
</p>
<p>
Interestingly, the function uses the LR register as a pointer to the table.
</p>
<p>
Indeed, after calling this function, LR contains the address after the instruction <code style="color: chartreuse;">BL __ARM_common_switch8_thumb</code>, which is where the table starts.
</p>
<p>
It is also noteworthy that the code is generated as a separate reusable function, meaning the compiler does not emit the same code for each <code style="color: chartreuse;">switch()</code>.
</p>
<p>
IDA successfully understood it as a service function and table, and added comments to the labels like: jumptable 000000FA case 0.
</p>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">MIPS</h3>

```assembly
f:
    lui     $gp, (__gnu_local_gp >> 16)

    sltiu   $v0, $a0, 5                  ; set $v0 to 1 if input < 5
    bnez    $v0, loc_24                  ; if true, jump to table handling
    la      $gp, (__gnu_local_gp & 0xFFFF) ; branch delay slot

    ; input >= 5: default case
    lui     $a0, ($LC5 >> 16)            ; load "something unknown"
    lw      $t9, (puts & 0xFFFF)($gp)
    or      $at, $zero                   ; NOP
    jr      $t9                          ; call puts
    la      $a0, ($LC5 & 0xFFFF)         ; delay slot

loc_24:
    la      $v0, off_120                 ; load address of jump table

    sll     $a0, 2                       ; multiply input by 4
    addu    $a0, $v0, $a0                ; add to table base

    lw      $v0, 0($a0)                  ; load target address from table
    or      $at, $zero                   ; NOP

    jr      $v0                          ; jump to target
    or      $at, $zero                   ; delay slot, NOP

sub_44:                                      ; case 3
    lui     $a0, ($LC3 >> 16)            ; "three"
    lw      $t9, (puts & 0xFFFF)($gp)
    or      $at, $zero
    jr      $t9
    la      $a0, ($LC3 & 0xFFFF)

sub_58:                                      ; case 4
    lui     $a0, ($LC4 >> 16)            ; "four"
    lw      $t9, (puts & 0xFFFF)($gp)
    or      $at, $zero
    jr      $t9
    la      $a0, ($LC4 & 0xFFFF)

sub_6C:                                      ; case 0
    lui     $a0, ($LC0 >> 16)            ; "zero"
    lw      $t9, (puts & 0xFFFF)($gp)
    or      $at, $zero
    jr      $t9
    la      $a0, ($LC0 & 0xFFFF)

sub_80:                                      ; case 1
    lui     $a0, ($LC1 >> 16)            ; "one"
    lw      $t9, (puts & 0xFFFF)($gp)
    or      $at, $zero
    jr      $t9
    la      $a0, ($LC1 & 0xFFFF)

sub_94:                                      ; case 2
    lui     $a0, ($LC2 >> 16)            ; "two"
    lw      $t9, (puts & 0xFFFF)($gp)
    or      $at, $zero
    jr      $t9
    la      $a0, ($LC2 & 0xFFFF)

off_120:
    .word   sub_6C                       ; case 0
    .word   sub_80                       ; case 1
    .word   sub_94                       ; case 2
    .word   sub_44                       ; case 3
    .word   sub_58                       ; case 4
```

<p>
The new instruction for us here is <code style="color: chartreuse;">SLTIU</code> ("Set on Less Than Immediate Unsigned"). It is the same as <code style="color: chartreuse;">SLTU</code> ("Set on Less Than Unsigned"), but the "I" means "immediate", i.e., a number is written directly in the instruction.
</p>
<p>
<code style="color: chartreuse;">BNEZ</code> means "Branch if Not Equal to Zero". The code is very close to other ISAs.
</p>
<p>
<code style="color: chartreuse;">SLL</code> ("Shift Word Left Logical") multiplies by 4. MIPS is ultimately a 32-bit CPU, so all addresses in the jumptable are 32-bit addresses.
</p>

<h3 style="color: crimson; font-family: 'Press Start 2P', 'system-ui'">Conclusion</h3>

<p>
The general structure of <code style="color: chartreuse;">switch()</code>:
</p>

```assembly
MOV     REG, input
CMP     REG, 4                       ; maximal number of cases
JA      default
SHL     REG, 2                       ; shift for multiplication by 4 (x64 uses 3 bits)
MOV     REG, jump_table[REG]
JMP     REG

case1:
    ; do something
    JMP     exit

case2:
    ; do something
    JMP     exit

case3:
    ; do something
    JMP     exit

case4:
    ; do something
    JMP     exit

case5:
    ; do something
    JMP     exit

default:
    ...

exit:
    ....

jump_table dd case1
           dd case2
           dd case3
           dd case4
           dd case5
```

<p>
The jump to the address in the jump table can also be done using the instruction:
</p>
<p>
<code style="color: chartreuse;">JMP jump_table[REG*4]</code> or <code style="color: chartreuse;">JMP jump_table[REG*8]</code> in x64.
</p>
<p>
And the jumptable is just an array of pointers.
</p>

</div>