<template>
  <div class="world-events-page">
    <n-card title="天道法则" class="header-card">
      <template #header-extra>
        <n-tag v-if="worldEventStore.cultivationBonus !== 0" :type="worldEventStore.cultivationBonus > 0 ? 'success' : 'warning'">
          修炼效率 {{ worldEventStore.cultivationBonus > 0 ? '+' : '' }}{{ worldEventStore.cultivationBonus }}%
        </n-tag>
      </template>

      <p class="description">天道无常，祥瑞与厄运交替降临。每隔一个时辰，天道将随机选择一位修士，降下恩泽或劫难。</p>
    </n-card>

    <!-- 我的当前Buff/Debuff -->
    <n-card title="当前天机" class="buffs-card" v-if="worldEventStore.hasActiveBuff">
      <div class="buffs-grid">
        <div v-for="buff in worldEventStore.activeBlessing" :key="buff.effectType + buff.expiresAt" class="buff-item blessing">
          <n-icon :size="24" color="#52c41a">
            <Sparkles />
          </n-icon>
          <div class="buff-info">
            <span class="buff-name">{{ effectTypeNames[buff.effectType] || buff.effectType }}</span>
            <span class="buff-value">+{{ buff.value }}%</span>
            <span class="buff-time">剩余 {{ formatRemaining(buff.remainingTime) }}</span>
          </div>
        </div>

        <div v-for="buff in worldEventStore.activeCalamity" :key="buff.effectType + buff.expiresAt" class="buff-item calamity">
          <n-icon :size="24" color="#ff4d4f">
            <Cloud />
          </n-icon>
          <div class="buff-info">
            <span class="buff-name">{{ effectTypeNames[buff.effectType] || buff.effectType }}</span>
            <span class="buff-value">-{{ buff.value }}%</span>
            <span class="buff-time">剩余 {{ formatRemaining(buff.remainingTime) }}</span>
          </div>
        </div>
      </div>
    </n-card>

    <!-- 世界事件时间线 -->
    <n-card title="天道演化" class="events-card">
      <template #header-extra>
        <n-button text @click="worldEventStore.fetchRecentEvents()">
          <template #icon>
            <n-icon><Clock /></n-icon>
          </template>
          刷新
        </n-button>
      </template>

      <n-spin :show="worldEventStore.loading">
        <div class="events-timeline" v-if="worldEventStore.recentEvents.length > 0">
          <div v-for="event in worldEventStore.recentEvents" :key="event.id" class="event-item" :class="event.type">
            <div class="event-icon">
              <n-icon :size="20" :color="event.type === 'blessing' ? '#faad14' : '#cf1322'">
                <Sun v-if="event.type === 'blessing'" />
                <Zap v-else />
              </n-icon>
            </div>
            <div class="event-content">
              <div class="event-header">
                <n-tag :type="event.type === 'blessing' ? 'warning' : 'error'" size="small">
                  {{ event.type === 'blessing' ? '祥瑞' : '厄运' }}
                </n-tag>
                <span class="event-time">{{ formatTime(event.triggeredAt) }}</span>
              </div>
              <p class="event-description">{{ event.description }}</p>
            </div>
          </div>
        </div>

        <n-empty v-else description="暂无天道事件" />
      </n-spin>
    </n-card>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, onUnmounted } from 'vue'
  import { useWorldEventStore } from '@/stores/worldEvent'
  import { Sun, Cloud, Clock, Zap, Sparkles } from 'lucide-vue-next'

  const worldEventStore = useWorldEventStore()

  // 定时刷新buff
  let refreshTimer: ReturnType<typeof setInterval> | null = null

  onMounted(async () => {
    await worldEventStore.init()

    // 每分钟刷新buff状态
    refreshTimer = setInterval(() => {
      worldEventStore.refreshBuffs()
    }, 60000)
  })

  onUnmounted(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
    }
  })

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}小时前`

    return date.toLocaleDateString()
  }

  // 格式化剩余时间
  const formatRemaining = (ms: number) => {
    const mins = Math.floor(ms / 60000)
    if (mins < 60) return `${mins}分钟`
    const hours = Math.floor(mins / 60)
    const remainMins = mins % 60
    return `${hours}时${remainMins}分`
  }

  // 效果类型名称映射
  const effectTypeNames: Record<string, string> = {
    exp_bonus: '修为奖励',
    spirit_stones: '灵石奖励',
    cultivation_buff: '修炼加成',
    rare_item: '珍稀物品',
    exp_loss: '修为损失',
    spirit_stones_loss: '灵石损失',
    cultivation_debuff: '修炼减益',
    item_loss: '物品丢失'
  }
</script>

<style scoped>
  .world-events-page {
    padding: 16px;
    max-width: 800px;
    margin: 0 auto;
  }

  .header-card {
    margin-bottom: 16px;
  }

  .description {
    color: var(--text-color-secondary);
    font-size: 14px;
    margin: 0;
  }

  .buffs-card {
    margin-bottom: 16px;
  }

  .buffs-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .buff-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    min-width: 200px;
  }

  .buff-item.blessing {
    background: linear-gradient(135deg, rgba(82, 196, 26, 0.1) 0%, rgba(82, 196, 26, 0.05) 100%);
    border: 1px solid rgba(82, 196, 26, 0.3);
  }

  .buff-item.calamity {
    background: linear-gradient(135deg, rgba(255, 77, 79, 0.1) 0%, rgba(255, 77, 79, 0.05) 100%);
    border: 1px solid rgba(255, 77, 79, 0.3);
  }

  .buff-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .buff-name {
    font-weight: 500;
  }

  .buff-value {
    font-size: 12px;
    color: var(--text-color-secondary);
  }

  .buff-time {
    font-size: 12px;
    color: var(--text-color-tertiary);
  }

  .events-card {
    margin-bottom: 16px;
  }

  .events-timeline {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .event-item {
    display: flex;
    gap: 12px;
    padding: 12px;
    border-radius: 8px;
    background: var(--card-color);
  }

  .event-item.blessing {
    border-left: 3px solid #faad14;
  }

  .event-item.calamity {
    border-left: 3px solid #cf1322;
  }

  .event-icon {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--body-color);
  }

  .event-content {
    flex: 1;
  }

  .event-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .event-time {
    font-size: 12px;
    color: var(--text-color-tertiary);
  }

  .event-description {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
  }
</style>
