<template>
  <div class="loot-page">
    <div class="page-header">
      <div class="header-icon">
        <Coins :size="24" />
      </div>
      <div class="header-info">
        <h2>夺宝</h2>
        <p>掠夺其他修士的灵石资源</p>
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="status-bar">
      <div class="status-item">
        <Flame :size="16" />
        <span>今日掠夺：{{ status?.dailyLoots || 0 }} / {{ status?.maxDailyLoots || 5 }}</span>
      </div>
      <div class="status-item" :class="{ ready: status?.canLoot, cooldown: !status?.canLoot }">
        <Timer :size="16" />
        <span v-if="status?.canLoot">可掠夺</span>
        <span v-else>冷却中 {{ formatCooldown(status?.cooldownRemaining || 0) }}</span>
      </div>
    </div>

    <!-- 我的掠夺统计 -->
    <div class="my-stats">
      <div class="stat-item">
        <span class="stat-value">{{ myStats?.value?.toLocaleString() || 0 }}</span>
        <span class="stat-label">总掠夺灵石</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ myStats?.rank && myStats.rank > 0 ? `#${myStats.rank}` : '--' }}</span>
        <span class="stat-label">掠夺榜排名</span>
      </div>
    </div>

    <!-- 目标列表 -->
    <div class="targets-section">
      <div class="section-header">
        <h3>
          <Target :size="18" />
          可掠夺目标
        </h3>
        <button class="refresh-btn" @click="fetchTargets" :disabled="loadingTargets">
          <RefreshCw :size="14" :class="{ spinning: loadingTargets }" />
        </button>
      </div>

      <div v-if="loadingTargets" class="loading-state">
        <n-spin size="medium" />
        <span>搜索目标中...</span>
      </div>

      <div v-else-if="targets.length === 0" class="empty-state">
        <Users :size="48" class="empty-icon" />
        <span>暂无可掠夺的目标</span>
      </div>

      <div v-else class="target-list">
        <div v-for="target in targets" :key="target.id" class="target-card">
          <div class="target-info">
            <div class="target-name">
              {{ target.name }}
              <Shield v-if="target.hasFormation" :size="12" class="formation-icon" />
            </div>
            <div class="target-realm">{{ target.realmName }}</div>
            <div v-if="target.sectName" class="target-sect">{{ target.sectName }}</div>
          </div>
          <div class="target-stats">
            <div class="stat">
              <Sword :size="12" />
              <span>{{ target.power.toLocaleString() }}</span>
            </div>
            <div class="stat treasure">
              <Coins :size="12" />
              <span>{{ formatStones(target.spiritStones) }}</span>
            </div>
          </div>
          <button class="loot-btn" :disabled="!status?.canLoot || looting" @click="handleLoot(target.id)">
            <Swords :size="14" />
            掠夺
          </button>
        </div>
      </div>
    </div>

    <!-- 掠夺结果弹窗 -->
    <n-modal v-model:show="showResult" preset="card" title="掠夺结果" style="max-width: 400px">
      <div class="loot-result">
        <div class="result-header" :class="lootResult?.success ? 'success' : 'fail'">
          <component :is="lootResult?.success ? Coins : ShieldX" :size="48" />
          <span class="result-text">{{ lootResult?.success ? '掠夺成功' : '掠夺失败' }}</span>
        </div>
        <p class="result-message">{{ lootResult?.message }}</p>

        <div v-if="lootResult?.success" class="loot-amount">
          <Coins :size="20" />
          <span>+{{ lootResult?.lootedAmount?.toLocaleString() }}</span>
        </div>

        <div class="power-compare">
          <div class="power-item">
            <span class="power-label">我方战力</span>
            <span class="power-value">{{ lootResult?.attackerPower?.toLocaleString() }}</span>
          </div>
          <span class="vs">VS</span>
          <div class="power-item">
            <span class="power-label">目标战力</span>
            <span class="power-value">{{ lootResult?.defenderPower?.toLocaleString() }}</span>
          </div>
        </div>

        <div v-if="lootResult?.formationBlocked" class="formation-blocked">
          <Shield :size="16" />
          <span>目标阵法发动，闪避了攻击！</span>
        </div>

        <div v-if="lootResult?.success && lootResult?.evilPointsGain > 0" class="evil-gain">
          <Skull :size="14" />
          <span>恶人值 +{{ lootResult.evilPointsGain }}</span>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue'
  import { Coins, Flame, Timer, Target, RefreshCw, Users, Sword, Shield, Swords, ShieldX, Skull } from 'lucide-vue-next'
  import { useMessage } from 'naive-ui'
  import { lootApi, extractErrorMessage } from '@/api'

  interface LootStatus {
    canLoot: boolean
    cooldownRemaining: number
    dailyLoots: number
    maxDailyLoots: number
    lastLootTime: number | null
  }

  interface LootTarget {
    id: string
    name: string
    realmTier: number
    realmName: string
    power: number
    spiritStones: number
    sectId: string | null
    sectName: string | null
    hasFormation: boolean
  }

  interface LootResult {
    success: boolean
    message: string
    lootedAmount: number
    attackerPower: number
    defenderPower: number
    formationBlocked: boolean
    evilPointsGain: number
  }

  interface LootStats {
    type: string
    rank: number
    value: number
    total: number
  }

  const message = useMessage()

  const status = ref<LootStatus | null>(null)
  const targets = ref<LootTarget[]>([])
  const myStats = ref<LootStats | null>(null)
  const loadingTargets = ref(false)
  const looting = ref(false)
  const showResult = ref(false)
  const lootResult = ref<LootResult | null>(null)

  const formatCooldown = (ms: number) => {
    const seconds = Math.ceil(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatStones = (amount: number) => {
    if (amount >= 10000) {
      return (amount / 10000).toFixed(1) + '万'
    }
    return amount.toLocaleString()
  }

  const fetchStatus = async () => {
    try {
      const data = await lootApi.getStatus()
      status.value = data.data
    } catch (err) {
      message.error(extractErrorMessage(err, '获取状态失败'))
    }
  }

  const fetchTargets = async () => {
    loadingTargets.value = true
    try {
      const data = await lootApi.getTargets(20)
      targets.value = data.data
    } catch (err) {
      message.error(extractErrorMessage(err, '获取目标失败'))
    } finally {
      loadingTargets.value = false
    }
  }

  const fetchStats = async () => {
    try {
      const data = await lootApi.getStats()
      myStats.value = data.data
    } catch {
      // Ignore stats fetch error
    }
  }

  const handleLoot = async (targetId: string) => {
    if (!status.value?.canLoot || looting.value) return

    looting.value = true
    try {
      const data = await lootApi.attack(targetId)
      lootResult.value = data.data
      showResult.value = true
      await Promise.all([fetchStatus(), fetchTargets(), fetchStats()])
    } catch (err) {
      message.error(extractErrorMessage(err, '掠夺失败'))
    } finally {
      looting.value = false
    }
  }

  // 定时更新冷却
  let cooldownTimer: ReturnType<typeof setInterval> | null = null

  onMounted(async () => {
    await Promise.all([fetchStatus(), fetchTargets(), fetchStats()])

    cooldownTimer = setInterval(() => {
      if (status.value && !status.value.canLoot && status.value.cooldownRemaining > 0) {
        status.value.cooldownRemaining -= 1000
        if (status.value.cooldownRemaining <= 0) {
          status.value.canLoot = true
          status.value.cooldownRemaining = 0
        }
      }
    }, 1000)
  })

  onUnmounted(() => {
    if (cooldownTimer) {
      clearInterval(cooldownTimer)
    }
  })
</script>

<style scoped>
  .loot-page {
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
    background: linear-gradient(135deg, #6b5a8a 0%, #4a3a6a 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    border: 1px solid rgba(150, 120, 180, 0.5);
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

  .status-item.cooldown {
    color: #f59e0b;
  }

  .my-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }

  .my-stats .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-gold);
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: 4px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .section-header h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    color: var(--text-primary);
    margin: 0;
  }

  .refresh-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-card);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .refresh-btn:hover:not(:disabled) {
    border-color: var(--color-gold);
    color: var(--color-gold);
  }

  .refresh-btn:disabled {
    opacity: 0.5;
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
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .formation-icon {
    color: #4ade80;
  }

  .target-realm {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .target-sect {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .target-stats {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-end;
  }

  .target-stats .stat {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .target-stats .stat.treasure {
    color: var(--color-gold);
    font-weight: 600;
  }

  .loot-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 14px;
    background: linear-gradient(135deg, #6b5a8a 0%, #4a3a6a 100%);
    color: #fff;
    border: 1px solid rgba(150, 120, 180, 0.5);
    border-radius: 4px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .loot-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #7b6a9a 0%, #5a4a7a 100%);
  }

  .loot-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 结果弹窗 */
  .loot-result {
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

  .result-header.success {
    color: var(--color-gold);
    background: rgba(201, 169, 89, 0.1);
  }

  .result-header.fail {
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

  .loot-amount {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    margin-bottom: 16px;
    background: rgba(201, 169, 89, 0.15);
    border-radius: 4px;
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-gold);
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

  .formation-blocked {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    margin-bottom: 12px;
    background: rgba(74, 222, 128, 0.1);
    color: #4ade80;
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .evil-gain {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 0.85rem;
    color: #f87171;
  }
</style>
