<template>
  <div class="mobile-layout">
    <!-- 顶部状态栏 -->
    <header class="top-bar">
      <div class="player-section">
        <div class="avatar">
          <span>{{ playerStore.displayName?.charAt(0) || '修' }}</span>
        </div>
        <div class="player-info">
          <div class="player-name-row">
            <span class="player-name">{{ playerStore.displayName }}</span>
            <div class="combat-power">
              <TrendingUp :size="12" />
              <span>{{ playerStore.combatPower }}</span>
            </div>
          </div>
          <span :class="`realm-badge realm-tier-${realmTier}`">
            {{ playerStore.realmDisplay }}
          </span>
        </div>
      </div>

      <div class="resources">
        <div class="resource-item">
          <Coins :size="16" class="resource-icon" />
          <span class="resource-value">{{ (playerStore.character?.spiritStones || 0).toLocaleString() }}</span>
        </div>
      </div>
    </header>

    <!-- 南宫婉奇遇状态浮窗 -->
    <NangongWanStatus />

    <!-- 主内容区 -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- 底部导航栏 -->
    <nav class="bottom-nav">
      <router-link
        v-for="item in bottomNavItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: currentPath === item.path }"
      >
        <div class="nav-icon-wrapper" :class="{ active: currentPath === item.path }">
          <component :is="item.icon" :size="24" />
        </div>
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { usePlayerStore } from '@/stores/player'
  import { Home, Sparkles, Package, Swords, Coins, TrendingUp } from 'lucide-vue-next'
  import NangongWanStatus from '@/components/NangongWanStatus.vue'

  const router = useRouter()
  const playerStore = usePlayerStore()

  // 底部导航项
  const bottomNavItems = [
    { path: '/', label: '主页', icon: Home },
    { path: '/cultivation', label: '修炼', icon: Sparkles },
    { path: '/inventory', label: '储物', icon: Package },
    { path: '/arena', label: '论剑', icon: Swords }
  ]

  const realmTier = computed(() => {
    return playerStore.character?.realm?.tier || 1
  })

  const currentPath = computed(() => router.currentRoute.value.path)

  onMounted(async () => {
    // 从服务器获取角色完整信息（包含属性、宗门等）
    await playerStore.fetchStats()
  })
</script>

<style scoped>
  .mobile-layout {
    min-height: 100vh;
    max-width: 500px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    background: var(--bg-dark);
    position: relative;
  }

  /* 顶部状态栏 - 古卷风格 */
  .top-bar {
    height: 60px;
    background: linear-gradient(180deg, rgba(37, 33, 23, 0.98) 0%, rgba(26, 24, 18, 0.95) 100%);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    position: sticky;
    top: 0;
    z-index: 100;
    border-bottom: 1px solid var(--border-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .player-section {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1rem;
    color: var(--text-primary);
    border: 1px solid var(--color-gold);
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
  }

  .player-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .player-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .player-name {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--text-primary);
  }

  .combat-power {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 2px 6px;
    background: rgba(201, 169, 89, 0.15);
    border-radius: 3px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-gold);
  }

  .combat-power svg {
    color: var(--color-gold);
  }

  .realm-badge {
    font-size: 0.7rem;
    padding: 2px 8px;
    border-radius: 2px;
    background: rgba(201, 169, 89, 0.15);
    border: 1px solid rgba(201, 169, 89, 0.3);
    width: fit-content;
  }

  .resources {
    display: flex;
    gap: 12px;
  }

  .resource-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: rgba(201, 169, 89, 0.1);
    border: 1px solid rgba(201, 169, 89, 0.25);
    border-radius: 4px;
  }

  .resource-icon {
    color: var(--color-gold);
  }

  .resource-value {
    color: var(--color-gold);
    font-weight: 600;
    font-size: 0.85rem;
  }

  /* 主内容区 */
  .main-content {
    flex: 1;
    overflow-y: auto;
    padding-bottom: 80px;
  }

  /* 底部导航栏 - 竹简风格 */
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 500px;
    height: 70px;
    background: linear-gradient(180deg, rgba(37, 33, 23, 0.98) 0%, rgba(31, 27, 20, 0.98) 100%);
    backdrop-filter: blur(10px);
    border-top: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 0 8px;
    z-index: 100;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    text-decoration: none;
    color: var(--text-muted);
    transition: all 0.2s ease;
    padding: 8px 16px;
  }

  .nav-icon-wrapper {
    width: 44px;
    height: 44px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    border: 1px solid transparent;
  }

  .nav-icon-wrapper.active {
    background: rgba(201, 169, 89, 0.15);
    color: var(--color-gold);
    border-color: var(--color-gold);
    box-shadow: 0 2px 8px rgba(201, 169, 89, 0.2);
  }

  .nav-item.active {
    color: var(--color-gold);
  }

  .nav-label {
    font-size: 0.7rem;
    font-weight: 500;
  }

  /* 境界颜色 - 五行配色 */
  .realm-tier-1 {
    color: #9ca3af;
    background: rgba(156, 163, 175, 0.15);
  }
  .realm-tier-2 {
    color: #7cb88a;
    background: rgba(124, 184, 138, 0.15);
  }
  .realm-tier-3 {
    color: #6b9fc9;
    background: rgba(107, 159, 201, 0.15);
  }
  .realm-tier-4 {
    color: #9c7ab8;
    background: rgba(156, 122, 184, 0.15);
  }
  .realm-tier-5 {
    color: #c9a959;
    background: rgba(201, 169, 89, 0.15);
  }
  .realm-tier-6 {
    color: #c96a5a;
    background: rgba(201, 106, 90, 0.15);
  }
  .realm-tier-7 {
    color: #d4a5c9;
    background: rgba(212, 165, 201, 0.15);
  }
  .realm-tier-8 {
    color: #5ab8b8;
    background: rgba(90, 184, 184, 0.15);
  }
  .realm-tier-9 {
    color: #f0e6c8;
    background: rgba(240, 230, 200, 0.15);
  }
</style>
