<template>
  <div class="dungeon-page">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <Loader :size="32" class="spinning" />
      <span>正在加载副本信息...</span>
    </div>

    <template v-else>
      <!-- 背景装饰 -->
      <div class="dungeon-particles">
        <div v-for="i in 8" :key="i" class="particle" :style="{ '--delay': i * 0.8 + 's', '--x': Math.random() * 100 + '%' }" />
      </div>

      <!-- 顶部信息栏 -->
      <div class="dungeon-header">
        <div class="header-glow" />
        <div class="header-left">
          <div class="dungeon-icon-wrapper">
            <div class="icon-glow" />
            <Swords :size="24" class="dungeon-icon" />
          </div>
          <div class="header-info">
            <h1>虚天殿</h1>
            <div class="header-meta">
              <span class="meta-item">
                <Map :size="12" />
                虚天残图 x{{ dungeonStore.status?.xutianMapCount || 0 }}
              </span>
              <span class="meta-item">
                <Hexagon :size="12" />
                虚天鼎残片 x{{ dungeonStore.status?.xutianDingFragments || 0 }}
              </span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <NButton v-if="dungeonStore.status?.hasFirstClearThisWeek" type="success" size="small" disabled>
            <template #icon>
              <Check :size="14" />
            </template>
            本周已首通
          </NButton>
        </div>
      </div>

      <!-- Tab 导航 -->
      <NTabs v-model:value="activeTab" type="segment" animated class="dungeon-tabs">
        <!-- 副本大厅 Tab -->
        <NTabPane name="lobby">
          <template #tab>
            <div class="tab-label">
              <Users :size="14" />
              <span>大厅</span>
              <span v-if="dungeonStore.rooms.length > 0" class="tab-badge">{{ dungeonStore.rooms.length }}</span>
            </div>
          </template>
          <div class="tab-content">
            <RoomListPanel @join="handleJoinRoom" @create="handleCreateRoom" />
          </div>
        </NTabPane>

        <!-- 当前房间 Tab -->
        <NTabPane name="room" :disabled="!dungeonStore.isInRoom">
          <template #tab>
            <div class="tab-label">
              <Castle :size="14" />
              <span>房间</span>
              <span v-if="dungeonStore.isInRoom" class="tab-badge active">!</span>
            </div>
          </template>
          <div class="tab-content">
            <RoomDetailPanel />
          </div>
        </NTabPane>

        <!-- 历史记录 Tab -->
        <NTabPane name="history">
          <template #tab>
            <div class="tab-label">
              <ScrollText :size="14" />
              <span>记录</span>
            </div>
          </template>
          <div class="tab-content">
            <HistoryPanel />
          </div>
        </NTabPane>
      </NTabs>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, watch } from 'vue'
  import { useDungeonStore } from '@/stores/dungeon'
  import { NTabs, NTabPane, NButton, useMessage } from 'naive-ui'
  import { Loader, Swords, Map, Hexagon, Users, Castle, ScrollText, Check } from 'lucide-vue-next'
  import RoomListPanel from './components/RoomListPanel.vue'
  import RoomDetailPanel from './components/RoomDetailPanel.vue'
  import HistoryPanel from './components/HistoryPanel.vue'

  const dungeonStore = useDungeonStore()
  const message = useMessage()

  const loading = ref(true)
  const activeTab = ref('lobby')

  // 加入房间
  const handleJoinRoom = async (roomId: string) => {
    try {
      await dungeonStore.joinRoom(roomId)
      message.success('加入房间成功')
      activeTab.value = 'room'
    } catch (error) {
      message.error((error as Error).message || '加入失败')
    }
  }

  // 创建房间
  const handleCreateRoom = async () => {
    try {
      await dungeonStore.createRoom()
      message.success('房间创建成功')
      activeTab.value = 'room'
    } catch (error) {
      message.error((error as Error).message || '创建失败')
    }
  }

  // 监听房间状态，自动切换tab
  watch(
    () => dungeonStore.isInRoom,
    isInRoom => {
      if (isInRoom && activeTab.value === 'lobby') {
        activeTab.value = 'room'
      } else if (!isInRoom && activeTab.value === 'room') {
        activeTab.value = 'lobby'
      }
    }
  )

  // 初始化
  onMounted(async () => {
    try {
      await dungeonStore.initialize()
      // 如果已经在房间中，自动切换到房间tab
      if (dungeonStore.isInRoom) {
        activeTab.value = 'room'
      }
    } finally {
      loading.value = false
    }
  })
</script>

<style scoped>
  .dungeon-page {
    padding-bottom: 100px;
    position: relative;
    overflow: hidden;
  }

  /* 装饰粒子效果 */
  .dungeon-particles {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }

  .particle {
    position: absolute;
    width: 8px;
    height: 8px;
    background: radial-gradient(circle, rgba(220, 38, 38, 0.5) 0%, transparent 70%);
    border-radius: 50%;
    left: var(--x);
    animation: floatParticle 12s ease-in-out infinite;
    animation-delay: var(--delay);
    opacity: 0;
  }

  @keyframes floatParticle {
    0% {
      transform: translateY(100vh) rotate(0deg);
      opacity: 0;
    }
    10% {
      opacity: 0.6;
    }
    90% {
      opacity: 0.6;
    }
    100% {
      transform: translateY(-20vh) rotate(360deg);
      opacity: 0;
    }
  }

  /* 加载状态 */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 16px;
    color: var(--text-muted);
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

  /* 顶部信息栏 */
  .dungeon-header {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(220, 38, 38, 0.05) 50%, transparent 100%);
    border-bottom: 1px solid rgba(220, 38, 38, 0.2);
    overflow: hidden;
    z-index: 1;
  }

  .header-glow {
    position: absolute;
    top: -50%;
    left: -10%;
    width: 120%;
    height: 200%;
    background: radial-gradient(ellipse at center, rgba(220, 38, 38, 0.1) 0%, transparent 60%);
    animation: headerGlow 4s ease-in-out infinite alternate;
    pointer-events: none;
  }

  @keyframes headerGlow {
    0% {
      opacity: 0.5;
      transform: translateX(-5%);
    }
    100% {
      opacity: 1;
      transform: translateX(5%);
    }
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
    z-index: 1;
  }

  .dungeon-icon-wrapper {
    position: relative;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-glow {
    position: absolute;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(220, 38, 38, 0.4) 0%, transparent 70%);
    border-radius: 50%;
    animation: iconPulse 2s ease-in-out infinite;
  }

  @keyframes iconPulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.6;
    }
    50% {
      transform: scale(1.3);
      opacity: 0.3;
    }
  }

  .dungeon-icon {
    color: #dc2626;
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 0 4px rgba(220, 38, 38, 0.5));
  }

  .header-info h1 {
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0 0 4px;
    color: var(--text-primary);
  }

  .header-meta {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .header-actions {
    display: flex;
    gap: 8px;
    position: relative;
    z-index: 1;
  }

  /* Tab 样式 */
  .dungeon-tabs {
    margin-top: 10px;
    padding: 0 12px;
  }

  .dungeon-tabs :deep(.n-tabs-rail) {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 4px;
  }

  .dungeon-tabs :deep(.n-tabs-capsule) {
    background: rgba(220, 38, 38, 0.2);
    border-radius: 6px;
  }

  .dungeon-tabs :deep(.n-tabs-tab) {
    padding: 8px 12px;
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .dungeon-tabs :deep(.n-tabs-tab:hover) {
    color: var(--text-primary);
  }

  .dungeon-tabs :deep(.n-tabs-tab--active) {
    color: #dc2626 !important;
    font-weight: 600;
  }

  .tab-label {
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    position: relative;
  }

  .tab-badge {
    position: absolute;
    top: -6px;
    right: -10px;
    min-width: 16px;
    height: 16px;
    background: #666;
    border-radius: 8px;
    font-size: 0.7rem;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
  }

  .tab-badge.active {
    background: #dc2626;
    animation: badgePulse 1s ease-in-out infinite;
  }

  @keyframes badgePulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  .tab-content {
    padding: 16px 4px;
  }
</style>
