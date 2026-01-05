<template>
  <div class="cultivation-page">
    <!-- 顶部信息栏：境界 + 战力 -->
    <div class="top-bar">
      <div class="realm-badge" :class="`realm-tier-${realmTier}`">
        <Sparkles :size="16" class="realm-icon" />
        <span class="realm-text">{{ playerStore.realmDisplay }}</span>
      </div>
      <div class="top-right">
        <div class="combat-power">
          <TrendingUp :size="14" />
          <span>{{ playerStore.combatPower }}</span>
        </div>
        <div v-if="cultivationStore.peaceMode" class="peace-tag">
          <ShieldOff :size="12" />
        </div>
      </div>
    </div>

    <!-- 核心修炼区域 -->
    <div class="main-cultivation-area" :class="{ cultivating: cultivationStore.isCultivating || cultivationStore.deepSession?.isActive }">
      <!-- 背景灵气效果 -->
      <div class="spirit-bg">
        <div class="spirit-line" v-for="i in 6" :key="i" :style="{ '--delay': i * 0.5 + 's' }" />
      </div>

      <!-- 能量粒子 -->
      <div class="particles-container">
        <div class="particle" v-for="i in 12" :key="i" :style="getParticleStyle(i)" />
      </div>

      <!-- 外围光环 -->
      <div class="outer-rings">
        <div class="ring ring-1" :class="{ active: cultivationStore.isCultivating }" />
        <div class="ring ring-2" :class="{ active: cultivationStore.isCultivating }" />
        <div class="ring ring-3" :class="{ active: progressPercentage >= 100 }" />
      </div>

      <!-- 修炼球体 -->
      <div class="cultivation-orb" :class="{ breakthrough: progressPercentage >= 100 }">
        <div class="orb-glow" />
        <div class="orb-core">
          <div class="orb-inner" :class="{ pulsing: cultivationStore.isCultivating, deep: cultivationStore.deepSession?.isActive }">
            <div class="inner-particles">
              <span v-for="i in 6" :key="i" class="inner-particle" :style="{ '--i': i }" />
            </div>
            <Moon v-if="cultivationStore.deepSession?.isActive" :size="32" class="orb-icon deep" />
            <Sparkles v-else :size="32" class="orb-icon" />
          </div>
        </div>
        <svg class="progress-ring" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color: #7a9e8e" />
              <stop offset="50%" style="stop-color: #c9a959" />
              <stop offset="100%" style="stop-color: #7a9e8e" />
            </linearGradient>
          </defs>
          <circle class="ring-bg" cx="60" cy="60" r="54" />
          <circle
            class="ring-progress"
            :class="{ full: progressPercentage >= 100 }"
            cx="60"
            cy="60"
            r="54"
            :style="{ strokeDashoffset: ringOffset }"
          />
        </svg>
        <!-- 八卦符文 -->
        <div class="bagua-symbols" :class="{ rotating: cultivationStore.isCultivating }">
          <span class="symbol" v-for="i in 8" :key="i" :style="{ '--angle': (i - 1) * 45 + 'deg' }">{{ baguaSymbols[i - 1] }}</span>
        </div>
      </div>

      <!-- 修炼状态文字 -->
      <div class="cultivation-status">
        <template v-if="cultivationStore.deepSession?.isActive">
          <span class="status-main deep">神游太虚中</span>
          <span class="status-sub">{{ deepSessionRemainingTime }}</span>
        </template>
        <template v-else-if="cultivationStore.isCultivating">
          <span class="status-main">修炼中...</span>
        </template>
        <template v-else>
          <span class="status-main">{{ progressPercentage }}%</span>
          <span class="status-sub" v-if="progressPercentage >= 100">修为圆满</span>
          <span class="status-sub" v-else>距突破</span>
        </template>
      </div>
    </div>

    <!-- 丹毒警告 -->
    <div v-if="cultivationStore.totalPoisonStacks > 0" class="poison-banner">
      <AlertTriangle :size="14" />
      <span>丹毒 {{ cultivationStore.totalPoisonStacks }} 层（-{{ cultivationStore.totalPoisonStacks * 5 }}%收益）</span>
    </div>

    <!-- 道心破碎警告 -->
    <div v-if="playerStore.isSoulShattered" class="shattered-banner">
      <HeartCrack :size="14" />
      <span>道心破碎（闭关收益-50%）</span>
      <span class="shattered-time">{{ shatteredCountdown }}</span>
    </div>

    <!-- 深度闭关控制 -->
    <div v-if="cultivationStore.deepSession?.isActive" class="deep-control-bar">
      <button class="exit-btn" @click="handleForceExit">
        <LogOut :size="16" />
        <span>强行出关</span>
      </button>
      <span class="exit-warning">提前出关收益减半</span>
    </div>

    <!-- 道心与概率 -->
    <div class="info-cards" v-if="!cultivationStore.deepSession?.isActive">
      <div class="info-card dao-card">
        <div class="card-header">
          <Brain :size="14" />
          <span>道心</span>
        </div>
        <div class="dao-level" :style="{ color: cultivationStore.daoHeart.color }">
          {{ cultivationStore.daoHeart.name }}
        </div>
        <div class="mini-progress">
          <div class="mini-fill" :style="{ width: activityPercentage + '%' }" />
        </div>
        <span class="card-sub">活跃度 {{ cultivationStore.activityPoints }}</span>
      </div>

      <div class="info-card rates-card" v-if="cultivationStore.cultivationRates">
        <div class="card-header">
          <Target :size="14" />
          <span>概率</span>
        </div>
        <div class="rates-row">
          <div class="rate-item">
            <span class="rate-val success">{{ formatPercent(cultivationStore.cultivationRates.successRate) }}</span>
            <span class="rate-lbl">成功</span>
          </div>
          <div class="rate-item">
            <span class="rate-val critical">
              {{ formatPercent(cultivationStore.cultivationRates.criticalSuccessRate * cultivationStore.cultivationRates.successRate) }}
            </span>
            <span class="rate-lbl">大悟</span>
          </div>
          <div class="rate-item">
            <span class="rate-val failure">{{ formatPercent(cultivationStore.cultivationRates.failureRate) }}</span>
            <span class="rate-lbl">失败</span>
          </div>
          <div class="rate-item">
            <span class="rate-val danger">{{ formatPercent(cultivationStore.cultivationRates.criticalFailureRate) }}</span>
            <span class="rate-lbl">入魔</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 渡劫面板 - 当处于渡劫境界时显示 -->
    <div v-if="currentTribulation && tribulationInfo" class="tribulation-panel">
      <div class="tribulation-header">
        <Flame :size="20" class="tribulation-icon" />
        <span class="tribulation-title">{{ tribulationInfo.name }}</span>
        <span v-if="tribulationInfo.dangerous" class="danger-badge">危</span>
      </div>

      <p class="tribulation-desc">{{ tribulationInfo.description }}</p>

      <!-- 所需物品 -->
      <div class="tribulation-items" v-if="tribulationInfo.status?.requiredItems?.length">
        <div class="items-title">所需物品</div>
        <div class="items-list">
          <div
            v-for="item in tribulationInfo.status.requiredItems"
            :key="item.itemId"
            class="item-row"
            :class="{ sufficient: item.owned >= item.required }"
          >
            <span class="item-name">{{ item.name }}</span>
            <span class="item-count">
              <span :class="{ insufficient: item.owned < item.required }">{{ item.owned }}</span>
              / {{ item.required }}
            </span>
            <component :is="item.owned >= item.required ? Check : X" :size="14" class="item-status" />
          </div>
        </div>
      </div>

      <!-- 成功率 -->
      <div v-if="tribulationInfo.status?.successRate" class="success-rate">
        <span class="rate-label">成功率</span>
        <span class="rate-value">{{ (tribulationInfo.status.successRate * 100).toFixed(1) }}%</span>
      </div>

      <!-- 不满足条件提示 -->
      <div v-if="tribulationInfo.status?.reason" class="tribulation-reason">
        <AlertTriangle :size="14" />
        <span>{{ tribulationInfo.status.reason }}</span>
      </div>

      <!-- 渡劫按钮 -->
      <button
        class="tribulation-btn"
        :class="{
          disabled: !tribulationInfo.status?.canAttempt,
          dangerous: tribulationInfo.dangerous,
          attempting: tribulationStore.attempting
        }"
        :disabled="!tribulationInfo.status?.canAttempt || tribulationStore.attempting"
        @click="confirmTribulation"
      >
        <Loader2 v-if="tribulationStore.attempting" :size="18" class="spinning" />
        <Flame v-else :size="18" />
        <span>{{ tribulationStore.attempting ? '渡劫中...' : '尝试渡劫' }}</span>
      </button>

      <p v-if="tribulationInfo.dangerous" class="danger-warning">警告：渡劫失败将导致形神俱灭，角色永久死亡！</p>
    </div>

    <!-- 属性面板 -->
    <div class="stats-panel">
      <div class="stats-header">
        <Activity :size="14" />
        <span>属性</span>
      </div>
      <div class="stats-grid">
        <div class="stat-item">
          <Heart :size="16" class="stat-icon hp" />
          <span class="stat-val">{{ playerStore.stats?.maxHp || 0 }}</span>
          <span class="stat-lbl">生命</span>
        </div>
        <div class="stat-item">
          <Zap :size="16" class="stat-icon mp" />
          <span class="stat-val">{{ playerStore.stats?.maxMp || 0 }}</span>
          <span class="stat-lbl">灵力</span>
        </div>
        <div class="stat-item">
          <Sword :size="16" class="stat-icon attack" />
          <span class="stat-val">{{ playerStore.stats?.attack || 0 }}</span>
          <span class="stat-lbl">攻击</span>
        </div>
        <div class="stat-item">
          <Shield :size="16" class="stat-icon defense" />
          <span class="stat-val">{{ playerStore.stats?.defense || 0 }}</span>
          <span class="stat-lbl">防御</span>
        </div>
        <div class="stat-item">
          <Wind :size="16" class="stat-icon speed" />
          <span class="stat-val">{{ playerStore.stats?.speed || 0 }}</span>
          <span class="stat-lbl">速度</span>
        </div>
        <div class="stat-item">
          <Sparkles :size="16" class="stat-icon luck" />
          <span class="stat-val">{{ playerStore.stats?.luck || 0 }}</span>
          <span class="stat-lbl">幸运</span>
        </div>
      </div>
    </div>

    <!-- 操作按钮区 -->
    <div class="action-area" v-if="!cultivationStore.deepSession?.isActive">
      <!-- 主按钮：闭关修炼 -->
      <button
        v-if="!cultivationStore.isCultivating"
        class="main-action-btn"
        :class="{ disabled: !canCultivate }"
        :disabled="!canCultivate"
        @click="handleCultivation"
      >
        <Sparkles :size="22" />
        <span v-if="cooldownStatus.canCultivate">闭关修炼</span>
        <span v-else>{{ cooldownStatus.remainingTimeDisplay }}</span>
      </button>
      <button v-else class="main-action-btn cultivating">
        <Loader2 :size="22" class="spinning" />
        <span>修炼中</span>
      </button>

      <!-- 次要按钮行 -->
      <div class="secondary-actions">
        <button
          class="secondary-btn deep"
          :class="{ disabled: !canStartDeepCultivation }"
          :disabled="!canStartDeepCultivation"
          @click="handleDeepCultivation"
        >
          <Moon :size="16" />
          <span v-if="deepCooldownStatus.canCultivate">神游太虚</span>
          <span v-else>{{ deepCooldownStatus.remainingTimeDisplay }}</span>
        </button>
        <button
          v-if="cultivationStore.canTogglePeaceMode"
          class="secondary-btn peace"
          :class="{ active: cultivationStore.peaceMode }"
          @click="handleTogglePeaceMode"
        >
          <component :is="cultivationStore.peaceMode ? ShieldOff : ShieldCheck" :size="16" />
          <span>{{ cultivationStore.peaceMode ? '入世' : '避世' }}</span>
        </button>
      </div>
    </div>

    <!-- 修炼结果弹窗 -->
    <NModal v-model:show="cultivationStore.showResultModal" :mask-closable="true" preset="card" :style="{ width: '360px' }">
      <template #header>
        <div class="result-header" v-if="cultivationStore.lastResult">
          <component :is="getResultIcon(cultivationStore.lastResult.outcome.type)" :size="24" />
          <span :style="{ color: cultivationStore.lastResult.outcome.color }">
            {{ cultivationStore.lastResult.outcome.label }}
          </span>
        </div>
      </template>

      <div class="result-content" v-if="cultivationStore.lastResult">
        <p class="result-message">{{ getMainMessage(cultivationStore.lastResult.message) }}</p>

        <!-- 奇遇信息 -->
        <div v-if="cultivationStore.lastResult.adventure" class="adventure-box">
          <div class="adventure-header">
            <Gift :size="16" />
            <span class="adventure-title">{{ cultivationStore.lastResult.adventure.name }}</span>
            <span class="adventure-rarity" :class="cultivationStore.lastResult.adventure.rarity">
              {{ getRarityLabel(cultivationStore.lastResult.adventure.rarity) }}
            </span>
          </div>
          <p class="adventure-desc">{{ cultivationStore.lastResult.adventure.description }}</p>
          <div class="adventure-bonus" v-if="cultivationStore.lastResult.adventure.expBonus > 0">
            额外修为 +{{ cultivationStore.lastResult.adventure.expBonus }}
          </div>
        </div>

        <div class="result-exp" :class="cultivationStore.lastResult.outcome.type">
          <span class="exp-label">修为变化</span>
          <span class="exp-value" :class="{ negative: cultivationStore.lastResult.finalExp < 0 }">
            {{ cultivationStore.lastResult.finalExp >= 0 ? '+' : '' }}{{ cultivationStore.lastResult.finalExp }}
          </span>
        </div>

        <!-- 突破信息 -->
        <div v-if="cultivationStore.lastResult.breakthrough" class="breakthrough-box">
          <div class="breakthrough-header">
            <ArrowBigUp :size="20" />
            <span
              v-if="
                cultivationStore.lastResult.breakthrough.breakthroughCount && cultivationStore.lastResult.breakthrough.breakthroughCount > 1
              "
            >
              连续突破 {{ cultivationStore.lastResult.breakthrough.breakthroughCount }} 次！
            </span>
            <span v-else>境界突破！</span>
          </div>
          <p class="breakthrough-realm">{{ cultivationStore.lastResult.breakthrough.newRealmName }}</p>
          <p class="breakthrough-msg">{{ cultivationStore.lastResult.breakthrough.message }}</p>
        </div>

        <div class="result-details">
          <div class="detail-item">
            <span>道心境界</span>
            <span :style="{ color: cultivationStore.lastResult.daoHeart.color }">
              {{ cultivationStore.lastResult.daoHeart.name }}
            </span>
          </div>
          <div class="detail-item">
            <span>下次冷却</span>
            <span>{{ Math.floor(cultivationStore.lastResult.cooldown / 60000) }}分钟</span>
          </div>
        </div>
      </div>

      <template #footer>
        <NButton type="primary" block @click="cultivationStore.closeResultModal">确定</NButton>
      </template>
    </NModal>

    <!-- 深度闭关结果弹窗 -->
    <NModal v-model:show="cultivationStore.showDeepResultModal" :mask-closable="true" preset="card" :style="{ width: '380px' }">
      <template #header>
        <div class="result-header">
          <Moon :size="24" />
          <span class="deep-result-title">神游太虚结算</span>
        </div>
      </template>

      <div class="deep-result-content" v-if="cultivationStore.deepResult">
        <div class="deep-summary">
          <div class="summary-row">
            <span>闭关次数</span>
            <span>{{ cultivationStore.deepResult.totalSessions }}次</span>
          </div>
          <div class="summary-row success">
            <span>成功</span>
            <span>{{ cultivationStore.deepResult.successCount + cultivationStore.deepResult.criticalSuccessCount }}次</span>
          </div>
          <div class="summary-row failure">
            <span>失败</span>
            <span>{{ cultivationStore.deepResult.failureCount + cultivationStore.deepResult.criticalFailureCount }}次</span>
          </div>
          <div class="summary-row special" v-if="cultivationStore.deepResult.criticalSuccessCount > 0">
            <span>大彻大悟</span>
            <span>{{ cultivationStore.deepResult.criticalSuccessCount }}次</span>
          </div>
          <div class="summary-row danger" v-if="cultivationStore.deepResult.criticalFailureCount > 0">
            <span>走火入魔</span>
            <span>{{ cultivationStore.deepResult.criticalFailureCount }}次</span>
          </div>
        </div>

        <div v-if="cultivationStore.deepResult.wasEarlyExit" class="early-exit-warning">提前出关，收益减半</div>

        <div class="deep-exp-result">
          <span class="exp-label">总修为变化</span>
          <span class="exp-value" :class="{ negative: cultivationStore.deepResult.totalExp < 0 }">
            {{ cultivationStore.deepResult.totalExp >= 0 ? '+' : '' }}{{ cultivationStore.deepResult.totalExp }}
          </span>
        </div>

        <!-- 突破信息 -->
        <div v-if="cultivationStore.deepResult.breakthrough" class="breakthrough-box">
          <div class="breakthrough-header">
            <ArrowBigUp :size="20" />
            <span
              v-if="
                cultivationStore.deepResult.breakthrough.breakthroughCount && cultivationStore.deepResult.breakthrough.breakthroughCount > 1
              "
            >
              连续突破 {{ cultivationStore.deepResult.breakthrough.breakthroughCount }} 次！
            </span>
            <span v-else>境界突破！</span>
          </div>
          <p class="breakthrough-realm">{{ cultivationStore.deepResult.breakthrough.newRealmName }}</p>
          <p class="breakthrough-msg">{{ cultivationStore.deepResult.breakthrough.message }}</p>
        </div>

        <div v-if="cultivationStore.deepResult.adventures.length > 0" class="deep-adventures">
          <div class="adventures-title">
            <Gift :size="16" />
            <span>奇遇汇总（{{ cultivationStore.deepResult.adventures.length }}次）</span>
          </div>
          <div class="adventure-list">
            <div v-for="(adv, index) in cultivationStore.deepResult.adventures" :key="index" class="adventure-item">
              <span class="adv-name">{{ adv.name }}</span>
              <span class="adv-rarity" :class="adv.rarity">{{ getRarityLabel(adv.rarity) }}</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <NButton type="primary" block @click="cultivationStore.closeDeepResultModal">确定</NButton>
      </template>
    </NModal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { usePlayerStore } from '@/stores/player'
  import { useCultivationStore } from '@/stores/cultivation'
  import { useTribulationStore } from '@/stores/tribulation'
  import { DAO_HEART_LEVELS, checkCooldown, DEEP_CULTIVATION_COOLDOWN, type CultivationResult } from '@/game/systems/cultivation'
  import { NModal, NButton, useMessage, useDialog } from 'naive-ui'
  import {
    Heart,
    Zap,
    Sword,
    Shield,
    Wind,
    Sparkles,
    TrendingUp,
    Brain,
    Target,
    Loader2,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Star,
    Moon,
    LogOut,
    ShieldOff,
    ShieldCheck,
    Gift,
    Activity,
    ArrowBigUp,
    Flame,
    Check,
    X,
    HeartCrack
  } from 'lucide-vue-next'
  import { useRouter } from 'vue-router'

  const playerStore = usePlayerStore()
  const cultivationStore = useCultivationStore()
  const tribulationStore = useTribulationStore()
  const router = useRouter()
  const message = useMessage()
  const dialog = useDialog()

  // 用于触发冷却时间动态更新的定时器
  const now = ref(Date.now())
  let cooldownTimer: ReturnType<typeof setInterval> | null = null

  // 动态计算冷却状态（每秒更新）
  const cooldownStatus = computed(() => {
    // 引用 now.value 使其成为响应式依赖
    void now.value
    return checkCooldown(cultivationStore.lastCultivationTime, cultivationStore.currentCooldown)
  })

  const deepCooldownStatus = computed(() => {
    void now.value
    return checkCooldown(cultivationStore.lastDeepCultivationTime, DEEP_CULTIVATION_COOLDOWN)
  })

  const deepSessionRemainingTime = computed(() => {
    void now.value
    if (!cultivationStore.deepSession?.isActive) return null
    const remaining = cultivationStore.deepSession.endTime - Date.now()
    if (remaining <= 0) return null

    const hours = Math.floor(remaining / 3600000)
    const minutes = Math.floor((remaining % 3600000) / 60000)
    return `${hours}时${minutes}分`
  })

  const canCultivate = computed(() => {
    return (
      cooldownStatus.value.canCultivate &&
      !cultivationStore.isCultivating &&
      playerStore.spiritRoot &&
      !cultivationStore.deepSession?.isActive
    )
  })

  const canStartDeepCultivation = computed(() => {
    return deepCooldownStatus.value.canCultivate && !cultivationStore.deepSession?.isActive && playerStore.spiritRoot
  })

  // 道心破碎倒计时
  const shatteredCountdown = computed(() => {
    if (!playerStore.soulStatus?.shattered?.expiresAt) return ''
    const remaining = playerStore.soulStatus.shattered.expiresAt - Date.now()
    if (remaining <= 0) return ''

    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}时${minutes}分`
  })

  // ========== 渡劫相关 ==========
  // 判断是否处于渡劫境界
  const currentTribulation = computed(() => {
    const tier = playerStore.character?.realm?.tier
    const subTier = playerStore.character?.realm?.subTier
    const progress = playerStore.character?.realmProgress || 0

    // 炼气圆满(tier=1, subTier=4, progress>=100) -> 筑基之劫
    if (tier === 1 && subTier === 4 && progress >= 100) {
      return 'foundation'
    }
    // 筑基圆满(tier=2, subTier=4, progress>=100) -> 结丹之劫
    if (tier === 2 && subTier === 4 && progress >= 100) {
      return 'core_formation'
    }
    // 结丹圆满(tier=3, subTier=4, progress>=100) -> 元婴之劫
    if (tier === 3 && subTier === 4 && progress >= 100) {
      return 'nascent_soul'
    }
    return null
  })

  const tribulationInfo = computed(() => {
    const type = currentTribulation.value
    if (!type) return null

    if (type === 'foundation') {
      return {
        name: '筑基之劫',
        description: '炼气圆满，需渡筑基之劫方可突破至筑基期',
        dangerous: false,
        status: tribulationStore.foundation
      }
    }
    if (type === 'core_formation') {
      return {
        name: '结丹之劫',
        description: '筑基圆满，需渡结丹之劫方可突破至结丹期。失败将形神俱灭！',
        dangerous: true,
        status: tribulationStore.coreFormation
      }
    }
    if (type === 'nascent_soul') {
      return {
        name: '元婴之劫',
        description: '结丹圆满，需渡元婴之劫方可突破至元婴期。失败将形神俱灭！',
        dangerous: true,
        status: tribulationStore.nascentSoul
      }
    }
    return null
  })

  // 确认渡劫
  const confirmTribulation = () => {
    const type = currentTribulation.value
    if (!type) return

    const info = tribulationInfo.value
    if (!info) return

    if (info.dangerous) {
      dialog.warning({
        title: '危险警告',
        content: `渡${info.name}失败会导致形神俱灭！确定要尝试渡劫吗？此操作不可逆！`,
        positiveText: '确定渡劫',
        negativeText: '取消',
        onPositiveClick: async () => {
          await attemptTribulation(type)
        }
      })
    } else {
      attemptTribulation(type)
    }
  }

  // 执行渡劫
  const attemptTribulation = async (type: string) => {
    let result
    if (type === 'foundation') {
      result = await tribulationStore.attemptFoundation()
    } else if (type === 'core_formation') {
      result = await tribulationStore.attemptCoreFormation()
    } else if (type === 'nascent_soul') {
      result = await tribulationStore.attemptNascentSoul()
    }

    if (result) {
      if (result.characterDied) {
        message.error(result.message)
        setTimeout(() => {
          router.push('/create-character')
        }, 2000)
      } else if (result.success) {
        message.success(result.message)
        // 刷新玩家数据
        await playerStore.fetchStats()
      } else {
        message.warning(result.message)
      }
    }
  }

  onMounted(async () => {
    try {
      await playerStore.fetchStats()
      cultivationStore.init()
      // 获取渡劫状态
      tribulationStore.fetchStatus()
      // 获取神魂状态
      playerStore.fetchSoulStatus()
    } catch (error) {
      console.error('初始化失败:', error)
      // Token过期等错误会由axios拦截器处理
    }

    // 每秒更新一次时间，触发冷却时间重新计算
    cooldownTimer = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  })

  onUnmounted(() => {
    if (cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  })

  const progressPercentage = computed(() => playerStore.character?.realmProgress || 0)
  const realmTier = computed(() => playerStore.character?.realm?.tier || 1)

  // 八卦符文
  const baguaSymbols = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷']

  // 粒子样式生成
  const getParticleStyle = (index: number) => {
    const angle = (index / 12) * 360
    const delay = index * 0.3
    const duration = 3 + Math.random() * 2
    const distance = 60 + Math.random() * 30
    return {
      '--angle': `${angle}deg`,
      '--delay': `${delay}s`,
      '--duration': `${duration}s`,
      '--distance': `${distance}px`
    }
  }

  // 环形进度条偏移量计算 (周长 = 2 * PI * r = 2 * 3.14159 * 54 ≈ 339)
  const ringOffset = computed(() => {
    const circumference = 2 * Math.PI * 54
    const progress = progressPercentage.value / 100
    return circumference * (1 - progress)
  })

  const activityPercentage = computed(() => {
    const current = cultivationStore.activityPoints
    const currentLevel = cultivationStore.daoHeart
    const nextLevel = DAO_HEART_LEVELS.find(l => l.level === currentLevel.level + 1)
    if (!nextLevel) return 100
    const range = nextLevel.minActivity - currentLevel.minActivity
    const progress = current - currentLevel.minActivity
    return Math.min(100, Math.max(0, (progress / range) * 100))
  })

  const formatPercent = (value: number): string => {
    return (value * 100).toFixed(1) + '%'
  }

  const getResultIcon = (type: CultivationResult) => {
    switch (type) {
      case 'critical_success':
        return Star
      case 'success':
        return CheckCircle
      case 'failure':
        return AlertTriangle
      case 'critical_failure':
        return XCircle
    }
  }

  const getMainMessage = (fullMessage: string): string => {
    return fullMessage.split('\n\n')[0] || fullMessage
  }

  const getRarityLabel = (rarity: string): string => {
    const labels: Record<string, string> = {
      common: '普通',
      rare: '稀有',
      epic: '史诗',
      legendary: '传说'
    }
    return labels[rarity] || rarity
  }

  const handleCultivation = async () => {
    if (!canCultivate.value) {
      if (!cooldownStatus.value.canCultivate) {
        message.warning(`修炼冷却中，请${cooldownStatus.value.remainingTimeDisplay}后再试`)
      }
      return
    }
    await cultivationStore.startCultivation()
  }

  const handleDeepCultivation = () => {
    if (!canStartDeepCultivation.value) {
      if (!deepCooldownStatus.value.canCultivate) {
        message.warning(`神游太虚冷却中，请${deepCooldownStatus.value.remainingTimeDisplay}后再试`)
      }
      return
    }

    dialog.warning({
      title: '神游太虚',
      content: '即将进入8小时深度闭关，期间将自动进行多次修炼。每日仅可进行一次，确定开始？',
      positiveText: '开始',
      negativeText: '取消',
      onPositiveClick: () => {
        cultivationStore.startDeepCultivation()
        message.success('已进入神游太虚状态')
      }
    })
  }

  const handleForceExit = () => {
    dialog.warning({
      title: '强行出关',
      content: '提前出关将只能获得50%的收益，确定要强行出关吗？',
      positiveText: '确定出关',
      negativeText: '继续修炼',
      onPositiveClick: () => {
        cultivationStore.forceExitDeepCultivation()
      }
    })
  }

  const handleTogglePeaceMode = async () => {
    const success = await cultivationStore.togglePeaceMode()
    if (success) {
      message.success(cultivationStore.peaceMode ? '已开启避世模式' : '已关闭避世模式')
    }
  }
</script>

<style scoped>
  .cultivation-page {
    padding: 12px;
    padding-bottom: 100px;
    max-width: 480px;
    margin: 0 auto;
  }

  /* 顶部栏 */
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .realm-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: linear-gradient(135deg, rgba(201, 169, 89, 0.12) 0%, rgba(201, 169, 89, 0.06) 100%);
    border: 1px solid rgba(201, 169, 89, 0.35);
    border-radius: 6px;
    position: relative;
    overflow: hidden;
  }

  .realm-badge::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(201, 169, 89, 0.1), transparent);
    animation: realm-shimmer 3s ease-in-out infinite;
  }

  @keyframes realm-shimmer {
    0%,
    100% {
      transform: translateX(-100%);
    }
    50% {
      transform: translateX(100%);
    }
  }

  .realm-icon {
    color: var(--color-gold);
    animation: realm-icon-pulse 2s ease-in-out infinite;
    filter: drop-shadow(0 0 4px rgba(201, 169, 89, 0.4));
  }

  @keyframes realm-icon-pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.8;
    }
    50% {
      transform: scale(1.1);
      opacity: 1;
    }
  }

  .realm-text {
    font-weight: 700;
    font-size: 0.95rem;
    letter-spacing: 2px;
    color: var(--color-gold);
    text-shadow: 0 0 8px rgba(201, 169, 89, 0.3);
  }

  /* 境界等级特效 */
  .realm-badge.realm-tier-1 {
    border-color: rgba(156, 163, 175, 0.4);
  }
  .realm-badge.realm-tier-2 {
    border-color: rgba(124, 184, 138, 0.4);
  }
  .realm-badge.realm-tier-3 {
    border-color: rgba(90, 184, 184, 0.4);
  }
  .realm-badge.realm-tier-4 {
    border-color: rgba(156, 122, 184, 0.4);
  }
  .realm-badge.realm-tier-5 {
    border-color: rgba(201, 169, 89, 0.5);
  }
  .realm-badge.realm-tier-6 {
    border-color: rgba(240, 230, 200, 0.5);
  }
  .realm-badge.realm-tier-7 {
    border-color: rgba(255, 215, 0, 0.5);
  }
  .realm-badge.realm-tier-8 {
    border-color: rgba(255, 200, 100, 0.6);
  }
  .realm-badge.realm-tier-9 {
    border-color: rgba(255, 215, 0, 0.7);
    animation: legendary-glow 2s ease-in-out infinite;
  }

  @keyframes legendary-glow {
    0%,
    100% {
      box-shadow: 0 0 5px rgba(255, 215, 0, 0.3);
    }
    50% {
      box-shadow: 0 0 15px rgba(255, 215, 0, 0.5), 0 0 25px rgba(255, 215, 0, 0.2);
    }
  }

  .top-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .combat-power {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    font-size: 0.85rem;
    color: var(--color-gold);
    font-weight: 600;
  }

  .peace-tag {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: rgba(90, 184, 184, 0.15);
    border-radius: 4px;
    color: #5ab8b8;
  }

  /* 核心修炼区域 */
  .main-cultivation-area {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 0;
    margin-bottom: 12px;
    overflow: hidden;
  }

  /* 背景灵气效果 */
  .spirit-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .spirit-line {
    position: absolute;
    width: 2px;
    height: 100%;
    background: linear-gradient(to top, transparent, rgba(201, 169, 89, 0.1), rgba(122, 158, 142, 0.15), transparent);
    animation: spirit-rise 4s ease-in-out infinite;
    animation-delay: var(--delay);
    opacity: 0;
  }

  .spirit-line:nth-child(1) {
    left: 10%;
  }
  .spirit-line:nth-child(2) {
    left: 25%;
  }
  .spirit-line:nth-child(3) {
    left: 40%;
  }
  .spirit-line:nth-child(4) {
    left: 60%;
  }
  .spirit-line:nth-child(5) {
    left: 75%;
  }
  .spirit-line:nth-child(6) {
    left: 90%;
  }

  @keyframes spirit-rise {
    0% {
      transform: translateY(100%);
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
    80% {
      opacity: 1;
    }
    100% {
      transform: translateY(-100%);
      opacity: 0;
    }
  }

  .cultivating .spirit-line {
    animation-duration: 2s;
    background: linear-gradient(to top, transparent, rgba(201, 169, 89, 0.2), rgba(156, 122, 184, 0.2), transparent);
  }

  /* 能量粒子 */
  .particles-container {
    position: absolute;
    width: 200px;
    height: 200px;
    pointer-events: none;
  }

  .particle {
    position: absolute;
    width: 4px;
    height: 4px;
    background: radial-gradient(circle, rgba(201, 169, 89, 0.8) 0%, transparent 70%);
    border-radius: 50%;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(var(--distance));
    animation: particle-float var(--duration) ease-in-out infinite;
    animation-delay: var(--delay);
    opacity: 0;
  }

  @keyframes particle-float {
    0%,
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(var(--distance) + 20px)) scale(0.5);
    }
    50% {
      opacity: 1;
      transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(var(--distance) - 10px)) scale(1);
    }
  }

  .cultivating .particle {
    animation-duration: 1.5s;
    width: 6px;
    height: 6px;
    background: radial-gradient(circle, rgba(201, 169, 89, 1) 0%, rgba(156, 122, 184, 0.5) 50%, transparent 70%);
  }

  /* 外围光环 */
  .outer-rings {
    position: absolute;
    width: 180px;
    height: 180px;
    pointer-events: none;
    top: 10px;
    transform: translateY(0px);
  }

  .ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1px solid transparent;
    opacity: 0.3;
  }

  .ring-1 {
    border-color: rgba(201, 169, 89, 0.2);
    animation: ring-rotate 20s linear infinite;
  }

  .ring-2 {
    inset: -10px;
    border-color: rgba(122, 158, 142, 0.15);
    animation: ring-rotate 25s linear infinite reverse;
  }

  .ring-3 {
    inset: -20px;
    border-color: rgba(156, 122, 184, 0.1);
    animation: ring-rotate 30s linear infinite;
  }

  .ring.active {
    opacity: 0.6;
    border-width: 2px;
  }

  @keyframes ring-rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* 修炼球体 */
  .cultivation-orb {
    position: relative;
    width: 120px;
    height: 120px;
    margin-bottom: 16px;
    z-index: 1;
  }

  .cultivation-orb.breakthrough {
    animation: orb-breakthrough 3s ease-in-out infinite;
  }

  @keyframes orb-breakthrough {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }

  .orb-glow {
    position: absolute;
    inset: -15px;
    background: radial-gradient(circle, rgba(201, 169, 89, 0.15) 0%, transparent 70%);
    border-radius: 50%;
    animation: glow-pulse 3s ease-in-out infinite;
  }

  @keyframes glow-pulse {
    0%,
    100% {
      opacity: 0.5;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.1);
    }
  }

  .cultivating .orb-glow {
    background: radial-gradient(circle, rgba(201, 169, 89, 0.25) 0%, rgba(156, 122, 184, 0.1) 50%, transparent 70%);
    animation-duration: 1.5s;
  }

  .orb-core {
    position: absolute;
    inset: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .orb-inner {
    position: relative;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, rgba(93, 124, 111, 0.3) 0%, rgba(61, 90, 79, 0.4) 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(201, 169, 89, 0.4);
    box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.4), inset 0 0 15px rgba(201, 169, 89, 0.1), 0 0 20px rgba(93, 124, 111, 0.2);
    transition: all 0.3s ease;
    overflow: hidden;
  }

  .orb-inner.pulsing {
    animation: orb-pulse 2s ease-in-out infinite;
    border-color: rgba(201, 169, 89, 0.6);
  }

  .orb-inner.deep {
    background: linear-gradient(135deg, rgba(156, 122, 184, 0.3) 0%, rgba(100, 80, 130, 0.4) 100%);
    border-color: rgba(156, 122, 184, 0.5);
  }

  @keyframes orb-pulse {
    0%,
    100% {
      box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.4), inset 0 0 15px rgba(201, 169, 89, 0.1), 0 0 20px rgba(201, 169, 89, 0.3);
    }
    50% {
      box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.3), inset 0 0 25px rgba(201, 169, 89, 0.2), 0 0 40px rgba(201, 169, 89, 0.5);
    }
  }

  /* 内部粒子 */
  .inner-particles {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .inner-particle {
    position: absolute;
    width: 3px;
    height: 3px;
    background: rgba(201, 169, 89, 0.6);
    border-radius: 50%;
    left: 50%;
    top: 50%;
    animation: inner-orbit 4s linear infinite;
    animation-delay: calc(var(--i) * -0.6s);
  }

  @keyframes inner-orbit {
    0% {
      transform: translate(-50%, -50%) rotate(0deg) translateX(20px) scale(0.5);
      opacity: 0.3;
    }
    50% {
      transform: translate(-50%, -50%) rotate(180deg) translateX(25px) scale(1);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%) rotate(360deg) translateX(20px) scale(0.5);
      opacity: 0.3;
    }
  }

  .cultivating .inner-particle {
    animation-duration: 2s;
    background: rgba(201, 169, 89, 0.9);
    width: 4px;
    height: 4px;
  }

  .orb-icon {
    position: relative;
    z-index: 2;
    color: var(--color-gold);
    filter: drop-shadow(0 0 8px rgba(201, 169, 89, 0.5));
    animation: icon-float 3s ease-in-out infinite;
  }

  @keyframes icon-float {
    0%,
    100% {
      transform: translateY(0) scale(1);
    }
    50% {
      transform: translateY(-2px) scale(1.05);
    }
  }

  .orb-icon.deep {
    color: #9c7ab8;
    filter: drop-shadow(0 0 8px rgba(156, 122, 184, 0.5));
  }

  /* 八卦符文 */
  .bagua-symbols {
    position: absolute;
    inset: -25px;
    pointer-events: none;
  }

  .bagua-symbols .symbol {
    position: absolute;
    left: 50%;
    top: 50%;
    font-size: 12px;
    color: rgba(201, 169, 89, 0.3);
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-68px) rotate(calc(-1 * var(--angle)));
    transition: all 0.3s ease;
  }

  .bagua-symbols.rotating {
    animation: bagua-spin 20s linear infinite;
  }

  .bagua-symbols.rotating .symbol {
    color: rgba(201, 169, 89, 0.6);
    text-shadow: 0 0 10px rgba(201, 169, 89, 0.5);
  }

  @keyframes bagua-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* 进度环 */
  .progress-ring {
    position: absolute;
    inset: 0;
    transform: rotate(-90deg);
    border-radius: 50%;
    filter: drop-shadow(0 0 3px rgba(93, 124, 111, 0.3));
  }

  .ring-bg {
    fill: none;
    stroke: rgba(93, 124, 111, 0.2);
    stroke-width: 5;
  }

  .ring-progress {
    fill: none;
    stroke: url(#ringGradient);
    stroke-width: 5;
    stroke-linecap: round;
    stroke-dasharray: 339.292;
    transition: stroke-dashoffset 0.5s ease;
    filter: drop-shadow(0 0 4px rgba(122, 158, 142, 0.4));
  }

  .ring-progress.full {
    stroke: var(--color-gold);
    animation: ring-glow 2s ease-in-out infinite;
    filter: drop-shadow(0 0 8px rgba(201, 169, 89, 0.6));
  }

  @keyframes ring-glow {
    0%,
    100% {
      filter: drop-shadow(0 0 4px rgba(201, 169, 89, 0.4));
    }
    50% {
      filter: drop-shadow(0 0 12px rgba(201, 169, 89, 0.8));
    }
  }

  .cultivation-status {
    text-align: center;
  }

  .status-main {
    display: block;
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .status-main.deep {
    color: #9c7ab8;
    font-size: 1.2rem;
  }

  .status-sub {
    display: block;
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-top: 2px;
  }

  /* 丹毒警告 */
  .poison-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    background: rgba(201, 106, 90, 0.1);
    border: 1px solid rgba(201, 106, 90, 0.2);
    border-radius: 4px;
    margin-bottom: 12px;
    color: #c96a5a;
    font-size: 0.8rem;
  }

  /* 道心破碎警告 */
  .shattered-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 12px;
    background: rgba(168, 85, 247, 0.1);
    border: 1px solid rgba(168, 85, 247, 0.3);
    border-radius: 4px;
    margin-bottom: 12px;
    color: #a855f7;
    font-size: 0.85rem;
  }

  .shattered-time {
    padding: 2px 6px;
    background: rgba(168, 85, 247, 0.2);
    border-radius: 3px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  /* 深度闭关控制 */
  .deep-control-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 12px;
    background: rgba(156, 122, 184, 0.08);
    border: 1px solid rgba(156, 122, 184, 0.2);
    border-radius: 4px;
    margin-bottom: 12px;
  }

  .exit-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: rgba(201, 106, 90, 0.15);
    border: 1px solid rgba(201, 106, 90, 0.3);
    border-radius: 4px;
    color: #c96a5a;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .exit-btn:hover {
    background: rgba(201, 106, 90, 0.25);
  }

  .exit-warning {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  /* 信息卡片 */
  .info-cards {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 10px;
    margin-bottom: 12px;
  }

  .info-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 12px;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-bottom: 6px;
  }

  .dao-level {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .mini-progress {
    height: 3px;
    background: rgba(93, 124, 111, 0.1);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 6px;
  }

  .mini-fill {
    height: 100%;
    background: linear-gradient(90deg, #5d7c6f, #7a9e8e);
    transition: width 0.3s;
  }

  .card-sub {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .rates-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }

  .rate-item {
    text-align: center;
    padding: 6px 2px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 3px;
  }

  .rate-val {
    display: block;
    font-size: 0.85rem;
    font-weight: 700;
  }

  .rate-lbl {
    font-size: 0.65rem;
    color: var(--text-muted);
  }

  .rate-val.success {
    color: #7cb88a;
  }
  .rate-val.critical {
    color: #f0e6c8;
  }
  .rate-val.failure {
    color: #9ca3af;
  }
  .rate-val.danger {
    color: #c96a5a;
  }

  /* 属性面板 */
  .stats-panel {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 14px;
    margin-bottom: 16px;
    position: relative;
    overflow: hidden;
  }

  .stats-panel::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(201, 169, 89, 0.03), transparent);
    animation: shimmer 8s ease-in-out infinite;
  }

  @keyframes shimmer {
    0%,
    100% {
      left: -100%;
    }
    50% {
      left: 100%;
    }
  }

  .stats-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-color);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 10px 4px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 6px;
    border: 1px solid transparent;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .stat-item::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 0;
    height: 2px;
    background: currentColor;
    transition: all 0.3s ease;
    transform: translateX(-50%);
    opacity: 0.3;
  }

  .stat-item:hover {
    transform: translateY(-2px);
    background: rgba(0, 0, 0, 0.2);
    border-color: rgba(201, 169, 89, 0.2);
  }

  .stat-item:hover::after {
    width: 60%;
  }

  .stat-icon {
    margin-bottom: 4px;
    transition: all 0.3s ease;
  }

  .stat-item:hover .stat-icon {
    transform: scale(1.15);
  }

  .stat-icon.hp {
    color: #c96a5a;
    filter: drop-shadow(0 0 3px rgba(201, 106, 90, 0.3));
  }
  .stat-icon.mp {
    color: #5d7c6f;
    filter: drop-shadow(0 0 3px rgba(93, 124, 111, 0.3));
  }
  .stat-icon.attack {
    color: #e07a5f;
    filter: drop-shadow(0 0 3px rgba(224, 122, 95, 0.3));
  }
  .stat-icon.defense {
    color: #6b8e7a;
    filter: drop-shadow(0 0 3px rgba(107, 142, 122, 0.3));
  }
  .stat-icon.speed {
    color: #5ab8b8;
    filter: drop-shadow(0 0 3px rgba(90, 184, 184, 0.3));
  }
  .stat-icon.luck {
    color: #c9a959;
    filter: drop-shadow(0 0 3px rgba(201, 169, 89, 0.3));
  }

  .stat-val {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-primary);
    transition: all 0.3s ease;
  }

  .stat-item:hover .stat-val {
    color: var(--color-gold);
  }

  .stat-lbl {
    font-size: 0.65rem;
    color: var(--text-muted);
    letter-spacing: 1px;
  }

  /* 操作按钮区 */
  .action-area {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .main-action-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px 28px;
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    border: 2px solid rgba(201, 169, 89, 0.4);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 1.15rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(93, 124, 111, 0.2);
  }

  .main-action-btn::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent, rgba(201, 169, 89, 0.1), transparent);
    transform: rotate(45deg);
    animation: btn-shine 4s ease-in-out infinite;
  }

  @keyframes btn-shine {
    0%,
    100% {
      transform: rotate(45deg) translateX(-100%);
    }
    50% {
      transform: rotate(45deg) translateX(100%);
    }
  }

  .main-action-btn:hover:not(.disabled):not(.cultivating) {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(93, 124, 111, 0.4), 0 0 15px rgba(201, 169, 89, 0.2);
    border-color: var(--color-gold);
    background: linear-gradient(135deg, #6b8e7a 0%, #4a6b5d 100%);
  }

  .main-action-btn:active:not(.disabled):not(.cultivating) {
    transform: translateY(-1px);
  }

  .main-action-btn.cultivating {
    background: linear-gradient(135deg, #c9a959 0%, #a08040 100%);
    color: #1a1812;
    cursor: default;
    animation: cultivating-pulse 1.5s ease-in-out infinite;
    box-shadow: 0 4px 20px rgba(201, 169, 89, 0.4);
  }

  @keyframes cultivating-pulse {
    0%,
    100% {
      box-shadow: 0 4px 20px rgba(201, 169, 89, 0.4);
    }
    50% {
      box-shadow: 0 4px 30px rgba(201, 169, 89, 0.6), 0 0 20px rgba(201, 169, 89, 0.3);
    }
  }

  .main-action-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .main-action-btn.disabled::before {
    display: none;
  }

  .secondary-actions {
    display: flex;
    gap: 10px;
  }

  .secondary-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 16px;
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .secondary-btn.deep {
    background: rgba(156, 122, 184, 0.15);
    border: 1px solid rgba(156, 122, 184, 0.3);
    color: #9c7ab8;
  }

  .secondary-btn.deep:hover:not(.disabled) {
    background: rgba(156, 122, 184, 0.25);
  }

  .secondary-btn.peace {
    background: rgba(90, 184, 184, 0.1);
    border: 1px solid rgba(90, 184, 184, 0.3);
    color: #5ab8b8;
  }

  .secondary-btn.peace:hover {
    background: rgba(90, 184, 184, 0.2);
  }

  .secondary-btn.peace.active {
    background: rgba(201, 106, 90, 0.1);
    border-color: rgba(201, 106, 90, 0.3);
    color: #c96a5a;
  }

  .secondary-btn.disabled {
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

  /* 结果弹窗 */
  .result-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.2rem;
    font-weight: 700;
  }

  .result-content {
    text-align: center;
  }

  .result-message {
    color: var(--text-secondary);
    font-size: 0.95rem;
    line-height: 1.8;
    margin-bottom: 16px;
  }

  /* 奇遇 */
  .adventure-box {
    background: rgba(201, 169, 89, 0.08);
    border: 1px solid rgba(201, 169, 89, 0.2);
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 16px;
    text-align: left;
  }

  .adventure-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .adventure-title {
    font-weight: 600;
    color: var(--color-gold);
  }

  .adventure-rarity {
    font-size: 0.75rem;
    padding: 2px 6px;
    border-radius: 2px;
  }

  .adventure-rarity.common {
    background: rgba(156, 163, 175, 0.2);
    color: #9ca3af;
  }
  .adventure-rarity.rare {
    background: rgba(124, 184, 138, 0.2);
    color: #7cb88a;
  }
  .adventure-rarity.epic {
    background: rgba(156, 122, 184, 0.2);
    color: #9c7ab8;
  }
  .adventure-rarity.legendary {
    background: rgba(240, 230, 200, 0.2);
    color: #f0e6c8;
  }

  .adventure-desc {
    margin: 0 0 8px;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .adventure-bonus {
    font-size: 0.85rem;
    color: #7cb88a;
    font-weight: 600;
  }

  .result-exp {
    display: inline-flex;
    flex-direction: column;
    padding: 16px 32px;
    background: rgba(107, 142, 122, 0.1);
    border: 1px solid rgba(107, 142, 122, 0.3);
    border-radius: 4px;
    margin-bottom: 16px;
  }

  .result-exp.critical_success {
    background: rgba(240, 230, 200, 0.1);
    border-color: rgba(240, 230, 200, 0.3);
  }
  .result-exp.failure {
    background: rgba(156, 163, 175, 0.1);
    border-color: rgba(156, 163, 175, 0.3);
  }
  .result-exp.critical_failure {
    background: rgba(201, 106, 90, 0.1);
    border-color: rgba(201, 106, 90, 0.3);
  }

  .exp-label {
    font-size: 0.8rem;
    color: var(--text-muted);
  }
  .exp-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #7cb88a;
  }
  .exp-value.negative {
    color: #c96a5a;
  }

  /* 突破信息 */
  .breakthrough-box {
    background: linear-gradient(135deg, rgba(201, 169, 89, 0.15) 0%, rgba(201, 169, 89, 0.08) 100%);
    border: 1px solid rgba(201, 169, 89, 0.4);
    border-radius: 4px;
    padding: 16px;
    margin: 16px 0;
    animation: breakthrough-glow 2s ease-in-out infinite;
  }

  @keyframes breakthrough-glow {
    0%,
    100% {
      box-shadow: 0 0 10px rgba(201, 169, 89, 0.2);
    }
    50% {
      box-shadow: 0 0 20px rgba(201, 169, 89, 0.4);
    }
  }

  .breakthrough-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--color-gold);
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .breakthrough-realm {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--color-gold);
    margin: 0 0 4px;
    text-align: center;
  }

  .breakthrough-msg {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: 0;
    text-align: center;
  }

  .result-details {
    display: flex;
    justify-content: center;
    gap: 24px;
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* 深度闭关结果 */
  .deep-result-title {
    color: #9c7ab8;
  }

  .deep-result-content {
    text-align: center;
  }

  .deep-summary {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    padding: 16px;
    margin-bottom: 16px;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .summary-row:last-child {
    border-bottom: none;
  }
  .summary-row.success span:last-child {
    color: #7cb88a;
  }
  .summary-row.failure span:last-child {
    color: #9ca3af;
  }
  .summary-row.special span:last-child {
    color: #f0e6c8;
  }
  .summary-row.danger span:last-child {
    color: #c96a5a;
  }

  .early-exit-warning {
    background: rgba(201, 106, 90, 0.1);
    border: 1px solid rgba(201, 106, 90, 0.3);
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 16px;
    color: #c96a5a;
    font-size: 0.9rem;
  }

  .deep-exp-result {
    display: inline-flex;
    flex-direction: column;
    padding: 16px 32px;
    background: rgba(156, 122, 184, 0.1);
    border: 1px solid rgba(156, 122, 184, 0.3);
    border-radius: 4px;
    margin-bottom: 16px;
  }

  .deep-adventures {
    text-align: left;
    background: rgba(201, 169, 89, 0.05);
    border-radius: 4px;
    padding: 12px;
  }

  .adventures-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-gold);
    font-weight: 600;
    margin-bottom: 10px;
  }

  .adventure-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .adventure-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
  }

  .adv-name {
    font-size: 0.85rem;
  }

  .adv-rarity {
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 2px;
  }

  .adv-rarity.common {
    background: rgba(156, 163, 175, 0.2);
    color: #9ca3af;
  }
  .adv-rarity.rare {
    background: rgba(124, 184, 138, 0.2);
    color: #7cb88a;
  }
  .adv-rarity.epic {
    background: rgba(156, 122, 184, 0.2);
    color: #9c7ab8;
  }
  .adv-rarity.legendary {
    background: rgba(240, 230, 200, 0.2);
    color: #f0e6c8;
  }

  @media (min-width: 640px) {
    .stats-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
  }

  @media (max-width: 480px) {
    .dao-heart-section {
      grid-template-columns: 1fr;
    }
  }

  /* 渡劫面板 */
  .tribulation-panel {
    background: linear-gradient(135deg, rgba(201, 106, 90, 0.1) 0%, rgba(201, 169, 89, 0.08) 100%);
    border: 1px solid rgba(201, 106, 90, 0.3);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    position: relative;
    overflow: hidden;
  }

  .tribulation-panel::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(201, 106, 90, 0.05) 0%, transparent 50%);
    animation: tribulation-pulse 4s ease-in-out infinite;
  }

  @keyframes tribulation-pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.5;
    }
    50% {
      transform: scale(1.1);
      opacity: 1;
    }
  }

  .tribulation-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    position: relative;
    z-index: 1;
  }

  .tribulation-icon {
    color: #c96a5a;
    filter: drop-shadow(0 0 6px rgba(201, 106, 90, 0.5));
    animation: flame-flicker 1.5s ease-in-out infinite;
  }

  @keyframes flame-flicker {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.9;
    }
    50% {
      transform: scale(1.1);
      opacity: 1;
    }
  }

  .tribulation-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: #c96a5a;
    text-shadow: 0 0 10px rgba(201, 106, 90, 0.3);
  }

  .danger-badge {
    background: linear-gradient(135deg, #c96a5a 0%, #9b4a3c 100%);
    color: #fff;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
    animation: danger-pulse 1s ease-in-out infinite;
  }

  @keyframes danger-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .tribulation-desc {
    position: relative;
    z-index: 1;
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0 0 16px;
    line-height: 1.6;
  }

  .tribulation-items {
    position: relative;
    z-index: 1;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .items-title {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .item-row {
    display: flex;
    align-items: center;
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 4px;
    border: 1px solid rgba(201, 106, 90, 0.2);
    transition: all 0.2s;
  }

  .item-row.sufficient {
    border-color: rgba(107, 142, 122, 0.3);
    background: rgba(107, 142, 122, 0.08);
  }

  .item-name {
    flex: 1;
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  .item-count {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-right: 10px;
  }

  .item-count .insufficient {
    color: #c96a5a;
    font-weight: 600;
  }

  .item-status {
    color: #6b8e7a;
  }

  .item-row:not(.sufficient) .item-status {
    color: #c96a5a;
  }

  .success-rate {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: rgba(201, 169, 89, 0.1);
    border: 1px solid rgba(201, 169, 89, 0.2);
    border-radius: 4px;
    margin-bottom: 12px;
  }

  .rate-label {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .rate-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-gold);
  }

  .tribulation-reason {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: rgba(201, 106, 90, 0.1);
    border: 1px solid rgba(201, 106, 90, 0.2);
    border-radius: 4px;
    margin-bottom: 12px;
    color: #c96a5a;
    font-size: 0.85rem;
  }

  .tribulation-btn {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 14px 24px;
    background: linear-gradient(135deg, #c96a5a 0%, #9b4a3c 100%);
    border: 2px solid rgba(201, 106, 90, 0.5);
    border-radius: 6px;
    color: #fff;
    font-size: 1.05rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(201, 106, 90, 0.3);
  }

  .tribulation-btn:hover:not(.disabled):not(.attempting) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(201, 106, 90, 0.5);
    border-color: #c96a5a;
  }

  .tribulation-btn:active:not(.disabled):not(.attempting) {
    transform: translateY(0);
  }

  .tribulation-btn.dangerous {
    background: linear-gradient(135deg, #9b4a3c 0%, #7a3a2c 100%);
    animation: danger-btn-pulse 2s ease-in-out infinite;
  }

  @keyframes danger-btn-pulse {
    0%,
    100% {
      box-shadow: 0 4px 15px rgba(155, 74, 60, 0.3);
    }
    50% {
      box-shadow: 0 4px 25px rgba(155, 74, 60, 0.6), 0 0 30px rgba(155, 74, 60, 0.2);
    }
  }

  .tribulation-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    animation: none;
  }

  .tribulation-btn.attempting {
    background: linear-gradient(135deg, #c9a959 0%, #a08040 100%);
    cursor: default;
  }

  .danger-warning {
    position: relative;
    z-index: 1;
    margin: 12px 0 0;
    font-size: 0.8rem;
    color: #c96a5a;
    text-align: center;
    animation: warning-blink 2s ease-in-out infinite;
  }

  @keyframes warning-blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }
</style>
