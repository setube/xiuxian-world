<template>
  <div class="blood-soul-banner">
    <!-- 背景魂魄粒子 -->
    <div class="soul-particles">
      <div
        v-for="i in 30"
        :key="i"
        class="soul-particle"
        :style="{
          '--delay': Math.random() * 5 + 's',
          '--x': Math.random() * 100 + '%',
          '--y': Math.random() * 100 + '%',
          '--size': Math.random() * 6 + 3 + 'px',
          '--duration': Math.random() * 4 + 3 + 's'
        }"
      />
    </div>

    <!-- 标题 -->
    <div class="page-header">
      <div class="header-icon">
        <div class="header-icon-glow" />
        <div class="header-icon-ring" />
        <Flag :size="24" />
      </div>
      <div class="header-text">
        <h1>血魂幡</h1>
        <p>本命魔宝 · 炼魂为宝</p>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && !bannerStatus" class="loading-container">
      <Loader2 :size="32" class="spin" />
      <span>正在唤醒魔宝...</span>
    </div>

    <!-- 未解锁提示 -->
    <div v-else-if="!isUnlocked" class="not-unlocked">
      <Lock :size="48" />
      <h2>血魂幡未激活</h2>
      <p>筑基期后，黑煞教弟子可激活本命魔宝</p>
    </div>

    <!-- 主内容 -->
    <template v-else>
      <!-- 血魂幡状态栏 -->
      <BannerStatusCard />

      <!-- 功能标签页 -->
      <div class="tab-container">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-item"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" :size="18" />
          <span>{{ tab.name }}</span>
        </div>
      </div>

      <!-- 炼化槽 -->
      <div v-if="activeTab === 'refine'" class="tab-content">
        <RefinementSlots />
      </div>

      <!-- 煞气池 -->
      <div v-else-if="activeTab === 'sha'" class="tab-content">
        <ShaPoolPanel />
      </div>

      <!-- 魂魄储备 -->
      <div v-else-if="activeTab === 'souls'" class="tab-content">
        <SoulStoragePanel />
      </div>

      <!-- PvE活动 -->
      <div v-else-if="activeTab === 'pve'" class="tab-content">
        <PvEPanel />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, markRaw, type Component } from 'vue'
import { storeToRefs } from 'pinia'
import { useBloodSoulBannerStore } from '@/stores/bloodSoulBanner'
import { Flag, Loader2, Lock, Flame, Ghost, Swords } from 'lucide-vue-next'
import BannerStatusCard from './components/BannerStatusCard.vue'
import RefinementSlots from './components/RefinementSlots.vue'
import ShaPoolPanel from './components/ShaPoolPanel.vue'
import SoulStoragePanel from './components/SoulStoragePanel.vue'
import PvEPanel from './components/PvEPanel.vue'

const bannerStore = useBloodSoulBannerStore()
const { loading, bannerStatus, isUnlocked } = storeToRefs(bannerStore)

const activeTab = ref('refine')

const tabs: { id: string; name: string; icon: Component }[] = [
  { id: 'refine', name: '炼化槽', icon: markRaw(Flame) },
  { id: 'sha', name: '煞气池', icon: markRaw(Flame) },
  { id: 'souls', name: '魂魄储备', icon: markRaw(Ghost) },
  { id: 'pve', name: 'PvE活动', icon: markRaw(Swords) }
]

onMounted(async () => {
  try {
    await bannerStore.fetchBannerStatus()
  } catch (error) {
    console.error('初始化血魂幡系统失败:', error)
  }
})
</script>

<style scoped>
.blood-soul-banner {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
}

/* 背景魂魄粒子 */
.soul-particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.soul-particle {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: var(--size);
  height: var(--size);
  background: radial-gradient(circle, rgba(139, 92, 246, 0.9) 0%, rgba(88, 28, 135, 0.5) 50%, transparent 100%);
  border-radius: 50%;
  animation: soulFloat var(--duration) ease-in-out infinite;
  animation-delay: var(--delay);
}

@keyframes soulFloat {
  0%, 100% {
    opacity: 0.3;
    transform: translateY(0) scale(1);
  }
  50% {
    opacity: 1;
    transform: translateY(-10px) scale(1.2);
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
  background: linear-gradient(135deg, #581c87 0%, #7c3aed 100%);
  border-radius: 12px;
  color: white;
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
}

.header-icon svg {
  position: relative;
  z-index: 2;
  animation: iconPulse 2s ease-in-out infinite;
}

@keyframes iconPulse {
  0%, 100% {
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
  background: radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, transparent 70%);
  border-radius: 12px;
  animation: headerGlow 3s ease-in-out infinite;
}

@keyframes headerGlow {
  0%, 100% {
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
  border: 2px solid rgba(139, 92, 246, 0.6);
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
  text-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
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
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.not-unlocked {
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

.not-unlocked h2 {
  margin: 16px 0 8px;
  font-size: 1.2rem;
  color: var(--text-primary);
}

.not-unlocked p {
  margin: 0;
  font-size: 0.9rem;
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
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.1);
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
  background: linear-gradient(135deg, #581c87 0%, #7c3aed 100%);
  color: white;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
  animation: tabActiveGlow 2s ease-in-out infinite;
}

@keyframes tabActiveGlow {
  0%, 100% {
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.8);
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

@media (max-width: 480px) {
  .tab-item {
    flex-direction: column;
    gap: 4px;
    padding: 8px 4px;
    font-size: 0.75rem;
  }
}
</style>
