---
title: "CH1.30 Structures"
published: 2026-07-12
description: "How C structs are represented in memory and assembly — SYSTEMTIME example, field offsets, and replacing a struct with an array"
author: "0xV3n0m"
category: "Re4B"
tags: ["Reverse Engineering", "Books", "Assembly"]
image: "/assets/img/reversee33.jpg"
draft: false
lang: "eng"

# Series configuration
type: "course"
series: "re4b"
seriesOrder: 33
seriesTitle: "Reverse Engineering for Beginners"
seriesDescription: "A beginner-friendly book covering x86/x64 reverse engineering through real compiler output and code patterns."
seriesImage: "/assets/img/RE4B.png"
---
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<div style="line-height:1.9; font-size:21px; direction:ltr;">
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.30 Structures</b></h1>
<hr>
<p>
In C/C++, a structure (struct) is a group of variables packed together in one block, sitting next to each other in memory. These variables can be of different types (int, char, float, and so on). The struct gives a name to this bundle, and gives a name to each field so we can access it.
</p>
<hr>
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.30.1 MSVC: SYSTEMTIME example</b></h1>
<img src="/assets/img/SYSTEMTIMEexample.png" alt="SYSTEMTIME example" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<hr>
<p>
The author starts by taking the Win32 <code style="color:chartreuse;">SYSTEMTIME</code> structure, which describes time.
</p>
<p>
<b>Listing 1.329: WinBase.h</b>
</p>


```c
typedef struct _SYSTEMTIME {
    WORD wYear;          // year (e.g. 2026)
    WORD wMonth;         // month (1–12)
    WORD wDayOfWeek;     // day of week (0=Sunday, 6=Saturday)
    WORD wDay;           // day of month (1–31)
    WORD wHour;          // hour (0–23)
    WORD wMinute;        // minute (0–59)
    WORD wSecond;        // second (0–59)
    WORD wMilliseconds;  // milliseconds (0–999)
} SYSTEMTIME, *PSYSTEMTIME;
```
 

<p>
Let's write a C function to get the current time:
</p>


```c
#include <windows.h>
#include <stdio.h>
 
void main()
{
    SYSTEMTIME t;              // declare a SYSTEMTIME struct on the stack (16 bytes)
    GetSystemTime(&t);         // fill the struct with current UTC time
    printf("%04d-%02d-%02d %02d:%02d:%02d\n",
           t.wYear, t.wMonth, t.wDay,
           t.wHour, t.wMinute, t.wSecond);
    return;
}
```
 
<p>
<b>We get (MSVC 2010):</b>
</p>
<p>
<b>Listing 1.330: MSVC 2010 /GS-</b>
</p>


```nasm
_t$ = -16      ; size = 16 bytes ; SYSTEMTIME struct lives here on the stack
_main PROC
    push    ebp
    mov     ebp, esp
    sub     esp, 16                         ; reserve 16 bytes on stack for the struct (8 WORDs × 2 bytes)
 
    lea     eax, DWORD PTR _t$[ebp]         ; EAX = address of the struct (pointer to wYear = pointer to whole struct)
    push    eax                             ; push pointer as argument to GetSystemTime
    call    DWORD PTR __imp__GetSystemTime@4 ; call GetSystemTime(&t) — fills all 8 fields
 
    movzx   ecx, WORD PTR _t$[ebp+12]      ; load wSecond (offset 12 from struct start)
    push    ecx                             ; push as 7th argument to printf
    movzx   edx, WORD PTR _t$[ebp+10]      ; load wMinute (offset 10)
    push    edx                             ; push as 6th argument
    movzx   eax, WORD PTR _t$[ebp+8]       ; load wHour (offset 8)
    push    eax                             ; push as 5th argument
    movzx   ecx, WORD PTR _t$[ebp+6]       ; load wDay (offset 6)
    push    ecx                             ; push as 4th argument
    movzx   edx, WORD PTR _t$[ebp+2]       ; load wMonth (offset 2)
    push    edx                             ; push as 3rd argument
    movzx   eax, WORD PTR _t$[ebp]         ; load wYear (offset 0 — start of struct)
    push    eax                             ; push as 2nd argument
    push    OFFSET $SG78811                 ; push format string as 1st argument
    call    _printf                         ; call printf(format, year, month, day, hour, min, sec)
    add     esp, 28                         ; clean up stack (7 arguments × 4 bytes)
    xor     eax, eax                        ; return 0
    mov     esp, ebp
    pop     ebp
    ret     0
_main ENDP
```
 
<p>
Let me explain this step by step to make it as clear as possible.
</p>
<p>
As we said, the fields are stored in the order you declare them. Each field takes space according to its type. In our example:
</p>
<p>* <code style="color:chartreuse;">WORD</code> = 2 bytes (16 bits)</p>
<p>* 8 fields × 2 bytes = <b style="color:cornflowerblue;">16 bytes total</b></p>
<p>
<b>Field layout in memory (offsets from the start of the struct):</b>
</p>
<table style="border-collapse:collapse; width:100%; margin:20px 0; font-size:18px;">
  <thead>
    <tr style="background:#161b22;">
      <th style="border:1px solid #30363d; padding:10px 16px; text-align:left; color:#9a3ba6;">Field</th>
      <th style="border:1px solid #30363d; padding:10px 16px; text-align:left; color:#9a3ba6;">Offset (bytes)</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background:#0d1117; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">wYear</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">0</td>
    </tr>
    <tr style="background:#161b22; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">wMonth</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">2</td>
    </tr>
    <tr style="background:#0d1117; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">wDayOfWeek</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">4</td>
    </tr>
    <tr style="background:#161b22; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">wDay</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">6</td>
    </tr>
    <tr style="background:#0d1117; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">wHour</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">8</td>
    </tr>
    <tr style="background:#161b22; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">wMinute</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">10</td>
    </tr>
    <tr style="background:#0d1117; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">wSecond</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">12</td>
    </tr>
    <tr style="background:#161b22; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">wMilliseconds</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">14</td>
    </tr>
  </tbody>
</table>
<p>
The struct begins with the field <code style="color:chartreuse;">wYear</code>. We can say that a pointer to the <code style="color:chartreuse;">SYSTEMTIME</code> struct is passed to <code style="color:chartreuse;">GetSystemTime()</code>, but we could equally say that a pointer to the field <code style="color:chartreuse;">wYear</code> is passed — it is the same thing. <code style="color:chartreuse;">GetSystemTime()</code> writes the current year into the WORD pointer it receives, then advances 2 bytes forward, writes the current month, and so on.
</p>
<hr>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">x32dbg</h2>
 
<p>
Let's compile this example in MSVC with the options <code style="color:chartreuse;">/GS- /MD</code> and run it in x32dbg using this command:
</p>


```shell
cl /Od /Zi /GS- systemtime.c
```
 
<p>
Let's open the data and stack view at the address being passed as the first argument to <code style="color:chartreuse;">GetSystemTime()</code>, and wait until it executes. We see this:
</p>
<img src="/assets/x32dbg2/systemtime_1.png" alt="GetSystemTime struct in memory" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
The system time at the moment of execution on my machine is July 9, 2026, 20:59:51.
</p>
<p>
<b>Listing 1.331: printf() output</b>
</p>
<img src="/assets/x32dbg2/systemtime_2.png" alt="printf output" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
And these are the values currently in memory:
</p>
<table style="border-collapse:collapse; width:100%; margin:20px 0; font-size:18px;">
  <thead>
    <tr style="background:#161b22;">
      <th style="border:1px solid #30363d; padding:10px 16px; text-align:left; color:#9a3ba6;">Hex</th>
      <th style="border:1px solid #30363d; padding:10px 16px; text-align:left; color:#9a3ba6;">Decimal</th>
      <th style="border:1px solid #30363d; padding:10px 16px; text-align:left; color:#9a3ba6;">Field</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background:#0d1117; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">0x07EA</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">2026</td>
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">wYear</code></td>
    </tr>
    <tr style="background:#161b22; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">0x0007</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">7</td>
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">wMonth</code></td>
    </tr>
    <tr style="background:#0d1117; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">0x0004</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">4</td>
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">wDayOfWeek</code></td>
    </tr>
    <tr style="background:#161b22; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">0x0009</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">9</td>
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">wDay</code></td>
    </tr>
    <tr style="background:#0d1117; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">0x0014</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">20</td>
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">wHour</code></td>
    </tr>
    <tr style="background:#161b22; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">0x002F</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">47</td>
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">wMinute</code></td>
    </tr>
    <tr style="background:#0d1117; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">0x0035</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">53</td>
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">wSecond</code></td>
    </tr>
    <tr style="background:#161b22; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">0x0209</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">521</td>
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">wMilliseconds</code></td>
    </tr>
  </tbody>
</table>
<p>
The same values appear in the stack window, but grouped as 32-bit values. Then <code style="color:chartreuse;">printf()</code> simply takes the values it needs and prints them to the screen. Some values are not printed by <code style="color:chartreuse;">printf()</code> (such as <code style="color:chartreuse;">wDayOfWeek</code> and <code style="color:chartreuse;">wMilliseconds</code>), but they are sitting in memory right now, available for use.
</p>
<hr>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Replacing the structure with array</h2>
 
<p>
The author pointed out that the fact that struct fields are simply variables sitting next to each other can be easily demonstrated by doing the following. Keeping the definition of <code style="color:chartreuse;">SYSTEMTIME</code> in mind, we can rewrite the simple example like this:
</p>


```c
#include <windows.h>
#include <stdio.h>
 
void main()
{
    WORD array[8];          // plain array of 8 WORDs — same memory layout as SYSTEMTIME
    GetSystemTime(array);   // pass array as if it were a SYSTEMTIME pointer
    printf("%04d-%02d-%02d %02d:%02d:%02d\n",
           array[0] /* wYear */,  array[1] /* wMonth */, array[3] /* wDay */,
           array[4] /* wHour */,  array[5] /* wMinute */, array[6] /* wSecond */);
    return;
}
```
 
<p>
The compiler only issues a warning — just a reminder that you are doing something that is not type-safe:
</p>


```text
systemtime2.c(7) : warning C4133: 'function' : incompatible types - from 'WORD [8]' to 'LPSYSTEMTIME'
```
 
<p>
But it still generates this code:
</p>
<p>
<b>Listing 1.332: Non-optimizing MSVC 2010</b>
</p>


```nasm
$SG78573 DB '%04d-%02d-%02d %02d:%02d:%02d', 0aH, 00H  ; format string
 
_array$ = -16      ; size = 16 bytes ; the array lives here on the stack
_main PROC
    push    ebp
    mov     ebp, esp
    sub     esp, 16                         ; allocate 16 bytes for the array (same as the struct)
 
    lea     eax, DWORD PTR _array$[ebp]     ; EAX = base address of the array
    push    eax                             ; pass as argument to GetSystemTime
    call    DWORD PTR __imp__GetSystemTime@4 ; GetSystemTime fills array[0..7] with time fields
 
    movzx   ecx, WORD PTR _array$[ebp+12]  ; array[6] = wSecond (offset 12)
    push    ecx
    movzx   edx, WORD PTR _array$[ebp+10]  ; array[5] = wMinute (offset 10)
    push    edx
    movzx   eax, WORD PTR _array$[ebp+8]   ; array[4] = wHour (offset 8)
    push    eax
    movzx   ecx, WORD PTR _array$[ebp+6]   ; array[3] = wDay (offset 6)
    push    ecx
    movzx   edx, WORD PTR _array$[ebp+2]   ; array[1] = wMonth (offset 2)
    push    edx
    movzx   eax, WORD PTR _array$[ebp]     ; array[0] = wYear (offset 0)
    push    eax
    push    OFFSET $SG78573                 ; format string
    call    _printf
    add     esp, 28                         ; clean up stack
    xor     eax, eax
    mov     esp, ebp
    pop     ebp
    ret     0
_main ENDP
```
 
<p>
It does exactly the same work. In this code specifically, one cannot say with certainty whether a struct was defined or an array — they look identical at the assembly level.
</p>
<p>
This is also a reminder that a struct can be changed or replaced by developers over time, and the assembly output would still look the same.
</p>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.30.2 Let's allocate space for a structure using malloc()</b></h1>
 <img src="/assets/img/malloc_example.png" alt="malloc example" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<hr>
<p>
Sometimes it is easier to place structures not on the local stack, but on the heap.
</p>
<p>
Let's first quickly explain what the heap is.
</p>
<p>
The <b style="color:cornflowerblue;">Heap</b> is a region in a program's memory used for Dynamic Memory Allocation. That means when you need to reserve space in memory <b style="color:cornflowerblue;">at runtime</b> and you don't know its size until that moment, you use the Heap.
</p>
 
```c
#include <windows.h>
#include <stdio.h>
 
void main()
{
    SYSTEMTIME *t;
    t = (SYSTEMTIME *)malloc(sizeof(SYSTEMTIME)); // allocate a SYSTEMTIME-sized block on the heap
    GetSystemTime(t);                             // fill the struct with current system time
    printf("%04d-%02d-%02d %02d:%02d:%02d\n",
           t->wYear, t->wMonth, t->wDay,
           t->wHour, t->wMinute, t->wSecond);    // print the time fields
    free(t);                                      // release the heap memory
    return;
}
```
 
<p>
Let's compile it now with optimization (<code style="color:chartreuse;">/Ox</code>) so it's easier to see what we need.
</p>
 
<p><b style="color:cornflowerblue;">Listing 1.333: Optimizing MSVC</b></p>
 
```nasm
_main PROC
    push esi                                        ; save old ESI value to restore later
    push 16                                         ; push 16 onto the stack as argument to malloc
    call _malloc                                    ; call malloc(16)
    add esp, 4                                      ; adjust the stack after the call (remove the argument)
    mov esi, eax                                    ; ESI = address of the new block (return value from malloc)
    push esi                                        ; push the address as argument to GetSystemTime
    call DWORD PTR __imp__GetSystemTime@4           ; call GetSystemTime(esi)
    ; now ESI holds the address of the struct filled with data
    movzx eax, WORD PTR [esi+12]                   ; read wSecond (offset 12) and zero-extend to 32 bits
    movzx ecx, WORD PTR [esi+10]                   ; read wMinute (offset 10)
    movzx edx, WORD PTR [esi+8]                    ; read wHour (offset 8)
    push eax                                        ; push wSecond
    movzx eax, WORD PTR [esi+6]                    ; read wDay (offset 6)
    push ecx                                        ; push wMinute
    movzx ecx, WORD PTR [esi+2]                    ; read wMonth (offset 2)
    push edx                                        ; push wHour
    movzx edx, WORD PTR [esi]                      ; read wYear (offset 0)
    push eax                                        ; push wDay
    push ecx                                        ; push wMonth
    push edx                                        ; push wYear
    push OFFSET $SG78833                           ; push format string pointer
    call _printf                                    ; print
    push esi                                        ; push address to free
    call _free                                      ; release the memory
    add esp, 32                                     ; adjust stack after printf and free (all arguments)
    xor eax, eax                                    ; eax = 0 (main return value)
    pop esi                                         ; restore old ESI
    ret 0
_main ENDP
```
 
<p>
Here we find <code style="color:chartreuse;">sizeof(SYSTEMTIME) = 16</code>, which is the exact number of bytes that will be allocated by <code style="color:chartreuse;">malloc()</code>. As for <code style="color:chartreuse;">malloc()</code>, it returns a pointer to the new memory block in register <code style="color:chartreuse;">EAX</code>, which then moves to register <code style="color:chartreuse;">ESI</code>. The Win32 function <code style="color:chartreuse;">GetSystemTime()</code> takes care of preserving the value in <code style="color:chartreuse;">ESI</code>.
</p>
<p>
(A small note about <code style="color:chartreuse;">ESI</code>: it is a non-volatile register in the Windows x86 calling convention. This means any function (like <code style="color:chartreuse;">malloc</code>, <code style="color:chartreuse;">GetSystemTime</code>, or <code style="color:chartreuse;">printf</code>) may use and modify it. So if we want to keep a value in it throughout the function, that is why it is not saved here and continues to be used after the <code style="color:chartreuse;">GetSystemTime()</code> call.)
</p>
<p>
There is a new instruction <code style="color:chartreuse;">MOVZX</code> (Move with Zero eXtend). It is used in most cases like <code style="color:chartreuse;">MOVSX</code>, but it sets the remaining bits to 0. This is because <code style="color:chartreuse;">printf()</code> needs a 32-bit <code style="color:chartreuse;">int</code>, but we have a <code style="color:chartreuse;">WORD</code> in the struct which is an unsigned 16-bit type. That is why when copying the value from a <code style="color:chartreuse;">WORD</code> to an <code style="color:chartreuse;">int</code>, bits 16 through 31 must be zeroed out, since they might contain random noise left over from previous operations on the registers.
</p>
<p>
In this example, we can represent the structure as an array of 8 <code style="color:chartreuse;">WORD</code>s:
</p>
 
```c
#include <windows.h>
#include <stdio.h>
 
void main()
{
    WORD *t;
    t = (WORD *)malloc(16);                        // allocate 16 bytes on the heap
    GetSystemTime(t);                              // fill with system time (treats buffer as SYSTEMTIME)
    printf("%04d-%02d-%02d %02d:%02d:%02d\n",
           t[0] /* wYear */, t[1] /* wMonth */, t[3] /* wDay */,
           t[4] /* wHour */, t[5] /* wMinute */, t[6] /* wSecond */); // access fields by index
    free(t);                                       // release the memory
    return;
}
```
 
<p>
And this is what it produces:
</p>
 
<p><b style="color:cornflowerblue;">Listing 1.334: Optimizing MSVC</b></p>
 
```nasm
$SG78594 DB '%04d-%02d-%02d %02d:%02d:%02d', 0aH, 00H  ; format string with newline and null terminator
_main PROC
    push esi
    push 16                                         ; push size argument to malloc
    call _malloc                                    ; call malloc(16)
    add esp, 4                                      ; clean up stack
    mov esi, eax                                    ; ESI = pointer to allocated block
    push esi                                        ; push pointer as argument to GetSystemTime
    call DWORD PTR __imp__GetSystemTime@4           ; call GetSystemTime
    movzx eax, WORD PTR [esi+12]                   ; read wSecond (offset 12), zero-extend
    movzx ecx, WORD PTR [esi+10]                   ; read wMinute (offset 10), zero-extend
    movzx edx, WORD PTR [esi+8]                    ; read wHour (offset 8), zero-extend
    push eax                                        ; push wSecond
    movzx eax, WORD PTR [esi+6]                    ; read wDay (offset 6), zero-extend
    push ecx                                        ; push wMinute
    movzx ecx, WORD PTR [esi+2]                    ; read wMonth (offset 2), zero-extend
    push edx                                        ; push wHour
    movzx edx, WORD PTR [esi]                      ; read wYear (offset 0), zero-extend
    push eax                                        ; push wDay
    push ecx                                        ; push wMonth
    push edx                                        ; push wYear
    push OFFSET $SG78594                           ; push format string
    call _printf                                    ; call printf
    push esi                                        ; push pointer to free
    call _free                                      ; free the memory
    add esp, 32                                     ; clean up stack (all arguments)
    xor eax, eax                                    ; return 0
    pop esi                                         ; restore ESI
    ret 0
_main ENDP
```
 
<hr>
 
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.30.3 UNIX: struct tm</b></h1>
 <img src="/assets/img/tmexample.png" alt="tm example" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<hr>
<p>
Let's take the <code style="color:chartreuse;">tm</code> struct from the <code style="color:chartreuse;">time.h</code> header in Linux as an example:
</p>
 
```c
#include <stdio.h>
#include <time.h>
 
void main()
{
    struct tm t;         // declare a tm struct on the stack
    time_t unix_time;    // variable to hold the current Unix timestamp
 
    unix_time = time(NULL);          // get current time as Unix timestamp
    localtime_r(&unix_time, &t);     // convert Unix time to local time and fill the struct
 
    printf("Year: %d\n", t.tm_year + 1900); // tm_year is years since 1900
    printf("Month: %d\n", t.tm_mon);
    printf("Day: %d\n", t.tm_mday);
    printf("Hour: %d\n", t.tm_hour);
    printf("Minutes: %d\n", t.tm_min);
    printf("Seconds: %d\n", t.tm_sec);
}
```
 
<p>
Let's compile it in GCC 4.4.1:
</p>
 
<p><b style="color:cornflowerblue;">Listing 1.335: GCC 4.4.1</b></p>
 
```nasm
main proc near
    push ebp
    mov ebp, esp
    and esp, 0FFFFFFF0h                 ; align stack to 16 bytes
    sub esp, 40h                        ; allocate local space
    mov dword ptr [esp], 0              ; first argument to time() = NULL
    call time
    mov [esp+3Ch], eax                  ; save the returned Unix timestamp
    lea eax, [esp+3Ch]                  ; get pointer to the returned time() value
    lea edx, [esp+10h]                  ; struct tm starts at ESP+10h
    mov [esp+4], edx                    ; pass pointer to start of struct as 2nd arg
    mov [esp], eax                      ; pass pointer to time result as 1st arg
    call localtime_r
    mov eax, [esp+24h]                  ; load tm_year
    lea edx, [eax+76Ch]                 ; edx = eax + 1900 (0x76C = 1900)
    mov eax, offset format              ; "Year: %d\n"
    mov [esp+4], edx
    mov [esp], eax
    call printf
    mov edx, [esp+20h]                  ; load tm_mon
    mov eax, offset aMonthD             ; "Month: %d\n"
    mov [esp+4], edx
    mov [esp], eax
    call printf
    mov edx, [esp+1Ch]                  ; load tm_mday
    mov eax, offset aDayD               ; "Day: %d\n"
    mov [esp+4], edx
    mov [esp], eax
    call printf
    mov edx, [esp+18h]                  ; load tm_hour
    mov eax, offset aHourD              ; "Hour: %d\n"
    mov [esp+4], edx
    mov [esp], eax
    call printf
    mov edx, [esp+14h]                  ; load tm_min
    mov eax, offset aMinutesD           ; "Minutes: %d\n"
    mov [esp+4], edx
    mov [esp], eax
    call printf
    mov edx, [esp+10h]                  ; load tm_sec
    mov eax, offset aSecondsD           ; "Seconds: %d\n"
    mov [esp+4], edx
    mov [esp], eax
    call printf
    leave
    retn
main endp
```
 
<p>
Somehow, IDA did not assign names to the local variables on the local stack, but the author said we can figure it out without that information in this simple example.
</p>
<p>
Also pay attention to the instruction <code style="color:chartreuse;">lea edx, [eax+76Ch]</code> — this instruction simply adds <code style="color:chartreuse;">0x76C</code> (1900) to the value in EAX, but without modifying any flags.
</p>
 
<hr>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">GDB</h2>
 
<p>
The author started by loading the example in GDB:
</p>
 
```nasm
dennis@ubuntuvm:~/polygon$ date
Mon Jun 2 18:10:37 EEST 2014
 
dennis@ubuntuvm:~/polygon$ gcc GCC_tm.c -o GCC_tm
 
dennis@ubuntuvm:~/polygon$ gdb GCC_tm
GNU gdb (GDB) 7.6.1-ubuntu
...
Reading symbols from /home/dennis/polygon/GCC_tm...(no debugging symbols found)...done.
 
(gdb) b printf
Breakpoint 1 at 0x8048330
 
(gdb) run
Starting program: /home/dennis/polygon/GCC_tm
 
Breakpoint 1, __printf (format=0x80485c0 "Year: %d\n") at printf.c:29
29 printf.c: No such file or directory.
 
(gdb) x/20x $esp
0xbffff0dc: 0x080484c3 0x080485c0 0x000007de 0x00000000
0xbffff0ec: 0x08048301 0x538c93ed 0x00000025 0x0000000a
0xbffff0fc: 0x00000012 0x00000002 0x00000005 0x00000072
0xbffff10c: 0x00000001 0x00000098 0x00000001 0x00002a30
0xbffff11c: 0x0804b090 0x08048530 0x00000000 0x00000000
(gdb)
```
 
<p>
We could easily find our struct on the stack. First, let's see how it is defined in <code style="color:chartreuse;">time.h</code>:
</p>
 
<p><b style="color:cornflowerblue;">Listing 1.337: time.h</b></p>
 
```c
struct tm
{
    int tm_sec;   // seconds
    int tm_min;   // minutes
    int tm_hour;  // hours
    int tm_mday;  // day of the month
    int tm_mon;   // month
    int tm_year;  // year (since 1900)
    int tm_wday;  // day of the week
    int tm_yday;  // day of the year
    int tm_isdst; // daylight saving time flag
};
```
 
<p>
Note that here a 32-bit <code style="color:chartreuse;">int</code> is used instead of <code style="color:chartreuse;">WORD</code> as in <code style="color:chartreuse;">SYSTEMTIME</code>. So each field occupies 32 bits (4 bytes).
</p>
 
```c
0xbffff0dc: 0x080484c3 0x080485c0 0x000007de 0x00000000
0xbffff0ec: 0x08048301 0x538c93ed 0x00000025 sec 0x0000000a min
0xbffff0fc: 0x00000012 hour 0x00000002 mday 0x00000005 mon 0x00000072 year
0xbffff10c: 0x00000001 wday 0x00000098 yday 0x00000001 isdst 0x00002a30
0xbffff11c: 0x0804b090 0x08048530 0x00000000 0x00000000
```
 
<p>
Or as a table:
</p>
 
| **Hex value** | **Decimal value** | **Field name** |
| --- | --- | --- |
| 0x00000025 | 37 | tm_sec |
| 0x0000000a | 10 | tm_min |
| 0x00000012 | 18 | tm_hour |
| 0x00000002 | 2 | tm_mday |
| 0x00000005 | 5 | tm_mon |
| 0x00000072 | 114 | tm_year |
| 0x00000001 | 1 | tm_wday |
| 0x00000098 | 152 | tm_yday |
| 0x00000001 | 1 | tm_isdst |
 
<hr>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM</h2>
 
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing Keil 6/2013 (Thumb mode)</h3>
 
<p>
We will use the same example.
</p>
 
<p><b style="color:cornflowerblue;">Listing 1.338: Optimizing Keil 6/2013 (Thumb mode)</b></p>
 
```nasm
var_38 = -0x38
var_34 = -0x34
var_30 = -0x30
var_2C = -0x2C
var_28 = -0x28
var_24 = -0x24
timer = -0xC
 
PUSH {LR}                               ; save link register
MOVS R0, #0                             ; argument to time() = NULL
SUB SP, SP, #0x34                       ; allocate local stack space
BL time                                 ; call time(NULL)
STR R0, [SP,#0x38+timer]               ; save returned Unix timestamp
MOV R1, SP                              ; R1 = pointer to struct tm (tp)
ADD R0, SP, #0x38+timer                 ; R0 = pointer to timer variable
BL localtime_r                          ; call localtime_r(&timer, tp)
LDR R1, =0x76C                          ; R1 = 1900
LDR R0, [SP,#0x38+var_24]              ; load tm_year
ADDS R1, R0, R1                         ; R1 = tm_year + 1900
ADR R0, aYearD                          ; "Year: %d\n"
BL __2printf                            ; call printf
LDR R1, [SP,#0x38+var_28]              ; load tm_mon
ADR R0, aMonthD                         ; "Month: %d\n"
BL __2printf                            ; call printf
LDR R1, [SP,#0x38+var_2C]              ; load tm_mday
ADR R0, aDayD                           ; "Day: %d\n"
BL __2printf                            ; call printf
LDR R1, [SP,#0x38+var_30]              ; load tm_hour
ADR R0, aHourD                          ; "Hour: %d\n"
BL __2printf                            ; call printf
LDR R1, [SP,#0x38+var_34]              ; load tm_min
ADR R0, aMinutesD                       ; "Minutes: %d\n"
BL __2printf                            ; call printf
LDR R1, [SP,#0x38+var_38]              ; load tm_sec
ADR R0, aSecondsD                       ; "Seconds: %d\n"
BL __2printf                            ; call printf
ADD SP, SP, #0x34                       ; deallocate local stack space
POP {PC}                                ; return
```
 
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing Xcode 4.6.3 (LLVM) (Thumb-2 mode)</h3>
 
<p>
IDA "knows" the <code style="color:chartreuse;">tm</code> struct (because IDA "knows" the argument types of library functions like <code style="color:chartreuse;">localtime_r()</code>), so it shows here the access to the struct's fields and their names.
</p>
 
<p><b style="color:cornflowerblue;">Listing 1.339: Optimizing Xcode 4.6.3 (LLVM) (Thumb-2 mode)</b></p>
 
```nasm
var_38 = -0x38
var_34 = -0x34
 
PUSH {R7,LR}                            ; save frame pointer and link register
MOV R7, SP                              ; set frame pointer
SUB SP, SP, #0x30                       ; allocate local stack space
MOVS R0, #0                             ; argument: time_t * = NULL
BLX _time                               ; call time(NULL)
ADD R1, SP, #0x38+var_34               ; R1 = pointer to struct tm
STR R0, [SP,#0x38+var_38]             ; save returned timestamp
MOV R0, SP                              ; R0 = pointer to timestamp
BLX _localtime_r                        ; call localtime_r
LDR R1, [SP,#0x38+var_34.tm_year]     ; load tm_year
MOV R0, 0xF44                           ; "Year: %d\n"
ADD R0, PC                              ; resolve PC-relative address
ADDW R1, R1, #0x76C                    ; R1 = tm_year + 1900
BLX _printf                             ; call printf
LDR R1, [SP,#0x38+var_34.tm_mon]      ; load tm_mon
MOV R0, 0xF3A                           ; "Month: %d\n"
ADD R0, PC                              ; resolve address
BLX _printf                             ; call printf
LDR R1, [SP,#0x38+var_34.tm_mday]     ; load tm_mday
MOV R0, 0xF35                           ; "Day: %d\n"
ADD R0, PC                              ; resolve address
BLX _printf                             ; call printf
LDR R1, [SP,#0x38+var_34.tm_hour]     ; load tm_hour
MOV R0, 0xF2E                           ; "Hour: %d\n"
ADD R0, PC                              ; resolve address
BLX _printf                             ; call printf
LDR R1, [SP,#0x38+var_34.tm_min]      ; load tm_min
MOV R0, 0xF28                           ; "Minutes: %d\n"
ADD R0, PC                              ; resolve address
BLX _printf                             ; call printf
LDR R1, [SP,#0x38+var_34]             ; load tm_sec
MOV R0, 0xF25                           ; "Seconds: %d\n"
ADD R0, PC                              ; resolve address
BLX _printf                             ; call printf
ADD SP, SP, #0x30                       ; deallocate stack space
POP {R7,PC}                             ; restore frame pointer and return
...
00000000 tm struc         ; (sizeof=0x2C, standard type)
00000000 tm_sec DCD ?     ; seconds field (4 bytes)
00000004 tm_min DCD ?     ; minutes field (4 bytes)
00000008 tm_hour DCD ?    ; hours field (4 bytes)
0000000C tm_mday DCD ?    ; day of month field (4 bytes)
00000010 tm_mon DCD ?     ; month field (4 bytes)
00000014 tm_year DCD ?    ; year field (4 bytes)
00000018 tm_wday DCD ?    ; day of week field (4 bytes)
0000001C tm_yday DCD ?    ; day of year field (4 bytes)
00000020 tm_isdst DCD ?   ; daylight saving time flag (4 bytes)
00000024 tm_gmtoff DCD ?  ; seconds east of UTC (4 bytes)
00000028 tm_zone DCD ?    ; timezone abbreviation pointer (offset)
0000002C tm ends
```
 
<hr>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">MIPS</h2>
 
<p><b style="color:cornflowerblue;">Listing 1.340: Optimizing GCC 4.4.5 (IDA)</b></p>
 
```nasm
main:
 
; IDA does not know the struct field names, we named them manually:
 
var_40 = -0x40
var_38 = -0x38
seconds = -0x34
minutes = -0x30
hour    = -0x2C
day     = -0x28
month   = -0x24
year    = -0x20
var_4   = -4
 
lui $gp, (__gnu_local_gp >> 16)         ; load upper 16 bits of global pointer
addiu $sp, -0x50                        ; allocate 80 bytes on stack
la $gp, (__gnu_local_gp & 0xFFFF)       ; load lower 16 bits of global pointer
sw $ra, 0x50+var_4($sp)                 ; save return address
sw $gp, 0x50+var_40($sp)               ; save global pointer
lw $t9, (time & 0xFFFF)($gp)           ; load address of time() from GOT
or $at, $zero                           ; load delay slot, NOP
jalr $t9                                ; call time(NULL)
move $a0, $zero                         ; branch delay slot: pass NULL as argument
lw $gp, 0x50+var_40($sp)               ; restore global pointer after call
addiu $a0, $sp, 0x50+var_38            ; A0 = pointer to unix_time variable
lw $t9, (localtime_r & 0xFFFF)($gp)    ; load address of localtime_r() from GOT
addiu $a1, $sp, 0x50+seconds           ; A1 = pointer to start of struct tm (seconds field)
jalr $t9                                ; call localtime_r(&unix_time, &struct)
sw $v0, 0x50+var_38($sp)               ; branch delay slot: save time() result
lw $gp, 0x50+var_40($sp)               ; restore global pointer
lw $a1, 0x50+year($sp)                 ; load tm_year
lw $t9, (printf & 0xFFFF)($gp)         ; load address of printf from GOT
la $a0, $LC0                            ; "Year: %d\n"
jalr $t9                                ; call printf
addiu $a1, 1900                         ; branch delay slot: add 1900 to year (executes BEFORE jalr returns)
lw $gp, 0x50+var_40($sp)               ; restore global pointer
lw $a1, 0x50+month($sp)                ; load tm_mon
lw $t9, (printf & 0xFFFF)($gp)         ; load address of printf from GOT
lui $a0, ($LC1 >> 16)                   ; "Month: %d\n" (upper 16 bits)
jalr $t9                                ; call printf
la $a0, ($LC1 & 0xFFFF)                ; "Month: %d\n" (lower 16 bits) — branch delay slot
lw $gp, 0x50+var_40($sp)               ; restore global pointer
lw $a1, 0x50+day($sp)                  ; load tm_mday
lw $t9, (printf & 0xFFFF)($gp)         ; load address of printf from GOT
lui $a0, ($LC2 >> 16)                   ; "Day: %d\n" (upper 16 bits)
jalr $t9                                ; call printf
la $a0, ($LC2 & 0xFFFF)                ; "Day: %d\n" (lower 16 bits) — branch delay slot
lw $gp, 0x50+var_40($sp)               ; restore global pointer
lw $a1, 0x50+hour($sp)                 ; load tm_hour
lw $t9, (printf & 0xFFFF)($gp)         ; load address of printf from GOT
lui $a0, ($LC3 >> 16)                   ; "Hour: %d\n" (upper 16 bits)
jalr $t9                                ; call printf
la $a0, ($LC3 & 0xFFFF)                ; "Hour: %d\n" (lower 16 bits) — branch delay slot
lw $gp, 0x50+var_40($sp)               ; restore global pointer
lw $a1, 0x50+minutes($sp)              ; load tm_min
lw $t9, (printf & 0xFFFF)($gp)         ; load address of printf from GOT
lui $a0, ($LC4 >> 16)                   ; "Minutes: %d\n" (upper 16 bits)
jalr $t9                                ; call printf
la $a0, ($LC4 & 0xFFFF)                ; "Minutes: %d\n" (lower 16 bits) — branch delay slot
lw $gp, 0x50+var_40($sp)               ; restore global pointer
lw $a1, 0x50+seconds($sp)              ; load tm_sec
lw $t9, (printf & 0xFFFF)($gp)         ; load address of printf from GOT
lui $a0, ($LC5 >> 16)                   ; "Seconds: %d\n" (upper 16 bits)
jalr $t9                                ; call printf
la $a0, ($LC5 & 0xFFFF)                ; "Seconds: %d\n" (lower 16 bits) — branch delay slot
lw $ra, 0x50+var_4($sp)                ; restore return address
or $at, $zero                           ; load delay slot, NOP
jr $ra                                  ; return
addiu $sp, 0x50                         ; delay slot: deallocate stack
 
$LC0: .ascii "Year: %d\n"<0>
$LC1: .ascii "Month: %d\n"<0>
$LC2: .ascii "Day: %d\n"<0>
$LC3: .ascii "Hour: %d\n"<0>
$LC4: .ascii "Minutes: %d\n"<0>
$LC5: .ascii "Seconds: %d\n"<0>
```
 
<p>
The author said this is an example where branch delay slots can confuse us. For example, there is the instruction <code style="color:chartreuse;">addiu $a1, 1900</code> on line 35 which adds 1900 to the year number. It executes <b style="color:cornflowerblue;">before</b> the corresponding <code style="color:chartreuse;">JALR</code> on line 34 — don't forget this detail.
</p>
 
<hr>
 
<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>Structure as a set of values</b></h2>
 
<p>
To demonstrate that a struct is simply variables placed next to each other in one place, let's rewrite our example while looking at the <code style="color:chartreuse;">tm</code> struct definition one more time:
</p>
 
```c
#include <stdio.h>
#include <time.h>
 
void main()
{
    // declare all tm fields as individual local variables instead of a struct
    int tm_sec, tm_min, tm_hour, tm_mday, tm_mon, tm_year, tm_wday, tm_yday, tm_isdst;
    time_t unix_time;
 
    unix_time = time(NULL);              // get current Unix timestamp
    localtime_r(&unix_time, &tm_sec);   // pass pointer to tm_sec as if it were the start of a struct
 
    printf("Year: %d\n", tm_year + 1900);
    printf("Month: %d\n", tm_mon);
    printf("Day: %d\n", tm_mday);
    printf("Hour: %d\n", tm_hour);
    printf("Minutes: %d\n", tm_min);
    printf("Seconds: %d\n", tm_sec);
}
```
 
<p>
Note: the pointer to the <code style="color:chartreuse;">tm_sec</code> field is what gets passed to <code style="color:chartreuse;">localtime_r</code>, i.e. to the first element of the "struct".
</p>
<p>
The compiler warns us:
</p>
 
```c
GCC_tm2.c: In function 'main':
GCC_tm2.c:11:5: warning: passing argument 2 of 'localtime_r' from incompatible pointer type [enabled by default]
In file included from GCC_tm2.c:2:0:
/usr/include/time.h:59:12: note: expected 'struct tm *' but argument is of type 'int *'
```
 
<p>
But despite that, it generates this code:
</p>
 
```nasm
main proc near
var_30    = dword ptr -30h
var_2C    = dword ptr -2Ch
unix_time = dword ptr -1Ch
tm_sec    = dword ptr -18h
tm_min    = dword ptr -14h
tm_hour   = dword ptr -10h
tm_mday   = dword ptr -0Ch
tm_mon    = dword ptr -8
tm_year   = dword ptr -4
 
push ebp
mov ebp, esp
and esp, 0FFFFFFF0h                         ; align stack to 16 bytes
sub esp, 30h                                ; allocate local space
call __main
mov [esp+30h+var_30], 0                    ; arg 0 (NULL) for time()
call time
mov [esp+30h+unix_time], eax               ; save Unix timestamp
lea eax, [esp+30h+tm_sec]                  ; get pointer to tm_sec (start of "struct")
mov [esp+30h+var_2C], eax                  ; pass as 2nd arg to localtime_r
lea eax, [esp+30h+unix_time]               ; get pointer to unix_time
mov [esp+30h+var_30], eax                  ; pass as 1st arg to localtime_r
call localtime_r
mov eax, [esp+30h+tm_year]                 ; load tm_year
add eax, 1900                              ; add 1900
mov [esp+30h+var_2C], eax                  ; pass as value to printf
mov [esp+30h+var_30], offset aYearD        ; "Year: %d\n"
call printf
mov eax, [esp+30h+tm_mon]                  ; load tm_mon
mov [esp+30h+var_2C], eax
mov [esp+30h+var_30], offset aMonthD       ; "Month: %d\n"
call printf
mov eax, [esp+30h+tm_mday]                 ; load tm_mday
mov [esp+30h+var_2C], eax
mov [esp+30h+var_30], offset aDayD         ; "Day: %d\n"
call printf
mov eax, [esp+30h+tm_hour]                 ; load tm_hour
mov [esp+30h+var_2C], eax
mov [esp+30h+var_30], offset aHourD        ; "Hour: %d\n"
call printf
mov eax, [esp+30h+tm_min]                  ; load tm_min
mov [esp+30h+var_2C], eax
mov [esp+30h+var_30], offset aMinutesD     ; "Minutes: %d\n"
call printf
mov eax, [esp+30h+tm_sec]                  ; load tm_sec
mov [esp+30h+var_2C], eax
mov [esp+30h+var_30], offset aSecondsD     ; "Seconds: %d\n"
call printf
leave
retn
main endp
```
 
<p>
This code is identical to what we saw before, and we cannot tell whether the original source code had a struct or just a bunch of variables.
</p>
<p>
And this code works. However, it is not recommended to do this in practice.
</p>
<p>
Usually, non-optimizing compilers allocate variables on the local stack in the same order they were declared in the function. However, there is no guarantee of this.
</p>
<p>
By the way, some other compilers might warn about the variables <code style="color:chartreuse;">tm_year</code>, <code style="color:chartreuse;">tm_mon</code>, <code style="color:chartreuse;">tm_mday</code>, <code style="color:chartreuse;">tm_hour</code>, <code style="color:chartreuse;">tm_min</code> being used without being initialized. Indeed, the compiler does not know that these fields will be filled by the <code style="color:chartreuse;">localtime_r()</code> function.
</p>
<p>
We chose this example because all the struct fields are of type <code style="color:chartreuse;">int</code>.
</p>
<p>
This would not work if the struct fields were 16-bit (<code style="color:chartreuse;">WORD</code>), as in the case of the <code style="color:chartreuse;">SYSTEMTIME</code> struct — <code style="color:chartreuse;">GetSystemTime()</code> would fill them incorrectly (because local variables are aligned on a 32-bit boundary).
</p>
<p>
So, a struct is simply a bundle of variables existing in one place, next to each other. We can say that a struct is an instruction to the compiler, directing it to keep the variables together in one place. By the way, in some very old versions of C (before 1972), there were no structures at all.
</p>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Structure as an array of 32-bit words</h2>
 
```c
#include <stdio.h>
#include <time.h>
 
void main()
{
    struct tm t;        // declare a tm struct
    time_t unix_time;   // Unix timestamp variable
    int i;              // loop counter
 
    unix_time = time(NULL);          // get current Unix time
    localtime_r(&unix_time, &t);     // fill the struct with local time
 
    for (i = 0; i < 9; i++)         // iterate over all 9 fields of the struct
    {
        int tmp = ((int*)&t)[i];     // cast the struct pointer to int* and access field i
        printf("0x%08X (%d)\n", tmp, tmp); // print the field value in hex and decimal
    }
}
```
 
<p>
This is what came out:
</p>
 
```c
0x0000002D (45)
0x00000033 (51)
0x00000017 (23)
0x0000001A (26)
0x00000006 (6)
0x00000072 (114)
0x00000006 (6)
0x000000CE (206)
0x00000001 (1)
```
 
<p>
The variables here are in the same order they were declared in the structure definition.
</p>
<p>
And this is what it looks like after compiling:
</p>
 
```nasm
main proc near
    push ebp
    mov ebp, esp
    push esi
    push ebx
    and esp, 0FFFFFFF0h             ; align stack to 16 bytes
    sub esp, 40h                    ; allocate local stack space
    mov dword ptr [esp], 0          ; timer = NULL (argument to time())
    lea ebx, [esp+14h]              ; EBX = pointer to start of struct tm
    call _time
    lea esi, [esp+38h]              ; ESI = pointer to end of struct tm
    mov [esp+4], ebx                ; tp (pointer to struct, 2nd arg to localtime_r)
    mov [esp+10h], eax              ; save returned Unix timestamp
    lea eax, [esp+10h]
    mov [esp], eax                  ; timer (1st arg to localtime_r)
    call _localtime_r
    nop
    lea esi, [esi+0]                ; NOP (padding for alignment)
loc_80483D8:
    ; EBX here is a pointer to the start of the struct,
    ; ESI is a pointer to its end.
    mov eax, [ebx]                  ; load a 32-bit word from the array
    add ebx, 4                      ; advance to the next field in the struct
    mov dword ptr [esp+4], offset a0x08xD  ; "0x%08X (%d)\n"
    mov dword ptr [esp], 1
    mov [esp+0Ch], eax              ; pass value to printf() (decimal)
    mov [esp+8], eax                ; pass value to printf() (hex)
    call ___printf_chk
    cmp ebx, esi                    ; have we reached the end of the struct?
    jnz short loc_80483D8           ; no — load the next value
    lea esp, [ebp-8]
    pop ebx
    pop esi
    pop ebp
    retn
main endp
```
 
<p>
We indeed found that the space on the local stack is treated first as a struct, and then as an array.
</p>
<p>
It is also possible to modify the struct fields through this pointer. And again, this approach is somewhat hackish and is not recommended for use in production code.
</p>
 
<hr>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Structure as an array of bytes</h2>
 
<p>
We can go even further. Let's cast the pointer to an array of bytes and dump it:
</p>
 
```c
#include <stdio.h>
#include <time.h>
 
void main()
{
    struct tm t;        // declare a tm struct
    time_t unix_time;   // Unix timestamp variable
    int i, j;           // loop counters
 
    unix_time = time(NULL);          // get current Unix time
    localtime_r(&unix_time, &t);     // fill the struct with local time
 
    for (i = 0; i < 9; i++)         // iterate over all 9 fields (each 4 bytes)
    {
        for (j = 0; j < 4; j++)     // iterate over each byte within the field
            printf("0x%02X ", ((unsigned char*)&t)[i * 4 + j]); // print byte in hex
        printf("\n");                // newline after each field
    }
}
```
 
<p>
Output:
</p>
 
```c
0x2D 0x00 0x00 0x00
0x33 0x00 0x00 0x00
0x17 0x00 0x00 0x00
0x1A 0x00 0x00 0x00
0x06 0x00 0x00 0x00
0x72 0x00 0x00 0x00
0x06 0x00 0x00 0x00
0xCE 0x00 0x00 0x00
0x01 0x00 0x00 0x00
```
 
<p>
The least significant byte comes first, because this is a little-endian architecture.
</p>
 
```nasm
main proc near
    push ebp
    mov ebp, esp
    push edi
    push esi
    push ebx
    and esp, 0FFFFFFF0h             ; align stack to 16 bytes
    sub esp, 40h                    ; allocate local stack space
    mov dword ptr [esp], 0          ; timer = NULL (argument to time())
    lea esi, [esp+14h]              ; ESI = pointer to start of struct tm
    call _time
    lea edi, [esp+38h]              ; EDI = pointer to end of struct
    mov [esp+4], esi                ; tp (pointer to struct, 2nd arg to localtime_r)
    mov [esp+10h], eax              ; save returned Unix timestamp
    lea eax, [esp+10h]
    mov [esp], eax                  ; timer (1st arg to localtime_r)
    call _localtime_r
    lea esi, [esi+0]                ; NOP (padding for alignment)
    ; ESI here is a pointer to the struct on the local stack.
    ; EDI is a pointer to the end of the struct.
loc_8048408:
    xor ebx, ebx                    ; j = 0
loc_804840A:
    movzx eax, byte ptr [esi+ebx]   ; load a single byte from the struct
    add ebx, 1                      ; j = j + 1
    mov dword ptr [esp+4], offset a0x02x   ; "0x%02X "
    mov dword ptr [esp], 1
    mov [esp+8], eax                ; pass the loaded byte to printf()
    call ___printf_chk
    cmp ebx, 4                      ; have we printed all 4 bytes of this field?
    jnz short loc_804840A           ; no — print next byte
    ; print a newline character (LF)
    mov dword ptr [esp], 0Ah        ; c = '\n'
    add esi, 4                      ; advance ESI to the next field (4 bytes)
    call _putchar
    cmp esi, edi                    ; have we reached the end of the struct?
    jnz short loc_8048408           ; no — reset j = 0 and process next field
    lea esp, [ebp-0Ch]
    pop ebx
    pop esi
    pop edi
    pop ebp
    retn
main endp
```
 
<hr>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">GNU Scientific Library: Representation of complex numbers</h2>
 
<p>
The author explains this well here — this is a relatively rare case where an array is used intentionally instead of a struct:
</p>
<p>
Complex numbers are represented using the type <code style="color:chartreuse;">gsl_complex</code>. The internal representation of this type may differ across platforms and must not be accessed directly. The functions and macros described below allow manipulation of complex numbers in a portable way.
</p>
<p>
For reference, the default format of the <code style="color:chartreuse;">gsl_complex</code> type is illustrated by this struct:
</p>
 
```c
typedef struct
{
    double dat[2]; // dat[0] = real part, dat[1] = imaginary part
} gsl_complex;
```
 
<p>
The real part and the imaginary part are stored in adjacent elements of a two-element array. This eliminates any padding between the real and imaginary parts, <code style="color:chartreuse;">dat[0]</code> and <code style="color:chartreuse;">dat[1]</code>, which allows the struct to map correctly onto packed complex arrays.
</p>


</div>