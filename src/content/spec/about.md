---
# the default layout is 'page'
icon: fas fa-id-card
order: 4
---

<style>
.profile-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-top: 1rem;
}
@media (min-width: 850px) {
  .profile-container {
    flex-direction: row;
    align-items: flex-start;
  }
}
.profile-sidebar {
  flex: 0 0 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(176, 38, 255, 0.2);
  padding: 2.5rem 2rem;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.profile-sidebar:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 40px rgba(176, 38, 255, 0.15);
  border-color: rgba(176, 38, 255, 0.5);
}
.profile-avatar {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 1.5rem;
  border: 3px solid rgba(176, 38, 255, 0.8);
  box-shadow: 0 0 20px rgba(176, 38, 255, 0.4);
  transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.profile-sidebar:hover .profile-avatar {
  transform: scale(1.05) rotate(5deg);
}
.profile-name {
  font-size: 2rem !important;
  font-weight: 800 !important;
  margin: 0 !important;
  background: linear-gradient(135deg, #fff, #e2b3ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-family: 'SDGlitchDemo', 'Share Tech Mono', monospace;
}
.profile-role {
  font-size: 0.95rem;
  color: #aaa;
  margin: 0.5rem 0 2rem;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.social-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
  width: 100%;
}
.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ddd;
  border-radius: 8px;
  text-decoration: none !important;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}
.social-btn:hover {
  background: rgba(176, 38, 255, 0.2);
  border-color: #b026ff;
  color: #fff;
  text-shadow: 0 0 8px rgba(176, 38, 255, 0.8);
}
.profile-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.section-card {
  background: rgba(255, 255, 255, 0.02);
  border-left: 4px solid #b026ff;
  padding: 1.5rem 2rem;
  border-radius: 0 12px 12px 0;
  transition: background 0.3s ease;
}
.section-card:hover {
  background: rgba(255, 255, 255, 0.04);
}
.section-title {
  font-size: 1.3rem !important;
  font-weight: bold !important;
  margin-top: 0 !important;
  margin-bottom: 1rem !important;
  color: #eee;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 0.5rem;
}
.bio-text {
  color: #ccc;
  line-height: 1.8 !important;
  font-size: 1.05rem;
  margin: 0;
}
.skills-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-top: 0.5rem;
}
.skill-badge {
  background: rgba(176, 38, 255, 0.1);
  border: 1px solid rgba(176, 38, 255, 0.3);
  color: #e2b3ff;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
}
.skill-badge:hover {
  background: #b026ff;
  color: #fff;
  box-shadow: 0 0 15px rgba(176,38,255,0.5);
  transform: translateY(-2px);
}
.quote-box {
  margin-top: 0.5rem;
  padding: 1.5rem 2rem;
  background: linear-gradient(90deg, rgba(176, 38, 255, 0.1) 0%, transparent 100%);
  border-radius: 8px;
  font-style: italic;
  color: #aaa;
  position: relative;
  border-left: 2px solid #b026ff;
  font-size: 1.1rem;
}
html:not(.dark) .profile-sidebar {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(176, 38, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
}
html:not(.dark) .social-btn {
  background: rgba(0, 0, 0, 0.05);
  color: #444;
  border-color: rgba(0, 0, 0, 0.1);
}
html:not(.dark) .social-btn:hover {
  color: #b026ff;
  background: rgba(176, 38, 255, 0.1);
}
html:not(.dark) .section-card {
  background: rgba(0, 0, 0, 0.02);
  border-left-color: #b026ff;
}
html:not(.dark) .section-card:hover {
  background: rgba(0, 0, 0, 0.04);
}
html:not(.dark) .section-title { color: #222; border-bottom-color: rgba(0,0,0,0.05); }
html:not(.dark) .bio-text { color: #444; }
html:not(.dark) .profile-role { color: #666; }
html:not(.dark) .quote-box { color: #555; background: linear-gradient(90deg, rgba(176, 38, 255, 0.05) 0%, transparent 100%); }
html:not(.dark) .skill-badge { color: #b026ff; border-color: #b026ff; background: rgba(176, 38, 255, 0.05); }
</style>

<div class="profile-container">
<!-- Sidebar Profile -->
<div class="profile-sidebar">
<img src="/assets/images/avatar.webp" alt="0X_V3n0m Avatar" class="profile-avatar" onerror="this.src='https://github.com/V3nn00m.png'" />
<h1 class="profile-name">0X_V3n0m</h1>
<div class="profile-role">Bug Hunter & Reverse Engineer</div>
<div class="social-grid">
<a href="https://twitter.com/0X_V3N0M" target="_blank" class="social-btn"><i class="fab fa-twitter"></i> Twitter</a>
<a href="https://www.linkedin.com/in/ahmed-allah-mohamed-53a60b232" target="_blank" class="social-btn"><i class="fab fa-linkedin"></i> LinkedIn</a>
<a href="https://github.com/V3nn00m" target="_blank" class="social-btn"><i class="fab fa-github"></i> GitHub</a>
<a href="mailto:am4781616@gmail.com" class="social-btn"><i class="fas fa-envelope"></i> Email</a>
</div>
</div>
<!-- Main Content -->
<div class="profile-content">
<div class="section-card">
<h2 class="section-title"><i class="fas fa-user-secret"></i> About Me</h2>
<p class="bio-text">
Hello world! I'm a <strong>Junior Security Researcher</strong> actively learning and exploring the depths of <strong>Bug Hunting</strong> and <strong>Reverse Engineering</strong>. 
Every day is a new challenge where I enjoy tearing down software to understand how it works, searching for vulnerabilities, and piecing together the complex puzzles hidden inside binaries. 
My journey in cybersecurity has just begun, and it's driven by a relentless curiosity to learn, break things responsibly, and grow.
</p>
</div>
<div class="section-card">
<h2 class="section-title"><i class="fas fa-bolt"></i> Arsenal & Skills</h2>
<div class="skills-wrapper">
<span class="skill-badge">Burp Suite</span>
<span class="skill-badge">Ghidra</span>
<span class="skill-badge">IDA Pro</span>
<span class="skill-badge">Web Exploitation</span>
<span class="skill-badge">Malware Analysis</span>
<span class="skill-badge">x86/x64 Assembly</span>
<span class="skill-badge">Python Scripting</span>
</div>
</div>
<div class="quote-box">
"Every binary hides a story — you just need to read it backwards." 🧠
</div>
</div>
</div>