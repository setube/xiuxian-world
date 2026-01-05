<template>
  <div class="heisha-arts">
    <!-- 背景煞气粒子 -->
    <div class="sha-particles">
      <div
        v-for="i in 25"
        :key="i"
        class="sha-particle"
        :style="{
          '--delay': Math.random() * 5 + 's',
          '--x': Math.random() * 100 + '%',
          '--y': Math.random() * 100 + '%',
          '--size': Math.random() * 4 + 2 + 'px',
          '--duration': Math.random() * 3 + 2 + 's'
        }"
      />
    </div>

    <!-- 标题 -->
    <div class="page-header">
      <div class="header-icon">
        <div class="header-icon-glow" />
        <div class="header-icon-ring" />
        <Skull :size="24" />
      </div>
      <div class="header-text">
        <h1>魔道禁术</h1>
        <p>以力证道，血染苍穹</p>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <Loader2 :size="32" class="spin" />
      <span>正在凝聚煞气...</span>
    </div>

    <!-- 非黑煞教弟子提示 -->
    <div v-else-if="!isMember" class="not-member">
      <AlertCircle :size="48" />
      <h2>无法修习</h2>
      <p>只有黑煞教弟子才能修习魔道禁术</p>
    </div>

    <!-- 主内容 -->
    <template v-else>
      <!-- 血魂幡入口 -->
      <div class="blood-banner-entry" @click="navigateToBloodBanner">
        <div class="banner-icon">
          <Flag :size="24" />
        </div>
        <div class="banner-info">
          <h3>血魂幡</h3>
          <p>本命魔宝 · 炼化魂魄</p>
        </div>
        <ChevronRight :size="20" class="banner-arrow" />
      </div>

      <!-- 煞气状态栏 -->
      <div class="sha-status-bar">
        <div class="sha-info">
          <Flame :size="18" />
          <span class="sha-label">煞气</span>
          <span class="sha-value">{{ shaEnergy?.current || 0 }}/{{ shaEnergy?.max || 100 }}</span>
        </div>
        <div class="sha-bonus">
          <Swords :size="16" />
          <span>战力加成: +{{ (shaEnergy?.bonusPercent || 0).toFixed(1) }}%</span>
        </div>
      </div>

      <!-- 功能标签页 -->
      <div class="tab-container">
        <div v-for="tab in tabs" :key="tab.id" class="tab-item" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
          <component :is="tab.icon" :size="18" />
          <span>{{ tab.name }}</span>
        </div>
      </div>

      <!-- 夺舍魔功 -->
      <div v-if="activeTab === 'seize'" class="tab-content">
        <SoulSeizePanel />
      </div>

      <!-- 魔染红尘 -->
      <div v-else-if="activeTab === 'theft'" class="tab-content">
        <ConsortTheftPanel />
      </div>

      <!-- 煞气淬体 / PvP -->
      <div v-else-if="activeTab === 'sha'" class="tab-content">
        <ShaEnergyPanel />
      </div>

      <!-- 丹魔之咒 -->
      <div v-else-if="activeTab === 'curse'" class="tab-content">
        <CursePanel />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, markRaw, type Component } from 'vue'
  import { useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import { useHeishaStore } from '@/stores/heisha'
  import { Skull, Loader2, AlertCircle, Flame, Swords, Ghost, Heart, Zap, Sparkles, Flag, ChevronRight } from 'lucide-vue-next'
  import SoulSeizePanel from './components/SoulSeizePanel.vue'
  import ConsortTheftPanel from './components/ConsortTheftPanel.vue'
  import ShaEnergyPanel from './components/ShaEnergyPanel.vue'
  import CursePanel from './components/CursePanel.vue'

  const router = useRouter()
  const heishaStore = useHeishaStore()
  const { loading, isMember, shaEnergy } = storeToRefs(heishaStore)

  const activeTab = ref('seize')

  function navigateToBloodBanner() {
    router.push('/blood-soul-banner')
  }

  const tabs: { id: string; name: string; icon: Component }[] = [
    { id: 'seize', name: '夺舍魔功', icon: markRaw(Ghost) },
    { id: 'theft', name: '魔染红尘', icon: markRaw(Heart) },
    { id: 'sha', name: '煞气淬体', icon: markRaw(Zap) },
    { id: 'curse', name: '丹魔之咒', icon: markRaw(Sparkles) }
  ]

  onMounted(async () => {
    try {
      await heishaStore.fetchStatus(true)
    } catch (error) {
      console.error('初始化魔道禁术系统失败:', error)
    }
  })
</script>

<style scoped>
  .heisha-arts {
    padding: 16px;
    max-width: 600px;
    margin: 0 auto;
    position: relative;
    overflow: hidden;
  }

  /* 背景煞气粒子 */
  .sha-particles {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 0;
  }

  .sha-particle {
    position: absolute;
    left: var(--x);
    top: var(--y);
    width: var(--size);
    height: var(--size);
    background: radial-gradient(circle, rgba(220, 38, 38, 0.9) 0%, rgba(127, 29, 29, 0.5) 50%, transparent 100%);
    border-radius: 50%;
    animation: shaTwinkle var(--duration) ease-in-out infinite;
    animation-delay: var(--delay);
  }

  @keyframes shaTwinkle {
    0%,
    100% {
      opacity: 0.3;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.3);
    }
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    position: relative;
    z-index: 1;
  }

  .header-icon {
    position: relative;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%);
    border-radius: 12px;
    color: white;
    box-shadow: 0 0 20px rgba(220, 38, 38, 0.4);
  }

  .header-icon svg {
    position: relative;
    z-index: 2;
    animation: iconPulse 2s ease-in-out infinite;
  }

  @keyframes iconPulse {
    0%,
    100% {
      transform: scale(1);
      filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.5));
    }
    50% {
      transform: scale(1.1);
      filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
    }
  }

  .header-icon-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(220, 38, 38, 0.6) 0%, transparent 70%);
    border-radius: 12px;
    animation: headerGlow 3s ease-in-out infinite;
  }

  @keyframes headerGlow {
    0%,
    100% {
      opacity: 0.5;
      transform: translate(-50%, -50%) scale(1);
    }
    50% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.3);
    }
  }

  .header-icon-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    border: 2px solid rgba(220, 38, 38, 0.6);
    border-radius: 12px;
    animation: headerRing 2s ease-out infinite;
  }

  @keyframes headerRing {
    0% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.8;
    }
    100% {
      transform: translate(-50%, -50%) scale(1.6);
      opacity: 0;
    }
  }

  .header-text h1 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--text-primary);
    text-shadow: 0 0 10px rgba(220, 38, 38, 0.3);
  }

  .header-text p {
    margin: 4px 0 0;
    font-size: 0.85rem;
    color: var(--text-muted);
    letter-spacing: 0.5px;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: var(--text-muted);
    gap: 12px;
    position: relative;
    z-index: 1;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .not-member {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: var(--text-muted);
    text-align: center;
    position: relative;
    z-index: 1;
  }

  .not-member h2 {
    margin: 16px 0 8px;
    font-size: 1.2rem;
    color: var(--text-primary);
  }

  .not-member p {
    margin: 0;
    font-size: 0.9rem;
  }

  /* 煞气状态栏 */
  .sha-status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(127, 29, 29, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 10px;
    margin-bottom: 16px;
    position: relative;
    z-index: 1;
  }

  .sha-info {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #dc2626;
  }

  .sha-label {
    font-weight: 500;
  }

  .sha-value {
    font-weight: 700;
    font-size: 1.1rem;
  }

  .sha-bonus {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: #f87171;
  }

  /* 标签页 */
  .tab-container {
    display: flex;
    gap: 4px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 16px;
    position: relative;
    z-index: 1;
    box-shadow: 0 0 15px rgba(220, 38, 38, 0.1);
  }

  .tab-item {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 8px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-muted);
    transition: all 0.2s ease;
  }

  .tab-item:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .tab-item.active {
    background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%);
    color: white;
    box-shadow: 0 0 12px rgba(220, 38, 38, 0.5);
    animation: tabActiveGlow 2s ease-in-out infinite;
  }

  @keyframes tabActiveGlow {
    0%,
    100% {
      box-shadow: 0 0 12px rgba(220, 38, 38, 0.5);
    }
    50% {
      box-shadow: 0 0 20px rgba(220, 38, 38, 0.8);
    }
  }

  .tab-content {
    animation: fadeIn 0.2s ease;
    position: relative;
    z-index: 1;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* 血魂幡入口 */
  .blood-banner-entry {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(88, 28, 135, 0.2) 100%);
    border: 1px solid rgba(139, 92, 246, 0.4);
    border-radius: 12px;
    margin-bottom: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    z-index: 1;
    overflow: hidden;
  }

  .blood-banner-entry::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.2), transparent);
    transition: left 0.5s ease;
  }

  .blood-banner-entry:hover::before {
    left: 100%;
  }

  .blood-banner-entry:hover {
    border-color: rgba(139, 92, 246, 0.7);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
    transform: translateY(-2px);
  }

  .banner-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
    border-radius: 10px;
    color: white;
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
  }

  .banner-info {
    flex: 1;
  }

  .banner-info h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #a855f7;
  }

  .banner-info p {
    margin: 4px 0 0;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .banner-arrow {
    color: var(--text-muted);
    transition: transform 0.2s ease;
  }

  .blood-banner-entry:hover .banner-arrow {
    transform: translateX(4px);
    color: #a855f7;
  }

  @media (max-width: 480px) {
    .tab-item {
      flex-direction: column;
      gap: 4px;
      padding: 8px 4px;
      font-size: 0.75rem;
    }

    .sha-status-bar {
      flex-direction: column;
      gap: 8px;
    }
  }
</style>
