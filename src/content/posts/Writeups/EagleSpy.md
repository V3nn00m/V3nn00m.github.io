---
title: "EagleSpy — Android RAT Malware Analysis"
published: 2026-08-11
description: "Full static analysis of the EagleSpy Android RAT: APK structure, nested dropper, C2 extraction, AES key, and persistence mechanism"
author: "0xV3n0m"
category: "Malware Analysis"
tags: ["Malware Analysis", "Android", "Reverse Engineering", "JADX"]
image: "/assets/img/eaglespy_banner.png"
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
I'm <b style="color:cornflowerblue;">Ahmed Allah Mohamed</b>, aka <b style="color:cornflowerblue;">0x_V3n0m</b>.
</p>
<p>
In this write-up, I'll walk through how I analyzed and solved the <b style="color:cornflowerblue;">EagleSpy</b> challenge on <b style="color:cornflowerblue;">MalOps</b>, diving into the Android malware sample and uncovering its behavior through static analysis and reverse engineering.
</p>
<p>
We'll start by analyzing the APK structure and its <code style="color:chartreuse;">AndroidManifest.xml</code>, then trace the loader's execution flow, identify the embedded payload, investigate its persistence mechanism, and finally extract important <b style="color:cornflowerblue;">C2 and encryption-related indicators</b>.
</p>
<p>
So, enough talking — <b style="color:cornflowerblue;">let's dive into the malware and see what's hiding under the hood.</b>
</p>

<img src="/assets/img/eaglespy_giphy.gif" alt="let's go" style="display:block; margin:20px auto; border-radius:12px; max-width:60%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q1 — What is the name of the file used to define the essential structures and metadata of an Android application?</h2>

<p>
Before an Android app ever runs, the operating system needs to know what's inside it — what components exist, what permissions it's asking for, what package name identifies it. All of that lives in one file: <code style="color:chartreuse;">AndroidManifest.xml</code>, sitting at the root of every APK. It's not optional; without it the system has no way to register the app's Activities, Services, Broadcast Receivers, or Content Providers, or to enforce the permissions it declares. This is also why static analysis of any Android sample almost always starts here — it's the fastest way to map out an app's attack surface before touching a single line of Java or Smali.
</p>
<img src="/assets/img/eaglespy_q1.png" alt="AndroidManifest.xml" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q2 — What is the package ID name of this sample?</h2>

<p>
Every Android package needs a unique identifier so the OS can tell it apart from every other app on the device — that identifier is set once, in the <code style="color:chartreuse;">package</code> attribute of the root <code style="color:chartreuse;">&lt;manifest&gt;</code> tag. For this sample it's <code style="color:chartreuse;">com.appd.instll.load</code>, sitting alongside <code style="color:chartreuse;">versionName="3.31.165"</code> and <code style="color:chartreuse;">versionCode="331165"</code> in the same tag. The naming pattern here is worth noting on its own: <code style="color:chartreuse;">instll</code> (missing the second "a") mimics a generic installer/updater app, which fits its role as the outer loader — the first-stage APK the victim actually installs.
</p>
<img src="/assets/img/eaglespy_q2.png" alt="package name" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q3 — How many permissions are declared by this sample?</h2>

<p>
Four <code style="color:chartreuse;">&lt;uses-permission&gt;</code> entries appear in the outer loader's manifest:
</p>
<img src="/assets/img/eaglespy_q3.png" alt="permissions" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<table style="border-collapse:collapse; width:100%; margin:20px 0; font-size:18px;">
  <thead>
    <tr style="background:#161b22;">
      <th style="border:1px solid #30363d; padding:10px 16px; text-align:left; color:#9a3ba6;">Permission</th>
      <th style="border:1px solid #30363d; padding:10px 16px; text-align:left; color:#9a3ba6;">Role</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background:#0d1117; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">READ_EXTERNAL_STORAGE</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">Read access to device storage</td>
    </tr>
    <tr style="background:#161b22; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">WRITE_EXTERNAL_STORAGE</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">Write access to device storage</td>
    </tr>
    <tr style="background:#0d1117; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">REQUEST_INSTALL_PACKAGES</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">Silently trigger installation of a new APK</td>
    </tr>
    <tr style="background:#161b22; color:#c9d1d9;">
      <td style="border:1px solid #30363d; padding:10px 16px;"><code style="color:chartreuse;">REQUEST_DELETE_PACKAGES</code></td>
      <td style="border:1px solid #30363d; padding:10px 16px;">Silently trigger removal of an installed package</td>
    </tr>
  </tbody>
</table>

<p>
Individually these look mundane, but together they form the exact permission set a dropper needs: write the next-stage payload to storage, then install it without the standard "install from unknown sources" friction a user would normally notice.
</p>

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q4 — What is the name of the class used in the main activity used as the entry point?</h2>

<p>
Looking at the <code style="color:chartreuse;">&lt;activity&gt;</code> block, two things mark <code style="color:chartreuse;">com.appd.instll.splash</code> as the entry point rather than any other component: the <code style="color:chartreuse;">android.intent.action.MAIN</code> action and the <code style="color:chartreuse;">LAUNCHER</code> category sitting together in the same <code style="color:chartreuse;">&lt;intent-filter&gt;</code>. This pairing is what Android's package manager scans for when building the home-screen launcher icon — whichever activity carries it is what actually runs first when the user taps the app. Everything downstream in this analysis (the install check, the permission prompts, the payload drop) traces back to <code style="color:chartreuse;">splash.onCreate()</code>.
</p>
<img src="/assets/img/eaglespy_q4.png" alt="main activity manifest" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
In JADX, this same answer is a lot faster to reach than manually scanning the manifest — <code style="color:chartreuse;">Ctrl+Shift+M</code> jumps directly to the main Activity, or it's reachable via <code style="color:chartreuse;">Navigation → Main Activity</code>.
</p>
<img src="/assets/img/eaglespy_q5.png" alt="JADX main activity navigation" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q5 — What is the method used to validate if an application is already installed on the device?</h2>

<p>
The check happens in a single line: <code style="color:chartreuse;">if (isAppAvailable(applicationContext, TargetBaseid))</code>. What makes this interesting isn't just the boolean check itself, but what each branch does with the result. If the target package <b style="color:cornflowerblue;">is</b> installed, a <code style="color:chartreuse;">Timer</code> scheduled after a 1-second delay grabs a launch intent for it via <code style="color:chartreuse;">getPackageManager().getLaunchIntentForPackage(TargetBaseid)</code> and starts it directly — silently handing control to the already-installed app. If it's <b style="color:cornflowerblue;">not</b> installed, the <code style="color:chartreuse;">else</code> branch instead launches <code style="color:chartreuse;">oxgouacygcwohqzcuxomeqcxomnxun3</code> — the install-prompt activity that kicks off the payload drop covered in the next questions. In both cases the sample calls <code style="color:chartreuse;">splash.this.finish()</code> right after, closing the loader's own splash screen so the transition looks seamless to the victim.
</p>
<img src="/assets/img/eaglespy_q6.png" alt="isAppAvailable check" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q6 — What is the name of the application package that is checked by the previous method?</h2>

<p>
The package name is <code style="color:chartreuse;">com.found.hentai</code>.
</p>
<img src="/assets/img/eaglespy_q7.png" alt="TargetBaseid package name" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q7 — The sample checks the device's default language. How many languages does this sample target?</h2>

<p>
Inside <code style="color:chartreuse;">oxgouacygcwohqzcuxomeqcxomnxun3</code> a <code style="color:chartreuse;">switch</code> on <code style="color:chartreuse;">Locale.getDefault().getLanguage()</code> swaps the button text into: Arabic (<code style="color:chartreuse;">ar</code>), English (<code style="color:chartreuse;">en</code>), Portuguese (<code style="color:chartreuse;">pt</code>), Russian (<code style="color:chartreuse;">ru</code>), Turkish (<code style="color:chartreuse;">tr</code>), and Simplified Chinese (<code style="color:chartreuse;">zh</code>) — with <code style="color:chartreuse;">default</code> silently falling back to English.
</p>
<img src="/assets/img/eaglespy_q8.png" alt="language switch" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q8 — What are the two permissions requested dynamically by the sample to install the next payload?</h2>

<p>
<code style="color:chartreuse;">android.permission.WRITE_EXTERNAL_STORAGE, android.permission.READ_EXTERNAL_STORAGE</code>
</p>
<p>
The sample checks for both via <code style="color:chartreuse;">checkPermissions()</code> — which uses <code style="color:chartreuse;">ContextCompat.checkSelfPermission()</code> against each — and if either is missing, <code style="color:chartreuse;">requestPermissions()</code> fires <code style="color:chartreuse;">ActivityCompat.requestPermissions(...)</code> to prompt the user for both at once.
</p>
<img src="/assets/img/eaglespyq9.png" alt="dynamic permission request" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q9 — From which internal location is the payload APK loaded during installation?</h2>

<p>
<code style="color:chartreuse;">assets/childapp.apk</code>
</p>
<p>
The <code style="color:chartreuse;">install()</code> method opens it directly from the APK's bundled assets — <code style="color:chartreuse;">context.getAssets().open("childapp.apk")</code> — and streams that data into a <code style="color:chartreuse;">PackageInstaller.Session</code> created via <code style="color:chartreuse;">packageInstaller.openSession(...)</code>. Once the stream is fully written, the session gets committed, which triggers a silent install requiring nothing more from the user than the <code style="color:chartreuse;">REQUEST_INSTALL_PACKAGES</code> permission granted earlier. No download, no external fetch — the payload has been sitting inside the loader's own APK the whole time.
</p>
<img src="/assets/img/eaglespy_q10.png" alt="childapp.apk loading" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q10 — What is the SHA256 of the next payload?</h2>

<p>
<code style="color:chartreuse;">799a3d9663bb9c26c3cfe68ed2c8e35c657ac3edf969825dc83f2c5812f96429</code>
</p>
<p>
Since <code style="color:chartreuse;">childapp.apk</code> sits inside <code style="color:chartreuse;">assets/</code>, static analysis alone won't hand you a hash for it — it has to be extracted from the loader's APK and hashed directly. After exporting <code style="color:chartreuse;">childapp</code> from the assets tree in JADX:
</p>
<img src="/assets/img/eaglespy_q11.png" alt="export childapp from JADX" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">
<p>
Running <code style="color:chartreuse;">sha256sum childapp.apk</code> on it gives the value above.
</p>
<img src="/assets/img/eaglespy_q12.png" alt="sha256sum output" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q11 — The second payload acts as a legitimate government application. What is the name of the Trojanized application?</h2>

<p>
<b style="color:cornflowerblue;">VNeID</b>
</p>
<p>
Digging into <code style="color:chartreuse;">childapp.apk</code>'s <code style="color:chartreuse;">resources.arsc</code> → <code style="color:chartreuse;">res/values/strings.xml</code>, the <code style="color:chartreuse;">Myname</code> string resolves to <code style="color:chartreuse;">VNeID</code> — this is what the app calls itself once installed, complete with a <code style="color:chartreuse;">Copyrights</code> string reading "© 2023 VNeID. All rights reserved." to sell the disguise. VNeID is Vietnam's real national digital-ID app, so the payload is impersonating a legitimate government identity service — a convincing lure that would push most victims to grant it broad permissions without a second thought.
</p>
<img src="/assets/img/eaglespy_q13.png" alt="VNeID strings.xml" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q12 — To avoid losing access to the compromised device, the malware establishes persistence on it. What is the name of the permission used for persistence?</h2>

<p>
<code style="color:chartreuse;">android.permission.RECEIVE_BOOT_COMPLETED</code>
</p>
<p>
Inside the <code style="color:chartreuse;">utilities</code> class's <code style="color:chartreuse;">PERMISSIONS()</code> method, most permissions in the returned list are conditional — gated behind <code style="color:chartreuse;">isNO(...)</code> checks that presumably reflect some server-side config. <code style="color:chartreuse;">RECEIVE_BOOT_COMPLETED</code> stands out because it's added <b style="color:cornflowerblue;">unconditionally</b>, right alongside storage and phone-state permissions, with no <code style="color:chartreuse;">if</code> guarding it. That's a strong signal of how critical it is to the malware's design: paired with a dedicated <code style="color:chartreuse;">BootReceiver</code> component (visible in the open tabs), it lets the RAT relaunch itself automatically every time the device reboots — surviving reboots without any user interaction.
</p>
<img src="/assets/img/eaglespyq14.png" alt="RECEIVE_BOOT_COMPLETED permission" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q13 — After identifying the method that establishes the C2 connection, what is the decoded IP address and port used by this malware?</h2>

<p>
<b style="color:cornflowerblue;">103.253.23.8:7773</b>
</p>
<p>
Inside <code style="color:chartreuse;">initializeService</code> — a class extending <code style="color:chartreuse;">Service</code>, tucked away in the same heavily-obfuscated package tree as the rest of the RAT's core logic — two static fields hold the C2 coordinates, both Base64-encoded:
</p>
<p>* <code style="color:chartreuse;">ClientHost = "MTAzLjI1My4yMy44"</code> → <b style="color:cornflowerblue;">103.253.23.8</b></p>
<p>* <code style="color:chartreuse;">ClientPort = "Nzc3Mw=="</code> → <b style="color:cornflowerblue;">7773</b></p>
<p>
Decoding both gives the full endpoint the malware phones home to. Storing these as plain Base64 rather than actual encryption is a low-effort evasion move — it defeats a raw string search for the IP, but folds instantly under any decompiler or automated static-analysis pass.
</p>
<img src="/assets/img/eaglespy_q15.png" alt="C2 host and port Base64" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q14 — What is the key used to identify this malware family?</h2>

<p>
<b style="color:cornflowerblue;">EagleSpy</b>
</p>
<p>
<code style="color:chartreuse;">ConnectionKey</code> isn't a plain field — it's the return value of a call into <code style="color:chartreuse;">utilities</code>, one of those heavily obfuscated method names (<code style="color:chartreuse;">eosjvohlvdszzfnoawempbvgtfrhiukwdrdirywuhpeetixbkj45</code>), passed the literal <code style="color:chartreuse;">"RWFnbGVTcHk="</code> as its argument. That obfuscated method is doing nothing more exotic than a Base64 decode — running the string through it (or manually decoding it) resolves to <code style="color:chartreuse;">EagleSpy</code>. This is the strongest family-identification IOC in the whole sample: it's effectively the malware announcing its own name to the C2 on every connection, which is what let researchers attribute this RAT as EagleSpy in the first place.
</p>
<img src="/assets/img/eaglespy_q16.png" alt="EagleSpy ConnectionKey Base64" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<h2 style="color:crimson; font-family: 'Press Start 2P', 'system-ui'">Q15 — What is the secret key used to encrypt and decrypt the JSON data?</h2>

<p>
<code style="color:chartreuse;">93b89a273c1fbe59073af7bd9adfa6c0</code>
</p>
<p>
The <code style="color:chartreuse;">EncryptionCUtils</code> class hardcodes this 32-character string directly into a <code style="color:chartreuse;">private static final String SECRET_KEY</code>, used verbatim as a <code style="color:chartreuse;">SecretKeySpec</code> in both <code style="color:chartreuse;">encrypt()</code> and <code style="color:chartreuse;">decrypt()</code>. The implementation is about as basic as AES gets: no key derivation function, no IV, <code style="color:chartreuse;">Cipher.getInstance("AES")</code> defaulting to <b style="color:cornflowerblue;">ECB mode</b> with PKCS5 padding, and the ciphertext just Base64-wrapped before going over the wire. Since the key is hardcoded and identical for every infected device, anyone who extracts this string from the sample — like we just did — can decrypt every JSON packet exchanged between the RAT and its C2, including any captured network traffic.
</p>
<img src="/assets/img/eaglespy_q17.png" alt="AES secret key hardcoded" style="display:block; margin:20px auto; border-radius:12px; max-width:80%;">

<hr>

<p>
Thanks a lot for taking the time to read this write-up — I hope it was helpful and easy to follow!
</p>
<p>
If I made any mistakes along the way, they're on me (or on Shaytan); any good in this write-up is purely from Allah.
</p>
<img src="/assets/img/eaglespy_giphy2.gif" alt="let's go" style="display:block; margin:20px auto; border-radius:12px; max-width:60%;">
</div>