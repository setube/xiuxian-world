<template>
  <div class="wooden-dummy-page">
    <div class="page-header">
      <div class="header-icon">
        <Sword :size="24" />
      </div>
      <div class="header-info">
        <h2>木人阁</h2>
        <p>与木人傀儡切磋，评估自身战力</p>
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="status-bar">
      <div class="status-item">
        <Timer :size="16" />
        <span v-if="status?.canChallenge" class="ready">可挑战</span>
        <span v-else class="cooldown">冷却中 {{ formatCooldown(status?.cooldownRemaining || 0) }}</span>
      </div>
      <div v-if="status?.bestRecord" class="status-item best-record">
        <Trophy :size="16" />
        <span>最高击败：{{ status.bestRecord.dummyName }}</span>
      </div>
    </div>

    <!-- 今日统计 -->
    <div class="today-stats">
      <div class="stat-item">
        <span class="stat-value">{{ status?.todayStats?.totalChallenges || 0 }}</span>
        <span class="stat-label">今日挑战</span>
      </div>
      <div class="stat-item win">
        <span class="stat-value">{{ status?.todayStats?.wins || 0 }}</span>
        <span class="stat-label">胜利</span>
      </div>
      <div class="stat-item lose">
        <span class="stat-value">{{ status?.todayStats?.losses || 0 }}</span>
        <span class="stat-label">失败</span>
      </div>
      <div class="stat-item draw">
        <span class="stat-value">{{ status?.todayStats?.draws || 0 }}</span>
        <span class="stat-label">平局</span>
      </div>
    </div>

    <!-- 境界选择 -->
    <div class="realm-selector">
      <h3>选择木人境界</h3>
      <div class="realm-grid">
        <div
          v-for="realm in realmOptions"
          :key="realm.tier"
          class="realm-card"
          :class="{ selected: selectedRealm === realm.tier }"
          @click="selectedRealm = realm.tier"
        >
          <div class="realm-name">{{ realm.name }}</div>
          <div class="realm-cost">
            <Coins :size="12" />
            {{ realm.cost }}
          </div>
        </div>
      </div>
    </div>

    <!-- 小境界选择 -->
    <div v-if="selectedRealm" class="sub-realm-selector">
      <h4>选择小境界</h4>
      <div class="sub-realm-options">
        <div
          v-for="sub in subRealmOptions"
          :key="sub.value"
          class="sub-realm-option"
          :class="{ selected: selectedSubRealm === sub.value }"
          @click="selectedSubRealm = sub.value"
        >
          {{ sub.name }}
        </div>
      </div>
    </div>

    <!-- 挑战按钮 -->
    <button class="challenge-btn" :disabled="!canChallenge" @click="handleChallenge">
      <Swords :size="18" />
      {{ challenging ? '切磋中...' : '开始切磋' }}
    </button>

    <!-- 战斗结果弹窗 -->
    <n-modal v-model:show="showResult" preset="card" title="切磋结果" style="max-width: 400px">
      <div class="battle-result">
        <div class="result-header" :class="resultClass">
          <component :is="resultIcon" :size="48" />
          <span class="result-text">{{ resultText }}</span>
        </div>
        <div class="result-stats">
          <div class="stat-row">
            <span>战斗回合</span>
            <span>{{ battleResult?.record?.roundsLasted || 0 }} / {{ battleResult?.record?.totalRounds || 50 }}</span>
          </div>
          <div class="stat-row">
            <span>造成伤害</span>
            <span class="damage-dealt">{{ battleResult?.record?.damageDealt?.toLocaleString() || 0 }}</span>
          </div>
          <div class="stat-row">
            <span>承受伤害</span>
            <span class="damage-taken">{{ battleResult?.record?.damageTaken?.toLocaleString() || 0 }}</span>
          </div>
          <div class="stat-row">
            <span>战力对比</span>
            <span>{{ battleResult?.record?.characterPower || 0 }} vs {{ battleResult?.record?.dummyPower || 0 }}</span>
          </div>
        </div>
      </div>
    </n-modal>

    <!-- 战斗历史 -->
    <div class="history-section">
      <h3>
        <History :size="18" />
        战斗记录
      </h3>
      <div v-if="history.length === 0" class="empty-history">暂无战斗记录</div>
      <div v-else class="history-list">
        <div v-for="record in history" :key="record.id" class="history-item" :class="getResultClass(record.result)">
          <div class="history-info">
            <span class="dummy-name">{{ record.dummyName }}</span>
            <span class="battle-time">{{ formatTime(record.createdAt) }}</span>
          </div>
          <div class="history-result">
            <span class="result-badge">{{ getResultText(record.result) }}</span>
            <span class="rounds">{{ record.roundsLasted }}回合</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { Sword, Timer, Trophy, Coins, Swords, History, CheckCircle, XCircle, MinusCircle } from 'lucide-vue-next'
  import { useMessage } from 'naive-ui'
  import { woodenDummyApi, extractErrorMessage } from '@/api'

  interface WoodenDummyStatus {
    canChallenge: boolean
    cooldownRemaining: number
    lastChallengeTime: number | null
    bestRecord: {
      realmTier: number
      realmSubTier: number
      dummyName: string
      result: number
    } | null
    todayStats: {
      totalChallenges: number
      wins: number
      losses: number
      draws: number
    }
  }

  interface BattleRecord {
    id: string
    dummyName: string
    dummyRealmTier: number
    dummyRealmSubTier: number
    result: number
    roundsLasted: number
    totalRounds: number
    damageDealt: number
    damageTaken: number
    characterPower: number
    dummyPower: number
    createdAt: string
  }

  interface BattleResult {
    success: boolean
    result: number
    record: BattleRecord
    message: string
  }

  const message = useMessage()

  const status = ref<WoodenDummyStatus | null>(null)
  const history = ref<BattleRecord[]>([])
  const selectedRealm = ref<number>(1)
  const selectedSubRealm = ref<number>(2)
  const challenging = ref(false)
  const showResult = ref(false)
  const battleResult = ref<BattleResult | null>(null)

  const realmOptions = [
    { tier: 1, name: '炼气期', cost: 10 },
    { tier: 2, name: '筑基期', cost: 50 },
    { tier: 3, name: '结丹期', cost: 200 },
    { tier: 4, name: '元婴期', cost: 500 },
    { tier: 5, name: '化神期', cost: 1000 },
    { tier: 6, name: '炼虚期', cost: 2000 },
    { tier: 7, name: '合体期', cost: 5000 },
    { tier: 8, name: '大乘期', cost: 10000 },
    { tier: 9, name: '渡劫期', cost: 20000 }
  ]

  const subRealmOptions = [
    { value: 1, name: '初期' },
    { value: 2, name: '中期' },
    { value: 3, name: '后期' },
    { value: 4, name: '圆满' }
  ]

  const canChallenge = computed(() => {
    return status.value?.canChallenge && !challenging.value && selectedRealm.value
  })

  const resultClass = computed(() => {
    if (!battleResult.value) return ''
    if (battleResult.value.result === 1) return 'win'
    if (battleResult.value.result === 0) return 'lose'
    return 'draw'
  })

  const resultText = computed(() => {
    if (!battleResult.value) return ''
    if (battleResult.value.result === 1) return '胜利'
    if (battleResult.value.result === 0) return '失败'
    return '平局'
  })

  const resultIcon = computed(() => {
    if (!battleResult.value) return CheckCircle
    if (battleResult.value.result === 1) return CheckCircle
    if (battleResult.value.result === 0) return XCircle
    return MinusCircle
  })

  const formatCooldown = (ms: number) => {
    const seconds = Math.ceil(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatTime = (time: string) => {
    const date = new Date(time)
    return date.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const getResultClass = (result: number) => {
    if (result === 1) return 'win'
    if (result === 0) return 'lose'
    return 'draw'
  }

  const getResultText = (result: number) => {
    if (result === 1) return '胜'
    if (result === 0) return '败'
    return '平'
  }

  const fetchStatus = async () => {
    try {
      const data = await woodenDummyApi.getStatus()
      status.value = data.data
    } catch (err) {
      message.error(extractErrorMessage(err, '获取状态失败'))
    }
  }

  const fetchHistory = async () => {
    try {
      const data = await woodenDummyApi.getHistory(10)
      history.value = data.data
    } catch (err) {
      message.error(extractErrorMessage(err, '获取记录失败'))
    }
  }

  const handleChallenge = async () => {
    if (!canChallenge.value) return

    challenging.value = true
    try {
      const data = await woodenDummyApi.challenge(selectedRealm.value, selectedSubRealm.value)
      battleResult.value = data.data
      showResult.value = true
      message.success(data.data.message)
      await Promise.all([fetchStatus(), fetchHistory()])
    } catch (err) {
      message.error(extractErrorMessage(err, '挑战失败'))
    } finally {
      challenging.value = false
    }
  }

  // 定时刷新冷却状态
  let cooldownTimer: ReturnType<typeof setInterval> | null = null

  onMounted(async () => {
    await Promise.all([fetchStatus(), fetchHistory()])

    cooldownTimer = setInterval(() => {
      if (status.value && !status.value.canChallenge && status.value.cooldownRemaining > 0) {
        status.value.cooldownRemaining -= 1000
        if (status.value.cooldownRemaining <= 0) {
          status.value.canChallenge = true
          status.value.cooldownRemaining = 0
        }
      }
    }, 1000)
  })

  // 清理定时器
  import { onUnmounted } from 'vue'
  onUnmounted(() => {
    if (cooldownTimer) {
      clearInterval(cooldownTimer)
    }
  })
</script>

<style scoped>
  .wooden-dummy-page {
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
    background: linear-gradient(135deg, #8b6914 0%, #6b4e0f 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    border: 1px solid rgba(201, 169, 89, 0.5);
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
  }

  .status-item .ready {
    color: #4ade80;
  }

  .status-item .cooldown {
    color: #f59e0b;
  }

  .best-record {
    color: var(--color-gold);
  }

  .today-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 20px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .stat-item.win .stat-value {
    color: #4ade80;
  }

  .stat-item.lose .stat-value {
    color: #f87171;
  }

  .stat-item.draw .stat-value {
    color: #fbbf24;
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: 4px;
  }

  .realm-selector h3,
  .history-section h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    color: var(--text-primary);
    margin: 0 0 12px;
  }

  .realm-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  }

  .realm-card {
    padding: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
  }

  .realm-card:hover {
    border-color: var(--color-gold);
  }

  .realm-card.selected {
    background: linear-gradient(135deg, rgba(201, 169, 89, 0.2) 0%, rgba(160, 128, 64, 0.1) 100%);
    border-color: var(--color-gold);
  }

  .realm-name {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .realm-cost {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 0.8rem;
    color: var(--color-gold);
  }

  .sub-realm-selector h4 {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0 0 8px;
  }

  .sub-realm-options {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
  }

  .sub-realm-option {
    flex: 1;
    padding: 8px;
    text-align: center;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--text-secondary);
    transition: all 0.2s ease;
  }

  .sub-realm-option:hover {
    border-color: var(--color-gold);
  }

  .sub-realm-option.selected {
    background: rgba(201, 169, 89, 0.15);
    border-color: var(--color-gold);
    color: var(--color-gold);
  }

  .challenge-btn {
    width: 100%;
    padding: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    color: var(--text-primary);
    border: 1px solid rgba(93, 124, 111, 0.5);
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 24px;
  }

  .challenge-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #6d8c7f 0%, #4d6a5f 100%);
  }

  .challenge-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

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

  .result-header.draw {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.1);
  }

  .result-text {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .result-stats {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    padding: 8px;
    background: var(--bg-card);
    border-radius: 4px;
  }

  .damage-dealt {
    color: #4ade80;
  }

  .damage-taken {
    color: #f87171;
  }

  .history-section {
    margin-top: 24px;
  }

  .empty-history {
    text-align: center;
    padding: 24px;
    color: var(--text-secondary);
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

  .dummy-name {
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
    gap: 8px;
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

  .rounds {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }
</style>
