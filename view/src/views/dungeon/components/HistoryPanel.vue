<template>
  <div class="history-panel">
    <div class="panel-header">
      <h3>
        <ScrollText :size="16" />
        副本记录
      </h3>
      <NButton quaternary size="small" :loading="loading" @click="handleRefresh">
        <template #icon>
          <RefreshCw :size="14" :class="{ spinning: loading }" />
        </template>
        刷新
      </NButton>
    </div>

    <!-- 统计信息 -->
    <div class="stats-row">
      <div class="stat-item">
        <Hexagon :size="16" />
        <span>虚天鼎残片: {{ dungeonStore.status?.xutianDingFragments || 0 }}/100</span>
      </div>
      <div class="stat-item">
        <Map :size="16" />
        <span>虚天残图: {{ dungeonStore.status?.xutianMapCount || 0 }}</span>
      </div>
    </div>

    <!-- 历史列表 -->
    <div v-if="loading && dungeonStore.history.length === 0" class="loading-state">
      <Loader :size="24" class="spinning" />
      <span>加载中...</span>
    </div>

    <div v-else-if="dungeonStore.history.length === 0" class="empty-state">
      <Ghost :size="48" />
      <p>暂无副本记录</p>
      <span>完成副本挑战后记录将显示在这里</span>
    </div>

    <div v-else class="history-list">
      <div v-for="record in dungeonStore.history" :key="record.id" class="history-card" :class="record.result">
        <div class="card-header">
          <div class="card-title">
            <Swords :size="14" />
            <span>{{ record.dungeonName || '虚天殿·降魔' }}</span>
          </div>
          <span class="card-result" :class="record.result">
            {{ record.result === 'success' ? '通关' : '失败' }}
          </span>
        </div>

        <div class="card-details">
          <span v-if="record.result === 'failed'" class="failed-stage">
            <X :size="12" />
            止步第{{ record.failedAtStage }}关
          </span>
          <span class="card-time">
            <Clock :size="12" />
            {{ formatTime(record.clearedAt) }}
          </span>
        </div>

        <div v-if="record.rewards" class="card-rewards">
          <span v-if="record.rewards.exp">
            <Sparkles :size="12" />
            +{{ formatNumber(record.rewards.exp) }} 修为
          </span>
          <span v-if="record.rewards.sectContribution">
            <Award :size="12" />
            +{{ record.rewards.sectContribution }} 贡献
          </span>
          <span v-if="record.rewards.xutianDingFragment" class="legendary">
            <Hexagon :size="12" />
            虚天鼎残片
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useDungeonStore } from '@/stores/dungeon'
  import { NButton } from 'naive-ui'
  import { ScrollText, RefreshCw, Ghost, Swords, X, Clock, Sparkles, Award, Hexagon, Loader, Map } from 'lucide-vue-next'

  const dungeonStore = useDungeonStore()

  const loading = ref(false)

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万'
    }
    return num.toLocaleString()
  }

  // 格式化时间
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) {
      return '刚刚'
    } else if (diff < 3600000) {
      return Math.floor(diff / 60000) + '分钟前'
    } else if (diff < 86400000) {
      return Math.floor(diff / 3600000) + '小时前'
    } else if (diff < 604800000) {
      return Math.floor(diff / 86400000) + '天前'
    } else {
      return date.toLocaleDateString()
    }
  }

  // 刷新
  const handleRefresh = async () => {
    loading.value = true
    try {
      await dungeonStore.fetchHistory(20)
    } finally {
      loading.value = false
    }
  }

  onMounted(async () => {
    loading.value = true
    try {
      await dungeonStore.fetchHistory(20)
    } finally {
      loading.value = false
    }
  })
</script>

<style scoped>
  .history-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .panel-header h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
    color: var(--text-primary);
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

  /* 统计信息 */
  .stats-row {
    display: flex;
    gap: 16px;
    padding: 12px 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  /* 加载状态 */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 150px;
    gap: 12px;
    color: var(--text-muted);
  }

  /* 空状态 */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    color: var(--text-muted);
  }

  .empty-state p {
    margin: 16px 0 4px;
    font-size: 0.95rem;
  }

  .empty-state span {
    font-size: 0.8rem;
    opacity: 0.7;
  }

  /* 历史列表 */
  .history-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .history-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px;
    transition: all 0.2s;
  }

  .history-card.success {
    border-left: 3px solid #52c41a;
  }

  .history-card.failed {
    border-left: 3px solid #f5222d;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .card-result {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .card-result.success {
    background: #52c41a20;
    color: #52c41a;
  }

  .card-result.failed {
    background: #f5222d20;
    color: #f5222d;
  }

  .card-details {
    display: flex;
    gap: 16px;
    margin-bottom: 8px;
  }

  .card-details span {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .failed-stage {
    color: #f5222d !important;
  }

  .card-rewards {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding-top: 8px;
    border-top: 1px solid var(--border-color);
  }

  .card-rewards span {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .card-rewards .legendary {
    color: #faad14;
    font-weight: 600;
  }
</style>
