---
title: "CH1.10 - Almost Empty Function"
published: 2025-11-11
description: "Examining what compilers generate for almost-empty functions and the subtle differences from truly empty ones"
author: "0xV3n0m"
category: "Re4B"
tags: ["Reverse Engineering", "Books", "Assembly"]
image: "/assets/img/reverse8.png"
draft: false
lang: "eng"

# Series configuration
type: "course"
series: "re4b"
seriesOrder: 8
seriesTitle: "Reverse Engineering for Beginners"
seriesDescription: "A beginner-friendly book covering x86/x64 reverse engineering through real compiler output and code patterns."
seriesImage: "/assets/img/RE4B.png"
---

<div style="line-height:1.9; font-size:21px; direction:ltr;">
<h1 style="color:#9a3ba6;"><b>Almost Empty Function</b></h1>

<hr>

<p>
The author began by saying that this is a real code example he found in <b style = "color: cadetblue;">Boolector</b>.
</p>

```c
// Forward declaration of the function. This function exists in another file:
int boolector_main (int argc, char **argv);

// The executable program
int main (int argc, char **argv)
{
    return boolector_main (argc, argv);
}
```

<p>
Here, the author talked about a very simple function, almost empty, called <code style = "color: green">main()</code>.  
All it really does is call another function named <code style = "color: green">boolector_main</code> and passes it the same parameters.
</p>

<p>
In other words, instead of writing all the code inside <code style = "color: green">main</code>,  
he made <code style = "color: green">main</code> just an intermediary that calls <code style = "color: green">boolector_main</code> and returns its result.
</p>

<p>
The author mentioned that the reason could be that the actual function (<code style = "color: green">boolector_main</code>) is stored in another file or library (like a <b style= "color: cornflowerblue;">DLL</b> or a <b style= "color: cornflowerblue;">shared library</b>).
</p>

<p>
This is useful, for example, when the main program is being tested by a <b style = "color: chocolate">test suite</b>,  
and that test suite needs to call <code>main</code> just like the system normally does.
</p>

<p>
Then he explained that when this code is compiled <b style = "color: crimson;">before optimization</b>, it looks like this:
</p>

```assembly
main:
    push  rbp                  ; save base pointer of previous stack frame
    mov   rbp, rsp             ; set base pointer for current stack frame
    sub   rsp, 16              ; allocate 16 bytes on the stack for local variables
    mov   DWORD PTR -4[rbp], edi  ; move first argument (argc) to local variable
    mov   QWORD PTR -16[rbp], rsi ; move second argument (argv) to local variable
    mov   rdx, QWORD PTR -16[rbp] ; prepare rsi argument for call
    mov   eax, DWORD PTR -4[rbp]  ; prepare edi argument for call
    mov   rsi, rdx             ; move argv to rsi register
    mov   edi, eax             ; move argc to edi register
    call  boolector_main       ; call the actual main function
    leave                       ; restore previous stack frame
    ret                         ; return to caller
```

<p>
But let’s take a look at the <b style = "color: crimson;">optimized version</b>:
</p>

<p>
<b>Listing 1.46: Optimizing GCC 8.2 x64 (Assembly Output with Comments)</b>
</p>

```assembly
main:
    jmp boolector_main    ; jump directly to the address of boolector_main, skipping prologue/epilogue
```

<p>
Very simply, the <b style= "color: cornflowerblue;">stack</b> and <b style= "color: cornflowerblue;">registers</b> are untouched, and <code style = "color: green">boolector_main()</code> receives the same arguments.  
So all we need to do is just pass the execution flow to another address.
</p>

<p>
This is quite similar to the concept of a <b style= "color: cornflowerblue;">thunk function</b> — a function that only performs redirection or forwarding.
</p>

</div>