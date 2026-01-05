<template>
  <div class="cave-dwelling-page">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <Loader :size="32" class="spinning" />
      <span>正在查看洞府...</span>
    </div>

    <!-- 未开辟洞府 -->
    <div v-else-if="!caveStore.hasCave" class="no-cave">
      <div class="no-cave-icon">
        <Mountain :size="64" />
      </div>
      <h2>尚未开辟洞府</h2>
      <p>开辟一处洞天福地，作为修炼栖身之所</p>

      <div v-if="canOpenInfo" class="open-requirements">
        <h3>开辟条件</h3>
        <div class="requirement-list">
          <div class="requirement-item" :class="{ met: canOpenInfo.canOpen }">
            <CheckCircle v-if="canOpenInfo.canOpen" :size="16" />
            <XCircle v-else :size="16" />
            <span>境界：筑基初期</span>
          </div>
          <div class="requirement-item">
            <Coins :size="16" />
            <span>500 灵石</span>
          </div>
          <div class="requirement-item">
            <Package :size="16" />
            <span>二阶妖丹 x5</span>
          </div>
        </div>

        <NButton type="primary" size="large" :disabled="!canOpenInfo.canOpen" :loading="caveStore.actionLoading" @click="handleOpenCave">
          <template #icon>
            <Mountain :size="18" />
          </template>
          开辟洞府
        </NButton>

        <p v-if="!canOpenInfo.canOpen" class="cannot-open-reason">
          {{ canOpenInfo.reason }}
        </p>
      </div>
    </div>

    <!-- 洞府主界面 -->
    <template v-else>
      <!-- 背景装饰粒子 -->
      <div class="cave-particles">
        <div v-for="i in 10" :key="i" class="particle" :style="{ '--delay': i * 0.6 + 's', '--x': Math.random() * 100 + '%' }" />
      </div>

      <!-- 顶部信息栏 -->
      <div class="cave-header">
        <div class="header-glow" />
        <div class="header-left">
          <div class="cave-icon-wrapper">
            <div class="icon-glow" />
            <Mountain :size="24" class="cave-icon" />
          </div>
          <div class="header-info">
            <h1>洞天福地</h1>
            <div class="header-meta">
              <span class="level-info">
                <Zap :size="12" />
                灵脉 Lv.{{ caveStore.spiritVein?.level }}
              </span>
              <span class="level-info">
                <Sparkles :size="12" />
                静室 Lv.{{ caveStore.meditationChamber?.level }}
              </span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <NButton v-if="caveStore.hasVisitor" type="warning" size="small" @click="activeTab = 'visitor'">
            <template #icon>
              <UserCheck :size="14" />
            </template>
            有访客
          </NButton>
        </div>
      </div>

      <!-- Tab 导航 -->
      <NTabs v-model:value="activeTab" type="segment" animated class="cave-tabs">
        <!-- 灵脉 Tab -->
        <NTabPane name="spirit">
          <template #tab>
            <div class="tab-label">
              <Zap :size="14" />
              <span>灵脉</span>
            </div>
          </template>
          <div class="tab-content">
            <SpiritVeinPanel />
          </div>
        </NTabPane>

        <!-- 静室 Tab -->
        <NTabPane name="meditation">
          <template #tab>
            <div class="tab-label">
              <Sparkles :size="14" />
              <span>静室</span>
            </div>
          </template>
          <div class="tab-content">
            <MeditationPanel />
          </div>
        </NTabPane>

        <!-- 万宝阁 Tab -->
        <NTabPane name="treasure">
          <template #tab>
            <div class="tab-label">
              <Crown :size="14" />
              <span>万宝阁</span>
            </div>
          </template>
          <div class="tab-content">
            <TreasurePanel />
          </div>
        </NTabPane>

        <!-- 洞天绘卷 Tab -->
        <NTabPane name="scenery">
          <template #tab>
            <div class="tab-label">
              <Image :size="14" />
              <span>绘卷</span>
            </div>
          </template>
          <div class="tab-content">
            <SceneryPanel />
          </div>
        </NTabPane>

        <!-- 访客 Tab -->
        <NTabPane name="visitor">
          <template #tab>
            <div class="tab-label">
              <Users :size="14" />
              <span>访客</span>
              <span v-if="caveStore.hasVisitor" class="tab-badge">!</span>
            </div>
          </template>
          <div class="tab-content">
            <VisitorPanel />
          </div>
        </NTabPane>

        <!-- 社交 Tab -->
        <NTabPane name="social">
          <template #tab>
            <div class="tab-label">
              <MessageSquare :size="14" />
              <span>社交</span>
              <span v-if="caveStore.unreadMessagesCount > 0" class="tab-badge">{{ caveStore.unreadMessagesCount }}</span>
            </div>
          </template>
          <div class="tab-content">
            <SocialPanel />
          </div>
        </NTabPane>

        <!-- 阵法 Tab -->
        <NTabPane name="formation">
          <template #tab>
            <div class="tab-label">
              <Shield :size="14" />
              <span>阵法</span>
            </div>
          </template>
          <div class="tab-content">
            <FormationPanel />
          </div>
        </NTabPane>
      </NTabs>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useCaveStore } from '@/stores/cave'
  import { NTabs, NTabPane, NButton, useMessage } from 'naive-ui'
  import {
    Mountain,
    Loader,
    Zap,
    Sparkles,
    Crown,
    Image,
    Users,
    MessageSquare,
    UserCheck,
    CheckCircle,
    XCircle,
    Coins,
    Package,
    Shield
  } from 'lucide-vue-next'
  import SpiritVeinPanel from './components/SpiritVeinPanel.vue'
  import MeditationPanel from './components/MeditationPanel.vue'
  import TreasurePanel from './components/TreasurePanel.vue'
  import SceneryPanel from './components/SceneryPanel.vue'
  import VisitorPanel from './components/VisitorPanel.vue'
  import SocialPanel from './components/SocialPanel.vue'
  import FormationPanel from './components/FormationPanel.vue'

  const caveStore = useCaveStore()
  const message = useMessage()

  const loading = ref(true)
  const activeTab = ref('spirit')
  const canOpenInfo = ref<{ canOpen: boolean; reason?: string } | null>(null)

  // 开辟洞府
  const handleOpenCave = async () => {
    try {
      await caveStore.openCave()
      message.success('洞府开辟成功！')
    } catch (error) {
      message.error((error as Error).message || '开辟失败')
    }
  }

  // 初始化
  onMounted(async () => {
    try {
      await caveStore.initialize()
      if (!caveStore.hasCave) {
        canOpenInfo.value = await caveStore.checkCanOpen()
      }
    } finally {
      loading.value = false
    }
  })
</script>

<style scoped>
  .cave-dwelling-page {
    padding-bottom: 100px;
    position: relative;
    overflow: hidden;
  }

  /* ========== 装饰粒子效果 ========== */
  .cave-particles {
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
    width: 6px;
    height: 6px;
    background: radial-gradient(circle, rgba(138, 109, 183, 0.6) 0%, transparent 70%);
    border-radius: 50%;
    left: var(--x);
    animation: floatParticle 10s ease-in-out infinite;
    animation-delay: var(--delay);
    opacity: 0;
  }

  @keyframes floatParticle {
    0% {
      transform: translateY(100vh) rotate(0deg);
      opacity: 0;
    }
    10% {
      opacity: 0.7;
    }
    90% {
      opacity: 0.7;
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

  /* 未开辟洞府 */
  .no-cave {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    padding: 40px 20px;
  }

  .no-cave-icon {
    width: 120px;
    height: 120px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
    color: var(--text-muted);
  }

  .no-cave h2 {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0 0 8px;
    color: var(--text-primary);
  }

  .no-cave > p {
    color: var(--text-muted);
    margin: 0 0 24px;
  }

  .open-requirements {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;
    width: 100%;
    max-width: 320px;
  }

  .open-requirements h3 {
    font-size: 1rem;
    margin: 0 0 16px;
    color: var(--text-primary);
  }

  .requirement-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .requirement-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .requirement-item.met {
    color: #52c41a;
  }

  .requirement-item svg {
    flex-shrink: 0;
  }

  .cannot-open-reason {
    margin-top: 12px;
    font-size: 0.85rem;
    color: #f5222d;
  }

  /* 顶部信息栏 */
  .cave-header {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: linear-gradient(135deg, rgba(138, 109, 183, 0.15) 0%, rgba(138, 109, 183, 0.05) 50%, transparent 100%);
    border-bottom: 1px solid rgba(138, 109, 183, 0.2);
    overflow: hidden;
    z-index: 1;
  }

  .header-glow {
    position: absolute;
    top: -50%;
    left: -10%;
    width: 120%;
    height: 200%;
    background: radial-gradient(ellipse at center, rgba(138, 109, 183, 0.1) 0%, transparent 60%);
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

  .cave-icon-wrapper {
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
    background: radial-gradient(circle, rgba(138, 109, 183, 0.4) 0%, transparent 70%);
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

  .cave-icon {
    color: #8a6db7;
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 0 4px rgba(138, 109, 183, 0.5));
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

  .level-info {
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
  .cave-tabs {
    margin-top: 10px;
    padding: 0 12px;
  }

  .cave-tabs :deep(.n-tabs-rail) {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 4px;
  }

  .cave-tabs :deep(.n-tabs-capsule) {
    background: rgba(138, 109, 183, 0.2);
    border-radius: 6px;
  }

  .cave-tabs :deep(.n-tabs-tab) {
    padding: 8px 10px;
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .cave-tabs :deep(.n-tabs-tab:hover) {
    color: var(--text-primary);
  }

  .cave-tabs :deep(.n-tabs-tab--active) {
    color: #8a6db7 !important;
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
    background: #f5222d;
    border-radius: 8px;
    font-size: 0.7rem;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
  }

  .tab-content {
    padding: 16px 4px;
  }
</style>
