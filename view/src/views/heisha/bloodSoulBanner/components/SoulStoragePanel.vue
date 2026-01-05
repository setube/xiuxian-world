<template>
  <div class="soul-storage-panel">
    <!-- 标题 -->
    <div class="panel-header">
      <Ghost :size="20" />
      <span>魂魄储备</span>
    </div>

    <!-- 魂魄列表 -->
    <div class="soul-list">
      <div v-for="soul in soulList" :key="soul.id" class="soul-card" :style="{ '--soul-color': soul.color }">
        <div class="soul-icon">
          <Ghost :size="24" />
        </div>
        <div class="soul-info">
          <div class="soul-header">
            <span class="soul-name">{{ soul.name }}</span>
            <span class="soul-grade" :style="{ color: soul.color }">{{ soul.gradeName }}</span>
          </div>
          <div class="soul-details">
            <div class="detail-item">
              <Clock :size="12" />
              <span>炼化时间: {{ soul.refineTime }}</span>
            </div>
            <div class="detail-item">
              <Flame :size="12" />
              <span>消耗煞气: {{ soul.shaCost }}</span>
            </div>
          </div>
          <div class="soul-outputs">
            <span class="output-primary">{{ soul.primaryOutput }}</span>
            <span class="output-rare">{{ soul.rareOutput }} ({{ soul.rareChance }}%)</span>
          </div>
        </div>
        <div class="soul-count" :class="{ 'has-souls': soul.count > 0 }">
          <span class="count-number">{{ soul.count }}</span>
          <span class="count-label">个</span>
        </div>
      </div>
    </div>

    <!-- 获取途径说明 -->
    <div class="obtain-section">
      <div class="section-title">
        <Info :size="16" />
        <span>获取途径</span>
      </div>
      <div class="obtain-list">
        <div class="obtain-item">
          <Swords :size="14" />
          <span>
            <strong>怨魂</strong>
            : PvP胜利 20%几率
          </span>
        </div>
        <div class="obtain-item">
          <Swords :size="14" />
          <span>
            <strong>修士残魂</strong>
            : PvP胜利 10%几率
          </span>
        </div>
        <div class="obtain-item">
          <Trees :size="14" />
          <span>
            <strong>妖兽精魄</strong>
            : 血洗山林
          </span>
        </div>
        <div class="obtain-item">
          <Skull :size="14" />
          <span>
            <strong>凶兽戾魄</strong>
            : 召唤魔影
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useBloodSoulBannerStore } from '@/stores/bloodSoulBanner'
  import { SOUL_TYPES, formatRefineTime, getSoulGradeColor, getSoulGradeName } from '@/game/constants/bloodSoulBanner'
  import { Ghost, Clock, Flame, Info, Swords, Trees, Skull } from 'lucide-vue-next'

  const bannerStore = useBloodSoulBannerStore()
  const { soulStorage } = storeToRefs(bannerStore)

  interface SoulDisplayInfo {
    id: string
    name: string
    grade: number
    gradeName: string
    color: string
    refineTime: string
    shaCost: number
    primaryOutput: string
    rareOutput: string
    rareChance: number
    count: number
  }

  const soulList = computed<SoulDisplayInfo[]>(() => {
    return Object.values(SOUL_TYPES).map(soul => ({
      id: soul.id,
      name: soul.name,
      grade: soul.grade,
      gradeName: getSoulGradeName(soul.grade),
      color: getSoulGradeColor(soul.grade),
      refineTime: formatRefineTime(soul.refineTimeMs),
      shaCost: soul.shaCost,
      primaryOutput: soul.primaryOutput,
      rareOutput: soul.rareOutput,
      rareChance: soul.rareChance,
      count: soulStorage.value?.souls[soul.id]?.count || 0
    }))
  })
</script>

<style scoped>
  .soul-storage-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(30, 30, 30, 0.9) 100%);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 12px;
    color: #a855f7;
    font-weight: 600;
  }

  .soul-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .soul-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    border-left: 3px solid var(--soul-color);
    transition: all 0.2s ease;
  }

  .soul-card:hover {
    border-color: var(--soul-color);
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.2);
  }

  .soul-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(88, 28, 135, 0.3) 100%);
    border-radius: 10px;
    color: var(--soul-color);
  }

  .soul-info {
    flex: 1;
    min-width: 0;
  }

  .soul-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .soul-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .soul-grade {
    font-size: 0.75rem;
    padding: 2px 6px;
    background: rgba(139, 92, 246, 0.1);
    border-radius: 4px;
  }

  .soul-details {
    display: flex;
    gap: 12px;
    margin-bottom: 4px;
  }

  .detail-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .soul-outputs {
    display: flex;
    gap: 8px;
    font-size: 0.75rem;
  }

  .output-primary {
    color: #4ade80;
  }

  .output-rare {
    color: #fbbf24;
  }

  .soul-count {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    padding: 8px 12px;
    background: var(--bg-secondary);
    border-radius: 8px;
    color: var(--text-muted);
  }

  .soul-count.has-souls {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(88, 28, 135, 0.3) 100%);
    color: #a855f7;
  }

  .count-number {
    font-size: 1.2rem;
    font-weight: 700;
  }

  .count-label {
    font-size: 0.7rem;
  }

  /* 获取途径 */
  .obtain-section {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    overflow: hidden;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: var(--bg-secondary);
    font-weight: 600;
    color: var(--text-primary);
  }

  .obtain-list {
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .obtain-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .obtain-item strong {
    color: var(--text-primary);
  }

  @media (max-width: 480px) {
    .soul-card {
      flex-direction: column;
      text-align: center;
    }

    .soul-header {
      justify-content: center;
    }

    .soul-details {
      justify-content: center;
    }

    .soul-outputs {
      justify-content: center;
    }

    .soul-count {
      flex-direction: row;
      gap: 4px;
      width: 100%;
    }
  }
</style>
