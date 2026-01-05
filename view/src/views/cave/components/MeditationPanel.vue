<template>
  <div class="meditation-panel">
    <!-- 静室信息卡片 -->
    <div class="info-card">
      <div class="card-header">
        <div class="card-icon">
          <Sparkles :size="20" />
        </div>
        <div class="card-title">
          <h3>静室</h3>
          <span class="level-badge">Lv.{{ meditationChamber?.level || 0 }} / {{ meditationChamber?.maxLevel || 10 }}</span>
        </div>
      </div>

      <!-- 转化率信息 -->
      <div class="conversion-info">
        <div class="info-row">
          <span class="info-label">转化率</span>
          <span class="info-value">{{ meditationChamber?.conversionRate || 0 }}x</span>
        </div>
        <div class="info-row">
          <span class="info-label">每小时转化上限</span>
          <span class="info-value">{{ meditationChamber?.maxConversionPerHour || 0 }} 灵气</span>
        </div>
      </div>

      <!-- 待转化修为 -->
      <div v-if="meditationChamber?.pendingExp && meditationChamber.pendingExp > 0" class="pending-exp">
        <div class="pending-icon">
          <TrendingUp :size="16" class="pulse-anim" />
        </div>
        <div class="pending-info">
          <span class="pending-label">可转化修为</span>
          <span class="pending-value">+{{ meditationChamber.pendingExp }}</span>
        </div>
        <NButton type="primary" size="small" :loading="caveStore.actionLoading" @click="handleConvert">转化</NButton>
      </div>

      <!-- 灵气不足提示 -->
      <div v-else-if="!hasEnergy" class="no-energy-hint">
        <AlertCircle :size="16" />
        <span>灵气不足，请先收取灵气</span>
      </div>

      <!-- 冷却中提示 -->
      <div v-else class="cooldown-hint">
        <Clock :size="16" />
        <span>转化冷却中，请稍后再试</span>
      </div>

      <!-- 说明 -->
      <div class="description">
        <p>静室可将灵脉中的灵气转化为修炼点数，提升静室等级可增加转化效率</p>
      </div>
    </div>

    <!-- 升级卡片 -->
    <div v-if="meditationChamber?.canUpgrade" class="upgrade-card">
      <h4>升级静室</h4>
      <p class="upgrade-desc">提升静室等级，增加灵气转化效率</p>

      <div class="upgrade-preview">
        <div class="preview-item">
          <span class="preview-label">转化率</span>
          <span class="preview-change">
            {{ meditationChamber?.conversionRate }}x
            <ArrowRight :size="12" />
            ?
          </span>
        </div>
        <div class="preview-item">
          <span class="preview-label">转化上限</span>
          <span class="preview-change">
            {{ meditationChamber?.maxConversionPerHour }}
            <ArrowRight :size="12" />
            ?
          </span>
        </div>
      </div>

      <div v-if="meditationChamber?.upgradeCost" class="upgrade-cost">
        <span class="cost-label">升级消耗：</span>
        <span class="cost-item">
          <Coins :size="14" />
          {{ meditationChamber.upgradeCost.spiritStones }} 灵石
        </span>
        <span v-for="item in meditationChamber.upgradeCost.items" :key="item.itemId" class="cost-item">
          <Package :size="14" />
          {{ item.quantity }}x
        </span>
      </div>

      <NButton type="primary" :loading="caveStore.actionLoading" @click="handleUpgrade">
        <template #icon>
          <TrendingUp :size="16" />
        </template>
        升级静室
      </NButton>
    </div>

    <div v-else class="max-level-hint">
      <CheckCircle :size="20" />
      <span>静室已达满级</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useCaveStore } from '@/stores/cave'
  import { NButton, useMessage } from 'naive-ui'
  import { Sparkles, TrendingUp, Clock, AlertCircle, ArrowRight, Coins, Package, CheckCircle } from 'lucide-vue-next'

  const caveStore = useCaveStore()
  const message = useMessage()

  const meditationChamber = computed(() => caveStore.meditationChamber)

  const hasEnergy = computed(() => {
    return (caveStore.spiritVein?.currentEnergy || 0) > 0
  })

  const handleConvert = async () => {
    try {
      const result = await caveStore.convertEnergy()
      message.success(`转化成功！获得 ${result.expGained} 修为`)
    } catch (error) {
      message.error((error as Error).message || '转化失败')
    }
  }

  const handleUpgrade = async () => {
    try {
      const result = await caveStore.upgradeMeditation()
      message.success(`静室升级至 Lv.${result.newLevel}`)
    } catch (error) {
      message.error((error as Error).message || '升级失败')
    }
  }
</script>

<style scoped>
  .meditation-panel {
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

  .conversion-info {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
    padding: 14px;
    background: var(--bg-secondary);
    border-radius: 10px;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .info-label {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .info-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: #8a6db7;
  }

  .pending-exp {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: rgba(82, 196, 26, 0.1);
    border: 1px solid rgba(82, 196, 26, 0.3);
    border-radius: 10px;
    margin-bottom: 16px;
  }

  .pending-icon {
    color: #52c41a;
  }

  .pulse-anim {
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.05);
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
    color: #52c41a;
  }

  .no-energy-hint,
  .cooldown-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px;
    background: var(--bg-secondary);
    border-radius: 10px;
    margin-bottom: 16px;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .description {
    padding: 12px;
    background: rgba(138, 109, 183, 0.05);
    border-radius: 8px;
  }

  .description p {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.5;
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
