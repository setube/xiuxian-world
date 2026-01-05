<template>
  <div class="visitor-panel">
    <!-- 当前访客 -->
    <div v-if="caveStore.hasVisitor" class="current-visitor">
      <div class="visitor-header">
        <div class="visitor-icon">
          <UserCheck :size="24" class="pulse" />
        </div>
        <div class="visitor-info">
          <h3>{{ currentVisitor?.name }}</h3>
          <p>{{ currentVisitor?.description }}</p>
        </div>
      </div>

      <!-- 倒计时 -->
      <div class="visitor-countdown">
        <Clock :size="16" />
        <span>剩余时间：{{ formatTime(currentVisitor?.remainingSeconds || 0) }}</span>
      </div>

      <!-- 操作按钮 -->
      <div class="visitor-actions">
        <NButton type="primary" :loading="caveStore.actionLoading" @click="handleReceive">
          <template #icon>
            <UserPlus :size="16" />
          </template>
          接待访客
        </NButton>
        <NButton type="error" :loading="caveStore.actionLoading" @click="handleExpel">
          <template #icon>
            <UserX :size="16" />
          </template>
          驱逐访客
        </NButton>
      </div>
    </div>

    <!-- 无访客 -->
    <div v-else class="no-visitor">
      <div class="no-visitor-icon">
        <Users :size="48" />
      </div>
      <h3>暂无访客</h3>
      <p>访客会不定时造访你的洞府</p>
    </div>

    <!-- 访客记录 -->
    <div class="visitor-logs">
      <h4 class="section-title">
        <History :size="16" />
        访客记录
      </h4>
      <div v-if="loadingLogs" class="loading-logs">
        <Loader :size="20" class="spinning" />
      </div>
      <div v-else-if="visitorLogs.length === 0" class="no-logs">暂无访客记录</div>
      <div v-else class="logs-list">
        <div v-for="log in visitorLogs" :key="log.id" class="log-item">
          <div class="log-icon" :class="log.action">
            <UserCheck v-if="log.action === 'received'" :size="16" />
            <UserX v-else-if="log.action === 'expelled'" :size="16" />
            <Clock v-else :size="16" />
          </div>
          <div class="log-info">
            <span class="log-name">{{ log.visitorName }}</span>
            <span class="log-action">{{ getActionText(log.action) }}</span>
            <span v-if="log.result?.description" class="log-result">{{ log.result.description }}</span>
          </div>
          <span class="log-time">{{ formatDate(log.visitedAt) }}</span>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="visitorLogsTotal > 20" class="pagination">
        <NButton size="small" :disabled="currentPage <= 1" @click="loadLogs(currentPage - 1)">上一页</NButton>
        <span class="page-info">{{ currentPage }} / {{ Math.ceil(visitorLogsTotal / 20) }}</span>
        <NButton size="small" :disabled="currentPage >= Math.ceil(visitorLogsTotal / 20)" @click="loadLogs(currentPage + 1)">
          下一页
        </NButton>
      </div>
    </div>

    <!-- 访客结果弹窗 -->
    <NModal v-model:show="showResultModal" preset="card" style="width: 90%; max-width: 400px">
      <template #header>
        <div class="modal-header">
          <Sparkles :size="18" />
          <span>访客结果</span>
        </div>
      </template>
      <div class="result-content">
        <p class="result-desc">{{ visitorResult?.description }}</p>
        <div v-if="visitorResult?.rewards" class="result-rewards">
          <h4>获得奖励：</h4>
          <div class="rewards-list">
            <span v-if="visitorResult.rewards.spiritStones" class="reward-item">
              <Coins :size="14" />
              {{ visitorResult.rewards.spiritStones }} 灵石
            </span>
            <span v-if="visitorResult.rewards.exp" class="reward-item">
              <TrendingUp :size="14" />
              {{ visitorResult.rewards.exp }} 修为
            </span>
            <span v-for="item in visitorResult.rewards.items" :key="item.itemId" class="reward-item">
              <Package :size="14" />
              {{ item.itemName }} x{{ item.quantity }}
            </span>
          </div>
        </div>
        <div v-if="visitorResult?.penalties?.debuff" class="result-penalty">
          <AlertTriangle :size="16" />
          <span>获得负面效果</span>
        </div>
      </div>
    </NModal>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useCaveStore, type VisitorResult } from '@/stores/cave'
  import { NButton, NModal, useMessage } from 'naive-ui'
  import {
    Users,
    UserCheck,
    UserPlus,
    UserX,
    Clock,
    History,
    Loader,
    Sparkles,
    Coins,
    TrendingUp,
    Package,
    AlertTriangle
  } from 'lucide-vue-next'

  const caveStore = useCaveStore()
  const message = useMessage()

  const loadingLogs = ref(false)
  const currentPage = ref(1)
  const showResultModal = ref(false)
  const visitorResult = ref<VisitorResult | null>(null)

  const currentVisitor = computed(() => caveStore.currentVisitor)
  const visitorLogs = computed(() => caveStore.visitorLogs)
  const visitorLogsTotal = computed(() => caveStore.visitorLogsTotal)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  const getActionText = (action: string) => {
    switch (action) {
      case 'received':
        return '已接待'
      case 'expelled':
        return '已驱逐'
      case 'expired':
        return '已离去'
      default:
        return action
    }
  }

  const loadLogs = async (page: number) => {
    loadingLogs.value = true
    currentPage.value = page
    try {
      await caveStore.fetchVisitorLogs(page)
    } finally {
      loadingLogs.value = false
    }
  }

  const handleReceive = async () => {
    try {
      const result = await caveStore.receiveVisitor()
      visitorResult.value = result
      showResultModal.value = true
      loadLogs(1)
    } catch (error) {
      message.error((error as Error).message || '接待失败')
    }
  }

  const handleExpel = async () => {
    try {
      const result = await caveStore.expelVisitor()
      visitorResult.value = result
      showResultModal.value = true
      loadLogs(1)
    } catch (error) {
      message.error((error as Error).message || '驱逐失败')
    }
  }

  onMounted(() => {
    loadLogs(1)
  })
</script>

<style scoped>
  .visitor-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .current-visitor {
    background: var(--bg-card);
    border: 1px solid rgba(250, 173, 20, 0.3);
    border-radius: 12px;
    padding: 20px;
    animation: visitorGlow 2s ease-in-out infinite;
  }

  @keyframes visitorGlow {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(250, 173, 20, 0.2);
    }
    50% {
      box-shadow: 0 0 20px 4px rgba(250, 173, 20, 0.15);
    }
  }

  .visitor-header {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 16px;
  }

  .visitor-icon {
    width: 52px;
    height: 52px;
    background: rgba(250, 173, 20, 0.15);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #faad14;
  }

  .pulse {
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  .visitor-info h3 {
    margin: 0 0 6px;
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  .visitor-info p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .visitor-countdown {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: rgba(250, 173, 20, 0.1);
    border-radius: 8px;
    margin-bottom: 16px;
    color: #faad14;
    font-size: 0.9rem;
  }

  .visitor-actions {
    display: flex;
    gap: 12px;
  }

  .visitor-actions .n-button {
    flex: 1;
  }

  .no-visitor {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    text-align: center;
  }

  .no-visitor-icon {
    width: 80px;
    height: 80px;
    background: var(--bg-secondary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    color: var(--text-muted);
  }

  .no-visitor h3 {
    margin: 0 0 8px;
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  .no-visitor p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .visitor-logs {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 16px;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 16px;
    font-size: 0.95rem;
    color: var(--text-primary);
  }

  .loading-logs,
  .no-logs {
    text-align: center;
    padding: 24px;
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

  .logs-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .log-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 8px;
  }

  .log-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .log-icon.received {
    background: rgba(82, 196, 26, 0.15);
    color: #52c41a;
  }

  .log-icon.expelled {
    background: rgba(245, 34, 45, 0.15);
    color: #f5222d;
  }

  .log-icon.expired {
    background: var(--bg-secondary);
    color: var(--text-muted);
  }

  .log-info {
    flex: 1;
    min-width: 0;
  }

  .log-name {
    display: block;
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  .log-action {
    display: block;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .log-result {
    display: block;
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-top: 4px;
  }

  .log-time {
    font-size: 0.75rem;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 16px;
  }

  .page-info {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  /* 结果弹窗 */
  .modal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #8a6db7;
  }

  .result-content {
    text-align: center;
  }

  .result-desc {
    font-size: 0.95rem;
    color: var(--text-primary);
    margin: 0 0 16px;
    line-height: 1.5;
  }

  .result-rewards {
    text-align: left;
    padding: 16px;
    background: rgba(82, 196, 26, 0.1);
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .result-rewards h4 {
    margin: 0 0 12px;
    font-size: 0.9rem;
    color: #52c41a;
  }

  .rewards-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .reward-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: var(--color-gold);
  }

  .result-penalty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: rgba(245, 34, 45, 0.1);
    border-radius: 8px;
    color: #f5222d;
    font-size: 0.85rem;
  }
</style>
