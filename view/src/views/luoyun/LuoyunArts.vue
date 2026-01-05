<template>
  <div class="luoyun-arts">
    <!-- 背景灵气粒子 -->
    <div class="spirit-particles">
      <div
        v-for="i in 12"
        :key="i"
        class="particle"
        :style="{ '--delay': i * 0.5 + 's', '--x': Math.random() * 100 + '%', '--size': Math.random() * 6 + 3 + 'px' }"
      />
    </div>

    <!-- 标题 -->
    <div class="page-header">
      <div class="header-glow" />
      <div class="header-icon">
        <div class="icon-pulse" />
        <TreePine :size="24" />
      </div>
      <div class="header-text">
        <h1>灵眼之树</h1>
        <p>共培神木，守护落云</p>
      </div>
      <button class="refresh-btn" @click="handleRefresh" :disabled="loading">
        <RefreshCw :size="18" :class="{ spinning: loading }" />
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="initialLoading" class="loading-container">
      <Loader2 :size="32" class="spin" />
      <span>正在感应灵树...</span>
    </div>

    <!-- 非落云宗弟子提示 -->
    <div v-else-if="!isMember" class="not-member">
      <AlertCircle :size="48" />
      <h2>无法修习</h2>
      <p>只有落云宗弟子才能参与灵眼之树的培育</p>
      <button class="go-sect-btn" @click="router.push({ name: 'MySect' })">前往宗门</button>
    </div>

    <!-- 主内容 -->
    <template v-else>
      <!-- 灵树状态总览 -->
      <div class="tree-overview">
        <!-- 灵树可视化 -->
        <div class="tree-visual">
          <div class="tree-container">
            <div class="tree-glow" :class="tree?.status" />
            <div class="tree-icon" :class="tree?.status">
              <TreePine :size="64" />
            </div>
            <div class="tree-status-badge" :class="tree?.status">
              {{ treeStatusConfig?.name || '未知' }}
            </div>
          </div>

          <!-- 成熟度进度条 -->
          <div class="maturity-section">
            <div class="maturity-label">
              <span>成熟度</span>
              <span class="maturity-value">{{ maturityDisplay }}</span>
            </div>
            <div class="maturity-bar">
              <div class="maturity-fill" :style="{ width: (tree?.maturityPercent || 0) + '%' }" />
            </div>
            <div class="maturity-info">
              <span>第 {{ tree?.cycle || 1 }} 周期</span>
              <span v-if="tree?.status === 'invaded'" class="invasion-warning">
                <Sword :size="14" />
                入侵中！剩余 {{ formatTime(tree.invasionTimeRemaining) }}
              </span>
            </div>
          </div>

          <!-- 成长阶段与灵纹 -->
          <div class="stage-section">
            <div class="stage-header">
              <div class="stage-info">
                <Zap :size="16" :style="{ color: '#22c55e' }" />
                <span class="stage-name">{{ currentStageConfig?.name || '萌芽期' }}</span>
                <span class="stage-desc">{{ currentStageConfig?.description }}</span>
              </div>
              <div class="spirit-patterns">
                <span class="pattern-label">灵纹</span>
                <div class="pattern-dots">
                  <div
                    v-for="i in 4"
                    :key="i"
                    class="pattern-dot"
                    :class="{ active: i <= (tree?.spiritPatterns || 0) }"
                  />
                </div>
              </div>
            </div>
            <div class="stage-progress">
              <div class="progress-label">
                <span>木元素积累</span>
                <span class="progress-value">{{ totalWoodElement }} / {{ nextStageWoodRequired }}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill wood" :style="{ width: stageProgress + '%' }" />
              </div>
            </div>
            <!-- 果实品质预览 -->
            <div class="fruit-preview">
              <span>预计果实品质：</span>
              <span class="fruit-quality" :style="{ color: currentFruitQuality.color }">
                {{ currentFruitQuality.name }}
              </span>
              <span class="fruit-reward">（基础 +{{ currentFruitQuality.baseCultivation }} 修为）</span>
            </div>
          </div>
        </div>

        <!-- 状态卡片 -->
        <div class="status-cards">
          <div class="status-card">
            <div class="status-icon contribution-icon">
              <Star :size="20" />
            </div>
            <div class="status-info">
              <span class="status-label">我的贡献</span>
              <span class="status-value">{{ contribution?.contribution || 0 }}</span>
            </div>
          </div>

          <div class="status-card">
            <div class="status-icon rank-icon" :class="{ 'top-rank': isTopRanked }">
              <Trophy :size="20" />
            </div>
            <div class="status-info">
              <span class="status-label">当前排名</span>
              <span class="status-value" :class="{ 'top-rank': isTopRanked }">
                {{ myRank > 0 ? '第' + myRank + '名' : '未上榜' }}
              </span>
            </div>
          </div>

          <div class="status-card">
            <div class="status-icon water-icon" :class="{ available: canWater }">
              <Droplets :size="20" />
            </div>
            <div class="status-info">
              <span class="status-label">今日浇灌</span>
              <span class="status-value">{{ contribution?.wateredToday ? '已完成' : '可浇灌' }}</span>
            </div>
          </div>

          <div class="status-card" v-if="tree?.status === 'invaded'">
            <div class="status-icon defend-icon" :class="{ defended: contribution?.defendedInvasion }">
              <Shield :size="20" />
            </div>
            <div class="status-info">
              <span class="status-label">防御者</span>
              <span class="status-value">{{ tree.defendersCount }} / {{ tree.defendersNeeded }}</span>
            </div>
          </div>
        </div>

        <!-- 环境状态区域 -->
        <div class="environment-section" v-if="tree && currentEnvironmentConfig">
          <div class="env-header">
            <div class="env-status" :class="{ satisfied: tree.environmentSatisfied }">
              <component
                :is="getEnvironmentIcon(currentEnvironmentConfig.icon)"
                :size="24"
                :style="{ color: currentEnvironmentConfig.color }"
              />
              <div class="env-info">
                <span class="env-name">{{ currentEnvironmentConfig.name }}</span>
                <span class="env-desc">{{ currentEnvironmentConfig.description }}</span>
              </div>
            </div>
            <div class="env-timer">
              <Clock :size="14" />
              <span>{{ environmentCountdown }}</span>
            </div>
          </div>
          <div class="env-requirement">
            <span class="req-label">需求元素：</span>
            <span
              class="req-element"
              :style="{ color: ELEMENT_CONFIG[currentEnvironmentConfig.requiredElement]?.color }"
            >
              {{ ELEMENT_CONFIG[currentEnvironmentConfig.requiredElement]?.name }}灵力
            </span>
            <span v-if="tree.environmentSatisfied" class="env-satisfied-badge">
              ✓ 已满足
            </span>
          </div>
          <button
            v-if="!tree.environmentSatisfied && tree.status === 'growing'"
            class="satisfy-btn"
            :class="{ disabled: !canSatisfyEnv }"
            :disabled="!canSatisfyEnv || loading"
            @click="handleSatisfyEnvironment"
          >
            <template v-if="canSatisfyEnv">
              <Zap :size="16" />
              注入灵力
            </template>
            <template v-else>
              灵根不匹配
            </template>
          </button>
          <p class="env-warning" v-if="!tree.environmentSatisfied">
            ⚠ 未满足环境需求，每小时将损失5%成熟度
          </p>
        </div>
      </div>

      <!-- 操作区域 -->
      <div class="action-section">
        <!-- 浇灌按钮 -->
        <div class="action-card" v-if="tree?.status === 'growing'">
          <div class="action-header">
            <Droplets :size="18" />
            <span>浇灌灵树</span>
          </div>
          <p class="action-desc">消耗50修为，增加0.5%成熟度和10贡献值</p>
          <p class="action-tip" v-if="hasWoodRoot">木灵根亲和：贡献翻倍！</p>
          <button class="action-btn water-btn" :disabled="!canWater || loading" @click="handleWater">
            {{ canWater ? '浇灌' : '今日已浇灌' }}
          </button>
        </div>

        <!-- 防御按钮 -->
        <div class="action-card invasion" v-if="tree?.status === 'invaded'">
          <div class="action-header">
            <Sword :size="18" />
            <span>古剑宗入侵！</span>
          </div>
          <p class="action-desc">参与防御可获得20额外贡献，需{{ tree.defendersNeeded }}人防御成功</p>
          <button class="action-btn defend-btn" :disabled="contribution?.defendedInvasion || loading" @click="handleDefend">
            {{ contribution?.defendedInvasion ? '已参与防御' : '参与防御' }}
          </button>
        </div>

        <!-- 收获按钮 -->
        <div class="action-card harvest" v-if="tree?.status === 'harvesting'">
          <div class="action-header">
            <Sparkles :size="18" />
            <span>收获期</span>
          </div>
          <p class="action-desc">灵树成熟，快来领取奖励！</p>
          <div class="reward-preview" v-if="contribution && !contribution.rewardsClaimed">
            <span>预计奖励：灵眼枝×1 + 200修为</span>
            <span v-if="isTopRanked" class="bonus-reward">+ 灵眼之液×{{ getTopRewardQuantity(myRank) }}</span>
          </div>
          <button class="action-btn harvest-btn" :disabled="contribution?.rewardsClaimed || loading" @click="handleHarvest">
            {{ contribution?.rewardsClaimed ? '已领取' : '领取奖励' }}
          </button>
        </div>
      </div>

      <!-- 献祭妖丹 -->
      <div class="offer-section" v-if="tree?.status === 'growing'">
        <div class="section-header">
          <Circle :size="18" />
          <span>献祭妖丹</span>
        </div>
        <div class="pill-grid">
          <div
            v-for="(config, tier) in DEMON_PILL_CONFIG"
            :key="tier"
            class="pill-card"
            :class="{ selected: selectedPillTier === Number(tier) }"
            @click="selectedPillTier = Number(tier)"
          >
            <div class="pill-icon" :style="{ color: config.color }">
              <Circle :size="24" />
            </div>
            <div class="pill-info">
              <span class="pill-name">{{ config.name }}</span>
              <span class="pill-effect">+{{ config.maturityGain / 100 }}% 成熟度</span>
              <span class="pill-contrib">+{{ config.contributionGain }} 贡献</span>
            </div>
          </div>
        </div>
        <div class="offer-controls" v-if="selectedPillTier">
          <div class="count-input">
            <button @click="offerCount = Math.max(1, offerCount - 1)">-</button>
            <input type="number" v-model.number="offerCount" min="1" max="99" />
            <button @click="offerCount = Math.min(99, offerCount + 1)">+</button>
          </div>
          <button class="offer-btn" :disabled="loading" @click="handleOfferPill">
            献祭 {{ selectedPillConfig?.name }} ×{{ offerCount }}
          </button>
        </div>
      </div>

      <!-- 贡献排行榜 -->
      <div class="ranking-section">
        <div class="section-header">
          <Trophy :size="18" />
          <span>贡献排行</span>
        </div>
        <div class="ranking-list">
          <div
            v-for="item in rankings"
            :key="item.characterId"
            class="ranking-item"
            :class="{ 'is-me': item.characterId === characterId, 'top-three': item.rank <= 3 }"
          >
            <div class="rank-badge" :class="'rank-' + item.rank">
              {{ item.rank }}
            </div>
            <div class="rank-name">{{ item.characterName }}</div>
            <div class="rank-contrib">{{ item.contribution }}</div>
            <div class="rank-reward" v-if="item.rewardQuantity > 0">
              <Droplet :size="14" />
              ×{{ item.rewardQuantity }}
            </div>
          </div>
          <div v-if="rankings.length === 0" class="no-rankings">暂无贡献记录</div>
        </div>
      </div>

      <!-- 说明 -->
      <div class="help-section">
        <div class="section-header">
          <HelpCircle :size="18" />
          <span>系统说明</span>
        </div>
        <div class="help-content">
          <div class="help-item">
            <Clock :size="14" />
            <span>每小时环境变化，对应灵根弟子可注入灵力满足需求</span>
          </div>
          <div class="help-item">
            <Zap :size="14" />
            <span>满足环境获得木元素，累积木元素可升级阶段获得灵纹</span>
          </div>
          <div class="help-item">
            <Droplets :size="14" />
            <span>每日浇灌一次（消耗50修为），木灵根弟子贡献翻倍</span>
          </div>
          <div class="help-item">
            <Circle :size="14" />
            <span>献祭妖丹可增加成熟度和贡献，无次数限制</span>
          </div>
          <div class="help-item">
            <Sword :size="14" />
            <span>成熟度达100%触发古剑宗入侵，需{{ LINGYAN_TREE_CONFIG.minDefendersToSucceed }}人防御成功</span>
          </div>
          <div class="help-item">
            <Sparkles :size="14" />
            <span>灵纹数量决定果实品质（0-4纹对应凡品-神品）</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import {
    useLuoyunStore,
    DEMON_PILL_CONFIG,
    GROWTH_STAGE_CONFIG,
    ELEMENT_CONFIG
  } from '@/stores/luoyun'
  import { usePlayerStore } from '@/stores/player'
  import { extractErrorMessage } from '@/api'
  import {
    TreePine,
    RefreshCw,
    Loader2,
    AlertCircle,
    Star,
    Trophy,
    Droplets,
    Droplet,
    Shield,
    Sword,
    Sparkles,
    Circle,
    HelpCircle,
    Mountain,
    Leaf,
    Flame,
    Scissors,
    Clock,
    Zap
  } from 'lucide-vue-next'
  import { useMessage } from 'naive-ui'

  const router = useRouter()
  const message = useMessage()
  const luoyunStore = useLuoyunStore()
  const playerStore = usePlayerStore()

  const { isMember, tree, contribution, rankings, loading } = storeToRefs(luoyunStore)
  const {
    canWater,
    isTopRanked,
    myRank,
    maturityDisplay,
    treeStatusConfig,
    currentEnvironmentConfig,
    currentStageConfig,
    currentFruitQuality,
    stageProgress,
    totalWoodElement
  } = storeToRefs(luoyunStore)

  const initialLoading = ref(true)
  const selectedPillTier = ref<number | null>(null)
  const offerCount = ref(1)

  // 选中的妖丹配置
  const selectedPillConfig = computed(() => {
    if (!selectedPillTier.value) return null
    return DEMON_PILL_CONFIG[selectedPillTier.value as keyof typeof DEMON_PILL_CONFIG]
  })

  // 配置常量
  const LINGYAN_TREE_CONFIG = {
    minDefendersToSucceed: 3
  }

  // 获取角色ID
  const characterId = computed(() => playerStore.character?.id || '')

  // 是否有木灵根
  const hasWoodRoot = computed(() => {
    const rootId = playerStore.character?.spiritRootId || ''
    return rootId.includes('wood')
  })

  // 玩家灵根ID
  const spiritRootId = computed(() => playerStore.character?.spiritRootId || '')

  // 是否可以满足当前环境
  const canSatisfyEnv = computed(() => {
    return luoyunStore.canSatisfyCurrentEnvironment(spiritRootId.value)
  })

  // 环境倒计时显示
  const environmentCountdown = ref('')
  let countdownTimer: ReturnType<typeof setInterval> | null = null

  const updateCountdown = () => {
    if (!tree.value) {
      environmentCountdown.value = ''
      return
    }
    const elapsed = Date.now() - tree.value.lastEnvironmentChangeAt
    const intervalMs = 60 * 60 * 1000
    const remaining = Math.max(0, intervalMs - elapsed)

    if (remaining <= 0) {
      environmentCountdown.value = '即将变化'
    } else {
      const minutes = Math.floor(remaining / (1000 * 60))
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
      environmentCountdown.value = `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
  }

  // 获取环境图标组件
  const getEnvironmentIcon = (iconName: string) => {
    const iconMap: Record<string, typeof Droplets> = {
      Droplets,
      Mountain,
      Leaf,
      Flame,
      Scissors
    }
    return iconMap[iconName] || Droplets
  }

  // 获取下一阶段所需木元素
  const nextStageWoodRequired = computed(() => {
    if (!tree.value) return 100
    const nextStage = tree.value.currentStage + 1
    if (nextStage > 4) return GROWTH_STAGE_CONFIG[4]?.woodRequired || 600
    return GROWTH_STAGE_CONFIG[nextStage]?.woodRequired || 100
  })

  // 获取排名奖励数量
  const getTopRewardQuantity = (rank: number): number => {
    const rewards: Record<number, number> = { 1: 3, 2: 2, 3: 2, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 }
    return rewards[rank] || 0
  }

  // 格式化时间
  const formatTime = (ms: number | null): string => {
    if (!ms || ms <= 0) return '0分钟'
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) return `${hours}小时${minutes}分钟`
    return `${minutes}分钟`
  }

  // 刷新数据
  const handleRefresh = async () => {
    try {
      await luoyunStore.fetchStatus()
    } catch (error) {
      message.error(extractErrorMessage(error, '刷新失败'))
    }
  }

  // 浇灌
  const handleWater = async () => {
    try {
      const result = await luoyunStore.waterTree()
      message.success(result.message)
    } catch (error) {
      message.error(extractErrorMessage(error, '浇灌失败'))
    }
  }

  // 防御
  const handleDefend = async () => {
    try {
      const result = await luoyunStore.defend()
      message.success(result.message)
    } catch (error) {
      message.error(extractErrorMessage(error, '参与防御失败'))
    }
  }

  // 收获
  const handleHarvest = async () => {
    try {
      const result = await luoyunStore.claimHarvest()
      message.success(result.message)
    } catch (error) {
      message.error(extractErrorMessage(error, '领取奖励失败'))
    }
  }

  // 献祭妖丹
  const handleOfferPill = async () => {
    if (!selectedPillTier.value) return
    try {
      const result = await luoyunStore.offerPill(selectedPillTier.value, offerCount.value)
      message.success(result.message)
      selectedPillTier.value = null
      offerCount.value = 1
    } catch (error) {
      message.error(extractErrorMessage(error, '献祭失败'))
    }
  }

  // 满足环境需求
  const handleSatisfyEnvironment = async () => {
    try {
      const result = await luoyunStore.satisfyEnvironment()
      message.success(result.message)
      if (result.stageEvolved) {
        message.info(`灵眼之树进入${GROWTH_STAGE_CONFIG[result.newStage!]?.name || '新阶段'}！`)
      }
      if (result.patternsGained > 0) {
        message.success(`获得${result.patternsGained}条灵纹！`)
      }
    } catch (error) {
      message.error(extractErrorMessage(error, '满足环境失败'))
    }
  }

  onMounted(async () => {
    try {
      await luoyunStore.fetchStatus()
      // 启动倒计时
      updateCountdown()
      countdownTimer = setInterval(updateCountdown, 1000)
    } catch (error) {
      message.error(extractErrorMessage(error, '加载失败'))
    } finally {
      initialLoading.value = false
    }
  })

  onUnmounted(() => {
    if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  })
</script>

<style scoped>
  .luoyun-arts {
    position: relative;
    min-height: 100vh;
    padding: 16px;
    background: linear-gradient(180deg, #0f1a0f 0%, #1a2e1a 50%, #0f1a0f 100%);
    overflow: hidden;
  }

  /* 背景粒子 */
  .spirit-particles {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 0;
  }

  .particle {
    position: absolute;
    width: var(--size);
    height: var(--size);
    left: var(--x);
    background: radial-gradient(circle, rgba(34, 197, 94, 0.6) 0%, transparent 70%);
    border-radius: 50%;
    animation: float-up 8s ease-in-out infinite;
    animation-delay: var(--delay);
    opacity: 0;
  }

  @keyframes float-up {
    0% {
      bottom: -20px;
      opacity: 0;
      transform: translateX(0);
    }
    20% {
      opacity: 0.8;
    }
    80% {
      opacity: 0.8;
    }
    100% {
      bottom: 100%;
      opacity: 0;
      transform: translateX(20px);
    }
  }

  /* 页面头部 */
  .page-header {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    margin-bottom: 20px;
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.1) 100%);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 16px;
    z-index: 1;
  }

  .header-glow {
    position: absolute;
    top: 50%;
    left: 20px;
    width: 60px;
    height: 60px;
    background: radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 70%);
    transform: translateY(-50%);
    animation: pulse-glow 3s ease-in-out infinite;
  }

  @keyframes pulse-glow {
    0%,
    100% {
      opacity: 0.5;
      transform: translateY(-50%) scale(1);
    }
    50% {
      opacity: 0.8;
      transform: translateY(-50%) scale(1.2);
    }
  }

  .header-icon {
    position: relative;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    border-radius: 12px;
    color: white;
    z-index: 1;
  }

  .icon-pulse {
    position: absolute;
    inset: -4px;
    border: 2px solid rgba(34, 197, 94, 0.5);
    border-radius: 16px;
    animation: icon-pulse 2s ease-out infinite;
  }

  @keyframes icon-pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(1.3);
      opacity: 0;
    }
  }

  .header-text h1 {
    font-size: 1.25rem;
    font-weight: 700;
    color: #22c55e;
    margin: 0;
  }

  .header-text p {
    font-size: 0.75rem;
    color: rgba(34, 197, 94, 0.7);
    margin: 2px 0 0;
  }

  .refresh-btn {
    margin-left: auto;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 8px;
    color: #22c55e;
    cursor: pointer;
    transition: all 0.2s;
  }

  .refresh-btn:hover:not(:disabled) {
    background: rgba(34, 197, 94, 0.2);
  }

  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .refresh-btn .spinning {
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

  /* 加载状态 */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 60px 20px;
    color: #22c55e;
  }

  .loading-container .spin {
    animation: spin 1s linear infinite;
  }

  /* 非成员提示 */
  .not-member {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 60px 20px;
    text-align: center;
    color: #9ca3af;
  }

  .not-member h2 {
    font-size: 1.25rem;
    color: #f3f4f6;
    margin: 0;
  }

  .go-sect-btn {
    padding: 10px 24px;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .go-sect-btn:hover {
    transform: translateY(-2px);
  }

  /* 灵树总览 */
  .tree-overview {
    position: relative;
    z-index: 1;
    margin-bottom: 20px;
  }

  .tree-visual {
    padding: 24px;
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: 16px;
    margin-bottom: 16px;
  }

  .tree-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
  }

  .tree-glow {
    position: absolute;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 70%);
  }

  .tree-glow.invaded {
    background: radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%);
    animation: pulse-glow 1s ease-in-out infinite;
  }

  .tree-glow.harvesting {
    background: radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, transparent 70%);
  }

  .tree-icon {
    position: relative;
    color: #22c55e;
    z-index: 1;
  }

  .tree-icon.invaded {
    color: #ef4444;
  }

  .tree-icon.harvesting {
    color: #f59e0b;
  }

  .tree-status-badge {
    margin-top: 8px;
    padding: 4px 12px;
    background: rgba(34, 197, 94, 0.2);
    border: 1px solid rgba(34, 197, 94, 0.4);
    border-radius: 12px;
    font-size: 0.75rem;
    color: #22c55e;
  }

  .tree-status-badge.invaded {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
    color: #ef4444;
  }

  .tree-status-badge.harvesting {
    background: rgba(245, 158, 11, 0.2);
    border-color: rgba(245, 158, 11, 0.4);
    color: #f59e0b;
  }

  /* 成熟度进度条 */
  .maturity-section {
    max-width: 300px;
    margin: 0 auto;
  }

  .maturity-label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 0.85rem;
    color: #9ca3af;
  }

  .maturity-value {
    color: #22c55e;
    font-weight: 600;
  }

  .maturity-bar {
    height: 8px;
    background: rgba(34, 197, 94, 0.1);
    border-radius: 4px;
    overflow: hidden;
  }

  .maturity-fill {
    height: 100%;
    background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
    border-radius: 4px;
    transition: width 0.5s ease;
  }

  .maturity-info {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .invasion-warning {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #ef4444;
    animation: blink 1s ease-in-out infinite;
  }

  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  /* 成长阶段区域 */
  .stage-section {
    margin-top: 16px;
    padding: 12px;
    background: rgba(34, 197, 94, 0.08);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: 10px;
  }

  .stage-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .stage-info {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .stage-name {
    font-weight: 600;
    color: #22c55e;
  }

  .stage-desc {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .spirit-patterns {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .pattern-label {
    font-size: 0.7rem;
    color: #6b7280;
  }

  .pattern-dots {
    display: flex;
    gap: 4px;
  }

  .pattern-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.3s;
  }

  .pattern-dot.active {
    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
    border-color: #f59e0b;
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
  }

  .stage-progress {
    margin-bottom: 8px;
  }

  .progress-label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .progress-value {
    color: #22c55e;
  }

  .progress-bar {
    height: 6px;
    background: rgba(34, 197, 94, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.5s ease;
  }

  .progress-fill.wood {
    background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
  }

  .fruit-preview {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .fruit-quality {
    font-weight: 600;
  }

  .fruit-reward {
    font-size: 0.7rem;
    color: #6b7280;
  }

  /* 环境状态区域 */
  .environment-section {
    margin-top: 16px;
    padding: 12px;
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 10px;
  }

  .env-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
  }

  .env-status {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .env-status.satisfied {
    opacity: 0.6;
  }

  .env-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .env-name {
    font-weight: 600;
    color: #f3f4f6;
  }

  .env-desc {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .env-timer {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .env-requirement {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
    font-size: 0.8rem;
  }

  .req-label {
    color: #9ca3af;
  }

  .req-element {
    font-weight: 600;
  }

  .env-satisfied-badge {
    padding: 2px 8px;
    background: rgba(34, 197, 94, 0.2);
    border-radius: 4px;
    font-size: 0.7rem;
    color: #22c55e;
  }

  .satisfy-btn {
    width: 100%;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .satisfy-btn:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .satisfy-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .satisfy-btn.disabled {
    background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  }

  .env-warning {
    margin: 8px 0 0;
    font-size: 0.75rem;
    color: #f59e0b;
    text-align: center;
  }

  /* 状态卡片 */
  .status-cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .status-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(34, 197, 94, 0.05);
    border: 1px solid rgba(34, 197, 94, 0.15);
    border-radius: 12px;
  }

  .status-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(34, 197, 94, 0.1);
    border-radius: 10px;
    color: #22c55e;
  }

  .status-icon.top-rank {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
  }

  .status-icon.available {
    background: rgba(34, 197, 94, 0.2);
  }

  .status-icon.defended {
    background: rgba(34, 197, 94, 0.3);
  }

  .status-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .status-label {
    font-size: 0.7rem;
    color: #6b7280;
  }

  .status-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: #f3f4f6;
  }

  .status-value.top-rank {
    color: #f59e0b;
  }

  /* 操作区域 */
  .action-section {
    position: relative;
    z-index: 1;
    margin-bottom: 20px;
  }

  .action-card {
    padding: 16px;
    background: rgba(34, 197, 94, 0.08);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: 12px;
    margin-bottom: 12px;
  }

  .action-card.invasion {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.2);
  }

  .action-card.harvest {
    background: rgba(245, 158, 11, 0.08);
    border-color: rgba(245, 158, 11, 0.2);
  }

  .action-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-weight: 600;
    color: #22c55e;
  }

  .action-card.invasion .action-header {
    color: #ef4444;
  }

  .action-card.harvest .action-header {
    color: #f59e0b;
  }

  .action-desc {
    font-size: 0.8rem;
    color: #9ca3af;
    margin: 0 0 8px;
  }

  .action-tip {
    font-size: 0.75rem;
    color: #22c55e;
    margin: 0 0 12px;
  }

  .reward-preview {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 12px;
    background: rgba(245, 158, 11, 0.1);
    border-radius: 8px;
    margin-bottom: 12px;
    font-size: 0.8rem;
    color: #f59e0b;
  }

  .bonus-reward {
    color: #a855f7;
    font-weight: 600;
  }

  .action-btn {
    width: 100%;
    padding: 10px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .water-btn {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
  }

  .defend-btn {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
  }

  .harvest-btn {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-btn:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  /* 献祭妖丹 */
  .offer-section {
    position: relative;
    z-index: 1;
    padding: 16px;
    background: rgba(34, 197, 94, 0.05);
    border: 1px solid rgba(34, 197, 94, 0.15);
    border-radius: 12px;
    margin-bottom: 20px;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-weight: 600;
    color: #22c55e;
  }

  .pill-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  }

  .pill-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 8px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .pill-card:hover {
    border-color: rgba(34, 197, 94, 0.4);
  }

  .pill-card.selected {
    background: rgba(34, 197, 94, 0.15);
    border-color: #22c55e;
  }

  .pill-icon {
    margin-bottom: 8px;
  }

  .pill-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    text-align: center;
  }

  .pill-name {
    font-size: 0.7rem;
    font-weight: 600;
    color: #f3f4f6;
  }

  .pill-effect,
  .pill-contrib {
    font-size: 0.6rem;
    color: #6b7280;
  }

  .offer-controls {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .count-input {
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    overflow: hidden;
  }

  .count-input button {
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    transition: background 0.2s;
  }

  .count-input button:hover {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  .count-input input {
    width: 50px;
    height: 32px;
    background: transparent;
    border: none;
    text-align: center;
    color: #f3f4f6;
    font-size: 0.9rem;
  }

  .offer-btn {
    flex: 1;
    padding: 8px 16px;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .offer-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .offer-btn:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  /* 排行榜 */
  .ranking-section {
    position: relative;
    z-index: 1;
    padding: 16px;
    background: rgba(34, 197, 94, 0.05);
    border: 1px solid rgba(34, 197, 94, 0.15);
    border-radius: 12px;
    margin-bottom: 20px;
  }

  .ranking-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ranking-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid transparent;
    border-radius: 8px;
  }

  .ranking-item.is-me {
    background: rgba(34, 197, 94, 0.15);
    border-color: rgba(34, 197, 94, 0.3);
  }

  .ranking-item.top-three {
    background: rgba(245, 158, 11, 0.1);
  }

  .rank-badge {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #9ca3af;
  }

  .rank-badge.rank-1 {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    color: white;
  }

  .rank-badge.rank-2 {
    background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
    color: white;
  }

  .rank-badge.rank-3 {
    background: linear-gradient(135deg, #cd7f32 0%, #a0522d 100%);
    color: white;
  }

  .rank-name {
    flex: 1;
    font-size: 0.85rem;
    color: #f3f4f6;
  }

  .rank-contrib {
    font-size: 0.8rem;
    color: #22c55e;
    font-weight: 600;
  }

  .rank-reward {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px 6px;
    background: rgba(168, 85, 247, 0.2);
    border-radius: 4px;
    font-size: 0.7rem;
    color: #a855f7;
  }

  .no-rankings {
    text-align: center;
    padding: 20px;
    color: #6b7280;
    font-size: 0.85rem;
  }

  /* 说明区域 */
  .help-section {
    position: relative;
    z-index: 1;
    padding: 16px;
    background: rgba(34, 197, 94, 0.05);
    border: 1px solid rgba(34, 197, 94, 0.15);
    border-radius: 12px;
  }

  .help-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .help-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 0.8rem;
    color: #9ca3af;
  }

  .help-item svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: #22c55e;
  }

  /* 响应式 */
  @media (max-width: 480px) {
    .status-cards {
      grid-template-columns: 1fr;
    }

    .pill-grid {
      grid-template-columns: repeat(3, 1fr);
    }

    .offer-controls {
      flex-direction: column;
    }

    .offer-btn {
      width: 100%;
    }
  }
</style>
