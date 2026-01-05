<script setup lang="ts"></script>

<template>
  <div class="auth-container">
    <!-- 背景装饰 -->
    <div class="auth-bg">
      <div class="bg-orb bg-orb-1" />
      <div class="bg-orb bg-orb-2" />
      <div class="bg-orb bg-orb-3" />
    </div>

    <div class="auth-content">
      <!-- Logo 区域 -->
      <div class="auth-header">
        <div class="logo-icon">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" stroke="url(#gradient)" stroke-width="2" fill="none" />
            <path d="M50 15 L50 85 M25 50 L75 50" stroke="url(#gradient)" stroke-width="2" />
            <circle cx="50" cy="50" r="20" stroke="url(#gradient)" stroke-width="2" fill="none" />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color: #7a9e8e" />
                <stop offset="100%" style="stop-color: #c9a959" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 class="auth-title">修仙世界</h1>
        <p class="auth-subtitle">踏入修真之路，问鼎仙道巅峰</p>
      </div>

      <!-- 表单卡片 -->
      <div class="auth-card">
        <router-view />
      </div>
    </div>
  </div>
</template>

<style scoped>
  .auth-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    padding: 20px;
  }

  .auth-bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .bg-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.3;
  }

  .bg-orb-1 {
    width: 400px;
    height: 400px;
    background: rgba(93, 124, 111, 0.4);
    top: -100px;
    right: -100px;
    animation: float 10s ease-in-out infinite;
  }

  .bg-orb-2 {
    width: 300px;
    height: 300px;
    background: rgba(201, 169, 89, 0.2);
    bottom: -50px;
    left: -50px;
    animation: float 12s ease-in-out infinite reverse;
  }

  .bg-orb-3 {
    width: 200px;
    height: 200px;
    background: rgba(155, 74, 60, 0.15);
    top: 50%;
    left: 30%;
    animation: float 14s ease-in-out infinite;
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0) rotate(0deg);
    }
    50% {
      transform: translateY(-20px) rotate(3deg);
    }
  }

  .auth-content {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 420px;
  }

  .auth-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .logo-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 16px;
    animation: ink-glow 4s ease-in-out infinite;
    border-radius: 50%;
  }

  .logo-icon svg {
    width: 100%;
    height: 100%;
  }

  .auth-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 8px;
    background: linear-gradient(135deg, #7a9e8e 0%, #c9a959 50%, #d4bc7a 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .auth-subtitle {
    color: var(--text-secondary);
    margin: 0;
    font-size: 1rem;
    letter-spacing: 2px;
  }

  .auth-card {
    background: rgba(37, 33, 23, 0.9);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 32px;
    box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.5);
    position: relative;
  }

  .auth-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 20px;
    right: 20px;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--color-gold), transparent);
  }

  .auth-card::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 20px;
    right: 20px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(201, 169, 89, 0.3), transparent);
  }

  @keyframes ink-glow {
    0%,
    100% {
      box-shadow: 0 0 15px rgba(201, 169, 89, 0.2);
    }
    50% {
      box-shadow: 0 0 30px rgba(201, 169, 89, 0.3);
    }
  }
</style>
