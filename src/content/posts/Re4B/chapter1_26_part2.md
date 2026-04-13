---
title: "CH1.26 (part2) Array of Pointers to Strings"
published: 2026-04-12
description: "A look at how arrays of pointers to strings work across different architectures and what happens when the array boundary is exceeded"
author: "0xV3n0m"
category: "Re4B"
tags: ["Reverse Engineering", "Books", "Assembly"]
image: "/assets/img/reversee28.jpeg"
draft: false
lang: "eng"

# Series configuration
type: "course"
series: "re4b"
seriesOrder: 28
seriesTitle: "Reverse Engineering for Beginners"
seriesDescription: "A beginner-friendly book covering x86/x64 reverse engineering through real compiler output and code patterns."
seriesImage: "/assets/img/RE4B.png"
---

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<div style="line-height:1.9; font-size:21px; direction:ltr;">
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.26.5 Array of pointers to strings</b></h1>
<hr>
 
<p>
Here is an example of an array of pointers:
</p>
<p>
<b>Listing 1.236: Get month name</b>
</p>
 
```c
#include <stdio.h> // include standard I/O header
 
const char* month1[] = { // array of pointers to constant strings
    "January", "February", "March", "April", "May", "June",   // first six months
    "July", "August", "September", "October", "November", "December" // last six months
};
 
// In the range 0..11
const char* get_month1 (int month) { // function that receives a month index and returns its name
    return month1[month]; // return the pointer to the string at the given index
};
```
 
<hr>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">x64</h2>
 
<p>
<b>Listing 1.237: Optimizing MSVC 2013 x64</b>
</p>
 
```nasm
_DATA SEGMENT
month1  DQ FLAT:$SG3122        ; pointer to "January"
        DQ FLAT:$SG3123        ; pointer to "February"
        DQ FLAT:$SG3124        ; pointer to "March"
        DQ FLAT:$SG3125        ; pointer to "April"
        DQ FLAT:$SG3126        ; pointer to "May"
        DQ FLAT:$SG3127        ; pointer to "June"
        DQ FLAT:$SG3128        ; pointer to "July"
        DQ FLAT:$SG3129        ; pointer to "August"
        DQ FLAT:$SG3130        ; pointer to "September"
        DQ FLAT:$SG3131        ; pointer to "October"
        DQ FLAT:$SG3132        ; pointer to "November"
        DQ FLAT:$SG3133        ; pointer to "December"
 
$SG3122 DB 'January', 00H      ; null-terminated string "January"
$SG3123 DB 'February', 00H     ; null-terminated string "February"
$SG3124 DB 'March', 00H        ; null-terminated string "March"
$SG3125 DB 'April', 00H        ; null-terminated string "April"
$SG3126 DB 'May', 00H          ; null-terminated string "May"
$SG3127 DB 'June', 00H         ; null-terminated string "June"
$SG3128 DB 'July', 00H         ; null-terminated string "July"
$SG3129 DB 'August', 00H       ; null-terminated string "August"
$SG3130 DB 'September', 00H    ; null-terminated string "September"
$SG3131 DB 'October', 00H      ; null-terminated string "October"
$SG3132 DB 'November', 00H     ; null-terminated string "November"
$SG3133 DB 'December', 00H     ; null-terminated string "December"
_DATA ENDS
 
_month$ = 8                         ; stack offset of the 'month' argument
get_month1 PROC
    movsxd  rax, ecx                ; sign-extend ECX (month index, 32-bit int) into RAX (64-bit)
    lea     rcx, OFFSET FLAT:month1 ; load base address of the pointer table into RCX
    mov     rax, QWORD PTR [rcx+rax*8] ; load pointer: base + month*8 (each pointer = 8 bytes in 64-bit)
    ret     0                       ; return the pointer in RAX
get_month1 ENDP
```
 
<p>
The first instruction <code style="color:chartreuse;">MOVSXD</code> moves the 32-bit value from ECX (which holds the month argument) into RAX with sign-extension (because the month argument is of type int). After that it loads the address of the pointer table into RCX, and then the input value (month) is multiplied by 8 and added to that address — because in a 64-bit environment each pointer takes 8 bytes, so we must multiply by 8 to reach the correct element.
</p>
 
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Optimizing GCC 4.9 x64</h3>
 
```nasm
get_month1:
    movsx   rdi, edi                    ; sign-extend EDI (month index) into RDI (64-bit)
    mov     rax, QWORD PTR month1[0+rdi*8] ; load pointer from table: base + month*8
    ret                                 ; return the pointer in RAX
```
 
<hr>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">32-bit MSVC</h2>
 
<p>
<b>Listing 1.239: Optimizing MSVC 2013 x86</b>
</p>
 
```nasm
_month$ = 8                             ; stack offset of the 'month' argument
_get_month1 PROC
    mov eax, DWORD PTR _month$[esp-4]   ; load the month index from the stack into EAX
    mov eax, DWORD PTR _month1[eax*4]   ; load pointer from table: base + month*4 (each pointer = 4 bytes in 32-bit)
    ret 0                               ; return the pointer in EAX
_get_month1 ENDP
```
 
<p>
Here there is no sign-extension to 64-bit, and the multiplication is by 4 because each pointer in 32-bit is 4 bytes.
</p>
 
<hr>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">32-bit ARM</h2>
 
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM in ARM mode</h3>
 
```nasm
get_month1 PROC
    LDR r1,|L0.100|         ; load address of the pointer table into R1
    LDR r0,[r1,r0,LSL #2]   ; load pointer: base(R1) + month(R0)*4 (left shift by 2 = multiply by 4)
    BX lr                   ; return (branch to link register)
ENDP
 
|L0.100|
DCD ||.data||               ; address of the data section (base of pointer table)
DCB "January",0             ; null-terminated string "January"
DCB "February",0            ; null-terminated string "February"
DCB "March",0               ; null-terminated string "March"
DCB "April",0               ; null-terminated string "April"
DCB "May",0                 ; null-terminated string "May"
DCB "June",0                ; null-terminated string "June"
DCB "July",0                ; null-terminated string "July"
DCB "August",0              ; null-terminated string "August"
DCB "September",0           ; null-terminated string "September"
DCB "October",0             ; null-terminated string "October"
DCB "November",0            ; null-terminated string "November"
DCB "December",0            ; null-terminated string "December"
 
AREA ||.data||, DATA, ALIGN=2
month1 DCD ||.conststring||         ; pointer to "January"
       DCD ||.conststring||+0x8     ; pointer to "February"
       DCD ||.conststring||+0x11    ; pointer to "March"
       DCD ||.conststring||+0x17    ; pointer to "April"
       DCD ||.conststring||+0x1d    ; pointer to "May"
       DCD ||.conststring||+0x21    ; pointer to "June"
       DCD ||.conststring||+0x26    ; pointer to "July"
       DCD ||.conststring||+0x2b    ; pointer to "August"
       DCD ||.conststring||+0x32    ; pointer to "September"
       DCD ||.conststring||+0x3c    ; pointer to "October"
       DCD ||.conststring||+0x44    ; pointer to "November"
       DCD ||.conststring||+0x4d    ; pointer to "December"
```
 
<p>
The address of the table is loaded into R1. Everything else is done with a single <code style="color:chartreuse;">LDR</code> instruction. The input value month is left-shifted by 2 (i.e. multiplied by 4), added to R1 (the table address), and then the table element is loaded from that address. The 32-bit element is loaded into R0 from the table.
</p>
 
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM in Thumb mode</h3>
 
<p>
The code is similar to the one above, but less dense, because the LSL suffix cannot be embedded inside an <code style="color:chartreuse;">LDR</code> instruction here:
</p>
 
```nasm
get_month1 PROC
    LSLS r0,r0,#2       ; R0 = month * 4 (left shift by 2 = multiply by 4, compute byte offset)
    LDR r1,|L0.64|      ; load base address of pointer table into R1
    LDR r0,[r1,r0]      ; load pointer from table: base(R1) + offset(R0)
    BX lr               ; return (branch to link register)
ENDP
```
 
<hr>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM64</h2>
 
<p>
<b>Listing 1.241: Optimizing GCC 4.9 ARM64</b>
</p>
 
```nasm
get_month1:
    adrp x1, .LANCHOR0          ; load page address of pointer table into X1 (upper bits)
    add x1, x1, :lo12:.LANCHOR0 ; add page offset to get full address of table in X1
    ldr x0, [x1,w0,sxtw 3]      ; load pointer: base(X1) + sign-extend(W0) * 8 (sxtw 3 = shift left 3 = multiply by 8)
    ret                          ; return the pointer in X0
 
.LANCHOR0 = . + 0
.type month1, %object
.size month1, 96                 ; total size: 12 pointers × 8 bytes = 96 bytes
month1:
.xword .LC2                      ; pointer to "January"
.xword .LC3                      ; pointer to "February"
.xword .LC4                      ; pointer to "March"
.xword .LC5                      ; pointer to "April"
.xword .LC6                      ; pointer to "May"
.xword .LC7                      ; pointer to "June"
.xword .LC8                      ; pointer to "July"
.xword .LC9                      ; pointer to "August"
.xword .LC10                     ; pointer to "September"
.xword .LC11                     ; pointer to "October"
.xword .LC12                     ; pointer to "November"
.xword .LC13                     ; pointer to "December"
 
.LC2: .string "January"
.LC3: .string "February"
... (rest is the same)
```
 
<p>
The address of the table is loaded into <code style="color:chartreuse;">X1</code> using the <code style="color:chartreuse;">ADRP/ADD</code> pair. After that the appropriate element is selected with a single <code style="color:chartreuse;">LDR</code>, which takes <code style="color:chartreuse;">W0</code> (the register holding the month argument), left-shifts it by 3 bits (i.e. multiplies by 8), sign-extends it (that is what the <code style="color:chartreuse;">sxtw</code> suffix does), and adds it to X1. The 64-bit value is then loaded from the table into X0.
</p>
 
<hr>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">MIPS</h2>
 
<p>
<b>Listing 1.242: Optimizing GCC 4.4.5 (IDA)</b>
</p>
 
```nasm
get_month1:
    la $v0, month1          ; load base address of pointer table into $v0
    sll $a0, 2              ; $a0 = month * 4 (left shift by 2 = multiply by 4, compute byte offset)
    addu $a0, $v0           ; $a0 = table base + byte offset
    lw $v0, 0($a0)          ; load pointer from table at that address into $v0
    jr $ra                  ; return (jump to return address)
    or $at, $zero           ; branch delay slot (NOP)
 
.data
globl month1
month1:
    .word aJanuary          ; pointer to "January"
    .word aFebruary         ; pointer to "February"
    ... (rest is the same)
 
.data
aJanuary: .ascii "January"<0>   ; null-terminated string "January"
    ... (all strings the same)
```
 
<hr>
 
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>Array overflow</b></h1>
 
<hr>
 
<p>
Our function accepts values from 0 to 11. What happens if someone passes 12?
</p>
<p>
Simply put, there is no element at index 12 in this function, so it will return a random or strange value.
</p>
<p>
The function will load whatever value happens to be sitting there and return it. Later, another function might try to fetch a text string from that address and could crash.
</p>
<p>
Let's compile the example in MSVC for win64 and open it in IDA to see what the linker placed after the table:
</p>
<p>
<b>Listing 1.243: Executable file in IDA</b>
</p>
 
```nasm
off_140011000 dq offset aJanuary_1     ; DATA XREF: .text:0000000140001003 ; pointer to "January"
              dq offset aFebruary_1    ; pointer to "February"
              dq offset aMarch_1       ; pointer to "March"
              dq offset aApril_1       ; pointer to "April"
              dq offset aMay_1         ; pointer to "May"
              dq offset aJune_1        ; pointer to "June"
              dq offset aJuly_1        ; pointer to "July"
              dq offset aAugust_1      ; pointer to "August"
              dq offset aSeptember_1   ; pointer to "September"
              dq offset aOctober_1     ; pointer to "October"
              dq offset aNovember_1    ; pointer to "November"
              dq offset aDecember_1    ; pointer to "December"
 
aJanuary_1   db 'January',0    ; DATA XREF: sub_140001020+4 ; .data:off_140011000
aFebruary_1  db 'February',0   ; DATA XREF: .data:0000000140011008
             align 4
aMarch_1     db 'March',0      ; DATA XREF: .data:0000000140011010
             align 4
aApril_1     db 'April',0      ; DATA XREF: .data:0000000140011018
```
 
<p>
Our program is very small, so there is not much data to place in the data segment — just the month names. But we must keep in mind that the linker might have placed something else there by chance.
</p>
<p>
So what happens if we pass 12 to the function? It will return the 13th element. Let's see how the CPU treats those bytes as a 64-bit value:
</p>
<p>
<b>Listing 1.244: Executable file in IDA</b>
</p>
 
```nasm
off_140011000 dq offset qword_140011060    ; DATA XREF: .text:0000000140001003 ; element at index 12 — points past the table
              dq offset aFebruary_1        ; pointer to "February"
              dq offset aMarch_1           ; pointer to "March"
              dq offset aApril_1           ; pointer to "April"
              dq offset aMay_1             ; pointer to "May"
              dq offset aJune_1            ; pointer to "June"
              dq offset aJuly_1            ; pointer to "July"
              dq offset aAugust_1          ; pointer to "August"
              dq offset aSeptember_1       ; pointer to "September"
              dq offset aOctober_1         ; pointer to "October"
              dq offset aNovember_1        ; pointer to "November"
              dq offset aDecember_1        ; pointer to "December"
 
qword_140011060 dq 797261756E614Ah   ; DATA XREF: sub_140001020+4 ; raw bytes sitting after the table — not a valid pointer
                                     ; this is the first 8 bytes of "January" interpreted as a 64-bit integer
 
aFebruary_1 db 'February',0    ; DATA XREF: .data:0000000140011008
            align 4
aMarch_1    db 'March',0       ; DATA XREF: .data:0000000140011010
```
 
<p>
That value is <b style="color:cornflowerblue;">0x797261756E614A</b>.
</p>
<p>
After that, another function (most likely one that processes strings) might try to read bytes from that address, expecting a C-string to be there. It will almost certainly crash, because that value does not look like a valid address.
</p>
 
 <h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>Array overflow protection</b></h1>
<hr>
 
<p>
It is naive to expect that every programmer who uses our function or library will respect the rule of not passing a value greater than 11. One way to handle this in C/C++ is to use assertions.
</p>
<p>
We can modify our program to fail if the value is wrong:
</p>
<p>
<b>Listing 1.245: assert() added</b>
</p>
 
```c
const char* get_month1_checked (int month) { // function returns month name with bounds checking
    assert (month<12); // terminate the program if month is out of range (>= 12)
    return month1[month]; // return pointer to the month name string
};
```
 
<p>
The assertion macro checks for valid values at the beginning of each function, and fails if the condition turns out to be false.
</p>
<p>
<b>Listing 1.246: Optimizing MSVC 2013 x64</b>
</p>
 
```nasm
$SG3143 DB 'm', 00H, 'o', 00H, 'n', 00H, 't', 00H, 'h', 00H, '.', 00H
         DB 'c', 00H, 00H, 00H   ; UTF-16 encoded filename string: "month.c"
 
$SG3144 DB 'm', 00H, 'o', 00H, 'n', 00H, 't', 00H, 'h', 00H, '<', 00H
         DB '1', 00H, '2', 00H, 00H, 00H ; UTF-16 encoded condition string: "month<12"
 
month$ = 48                             ; stack offset of the 'month' argument
get_month1_checked PROC
$LN5:
    push    rbx                         ; save RBX (callee-saved register)
    sub     rsp, 32                     ; allocate shadow space for function calls
    movsxd  rbx, ecx                   ; sign-extend month (32-bit) into RBX (64-bit)
    cmp     ebx, 12                     ; compare month with 12
    jl      SHORT $LN3@get_month1       ; if month < 12, skip the assert and go to normal path
    lea     rdx, OFFSET FLAT:$SG3143    ; load filename string "month.c" as second argument
    lea     rcx, OFFSET FLAT:$SG3144    ; load condition string "month<12" as first argument
    mov     r8d, 29                     ; line number (29) as third argument
    call    _wassert                    ; call assert failure handler (prints info and terminates)
$LN3@get_month1:
    lea     rcx, OFFSET FLAT:month1     ; load base address of pointer table into RCX
    mov     rax, QWORD PTR [rcx+rbx*8] ; load pointer: base + month*8 (each pointer = 8 bytes)
    add     rsp, 32                     ; restore shadow space
    pop     rbx                         ; restore RBX
    ret     0                           ; return the pointer in RAX
get_month1_checked ENDP
```
 
<p>
In reality, <code style="color:chartreuse;">assert()</code> is not a function — it is a <b style="color:cornflowerblue;">macro</b>. It checks the condition, and then also passes the line number and filename to another function that reports the information to the user. Here we can see that the filename and the condition are written in UTF-16. The line number is also passed (it is 29). This approach is present in almost all compilers.
</p>
<p>
Here is what GCC does:
</p>
<p>
<b>Listing 1.247: Optimizing GCC 4.9 x64</b>
</p>
 
```nasm
.LC1: .string "month.c"   ; filename string passed to assert failure handler
.LC2: .string "month<12"  ; condition string passed to assert failure handler
 
get_month1_checked:
    cmp     edi, 11                             ; compare month with 11
    jg      .L6                                 ; if month > 11 (i.e. >= 12), jump to assert handler
    movsx   rdi, edi                            ; sign-extend month into RDI (64-bit)
    mov     rax, QWORD PTR month1[0+rdi*8]      ; load pointer from table: base + month*8
    ret                                         ; return the pointer in RAX
 
.L6:
    push    rax                                         ; align stack to 16 bytes
    mov     ecx, OFFSET FLAT:__PRETTY_FUNCTION__.2423   ; function name as 4th argument
    mov     edx, 29                                     ; line number as 3rd argument
    mov     esi, OFFSET FLAT:.LC1                       ; filename as 2nd argument
    mov     edi, OFFSET FLAT:.LC2                       ; condition string as 1st argument
    call    __assert_fail                               ; call assert failure handler (terminates program)
 
__PRETTY_FUNCTION__.2423: .string "get_month1_checked" ; function name string used by GCC assert
```
 
<p>
The GCC macro also passes the function name for convenience. Nothing comes for free, and sanitizing checks are no exception. They slow the program down, especially if <code style="color:chartreuse;">assert()</code> is present in small, time-critical functions. MSVC for example leaves the checks in debug builds, but in release builds they all disappear. The Windows NT kernel ships in two versions: "checked" and "free" builds. The first contains validation checks (hence "checked"), the second does not (hence "free" from the checks). The "checked" kernel runs slower because of all those checks, which is why it is only used in debugging sessions.
</p>
 
<hr>
 
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>Accessing specific character</b></h1>
<hr>
 
<p>
An array of pointers to strings can be accessed like this:
</p>
 
```c
#include <stdio.h> // include standard I/O header
 
const char* month[] = { // array of pointers to month name strings
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
};
 
int main() {
    // 4th month, 5th character:
    printf ("%c\n", month[3][4]); // month[3] = "April", month[3][4] = 'l' (5th character, 0-indexed)
};
```
 
<p>
Because <code style="color:chartreuse;">month[3]</code> is an expression of type <code style="color:chartreuse;">const char*</code>. Then the fifth character is taken from that expression by adding 4 bytes to its address.
</p>
<p>
By the way, the list of arguments passed to <code style="color:chartreuse;">main()</code> has the same type:
</p>
 
```c
#include <stdio.h> // include standard I/O header
 
int main(int argc, char *argv[]) { // argv is an array of pointers to argument strings
    printf ("3rd argument, 2nd character: %c\n", argv[3][1]); // argv[3] = 3rd argument string, [1] = 2nd character
};
```
 
<p>
It is very important to understand that, even though the syntax looks similar, this is <b style="color:cornflowerblue;">completely different</b> from the two-dimensional arrays we will talk about next.
</p>
<p>
Another important thing to notice: the strings we access must be encoded in a system where each character is one byte, such as ASCII and extended ASCII. UTF-8 will not work here.
</p>
 
<hr>
 
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.26.6 Multidimensional arrays</b></h1>
<img src="/assets/img/multidimensionalarrays.jpeg" alt="multidimensionalarray" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<hr>
 
<p>
Internally, a multidimensional array is exactly the same thing as a one-dimensional array. Since computer memory is linear, it is one single one-dimensional array. For convenience, this multidimensional array can easily be represented as a one-dimensional array.
</p>
<p>
To be more specific, a two-dimensional array (such as <code style="color:chartreuse;">char a[3][4]</code>) is not real in memory — it is just a long one-dimensional array (12 consecutive cells). The compiler simply lets us write <code style="color:chartreuse;">a[x][y]</code> for our convenience, but internally it calculates the address itself.
</p>
<p>
For example, this is how the elements of a 3×4 array are arranged in a one-dimensional array of 12 cells:
</p>
<img src="/assets/img/table.jpeg" alt="3x4 array layout" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
And here is how each cell of a 3×4 array is laid out in memory:
</p>
<img src="/assets/img/table2.jpeg" alt="memory layout of 3x4 array" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
So, to calculate the address of the element we want, we first multiply the first index by 4 (the width of the array) and then add the second index.
</p>
<p>
To make it simple — assume you have the array <code style="color:chartreuse;">char a[3][4]</code>, which has <b style="color:cornflowerblue;">3 rows</b> and <b style="color:cornflowerblue;">4 columns</b> = 12 cells in memory. Memory is <b style="color:cornflowerblue;">linear</b>, like a number strip from 0 to 11.
</p>
<p>
To reach a specific cell (for example <code style="color:chartreuse;">a[1][2]</code>), the compiler does a very simple calculation:
</p>
<p>* <b style="color:cornflowerblue;">The first index</b> = the row number (here 1)</p>
<p>* <b style="color:cornflowerblue;">The array width</b> = number of columns = 4</p>
<p>* Multiply: 1 × 4 = 4 (meaning: "skip the entire first row")</p>
<p>* <b style="color:cornflowerblue;">The second index</b> = the column number (here 2)</p>
<p>* Add: 4 + 2 = 6</p>
<p>
So <code style="color:chartreuse;">a[1][2]</code> is located at <b style="color:cornflowerblue;">position 6</b> in the linear strip.
</p>
<p>
This is called <b style="color:cornflowerblue;">row-major order</b>, and this method of representing arrays is used in C/C++ and Python at least. The term row-major order in plain English means: "first write the elements of the first row, then the second row … and finally the elements of the last row."
</p>
<p>
There is another representation method called <b style="color:cornflowerblue;">column-major order</b> (where the indices are used in the reverse order), and that is used in Fortran, MATLAB, and R at least. The term column-major order in plain English means: "first write the elements of the first column, then the second column … and finally the elements of the last column."
</p>
<p>
If we ask ourselves which approach is better — in general, from a performance and cache memory perspective, the best way to organize data is the one where elements are accessed sequentially. So if your function accesses data row by row (per row), then row-major order is better, and vice versa.
</p>
 
<hr>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Two-dimensional array example</h2>
 
<p>
We will work with an array of type char, meaning each element needs only one byte in memory.
</p>
 
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Row filling example</h3>
 
<p>
Let's fill the second row with the values 0..3:
</p>
<p>
<b>Listing 1.248: Row filling example</b>
</p>
 
```c
#include <stdio.h> // include standard I/O header
 
char a[3][4]; // global 2D array: 3 rows × 4 columns = 12 bytes total
 
int main() {
    int x, y; // loop counters
 
    // clear array
    for (x=0; x<3; x++)        // iterate over rows
        for (y=0; y<4; y++)    // iterate over columns
            a[x][y]=0;         // set every element to zero
 
    // fill second row by 0..3:
    for (y=0; y<4; y++)        // iterate over columns of row 1
        a[1][y]=y;             // a[1][0]=0, a[1][1]=1, a[1][2]=2, a[1][3]=3
};
```
 
<p>
The three rows are distinct, and we will see that the second row now contains the values 0, 1, 2, and 3.
</p>
 
<h3 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Column filling example</h3>
 
<p>
Let's fill the third column with the values 0..2:
</p>
 
```c
#include <stdio.h> // include standard I/O header
 
char a[3][4]; // global 2D array: 3 rows × 4 columns = 12 bytes total
 
int main() {
    int x, y; // loop counters
 
    // clear array
    for (x=0; x<3; x++)        // iterate over rows
        for (y=0; y<4; y++)    // iterate over columns
            a[x][y]=0;         // set every element to zero
 
    // fill third column by 0..2:
    for (x=0; x<3; x++)        // iterate over rows
        a[x][2]=x;             // a[0][2]=0, a[1][2]=1, a[2][2]=2
};
```
 
<p>
Across the three rows, we will see that in each row, the third position holds the written values: 0, 1, and 2.
</p>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>Access two-dimensional array as one-dimensional</b></h1>
<hr>
 
<p>
We can easily verify that it is possible to access a two-dimensional array as if it were a one-dimensional array, and there are at least two ways to do that:
</p>
 
```c
#include <stdio.h> // include standard I/O header
 
char a[3][4]; // global 2D array: 3 rows × 4 columns = 12 bytes
 
char get_by_coordinates1 (char array[3][4], int a, int b) { // access using 2D array syntax
    return array[a][b]; // compiler handles address calculation automatically
};
 
char get_by_coordinates2 (char *array, int a, int b) {
    // treat input array as one-dimensional
    // 4 is array width here
    return array[a*4+b]; // manually compute linear index: row*width + column
};
 
char get_by_coordinates3 (char *array, int a, int b) {
    // treat input array as pointer,
    // calculate address, get value at it
    // 4 is array width here
    return *(array+a*4+b); // pointer arithmetic: base + row*width + column
};
 
int main() {
    a[2][3]=123;                              // set element at row 2, column 3 to 123
    printf ("%d\n", get_by_coordinates1(a, 2, 3)); // all three should print 123
    printf ("%d\n", get_by_coordinates2(a, 2, 3));
    printf ("%d\n", get_by_coordinates3(a, 2, 3));
};
```
 
<p>
When we compile and run it: the correct values come out. What MSVC 2013 did is something remarkable — all three routines produced the exact same code.
</p>
<p>
<b>Listing 1.250: Optimizing MSVC 2013 x64</b>
</p>
 
```nasm
; All three functions compile to identical machine code
array$ = 8          ; first argument: base address of array (in RCX)
a$ = 16             ; second argument: row index (in RDX)
b$ = 24             ; third argument: column index (in R8)
 
get_by_coordinates3 PROC
; RCX = address of array
; RDX = a (row index)
; R8  = b (column index)
    movsxd  rax, r8d            ; sign-extend b (32-bit) into RAX (64-bit)
    movsxd  r9, edx             ; sign-extend a (32-bit) into R9 (64-bit)
    add     rax, rcx            ; RAX = b + base address of array
    movzx   eax, BYTE PTR [rax+r9*4]
    ; AL = load byte at address (b + base) + a*4 = base + a*4 + b = a[a][b]
    ret     0
get_by_coordinates3 ENDP
 
array$ = 8
a$ = 16
b$ = 24
get_by_coordinates2 PROC        ; identical code to get_by_coordinates3
    movsxd  rax, r8d            ; sign-extend b into RAX
    movsxd  r9, edx             ; sign-extend a into R9
    add     rax, rcx            ; RAX = b + base
    movzx   eax, BYTE PTR [rax+r9*4] ; load byte at base + a*4 + b
    ret     0
get_by_coordinates2 ENDP
 
array$ = 8
a$ = 16
b$ = 24
get_by_coordinates1 PROC        ; identical code to the other two
    movsxd  rax, r8d            ; sign-extend b into RAX
    movsxd  r9, edx             ; sign-extend a into R9
    add     rax, rcx            ; RAX = b + base
    movzx   eax, BYTE PTR [rax+r9*4] ; load byte at base + a*4 + b
    ret     0
get_by_coordinates1 ENDP
```
 
<p>
GCC also generates equivalent routines, but slightly different:
</p>
 
```nasm
; RDI = address of array
; RSI = a (row index)
; RDX = b (column index)
 
get_by_coordinates1:
    ; sign-extend input 32-bit int values "a" and "b" to 64-bit ones
    movsx   rsi, esi                ; sign-extend a into RSI (64-bit)
    movsx   rdx, edx                ; sign-extend b into RDX (64-bit)
    lea     rax, [rdi+rsi*4]        ; RAX = base + a*4
    movzx   eax, BYTE PTR [rax+rdx]
    ; AL = load byte at (base + a*4) + b = base + a*4 + b
    ret
 
get_by_coordinates2:
    lea     eax, [rdx+rsi*4]        ; EAX = b + a*4 (compute linear index in 32-bit)
    cdqe                            ; sign-extend EAX to RAX (64-bit)
    movzx   eax, BYTE PTR [rdi+rax]
    ; AL = load byte at base + (b + a*4)
    ret
 
get_by_coordinates3:
    sal     esi, 2                  ; ESI = a << 2 = a*4
    ; sign-extend input 32-bit int values "a*4" and "b" to 64-bit ones
    movsx   rdx, edx                ; sign-extend b into RDX (64-bit)
    movsx   rsi, esi                ; sign-extend a*4 into RSI (64-bit)
    add     rdi, rsi                ; RDI = base + a*4
    movzx   eax, BYTE PTR [rdi+rdx]
    ; AL = load byte at (base + a*4) + b
    ret
```
 
<hr>
 
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>Three-dimensional array example</b></h1>
<hr>
 
<p>
The same story applies to multidimensional arrays. Now we will work with an array of type int — each element needs 4 bytes in memory. Let's see:
</p>
 
```c
#include <stdio.h> // include standard I/O header
 
int a[10][20][30]; // global 3D array: 10 × 20 × 30 = 6000 integers = 24000 bytes
 
void insert(int x, int y, int z, int value) { // write a value into the 3D array
    a[x][y][z]=value; // compiler computes: base + x*600*4 + y*30*4 + z*4
};
```
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">x86</h2>
 
<p>
When compiled in MSVC 2010:
</p>
<p>
<b>Listing 1.253: MSVC 2010</b>
</p>
 
```nasm
_DATA SEGMENT
COMM _a:DWORD:01770H    ; reserve 0x1770 = 6000 DWORDs = 24000 bytes for array a
_DATA ENDS
 
PUBLIC _insert
_TEXT SEGMENT
_x$     = 8    ; size = 4 ; stack offset of argument x
_y$     = 12   ; size = 4 ; stack offset of argument y
_z$     = 16   ; size = 4 ; stack offset of argument z
_value$ = 20   ; size = 4 ; stack offset of argument value
 
_insert PROC
    push    ebp
    mov     ebp, esp
    mov     eax, DWORD PTR _x$[ebp]
    imul    eax, 2400               ; EAX = x * 2400  (= x * 600 elements * 4 bytes)
    mov     ecx, DWORD PTR _y$[ebp]
    imul    ecx, 120                ; ECX = y * 120   (= y * 30 elements * 4 bytes)
    lea     edx, DWORD PTR _a[eax+ecx]
    ; EDX = base_of_a + x*2400 + y*120
    mov     eax, DWORD PTR _z$[ebp]
    mov     ecx, DWORD PTR _value$[ebp]
    mov     DWORD PTR [edx+eax*4], ecx
    ; store value at address EDX + z*4 = base + x*2400 + y*120 + z*4
    pop     ebp
    ret     0
_insert ENDP
_TEXT ENDS
```
 
<p>
Nothing special. To compute the index, the three input arguments are used in the formula:
</p>
<p>
<code style="color:chartreuse;">address = 600 · 4 · x + 30 · 4 · y + 4z</code>
</p>
<p>
in order to represent the array as multidimensional. Note that the type int is 32 bits (4 bytes), which is why all the coefficients must be multiplied by 4.
</p>
<p>
<b>Listing 1.254: GCC 4.4.1</b>
</p>
 
```nasm
public insert
insert proc near
x     = dword ptr  8    ; stack offset of argument x
y     = dword ptr  0Ch  ; stack offset of argument y
z     = dword ptr  10h  ; stack offset of argument z
value = dword ptr  14h  ; stack offset of argument value
 
    push    ebp
    mov     ebp, esp
    push    ebx
    mov     ebx, [ebp+x]    ; EBX = x
    mov     eax, [ebp+y]    ; EAX = y
    mov     ecx, [ebp+z]    ; ECX = z
    lea     edx, [eax+eax]  ; EDX = y*2
    mov     eax, edx        ; EAX = y*2
    shl     eax, 4          ; EAX = (y*2) << 4 = y*2*16 = y*32
    sub     eax, edx        ; EAX = y*32 - y*2 = y*30
    imul    edx, ebx, 600   ; EDX = x*600
    add     eax, edx        ; EAX = y*30 + x*600
    lea     edx, [eax+ecx]  ; EDX = y*30 + x*600 + z
    mov     eax, [ebp+value]
    mov     dword ptr ds:a[edx*4], eax
    ; store value at address a + (x*600 + y*30 + z)*4
    pop     ebx
    pop     ebp
    retn
insert endp
```
 
<p>
GCC handled it differently. For one of the operations in the calculation (30y), GCC generated code without any multiply instructions. Here is what happened:
</p>
<p>
<code style="color:chartreuse;">(y+y) ≪ 4 − (y+y) = (2y) ≪ 4 − 2y = 2·16·y − 2y = 32y − 2y = 30y</code>
</p>
<p>
So to calculate 30y it used one addition + one shift + one subtraction. That is faster.
</p>
 
<hr>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM + Non-optimizing Xcode 4.6.3 (LLVM) (Thumb mode)</h2>
 
<p>
<b>Listing 1.255: Non-optimizing Xcode 4.6.3 (LLVM) (Thumb mode)</b>
</p>
 
```nasm
_insert
; value = -0x10
; z     = -0xC
; y     = -8
; x     = -4
 
    SUB     SP, SP, #0x10           ; allocate 16 bytes on stack for 4 int-sized local variables
 
    MOV     R9, 0xFC2               ; load PC-relative offset to get address of array a
    ADD     R9, PC
    LDR.W   R9, [R9]               ; R9 = pointer to array a
 
    STR     R0, [SP, #0x10+x]      ; save x onto local stack
    STR     R1, [SP, #0x10+y]      ; save y onto local stack
    STR     R2, [SP, #0x10+z]      ; save z onto local stack
    STR     R3, [SP, #0x10+value]  ; save value onto local stack
 
    LDR     R0, [SP, #0x10+value]  ; reload value from stack
    LDR     R1, [SP, #0x10+z]      ; reload z from stack
    LDR     R2, [SP, #0x10+y]      ; reload y from stack
    LDR     R3, [SP, #0x10+x]      ; reload x from stack
 
    MOV     R12, 2400
    MUL.W   R3, R3, R12            ; R3 = x * 2400  (= x * 600 elements * 4 bytes)
    ADD     R3, R9                  ; R3 = base_of_a + x*2400
 
    MOV     R9, 120
    MUL.W   R2, R2, R9             ; R2 = y * 120   (= y * 30 elements * 4 bytes)
    ADD     R2, R3                  ; R2 = base + x*2400 + y*120
 
    LSLS    R1, R1, #2             ; R1 = z * 4     (left shift by 2 = multiply by 4)
    ADD     R1, R2                  ; R1 = base + x*2400 + y*120 + z*4  (final element address)
 
    STR     R0, [R1]               ; store value at computed address → a[x][y][z] = value
 
    ADD     SP, SP, #0x10          ; deallocate local stack space
    BX      LR                     ; return
```
 
<p>
The non-optimizing LLVM saves all variables onto the local stack, which is unnecessary extra work. The address of the array element is calculated using the same formula we saw before.
</p>
 
<hr>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM + Optimizing Xcode 4.6.3 (LLVM) (Thumb mode)</h2>
 
<p>
<b>Listing 1.256: Optimizing Xcode 4.6.3 (LLVM) (Thumb mode)</b>
</p>
 
```nasm
_insert
    MOVW    R9, #0x10FC
    MOVT.W  R9, #0
    ADD     R9, PC
    LDR.W   R9, [R9]               ; R9 = pointer to array a
 
    MOV.W   R12, #2400             ; load constant 2400 (= 600 elements * 4 bytes) into R12
 
    RSB.W   R1, R1, R1, LSL #4    ; R1 = y*16 - y = y*15  (RSB = Reverse Subtract: dst = op2 - op1)
                                   ; note: actual target is y*30, next step doubles it
 
    MLA.W   R0, R0, R12, R9       ; R0 = x*2400 + R9  (MLA = Multiply-Accumulate: R0 = R0*R12 + R9)
                                   ; R0 = base_of_a + x*2400
 
    ADD.W   R0, R0, R1, LSL #3    ; R0 = R0 + R1*8 = base + x*2400 + y*15*8 = base + x*2400 + y*120
 
    STR.W   R3, [R0, R2, LSL #2]  ; store value(R3) at address R0 + z*4 → a[x][y][z] = value
 
    BX      LR                     ; return
```
 
<p>
The tricks of replacing multiplication with shifts + addition + subtraction that we saw before are also present here. Here we also see a new instruction: <code style="color:chartreuse;">RSB (Reverse Subtract)</code>. It works exactly like <code style="color:chartreuse;">SUB</code>, but it swaps the operands before executing.
</p>
<p>
Why? <code style="color:chartreuse;">SUB</code> and <code style="color:chartreuse;">RSB</code> are instructions where a shift coefficient can be applied to the second operand (such as LSL#4). But that coefficient can only be applied to the second operand. That is fine for commutative operations (like addition or multiplication, where you can swap the operands without changing the result). But subtraction is a non-commutative operation, which is why <code style="color:chartreuse;">RSB</code> exists for exactly these cases.
</p>

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>MIPS</b></h1>
<hr>
 
<p>
My example is very small, so GCC decided to place the array a inside the 64KiB region reachable by the Global Pointer.
</p>
<p>
<b>Listing 1.257: Optimizing GCC 4.4.5 (IDA)</b>
</p>
 
```nasm
insert:
; $a0 = x
; $a1 = y
; $a2 = z
; $a3 = value
 
        sll     $v0, $a0, 5         ; $v0 = $a0 << 5 = x*32
        sll     $a0, 3              ; $a0 = $a0 << 3 = x*8
        addu    $a0, $v0            ; $a0 = x*8 + x*32 = x*40
 
        sll     $v1, $a1, 5         ; $v1 = $a1 << 5 = y*32
        sll     $v0, $a0, 4         ; $v0 = $a0 << 4 = x*40*16 = x*640
        sll     $a1, 1              ; $a1 = $a1 << 1 = y*2
 
        subu    $a1, $v1, $a1       ; $a1 = y*32 - y*2 = y*30
        subu    $a0, $v0, $a0       ; $a0 = x*640 - x*40 = x*600
 
        la      $gp, __gnu_local_gp ; load global pointer
 
        addu    $a0, $a1, $a0       ; $a0 = y*30 + x*600
        addu    $a0, $a2            ; $a0 = y*30 + x*600 + z  (final linear index)
 
        ; load address of table:
        lw      $v0, (a & 0xFFFF)($gp) ; $v0 = base address of array a
 
        ; multiply index by 4 to seek array element (each int = 4 bytes):
        sll     $a0, 2              ; $a0 = (x*600 + y*30 + z) * 4
 
        ; sum up multiplied index and table address:
        addu    $a0, $v0, $a0       ; $a0 = base + (x*600 + y*30 + z)*4
 
        ; store value into table and return:
        sw      $a3, 0($a0)         ; a[x][y][z] = value
        jr      $ra                 ; return
```
 
<hr>
 
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>Getting dimensions of multidimensional array</b></h1>
<hr>
 
<p>
Any function that processes strings, if you pass it an array of characters, cannot know the size of the array it received. Likewise, if a function processes a 2D array, only one of the dimensions can be determined.
</p>
<p>
An example of this:
</p>
 
```c
int get_element(int array[10][20], int x, int y) { // function receives a 2D array
    return array[x][y]; // access element at row x, column y
};
 
int main() {
    int array[10][20]; // declare a 10×20 array
    get_element(array, 4, 5); // call with x=4, y=5
};
```
 
<p>
...if compiled (with any compiler) and then decompiled with Hex-Rays:
</p>
 
```c
int get_element(int *array, int x, int y) { // Hex-Rays sees only a pointer, not a 2D array
    return array[20 * x + y]; // only the second dimension (20) is visible — first dimension is lost
}
```
 
<p>
There is no way to know the size of the first dimension. If the x that was passed is too large, a buffer overflow will happen and it will read an element from a random location in memory.
</p>
<p>
<b>And a 3D array:</b>
</p>
 
```c
int get_element(int array[10][20][30], int x, int y, int z) { // function receives a 3D array
    return array[x][y][z]; // access element at [x][y][z]
};
 
int main() {
    int array[10][20][30]; // declare a 10×20×30 array
    get_element(array, 4, 5, 6); // call with x=4, y=5, z=6
};
```
 
<p>
Hex-Rays:
</p>
 
```c
int get_element(int *array, int x, int y, int z) { // only a pointer is visible
    return array[600 * x + z + 30 * y]; // only the last two dimensions (30, 20) survive — first is lost
}
```
 
<p>
Again, only two of the three dimensions can be determined.
</p>
 
<hr>
 
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.26.7 Pack of strings as a two-dimensional array</b></h1>
<img src="/assets/img/twodimensionalarray.jpeg" alt="twodimensionalarray" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<hr>
 
<p>
Let's go back again to the function that returns the month name that we talked about before. As you can see, at least one memory load operation is needed in order to fetch the pointer to the string that is the month name. Is it possible to get rid of that memory load entirely? In fact yes, if we represent the list of strings as a two-dimensional array:
</p>
 
```c
#include <stdio.h> // include standard I/O header
 
const char month2[12][10]= { // 2D array: 12 months × 10 bytes each (fixed-width storage)
    { 'J','a','n','u','a','r','y', 0, 0, 0 },   // "January"   + 3 padding zeros
    { 'F','e','b','r','u','a','r','y', 0, 0 },   // "February"  + 2 padding zeros
    { 'M','a','r','c','h', 0, 0, 0, 0, 0 },      // "March"     + 5 padding zeros
    { 'A','p','r','i','l', 0, 0, 0, 0, 0 },      // "April"     + 5 padding zeros
    { 'M','a','y', 0, 0, 0, 0, 0, 0, 0 },        // "May"       + 7 padding zeros
    { 'J','u','n','e', 0, 0, 0, 0, 0, 0 },       // "June"      + 6 padding zeros
    { 'J','u','l','y', 0, 0, 0, 0, 0, 0 },       // "July"      + 6 padding zeros
    { 'A','u','g','u','s','t', 0, 0, 0, 0 },      // "August"    + 4 padding zeros
    { 'S','e','p','t','e','m','b','e','r', 0 },   // "September" + 1 padding zero (longest name = 9 chars)
    { 'O','c','t','o','b','e','r', 0, 0, 0 },     // "October"   + 3 padding zeros
    { 'N','o','v','e','m','b','e','r', 0, 0 },    // "November"  + 2 padding zeros
    { 'D','e','c','e','m','b','e','r', 0, 0 }     // "December"  + 2 padding zeros
};
 
// in 0..11 range
const char* get_month2 (int month) { // return pointer to the start of the month name
    return &month2[month][0]; // address = base + month*10 (no pointer table needed)
};
```
 
<p>
And here is what happened:
</p>
<p>
<b>Listing 1.258: Optimizing MSVC 2013 x64</b>
</p>
 
```nasm
month2  DB 04aH, 061H, 06eH, 075H, 061H, 072H, 079H, 00H, 00H, 00H
        ; ... (rest of the month data follows)
 
get_month2 PROC
        movsxd  rax, ecx                    ; sign-extend month (32-bit) into RAX (64-bit)
        lea     rcx, QWORD PTR [rax+rax*4]  ; RCX = month + month*4 = month*5
        lea     rax, OFFSET FLAT:month2     ; RAX = base address of the 2D table
        lea     rax, QWORD PTR [rax+rcx*2]  ; RAX = base + month*5*2 = base + month*10
        ret     0
get_month2 ENDP
```
 
<p>
No memory access at all. All the function does is calculate the address where the first character of the month name will be: <code style="color:chartreuse;">pointer_to_the_table + month * 10</code>. There are also two <code style="color:chartreuse;">LEA</code> instructions, which effectively act like <code style="color:chartreuse;">MUL</code> + <code style="color:chartreuse;">MOV</code>. The array width is 10 bytes. Indeed, the longest string here is "September" which is 9 bytes + a null terminator = 10 bytes. The remaining month names are padded with zero bytes so they all occupy the same space (10 bytes). This means the function became much faster because the start of each string can be computed at a fixed, easily calculated address.
</p>
<p>
<b>Optimizing GCC 4.9</b> made it even shorter:
</p>
<p>
<b>Listing 1.259: Optimizing GCC 4.9 x64</b>
</p>
 
```nasm
get_month2:
        movsx   rdi, edi                ; sign-extend month (32-bit) into RDI (64-bit)
        lea     rax, [rdi+rdi*4]        ; RAX = month + month*4 = month*5
        lea     rax, month2[rax+rax]    ; RAX = base + month*5*2 = base + month*10
        ret
```
 
<p>
LEA is also used here for multiplication by 10.
</p>
<p>
<b>Non-optimizing compilers</b> do the multiplication differently.
</p>
<p>
<b>Listing 1.260: Non-optimizing GCC 4.9 x64</b>
</p>
 
```nasm
get_month2:
        push    rbp
        mov     rbp, rsp
        mov     DWORD PTR [rbp-4], edi      ; spill month argument onto stack
        mov     eax, DWORD PTR [rbp-4]      ; reload month from stack
        movsx   rdx, eax                    ; RDX = sign-extended month (64-bit)
        mov     rax, rdx                    ; RAX = month
        sal     rax, 2                      ; RAX = month * 4
        add     rax, rdx                    ; RAX = month*4 + month = month*5
        add     rax, rax                    ; RAX = month*5 * 2 = month*10
        add     rax, OFFSET FLAT:month2     ; RAX = base + month*10  (final address)
        pop     rbp
        ret
```
 
<p>
<b>Listing 1.261: Non-optimizing MSVC 2013 x64</b>
</p>
 
```nasm
month$ = 8
get_month2 PROC
        mov     DWORD PTR [rsp+8], ecx              ; spill month argument onto stack
        movsxd  rax, DWORD PTR month$[rsp]          ; RAX = sign-extended month (64-bit)
        imul    rax, rax, 10                        ; RAX = month * 10
        lea     rcx, OFFSET FLAT:month2             ; RCX = base address of the table
        add     rcx, rax                            ; RCX = base + month*10  (final address)
        mov     rax, rcx                            ; RAX = result
        mov     ecx, 1
        imul    rcx, rcx, 0                         ; RCX = 1*0 = 0  (strange! this does nothing useful)
        add     rax, rcx                            ; RAX = result + 0  (adding zero, no effect)
        ret     0
get_month2 ENDP
```
 
<p>
There is something strange here: why does it multiply by zero and then add zero at the end? This is a quirk in the compiler's code generator that was not caught in testing (the code works correctly in the end). We are looking at this so you understand that sometimes you should not overthink these strange compiler quirks.
</p>
 
<hr>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">32-bit ARM</h2>
 
<p>
<b>Optimizing Keil for Thumb mode</b> uses the MULS instruction:
</p>
<p>
<b>Listing 1.262: Optimizing Keil 6/2013 (Thumb mode)</b>
</p>
 
```nasm
; R0 = month
        MOVS    r1, #0xa            ; R1 = 10  (the array row width)
        MULS    r0, r1, r0          ; R0 = 10 * month  (byte offset into the table)
        LDR     r1, |L0.68|         ; R1 = base address of the table
        ADDS    r0, r0, r1          ; R0 = base + month*10  (final address of month string)
        BX      lr                  ; return
```
 
<p>
<b>Optimizing Keil for ARM mode</b> uses add + shift:
</p>
<p>
<b>Listing 1.263: Optimizing Keil 6/2013 (ARM mode)</b>
</p>
 
```nasm
; R0 = month
        LDR     r1, |L0.104|            ; R1 = base address of the table
        ADD     r0, r0, r0, LSL #2      ; R0 = month + month*4 = month*5
        ADD     r0, r1, r0, LSL #1      ; R0 = base + month*5*2 = base + month*10
        BX      lr                      ; return
```
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">ARM64</h2>
 
<p>
<b>Listing 1.264: Optimizing GCC 4.9 ARM64</b>
</p>
 
```nasm
; W0 = month
        sxtw    x0, w0                  ; X0 = sign-extend month (32-bit) to 64-bit
        adrp    x1, .LANCHOR1
        add     x1, x1, :lo12:.LANCHOR1 ; X1 = base address of the table (ADRP/ADD pair)
        add     x0, x0, x0, lsl 2       ; X0 = month + month*4 = month*5
        add     x0, x1, x0, lsl 1       ; X0 = base + month*5*2 = base + month*10
        ret                             ; return
```
 
<hr>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">MIPS</h2>
 
<p>
<b>Listing 1.265: Optimizing GCC 4.4.5 (IDA)</b>
</p>
 
```nasm
.globl get_month2
get_month2:
; $a0 = month
        sll     $v0, $a0, 3         ; $v0 = month << 3 = month*8
        sll     $a0, 1              ; $a0 = month << 1 = month*2
        addu    $a0, $v0            ; $a0 = month*2 + month*8 = month*10  (byte offset)
 
        la      $v0, month2         ; $v0 = base address of the table
        addu    $v0, $a0            ; $v0 = base + month*10  (final address of month string)
        jr      $ra                 ; return
```
 
<p>
In short, this is a somewhat old technique for storing text. You will find it a lot in Oracle RDBMS for example. It is hard to say today whether it is worth doing on modern computers. But it is a very good example of arrays, which is why it was added to the book.
</p>
 
<hr>
 
<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>1.26.8 Conclusion</b></h1>
<hr>
 
<p>
An array is a pack of values in memory sitting next to each other. This is true for any element type, even if those elements are structures. Accessing a specific element in an array is nothing more than calculating its address. That means a pointer to an array and the address of its first element are the same thing. That is why <code style="color:chartreuse;">ptr[0]</code> and <code style="color:chartreuse;">*ptr</code> are equivalent in C/C++.
</p>
<p>
An interesting thing: Hex-Rays often substitutes the first form for the second when it does not know it is dealing with a pointer to a full array and thinks it is dealing with a pointer to a single variable.
</p>
 

</div>