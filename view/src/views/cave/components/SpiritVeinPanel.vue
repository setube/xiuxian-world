<template>
  <div class="spirit-vein-panel">
    <!-- 灵脉信息卡片 -->
    <div class="info-card">
      <div class="card-header">
        <div class="card-icon">
          <Zap :size="20" />
        </div>
        <div class="card-title">
          <h3>灵脉</h3>
          <span class="level-badge">Lv.{{ spiritVein?.level || 0 }} / {{ spiritVein?.maxLevel || 10 }}</span>
        </div>
      </div>

      <!-- 灵气存储进度 -->
      <div class="energy-section">
        <div class="energy-header">
          <span class="energy-label">灵气存储</span>
          <span class="energy-value">{{ spiritVein?.currentEnergy || 0 }} / {{ spiritVein?.maxStorage || 0 }}</span>
        </div>
        <NProgress
          type="line"
          :percentage="energyPercentage"
          :height="12"
          :border-radius="6"
          :fill-border-radius="6"
          color="#8a6db7"
          rail-color="rgba(138, 109, 183, 0.15)"
        />
      </div>

      <!-- 待收取灵气 -->
      <div v-if="spiritVein?.pendingEnergy && spiritVein.pendingEnergy > 0" class="pending-energy">
        <div class="pending-icon">
          <Sparkles :size="16" class="sparkle-anim" />
        </div>
        <div class="pending-info">
          <span class="pending-label">待收取</span>
          <span class="pending-value">+{{ spiritVein.pendingEnergy }}</span>
        </div>
        <NButton type="primary" size="small" :loading="caveStore.actionLoading" @click="handleHarvest">收取</NButton>
      </div>

      <!-- 产出信息 -->
      <div class="production-info">
        <div class="info-item">
          <Clock :size="14" />
          <span>每小时产出：{{ spiritVein?.productionPerHour || 0 }} 灵气</span>
        </div>
      </div>
    </div>

    <!-- 升级卡片 -->
    <div v-if="spiritVein?.canUpgrade" class="upgrade-card">
      <h4>升级灵脉</h4>
      <p class="upgrade-desc">提升灵脉等级，增加灵气产出和存储上限</p>

      <div class="upgrade-preview">
        <div class="preview-item">
          <span class="preview-label">产出</span>
          <span class="preview-change">
            {{ spiritVein?.productionPerHour }}
            <ArrowRight :size="12" />
            ?
          </span>
        </div>
        <div class="preview-item">
          <span class="preview-label">存储</span>
          <span class="preview-change">
            {{ spiritVein?.maxStorage }}
            <ArrowRight :size="12" />
            ?
          </span>
        </div>
      </div>

      <div v-if="spiritVein?.upgradeCost" class="upgrade-cost">
        <span class="cost-label">升级消耗：</span>
        <span class="cost-item">
          <Coins :size="14" />
          {{ spiritVein.upgradeCost.spiritStones }} 灵石
        </span>
        <span v-for="item in spiritVein.upgradeCost.items" :key="item.itemId" class="cost-item">
          <Package :size="14" />
          {{ item.quantity }}x
        </span>
      </div>

      <NButton type="primary" :loading="caveStore.actionLoading" @click="handleUpgrade">
        <template #icon>
          <TrendingUp :size="16" />
        </template>
        升级灵脉
      </NButton>
    </div>

    <div v-else class="max-level-hint">
      <CheckCircle :size="20" />
      <span>灵脉已达满级</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useCaveStore } from '@/stores/cave'
  import { NProgress, NButton, useMessage } from 'naive-ui'
  import { Zap, Sparkles, Clock, ArrowRight, Coins, Package, TrendingUp, CheckCircle } from 'lucide-vue-next'

  const caveStore = useCaveStore()
  const message = useMessage()

  const spiritVein = computed(() => caveStore.spiritVein)

  const energyPercentage = computed(() => {
    if (!spiritVein.value) return 0
    return Math.min(100, (spiritVein.value.currentEnergy / spiritVein.value.maxStorage) * 100)
  })

  const handleHarvest = async () => {
    try {
      const result = await caveStore.harvestEnergy()
      message.success(`成功收取 ${result.harvested} 灵气`)
    } catch (error) {
      message.error((error as Error).message || '收取失败')
    }
  }

  const handleUpgrade = async () => {
    try {
      const result = await caveStore.upgradeSpiritVein()
      message.success(`灵脉升级至 Lv.${result.newLevel}`)
    } catch (error) {
      message.error((error as Error).message || '升级失败')
    }
  }
</script>

<style scoped>
  .spirit-vein-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .info-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 20px;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .card-icon {
    width: 44px;
    height: 44px;
    background: rgba(138, 109, 183, 0.15);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #8a6db7;
  }

  .card-title {
    flex: 1;
  }

  .card-title h3 {
    margin: 0 0 4px;
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  .level-badge {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .energy-section {
    margin-bottom: 16px;
  }

  .energy-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .energy-label {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .energy-value {
    font-size: 0.85rem;
    font-weight: 600;
    color: #8a6db7;
  }

  .pending-energy {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: rgba(138, 109, 183, 0.1);
    border: 1px solid rgba(138, 109, 183, 0.3);
    border-radius: 10px;
    margin-bottom: 16px;
  }

  .pending-icon {
    color: #8a6db7;
  }

  .sparkle-anim {
    animation: sparkle 1.5s ease-in-out infinite;
  }

  @keyframes sparkle {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.1);
    }
  }

  .pending-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .pending-label {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .pending-value {
    font-size: 1rem;
    font-weight: 700;
    color: #8a6db7;
  }

  .production-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .upgrade-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 20px;
  }

  .upgrade-card h4 {
    margin: 0 0 8px;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .upgrade-desc {
    margin: 0 0 16px;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .upgrade-preview {
    display: flex;
    gap: 20px;
    margin-bottom: 16px;
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 8px;
  }

  .preview-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .preview-label {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .preview-change {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  .upgrade-cost {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
  }

  .cost-label {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .cost-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
    color: var(--color-gold);
  }

  .max-level-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px;
    background: rgba(82, 196, 26, 0.1);
    border: 1px solid rgba(82, 196, 26, 0.3);
    border-radius: 10px;
    color: #52c41a;
    font-size: 0.9rem;
  }
</style>
