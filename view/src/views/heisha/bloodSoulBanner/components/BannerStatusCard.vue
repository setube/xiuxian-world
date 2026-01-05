<template>
  <div class="banner-status-card">
    <!-- 血魂幡等级展示 -->
    <div class="banner-display">
      <div class="banner-visual">
        <div class="banner-glow" />
        <div class="banner-icon">
          <Flag :size="40" />
        </div>
        <div class="banner-level">{{ bannerStatus?.level || 1 }}</div>
      </div>

      <div class="banner-info">
        <div class="info-row">
          <span class="label">血魂幡等阶</span>
          <span class="value level">第{{ bannerStatus?.level || 1 }}阶</span>
        </div>
        <div class="info-row">
          <span class="label">炼化槽位</span>
          <span class="value">{{ currentConfig?.slots || 1 }}个</span>
        </div>
        <div class="info-row">
          <span class="label">可炼化等级</span>
          <span class="value" :style="{ color: getSoulGradeColor(currentConfig?.maxSoulGrade || 1) }">
            {{ getSoulGradeName(currentConfig?.maxSoulGrade || 1) }}
          </span>
        </div>
        <div class="info-row">
          <span class="label">稳定度</span>
          <span class="value" :style="{ color: getStabilityColor(bannerStatus?.stability || 100) }">
            {{ bannerStatus?.stability || 100 }}%
          </span>
        </div>
      </div>
    </div>

    <!-- 升级区域 -->
    <div v-if="canUpgrade" class="upgrade-section">
      <div class="upgrade-info">
        <div class="upgrade-title">
          <TrendingUp :size="16" />
          <span>升级至第{{ (bannerStatus?.level || 1) + 1 }}阶</span>
        </div>
        <div class="upgrade-cost">消耗阴魂丝: {{ nextUpgradeCost }}</div>
        <div class="upgrade-benefits">
          <span v-if="nextConfig && nextConfig.slots > (currentConfig?.slots || 1)">+1炼化槽</span>
          <span v-if="nextConfig && nextConfig.maxSoulGrade > (currentConfig?.maxSoulGrade || 1)">可炼化更高级魂魄</span>
        </div>
      </div>
      <button class="upgrade-btn" :disabled="upgrading || !hasEnoughMaterial" @click="handleUpgrade">
        <Loader2 v-if="upgrading" :size="16" class="spin" />
        <ArrowUp v-else :size="16" />
        {{ upgrading ? '升级中...' : '升级' }}
      </button>
    </div>

    <!-- 已满级提示 -->
    <div v-else class="max-level">
      <Crown :size="18" />
      <span>血魂幡已达最高等阶</span>
    </div>

    <!-- 稳定度警告 -->
    <div v-if="(bannerStatus?.stability || 100) < 40" class="stability-warning">
      <AlertTriangle :size="16" />
      <span>稳定度过低，炼化产出将减半！请及时安抚幡灵</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useBloodSoulBannerStore } from '@/stores/bloodSoulBanner'
  import {
    BANNER_LEVEL_CONFIG,
    BANNER_MAX_LEVEL,
    getSoulGradeColor,
    getSoulGradeName,
    getStabilityColor
  } from '@/game/constants/bloodSoulBanner'
  import { Flag, TrendingUp, ArrowUp, Loader2, Crown, AlertTriangle } from 'lucide-vue-next'

  const bannerStore = useBloodSoulBannerStore()
  const { bannerStatus } = storeToRefs(bannerStore)

  const upgrading = ref(false)

  const currentConfig = computed(() => {
    const level = bannerStatus.value?.level || 1
    return BANNER_LEVEL_CONFIG[level]
  })

  const nextConfig = computed(() => {
    const level = bannerStatus.value?.level || 1
    return BANNER_LEVEL_CONFIG[level + 1]
  })

  const canUpgrade = computed(() => {
    const level = bannerStatus.value?.level || 1
    return level < BANNER_MAX_LEVEL
  })

  const nextUpgradeCost = computed(() => {
    return nextConfig.value?.upgradeCost || 0
  })

  const hasEnoughMaterial = computed(() => {
    // 这里需要根据实际物品数量判断
    // 暂时返回true，后续可以从inventory store获取
    return true
  })

  async function handleUpgrade() {
    if (upgrading.value || !canUpgrade.value) return

    upgrading.value = true
    try {
      await bannerStore.upgradeBanner()
    } finally {
      upgrading.value = false
    }
  }
</script>

<style scoped>
  .banner-status-card {
    background: linear-gradient(135deg, rgba(88, 28, 135, 0.15) 0%, rgba(30, 30, 30, 0.9) 100%);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 16px;
  }

  .banner-display {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 20px;
  }

  .banner-visual {
    position: relative;
    width: 80px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .banner-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%);
    animation: bannerGlow 3s ease-in-out infinite;
  }

  @keyframes bannerGlow {
    0%,
    100% {
      opacity: 0.5;
      transform: translate(-50%, -50%) scale(1);
    }
    50% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.2);
    }
  }

  .banner-icon {
    position: relative;
    z-index: 1;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #581c87 0%, #7c3aed 100%);
    border-radius: 12px;
    color: white;
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
    animation: iconFloat 3s ease-in-out infinite;
  }

  @keyframes iconFloat {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  .banner-level {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
    border-radius: 6px;
    color: white;
    font-weight: 700;
    font-size: 0.85rem;
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
  }

  .banner-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .info-row .label {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .info-row .value {
    font-weight: 600;
    color: var(--text-primary);
  }

  .info-row .value.level {
    color: #a855f7;
  }

  /* 升级区域 */
  .upgrade-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid rgba(139, 92, 246, 0.2);
  }

  .upgrade-info {
    flex: 1;
  }

  .upgrade-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: #a855f7;
    margin-bottom: 4px;
  }

  .upgrade-cost {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .upgrade-benefits {
    display: flex;
    gap: 8px;
    margin-top: 4px;
    font-size: 0.75rem;
    color: #4ade80;
  }

  .upgrade-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: linear-gradient(135deg, #581c87 0%, #7c3aed 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .upgrade-btn:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.5);
  }

  .upgrade-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 已满级 */
  .max-level {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 20px;
    background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid rgba(139, 92, 246, 0.2);
    color: #fbbf24;
    font-size: 0.9rem;
  }

  /* 稳定度警告 */
  .stability-warning {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(239, 68, 68, 0.1);
    border-top: 1px solid rgba(239, 68, 68, 0.3);
    color: #f87171;
    font-size: 0.8rem;
  }

  .spin {
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

  @media (max-width: 400px) {
    .banner-display {
      flex-direction: column;
      text-align: center;
    }

    .upgrade-section {
      flex-direction: column;
      gap: 12px;
    }

    .upgrade-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
