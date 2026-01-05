<template>
  <div class="scenery-panel">
    <!-- 说明 -->
    <div class="panel-header">
      <div class="header-icon">
        <Image :size="20" />
      </div>
      <div class="header-info">
        <h3>洞天绘卷</h3>
        <p>收集成就景观，装点你的洞府</p>
      </div>
    </div>

    <!-- 已解锁景观 -->
    <div class="section">
      <h4 class="section-title">
        <Unlock :size="16" />
        已解锁
        <span class="count">({{ unlockedSceneries.length }})</span>
      </h4>
      <div v-if="unlockedSceneries.length === 0" class="empty-hint">暂未解锁任何景观</div>
      <div v-else class="scenery-grid">
        <div
          v-for="scenery in unlockedSceneries"
          :key="scenery.id"
          class="scenery-card"
          :class="{ displayed: scenery.isDisplayed }"
          @click="handleToggleScenery(scenery.id)"
        >
          <div class="scenery-icon" :style="{ background: getRarityColor(scenery.rarity) }">
            <Palette :size="24" />
          </div>
          <div class="scenery-info">
            <span class="scenery-name">{{ scenery.name }}</span>
            <span class="scenery-desc">{{ scenery.description }}</span>
          </div>
          <div class="scenery-status">
            <Eye v-if="scenery.isDisplayed" :size="16" />
            <EyeOff v-else :size="16" />
          </div>
        </div>
      </div>
    </div>

    <!-- 未解锁景观 -->
    <div class="section">
      <h4 class="section-title">
        <Lock :size="16" />
        未解锁
        <span class="count">({{ lockedSceneries.length }})</span>
      </h4>
      <div v-if="lockedSceneries.length === 0" class="empty-hint">所有景观已解锁</div>
      <div v-else class="scenery-grid locked-grid">
        <div v-for="scenery in lockedSceneries" :key="scenery.id" class="scenery-card locked">
          <div class="scenery-icon locked-icon">
            <Lock :size="24" />
          </div>
          <div class="scenery-info">
            <span class="scenery-name">{{ scenery.name }}</span>
            <span class="scenery-condition">{{ getConditionText(scenery.condition) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import { useCaveStore, type SceneryConfig } from '@/stores/cave'
  import { useMessage } from 'naive-ui'
  import { Image, Palette, Eye, EyeOff, Lock, Unlock } from 'lucide-vue-next'

  const caveStore = useCaveStore()
  const message = useMessage()

  const unlockedSceneries = computed(() => caveStore.unlockedSceneries)
  const lockedSceneries = computed(() => caveStore.lockedSceneries)

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'rgba(255, 165, 0, 0.2)'
      case 'epic':
        return 'rgba(163, 53, 238, 0.2)'
      case 'rare':
        return 'rgba(33, 150, 243, 0.2)'
      default:
        return 'rgba(138, 109, 183, 0.15)'
    }
  }

  const getConditionText = (condition: SceneryConfig['condition']) => {
    switch (condition.type) {
      case 'realm_reached':
        return `达到指定境界`
      case 'cave_level':
        return `洞府总等级达到 ${condition.minLevel}`
      case 'visitor_count':
        return `接待访客 ${condition.minCount} 次`
      case 'total_exp':
        return `累计修为达到 ${condition.minExp}`
      case 'pvp_kills':
        return `PvP击杀 ${condition.minCount} 次`
      default:
        return '特殊条件'
    }
  }

  const handleToggleScenery = async (sceneryId: string) => {
    try {
      await caveStore.toggleScenery(sceneryId)
      message.success('景观状态已更新')
    } catch (error) {
      message.error((error as Error).message || '操作失败')
    }
  }

  onMounted(() => {
    caveStore.fetchSceneryGallery()
  })
</script>

<style scoped>
  .scenery-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .panel-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
  }

  .header-icon {
    width: 44px;
    height: 44px;
    background: rgba(138, 109, 183, 0.15);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #8a6db7;
    flex-shrink: 0;
  }

  .header-info h3 {
    margin: 0 0 4px;
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  .header-info p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .section {
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

  .section-title .count {
    color: var(--text-muted);
    font-weight: 400;
  }

  .empty-hint {
    text-align: center;
    padding: 24px;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .scenery-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .scenery-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .scenery-card:hover:not(.locked) {
    border-color: #8a6db7;
  }

  .scenery-card.displayed {
    border-color: rgba(82, 196, 26, 0.5);
    background: rgba(82, 196, 26, 0.05);
  }

  .scenery-card.locked {
    opacity: 0.6;
    cursor: default;
  }

  .scenery-icon {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #8a6db7;
    flex-shrink: 0;
  }

  .scenery-icon.locked-icon {
    background: var(--bg-secondary);
    color: var(--text-muted);
  }

  .scenery-info {
    flex: 1;
    min-width: 0;
  }

  .scenery-name {
    display: block;
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .scenery-desc {
    display: block;
    font-size: 0.8rem;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .scenery-condition {
    display: block;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .scenery-status {
    color: var(--text-muted);
  }

  .scenery-card.displayed .scenery-status {
    color: #52c41a;
  }
</style>
