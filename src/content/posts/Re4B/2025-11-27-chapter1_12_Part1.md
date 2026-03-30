---
title: "CH1.12 - scanf() (Part 1)"
published: 2025-11-27
description: "Analyzing how compilers handle scanf() and user input in x86/x64 assembly"
author: "0xV3n0m"
category: "Re4B"
tags: ["Reverse Engineering", "Books", "Assembly"]
image: "/assets/img/reverse11.png"
draft: false
lang: "eng"

# Series configuration
type: "course"
series: "re4b"
seriesOrder: 11
seriesTitle: "Reverse Engineering for Beginners"
seriesDescription: "A beginner-friendly book covering x86/x64 reverse engineering through real compiler output and code patterns."
seriesImage: "/assets/img/RE4B.png"
---

<div style="line-height:1.9; font-size:21px; direction:ltr;">

<h1 style="color:#9a3ba6;"><b>scanf()</b></h1>

<hr>

<p>
Let's make an example like this on scanf()
</p>

<!-- 🧠 C Source Code for scanf Example -->
<div class="code-box" data-lang="C" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">

  <!-- Header -->
  <div style="background:#161b22;display:flex;align-items:center;justify-content:space-between;padding:0.6rem 1rem;">
    <div style="display:flex;gap:6px;">
      <span style="width:12px;height:12px;border-radius:50%;background:#ff5f56;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#ffbd2e;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#27c93f;"></span>
    </div>
    <span style="font-size:0.9rem;color:#8b949e;">C</span>
    <button onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText);this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000);" style="background:#21262d;border:1px solid #30363d;color:#8b949e;font-size:0.8rem;padding:3px 8px;border-radius:6px;cursor:pointer;">Copy</button>
  </div>

  <!-- Code -->
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
#include &lt;stdio.h&gt;    // Include the standard I/O header

int main()                // Program entry point
{
    int x;                // Declare an integer variable x
    printf("Enter X:\n"); // Print prompt for user input
    scanf("%d", &x);      // Read integer input from user and store in x (using address of x)
    printf("You entered %d...\n", x); // Print the entered value
    return 0;             // Return success
}
</code>
  </pre>
</div>

<p>
The author explained at that time and said that it is not smart to use <code style = "color: chartreuse;">scanf()</code> to deal with the user these days. But we can, nevertheless, illustrate how to pass a pointer to an int type variable
</p>

<h3 style="color: aqua;"><b>About pointers</b></h3>

<hr>

<p>
The author said at that time and explained and said that pointers are one of the basic concepts in computer science because simply when you have large data (like arrays or objects), passing them as a copy to another function takes time and space
But if you send only its address, then you save time and space and the function can access it directly
He gave an example on the Pointer and said: If you are going to print a string on the console, it is much easier to send its address to the OS kernel. Also, if the function that is called needs to modify the large array or structure that it received as a parameter and then return the entire structure, then the matter becomes almost absurd. So the simplest thing we can do is to send the address of the array or structure to the called function, and leave it to change what it needs to change.
</p>

<p>
Well, if you still don't understand, I will explain the matter to you more:
</p>

<p>
This is an example I used to clarify things a bit
</p>

<!-- 🧠 C Source Code for Pointer Example -->
<div class="code-box" data-lang="C" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">

  <!-- Header -->
  <div style="background:#161b22;display:flex;align-items:center;justify-content:space-between;padding:0.6rem 1rem;">
    <div style="display:flex;gap:6px;">
      <span style="width:12px;height:12px;border-radius:50%;background:#ff5f56;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#ffbd2e;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#27c93f;"></span>
    </div>
    <span style="font-size:0.9rem;color:#8b949e;">C</span>
    <button onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText);this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000);" style="background:#21262d;border:1px solid #30363d;color:#8b949e;font-size:0.8rem;padding:3px 8px;border-radius:6px;cursor:pointer;">Copy</button>
  </div>

  <!-- Code -->
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
#include &lt;stdio.h&gt;    // Include the standard I/O header

void changeValue(int *p) {  // Function that takes a pointer to an int
    *p = 20;                // Dereference the pointer and set the value at that address to 20
}

int main() {                // Program entry point
    int x = 5;              // Declare and initialize x to 5
    printf("Before change: %d\n", x);  // Print the value before modification

    // Pass the address of x to the function
    changeValue(&x);        // &x gets the address of x

    printf("After change: %d\n", x);   // Print the value after modification
    return 0;               // Return success
}
</code>
  </pre>
</div>

<p>
To understand what happened here one by one, focus with me:<br>
In the <code style="color: chartreuse;">main</code> function, we have a variable with value <b>5</b>, then we print this value, then we send the address of x to a function called <code style="color: chartreuse;">changeValue</code> using <code style="color: chartreuse;">&x</code>, then inside the function called <code style="color: chartreuse;">changeValue</code>, we use the Pointer to change the value that this address points to, so the value of X changes from 5 to 20
So here, instead of sending the value of x to another function, we send its address, and this allows the function to change the value directly in memory without needing to return the modified value from the function
</p>

<p>
In x86, the address is represented as a 32-bit number (taking 4 bytes), and in x86-64 it is 64-bit (taking 8 bytes). By the way, this is the reason that makes some people annoyed by the transition to x86-64 — all pointers in x64 architecture need double space, including the cache memory which is "expensive" memory
</p>

<p>
We can work with <b style = "color: brown;">Untyped pointers</b> but with a little effort
</p>

<p>
Well, let's first understand what <b style = "color: brown;">Untyped pointers</b> are and then explain with effort why
Untyped pointers are pointers that are not linked to a specific type of data.
This means that you do not have to specify the type of data that this pointer will point to
</p>

<p>
We can take an example in C, which is that there is a function called memcpy() that copies a block from one place in memory to another, it takes 2 pointers of type void* as arguments, because it is impossible to predict the type of data you want to copy. The type of data is not important, what matters is the size of the block
</p>

<p>
And also I will make you understand more and give you the example in the code so you don't get lost from me
Look, this is a code here in the function that has <code style = "color: chartreuse;">memcpy()</code>
</p>

<!-- 🧠 C Source Code for memcpy Example -->
<div class="code-box" data-lang="C" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">

  <!-- Header -->
  <div style="background:#161b22;display:flex;align-items:center;justify-content:space-between;padding:0.6rem 1rem;">
    <div style="display:flex;gap:6px;">
      <span style="width:12px;height:12px;border-radius:50%;background:#ff5f56;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#ffbd2e;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#27c93f;"></span>
    </div>
    <span style="font-size:0.9rem;color:#8b949e;">C</span>
    <button onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText);this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000);" style="background:#21262d;border:1px solid #30363d;color:#8b949e;font-size:0.8rem;padding:3px 8px;border-radius:6px;cursor:pointer;">Copy</button>
  </div>

  <!-- Code -->
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
#include &lt;stdio.h&gt;    // Include the standard I/O header
#include &lt;string.h&gt;  // Include the string header for memcpy

int main() {                // Program entry point
    int source[] = {1, 2, 3, 4, 5};  // Array of integers as source
    int destination[5];     // Destination array to copy into

    // Use memcpy to copy data from source to destination
    memcpy(destination, source, sizeof(source));  // Copy the entire size of source array

    // Print the destination after copying
    printf("Values in destination: ");  // Print label
    for (int i = 0; i < 5; i++) {       // Loop through the array
        printf("%d ", destination[i]);  // Print each element
    }
    printf("\n");               // New line

    return 0;                   // Return success
}
</code>
  </pre>
</div>

<p>
Here <code style = "color: chartreuse;">memcpy()</code> takes 3 things:
</p>

<ul>
  <li style="color: chocolate;"><b>destination</b> - and to simplify things for you, the place where we will copy the data to.</li>
  <li style="color: chocolate;"><b>source</b> - and this is the place from which we will copy the data.</li>
  <li style="color: chocolate;"><b>size</b> - how much space we will transfer (number of bytes).</li>
</ul>

<p>
The void* pointer: <code style = "color: chartreuse;">memcpy()</code> function takes pointers of type void* so that it can copy any type of data, not necessarily numbers
</p>

<p>
Pointers are also used a lot when a function needs to return more than one value and we will explain this later
</p>

<p>
The <code style = "color: chartreuse;">scanf()</code>  function — an example of this case.
</p>

<p>
Besides needing to say how many values were read successfully, it also needs to return all these values.
</p>

<p>
In C/C++ the pointer type is required only for compile-time type checking.
</p>

<p>
Inside the compiled code there is no information about pointer types at all
</p>


<h1 style="color:#9a3ba6;"><b>x86</b></h1>
<img src="/assets/img/X86 Scanf().png" alt="X86 Scanf()" style="display:block; margin:20px auto; border-radius:12px; max-width:60%;">


<hr>

<p>
Here is what we get after compiling with MSVC 2010:
</p>

<!-- 🧠 Assembly Code Block (MSVC x86) -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">

  <!-- Header -->
  <div style="background:#161b22;display:flex;align-items:center;justify-content:space-between;padding:0.6rem 1rem;">
    <div style="display:flex;gap:6px;">
      <span style="width:12px;height:12px;border-radius:50%;background:#ff5f56;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#ffbd2e;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#27c93f;"></span>
    </div>
    <span style="font-size:0.9rem;color:#8b949e;">Assembly</span>
    <button onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText);this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000);" style="background:#21262d;border:1px solid #30363d;color:#8b949e;font-size:0.8rem;padding:3px 8px;border-radius:6px;cursor:pointer;">Copy</button>
  </div>

  <!-- Code -->
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
; ================================
;   x86 MSVC 2010 Output
; ================================

CONST SEGMENT                          ; Start of constant data segment
    $SG3831 DB 'Enter X:', 0Ah, 00h    ; Format string "Enter X:\n" (null-terminated)
    $SG3832 DB '%d', 00h               ; Format string "%d" for scanf (null-terminated)
    $SG3833 DB 'You entered %d...', 0Ah, 00h  ; Format string "You entered %d...\n" (null-terminated)
CONST ENDS                             ; End of constant data segment

PUBLIC _main                           ; Declare main as public
EXTRN _scanf:PROC                      ; External declaration for scanf function
EXTRN _printf:PROC                     ; External declaration for printf function

; Function compile flags: /Odtp         ; Compiler flags (debug info, etc.)

_TEXT SEGMENT                         ; Start of code segment

_x$ = -4                               ; Define macro for local variable x offset (-4 from EBP)

_main PROC                             ; Start of main procedure
    push ebp                           ; Save old EBP (base pointer) on stack
    mov  ebp, esp                      ; Set EBP to current ESP (new stack frame)

    push ecx                           ; Reserve 4 bytes on stack for local var x (not saving ECX, no pop later)

    ; printf("Enter X:\n");
    push OFFSET $SG3831                ; Push address of "Enter X:\n" string
    call _printf                       ; Call printf
    add  esp, 4                        ; Clean stack (1 argument × 4 bytes)

    ; scanf("%d", &x)
    lea  eax, [ebp+_x$]                ; Load effective address of x (EBP - 4) into EAX
    push eax                           ; Push address of x (2nd argument for scanf)
    push OFFSET $SG3832                ; Push address of "%d" string (1st argument)
    call _scanf                        ; Call scanf
    add  esp, 8                        ; Clean stack (2 arguments × 4 bytes)

    ; printf("You entered %d...\n", x)
    mov  ecx, [ebp+_x$]                ; Load value of x (from EBP - 4) into ECX
    push ecx                           ; Push value of x (2nd argument)
    push OFFSET $SG3833                ; Push address of "You entered %d...\n" (1st argument)
    call _printf                       ; Call printf
    add  esp, 8                        ; Clean stack (2 arguments × 4 bytes)

    ; return 0
    xor eax, eax                       ; Set EAX to 0 (return value)
    mov esp, ebp                       ; Restore ESP from EBP (clean locals)
    pop ebp                            ; Restore old EBP
    ret 0                              ; Return from function
_main ENDP                             ; End of main procedure

_TEXT ENDS                             ; End of code segment
</code>
  </pre>
</div>

<p>
<b style = "color: #acad1e;">Here the X was a local variable</b>
</p>

<p>
According to C/C++ standard it must be visible only inside this function and not from any other external scope.
</p>

<p>
Traditionally, the local variables are stored on the stack. There are possible other ways to store them, but in x86 this is the way.
</p>

<p>
In the instruction which is
</p>

<!-- 🧠 Assembly Code Block (Push ECX) -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">

  <!-- Header -->
  <div style="background:#161b22;display:flex;align-items:center;justify-content:space-between;padding:0.6rem 1rem;">
    <div style="display:flex;gap:6px;">
      <span style="width:12px;height:12px;border-radius:50%;background:#ff5f56;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#ffbd2e;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#27c93f;"></span>
    </div>
    <span style="font-size:0.9rem;color:#8b949e;">Assembly</span>
    <button onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText);this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000);" style="background:#21262d;border:1px solid #30363d;color:#8b949e;font-size:0.8rem;padding:3px 8px;border-radius:6px;cursor:pointer;">Copy</button>
  </div>

  <!-- Code -->
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
push ecx                               ; Reserve 4 bytes on stack for local variable x (decrements ESP by 4; not saving ECX since no pop ecx later)
</code>
  </pre>
</div>

<p>
Here this allocates 4 bytes value for the variable X and it is here not existing to save the state of <code style = "color: chartreuse;">ECX</code> 
</p>

<p>
Because originally there is no <code style = "color: chartreuse;">POP ECX</code>  at the end of the Function
</p>

<p>
And the variable X is accessed with the help of the  <code style = "color: chartreuse;">macro _x$ (its value -4)</code> and the register <code style = "color: chartreuse;">EBP </code> which points to the current frame.
</p>

<p>
During the execution of the function, <code style = "color: chartreuse;">EBP </code> is pointing to the current stack frame, and this facilitates access to the local variables and the arguments through <code style = "color: chartreuse;">EBP+offset </code>.
</p>

<p>
We can use <code style = "color: chartreuse;">ESP </code> for the same purpose, but this is not comfortable because it changes a lot. The value of <code style = "color: chartreuse;">EBP </code> can be seen as if it is a "frozen" copy of the value of ESP at the beginning of the execution of the function.
</p>

<p>
Here is a typical shape for the stack frame in a 32-bit environment:
</p>

<!-- 🧠 Stack Frame Diagram (Assembly-like) -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">

  <!-- Header -->
  <div style="background:#161b22;display:flex;align-items:center;justify-content:space-between;padding:0.6rem 1rem;">
    <div style="display:flex;gap:6px;">
      <span style="width:12px;height:12px;border-radius:50%;background:#ff5f56;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#ffbd2e;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#27c93f;"></span>
    </div>
    <span style="font-size:0.9rem;color:#8b949e;">Stack Frame</span>
    <button onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText);this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000);" style="background:#21262d;border:1px solid #30363d;color:#8b949e;font-size:0.8rem;padding:3px 8px;border-radius:6px;cursor:pointer;">Copy</button>
  </div>

  <!-- Code -->
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>

---------------------------------------------------------------
| EBP-8                  |   local variable #2  (var_8)        |  ; Example slot for another local variable (8 bytes below EBP)
---------------------------------------------------------------
| EBP-4                  |   local variable #1  (x = var_4)    |  ; Slot for variable x (4 bytes below EBP)
---------------------------------------------------------------
| EBP                    |   saved EBP                         |  ; Saved previous EBP value (at EBP+0)
---------------------------------------------------------------
| EBP+4                  |   return address                    |  ; Return address after function call
---------------------------------------------------------------
| EBP+8                  |   argument #1 (arg_0)               |  ; First function argument
---------------------------------------------------------------
| EBP+0xC                |   argument #2 (arg_4)               |  ; Second function argument
---------------------------------------------------------------
| EBP+0x10               |   argument #3 (arg_8)               |  ; Third function argument
---------------------------------------------------------------
| ...                    |  ...                                |  ; More arguments or stack space
---------------------------------------------------------------
</code>
  </pre>
</div>

<p>
In our example now the <code style = "color: chartreuse;">Scanf() </code> function has 2 arguments
</p>

<p>
The first is a pointer to the string that has <code style = "color: chartreuse;">%d </code> and the second is the address of the variable x.
</p>

<p>
First thing the address of x is put in register <code style = "color: chartreuse;">EAX </code> with the instruction:
</p>

<p>
<code style = "color: chartreuse;">lea eax, DWORD PTR _x$[ebp]</code>
</p>

<p>
<b style = "color: brown">LEA</b> abbreviation for <b style = "color: brown">load effective address</b> , and often used to form an address.
</p>

<p>
We can say that in this case LEA stores the sum of the value of EBP and the  <code style = "color: chartreuse;">macro _x$ inside EAX </code>.
</p>

<p>
And this is the same thing as:
</p>

<p>
<code style = "color: chartreuse;">lea eax, [ebp-4]</code>
</p>

<p>
Meaning it subtracts 4 from the value of <code style = "color: chartreuse;">EBP</code> and throws the result in EAX.
</p>

<p>
After that the value of  <code style = "color: chartreuse;">EAX</code> is done push on the stack and <code style = "color: chartreuse;">scanf()</code> is called.
</p>

<p>
After that <code style = "color: chartreuse;">printf()</code>  is called with the first argument — pointer to the string:
</p>

<p>
"You entered %d...\n"
</p>

<p>
The second argument is prepared with:
</p>

<p>
<code style = "color: chartreuse;">mov ecx, [ebp-4]</code>
</p>

<p>
This instruction puts the value of x not its address inside <code style = "color: chartreuse;">ECX</code>.
</p>

<p>
And after that the value of <code style = "color: chartreuse;">ECX</code>is pushed on the stack and the last printf() is called.
</p>

<div style="line-height:1.9; font-size:21px; direction:ltr;">
<h1 style="color:#9a3ba6;"><b>MSVC + OllyDbg</b></h1>
<hr>
<p>
The author began to use this example on <b style = "color: deeppink;">OllyDbg</b> but of course I did it on <b style = "color: deeppink;">X32dbg</b> so I will explain it on it and explain it in details.
</p>
<p>
Initially after you write the C code you will start to compile it using the command:
</p>

```terminal
cl /Od /Zi test.c ; this compiles the C file test.c with optimization disabled and debug symbols enabled
```
<p>
So that you also understand the command:
</p>
<ul>
  <li> <b style = "color: brown">/Od → prevents the optimizer</b></li>
  <li><b style = "color: brown">/Zi → makes debug symbols clear</b><br>
  and this will make the code similar to the one in the book exactly</li>
</ul>
<p>
We start opening it on the <b style = "color: deeppink;">X32dbg</b> and we will notice that we are first inside the <code style = "color: chartreuse;">ntdll.ll</code>

<img src="/assets/x32dbg2/1.png" alt="1" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

</p>
<p>
We go also to the <code style = "color: chartreuse;">Symbols</code> and search for the <code style = "color: chartreuse;">main</code> it will start to show the code we want
<img src="/assets/x32dbg2/2.png" alt="2" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

</p>
<p>
We will make at <code style = "color: chartreuse;"> PUSH EBP </code> Breakpoint by marking it and pressing on F9
</p>
<p>
After that you will keep pressing F9 to reach it
</p>
<p>
In the instruction which is <code style = "color: chartreuse;"> push test.6DD000</code>  this you will find it putting the address of this text <code style = "color: chartreuse;"> Enter X:\n </code>
</p>
<p>
In the instruction <code style = "color: chartreuse;"> lea eax, [ebp-4] </code> here is the step where the CPU puts the address of the variable x and puts it inside <code style = "color: chartreuse;"> EAX </code>
<img src="/assets/x32dbg2/3.png" alt="3" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

</p>
<p>
At the instruction <code style = "color: chartreuse;"> call test.6511c2 </code>  here is the place where you enter your variable in the Console and let's say I put 123
</p>
<p>
As soon as we went to the instruction <code style = "color: chartreuse;"> mov ecx,dword ptr ss:[ebp-4]</code> you will find in the Stack like this
<img src="/assets/x32dbg2/4.png" alt="4" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
</p>
<p>
Which is the Value <code style = "color: chartreuse;"> 0x7B </code> which is 123 but in Hex
</p>


<h1 style="color:#9a3ba6;"><b>GCC</b></h1>
<hr>
<p>
Let’s try compiling this code with GCC 4.4.1 under Linux:
</p>

<!-- GCC 32-bit (x86) -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <div style="background:#161b22;display:flex;align-items:center;justify-content:space-between;padding:0.6rem 1rem;">
    <div style="display:flex;gap:6px;">
      <span style="width:12px;height:12px;border-radius:50%;background:#ff5f56;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#ffbd2e;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#27c93f;"></span>
    </div>
    <span style="font-size:0.9rem;color:#8b949e;">Assembly (GCC 4.4.1 x86)</span>
  </div>
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">
<code>
main proc near

    var_20 = dword ptr -20h    ; temporary space for arguments
    var_1C = dword ptr -1Ch    ; second argument
    var_4  = dword ptr -4      ; local variable x (our input)

    push    ebp                ; save old base pointer
    mov     ebp, esp           ; set up new stack frame
    and     esp, 0FFFFFFF0h    ; align stack to 16-byte boundary
    sub     esp, 20h           ; allocate 32 bytes on stack

    ; printf("Enter X:\n") → optimized to puts("Enter X:\n")
    mov     [esp+20h+var_20], offset aEnterX   ; "Enter X:\n" address
    call    _puts              ; puts is faster than printf for simple strings

    ; scanf("%d", &x)
    mov     eax, offset aD                     ; "%d"
    lea     edx, [esp+20h+var_4]               ; address of x (on stack)
    mov     [esp+20h+var_1C], edx              ; second argument: &x
    mov     [esp+20h+var_20], eax              ; first argument: "%d"
    call    ___isoc99_scanf                    ; call scanf

    ; printf("You entered %d...\n", x)
    mov     edx, [esp+20h+var_4]               ; load the value user entered
    mov     eax, offset aYouEnteredD___        ; "You entered %d...\n"
    mov     [esp+20h+var_1C], edx              ; second argument: user's number
    mov     [esp+20h+var_20], eax              ; first argument: format string
    call    _printf                            ; print result

    mov     eax, 0             ; return 0
    leave                      ; equivalent to: mov esp,ebp / pop ebp
    retn
main endp
</code>
  </pre>
</div>

<p>
GCC replaced the <code style="color: chartreuse;">printf("Enter X:\n")</code> call with a call to <code style="color: chartreuse;">puts()</code> — the reason for this was explained before: <code>puts</code> is lighter, faster, and simpler than <code>printf</code> when no formatting is needed.
</p>
<p>
Just like in MSVC examples — arguments are placed on the stack using <code style="color: chartreuse;">MOV</code> instead of <code>PUSH</code>.
</p>
<p>
This simple example is a great demo of the fact that the compiler translates a sequence of expressions in a C/C++ block into a sequential list of machine instructions. There is nothing between the expressions in C/C++ — and therefore in the resulting machine code… there is nothing between them either. The control flow simply slides from one expression to the next.
</p>

<hr>
<h2 style="color:#3ba2a6;"><b>MSVC 2012 x64</b></h2>

<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <div style="background:#161b22;display:flex;align-items:center;justify-content:space-between;padding:0.6rem 1rem;">
    <div style="display:flex;gap:6px;">
      <span style="width:12px;height:12px;border-radius:50%;background:#ff5f56;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#ffbd2e;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#27c93f;"></span>
    </div>
    <span style="font-size:0.9rem;color:#8b949e;">Assembly (MSVC 2012 x64)</span>
  </div>
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;color:#c9d1d9;">
<code>
_DATA SEGMENT
$SG1289 DB 'Enter X:', 0aH, 00H              ; "Enter X:\n"
$SG1291 DB '%d', 00H                        ; "%d"
$SG1292 DB 'You entered %d...', 0aH, 00H    ; "You entered %d...\n"
_DATA ENDS

_TEXT SEGMENT
x$ = 32                                      ; local variable x at [rsp+32]

main PROC
$LN3:
    sub     rsp, 56                          ; allocate shadow space + locals (56 bytes)
    lea     rcx, OFFSET FLAT:$SG1289         ; first argument: "Enter X:\n"
    call    printf                           ; print prompt

    lea     rdx, QWORD PTR x$[rsp]           ; second argument: address of x
    lea     rcx, OFFSET FLAT:$SG1291         ; first argument: "%d"
    call    scanf                            ; read integer from user

    mov     edx, DWORD PTR x$[rsp]           ; load the entered value
    lea     rcx, OFFSET FLAT:$SG1292         ; first argument: result string
    call    printf                           ; print "You entered ..."

    xor     eax, eax                         ; return 0
    add     rsp, 56                          ; deallocate stack space
    ret     0
main ENDP
</code>
  </pre>
</div>

<hr>
<h2 style="color:#3ba2a6;"><b>Optimizing GCC 4.4.6 x64</b></h2>

<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <div style="background:#161b22;display:flex;align-items:center;justify-content:space-between;padding:0.6rem 1rem;">
    <div style="display:flex;gap:6px;">
      <span style="width:12px;height:12px;border-radius:50%;background:#ff5f56;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#ffbd2e;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#27c93f;"></span>
    </div>
    <span style="font-size:0.9rem;color:#8b949e;">Assembly (GCC 4.4.6 x64)</span>
  </div>
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;color:#c9d1d9;">
<code>
.LC0:
    .string "Enter X:"                       ; prompt string
.LC1:
    .string "%d"                             ; scanf format
.LC2:
    .string "You entered %d...\n"            ; output format

main:
    sub     rsp, 24                          ; allocate 24 bytes (aligned)
    mov     edi, OFFSET FLAT:.LC0            ; argument: "Enter X:"
    call    puts                             ; optimized from printf

    lea     rsi, [rsp+12]                    ; address of x (on stack)
    mov     edi, OFFSET FLAT:.LC1            ; "%d"
    xor     eax, eax                         ; clear AL (no floating-point args)
    call    __isoc99_scanf                   ; read input

    mov     esi, DWORD PTR [rsp+12]          ; load entered value into ESI
    mov     edi, OFFSET FLAT:.LC2            ; format string
    xor     eax, eax                         ; clear AL again
    call    printf                           ; print result

    xor     eax, eax                         ; return 0
    add     rsp, 24                          ; restore stack
    ret
</code>
  </pre>
</div>

<hr>
<h2 style="color:#3ba2a6;"><b>ARM: Optimizing Keil 6/2013 (Thumb mode)</b></h2>

<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <div style="background:#161b22;display:flex;align-items:center;justify-content:space-between;padding:0.6rem 1rem;">
    <div style="display:flex;gap:6px;">
      <span style="width:12px;height:12px;border-radius:50%;background:#ff5f56;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#ffbd2e;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#27c93f;"></span>
    </div>
    <span style="font-size:0.9rem;color:#8b949e;">ARM Thumb (Keil)</span>
  </div>
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;color:#c9d1d9;">
<code>
.text:00000042                 scanf_main
.text:00000042 var_8           = -8

.text:00000042 08 B5           PUSH    {R3,LR}              ; save LR and reserve space
.text:00000044 A9 A0           ADR     R0, aEnterX          ; "Enter X:\n"
.text:00000046 06 F0 D3 F8     BL      __2printf            ; print prompt
.text:0000004A 69 46           MOV     R1, SP               ; R1 = address of x (SP points to free space)
.text:0000004C AA A0           ADR     R0, aD               ; "%d"
.text:0000004E 06 F0 CD F8     BL      __0scanf             ; read integer
.text:00000052 00 99           LDR     R1, [SP,#8+var_8]    ; load entered value from stack
.text:00000054 A9 A0           ADR     R0, aYouEnteredD___  ; "You entered %d...\n"
.text:00000056 06 F0 CB F8     BL      __2printf            ; print result
.text:0000005A 00 20           MOVS    R0, #0               ; return 0
.text:0000005C 08 BD           POP     {R3,PC}              ; restore and return
</code>
  </pre>
</div>

<p>
For <code style="color: chartreuse;">scanf()</code> to read the input, it needs a pointer to an <code>int</code> — and since <code>int</code> is 32-bit, we only need 4 bytes in memory. This could fit in a register, but here the local variable <code>x</code> is placed on the stack (IDA named it <code>var_8</code>).
</p>
<p>
There was no need to explicitly allocate space — because after <code>PUSH {R3,LR}</code>, the <code>SP</code> already points to free space on the stack. So we can use it directly.
That’s why <code>MOV R1, SP</code> is used — it passes the address of <code>x</code> to <code>scanf()</code>.
</p>
<p>
Note: <code>PUSH</code> and <code>POP</code> in ARM work opposite to x86 — they are synonyms for:
<ul>
  <li><code>STMDB</code> (Store Multiple Decrement Before)</li>
  <li><code>LDMIA</code> (Load Multiple Increment After)</li>
</ul>
<code>PUSH</code> writes first, then decrements SP.<br>
<code>POP</code> increments SP first, then reads.
So after <code>PUSH</code>, SP points to free space — perfect for <code>scanf()</code> and <code>printf()</code> to use.
Then using <code>LDR</code>, the value is loaded back from the stack into <code>R1</code> to pass to <code>printf()</code>.
</p>

<hr>
<h2 style="color:#3ba2a6;"><b>ARM64: Non-optimizing GCC 4.9.1</b></h2>

<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <div style="background:#161b22;display:flex;align-items:center;justify-content:space-between;padding:0.6rem 1rem;">
    <div style="display:flex;gap:6px;">
      <span style="width:12px;height:12px;border-radius:50%;background:#ff5f56;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#ffbd2e;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#27c93f;"></span>
    </div>
    <span style="font-size:0.9rem;color:#8b949e;">ARM64 (aarch64)</span>
  </div>
  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;color:#c9d1d9;">
<code>
.LC0:
    .string "Enter X:"
.LC1:
    .string "%d"
.LC2:
    .string "You entered %d...\n"

scanf_main:
    stp     x29, x30, [sp, -32]!     ; save frame pointer and link register
    add     x29, sp, 0               ; set up frame pointer

    adrp    x0, .LC0
    add     x0, x0, :lo12:.LC0
    bl      puts                     ; print "Enter X:"

    adrp    x0, .LC1
    add     x0, x0, :lo12:.LC1       ; format "%d"

    add     x1, x29, 28              ; address of x = FP + 28 (why 28? see below)
    bl      __isoc99_scanf           ; read input

    ldr     w1, [x29,28]             ; load the 32-bit value user entered

    adrp    x0, .LC2
    add     x0, x0, :lo12:.LC2
    bl      printf                   ; print result

    mov     w0, 0                    ; return 0
    ldp     x29, x30, [sp], 32       ; restore FP/LR and deallocate 32 bytes
    ret
</code>
  </pre>
</div>

<p>
Here the compiler allocated 32 bytes for the stack frame — even though we only need 4 bytes for <code>x</code> — most likely for alignment reasons.
</p>
<p>
The most important part is where the variable <code>x</code> is stored (line with <code>add x1, x29, 28</code>).
Why 28? Because the compiler decided to place the variable at the end of the stack frame instead of the beginning.
The address is passed to <code>scanf()</code>, which writes the user input there.
Then the value (32-bit int) is loaded back at <code>ldr w1, [x29,28]</code> and passed to <code>printf()</code>.
</p>


<div style="line-height:1.9; font-size:21px; direction:ltr;">
<h1 style="color:#9a3ba6;"><b>1.12.2 The classic mistake</b></h1>
<hr>
<p>
This is a very famous mistake (or typing error) that you pass the value of x instead of passing the pointer to x:
</p>

```c
#include <stdio.h> // include the standard I/O header - this includes the library needed for printf and scanf
int main() // program entry point - this defines the main function where execution starts
{
    int x; // declare an integer variable x - this allocates space for x but does not initialize it
    printf ("Enter X:\\n"); // print the prompt "Enter X:\n" - this displays a message to the user
    scanf ("%d", x); // BUG - this calls scanf with format "%d" and the value of x (instead of &x), which is a mistake; scanf expects a pointer
    printf ("You entered %d...\\n", x); // print "You entered %d...\n" with the value of x - this attempts to display the entered value, but due to the bug, x is unchanged
    return 0; // return success - this ends the program with return code 0
};
```
<p>
I will tell you what happens here
</p>
<p>
x is not initialized and has some random noise (garbage) from the local stack.
</p>
<p>
When scanf() is called, it takes the string from the user, converts it to a number, and tries to write that number into x… but treating x as if it were an address in memory
</p>
<p>
At that time, of course, a Crash will occur
</p>
<p>
Let me explain it to you in a simpler way:
</p>
<p>
Suppose that X has a random number like this for example:
</p>
<!-- Code -->
<div class="code-box" data-lang="Assembly" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">
  <div style="background:#161b22;display:flex;align-items:center;justify-content:space-between;padding:0.6rem 1rem;">
    <div style="display:flex;gap:6px;">
      <span style="width:12px;height:12px;border-radius:50%;background:#ff5f56;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#ffbd2e;"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#27c93f;"></span>
    </div>
    <span style="font-size:0.9rem;color:#8b949e;">Assembly</span>
  </div>
<pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;color:#c9d1d9;">
<code>
x = 0x41414141; // assume x has this uninitialized garbage value - this is an example of random data in x
</code>
</pre>
</div>
<p>
Then scanf will understand that this is an address in memory and go to write on it.
</p>
<p>
Where does it write?
</p>
<p>
In 0x41414141
</p>
<p>
And this is of course an empty/reserved/not allowed address. So the code crashes.
</p>
<p>
The nice thing is that some CRT libraries in debug mode put a distinctive pattern in the memory that has not been allocated yet, like 0xCCCCCCCC or 0x0BADF00D and such. In this case, x may have 0xCCCCCCCC inside it, and scanf() will try to write to this address 0xCCCCCCCC.
</p>
<p>
And if you notice that there is something in the process trying to write to 0xCCCCCCCC, you know that there is a variable (or pointer) that is not initialized and was used before it was initialized. And this is better than the new memory being all zeros
</p>


</div>