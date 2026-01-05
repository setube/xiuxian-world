<template>
  <div class="enemy-list-panel">
    <div class="panel-header">
      <div class="header-left">
        <Skull :size="18" />
        <span>仇敌名录</span>
      </div>
      <div class="header-right">
        <span class="kill-count">
          <Flame :size="14" />
          杀戮值: {{ killCount }}
        </span>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <n-spin size="small" />
      <span>加载中...</span>
    </div>

    <div v-else-if="enemies.length === 0" class="empty-state">
      <Feather :size="32" class="empty-icon" />
      <span>暂无仇敌</span>
      <p class="empty-tip">被击杀时，对方将被记入仇敌名录</p>
    </div>

    <div v-else class="enemy-list">
      <div v-for="enemy in enemies" :key="enemy.oderId" class="enemy-item">
        <div class="enemy-info">
          <div class="enemy-name">{{ enemy.killerName }}</div>
          <div class="enemy-meta">
            <span class="kill-time">{{ formatTime(enemy.killedAt) }}</span>
            <span class="kill-times">击杀 {{ enemy.killCount }} 次</span>
          </div>
        </div>
        <div class="enemy-bonus">
          <Swords :size="14" />
          <span>+5%</span>
        </div>
      </div>
    </div>

    <div class="panel-footer">
      <p class="bonus-tip">
        <Zap :size="14" />
        对仇敌斗法时，战力+5%
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { Skull, Flame, Feather, Swords, Zap } from 'lucide-vue-next'
  import { usePlayerStore } from '@/stores/player'

  const playerStore = usePlayerStore()
  const loading = ref(false)

  // 获取仇敌列表
  const enemies = computed(() => {
    return playerStore.soulStatus?.enemies || []
  })

  // 获取杀戮值
  const killCount = computed(() => {
    return playerStore.soulStatus?.killCount || 0
  })

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = Date.now()
    const diff = now - timestamp

    // 1小时内
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000))
      return minutes <= 0 ? '刚刚' : `${minutes}分钟前`
    }

    // 24小时内
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000))
      return `${hours}小时前`
    }

    // 超过24小时
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    })
  }

  onMounted(async () => {
    if (!playerStore.soulStatus) {
      loading.value = true
      await playerStore.fetchSoulStatus()
      loading.value = false
    }
  })
</script>

<style scoped>
  .enemy-list-panel {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border-color);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .header-left svg {
    color: #ef4444;
  }

  .header-right {
    display: flex;
    align-items: center;
  }

  .kill-count {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 4px;
    font-size: 0.8rem;
    color: #ef4444;
    font-weight: 600;
  }

  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 32px;
    color: var(--text-secondary);
  }

  .empty-icon {
    opacity: 0.3;
  }

  .empty-tip {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin: 0;
  }

  .enemy-list {
    max-height: 300px;
    overflow-y: auto;
  }

  .enemy-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border-color);
    transition: background 0.2s ease;
  }

  .enemy-item:last-child {
    border-bottom: none;
  }

  .enemy-item:hover {
    background: rgba(239, 68, 68, 0.05);
  }

  .enemy-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .enemy-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .enemy-meta {
    display: flex;
    gap: 8px;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .kill-times {
    color: #ef4444;
  }

  .enemy-bonus {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: rgba(74, 222, 128, 0.1);
    border-radius: 4px;
    font-size: 0.8rem;
    color: #4ade80;
    font-weight: 600;
  }

  .panel-footer {
    padding: 10px 14px;
    border-top: 1px solid var(--border-color);
    background: rgba(0, 0, 0, 0.1);
  }

  .bonus-tip {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .bonus-tip svg {
    color: var(--color-gold);
  }
</style>
