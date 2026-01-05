<template>
  <div class="stargaze-panel">
    <!-- 背景星光粒子 -->
    <div class="fate-particles">
      <div
        v-for="i in 15"
        :key="i"
        class="fate-star"
        :style="{
          '--delay': Math.random() * 5 + 's',
          '--x': Math.random() * 100 + '%',
          '--y': Math.random() * 100 + '%',
          '--size': Math.random() * 3 + 2 + 'px',
          '--duration': Math.random() * 3 + 3 + 's'
        }"
      />
    </div>

    <!-- 观星卡片 -->
    <div class="stargaze-card">
      <div class="card-header">
        <Sparkles :size="20" />
        <span>星衍天机</span>
      </div>
      <p class="card-desc">观察星象变化，预知今日命运</p>

      <!-- 今日结果 -->
      <div v-if="stargazeStatus?.currentResult" class="result-card" :class="getResultClass(stargazeStatus.currentResult.type)">
        <div class="result-icon">
          <component :is="getResultIcon(stargazeStatus.currentResult.type)" :size="32" />
        </div>
        <div class="result-info">
          <div class="result-name">{{ stargazeStatus.currentResult.name }}</div>
          <div class="result-desc">{{ stargazeStatus.currentResult.description }}</div>
          <div v-if="stargazeStatus.currentResult.bonus" class="result-bonus">
            <span v-if="stargazeStatus.currentResult.bonus.cultivation">修炼 +{{ stargazeStatus.currentResult.bonus.cultivation }}%</span>
            <span v-if="stargazeStatus.currentResult.bonus.dropRate">掉落 +{{ stargazeStatus.currentResult.bonus.dropRate }}%</span>
          </div>
          <div v-if="stargazeStatus.currentResult.penalty" class="result-penalty">
            <span v-if="stargazeStatus.currentResult.penalty.cultivation">
              修炼 {{ stargazeStatus.currentResult.penalty.cultivation }}%
            </span>
            <span v-if="stargazeStatus.currentResult.penalty.eventChance">
              事件 +{{ stargazeStatus.currentResult.penalty.eventChance }}%
            </span>
          </div>
        </div>
      </div>

      <!-- 未观星提示 -->
      <div v-else class="no-result">
        <Eye :size="48" />
        <span>今日尚未观星</span>
      </div>

      <!-- 冷却状态 -->
      <div v-if="stargazeStatus && !stargazeStatus.canStargaze && stargazeStatus.currentResult" class="cooldown-info">
        <Clock :size="16" />
        <span>下次观星: {{ formatTime(stargazeStatus.stargazeCooldownMs) }}</span>
      </div>

      <!-- 观星按钮 -->
      <button v-if="stargazeStatus?.canStargaze" class="stargaze-btn" :disabled="loading" @click="handleStargaze">
        <Eye :size="18" />
        <span>观星</span>
      </button>
    </div>

    <!-- 改换星移 -->
    <div class="change-fate-card">
      <div class="card-header">
        <RefreshCw :size="20" />
        <span>改换星移</span>
      </div>
      <p class="card-desc">消耗资源重新占卜，改变命运走向</p>

      <div class="fate-info">
        <div class="cost-info">
          <Coins :size="16" />
          <span>消耗: 1000 灵石</span>
        </div>
        <div v-if="stargazeStatus?.freeChangeFateCount" class="free-count">
          <Gift :size="16" />
          <span>免费次数: {{ stargazeStatus.freeChangeFateCount }}</span>
        </div>
      </div>

      <!-- 改命冷却 -->
      <div v-if="stargazeStatus && !stargazeStatus.canChangeFate && stargazeStatus.changeFateCooldownMs > 0" class="cooldown-info">
        <Clock :size="16" />
        <span>改命冷却: {{ formatTime(stargazeStatus.changeFateCooldownMs) }}</span>
      </div>

      <button class="change-fate-btn" :disabled="!stargazeStatus?.canChangeFate || loading" @click="handleChangeFate">
        <RefreshCw :size="18" />
        <span>改换星移</span>
      </button>
    </div>

    <!-- 观星结果概率说明 -->
    <div class="probability-info">
      <div class="info-header">
        <Info :size="16" />
        <span>观星结果分布</span>
      </div>
      <div class="prob-grid">
        <div class="prob-item great-fortune">
          <span class="prob-name">大吉</span>
          <span class="prob-value">5%</span>
        </div>
        <div class="prob-item fortune">
          <span class="prob-name">吉</span>
          <span class="prob-value">25%</span>
        </div>
        <div class="prob-item neutral">
          <span class="prob-name">平</span>
          <span class="prob-value">40%</span>
        </div>
        <div class="prob-item misfortune">
          <span class="prob-name">凶</span>
          <span class="prob-value">25%</span>
        </div>
        <div class="prob-item great-misfortune">
          <span class="prob-name">大凶</span>
          <span class="prob-value">5%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { markRaw, type Component } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useStarPalaceStore } from '@/stores/starpalace'
  import { extractErrorMessage } from '@/api'
  import { type StargazeResultType } from '@/game/constants/starpalace'
  import { useMessage } from 'naive-ui'
  import { Sparkles, Eye, Clock, RefreshCw, Coins, Gift, Info, Sun, Cloud, CloudRain, Skull, Star } from 'lucide-vue-next'

  const starPalaceStore = useStarPalaceStore()
  const { stargazeStatus, loading } = storeToRefs(starPalaceStore)
  const message = useMessage()

  function formatTime(ms: number): string {
    if (ms <= 0) return '可用'
    const hours = Math.floor(ms / (60 * 60 * 1000))
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
    if (hours > 0) return `${hours}时${minutes}分`
    return `${minutes}分钟`
  }

  function getResultClass(type: StargazeResultType): string {
    return type.replace('_', '-')
  }

  function getResultIcon(type: StargazeResultType): Component {
    const icons: Record<StargazeResultType, Component> = {
      great_fortune: markRaw(Sun),
      fortune: markRaw(Star),
      neutral: markRaw(Cloud),
      misfortune: markRaw(CloudRain),
      great_misfortune: markRaw(Skull)
    }
    return icons[type] ?? markRaw(Star)
  }

  async function handleStargaze() {
    try {
      const result = await starPalaceStore.doStargaze()
      message.success(`观星结果: ${result.result.name} - ${result.result.description}`)
    } catch (error) {
      message.error(extractErrorMessage(error, '观星失败'))
    }
  }

  async function handleChangeFate() {
    try {
      const result = await starPalaceStore.changeFate()
      message.success(`命运已改变: ${result.newResult.name}`)
    } catch (error) {
      message.error(extractErrorMessage(error, '改命失败'))
    }
  }
</script>

<style scoped>
  .stargaze-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: relative;
    overflow: hidden;
  }

  /* 背景星光粒子 */
  .fate-particles {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 0;
  }

  .fate-star {
    position: absolute;
    left: var(--x);
    top: var(--y);
    width: var(--size);
    height: var(--size);
    background: radial-gradient(circle, rgba(139, 92, 246, 0.9) 0%, rgba(168, 85, 247, 0.5) 50%, transparent 100%);
    border-radius: 50%;
    animation: fateTwinkle var(--duration) ease-in-out infinite;
    animation-delay: var(--delay);
  }

  @keyframes fateTwinkle {
    0%,
    100% {
      opacity: 0.3;
      transform: scale(0.8);
      filter: blur(0px);
    }
    50% {
      opacity: 1;
      transform: scale(1.3);
      filter: blur(1px);
    }
  }

  /* 卡片样式 */
  .stargaze-card,
  .change-fate-card {
    padding: 16px;
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(139, 92, 246, 0.03) 100%);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 12px;
    position: relative;
    z-index: 1;
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.08);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #8b5cf6;
    margin-bottom: 8px;
  }

  .card-desc {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin: 0 0 16px;
  }

  /* 结果卡片 */
  .result-card {
    display: flex;
    gap: 16px;
    padding: 16px;
    border-radius: 10px;
    margin-bottom: 12px;
  }

  .result-card.great-fortune {
    background: linear-gradient(135deg, rgba(250, 204, 21, 0.15) 0%, rgba(234, 179, 8, 0.15) 100%);
    border: 1px solid rgba(250, 204, 21, 0.3);
  }

  .result-card.fortune {
    background: linear-gradient(135deg, rgba(52, 211, 153, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%);
    border: 1px solid rgba(52, 211, 153, 0.3);
  }

  .result-card.neutral {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
  }

  .result-card.misfortune {
    background: linear-gradient(135deg, rgba(251, 146, 60, 0.15) 0%, rgba(249, 115, 22, 0.15) 100%);
    border: 1px solid rgba(251, 146, 60, 0.3);
  }

  .result-card.great-misfortune {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .result-icon {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    flex-shrink: 0;
    animation: resultIconPulse 2s ease-in-out infinite;
  }

  .great-fortune .result-icon {
    background: linear-gradient(135deg, #facc15 0%, #eab308 100%);
    color: white;
    box-shadow: 0 0 20px rgba(250, 204, 21, 0.5);
  }

  .fortune .result-icon {
    background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
    color: white;
    box-shadow: 0 0 15px rgba(52, 211, 153, 0.4);
  }

  .neutral .result-icon {
    background: var(--bg-secondary);
    color: var(--text-muted);
    animation: none;
  }

  .misfortune .result-icon {
    background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
    color: white;
    box-shadow: 0 0 15px rgba(251, 146, 60, 0.4);
  }

  .great-misfortune .result-icon {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
  }

  @keyframes resultIconPulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  .result-info {
    flex: 1;
  }

  .result-name {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .result-desc {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .result-bonus {
    display: flex;
    gap: 12px;
    font-size: 0.85rem;
    color: #52c41a;
  }

  .result-penalty {
    display: flex;
    gap: 12px;
    font-size: 0.85rem;
    color: #f5222d;
  }

  /* 无结果 */
  .no-result {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px;
    color: var(--text-muted);
    gap: 12px;
  }

  /* 冷却信息 */
  .cooldown-info {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px;
    background: rgba(250, 173, 20, 0.1);
    border-radius: 8px;
    font-size: 0.85rem;
    color: #faad14;
    margin-bottom: 12px;
  }

  /* 按钮 */
  .stargaze-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
    animation: stargazeBtnPulse 2s ease-in-out infinite;
  }

  @keyframes stargazeBtnPulse {
    0%,
    100% {
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
    }
    50% {
      box-shadow: 0 0 30px rgba(139, 92, 246, 0.6);
    }
  }

  .stargaze-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 25px rgba(139, 92, 246, 0.5);
    animation: none;
  }

  .stargaze-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 改命卡片 */
  .fate-info {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
  }

  .cost-info,
  .free-count {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .free-count {
    color: #52c41a;
  }

  .change-fate-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 0 15px rgba(245, 158, 11, 0.3);
  }

  .change-fate-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(245, 158, 11, 0.5);
  }

  .change-fate-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 概率说明 */
  .probability-info {
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    position: relative;
    z-index: 1;
  }

  .info-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 12px;
  }

  .prob-grid {
    display: flex;
    justify-content: space-between;
  }

  .prob-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    border-radius: 6px;
  }

  .prob-name {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .prob-value {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .prob-item.great-fortune .prob-name {
    color: #eab308;
  }

  .prob-item.fortune .prob-name {
    color: #10b981;
  }

  .prob-item.neutral .prob-name {
    color: var(--text-secondary);
  }

  .prob-item.misfortune .prob-name {
    color: #f97316;
  }

  .prob-item.great-misfortune .prob-name {
    color: #dc2626;
  }
</style>
