<template>
  <div class="taiyi-arts">
    <!-- 背景神识粒子 -->
    <div class="consciousness-particles">
      <div
        v-for="i in 15"
        :key="i"
        class="particle"
        :style="{ '--delay': i * 0.4 + 's', '--x': Math.random() * 100 + '%', '--size': Math.random() * 4 + 2 + 'px' }"
      />
    </div>

    <!-- 标题 -->
    <div class="page-header">
      <div class="header-glow" />
      <div class="header-icon">
        <div class="icon-pulse" />
        <Sparkles :size="24" />
      </div>
      <div class="header-text">
        <h1>神识与引道</h1>
        <p>太一门秘法，参悟五行大道</p>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <Loader2 :size="32" class="spin" />
      <span>正在感应神识...</span>
    </div>

    <!-- 非太一门弟子提示 -->
    <div v-else-if="!isTaiyiMember" class="not-member">
      <AlertCircle :size="48" />
      <h2>无法参悟</h2>
      <p>只有太一门弟子才能修习神识与引道之法</p>
    </div>

    <!-- 主内容 -->
    <template v-else>
      <!-- 神识状态 -->
      <div class="consciousness-card">
        <div class="consciousness-glow" />
        <div class="consciousness-left">
          <div class="consciousness-icon">
            <div class="consciousness-icon-pulse" />
            <Brain :size="22" />
          </div>
          <div class="consciousness-info">
            <div class="consciousness-row">
              <span class="consciousness-label">神识</span>
              <span class="consciousness-value">{{ consciousness }}</span>
            </div>
            <div class="consciousness-progress">
              <div class="progress-fill" :style="{ width: Math.min((consciousnessBonus / 20) * 100, 100) + '%' }" />
            </div>
          </div>
        </div>
        <div class="consciousness-right">
          <div class="effect-tag bonus">
            <TrendingUp :size="12" />
            <span>+{{ consciousnessBonus }}%</span>
          </div>
          <div v-if="totalDebuffEffect > 0" class="effect-tag debuff">
            <AlertTriangle :size="12" />
            <span>+{{ totalDebuffEffect }}%</span>
          </div>
        </div>
      </div>

      <!-- 当前增益状态 -->
      <div v-if="activeBuffText" class="active-buff">
        <div class="buff-icon" :style="{ background: getElementGradient(activeBuff!.element) }">
          <component :is="getElementIcon(activeBuff!.element)" :size="20" />
        </div>
        <div class="buff-content">
          <div class="buff-name">{{ activeBuffText.name }}</div>
          <div class="buff-desc">{{ activeBuffText.description }}</div>
        </div>
        <div class="buff-time">
          <Clock :size="14" />
          <span>{{ activeBuffText.remainingTime }}</span>
        </div>
      </div>

      <!-- 冷却提示 -->
      <div v-else-if="!canUseGuidance && guidanceCooldownText" class="cooldown-tip">
        <Clock :size="16" />
        <span>引道冷却中: {{ guidanceCooldownText }}</span>
      </div>

      <!-- 每日引道 -->
      <div class="section">
        <div class="section-header">
          <Compass :size="18" />
          <span>每日引道</span>
          <span class="section-hint">选择参悟一种大道</span>
        </div>

        <div class="elements-grid">
          <div
            v-for="elem in elements"
            :key="elem.element"
            class="element-card"
            :class="{ disabled: !canUseGuidance || actionLoading }"
            :style="{ '--element-color': getElementColor(elem.element) }"
            @click="handleGuidance(elem.element)"
          >
            <div class="element-glow" />
            <div class="element-icon" :style="{ background: getElementGradient(elem.element) }">
              <div class="element-icon-ring" :style="{ borderColor: getElementColor(elem.element) }" />
              <div class="element-icon-pulse" :style="{ background: getElementColor(elem.element) }" />
              <component :is="getElementIcon(elem.element)" :size="24" />
            </div>
            <div class="element-name">{{ elem.name }}</div>
            <div class="element-dao">{{ elem.daoName }}</div>
            <div class="element-buff" :style="{ color: getElementColor(elem.element) }">
              {{ elem.buff.name }}
            </div>
          </div>
        </div>

        <div class="guidance-reward">
          <Zap :size="14" />
          <span>每次引道获得 100 神识 + 12小时增益</span>
        </div>
      </div>

      <!-- 神识技能 -->
      <div class="section">
        <div class="section-header">
          <Target :size="18" />
          <span>神识技能</span>
        </div>

        <div class="skills-list">
          <!-- 道心通明 -->
          <div class="skill-item">
            <div class="skill-icon passive">
              <Shield :size="18" />
            </div>
            <div class="skill-content">
              <div class="skill-header">
                <span class="skill-name">道心通明</span>
                <span class="skill-type passive">被动</span>
              </div>
              <div class="skill-desc">每200点神识增加1%闭关成功率</div>
              <div class="skill-bonus">当前: +{{ consciousnessBonus }}% (上限20%)</div>
            </div>
          </div>

          <!-- 神识冲击 -->
          <div class="skill-item" :class="{ insufficient: consciousness < 100 }">
            <div class="skill-icon active">
              <Crosshair :size="18" />
            </div>
            <div class="skill-content">
              <div class="skill-header">
                <span class="skill-name">神识冲击</span>
                <span class="skill-type active">主动</span>
              </div>
              <div class="skill-desc">斗法追击，70%几率使对方失败率+15%</div>
              <div class="skill-cost">
                <span>消耗: 100神识</span>
                <span class="current">(当前: {{ consciousness }})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useTaiyiStore } from '@/stores/taiyi'
  import { extractErrorMessage } from '@/api'
  import type { ElementType } from '@/game/constants/taiyi'
  import { useMessage } from 'naive-ui'
  import { ELEMENT_COLORS, ELEMENT_GRADIENTS } from '@/game/constants/taiyi'
  import {
    Sparkles,
    Loader2,
    AlertCircle,
    Brain,
    TrendingUp,
    AlertTriangle,
    Zap,
    Clock,
    Compass,
    Target,
    Shield,
    Crosshair,
    Circle,
    Leaf,
    Droplets,
    Flame,
    Mountain
  } from 'lucide-vue-next'

  const taiyiStore = useTaiyiStore()
  const {
    loading,
    actionLoading,
    isTaiyiMember,
    consciousness,
    consciousnessBonus,
    canUseGuidance,
    guidanceCooldownText,
    activeBuff,
    activeBuffText,
    totalDebuffEffect,
    elements
  } = storeToRefs(taiyiStore)

  const message = useMessage()

  function getElementColor(element: ElementType): string {
    return ELEMENT_COLORS[element]
  }

  function getElementGradient(element: ElementType): string {
    return ELEMENT_GRADIENTS[element]
  }

  function getElementIcon(element: ElementType) {
    const icons = {
      metal: Circle,
      wood: Leaf,
      water: Droplets,
      fire: Flame,
      earth: Mountain
    }
    return icons[element]
  }

  async function handleGuidance(element: ElementType) {
    if (!canUseGuidance.value || actionLoading.value) return

    try {
      const result = await taiyiStore.useGuidance(element)
      message.success(result.message)
    } catch (error) {
      message.error(extractErrorMessage(error, '引道失败'))
    }
  }

  onMounted(async () => {
    try {
      await taiyiStore.initialize()
    } catch (error) {
      console.error('初始化太一门系统失败:', error)
    }
  })
</script>

<style scoped>
  .taiyi-arts {
    padding: 16px;
    max-width: 480px;
    margin: 0 auto;
    position: relative;
    overflow: hidden;
  }

  /* ========== 神识粒子效果 ========== */
  .consciousness-particles {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }

  .consciousness-particles .particle {
    position: absolute;
    width: var(--size);
    height: var(--size);
    background: radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, transparent 70%);
    border-radius: 50%;
    left: var(--x);
    animation: floatUp 10s ease-in-out infinite;
    animation-delay: var(--delay);
    opacity: 0;
  }

  @keyframes floatUp {
    0% {
      transform: translateY(100vh) scale(0.5);
      opacity: 0;
    }
    10% {
      opacity: 0.7;
    }
    90% {
      opacity: 0.7;
    }
    100% {
      transform: translateY(-20vh) scale(1);
      opacity: 0;
    }
  }

  /* 页面标题 */
  .page-header {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    z-index: 1;
  }

  .header-glow {
    position: absolute;
    top: -20px;
    left: -20px;
    width: 100px;
    height: 100px;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
    animation: headerPulse 3s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes headerPulse {
    0%,
    100% {
      opacity: 0.5;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.2);
    }
  }

  .header-icon {
    position: relative;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
    border-radius: 12px;
    color: white;
    z-index: 1;
  }

  .icon-pulse {
    position: absolute;
    width: 100%;
    height: 100%;
    background: inherit;
    border-radius: inherit;
    animation: iconPulse 2s ease-in-out infinite;
    z-index: -1;
  }

  @keyframes iconPulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.5;
    }
    50% {
      transform: scale(1.3);
      opacity: 0;
    }
  }

  .header-text h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .header-text p {
    margin: 2px 0 0;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  /* 加载状态 */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px 20px;
    color: var(--text-muted);
    gap: 12px;
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

  /* 非成员提示 */
  .not-member {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px 20px;
    color: var(--text-muted);
    text-align: center;
  }

  .not-member h2 {
    margin: 16px 0 8px;
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  .not-member p {
    margin: 0;
    font-size: 0.9rem;
  }

  /* 神识卡片 */
  .consciousness-card {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(139, 92, 246, 0.06) 100%);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 10px;
    margin-bottom: 12px;
    overflow: hidden;
    z-index: 1;
  }

  .consciousness-glow {
    position: absolute;
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    width: 80px;
    height: 80px;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%);
    animation: consciousnessGlow 3s ease-in-out infinite alternate;
    pointer-events: none;
  }

  @keyframes consciousnessGlow {
    0% {
      opacity: 0.4;
      transform: translateY(-50%) translateX(-20px);
    }
    100% {
      opacity: 0.8;
      transform: translateY(-50%) translateX(10px);
    }
  }

  .consciousness-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    position: relative;
    z-index: 1;
  }

  .consciousness-icon {
    position: relative;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
    border-radius: 8px;
    color: white;
    flex-shrink: 0;
  }

  .consciousness-icon-pulse {
    position: absolute;
    width: 100%;
    height: 100%;
    background: inherit;
    border-radius: inherit;
    animation: consciousnessIconPulse 2.5s ease-in-out infinite;
    z-index: -1;
  }

  @keyframes consciousnessIconPulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.4;
    }
    50% {
      transform: scale(1.4);
      opacity: 0;
    }
  }

  .consciousness-info {
    flex: 1;
    min-width: 0;
  }

  .consciousness-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 4px;
  }

  .consciousness-label {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .consciousness-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: #8b5cf6;
  }

  .consciousness-progress {
    height: 4px;
    background: rgba(139, 92, 246, 0.15);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #8b5cf6, #a78bfa);
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .consciousness-right {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }

  .effect-tag {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .effect-tag.bonus {
    background: rgba(82, 196, 26, 0.1);
    color: #52c41a;
  }

  .effect-tag.debuff {
    background: rgba(245, 34, 45, 0.1);
    color: #f5222d;
  }

  /* 当前增益 */
  .active-buff {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    background: var(--bg-card);
    border: 1px solid rgba(139, 92, 246, 0.25);
    border-radius: 10px;
    margin-bottom: 12px;
  }

  .buff-icon {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    color: white;
    flex-shrink: 0;
  }

  .buff-content {
    flex: 1;
    min-width: 0;
  }

  .buff-name {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  .buff-desc {
    font-size: 0.75rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .buff-time {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: rgba(139, 92, 246, 0.1);
    border-radius: 6px;
    font-size: 0.75rem;
    color: #8b5cf6;
    flex-shrink: 0;
  }

  /* 冷却提示 */
  .cooldown-tip {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    background: rgba(250, 173, 20, 0.08);
    border: 1px solid rgba(250, 173, 20, 0.2);
    border-radius: 8px;
    margin-bottom: 12px;
    font-size: 0.85rem;
    color: #faad14;
  }

  /* 区块 */
  .section {
    position: relative;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 12px;
    z-index: 1;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 14px;
  }

  .section-hint {
    margin-left: auto;
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--text-muted);
  }

  /* 五行网格 */
  .elements-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }

  .element-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 4px;
    background: var(--bg-secondary);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    overflow: hidden;
  }

  .element-glow {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 60px;
    background: radial-gradient(circle, var(--element-color) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .element-card:hover:not(.disabled) .element-glow {
    opacity: 0.15;
  }

  .element-card:hover:not(.disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--element-color);
  }

  .element-card:active:not(.disabled) {
    transform: translateY(0);
  }

  .element-card.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .element-icon {
    position: relative;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    color: white;
    margin-bottom: 6px;
    z-index: 1;
  }

  .element-icon-ring {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    border: 2px solid currentColor;
    animation: elementRing 2s ease-out infinite;
    pointer-events: none;
    opacity: 0;
  }

  @keyframes elementRing {
    0% {
      transform: scale(1);
      opacity: 0.7;
    }
    100% {
      transform: scale(1.8);
      opacity: 0;
    }
  }

  .element-icon-pulse {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    animation: elementPulse 2.5s ease-in-out infinite;
    pointer-events: none;
    opacity: 0;
  }

  @keyframes elementPulse {
    0%,
    100% {
      transform: scale(0.85);
      opacity: 0;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.35;
    }
  }

  .element-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .element-dao {
    font-size: 0.65rem;
    color: var(--text-muted);
    margin-bottom: 2px;
  }

  .element-buff {
    font-size: 0.65rem;
    font-weight: 500;
  }

  .guidance-reward {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px;
    background: rgba(139, 92, 246, 0.06);
    border-radius: 6px;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .guidance-reward svg {
    color: #8b5cf6;
  }

  /* 技能列表 */
  .skills-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .skill-item {
    display: flex;
    gap: 12px;
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 10px;
  }

  .skill-item.insufficient {
    opacity: 0.6;
  }

  .skill-icon {
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    flex-shrink: 0;
  }

  .skill-icon.passive {
    background: rgba(82, 196, 26, 0.1);
    color: #52c41a;
  }

  .skill-icon.active {
    background: rgba(139, 92, 246, 0.1);
    color: #8b5cf6;
  }

  .skill-content {
    flex: 1;
    min-width: 0;
  }

  .skill-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .skill-name {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  .skill-type {
    font-size: 0.65rem;
    padding: 1px 5px;
    border-radius: 4px;
  }

  .skill-type.passive {
    background: rgba(82, 196, 26, 0.1);
    color: #52c41a;
  }

  .skill-type.active {
    background: rgba(139, 92, 246, 0.1);
    color: #8b5cf6;
  }

  .skill-desc {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }

  .skill-bonus {
    font-size: 0.75rem;
    color: #52c41a;
  }

  .skill-cost {
    font-size: 0.75rem;
    color: #8b5cf6;
  }

  .skill-cost .current {
    color: var(--text-muted);
    margin-left: 4px;
  }

  .skill-item.insufficient .skill-cost .current {
    color: #f5222d;
  }

  /* 响应式 */
  @media (max-width: 360px) {
    .elements-grid {
      grid-template-columns: repeat(3, 1fr);
    }

    .element-card:nth-child(4),
    .element-card:nth-child(5) {
      grid-column: span 1;
    }
  }
</style>
