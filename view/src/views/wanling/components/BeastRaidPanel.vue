<template>
  <div class="beast-raid-panel">
    <n-space vertical :size="16">
      <!-- 偷菜状态 -->
      <n-card size="small">
        <div class="raid-status">
          <div class="status-item">
            <span class="status-label">今日偷菜次数</span>
            <span class="status-value">{{ raidStatus?.dailyRaids || 0 }} / {{ raidStatus?.maxDailyRaids || 5 }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">出战灵兽</span>
            <span class="status-value" :class="{ 'text-warning': !deployedBeast }">
              {{ deployedBeast ? getBeastDisplayName(deployedBeast) : '无' }}
            </span>
          </div>
          <div v-if="cooldownRemaining > 0" class="status-item">
            <span class="status-label">冷却中</span>
            <span class="status-value countdown">{{ formatCooldown(cooldownRemaining) }}</span>
          </div>
        </div>
      </n-card>

      <!-- 无出战灵兽提示 -->
      <n-alert v-if="!deployedBeast" type="warning" title="请先派出灵兽出战">
        需要有出战的灵兽才能进行偷菜，请前往"我的灵兽"页面派遣灵兽出战
      </n-alert>

      <!-- 目标选择 -->
      <template v-else>
        <n-card size="small" title="选择目标药园">
          <template #header-extra>
            <n-button text size="small" @click="refreshTargets" :loading="loadingTargets">刷新目标</n-button>
          </template>

          <n-empty v-if="raidTargets.length === 0 && !loadingTargets" description="暂无可偷菜的目标" />

          <n-spin v-else-if="loadingTargets" size="small" />

          <n-list v-else hoverable clickable>
            <n-list-item v-for="target in raidTargets" :key="target.id" @click="selectTarget(target)">
              <div class="target-item" :class="{ selected: selectedTarget?.id === target.id }">
                <div class="target-info">
                  <span class="target-name">{{ target.name }}</span>
                  <n-tag size="small" type="info">{{ target.realmName }}</n-tag>
                </div>
                <n-button
                  v-if="selectedTarget?.id === target.id"
                  type="primary"
                  size="small"
                  :loading="loading"
                  :disabled="!canRaid"
                  @click.stop="handleRaid"
                >
                  偷菜
                </n-button>
              </div>
            </n-list-item>
          </n-list>
        </n-card>

        <!-- 偷菜结果 -->
        <n-card v-if="raidResult" size="small" :title="raidResult.success ? '偷菜成功！' : '偷菜失败'">
          <div class="raid-result">
            <div class="result-message">{{ raidResult.message }}</div>
            <template v-if="raidResult.rewards.length > 0">
              <n-divider />
              <div class="result-rewards">
                <span class="rewards-label">获得:</span>
                <n-tag v-for="(reward, index) in raidResult.rewards" :key="index" type="success" size="small">
                  {{ reward.itemName }} x{{ reward.count }}
                </n-tag>
              </div>
            </template>
            <div v-if="raidResult.beastInjured" class="result-injury">
              <n-tag type="error" size="small">灵兽受伤</n-tag>
              灵兽在偷菜过程中受伤，需要休息恢复
            </div>
          </div>
        </n-card>

        <!-- 偷菜历史 -->
        <n-card size="small" title="偷菜记录">
          <template #header-extra>
            <n-button text size="small" @click="loadHistory" :loading="loadingHistory">刷新记录</n-button>
          </template>

          <n-empty v-if="raidHistory.length === 0 && !loadingHistory" description="暂无偷菜记录" />

          <n-spin v-else-if="loadingHistory" size="small" />

          <n-list v-else>
            <n-list-item v-for="record in raidHistory" :key="record.id">
              <div class="history-item">
                <div class="history-info">
                  <span class="history-beast">{{ record.beastName }}</span>
                  <span class="history-arrow">→</span>
                  <span class="history-target">{{ record.targetName }}</span>
                  <n-tag :type="record.success ? 'success' : 'error'" size="small">
                    {{ record.success ? '成功' : '失败' }}
                  </n-tag>
                </div>
                <div class="history-rewards" v-if="record.rewards.length > 0">
                  获得: {{ record.rewards.map(r => `${r.itemName}x${r.count}`).join(', ') }}
                </div>
                <div class="history-time">
                  {{ formatTime(record.createdAt) }}
                </div>
              </div>
            </n-list-item>
          </n-list>
        </n-card>
      </template>

      <!-- 偷菜说明 -->
      <n-card size="small" title="偷菜说明">
        <n-list>
          <n-list-item>派遣出战的灵兽潜入黄枫谷弟子的药园，有机会窃取灵草</n-list-item>
          <n-list-item>灵兽速度越高，偷菜成功率越高</n-list-item>
          <n-list-item>偷菜失败时灵兽会受伤，需要休息恢复</n-list-item>
          <n-list-item>即使失败也会获得保底奖励，不会空手而归</n-list-item>
        </n-list>
      </n-card>
    </n-space>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useWanlingStore, type RaidTarget, type RaidResult } from '@/stores/wanling'
  import { extractErrorMessage } from '@/api'
  import { useMessage } from 'naive-ui'

  const message = useMessage()
  const wanlingStore = useWanlingStore()
  const { deployedBeast, raidStatus, raidTargets, raidHistory, loading } = storeToRefs(wanlingStore)

  const selectedTarget = ref<RaidTarget | null>(null)
  const raidResult = ref<RaidResult | null>(null)
  const cooldownRemaining = ref(0)
  const loadingTargets = ref(false)
  const loadingHistory = ref(false)
  let cooldownTimer: ReturnType<typeof setInterval> | null = null

  // 是否可以偷菜
  const canRaid = computed(() => {
    return wanlingStore.canRaid && selectedTarget.value !== null
  })

  // 获取灵兽显示名
  const getBeastDisplayName = (beast: typeof deployedBeast.value) => {
    if (!beast) return ''
    return beast.customName || beast.name
  }

  // 格式化冷却时间
  const formatCooldown = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    if (hours > 0) {
      return `${hours}时${minutes}分${seconds}秒`
    }
    if (minutes > 0) {
      return `${minutes}分${seconds}秒`
    }
    return `${seconds}秒`
  }

  // 格式化时间
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr)
    return date.toLocaleString()
  }

  // 更新冷却时间
  const updateCooldown = () => {
    if (raidStatus.value?.cooldownMs) {
      cooldownRemaining.value = Math.max(0, raidStatus.value.cooldownMs - (Date.now() - wanlingStore.lastRefresh))
    } else {
      cooldownRemaining.value = 0
    }
  }

  // 刷新目标列表
  const refreshTargets = async () => {
    loadingTargets.value = true
    try {
      await wanlingStore.fetchRaidTargets()
    } finally {
      loadingTargets.value = false
    }
  }

  // 加载历史记录
  const loadHistory = async () => {
    loadingHistory.value = true
    try {
      await wanlingStore.fetchRaidHistory()
    } finally {
      loadingHistory.value = false
    }
  }

  // 选择目标
  const selectTarget = (target: RaidTarget) => {
    if (selectedTarget.value?.id === target.id) {
      selectedTarget.value = null
    } else {
      selectedTarget.value = target
    }
  }

  // 执行偷菜
  const handleRaid = async () => {
    if (!selectedTarget.value) return

    try {
      const result = await wanlingStore.raidGarden(selectedTarget.value.id)
      raidResult.value = result
      if (result.success) {
        message.success(result.message)
      } else {
        message.warning(result.message)
      }
      updateCooldown()
      selectedTarget.value = null
      // 刷新历史
      await loadHistory()
    } catch (error) {
      message.error(extractErrorMessage(error, '偷菜失败'))
    }
  }

  onMounted(async () => {
    updateCooldown()
    cooldownTimer = setInterval(updateCooldown, 1000)
    // 加载目标列表和历史
    await Promise.all([refreshTargets(), loadHistory()])
  })

  onUnmounted(() => {
    if (cooldownTimer) {
      clearInterval(cooldownTimer)
    }
  })
</script>

<style scoped>
  .beast-raid-panel {
    padding: 4px 0;
  }

  /* 卡片通用样式 */
  .beast-raid-panel :deep(.n-card) {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
  }

  .beast-raid-panel :deep(.n-card-header) {
    padding: 14px 16px 10px;
  }

  .beast-raid-panel :deep(.n-card__content) {
    padding: 12px 16px 16px;
  }

  /* 状态区域 */
  .raid-status {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }

  .status-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 14px;
    background: rgba(245, 158, 11, 0.05);
    border-radius: 8px;
    min-width: 100px;
  }

  .status-label {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .status-value {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .status-value.text-warning {
    color: #f59e0b;
  }

  .status-value.countdown {
    color: #f59e0b;
    font-family: 'Consolas', monospace;
  }

  /* 警告提示 */
  .beast-raid-panel :deep(.n-alert) {
    border-radius: 10px;
  }

  /* 目标列表 */
  .beast-raid-panel :deep(.n-list) {
    background: transparent;
  }

  .beast-raid-panel :deep(.n-list-item) {
    padding: 8px 12px;
    border-radius: 8px;
    margin-bottom: 6px;
    background: rgba(245, 158, 11, 0.03);
    border: 1px solid transparent;
    transition: all 0.2s ease;
  }

  .beast-raid-panel :deep(.n-list-item:hover) {
    background: rgba(245, 158, 11, 0.08);
    border-color: rgba(245, 158, 11, 0.2);
  }

  .target-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .target-item.selected {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(234, 179, 8, 0.05) 100%);
    border-radius: 6px;
    padding: 6px 10px;
    margin: -6px -10px;
  }

  .target-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .target-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  /* 偷菜结果 */
  .raid-result {
    padding: 4px 0;
  }

  .result-message {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 12px;
    padding: 10px 12px;
    background: rgba(245, 158, 11, 0.05);
    border-radius: 8px;
  }

  .result-rewards {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 12px;
    padding: 10px 12px;
    background: rgba(34, 197, 94, 0.05);
    border-radius: 8px;
  }

  .rewards-label {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .result-injury {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #ef4444;
    font-size: 0.85rem;
    padding: 10px 12px;
    background: rgba(239, 68, 68, 0.05);
    border-radius: 8px;
    margin-top: 8px;
  }

  /* 历史记录 */
  .history-item {
    padding: 6px 0;
  }

  .history-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    flex-wrap: wrap;
  }

  .history-beast {
    font-weight: 600;
    color: #0891b2;
  }

  .history-arrow {
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .history-target {
    color: var(--text-secondary);
  }

  .history-rewards {
    font-size: 0.8rem;
    color: #22c55e;
    margin-bottom: 4px;
    padding: 4px 8px;
    background: rgba(34, 197, 94, 0.08);
    border-radius: 4px;
    display: inline-block;
  }

  .history-time {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  /* 说明列表 */
  .beast-raid-panel :deep(.n-card:last-child .n-list-item) {
    padding: 8px 0;
    margin-bottom: 0;
    background: transparent;
    border: none;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .beast-raid-panel :deep(.n-card:last-child .n-list-item::before) {
    content: '•';
    color: #f59e0b;
    margin-right: 8px;
    font-weight: bold;
  }

  /* 响应式 */
  @media (max-width: 480px) {
    .raid-status {
      flex-direction: column;
      gap: 10px;
    }

    .status-item {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }

    .target-info {
      flex-wrap: wrap;
    }

    .history-info {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
  }
</style>
