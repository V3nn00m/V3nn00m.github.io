---
# the default layout is 'page'
icon: fas fa-info-circle
order: 4
---

<style>
  .about-card {
    max-width: 700px;
    margin: 2rem auto;
    background: var(--bg-color, #111);
    color: var(--text-color, #fff);
    padding: 2rem;
    border-radius: 20px;
    box-shadow: 0 0 25px rgba(0,0,0,0.3);
    text-align: center;
    transition: all 0.4s ease;
  }

  .about-card img {
    width: 150px;
    height: 150px;
    border-radius: 50%;
    box-shadow: 0 0 20px rgba(0,0,0,0.4);
    margin-bottom: 1rem;
    transition: transform 0.4s ease;
  }

  .about-card img:hover {
    transform: scale(1.05);
  }

  .about-card h2 {
    font-size: 1.8rem;
    margin-bottom: 0.3rem;
  }

  .about-card p.role {
    font-size: 1rem;
    color: #aaa;
    margin-bottom: 1.5rem;
  }

  .about-card .skills {
    font-size: 0.9rem;
    margin: 1rem 0;
    line-height: 1.8;
  }

  .about-card .links a {
    display: inline-block;
    margin: 0.4rem;
    padding: 0.5rem 1rem;
    border-radius: 10px;
    text-decoration: none;
    background: #333;
    color: white;
    transition: background 0.3s;
  }

  .about-card .links a:hover {
    background: #0078ff;
  }

  /* 🌗 Light Mode */
  @media (prefers-color-scheme: light) {
    .about-card {
      background: #fff;
      color: #000;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }
    .about-card .links a {
      background: #eee;
      color: #111;
    }
    .about-card .links a:hover {
      background: #0078ff;
      color: #fff;
    }
  }
</style>

<div class="about-card">
  <img src="/assets/img/profile.jpg.jpg" alt="0X_V3n0m">
  <h2>0X_V3n0m 🕷️</h2>
  <p class="role">Bug Hunter • Reverse Engineer </p>

  <p>
    I'm a beginner security researcher, learning <b>Bug Hunting</b> and <b>Reverse Engineering</b> step by step.  
    I enjoy breaking things, exploring how software really works, and learning from every mistake. 
  </p>

  <div class="skills">
    <b>Tools:</b><br>
    Burp Suite · Ghidra · IDA 
  </div>


 <div class="links">
  <a href="https://twitter.com/0X_V3N0M">🐦 Twitter</a>
  <a href="https://www.linkedin.com/in/ahmed-allah-mohamed-53a60b232">💼 LinkedIn</a>
  <a href="https://www.facebook.com/0XAhmedAllah">📘 Facebook</a>
  <a href="mailto:am4781616@gmail.com">📧 Email</a>
</div>


  <blockquote style="margin-top: 2rem; color: #999; font-style: italic;">
    “Every binary hides a story — you just need to read it backwards.” 🧠
  </blockquote>
</div>