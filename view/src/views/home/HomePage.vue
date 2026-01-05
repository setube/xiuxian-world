<template>
  <div class="home-page">
    <!-- 背景灵气粒子 -->
    <div class="spirit-particles">
      <span v-for="i in 20" :key="i" class="particle" :style="getParticleStyle(i)" />
    </div>

    <!-- 公告区域 -->
    <div class="notice-section">
      <div class="notice-glow" />
      <div class="notice-header">
        <ScrollText :size="16" class="notice-icon" />
        <span class="notice-title">修仙公告</span>
      </div>
      <div class="notice-content">
        <p>欢迎来到修仙世界！努力修炼，早日飞升！</p>
      </div>
      <div class="notice-decoration left" />
      <div class="notice-decoration right" />
    </div>

    <!-- 功能宫格 -->
    <div class="feature-grid">
      <div
        v-for="(feature, index) in features"
        :key="feature.id"
        class="feature-item"
        :style="{ '--delay': index * 0.05 + 's', '--color': feature.color }"
        @click="navigateTo(feature.path)"
      >
        <div class="feature-glow" :style="{ background: `radial-gradient(circle, ${feature.color}30 0%, transparent 70%)` }" />
        <div class="feature-icon" :style="{ background: `${feature.color}20`, color: feature.color }">
          <component :is="feature.icon" :size="28" />
        </div>
        <span class="feature-label">{{ feature.label }}</span>
        <div class="feature-shine" />
      </div>
    </div>

    <!-- 底部装饰 -->
    <div class="bottom-decoration">
      <div class="deco-line" />
      <span class="deco-text">道法自然</span>
      <div class="deco-line" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { usePlayerStore } from '@/stores/player'
  import { User, Flame, Store, Trophy, Settings, Building2, ScrollText, Swords, Shield, Coins, Building, Sun, Zap, Map } from 'lucide-vue-next'

  const router = useRouter()
  const playerStore = usePlayerStore()

  onMounted(async () => {
    // 每次进入页面都刷新角色数据
    await playerStore.fetchStats()
  })

  // 功能宫格 - 古风配色
  const features = [
    { id: 'profile', label: '角色', icon: User, path: '/profile', color: '#7a9e8e' }, // 青玉
    { id: 'sect', label: '宗门', icon: Building2, path: '/sect/my', color: '#8B7355' }, // 棕黄
    { id: 'alchemy', label: '炼丹', icon: Flame, path: '/alchemy', color: '#9b4a3c' }, // 朱砂
    { id: 'market', label: '坊市', icon: Store, path: '/market', color: '#c9a959' }, // 古金
    { id: 'battle', label: '对决', icon: Swords, path: '/battle', color: '#d94040' }, // 血红
    { id: 'formation', label: '洞府', icon: Shield, path: '/cave', color: '#5c8a8a' }, // 青铜
    { id: 'loot', label: '夺宝', icon: Coins, path: '/loot', color: '#b8860b' }, // 暗金
    { id: 'tower', label: '古塔', icon: Building, path: '/tower', color: '#5c4a8a' }, // 紫霞
    { id: 'dungeon', label: '虚天殿', icon: Map, path: '/dungeon', color: '#5ab8b8' }, // 碧青
    { id: 'world-events', label: '天道', icon: Sun, path: '/world-events', color: '#faad14' }, // 天金
    { id: 'fengxi', label: '风雷', icon: Zap, path: '/fengxi', color: '#8b5cf6' }, // 紫电
    { id: 'rankings', label: '排行', icon: Trophy, path: '/rankings', color: '#c96a5a' }, // 赤红
    { id: 'settings', label: '设置', icon: Settings, path: '/settings', color: '#6b6560' } // 枯墨
  ]

  const navigateTo = (path: string) => {
    router.push(path)
  }

  // 粒子样式生成
  const getParticleStyle = (_index: number) => {
    const left = Math.random() * 100
    const delay = Math.random() * 8
    const duration = 6 + Math.random() * 4
    const size = 2 + Math.random() * 3
    return {
      '--left': `${left}%`,
      '--delay': `${delay}s`,
      '--duration': `${duration}s`,
      '--size': `${size}px`
    }
  }
</script>

<style scoped>
  .home-page {
    padding: 16px;
    position: relative;
    min-height: 100%;
    overflow: hidden;
  }

  /* 背景灵气粒子 */
  .spirit-particles {
    position: fixed;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 0;
  }

  .particle {
    position: absolute;
    width: var(--size);
    height: var(--size);
    background: radial-gradient(circle, rgba(201, 169, 89, 0.6) 0%, transparent 70%);
    border-radius: 50%;
    left: var(--left);
    bottom: -10px;
    animation: float-up var(--duration) ease-in-out infinite;
    animation-delay: var(--delay);
    opacity: 0;
  }

  @keyframes float-up {
    0% {
      transform: translateY(0) scale(0);
      opacity: 0;
    }
    10% {
      opacity: 0.8;
      transform: translateY(-10vh) scale(1);
    }
    90% {
      opacity: 0.6;
    }
    100% {
      transform: translateY(-100vh) scale(0.5);
      opacity: 0;
    }
  }

  /* 公告区域 - 告示牌风格 */
  .notice-section {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    overflow: hidden;
    position: relative;
    margin-bottom: 20px;
    z-index: 1;
    animation: fade-in-down 0.5s ease;
  }

  @keyframes fade-in-down {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .notice-glow {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle at 50% 100%, rgba(201, 169, 89, 0.08) 0%, transparent 50%);
    pointer-events: none;
    animation: notice-glow-pulse 4s ease-in-out infinite;
  }

  @keyframes notice-glow-pulse {
    0%,
    100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
  }

  .notice-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, var(--color-gold), #a08040, var(--color-gold), transparent);
    animation: shimmer 3s ease-in-out infinite;
  }

  @keyframes shimmer {
    0%,
    100% {
      background-position: -200% 0;
    }
    50% {
      background-position: 200% 0;
    }
  }

  .notice-decoration {
    position: absolute;
    width: 30px;
    height: 30px;
    border: 2px solid rgba(201, 169, 89, 0.2);
    pointer-events: none;
  }

  .notice-decoration.left {
    top: 8px;
    left: 8px;
    border-right: none;
    border-bottom: none;
  }

  .notice-decoration.right {
    bottom: 8px;
    right: 8px;
    border-left: none;
    border-top: none;
  }

  .notice-header {
    padding: 12px 16px;
    background: rgba(201, 169, 89, 0.08);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
  }

  .notice-icon {
    color: var(--color-gold);
    animation: icon-bounce 2s ease-in-out infinite;
    filter: drop-shadow(0 0 4px rgba(201, 169, 89, 0.4));
  }

  @keyframes icon-bounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-2px);
    }
  }

  .notice-title {
    font-weight: 600;
    color: var(--color-gold);
    font-size: 0.9rem;
    text-shadow: 0 0 10px rgba(201, 169, 89, 0.3);
  }

  .notice-content {
    padding: 16px;
    position: relative;
  }

  .notice-content p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.85rem;
    line-height: 1.8;
  }

  /* 功能宫格 - 印章风格 */
  .feature-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 20px;
    position: relative;
    z-index: 1;
  }

  .feature-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 14px 8px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    animation: fade-in-up 0.5s ease backwards;
    animation-delay: var(--delay);
  }

  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .feature-glow {
    position: absolute;
    inset: -20px;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .feature-item:hover .feature-glow {
    opacity: 1;
  }

  .feature-shine {
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transform: skewX(-15deg);
    transition: left 0.5s ease;
    pointer-events: none;
  }

  .feature-item:hover .feature-shine {
    left: 150%;
  }

  .feature-item::before {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    right: 3px;
    bottom: 3px;
    border: 1px solid rgba(201, 169, 89, 0.1);
    border-radius: 2px;
    pointer-events: none;
    transition: border-color 0.3s ease;
  }

  .feature-item:hover::before {
    border-color: var(--color);
  }

  .feature-item:hover {
    transform: translateY(-4px);
    border-color: var(--color);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3), 0 0 15px color-mix(in srgb, var(--color) 20%, transparent);
  }

  .feature-item:active {
    transform: scale(0.95) translateY(-2px);
  }

  .feature-icon {
    width: 48px;
    height: 48px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    position: relative;
  }

  .feature-item:hover .feature-icon {
    transform: scale(1.1);
    filter: drop-shadow(0 0 8px currentColor);
  }

  .feature-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 500;
    transition: all 0.3s ease;
  }

  .feature-item:hover .feature-label {
    color: var(--color);
    text-shadow: 0 0 8px color-mix(in srgb, var(--color) 30%, transparent);
  }

  /* 底部装饰 */
  .bottom-decoration {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 20px 0;
    opacity: 0.5;
    position: relative;
    z-index: 1;
    animation: fade-in 1s ease 0.5s backwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 0.5;
    }
  }

  .deco-line {
    width: 60px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(201, 169, 89, 0.5), transparent);
  }

  .deco-text {
    font-size: 0.75rem;
    color: var(--color-gold);
    letter-spacing: 4px;
    font-weight: 500;
  }
</style>
