<template>
  <div class="wanling-arts">
    <!-- 背景灵气粒子 -->
    <div class="spirit-particles">
      <div
        v-for="i in 12"
        :key="i"
        class="particle"
        :style="{ '--delay': i * 0.5 + 's', '--x': Math.random() * 100 + '%', '--size': Math.random() * 6 + 3 + 'px' }"
      />
    </div>

    <!-- 标题 -->
    <div class="page-header">
      <div class="header-glow" />
      <div class="header-icon">
        <div class="icon-pulse" />
        <Rabbit :size="24" />
      </div>
      <div class="header-text">
        <h1>万灵秘术</h1>
        <p>灵兽养成，万物通灵</p>
      </div>
      <button class="refresh-btn" @click="handleRefresh" :disabled="loading">
        <RefreshCw :size="18" :class="{ spinning: loading }" />
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="initialLoading" class="loading-container">
      <Loader2 :size="32" class="spin" />
      <span>正在感应灵兽...</span>
    </div>

    <!-- 非万灵宗弟子提示 -->
    <div v-else-if="!isMember" class="not-member">
      <AlertCircle :size="48" />
      <h2>无法修习</h2>
      <p>只有万灵宗弟子才能修习万灵秘术</p>
      <button class="go-sect-btn" @click="router.push({ name: 'MySect' })">前往宗门</button>
    </div>

    <!-- 主内容 -->
    <template v-else>
      <!-- 灵兽状态总览 -->
      <div class="status-cards">
        <div class="status-card">
          <div class="status-icon beasts-icon">
            <PawPrint :size="20" />
          </div>
          <div class="status-info">
            <span class="status-label">灵兽数量</span>
            <span class="status-value">{{ beasts.length }} / {{ maxBeasts }}</span>
          </div>
        </div>

        <div class="status-card">
          <div class="status-icon deployed-icon" :class="{ active: deployedBeast }">
            <Sword :size="20" />
          </div>
          <div class="status-info">
            <span class="status-label">出战灵兽</span>
            <span class="status-value" :class="{ 'no-beast': !deployedBeast }">
              {{ deployedBeast ? getBeastDisplayName(deployedBeast) : '无' }}
            </span>
          </div>
        </div>

        <div class="status-card">
          <div class="status-icon search-icon">
            <Search :size="20" />
          </div>
          <div class="status-info">
            <span class="status-label">今日寻觅</span>
            <span class="status-value">{{ searchStatus?.dailySearches || 0 }} / {{ searchStatus?.maxDailySearches || 3 }}</span>
          </div>
        </div>

        <div class="status-card">
          <div class="status-icon raid-icon">
            <Leaf :size="20" />
          </div>
          <div class="status-info">
            <span class="status-label">今日偷菜</span>
            <span class="status-value">{{ raidStatus?.dailyRaids || 0 }} / {{ raidStatus?.maxDailyRaids || 5 }}</span>
          </div>
        </div>
      </div>

      <!-- 标签页 -->
      <div class="sect-tabs">
        <NTabs v-model:value="activeTab" type="segment" animated class="wanling-tabs">
          <NTabPane name="beasts">
            <template #tab>
              <div class="tab-label">
                <Heart :size="14" />
                <span>我的灵兽</span>
              </div>
            </template>
            <MyBeastsPanel />
          </NTabPane>
          <NTabPane name="search">
            <template #tab>
              <div class="tab-label">
                <Search :size="14" />
                <span>寻觅灵兽</span>
              </div>
            </template>
            <BeastSearchPanel />
          </NTabPane>
          <NTabPane name="raid">
            <template #tab>
              <div class="tab-label">
                <Sprout :size="14" />
                <span>灵兽偷菜</span>
              </div>
            </template>
            <BeastRaidPanel />
          </NTabPane>
        </NTabs>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import { Rabbit, RefreshCw, Loader2, AlertCircle, PawPrint, Sword, Search, Leaf, Heart, Sprout } from 'lucide-vue-next'
  import { useWanlingStore } from '@/stores/wanling'
  import MyBeastsPanel from './components/MyBeastsPanel.vue'
  import BeastSearchPanel from './components/BeastSearchPanel.vue'
  import BeastRaidPanel from './components/BeastRaidPanel.vue'

  const router = useRouter()
  const wanlingStore = useWanlingStore()
  const { isMember, beasts, maxBeasts, deployedBeast, searchStatus, raidStatus, loading } = storeToRefs(wanlingStore)

  const activeTab = ref('beasts')
  const initialLoading = ref(true)

  // 获取灵兽显示名
  const getBeastDisplayName = (beast: typeof deployedBeast.value) => {
    if (!beast) return ''
    return beast.customName || beast.name
  }

  // 刷新数据
  const handleRefresh = async () => {
    await wanlingStore.fetchStatus(true)
  }

  onMounted(async () => {
    try {
      await wanlingStore.fetchStatus(true)
    } catch (error) {
      console.error('初始化万灵宗失败:', error)
    } finally {
      initialLoading.value = false
    }
  })
</script>

<style scoped>
  .wanling-arts {
    min-height: 100vh;
    padding: 16px;
    position: relative;
    overflow: hidden;
  }

  /* 背景粒子 */
  .spirit-particles {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  .particle {
    position: absolute;
    width: var(--size);
    height: var(--size);
    left: var(--x);
    background: radial-gradient(circle, rgba(8, 145, 178, 0.6) 0%, transparent 70%);
    border-radius: 50%;
    animation: float 8s ease-in-out infinite;
    animation-delay: var(--delay);
    opacity: 0;
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(100vh) scale(0);
      opacity: 0;
    }
    10% {
      opacity: 0.8;
    }
    90% {
      opacity: 0.8;
    }
    100% {
      transform: translateY(-20vh) scale(1);
      opacity: 0;
    }
  }

  /* 页面标题 */
  .page-header {
    position: relative;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 20px;
    background: linear-gradient(135deg, rgba(8, 145, 178, 0.15) 0%, rgba(6, 182, 212, 0.08) 100%);
    border: 1px solid rgba(8, 145, 178, 0.3);
    border-radius: 12px;
    margin-bottom: 20px;
    overflow: hidden;
    z-index: 1;
  }

  .header-glow {
    position: absolute;
    top: -50%;
    right: -20%;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(8, 145, 178, 0.3) 0%, transparent 70%);
    pointer-events: none;
  }

  .header-icon {
    position: relative;
    width: 52px;
    height: 52px;
    background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 4px 16px rgba(8, 145, 178, 0.4);
    flex-shrink: 0;
  }

  .icon-pulse {
    position: absolute;
    inset: -4px;
    border: 2px solid rgba(8, 145, 178, 0.4);
    border-radius: 16px;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.5;
    }
  }

  .header-text {
    flex: 1;
  }

  .header-text h1 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text-primary);
    background: linear-gradient(135deg, #0891b2, #22d3ee);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .header-text p {
    margin: 4px 0 0;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .refresh-btn {
    padding: 10px;
    background: rgba(8, 145, 178, 0.1);
    border: 1px solid rgba(8, 145, 178, 0.3);
    border-radius: 8px;
    color: #0891b2;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .refresh-btn:hover:not(:disabled) {
    background: rgba(8, 145, 178, 0.2);
  }

  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinning {
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

  /* 加载状态 */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 80px 20px;
    color: var(--text-muted);
  }

  .loading-container .spin {
    animation: spin 1s linear infinite;
    color: #0891b2;
  }

  /* 非成员提示 */
  .not-member {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 60px 20px;
    text-align: center;
    color: var(--text-muted);
  }

  .not-member h2 {
    margin: 0;
    font-size: 1.2rem;
    color: var(--text-primary);
  }

  .not-member p {
    margin: 0;
    font-size: 0.9rem;
  }

  .go-sect-btn {
    margin-top: 8px;
    padding: 10px 24px;
    background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
    border: none;
    border-radius: 6px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .go-sect-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(8, 145, 178, 0.4);
  }

  /* 状态卡片 */
  .status-cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 20px;
    position: relative;
    z-index: 1;
  }

  .status-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    transition: all 0.2s ease;
  }

  .status-card:hover {
    border-color: rgba(8, 145, 178, 0.3);
  }

  .status-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .beasts-icon {
    background: rgba(8, 145, 178, 0.15);
    color: #0891b2;
  }

  .deployed-icon {
    background: rgba(107, 114, 128, 0.15);
    color: #6b7280;
  }

  .deployed-icon.active {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }

  .search-icon {
    background: rgba(139, 92, 246, 0.15);
    color: #8b5cf6;
  }

  .raid-icon {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
  }

  .status-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .status-label {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .status-value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .status-value.no-beast {
    color: var(--text-muted);
  }

  /* Tab 样式 */
  .sect-tabs {
    margin-top: 10px;
    padding: 0 12px;
  }

  .sect-tabs :deep(.n-tabs-rail) {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 4px;
  }

  .sect-tabs :deep(.n-tabs-capsule) {
    background: rgba(201, 169, 89, 0.2);
    border-radius: 6px;
  }

  .sect-tabs :deep(.n-tabs-tab) {
    padding: 8px 12px;
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .sect-tabs :deep(.n-tabs-tab:hover) {
    color: var(--text-primary);
  }

  .sect-tabs :deep(.n-tabs-tab--active) {
    color: var(--color-gold) !important;
    font-weight: 600;
  }

  .tab-label {
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }

  .tab-content {
    padding: 16px 4px;
  }

  @media (max-width: 480px) {
    .status-cards {
      grid-template-columns: 1fr;
    }

    .tab-label span {
      display: none;
    }
  }
</style>
