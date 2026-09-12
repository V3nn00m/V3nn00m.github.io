---
title: "AuraWiper — Windows Wiper Malware Analysis"
published: 2026-09-13
description: "Full static analysis of AuraWiper: PE structure, mutex checks, persistence mechanisms, MBR overwriting, privilege abuse, and hard system crash via NtRaiseHardError"
author: "0xV3n0m"
category: "Malware Analysis"
tags: ["Malware Analysis", "Windows", "Reverse Engineering", "IDA"]
image: "/assets/img/AuraWiper.png"
draft: false
lang: "eng"
---
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<div style="line-height:1.9; font-size:21px; direction:ltr;">

<h1 style="color:#9a3ba6; font-family: 'Press Start 2P', 'system-ui'"><b>AuraWiper</b></h1>
<hr>

<p>
<b>بسم الله، الحمد لله حمدًا طيبًا مباركًا يليق بجلاله وعظيم سلطانه، والصلاة والسلام على نبينا محمد ﷺ، الذي بلّغ الرسالة وأدّى الأمانة وجاهد في الله حق جهاده.</b>
</p>
<p>
I'm <b style="color:cornflowerblue;">Ahmed Allah Mohamed</b>, aka <b style="color:cornflowerblue;">0x_V3n0m</b>.
</p>
<p>
In this write-up, I'll walk through how I analyzed and solved the <b style="color:cornflowerblue;">AuraWiper</b> challenge on <b style="color:cornflowerblue;">MalOps</b>, uncovering the behavior of a destructive Windows wiper through static analysis and reverse engineering.
</p>
<p>
We'll begin by examining the PE structure, embedded PDB path, and imported Windows APIs. Then, we'll trace the malware's execution flow, identify its mutexes and persistence mechanisms, analyze its process-termination routine, and investigate its destructive payload — including MBR overwriting, deletion of critical Windows files, privilege manipulation, and the final hard system crash.
</p>
<p>
So, enough talking — <b style="color:cornflowerblue;">let's dive into AuraWiper and see how this wiper attempts to leave a system completely unusable.</b>
</p>
<img src="/assets/img/aurawiper_giphy.gif" alt="let's go" style="display:block; margin:20px auto; border-radius:12px; max-width:60%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q1 — What is the last part of PDB file path embedded in the malware sample?</h2>

<p>
Looking at the highlighted bytes, we can see that the sample contains a full path to a <b style="color:cornflowerblue;">Debug Symbols</b> file embedded within the PE at offset <code style="color:chartreuse;">0x5F264</code>. The decoded text clearly reveals the following path:
</p>

```
C:\Users\prostone\Desktop\all\Malware-67-main\Release\SF-Verif.pdb
```

<p>
The <code style="color:chartreuse;">.pdb</code> extension confirms that this is a <b style="color:cornflowerblue;">Program Database (PDB)</b> path associated with the program's development and build process, rather than just an ordinary string.
</p>
<p>
Since the question asks for the <b style="color:cornflowerblue;">last part of the path</b>, we take the filename after the final <code style="color:chartreuse;">\</code>. Therefore, the answer is: <b style="color:cornflowerblue;">SF-Verif.pdb</b>
</p>
<p>
This path also provides some insight into the sample's build environment, including the project name <code style="color:chartreuse;">Malware-67-main</code> and the <code style="color:chartreuse;">Release</code> directory from which the sample was compiled.
</p>
<img src="/assets/img/aurawiper_q1.png" alt="PDB path in PE" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q2 — The wiper checks two mutex values in the main function. What are those values?</h2>

<p>
Looking at the <code style="color:chartreuse;">main</code> function, we can see two clear calls to the <code style="color:chartreuse;">CreateMutexA</code> API.
</p>
<p>
The first call creates a mutex named <code style="color:chartreuse;">Global\SFV67PayloadLeader</code>. Immediately afterward, the program calls <code style="color:chartreuse;">GetLastError()</code> and compares the result against the value <code style="color:chartreuse;">183</code>, which corresponds to <code style="color:chartreuse;">ERROR_ALREADY_EXISTS</code>. This indicates that the sample is checking whether another instance of the payload is already running.
</p>
<p>
The second call creates a mutex named <code style="color:chartreuse;">Global\SFVDeployOnce</code> and performs the same check.
</p>
<p>
These mutexes prevent the malware's execution stages from being triggered repeatedly, helping <b style="color:cornflowerblue;">AuraWiper</b> ensure that both the <b style="color:cornflowerblue;">payload</b> and <b style="color:cornflowerblue;">deployment</b> stages are executed only once on the same machine.
</p>
<img src="/assets/img/aurawiper_q2.png" alt="CreateMutexA calls" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q3 — How many persistence mechanisms are implemented by AuraWiper?</h2>

<p>
<b style="color:cornflowerblue;">Answer: 4</b>
</p>
<p>
Looking at the thread setup, we can see that <code style="color:chartreuse;">main</code> initializes the function pointer <code style="color:chartreuse;">sub_140015590</code> as the worker routine before executing it in a separate thread.
</p>
<p>
When we trace this routine, we can see that after passing the <code style="color:chartreuse;">sub_140013690()</code> validation check, it calls <code style="color:chartreuse;">sub_140013E00()</code>, which contains the actual <b style="color:cornflowerblue;">persistence logic</b>.
</p>
<p>
Inside this function, the malware opens the <code style="color:chartreuse;">HKCU\Software\Microsoft\Windows\CurrentVersion\Run</code> registry key and writes values using <code style="color:chartreuse;">RegSetValueExA</code>. It then repeats the same behavior with <code style="color:chartreuse;">HKLM\Software\Microsoft\Windows\CurrentVersion\Run</code>. It also constructs paths associated with the user directory and the <b style="color:cornflowerblue;">Startup folder</b>. Finally, it opens <code style="color:chartreuse;">SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon</code> and modifies the <code style="color:chartreuse;">Shell</code> value to ensure execution during the Windows logon process.
</p>
<p>
Therefore, <b style="color:cornflowerblue;">AuraWiper uses four persistence mechanisms:</b>
</p>
<p>* <b style="color:cornflowerblue;">HKCU Run</b></p>
<p>* <b style="color:cornflowerblue;">HKLM Run</b></p>
<p>* <b style="color:cornflowerblue;">Startup Folder</b></p>
<p>* <b style="color:cornflowerblue;">Winlogon Shell</b></p>
<p>
This gives the sample multiple opportunities to regain execution if one of the persistence mechanisms is removed or fails.
</p>
<img src="/assets/img/aurawiper_q3a.png" alt="thread setup" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<img src="/assets/img/aurawiper_q3b.png" alt="persistence logic" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q4 — What is the virtual address of the function responsible for terminating common system monitoring tools by process name?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">0x140011BE0</code></b>
</p>
<p>
Looking at the pseudocode, we can see that <code style="color:chartreuse;">sub_140011BE0</code> is the <b style="color:cornflowerblue;">monitoring loop</b> responsible for targeting monitoring and analysis tools.
</p>
<p>
The function is marked as <code style="color:chartreuse;">noreturn</code> and runs in an infinite loop. After each <code style="color:chartreuse;">Sleep</code>, it calls the helper function <code style="color:chartreuse;">sub_140010570</code> with specific process names such as <code style="color:chartreuse;">taskmgr.exe</code>, <code style="color:chartreuse;">ProcessHacker.exe</code>, <code style="color:chartreuse;">procexp.exe</code>, <code style="color:chartreuse;">procexp64.exe</code>, and <code style="color:chartreuse;">powershell.exe</code>.
</p>
<p>
The helper function performs the actual process search and termination by name, while <code style="color:chartreuse;">sub_140011BE0</code> manages the list and continuously repeats the operation. The function also uses <code style="color:chartreuse;">OpenProcess</code> and <code style="color:chartreuse;">SetPriorityClass</code> to raise the malware's own priority to <code style="color:chartreuse;">REALTIME_PRIORITY_CLASS</code>, making it harder for the user to stop the malware while the payload is being executed.
</p>
<img src="/assets/img/aurawiper_q4.png" alt="process termination loop" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q5 — How many times does AuraWiper invoke the process-termination function?</h2>

<p>
<b style="color:cornflowerblue;">Answer: 8</b>
</p>
<p>
Looking at the Xrefs to <code style="color:chartreuse;">sub_140010570</code>, IDA shows <b style="color:cornflowerblue;">8 <code style="color:chartreuse;">call</code> references</b> to the function. Each one represents a direct call to the <b style="color:cornflowerblue;">process-termination routine</b>.
</p>
<p>
The first five calls are visible in the disassembly, each preceded by a <code style="color:chartreuse;">lea rcx</code> instruction that loads the process name into the first argument — including <code style="color:chartreuse;">taskmgr.exe</code>, <code style="color:chartreuse;">ProcessHacker.exe</code>, <code style="color:chartreuse;">procexp.exe</code>, <code style="color:chartreuse;">procexp64.exe</code>, and <code style="color:chartreuse;">powershell.exe</code>. The remaining Xrefs appear in the second part of the monitoring loop and target <b style="color:cornflowerblue;">Windows Security-related processes</b>.
</p>
<p>
It is important not to count the final <code style="color:chartreuse;">.pdata</code> entry, since it is <b style="color:cornflowerblue;">exception-handling metadata</b>, not an actual <code style="color:chartreuse;">call</code> instruction.
</p>
<img src="/assets/img/aurawiper_q5.png" alt="Xrefs to sub_140010570" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q6 — What is the virtual address of the function that implements the wiper's destructive payload?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">0x140014E40</code></b>
</p>
<p>
IDA shows that the procedure starts at address <code style="color:chartreuse;">0x140014E40</code>, which is the address of <b style="color:cornflowerblue;">AuraWiper's main destructive payload function</b>.
</p>
<p>
The function does not immediately begin the destructive operations. It first hides the console using <code style="color:chartreuse;">ShowWindow</code> and <code style="color:chartreuse;">FreeConsole</code>, then opens the process's access token through <code style="color:chartreuse;">OpenProcessToken</code>. The most important part is the call to <code style="color:chartreuse;">LookupPrivilegeValueW</code> with <code style="color:chartreuse;">SeShutdownPrivilege</code>, followed by <code style="color:chartreuse;">AdjustTokenPrivileges</code> to enable that privilege.
</p>
<p>
These steps prepare the sample for the destructive operations that are executed afterward through worker threads — such as <b style="color:cornflowerblue;">overwriting the MBR</b>, deleting critical system files, and ultimately forcing the machine to <b style="color:cornflowerblue;">crash</b>.
</p>
<img src="/assets/img/aurawiper_q6.png" alt="destructive payload entry point" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q7 — Which Windows privilege does AuraWiper attempt to modify?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">SeShutdownPrivilege</code></b>
</p>
<p>
AuraWiper opens the access token of the current process using <code style="color:chartreuse;">OpenProcessToken</code>. It then calls <code style="color:chartreuse;">LookupPrivilegeValueW</code> and passes the name <code style="color:chartreuse;">SeShutdownPrivilege</code> to resolve it into a <b style="color:cornflowerblue;">LUID</b> — the identifier Windows uses internally to reference privileges.
</p>
<p>
The sample then places this LUID inside a <code style="color:chartreuse;">TOKEN_PRIVILEGES</code> structure and calls <code style="color:chartreuse;">AdjustTokenPrivileges</code>, confirming that it is attempting to modify and enable the <code style="color:chartreuse;">SeShutdownPrivilege</code> privilege within its own token.
</p>
<p>
This privilege is associated with <b style="color:cornflowerblue;">system shutdown operations and hard system errors</b>, and its presence here prepares the malware for the final stage of the wiper, where it forces the machine to <b style="color:cornflowerblue;">crash</b> after carrying out its destructive actions.
</p>
<img src="/assets/img/aurawiper_q7.png" alt="SeShutdownPrivilege adjustment" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q8 — AuraWiper creates a registry policy key to prevent the user from terminating the wiper process. Which registry key is responsible for this?</h2>

<p>
<b style="color:cornflowerblue;">Answer:</b>
</p>

```
HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System\DisableTaskMgr
```

<p>
The function <code style="color:chartreuse;">sub_140011B50</code> uses <code style="color:chartreuse;">RegCreateKeyExA</code> to create or open the following registry key:
</p>

```
HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System
```

<p>
It then immediately uses <code style="color:chartreuse;">RegSetValueExA</code> to write a value named <code style="color:chartreuse;">DisableTaskMgr</code>, setting its <code style="color:chartreuse;">Data</code> to <code style="color:chartreuse;">1</code> as a <code style="color:chartreuse;">REG_DWORD</code>. This value disables <b style="color:cornflowerblue;">Task Manager</b> for the current user, making it more difficult for the user to open Task Manager and attempt to terminate the malware process while the payload is executing.
</p>
<img src="/assets/img/aurawiper_q8.png" alt="DisableTaskMgr registry key" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q9 — Which Windows API handles communication with the Media Control Interface?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">mciSendStringA</code></b>
</p>
<p>
Looking at the Imports window, we can see that the sample imports <code style="color:chartreuse;">mciSendStringA</code> from the <code style="color:chartreuse;">WINMM.dll</code> library. This API is responsible for sending string-based commands to Windows' <b style="color:cornflowerblue;">Media Control Interface (MCI)</b>.
</p>
<p>
When we trace its usage, we can see that AuraWiper calls it inside a loop with the following commands:
</p>

```
set cdaudio door open
set cdaudio door closed
```

<p>
In other words, the malware repeatedly opens and closes the <b style="color:cornflowerblue;">CD/DVD tray</b>. This behavior is not essential to the wiping process, but rather serves as an additional nuisance behavior used by the malware to interfere with and distract the user while the <b style="color:cornflowerblue;">payload</b> is executing.
</p>
<img src="/assets/img/aurawiper_q9a.png" alt="mciSendStringA import" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<img src="/assets/img/aurawiper_q9b.png" alt="mciSendStringA usage" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q10 — What is the virtual address of the function responsible for displaying random strings?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">0x14000FC00</code></b>
</p>
<p>
The function <code style="color:chartreuse;">sub_14000FC00</code> starts at address <code style="color:chartreuse;">0x14000FC00</code>. It prepares a <b style="color:cornflowerblue;">Windows Hook</b> using <code style="color:chartreuse;">SetWindowsHookExW</code>, then calls <code style="color:chartreuse;">MessageBoxA</code> to display a message to the user. The important part of the call is the <code style="color:chartreuse;">lpText</code> argument, because it is selected from an array at <code style="color:chartreuse;">off_14005DCA8</code> using an index that operates with <code style="color:chartreuse;">% 6</code> — meaning the selection rotates across six different strings. After displaying the message, the function calls <code style="color:chartreuse;">UnhookWindowsHookEx</code> to remove the hook.
</p>
<img src="/assets/img/aurawiper_q10.png" alt="random string MessageBox function" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q11 — What is the offset address of the array containing the lpText values?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">0x14005DCA8</code></b>
</p>
<p>
The <code style="color:chartreuse;">lpText</code> argument passed to <code style="color:chartreuse;">MessageBoxA</code> inside <code style="color:chartreuse;">sub_14000FC00</code> points to the data address <code style="color:chartreuse;">off_14005DCA8</code>. When we navigate to this address, IDA displays an array of <code style="color:chartreuse;">dq offset</code> entries, where each entry is a pointer to a different string such as <code style="color:chartreuse;">"67"</code>, <code style="color:chartreuse;">"SIXTY-SEVEN"</code>, <code style="color:chartreuse;">"SIX SEVEN"</code>, and <code style="color:chartreuse;">"S I X T Y - S E V E N"</code>. The use of <code style="color:chartreuse;">dq</code> here is expected because the sample is 64-bit, so each pointer is 8 bytes. The function selects an element from this array and passes the pointer as <code style="color:chartreuse;">lpText</code> to <code style="color:chartreuse;">MessageBoxA</code>.
</p>
<img src="/assets/img/aurawiper_q11.png" alt="lpText array at 0x14005DCA8" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q12 — What is the virtual address of the function responsible for overwriting the Master Boot Record (MBR)?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">0x140011AA0</code></b>
</p>
<p>
The function <code style="color:chartreuse;">sub_140011AA0</code> starts at address <code style="color:chartreuse;">0x140011AA0</code> and runs in a continuous loop. In each iteration it calls <code style="color:chartreuse;">memset</code> on a buffer of size <code style="color:chartreuse;">0x200</code> bytes with zero, then opens the path:
</p>

```
\\.\PhysicalDrive0
```

<p>
using <code style="color:chartreuse;">CreateFileA</code>. This path is not an ordinary file — it represents <b style="color:cornflowerblue;">direct access to the first physical disk</b>. The sample then calls <code style="color:chartreuse;">WriteFile</code> to write the zeroed buffer at size <code style="color:chartreuse;">0x200</code> (512 bytes) to the beginning of the disk. 512 bytes is the size of the first sector, which contains the MBR on legacy disks — overwriting it destroys the boot data and leaves the machine unable to boot.
</p>
<img src="/assets/img/aurawiper_q12.png" alt="MBR overwrite function" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q13 — What is the virtual address of the function responsible for deleting key Windows system files?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">0x140011650</code></b>
</p>
<p>
Looking at the Imports window, we can see that AuraWiper imports <code style="color:chartreuse;">DeleteFileA</code> from <code style="color:chartreuse;">KERNEL32.dll</code>. When we examine the Xrefs to this API, IDA shows that one of the code references comes from the function <code style="color:chartreuse;">sub_140011650</code>.
</p>
<p>
Inside this function, the malware calls <code style="color:chartreuse;">DeleteFileA</code> on a collection of critical Windows files, including boot-related files such as <code style="color:chartreuse;">winload.exe</code> and <code style="color:chartreuse;">bootmgr</code>, system files such as <code style="color:chartreuse;">ntoskrnl.exe</code>, as well as registry hives including <code style="color:chartreuse;">SAM</code>, <code style="color:chartreuse;">SYSTEM</code>, <code style="color:chartreuse;">SECURITY</code>, and <code style="color:chartreuse;">SOFTWARE</code>.
</p>
<p>
Targeting these files complements the <b style="color:cornflowerblue;">MBR destruction</b> process. Even if the disk were still capable of initiating the boot process, the essential <b style="color:cornflowerblue;">boot and system files</b> would have already been deleted, leaving the system unable to start properly.
</p>
<img src="/assets/img/aurawiper_q13a.png" alt="DeleteFileA import" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<img src="/assets/img/aurawiper_q13b.png" alt="critical files deletion" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q14 — What is the name of the Windows Native API that AuraWiper uses to trigger a hard system error?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">NtRaiseHardError</code></b>
</p>
<p>
After AuraWiper creates a set of <b style="color:cornflowerblue;">worker threads</b> and waits using <code style="color:chartreuse;">Sleep</code>, it loads the <code style="color:chartreuse;">ntdll.dll</code> library. It then uses <code style="color:chartreuse;">GetProcAddress</code> to retrieve the address of the function named <code style="color:chartreuse;">NtRaiseHardError</code> at runtime.
</p>
<p>
This technique is known as <b style="color:cornflowerblue;">dynamic API resolution</b> — meaning the API does not necessarily appear directly in the sample's <b style="color:cornflowerblue;">Import Table</b>. <code style="color:chartreuse;">NtRaiseHardError</code> is a <b style="color:cornflowerblue;">Windows Native API</b> that the malware uses during its final stage to trigger a <b style="color:cornflowerblue;">hard system error</b>, ultimately forcing the machine to crash after completing its destructive operations.
</p>
<img src="/assets/img/aurawiper_q14.png" alt="NtRaiseHardError dynamic resolution" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q15 — What hexadecimal value is passed as the ErrorStatus parameter to the native API that triggers the hard system error?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">0xDEADDEAD</code></b>
</p>
<p>
Looking at the disassembly, we can see the instruction:
</p>

```nasm
mov ecx, 0DEADDEADh   ; load ErrorStatus into ECX (first argument in x64 calling convention)
```

<p>
immediately before the call to the function whose address was dynamically resolved as <code style="color:chartreuse;">NtRaiseHardError</code>.
</p>
<p>
In <b style="color:cornflowerblue;">Windows x64</b>, the first argument to a function is passed through the <code style="color:chartreuse;">RCX</code> register. Using <code style="color:chartreuse;">ECX</code> here loads the same value into the lower 32 bits of <code style="color:chartreuse;">RCX</code>. Since the first parameter of <code style="color:chartreuse;">NtRaiseHardError</code> is <code style="color:chartreuse;">ErrorStatus</code>, this confirms that AuraWiper passes <b style="color:cornflowerblue;">0xDEADDEAD</b> as the <code style="color:chartreuse;">ErrorStatus</code> before triggering the hard system error.
</p>
<p>
The choice of this value appears intentional — it is a distinctive and easily recognizable constant, forming part of the malware's final stage after the primary destructive operations have been completed.
</p>
<img src="/assets/img/aurawiper_q15.png" alt="0xDEADDEAD ErrorStatus" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<p>
Thanks a lot for taking the time to read this write-up — I hope it was helpful and easy to follow!
</p>
<p>
If I made any mistakes along the way, they're on me (or on Shaytan); any good in this write-up is purely from Allah.
</p>

</div>