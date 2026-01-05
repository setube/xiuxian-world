<template>
  <div class="arena-page">
    <div class="page-header">
      <div class="header-icon">
        <Swords :size="24" />
      </div>
      <div class="header-info">
        <h2>斗法场</h2>
        <p>与其他修士一决高下</p>
      </div>
    </div>

    <!-- 神魂状态提示 -->
    <SoulStatusBadge v-if="playerStore.isSoulTurbulent || playerStore.isSoulShattered" class="soul-status-section" />

    <!-- 状态栏 -->
    <div class="status-bar">
      <div class="status-item">
        <Flame :size="16" />
        <span>今日挑战：{{ status?.dailyChallenges || 0 }} / {{ status?.maxChallenges || 10 }}</span>
      </div>
      <div class="status-item" :class="{ ready: canChallenge, disabled: !canChallenge }">
        <component :is="canChallenge ? CheckCircle : XCircle" :size="16" />
        <span>{{ canChallenge ? '可挑战' : challengeDisabledReason }}</span>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="tabs">
      <div class="tab-item" :class="{ active: activeTab === 'targets' }" @click="activeTab = 'targets'">
        <Target :size="16" />
        挑战目标
      </div>
      <div class="tab-item" :class="{ active: activeTab === 'history' }" @click="switchToHistory">
        <History :size="16" />
        战斗记录
      </div>
      <div class="tab-item" :class="{ active: activeTab === 'enemies' }" @click="activeTab = 'enemies'">
        <Skull :size="16" />
        仇敌名录
      </div>
    </div>

    <!-- 挑战目标列表 -->
    <div v-if="activeTab === 'targets'" class="targets-section">
      <div v-if="loadingTargets" class="loading-state">
        <n-spin size="medium" />
        <span>搜寻对手中...</span>
      </div>

      <div v-else-if="targets.length === 0" class="empty-state">
        <Users :size="48" class="empty-icon" />
        <span>暂无可挑战的目标</span>
        <button class="refresh-btn" @click="fetchTargets">
          <RefreshCw :size="14" />
          刷新列表
        </button>
      </div>

      <div v-else class="target-list">
        <div v-for="target in targets" :key="target.id" class="target-card" :class="{ 'is-enemy': isEnemy(target.id) }">
          <div class="target-info">
            <div class="target-name">
              {{ target.name }}
              <span v-if="isEnemy(target.id)" class="enemy-tag">
                <Skull :size="12" />
                仇敌
              </span>
            </div>
            <div class="target-realm">{{ target.realmName }}</div>
            <div v-if="target.sectName" class="target-sect">{{ target.sectName }}</div>
          </div>
          <div class="target-power">
            <Sword :size="14" />
            <span>{{ target.power.toLocaleString() }}</span>
            <span v-if="isEnemy(target.id)" class="enemy-bonus">+5%</span>
          </div>
          <button class="challenge-btn" :disabled="!canChallenge || challenging" @click="handleChallenge(target.id)">
            <Swords :size="14" />
            挑战
          </button>
        </div>

        <button class="refresh-btn" @click="fetchTargets">
          <RefreshCw :size="14" />
          刷新列表
        </button>
      </div>
    </div>

    <!-- 战斗历史 -->
    <div v-if="activeTab === 'history'" class="history-section">
      <div v-if="loadingHistory" class="loading-state">
        <n-spin size="medium" />
        <span>加载中...</span>
      </div>

      <div v-else-if="history.length === 0" class="empty-state">
        <History :size="48" class="empty-icon" />
        <span>暂无战斗记录</span>
      </div>

      <div v-else class="history-list">
        <div v-for="record in history" :key="record.id" class="history-item" :class="record.result">
          <div class="history-info">
            <span class="opponent-name">
              {{ record.isChallenger ? '挑战' : '被' }}
              {{ record.opponentName }}
            </span>
            <span class="battle-time">{{ formatTime(record.createdAt) }}</span>
          </div>
          <div class="history-result">
            <span class="result-badge">{{ getResultText(record.result) }}</span>
            <span class="cultivation-change" :class="{ positive: record.cultivationChange > 0, negative: record.cultivationChange < 0 }">
              {{ record.cultivationChange > 0 ? '+' : '' }}{{ record.cultivationChange }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 仇敌名录 -->
    <div v-if="activeTab === 'enemies'" class="enemies-section">
      <EnemyListPanel />
    </div>

    <!-- 战斗结果弹窗 -->
    <n-modal v-model:show="showResult" preset="card" title="战斗结果" style="max-width: 400px">
      <div class="battle-result">
        <div class="result-header" :class="battleResult?.success ? 'win' : 'lose'">
          <component :is="battleResult?.success ? Trophy : Frown" :size="48" />
          <span class="result-text">{{ battleResult?.success ? '胜利' : '失败' }}</span>
        </div>
        <p class="result-message">{{ battleResult?.message }}</p>
        <div class="power-compare">
          <div class="power-item">
            <span class="power-label">我方战力</span>
            <span class="power-value">{{ battleResult?.challengerPower?.toLocaleString() }}</span>
          </div>
          <span class="vs">VS</span>
          <div class="power-item">
            <span class="power-label">敌方战力</span>
            <span class="power-value">{{ battleResult?.defenderPower?.toLocaleString() }}</span>
          </div>
        </div>
        <div v-if="battleResult?.rewards" class="rewards-info">
          <div
            class="reward-item"
            :class="{ positive: battleResult.rewards.cultivationChange > 0, negative: battleResult.rewards.cultivationChange < 0 }"
          >
            <TrendingUp :size="14" />
            <span>修为 {{ battleResult.rewards.cultivationChange > 0 ? '+' : '' }}{{ battleResult.rewards.cultivationChange }}</span>
          </div>
          <div v-if="battleResult.rewards.shaEnergyGain > 0" class="reward-item positive">
            <Flame :size="14" />
            <span>煞气 +{{ battleResult.rewards.shaEnergyGain }}</span>
          </div>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, computed } from 'vue'
  import {
    Swords,
    Flame,
    CheckCircle,
    XCircle,
    Target,
    History,
    Users,
    RefreshCw,
    Sword,
    Trophy,
    Frown,
    TrendingUp,
    Skull
  } from 'lucide-vue-next'
  import { useMessage } from 'naive-ui'
  import { pvpApi, extractErrorMessage } from '@/api'
  import { usePlayerStore } from '@/stores/player'
  import SoulStatusBadge from './components/SoulStatusBadge.vue'
  import EnemyListPanel from './components/EnemyListPanel.vue'

  interface PvpStatus {
    dailyChallenges: number
    maxChallenges: number
    canChallenge: boolean
    todayDate: string
  }

  interface PvpTarget {
    id: string
    name: string
    realm: number
    realmName: string
    power: number
    sectId: string | null
    sectName: string | null
  }

  interface PvpHistoryItem {
    id: string
    opponentName: string
    opponentId: string
    isChallenger: boolean
    result: 'win' | 'lose' | 'draw'
    powerDiff: number
    cultivationChange: number
    createdAt: number
  }

  interface ChallengeResult {
    id: string
    success: boolean
    message: string
    challengerPower: number
    defenderPower: number
    result: string
    rewards: {
      cultivationChange: number
      shaEnergyGain: number
    }
  }

  const message = useMessage()
  const playerStore = usePlayerStore()

  const status = ref<PvpStatus | null>(null)
  const targets = ref<PvpTarget[]>([])
  const history = ref<PvpHistoryItem[]>([])
  const activeTab = ref<'targets' | 'history' | 'enemies'>('targets')
  const loadingTargets = ref(false)
  const loadingHistory = ref(false)
  const challenging = ref(false)
  const showResult = ref(false)
  const battleResult = ref<ChallengeResult | null>(null)

  // 是否可以发起挑战（综合状态+道心破碎判断）
  const canChallenge = computed(() => {
    return status.value?.canChallenge && !playerStore.isSoulShattered
  })

  // 挑战按钮禁用原因
  const challengeDisabledReason = computed(() => {
    if (playerStore.isSoulShattered) return '道心破碎，无法斗法'
    if (!status.value?.canChallenge) return '挑战次数已用尽'
    return ''
  })

  // 检查目标是否是仇敌
  const isEnemy = (targetId: string) => {
    return playerStore.isEnemy(targetId)
  }

  const fetchStatus = async () => {
    try {
      const data = await pvpApi.getStatus()
      status.value = data.data
    } catch (err) {
      message.error(extractErrorMessage(err, '获取状态失败'))
    }
  }

  const fetchTargets = async () => {
    loadingTargets.value = true
    try {
      const data = await pvpApi.getTargets(20)
      targets.value = data.data
    } catch (err) {
      message.error(extractErrorMessage(err, '获取目标失败'))
    } finally {
      loadingTargets.value = false
    }
  }

  const fetchHistory = async () => {
    loadingHistory.value = true
    try {
      const data = await pvpApi.getHistory(20)
      history.value = data.data
    } catch (err) {
      message.error(extractErrorMessage(err, '获取记录失败'))
    } finally {
      loadingHistory.value = false
    }
  }

  const switchToHistory = async () => {
    activeTab.value = 'history'
    if (history.value.length === 0) {
      await fetchHistory()
    }
  }

  const handleChallenge = async (targetId: string) => {
    if (!canChallenge.value || challenging.value) return

    challenging.value = true
    try {
      const data = await pvpApi.challenge(targetId)
      battleResult.value = data.data
      showResult.value = true
      // 挑战后刷新状态，包括神魂状态
      await Promise.all([fetchStatus(), fetchTargets(), playerStore.fetchSoulStatus()])
    } catch (err) {
      message.error(extractErrorMessage(err, '挑战失败'))
    } finally {
      challenging.value = false
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getResultText = (result: string) => {
    if (result === 'win') return '胜'
    if (result === 'lose') return '败'
    return '平'
  }

  onMounted(async () => {
    await Promise.all([fetchStatus(), fetchTargets(), playerStore.fetchSoulStatus()])
  })
</script>

<style scoped>
  .arena-page {
    padding: 16px;
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .header-icon {
    width: 48px;
    height: 48px;
    border-radius: 4px;
    background: linear-gradient(135deg, #8b3a3a 0%, #6b2a2a 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    border: 1px solid rgba(200, 100, 100, 0.5);
  }

  .header-info h2 {
    margin: 0 0 4px;
    font-size: 1.2rem;
    color: var(--text-primary);
    letter-spacing: 2px;
  }

  .header-info p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .status-bar {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    padding: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .status-item.ready {
    color: #4ade80;
  }

  .status-item.disabled {
    color: #f87171;
  }

  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    padding: 4px;
    background: var(--bg-card);
    border-radius: 4px;
    border: 1px solid var(--border-color);
  }

  .tab-item {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    font-size: 0.9rem;
    color: var(--text-secondary);
    border-radius: 2px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab-item.active {
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    color: var(--text-primary);
    font-weight: 600;
  }

  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 48px;
    color: var(--text-secondary);
  }

  .empty-icon {
    opacity: 0.3;
  }

  .target-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .target-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }

  .target-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .target-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .target-realm {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .target-sect {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .target-power {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--color-gold);
    font-weight: 600;
    font-size: 0.9rem;
  }

  .challenge-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 14px;
    background: linear-gradient(135deg, #8b3a3a 0%, #6b2a2a 100%);
    color: #fff;
    border: 1px solid rgba(200, 100, 100, 0.5);
    border-radius: 4px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .challenge-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #9b4a4a 0%, #7b3a3a 100%);
  }

  .challenge-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 12px;
    padding: 10px;
    background: var(--bg-card);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;
  }

  .refresh-btn:hover {
    border-color: var(--color-gold);
    color: var(--color-gold);
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }

  .history-item.win {
    border-left: 3px solid #4ade80;
  }

  .history-item.lose {
    border-left: 3px solid #f87171;
  }

  .history-item.draw {
    border-left: 3px solid #fbbf24;
  }

  .history-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .opponent-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .battle-time {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .history-result {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .result-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .history-item.win .result-badge {
    background: rgba(74, 222, 128, 0.2);
    color: #4ade80;
  }

  .history-item.lose .result-badge {
    background: rgba(248, 113, 113, 0.2);
    color: #f87171;
  }

  .history-item.draw .result-badge {
    background: rgba(251, 191, 36, 0.2);
    color: #fbbf24;
  }

  .cultivation-change {
    font-size: 0.85rem;
    font-weight: 600;
  }

  .cultivation-change.positive {
    color: #4ade80;
  }

  .cultivation-change.negative {
    color: #f87171;
  }

  /* 战斗结果弹窗 */
  .battle-result {
    text-align: center;
  }

  .result-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px;
    margin-bottom: 16px;
    border-radius: 4px;
  }

  .result-header.win {
    color: #4ade80;
    background: rgba(74, 222, 128, 0.1);
  }

  .result-header.lose {
    color: #f87171;
    background: rgba(248, 113, 113, 0.1);
  }

  .result-text {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .result-message {
    margin: 0 0 16px;
    color: var(--text-secondary);
  }

  .power-compare {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-bottom: 16px;
    padding: 12px;
    background: var(--bg-card);
    border-radius: 4px;
  }

  .power-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .power-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .power-value {
    font-weight: 600;
    color: var(--color-gold);
  }

  .vs {
    font-weight: 700;
    color: var(--text-muted);
  }

  .rewards-info {
    display: flex;
    justify-content: center;
    gap: 16px;
  }

  .reward-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
  }

  .reward-item.positive {
    color: #4ade80;
  }

  .reward-item.negative {
    color: #f87171;
  }

  /* 神魂状态 */
  .soul-status-section {
    margin-bottom: 16px;
  }

  /* 仇敌标记 */
  .target-card.is-enemy {
    border-color: rgba(239, 68, 68, 0.4);
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, transparent 100%);
  }

  .target-name {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .enemy-tag {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 2px 6px;
    background: rgba(239, 68, 68, 0.2);
    border-radius: 4px;
    font-size: 0.7rem;
    color: #ef4444;
    font-weight: 600;
  }

  .enemy-bonus {
    color: #4ade80;
    font-size: 0.75rem;
    margin-left: 4px;
  }

  /* 仇敌名录 */
  .enemies-section {
    margin-top: 0;
  }
</style>
