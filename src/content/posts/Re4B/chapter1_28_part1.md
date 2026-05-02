---
title: "CH1.28 Manipulating specific bit(s) (Part1)"
published: 2026-05-01
description: "How compilers check and manipulate individual bits using TEST, AND, flags, and real-world examples from Win32 API and Linux kernel"
author: "0xV3n0m"
category: "Re4B"
tags: ["Reverse Engineering", "Books", "Assembly"]
image: "/assets/img/reversee30.jpg"
draft: false
lang: "eng"

# Series configuration
type: "course"
series: "re4b"
seriesOrder: 30
seriesTitle: "Reverse Engineering for Beginners"
seriesDescription: "A beginner-friendly book covering x86/x64 reverse engineering through real compiler output and code patterns."
seriesImage: "/assets/img/RE4B.png"
---
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<div style="line-height:1.9; font-size:21px; direction:ltr;">
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.28 Manipulating specific bit(s)</b></h1>
<hr>

<p>
At the start of this topic the author was saying that many functions define their inputs as "Flags" in bit fields. The idea is that in programming we sometimes need to pass more than one option or setting to a function using a single small number, instead of using separate variables for each option. The most common approach is to use a <b style="color:cornflowerblue;">bit field</b> or <b style="color:cornflowerblue;">flag bits</b> — meaning each bit in the number (for example a 32-bit number) represents a specific option (enabled/disabled). For example: bit 0 means "read", bit 1 means "write", and so on.
</p>
<p>
To make it clearer, the advantage of this approach is that it saves both memory space and CPU processing time.
</p>
<p>
The author said: "Of course we could have used bool variables for each option, but that is not economical." It would cost more space (each bool takes a byte for example instead of a single bit) and things would run slower.
</p>

<hr>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.28.1 Specific bit checking</b></h1>
<img src="/assets/img/Specificbitchecking.jpg" alt="Specific bit checking">
<hr>

<p>
An example from the Win32 x86 API:
</p>

```c
HANDLE fh;
fh=CreateFile ("file", GENERIC_WRITE | GENERIC_READ, // combine two flags using bitwise OR
    FILE_SHARE_READ, NULL, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
```

<p>
What we get (from MSVC 2010):
</p>
<p>
<b>Listing 1.266: MSVC 2010</b>
</p>

```nasm
push    0
push    128                     ; 00000080H = FILE_ATTRIBUTE_NORMAL
push    4                       ; OPEN_ALWAYS
push    0                       ; NULL (security attributes)
push    1                       ; FILE_SHARE_READ
push    -1073741824             ; C0000000H = GENERIC_READ | GENERIC_WRITE combined
push    OFFSET $SG78813         ; pointer to "file" string
call    DWORD PTR __imp__CreateFileA@28 ; call CreateFileA via import table
mov     DWORD PTR _fh$[ebp], eax ; store returned file handle
```

<p>
Let's take a look inside the WinNT.h file:
</p>
<p>
<b>Listing 1.267: WinNT.h</b>
</p>

```c
#define GENERIC_READ    (0x80000000L) // bit 31 — read access flag
#define GENERIC_WRITE   (0x40000000L) // bit 30 — write access flag
#define GENERIC_EXECUTE (0x20000000L) // bit 29 — execute access flag
#define GENERIC_ALL     (0x10000000L) // bit 28 — all access flag
```

<p>
Everything here is clear. 
<br>
<code style="color:chartreuse;">GENERIC_READ | GENERIC_WRITE</code> = <code style="color:chartreuse;">0x80000000 | 0x40000000 = 0xC0000000</code>, and that value is used as the second parameter (argument) to the <code style="color:chartreuse;">CreateFile()</code> function.
</p>
<p>
To explain how that value was formed:
</p>
<p>* <code style="color:chartreuse;">GENERIC_READ</code> = <code style="color:chartreuse;">0x80000000</code> in binary: <code style="color:chartreuse;">1000 0000 0000 0000 0000 0000 0000 0000</code> (highest bit — bit 31)</p>
<p>* <code style="color:chartreuse;">GENERIC_WRITE</code> = <code style="color:chartreuse;">0x40000000</code> in binary: <code style="color:chartreuse;">0100 0000 ...</code> (bit 30)</p>
<p>* <code style="color:chartreuse;">GENERIC_READ | GENERIC_WRITE</code> = <code style="color:chartreuse;">0xC0000000</code> in binary: <code style="color:chartreuse;">1100 0000 ...</code> (both bits 31 and 30 are set)</p>
<p>
When we do OR, the result = <code style="color:chartreuse;">0xC0000000</code>. The book confirms that this value is the one used as the second argument to the function.
</p>
<p>
Now let's connect this to the Assembly we wrote above. In decimal, <code style="color:chartreuse;">0xC0000000</code> is <b style="color:cornflowerblue;">-1073741824</b> — this confirms it is <code style="color:chartreuse;">dwDesiredAccess</code>.
</p>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>How does CreateFile() check these flags?</b></h2>

<p>
If we look inside <code style="color:chartreuse;">KERNEL32.DLL</code> on Windows XP SP3 x86, we find this code section in <code style="color:chartreuse;">CreateFileW</code>:
</p>
<p>
<b>Listing 1.268: KERNEL32.DLL (Windows XP SP3 x86)</b>
</p>

```nasm
.text:7C83D429 test byte ptr [ebp+dwDesiredAccess+3], 40h ; check bit 30 (GENERIC_WRITE) in the top byte
.text:7C83D42D mov [ebp+var_8], 1                         ; set local variable to 1
.text:7C83D434 jz short loc_7C83D417                      ; if bit was 0 (not set), jump away
.text:7C83D436 jmp loc_7C810817                           ; bit was 1 (set), jump to write handling
```

<p>
Here we see the <code style="color:chartreuse;">TEST</code> instruction, but it does not take the full second parameter — it only takes the highest byte <code style="color:chartreuse;">(ebp+dwDesiredAccess+3)</code> and checks it against the flag <code style="color:chartreuse;">0x40</code> (which here means the <code style="color:chartreuse;">GENERIC_WRITE</code> flag). <code style="color:chartreuse;">TEST</code> is essentially the same as <code style="color:chartreuse;">AND</code>, but without saving the result.
</p>
<p>
Let's go through each instruction step by step to make things easier and review together:
</p>
<p>
<b style="color:cornflowerblue;">test byte ptr [ebp+dwDesiredAccess+3], 40h</b> — This instruction performs a bitwise AND between the two operands but <b style="color:cornflowerblue;">does not store the result</b> anywhere. It only <b style="color:cornflowerblue;">affects the processor flags</b> (FLAGS register) — specifically ZF (Zero Flag), SF (Sign Flag), PF, etc. The <code style="color:chartreuse;">byte ptr</code> means it works on a single byte (8 bits) only, not all 4 bytes.
</p>
<p>
<code style="color:chartreuse;">[ebp+dwDesiredAccess+3]</code> — <code style="color:chartreuse;">ebp</code> is the stack frame base pointer. <code style="color:chartreuse;">dwDesiredAccess</code> is the name of the local variable or parameter. The <code style="color:chartreuse;">+3</code> means it is taking the highest byte of the <code style="color:chartreuse;">dwDesiredAccess</code> DWORD (4 bytes). The highest byte covers bits 24 through 31. The <code style="color:chartreuse;">GENERIC_WRITE</code> flag lives in bit 30, which is inside that top byte. Specifically <code style="color:chartreuse;">0x40000000 >> 24 = 0x40</code>, so it is checking bit 30 of the original value by looking at only the highest byte.
</p>
<p>
<b style="color:cornflowerblue;">mov [ebp+var_8], 1</b> — simply moves the value 1 into a location on the stack.
</p>
<p>
The equivalent C code for this logic is:
</p>

```c
if ((dwDesiredAccess & 0x40000000) == 0) goto loc_7C83D417; // if GENERIC_WRITE bit is NOT set, skip
```

<p>
If the <code style="color:chartreuse;">AND</code> left that bit set, the <code style="color:chartreuse;">ZF</code> flag will be cleared and the <code style="color:chartreuse;">JZ</code> conditional jump will not fire. The jump only happens if the bit <code style="color:chartreuse;">0x40000000</code> is <b style="color:cornflowerblue;">not</b> present in <code style="color:chartreuse;">dwDesiredAccess</code> — in that case the AND result is 0, ZF gets set to 1, and the jump fires.
</p>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>Quick comparison — TEST vs AND, and their relation to CMP vs SUB</b></h2>

<p>
Since we mentioned before that <code style="color:chartreuse;">CMP</code> is the same as <code style="color:chartreuse;">SUB</code> but without saving the result, here is a quick side-by-side for review:
</p>
<p>* <b style="color:cornflowerblue;">AND</b> (e.g. <code style="color:chartreuse;">and eax, 0x40</code>) — performs AND between EAX and 0x40, stores the result in EAX (first operand), and updates ZF, SF, PF.</p>
<p>* <b style="color:cornflowerblue;">TEST</b> (e.g. <code style="color:chartreuse;">test eax, 0x40</code>) — same AND operation but does not store the result. Only updates the flags.</p>
<p>* <b style="color:cornflowerblue;">SUB</b> (e.g. <code style="color:chartreuse;">sub eax, ebx</code>) — subtracts and stores the result in EAX, and updates the flags.</p>
<p>* <b style="color:cornflowerblue;">CMP</b> (e.g. <code style="color:chartreuse;">cmp eax, ebx</code>) — same subtraction but without storing the result. Only updates the flags.</p>

<hr>

<p>
Let's try GCC 4.4.1 on Linux:
</p>

```c
#include <fcntl.h>      // file control flags (O_RDWR, O_CREAT, etc.)
#include <sys/types.h>  // POSIX types
#include <unistd.h>     // POSIX API (close, read, write...)

void main()
{
    int handle;
    handle=open ("file", O_RDWR | O_CREAT); // open file for read+write, create if not exists
};
```

<p>
And this is what comes out:
</p>
<p>
<b>Listing 1.269: GCC 4.4.1</b>
</p>

```nasm
public main
main proc near
var_20 = dword ptr -20h   ; local stack slot
var_1C = dword ptr -1Ch   ; second argument to open() — flags
var_4  = dword ptr -4     ; local variable to store returned handle

    push    ebp
    mov     ebp, esp
    and     esp, 0FFFFFFF0h         ; align stack to 16-byte boundary
    sub     esp, 20h                ; allocate 32 bytes of local stack space
    mov     [esp+20h+var_1C], 42h   ; flags = 0x42 = O_RDWR | O_CREAT
    mov     [esp+20h+var_20], offset aFile ; first argument = pointer to "file" string
    call    _open                   ; call open(filename, flags)
    mov     [esp+20h+var_4], eax    ; store returned file descriptor
    leave                           ; restore stack frame
    retn                            ; return
main endp
```

<p>
If we look inside the <code style="color:chartreuse;">open()</code> function in <code style="color:chartreuse;">libc.so</code>, we will find it is just a syscall (system call):
</p>
<p>
<b>Listing 1.270: open() (libc.so.6)</b>
</p>

```nasm
.text:000BE69B mov edx, [esp+4+mode]     ; load mode argument
.text:000BE69F mov ecx, [esp+4+flags]    ; load flags argument (O_RDWR | O_CREAT = 0x42)
.text:000BE6A3 mov ebx, [esp+4+filename] ; load filename pointer
.text:000BE6A7 mov eax, 5                ; syscall number 5 = sys_open
.text:000BE6AC int 80h                   ; invoke Linux kernel via interrupt 0x80
```

<p>
So the bit fields of <code style="color:chartreuse;">open()</code> are checked somewhere deep inside the Linux kernel. Of course, it is easy to download the Glibc source and the Linux kernel source, but we are interested in understanding the topic without them.
</p>
<p>
So, starting from Linux 2.6, when the syscall <code style="color:chartreuse;">sys_open</code> is invoked, control eventually transfers to <code style="color:chartreuse;">do_sys_open</code>, and from there to the function <code style="color:chartreuse;">do_filp_open()</code> (located in the kernel source tree at <code style="color:chartreuse;">fs/namei.c</code>).
</p>
<p>
Note: besides passing parameters via the stack, there is also a method called <b style="color:cornflowerblue;">fastcall</b> (which we will explain in detail later), which passes some of them via registers. This is faster because the CPU does not need to reach into stack memory to read the parameter values. GCC has the <code style="color:chartreuse;">regparm</code> option, through which you can specify how many parameters can be passed via registers. The Linux 2.6 kernel is compiled with the <code style="color:chartreuse;">-mregparm=3</code> option. What this means for us is that the first 3 parameters will be passed via registers <code style="color:chartreuse;">EAX</code>, <code style="color:chartreuse;">EDX</code>, and <code style="color:chartreuse;">ECX</code>, and the rest via the stack. Of course, if there are fewer than 3 parameters, only part of that register set will be used.
</p>
<p>
The author downloaded the Linux 2.6.31 kernel, compiled it on Ubuntu with <code style="color:chartreuse;">make vmlinux</code>, opened it in IDA, and found the <code style="color:chartreuse;">do_filp_open()</code> function. Here is a part of it with his comments:
</p>
<p>
<b>Listing 1.271: do_filp_open() (Linux kernel 2.6.31)</b>
</p>

```nasm
do_filp_open proc near
...
    push    ebp
    mov     ebp, esp
    push    edi
    push    esi
    push    ebx
    mov     ebx, ecx                ; EBX = open_flag (3rd argument, passed in ECX via regparm)
    add     ebx, 1
    sub     esp, 98h                ; allocate local stack space
    mov     esi, [ebp+arg_4]        ; ESI = acc_mode (5th argument, from stack)
    test    bl, 3                   ; test lowest 2 bits of open_flag
    mov     [ebp+var_80], eax       ; save dfd (1st argument, was in EAX)
    mov     [ebp+var_7C], edx       ; save pathname (2nd argument, was in EDX)
    mov     [ebp+var_78], ecx       ; save open_flag (3rd argument, was in ECX)
    jnz     short loc_C01EF684      ; if bits set, jump to flag-checking block
    mov     ebx, ecx                ; EBX <- open_flag
```

<p>
GCC saves the values of the first 3 parameters into local stack. If this were not done, the compiler would overwrite those registers, and that would be a very tight environment for the compiler's register allocator.
</p>
<p>
Let's find this specific code section:
</p>
<p>
<b>Listing 1.272: do_filp_open() (Linux kernel 2.6.31)</b>
</p>

```nasm
loc_C01EF684:                   ; CODE XREF: do_filp_open+4F
    test    bl, 40h             ; check bit 6 of open_flag = O_CREAT flag (0x40)
    jnz     loc_C01EF810        ; if O_CREAT is set, jump to file-creation path
    mov     edi, ebx            ; EDI = open_flag
    shr     edi, 11h            ; shift right by 17 bits
    xor     edi, 1              ; flip bit 0
    and     edi, 1              ; keep only bit 0
    test    ebx, 10000h         ; check another flag bit
    jz      short loc_C01EF6D3  ; if not set, skip
    or      edi, 2              ; set bit 1 in EDI
```

<p>
The value <code style="color:chartreuse;">0x40</code> is what the <code style="color:chartreuse;">O_CREAT</code> macro equals. The <code style="color:chartreuse;">open_flag</code> is being checked to see if bit <code style="color:chartreuse;">0x40</code> is present, and if that bit is 1, the <code style="color:chartreuse;">JNZ</code> instruction that follows will fire.
</p>

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM</h2>

<p>
The <code style="color:chartreuse;">O_CREAT</code> bit is checked differently in Linux kernel 3.8.0:
</p>
<p>
<b>Listing 1.273: Linux kernel 3.8.0</b>
</p>

```c
struct file *do_filp_open(int dfd, struct filename *pathname,
    const struct open_flags *op)
{
    ...
    filp = path_openat(dfd, pathname, &nd, op, flags | LOOKUP_RCU); // pass flags into path_openat
    ...
}

static struct file *path_openat(int dfd, struct filename *pathname,
    struct nameidata *nd, const struct open_flags *op, int flags)
{
    ...
    error = do_last(nd, &path, file, op, &opened, pathname); // delegate to do_last
    ...
}

static int do_last(struct nameidata *nd, struct path *path,
    struct file *file, const struct open_flags *op,
    int *opened, struct filename *name)
{
    ...
    if (!(open_flag & O_CREAT)) {   // if O_CREAT flag is NOT set
        ...
        error = lookup_fast(nd, path, &inode); // just look up existing file
        ...
    } else {                        // O_CREAT IS set — need to create
        ...
        error = complete_walk(nd);  // complete path resolution for creation
    }
    ...
}
```

<p>
And here is how the ARM-compiled kernel looks in IDA:
</p>
<p>
<b>Listing 1.274: do_last() from vmlinux (IDA)</b>
</p>

```nasm
.text:C0169EA8  MOV     R9, R3          ; R3 = 4th argument = open_flag pointer
...
.text:C0169ED4  LDR     R6, [R9]        ; R6 = open_flag value (load from pointer)
...
.text:C0169F68  TST     R6, #0x40       ; test O_CREAT bit (0x40) in open_flag
.text:C0169F6C  BNE     loc_C016A128    ; if O_CREAT is set, branch to creation path
.text:C0169F70  LDR     R2, [R4,#0x10]
.text:C0169F74  ADD     R12, R4, #8
.text:C0169F78  LDR     R3, [R4,#0xC]
.text:C0169F7C  MOV     R0, R4
.text:C0169F80  STR     R12, [R11,#var_50]
.text:C0169F84  LDRB    R3, [R2,R3]
.text:C0169F88  MOV     R2, R8
.text:C0169F8C  CMP     R3, #0
.text:C0169F90  ORRNE   R1, R1, #3
.text:C0169F94  STRNE   R1, [R4,#0x24]
.text:C0169F98  ANDS    R3, R6, #0x200000
.text:C0169F9C  MOV     R1, R12
.text:C0169FA0  LDRNE   R3, [R4,#0x24]
.text:C0169FA4  ANDNE   R3, R3, #1
.text:C0169FA8  EORNE   R3, R3, #1
.text:C0169FAC  STR     R3, [R11,#var_54]
.text:C0169FB0  SUB     R3, R11, #-var_38
.text:C0169FB4  BL      lookup_fast     ; O_CREAT not set → just look up existing file

...

.text:C016A128  loc_C016A128            ; CODE XREF: do_last.isra.14+DC
.text:C016A128  MOV     R0, R4
.text:C016A12C  BL      complete_walk   ; O_CREAT is set → complete path for file creation
```

<p>
Here <code style="color:chartreuse;">TST</code> is the ARM equivalent of the <code style="color:chartreuse;">TEST</code> instruction in x86. We can clearly see the two code paths — <code style="color:chartreuse;">lookup_fast()</code> executes in one case and <code style="color:chartreuse;">complete_walk()</code> in the other. This matches the source code of <code style="color:chartreuse;">do_last()</code> exactly. The <code style="color:chartreuse;">O_CREAT</code> macro equals <code style="color:chartreuse;">0x40</code> here as well.
</p>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>Quick comparison — TST vs TEST in practice</b></h2>

<p>* <b style="color:cornflowerblue;">x86 TEST</b>: <code style="color:chartreuse;">test reg, imm</code> — performs AND and updates SF, ZF, PF. Supports operands of any size (byte/word/dword).</p>
<p>* <b style="color:cornflowerblue;">ARM TST</b>: <code style="color:chartreuse;">TST Rn, Rm</code> or <code style="color:chartreuse;">TST Rn, #imm</code> — performs AND and updates the N (Negative), Z (Zero), and C (Carry in shift cases) flags. The most common use is checking the Z flag. It does not store the result either.</p>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.28.2 Setting and clearing specific bits</b></h1>

<img src="/assets/img/clearingspecific.jpg" alt="Specific bit clearing">

<hr>
<p>
An example:
</p>

```c
#include <stdio.h>
 
// check if a specific bit is set in flag
#define IS_SET(flag, bit) ((flag) & (bit))
 
// set a specific bit in var (force it to 1)
#define SET_BIT(var, bit) ((var) |= (bit))
 
// clear a specific bit in var (force it to 0)
#define REMOVE_BIT(var, bit) ((var) &= ~(bit))
 
int f(int a)
{
    int rt = a;
    SET_BIT(rt, 0x4000);    // set bit 14
    REMOVE_BIT(rt, 0x200);  // clear bit 9
    return rt;
}
 
int main()
{
    f(0x12340678);
}
```
 
<p>
Let's quickly explain the C code so we can connect everything together:
</p>
<p>
<b style="color:cornflowerblue;">#define IS_SET(flag, bit) ((flag) & (bit))</b> — This macro checks whether the desired bit is set (i.e. equals 1). It uses the <code style="color:chartreuse;">&</code> (AND) operation between <code style="color:chartreuse;">flag</code> (the number containing the bits) and <code style="color:chartreuse;">bit</code> (the mask with only one bit set). If the result is non-zero, the bit is set. If zero, the bit is clear.
</p>
<p>
<b style="color:cornflowerblue;">#define SET_BIT(var, bit) ((var) |= (bit))</b> — Uses the <code style="color:chartreuse;">|=</code> (OR assignment) operation, meaning <code style="color:chartreuse;">var = var | bit</code>. OR forces the bits in <code style="color:chartreuse;">bit</code> to become 1 in <code style="color:chartreuse;">var</code>, without affecting any other bits (if they were already 1 they stay 1, if 0 they stay 0).
</p>
<p>
<b style="color:cornflowerblue;">#define REMOVE_BIT(var, bit) ((var) &= ~(bit))</b> — Uses <code style="color:chartreuse;">&=</code> with <code style="color:chartreuse;">~(bit)</code>. The <code style="color:chartreuse;">~</code> is bitwise NOT (every bit flips: 0 becomes 1, 1 becomes 0). So <code style="color:chartreuse;">~(bit)</code> produces a mask where all bits are 1 except the one we want to clear which becomes 0. When we do <code style="color:chartreuse;">var & mask</code>, the bit that is 0 in the mask gets cleared in <code style="color:chartreuse;">var</code>, while all other bits stay unchanged.
</p>
<hr>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">x86</h2>
 
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Non-optimizing MSVC</h3>
 
<p>
What we get (MSVC 2010):
</p>

```nasm
_rt$ = -4       ; size = 4 ; local variable rt on stack
_a$  = 8        ; size = 4 ; argument a on stack
 
_f PROC
    push    ebp
    mov     ebp, esp
    push    ecx                             ; allocate space for local variable rt
    mov     eax, DWORD PTR _a$[ebp]         ; load argument a into EAX
    mov     DWORD PTR _rt$[ebp], eax        ; rt = a
 
    mov     ecx, DWORD PTR _rt$[ebp]        ; load rt into ECX
    or      ecx, 16384                      ; ECX |= 0x4000 — set bit 14 (SET_BIT)
    mov     DWORD PTR _rt$[ebp], ecx        ; store updated rt
 
    mov     edx, DWORD PTR _rt$[ebp]        ; reload rt into EDX
    and     edx, -513                       ; EDX &= 0xFFFFFDFF — clear bit 9 (REMOVE_BIT)
    mov     DWORD PTR _rt$[ebp], edx        ; store updated rt
 
    mov     eax, DWORD PTR _rt$[ebp]        ; load final rt into EAX (return value)
    mov     esp, ebp
    pop     ebp
    ret     0
_f ENDP
```
 
<p>
The <code style="color:chartreuse;">OR</code> instruction sets one bit in the register, leaving all other bits untouched.
</p>
<p>
The <code style="color:chartreuse;">AND</code> instruction clears one bit. We can say that <code style="color:chartreuse;">AND</code> copies all bits except one. In the second operand of <code style="color:chartreuse;">AND</code>, the bits you want to keep are set to 1, and the one bit you want to clear is set to 0 in the mask. That is the easiest way to remember the logic.
</p>
<hr>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">x32dbg</h2>
 
<p>
Let's try this example in x32dbg.
</p>
<p>
First, let's look at the binary representations of the constants we will be using:
</p>
<p>
The inverted value of <code style="color:chartreuse;">0x200</code> is <code style="color:chartreuse;">0xFFFFFDFF</code> (<code style="color:chartreuse;">0b11111111111111111110111111111</code>).
</p>
<p>
<code style="color:chartreuse;">0x4000</code> (<code style="color:chartreuse;">0b00000000000000100000000000000</code>) — bit 15.
</p>
<p>
The input value is: <code style="color:chartreuse;">0x12340678</code> (<code style="color:chartreuse;">0b10010001101000000011001111000</code>). Let's see how it loads:
</p>
<img src="/assets/x32dbg2/bits_1.png" alt="input value loaded" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
And here is the result after the OR executes:
</p>
<img src="/assets/x32dbg2/bits_2.png" alt="after OR instruction" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
I was verifying the result with a calculator before it appeared, just to make sure I understood and was following along correctly.
</p>
<p>
Bit 15 got set: <code style="color:chartreuse;">0x12344678</code> (<code style="color:chartreuse;">0b10010001101000100011001111000</code>).
</p>
<p>
The value gets reloaded (because the compiler is not in optimization mode):
</p>
<img src="/assets/x32dbg2/bits_3.png" alt="value reloaded" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
After the <code style="color:chartreuse;">AND</code> instruction executes:
</p>
<img src="/assets/x32dbg2/bits_4.png" alt="after AND instruction" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
Bit 10 got cleared (in other words, all bits were copied except bit 10), and the final value is now: <code style="color:chartreuse;">0x12344478</code> (<code style="color:chartreuse;">0b10010001101000100010001111000</code>).
</p>
<hr>
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing MSVC</h3>
 
<p>
If we compile it in MSVC with optimization enabled (<code style="color:chartreuse;">/Ox</code>), the code becomes shorter:
</p>
<p>
<b>Listing 1.276: Optimizing MSVC</b>
</p>


```nasm
_a$ = 8        ; size = 4 ; argument a passed on stack
_f PROC
    mov     eax, DWORD PTR _a$[esp-4]  ; load argument a directly from stack into EAX
    and     eax, -513                  ; EAX &= 0xFFFFFDFF — clear bit 9 first
    or      eax, 16384                 ; EAX |= 0x4000 — set bit 14
    ret     0                          ; return EAX as result
_f ENDP
```
 
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Non-optimizing GCC</h3>
 
<p>
Let's try GCC 4.4.1 without optimization:
</p>

```nasm
public f
f proc near
var_4 = dword ptr -4    ; local variable rt on stack
arg_0 = dword ptr 8     ; argument a on stack
 
    push    ebp
    mov     ebp, esp
    sub     esp, 10h                    ; allocate local stack space
    mov     eax, [ebp+arg_0]            ; load argument a into EAX
    mov     [ebp+var_4], eax            ; rt = a
    or      [ebp+var_4], 4000h          ; rt |= 0x4000 — set bit 14 (directly on memory)
    and     [ebp+var_4], 0FFFFFDFFh     ; rt &= 0xFFFFFDFF — clear bit 9 (directly on memory)
    mov     eax, [ebp+var_4]            ; load final rt into EAX (return value)
    leave
    retn
f endp
```
 
<p>
There is some redundant code present, but it is shorter than the non-optimizing MSVC version.
</p>
<p>
Now let's try GCC with optimization <code style="color:chartreuse;">-O3</code> enabled:
</p>
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing GCC</h3>
 
<p>
<b>Listing 1.278: Optimizing GCC</b>
</p>


```nasm
public f
f proc near
arg_0 = dword ptr 8     ; argument a on stack
 
    push    ebp
    mov     ebp, esp
    mov     eax, [ebp+arg_0]    ; load argument a into EAX
    pop     ebp
    or      ah, 40h             ; set bit 14 — operates on AH (bits 8-15 of EAX), 0x40 in AH = 0x4000 in EAX
    and     ah, 0FDh            ; clear bit 9 — 0xFD in AH = 0xFFFFFDFF mask applied to bits 8-15
    retn
f endp
```
 

<p>
That came out shorter. Worth noting that the compiler worked with a portion of the EAX register via the <code style="color:chartreuse;">AH</code> register — which is bits 8 through 15 (inclusive) of EAX.
</p>
<img src="/assets/img/tablee.jpeg" alt="x86 register layout AX AH AL" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
<b style="color:cornflowerblue;">Note:</b> The old 16-bit 8086 processor had an accumulator called <code style="color:chartreuse;">AX</code>, which was composed of two 8-bit halves: AL (low byte) and AH (high byte). In the 80386, almost all registers were extended to 32 bits — the accumulator became EAX — but for compatibility, the old parts of it remain accessible as <code style="color:chartreuse;">AX/AH/AL</code>.
</p>
<p>
Since all x86 processors are descendants of the 16-bit 8086, the old 16-bit instructions are shorter in size than the new 32-bit ones. That is why <code style="color:chartreuse;">or ah, 40h</code> takes only 3 bytes. It would have been more natural to use <code style="color:chartreuse;">or eax, 04000h</code> but that takes 5 bytes, or even 6 (if the first operand register is not <code style="color:chartreuse;">EAX</code>).
</p>
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing GCC and regparm</h3>
 
<p>
It becomes even shorter if we enable both the <code style="color:chartreuse;">-O3</code> optimization flag and <code style="color:chartreuse;">regparm=3</code>.
</p>
<p>
<b>Listing 1.279: Optimizing GCC</b>
</p>


```nasm
public f
f proc near
    push    ebp
    or      ah, 40h         ; argument a is already in EAX (regparm=3) — set bit 14 via AH
    mov     ebp, esp
    and     ah, 0FDh        ; clear bit 9 via AH
    pop     ebp
    retn
f endp
```
 

<p>
Indeed, the first argument is already loaded in EAX, so we can operate on it directly in place. Worth noting that both the function prologue (<code style="color:chartreuse;">push ebp / mov ebp, esp</code>) and epilogue (<code style="color:chartreuse;">pop ebp</code>) could easily be removed here, but GCC is apparently not aggressive enough to do that level of code-size optimization. Either way, short functions like this are best candidates for inlining.
</p>
<hr>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM + Optimizing Keil 6/2013 (ARM mode)</h2>
 
<p>
<b>Listing 1.280: Optimizing Keil 6/2013 (ARM mode)</b>
</p>


```nasm
02 0C C0 E3   BIC R0, R0, #0x200   ; clear bit 9 — BIC = Bitwise bit Clear (AND with inverted mask)
01 09 80 E3   ORR R0, R0, #0x4000  ; set bit 14 — ORR = logical OR
1E FF 2F E1   BX LR                ; return
```
 

<p>
<code style="color:chartreuse;">BIC</code> (Bitwise bit Clear) is an instruction for clearing specific bits. It works exactly like <code style="color:chartreuse;">AND</code> but with an inverted (NOT) operand — meaning it is equivalent to a <code style="color:chartreuse;">NOT</code> + <code style="color:chartreuse;">AND</code> pair.
</p>
<p>
<code style="color:chartreuse;">ORR</code> is "logical or", equivalent to <code style="color:chartreuse;">OR</code> in x86.
</p>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM + Optimizing Keil 6/2013 (Thumb mode)</h2>
 
<p>
<b>Listing 1.281: Optimizing Keil 6/2013 (Thumb mode)</b>
</p>


```nasm
01 21 89 03   MOVS R1, #0x4000     ; R1 = 0x4000 (the bit we want to set)
08 43         ORRS R0, R1          ; R0 |= R1 — set bit 14
49 11         ASRS R1, R1, #5      ; R1 = 0x4000 >> 5 = 0x200 (generate 0x200 from 0x4000)
88 43         BICS R0, R1          ; R0 &= ~R1 — clear bit 9
70 47         BX LR                ; return
```
 

<p>
Here Keil decided in Thumb mode to generate <code style="color:chartreuse;">0x200</code> from <code style="color:chartreuse;">0x4000</code> rather than loading it directly — it is more compact that way. Using <code style="color:chartreuse;">ASRS</code> (arithmetic shift right), the value is computed as <code style="color:chartreuse;">0x4000 ≫ 5</code>.
</p>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM + Optimizing Xcode 4.6.3 (LLVM) (ARM mode)</h2>
 
<p>
<b>Listing 1.282: Optimizing Xcode 4.6.3 (LLVM) (ARM mode)</b>
</p>


```nasm
42 0C C0 E3   BIC R0, R0, #0x4200  ; clear bits covered by 0x4200 mask (bits 14 and 9 together)
01 09 80 E3   ORR R0, R0, #0x4000  ; set bit 14
1E FF 2F E1   BX LR                 ; return
```
 

<p>
The code executed by LLVM, if written as C code, would look something like this:
</p>


```c
REMOVE_BIT(rt, 0x4200); // clear bits 14 and 9 together using combined mask
SET_BIT(rt, 0x4000);    // then set bit 14 back
```
 

<p>
It does exactly what we want. But why <code style="color:chartreuse;">0x4200</code>? This is probably an artifact from the LLVM optimizer — likely a quirk in the compiler's optimizer, but the compiled code works correctly regardless.
</p>
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM: more about the BIC instruction</h3>
 
<p>
Let's reformulate the example in a simpler way:
</p>


```c
int f(int a)
{
    int rt = a;
    REMOVE_BIT(rt, 0x1234); // clear bits defined by mask 0x1234
    return rt;
}
```
 

<p>
Then Keil 5.03 optimizing in ARM mode produces:
</p>


```nasm
f PROC
    BIC r0, r0, #0x1000     ; clear upper part of mask (0x1000)
    BIC r0, r0, #0x234      ; clear lower part of mask (0x234)
    BX  lr                  ; return
ENDP
```
 

<p>
Two <code style="color:chartreuse;">BIC</code> instructions — meaning the bits of <code style="color:chartreuse;">0x1234</code> were cleared in two steps. This is because <code style="color:chartreuse;">0x1234</code> cannot be encoded into a single BIC instruction, but <code style="color:chartreuse;">0x1000</code> and <code style="color:chartreuse;">0x234</code> can each be encoded separately.
</p>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM64: Optimizing GCC (Linaro) 4.9</h2>
 
<p>
Optimizing GCC targeting ARM64 can use the <code style="color:chartreuse;">AND</code> instruction instead of <code style="color:chartreuse;">BIC</code>:
</p>
<p>
<b>Listing 1.283: Optimizing GCC (Linaro) 4.9</b>
</p>


```nasm
f:
    and w0, w0, -513        ; W0 &= 0xFFFFFFFFFFFFFDFF — clear bit 9
    orr w0, w0, 16384       ; W0 |= 0x4000 — set bit 14
    ret                     ; return
```
 

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM64: Non-optimizing GCC (Linaro) 4.9</h2>
 
<p>
Non-optimizing GCC generates more redundant code, but it works exactly the same as the optimizing version:
</p>


```nasm
f:
    sub     sp, sp, #32             ; allocate local stack space
    str     w0, [sp, 12]            ; spill argument a onto stack
    ldr     w0, [sp, 12]            ; reload a
    str     w0, [sp, 28]            ; rt = a
    ldr     w0, [sp, 28]            ; reload rt
    orr     w0, w0, 16384           ; W0 |= 0x4000 — set bit 14
    str     w0, [sp, 28]            ; store rt
    ldr     w0, [sp, 28]            ; reload rt
    and     w0, w0, -513            ; W0 &= 0xFFFFFDFF — clear bit 9
    str     w0, [sp, 28]            ; store rt
    ldr     w0, [sp, 28]            ; reload rt (return value)
    add     sp, sp, 32              ; deallocate local stack
    ret                             ; return
```
 

<hr>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">MIPS</h2>
 
<p>
<b>Listing 1.285: Optimizing GCC 4.4.5 (IDA)</b>
</p>


```nasm
f:
; $a0 = a (input argument)
    ori     $a0, 0x4000         ; $a0 = a | 0x4000 — set bit 14 (ORI = OR with Immediate)
    li      $v0, 0xFFFFFDFF     ; load mask 0xFFFFFDFF into $v0 (cannot embed in AND directly)
    jr      $ra                 ; return (branch delay slot executes next instruction first)
    and     $v0, $a0, $v0       ; $v0 = (a | 0x4000) & 0xFFFFFDFF — clear bit 9, final result
```
 

<p>
<code style="color:chartreuse;">ORI</code> is of course OR. The "I" in the instruction name means the value is embedded (immediate) in the machine code. But then we have <code style="color:chartreuse;">AND</code>. There is no way to use <code style="color:chartreuse;">ANDI</code> because the number <code style="color:chartreuse;">0xFFFFFDFF</code> cannot be embedded in a single instruction, so the compiler had to load <code style="color:chartreuse;">0xFFFFFDFF</code> into register <code style="color:chartreuse;">$v0</code> first and then generate an <code style="color:chartreuse;">AND</code> that takes all its values from registers.
</p>
<hr>
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.28.3 Shifts</b></h1>
<img src="/assets/img/shifts.jpg" alt="Shifts">
<hr>
<p>
Bit shifts in C/C++ are performed using the <code style="color:chartreuse;">≪</code> and <code style="color:chartreuse;">≫</code> operators. The x86 architecture has the <code style="color:chartreuse;">SHL</code> (Shift Left) and <code style="color:chartreuse;">SHR</code> (Shift Right) instructions for this purpose. Shift instructions are used extensively in division and multiplication by powers of 2 (such as 1, 2, 4, 8, etc.).
</p>
<p>
Shift operations are also very important because they are heavily used for isolating a specific bit or for building a value from several scattered bits.
</p>
</div>