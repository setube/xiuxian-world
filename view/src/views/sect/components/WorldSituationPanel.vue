<template>
  <div class="world-situation-panel">
    <!-- 标题 -->
    <div class="panel-header">
      <Globe :size="20" />
      <h2>天下大势</h2>
      <button class="refresh-btn" @click="handleRefresh" :disabled="loading">
        <RefreshCw :size="16" :class="{ spinning: loading }" />
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && !worldSituation" class="loading-state">
      <Loader2 :size="24" class="spinning" />
      <span>加载中...</span>
    </div>

    <template v-else-if="worldSituation">
      <!-- 最后更新时间 -->
      <div class="last-updated">
        <Clock :size="12" />
        <span>更新于 {{ formatTime(worldSituation.lastUpdated) }}</span>
      </div>

      <!-- 同盟关系 -->
      <div class="situation-section">
        <div class="section-header allied">
          <Handshake :size="16" />
          <span>同盟 ({{ worldSituation.alliances.length }})</span>
        </div>
        <div v-if="worldSituation.alliances.length > 0" class="situation-list">
          <div v-for="item in worldSituation.alliances" :key="`${item.sourceSectId}-${item.targetSectId}`" class="situation-item allied">
            <span class="sect-name">{{ item.sourceSectName }}</span>
            <Handshake :size="14" class="relation-icon" />
            <span class="sect-name">{{ item.targetSectName }}</span>
            <span class="created-at">{{ formatDate(item.createdAt) }}</span>
          </div>
        </div>
        <div v-else class="empty-state">
          <span>天下无盟</span>
        </div>
      </div>

      <!-- 敌对关系 -->
      <div class="situation-section">
        <div class="section-header hostile">
          <Swords :size="16" />
          <span>敌对 ({{ worldSituation.hostilities.length }})</span>
        </div>
        <div v-if="worldSituation.hostilities.length > 0" class="situation-list">
          <div v-for="item in worldSituation.hostilities" :key="`${item.sourceSectId}-${item.targetSectId}`" class="situation-item hostile">
            <span class="sect-name">{{ item.sourceSectName }}</span>
            <Swords :size="14" class="relation-icon" />
            <span class="sect-name">{{ item.targetSectName }}</span>
            <span class="created-at">{{ formatDate(item.createdAt) }}</span>
          </div>
        </div>
        <div v-else class="empty-state">
          <span>天下太平</span>
        </div>
      </div>

      <!-- 所有掌门 -->
      <div class="situation-section">
        <div class="section-header masters">
          <Crown :size="16" />
          <span>各派掌门</span>
        </div>
        <div class="masters-list">
          <div v-for="master in masters" :key="master.sectId" class="master-item" :class="{ 'no-master': !master.masterName }">
            <span class="master-sect">{{ master.sectName }}</span>
            <span class="master-name">{{ master.masterName || '空缺' }}</span>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <Globe :size="32" />
      <span>暂无数据</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useDiplomacyStore } from '@/stores/diplomacy'
  import { Globe, RefreshCw, Loader2, Clock, Handshake, Swords, Crown } from 'lucide-vue-next'

  const diplomacyStore = useDiplomacyStore()

  const loading = ref(false)
  const worldSituation = ref(diplomacyStore.worldSituation)
  const masters = ref(diplomacyStore.allMasters)

  const handleRefresh = async () => {
    loading.value = true
    try {
      await Promise.all([diplomacyStore.fetchWorldSituation(), diplomacyStore.fetchAllMasters()])
      worldSituation.value = diplomacyStore.worldSituation
      masters.value = diplomacyStore.allMasters
    } finally {
      loading.value = false
    }
  }

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)

    if (diffDays === 0) return '今日'
    if (diffDays === 1) return '昨日'
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  onMounted(async () => {
    loading.value = true
    try {
      await Promise.all([diplomacyStore.fetchWorldSituation(), diplomacyStore.fetchAllMasters()])
      worldSituation.value = diplomacyStore.worldSituation
      masters.value = diplomacyStore.allMasters
    } finally {
      loading.value = false
    }
  })
</script>

<style scoped>
  .world-situation-panel {
    padding: 16px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }

  .panel-header h2 {
    flex: 1;
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-primary);
  }

  .refresh-btn {
    padding: 6px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .refresh-btn:hover:not(:disabled) {
    border-color: var(--color-gold);
    color: var(--text-primary);
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

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px;
    color: var(--text-muted);
  }

  .last-updated {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-bottom: 16px;
  }

  /* 区块 */
  .situation-section {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-bottom: 12px;
    overflow: hidden;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .section-header.allied {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }

  .section-header.hostile {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .section-header.masters {
    background: rgba(201, 169, 89, 0.1);
    color: var(--color-gold);
  }

  .situation-list {
    padding: 10px 14px;
  }

  .situation-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 6px;
    margin-bottom: 6px;
  }

  .situation-item:last-child {
    margin-bottom: 0;
  }

  .situation-item.allied {
    background: rgba(59, 130, 246, 0.05);
  }

  .situation-item.hostile {
    background: rgba(239, 68, 68, 0.05);
  }

  .sect-name {
    font-weight: 500;
    color: var(--text-primary);
  }

  .relation-icon {
    flex-shrink: 0;
  }

  .situation-item.allied .relation-icon {
    color: #3b82f6;
  }

  .situation-item.hostile .relation-icon {
    color: #ef4444;
  }

  .created-at {
    margin-left: auto;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  /* 掌门列表 */
  .masters-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
    padding: 10px 14px;
  }

  .master-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 6px;
  }

  .master-item.no-master {
    opacity: 0.5;
  }

  .master-sect {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .master-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .master-item.no-master .master-name {
    color: var(--text-muted);
    font-style: italic;
  }
</style>
