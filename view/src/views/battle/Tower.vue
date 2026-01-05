<template>
  <div class="tower-page">
    <!-- 背景装饰 -->
    <div class="tower-bg-decor">
      <div class="rune rune-1">符</div>
      <div class="rune rune-2">塔</div>
      <div class="rune rune-3">镇</div>
    </div>

    <div class="page-header">
      <div class="header-icon">
        <Building :size="24" />
      </div>
      <div class="header-info">
        <h2>试炼古塔</h2>
        <p>通天古塔，挑战强大守卫</p>
      </div>
    </div>

    <!-- 古塔进度可视化 -->
    <div class="tower-visual">
      <div class="tower-structure">
        <div class="tower-top">
          <div class="tower-peak"></div>
        </div>
        <div class="tower-body">
          <div class="tower-progress" :style="{ height: towerProgressPercent + '%' }"></div>
          <div class="floor-markers">
            <div v-for="marker in [100, 50, 10]" :key="marker" class="floor-marker" :style="{ bottom: marker + '%' }">
              <span>{{ marker }}层</span>
            </div>
          </div>
        </div>
        <div class="tower-base"></div>
      </div>
      <div class="tower-stats">
        <div class="stat-main">
          <span class="stat-value">{{ status?.currentFloor || 0 }}</span>
          <span class="stat-label">当前层</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-sub">
          <div class="stat-row">
            <Trophy :size="14" />
            <span>最高 {{ status?.bestFloor || 0 }} 层</span>
          </div>
          <div class="stat-row">
            <Zap :size="14" />
            <span>挑战 {{ status?.dailyAttempts || 0 }}/{{ status?.maxDailyAttempts || 1 }}</span>
          </div>
          <div class="stat-row">
            <RefreshCw :size="14" />
            <span>重置 {{ status?.dailyResets || 0 }}/{{ status?.maxDailyResets || 3 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 当前层信息（在塔中时） -->
    <div v-if="status?.inTower && status?.nextFloor" class="floor-info">
      <div class="floor-info-header">
        <div class="floor-badge" :class="status.nextFloor.type">
          {{ getFloorTypeText(status.nextFloor.type) }}
        </div>
        <span class="floor-name">{{ status.nextFloor.name }}</span>
      </div>
      <div class="floor-info-body">
        <div class="guardian-card">
          <User :size="20" />
          <div class="guardian-detail">
            <span class="guardian-name">{{ status.nextFloor.guardianName }}</span>
            <span class="guardian-power">战力 {{ status.nextFloor.estimatedPower?.toLocaleString() }}</span>
          </div>
        </div>
        <div class="floor-rewards">
          <span class="rewards-label">通关奖励</span>
          <div class="reward-items">
            <span class="reward">
              <Coins :size="14" />
              {{ status.nextFloor.rewards?.spiritStones }}
            </span>
            <span class="reward">
              <Sparkles :size="14" />
              {{ status.nextFloor.rewards?.experience }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <button v-if="!status?.inTower" class="action-btn enter" :disabled="!canEnter" @click="handleEnter">
        <LogIn :size="18" />
        {{ loading ? '进入中...' : '进入古塔' }}
      </button>
      <template v-else>
        <button class="action-btn continue" :disabled="loading" @click="handleContinue">
          <Swords :size="18" />
          {{ loading ? '挑战中...' : '继续闯塔' }}
        </button>
        <button class="action-btn exit" :disabled="loading" @click="handleExit">
          <LogOut :size="18" />
          退出
        </button>
      </template>
    </div>

    <!-- 重置按钮 -->
    <div v-if="status?.bestFloor && status.bestFloor > 0" class="reset-section">
      <button class="reset-btn" :disabled="!canReset" @click="handleReset">
        <RefreshCw :size="16" />
        重置古塔
        <span v-if="status?.resetCost" class="reset-cost">({{ status.resetCost.toLocaleString() }} 修为)</span>
      </button>
      <p class="reset-hint">
        {{ status?.inTower ? '塔中无法重置' : status?.dailyResets >= status?.maxDailyResets ? '今日重置次数已用尽' : '重置后从第1层开始' }}
      </p>
    </div>

    <!-- 战斗结果弹窗 -->
    <n-modal v-model:show="showResult" preset="card" :title="null" style="max-width: 400px" :bordered="false">
      <div class="battle-result" :class="battleResult?.victory ? 'victory' : 'defeat'">
        <!-- 结果头部 -->
        <div class="result-banner">
          <div class="result-icon-wrap">
            <component :is="battleResult?.victory ? CheckCircle : XCircle" :size="56" />
          </div>
          <div class="result-title">{{ battleResult?.victory ? '挑战成功' : '挑战失败' }}</div>
          <div class="result-subtitle">
            <span class="floor-badge-mini" :class="battleResult?.floor?.type">
              {{ getFloorTypeText(battleResult?.floor?.type || 'normal') }}
            </span>
            {{ battleResult?.floor?.name }}
          </div>
        </div>

        <!-- 对战信息 -->
        <div class="battle-versus">
          <div class="versus-side player">
            <span class="side-label">玩家</span>
            <span class="side-icon"><Swords :size="24" /></span>
          </div>
          <div class="versus-center">VS</div>
          <div class="versus-side guardian">
            <span class="side-label">{{ battleResult?.floor?.guardianName }}</span>
            <span class="side-icon"><Shield :size="24" /></span>
          </div>
        </div>

        <!-- 战斗数据 -->
        <div class="battle-stats">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon"><Clock :size="20" /></div>
              <div class="stat-info">
                <span class="stat-value">{{ battleResult?.battleLog?.rounds || 0 }}</span>
                <span class="stat-label">回合</span>
              </div>
            </div>
            <div class="stat-card dealt">
              <div class="stat-icon"><Flame :size="20" /></div>
              <div class="stat-info">
                <span class="stat-value">{{ formatDamage(battleResult?.battleLog?.playerDamage) }}</span>
                <span class="stat-label">造成伤害</span>
              </div>
            </div>
            <div class="stat-card taken">
              <div class="stat-icon"><Heart :size="20" /></div>
              <div class="stat-info">
                <span class="stat-value">{{ formatDamage(battleResult?.battleLog?.guardianDamage) }}</span>
                <span class="stat-label">承受伤害</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 获得奖励 -->
        <div v-if="battleResult?.victory && battleResult?.rewards" class="battle-rewards">
          <div class="rewards-header">
            <Gift :size="18" />
            <span>战利品</span>
          </div>
          <div class="rewards-content">
            <div class="reward-chip">
              <Coins :size="16" />
              <span>{{ battleResult.rewards.spiritStones?.toLocaleString() }}</span>
              <span class="reward-name">灵石</span>
            </div>
            <div class="reward-chip">
              <Sparkles :size="16" />
              <span>{{ battleResult.rewards.experience?.toLocaleString() }}</span>
              <span class="reward-name">修为</span>
            </div>
          </div>
          <!-- 特殊成就 -->
          <div v-if="battleResult.isFirstClear || battleResult.isServerFirst" class="special-badges">
            <div v-if="battleResult.isServerFirst" class="achievement-badge server-first">
              <Crown :size="16" />
              <span>全服首杀</span>
            </div>
            <div v-else-if="battleResult.isFirstClear" class="achievement-badge first-clear">
              <Star :size="16" />
              <span>首次通关</span>
            </div>
          </div>
        </div>

        <!-- 突破提示 -->
        <div v-if="battleResult?.breakthrough" class="breakthrough-notice">
          <div class="breakthrough-icon">
            <Sparkles :size="20" />
          </div>
          <div class="breakthrough-text">
            <span class="breakthrough-title">境界突破</span>
            <span class="breakthrough-realm">{{ battleResult.breakthrough.newRealmName }}</span>
          </div>
        </div>

        <!-- 失败提示 -->
        <div v-if="!battleResult?.victory" class="defeat-hint">
          <span>被逐出古塔，下次再战！</span>
        </div>
      </div>
    </n-modal>

    <!-- 标签页：排行/首杀/记录 -->
    <n-tabs type="line" animated class="info-tabs">
      <n-tab-pane name="ranking" tab="琉璃塔榜">
        <div class="ranking-list">
          <div v-if="rankings.length === 0" class="empty">暂无排名数据</div>
          <div v-for="(item, index) in rankings" :key="item.characterId" class="ranking-item">
            <div class="rank-pos" :class="getRankClass(index + 1)">{{ index + 1 }}</div>
            <div class="rank-info">
              <span class="rank-name">{{ item.characterName }}</span>
              <span class="rank-floor">最高 {{ item.bestFloor }} 层</span>
            </div>
          </div>
        </div>
      </n-tab-pane>

      <n-tab-pane name="firsts" tab="全服首杀">
        <div class="firsts-list">
          <div v-if="serverFirsts.length === 0" class="empty">暂无首杀记录</div>
          <div v-for="first in serverFirsts" :key="first.floor" class="first-item">
            <div class="first-floor">
              <Crown :size="14" />
              第{{ first.floor }}层
            </div>
            <div class="first-info">
              <span class="first-name">{{ first.characterName }}</span>
              <span class="first-time">{{ formatTime(first.clearedAt) }}</span>
            </div>
          </div>
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import {
    Building,
    Trophy,
    Zap,
    RefreshCw,
    User,
    Coins,
    Sparkles,
    LogIn,
    LogOut,
    Swords,
    CheckCircle,
    XCircle,
    Star,
    Crown,
    Shield,
    Clock,
    Flame,
    Heart,
    Gift
  } from 'lucide-vue-next'
  import { useMessage } from 'naive-ui'
  import { towerApi, extractErrorMessage } from '@/api'

  interface FloorInfo {
    floor: number
    name: string
    type: string
    guardianName: string
    estimatedPower: number
    rewards: {
      spiritStones: number
      experience: number
    }
  }

  interface TowerStatus {
    currentFloor: number
    bestFloor: number
    inTower: boolean
    dailyAttempts: number
    maxDailyAttempts: number
    dailyResets: number
    maxDailyResets: number
    resetCost: number
    nextFloor?: FloorInfo
    clearedFloors: number[]
  }

  interface BattleResult {
    victory: boolean
    floor: FloorInfo
    battleLog: {
      rounds: number
      playerDamage: number
      guardianDamage: number
    }
    rewards?: {
      spiritStones: number
      experience: number
    }
    isFirstClear: boolean
    isServerFirst: boolean
    nextFloor?: FloorInfo
    breakthrough?: {
      newRealmName: string
      breakthroughCount: number
    }
  }

  interface RankingItem {
    characterId: string
    characterName: string
    bestFloor: number
  }

  interface ServerFirst {
    floor: number
    characterId: string
    characterName: string
    clearedAt: string
  }

  const message = useMessage()

  const status = ref<TowerStatus | null>(null)
  const rankings = ref<RankingItem[]>([])
  const serverFirsts = ref<ServerFirst[]>([])
  const loading = ref(false)
  const showResult = ref(false)
  const battleResult = ref<BattleResult | null>(null)

  const canEnter = computed(() => {
    if (!status.value) return false
    // 可以进入的条件：已用次数 < 免费次数 + 已重置次数
    return status.value.dailyAttempts < status.value.maxDailyAttempts + status.value.dailyResets
  })

  const canReset = computed(() => {
    if (!status.value) return false
    // 可以重置的条件：不在塔中、重置次数未达上限、已用完所有挑战次数
    const maxAttempts = status.value.maxDailyAttempts + status.value.dailyResets
    return !status.value.inTower && status.value.dailyResets < status.value.maxDailyResets && status.value.dailyAttempts >= maxAttempts
  })

  const towerProgressPercent = computed(() => {
    const current = status.value?.currentFloor || 0
    return Math.min((current / 100) * 100, 100)
  })

  const getFloorTypeText = (type: string) => {
    switch (type) {
      case 'boss':
        return '首领层'
      case 'elite':
        return '精英层'
      default:
        return '普通层'
    }
  }

  const getRankClass = (rank: number) => {
    if (rank === 1) return 'gold'
    if (rank === 2) return 'silver'
    if (rank === 3) return 'bronze'
    return ''
  }

  const formatTime = (time: string) => {
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDamage = (damage: number | undefined) => {
    if (!damage) return '0'
    if (damage >= 10000) {
      return (damage / 10000).toFixed(1) + '万'
    }
    return damage.toLocaleString()
  }

  const fetchStatus = async () => {
    try {
      const data = await towerApi.getStatus()
      status.value = data.data
    } catch (err) {
      message.error(extractErrorMessage(err, '获取状态失败'))
    }
  }

  const fetchRankings = async () => {
    try {
      const data = await towerApi.getRanking(20)
      rankings.value = data.data
    } catch (err) {
      console.error('获取排行失败', err)
    }
  }

  const fetchServerFirsts = async () => {
    try {
      const data = await towerApi.getServerFirsts()
      serverFirsts.value = data.data
    } catch (err) {
      console.error('获取首杀记录失败', err)
    }
  }

  const handleEnter = async () => {
    if (!canEnter.value || loading.value) return
    loading.value = true
    try {
      const data = await towerApi.enter()
      battleResult.value = data.data
      showResult.value = true
      if (data.data.victory) {
        message.success('成功击败守卫！')
      } else {
        message.warning('挑战失败，被逐出古塔')
      }
      await fetchAll()
    } catch (err) {
      message.error(extractErrorMessage(err, '进入古塔失败'))
    } finally {
      loading.value = false
    }
  }

  const handleContinue = async () => {
    if (loading.value) return
    loading.value = true
    try {
      const data = await towerApi.continue()
      battleResult.value = data.data
      showResult.value = true
      if (data.data.victory) {
        message.success('成功击败守卫！')
      } else {
        message.warning('挑战失败，被逐出古塔')
      }
      await fetchAll()
    } catch (err) {
      message.error(extractErrorMessage(err, '闯塔失败'))
    } finally {
      loading.value = false
    }
  }

  const handleExit = async () => {
    if (loading.value) return
    loading.value = true
    try {
      await towerApi.exit()
      message.success('已退出古塔')
      await fetchStatus()
    } catch (err) {
      message.error(extractErrorMessage(err, '退出失败'))
    } finally {
      loading.value = false
    }
  }

  const handleReset = async () => {
    if (!canReset.value || loading.value) return
    loading.value = true
    try {
      await towerApi.reset()
      message.success('古塔已重置')
      await fetchStatus()
    } catch (err) {
      message.error(extractErrorMessage(err, '重置失败'))
    } finally {
      loading.value = false
    }
  }

  const fetchAll = async () => {
    await Promise.all([fetchStatus(), fetchRankings(), fetchServerFirsts()])
  }

  onMounted(() => {
    fetchAll()
  })
</script>

<style scoped>
  .tower-page {
    padding: 16px;
    position: relative;
    overflow: hidden;
  }

  /* 背景装饰 */
  .tower-bg-decor {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .rune {
    position: absolute;
    font-size: 3rem;
    color: rgba(150, 130, 200, 0.06);
    font-weight: bold;
  }

  .rune-1 {
    top: 10%;
    right: 5%;
    animation: float 8s ease-in-out infinite;
  }

  .rune-2 {
    top: 50%;
    left: 3%;
    animation: float 10s ease-in-out infinite 2s;
  }

  .rune-3 {
    bottom: 20%;
    right: 10%;
    animation: float 9s ease-in-out infinite 4s;
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0) rotate(0deg);
    }
    50% {
      transform: translateY(-10px) rotate(5deg);
    }
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    position: relative;
  }

  .header-icon {
    width: 48px;
    height: 48px;
    border-radius: 4px;
    background: linear-gradient(135deg, #5c4a8a 0%, #3d2f6b 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    border: 1px solid rgba(150, 130, 200, 0.5);
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

  /* 古塔可视化 */
  .tower-visual {
    display: flex;
    gap: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
  }

  .tower-structure {
    width: 60px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .tower-top {
    width: 40px;
    height: 20px;
    position: relative;
  }

  .tower-peak {
    width: 0;
    height: 0;
    border-left: 20px solid transparent;
    border-right: 20px solid transparent;
    border-bottom: 20px solid rgba(150, 130, 200, 0.3);
  }

  .tower-body {
    width: 50px;
    height: 100px;
    background: rgba(80, 70, 100, 0.2);
    border: 1px solid rgba(150, 130, 200, 0.3);
    border-radius: 2px;
    position: relative;
    overflow: hidden;
  }

  .tower-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(150, 130, 200, 0.6), rgba(100, 80, 150, 0.4));
    transition: height 0.5s ease;
  }

  .floor-markers {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .floor-marker {
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background: rgba(150, 130, 200, 0.3);
  }

  .floor-marker span {
    position: absolute;
    left: -30px;
    top: -6px;
    font-size: 0.6rem;
    color: var(--text-secondary);
  }

  .tower-base {
    width: 60px;
    height: 10px;
    background: rgba(150, 130, 200, 0.3);
    border-radius: 0 0 4px 4px;
  }

  .tower-stats {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .stat-main {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 8px;
  }

  .stat-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-gold);
    line-height: 1;
  }

  .stat-label {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .stat-divider {
    height: 1px;
    background: var(--border-color);
    margin: 8px 0;
  }

  .stat-sub {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-sub .stat-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  /* 层级信息卡片 */
  .floor-info {
    background: linear-gradient(135deg, rgba(92, 74, 138, 0.15) 0%, rgba(61, 47, 107, 0.1) 100%);
    border: 1px solid rgba(150, 130, 200, 0.3);
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 16px;
  }

  .floor-info-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .floor-badge {
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .floor-badge.normal {
    background: rgba(100, 100, 100, 0.3);
    color: #aaa;
  }

  .floor-badge.elite {
    background: rgba(100, 149, 237, 0.3);
    color: #6495ed;
  }

  .floor-badge.boss {
    background: rgba(220, 60, 60, 0.3);
    color: #dc3c3c;
  }

  .floor-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .floor-info-body {
    display: flex;
    gap: 12px;
  }

  .guardian-card {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 6px;
  }

  .guardian-detail {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .guardian-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .guardian-power {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .floor-rewards {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    gap: 4px;
  }

  .rewards-label {
    font-size: 0.7rem;
    color: var(--text-secondary);
  }

  .reward-items {
    display: flex;
    gap: 10px;
  }

  .reward {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
    color: var(--color-gold);
  }

  /* 操作按钮 */
  .action-buttons {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .action-btn {
    flex: 1;
    padding: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn.enter {
    background: linear-gradient(135deg, #5c4a8a 0%, #3d2f6b 100%);
    color: var(--text-primary);
    border: 1px solid rgba(150, 130, 200, 0.5);
  }

  .action-btn.continue {
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    color: var(--text-primary);
    border: 1px solid rgba(93, 124, 111, 0.5);
  }

  .action-btn.exit {
    background: linear-gradient(135deg, #6b4a4a 0%, #4a2f2f 100%);
    color: var(--text-primary);
    border: 1px solid rgba(150, 100, 100, 0.5);
    flex: 0.4;
  }

  .action-btn:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 重置区域 */
  .reset-section {
    margin-bottom: 16px;
  }

  .reset-btn {
    width: 100%;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: transparent;
    color: var(--text-secondary);
    border: 1px dashed var(--border-color);
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .reset-btn:hover:not(:disabled) {
    border-color: var(--color-gold);
    color: var(--color-gold);
  }

  .reset-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .reset-cost {
    font-size: 0.8rem;
    color: #f59e0b;
  }

  .reset-hint {
    font-size: 0.7rem;
    color: var(--text-secondary);
    text-align: center;
    margin-top: 4px;
  }

  /* 战斗结果弹窗 */
  .battle-result {
    text-align: center;
    margin: -20px;
    padding: 0;
  }

  .battle-result.victory .result-banner {
    background: linear-gradient(180deg, rgba(74, 222, 128, 0.2) 0%, transparent 100%);
  }

  .battle-result.defeat .result-banner {
    background: linear-gradient(180deg, rgba(248, 113, 113, 0.2) 0%, transparent 100%);
  }

  .result-banner {
    padding: 24px 16px 16px;
  }

  .result-icon-wrap {
    margin-bottom: 8px;
  }

  .battle-result.victory .result-icon-wrap {
    color: #4ade80;
  }

  .battle-result.defeat .result-icon-wrap {
    color: #f87171;
  }

  .result-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .battle-result.victory .result-title {
    color: #4ade80;
  }

  .battle-result.defeat .result-title {
    color: #f87171;
  }

  .result-subtitle {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 0.95rem;
    color: var(--text-secondary);
  }

  .floor-badge-mini {
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .floor-badge-mini.normal {
    background: rgba(100, 100, 100, 0.3);
    color: #aaa;
  }

  .floor-badge-mini.elite {
    background: rgba(100, 149, 237, 0.3);
    color: #6495ed;
  }

  .floor-badge-mini.boss {
    background: rgba(220, 60, 60, 0.3);
    color: #dc3c3c;
  }

  .battle-versus {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 12px 16px;
    margin: 0 16px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 8px;
  }

  .versus-side {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    flex: 1;
  }

  .side-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .side-icon {
    font-size: 1.5rem;
  }

  .versus-center {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-secondary);
    padding: 4px 8px;
    background: rgba(150, 130, 200, 0.2);
    border-radius: 4px;
  }

  .battle-stats {
    padding: 16px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 8px;
    background: var(--bg-card);
    border-radius: 6px;
    border: 1px solid var(--border-color);
  }

  .stat-card .stat-icon {
    font-size: 1.2rem;
  }

  .stat-card .stat-info {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-card .stat-value {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .stat-card.dealt .stat-value {
    color: #4ade80;
  }

  .stat-card.taken .stat-value {
    color: #f87171;
  }

  .stat-card .stat-label {
    font-size: 0.7rem;
    color: var(--text-secondary);
  }

  .battle-rewards {
    margin: 0 16px 16px;
    padding: 12px;
    background: linear-gradient(135deg, rgba(201, 169, 89, 0.1) 0%, rgba(160, 128, 64, 0.05) 100%);
    border: 1px solid rgba(201, 169, 89, 0.3);
    border-radius: 8px;
  }

  .rewards-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-gold);
    margin-bottom: 10px;
  }

  .rewards-content {
    display: flex;
    justify-content: center;
    gap: 16px;
  }

  .reward-chip {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 20px;
  }

  .reward-chip span {
    font-weight: 600;
    color: var(--text-primary);
  }

  .reward-chip .reward-name {
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--text-secondary);
  }

  .special-badges {
    margin-top: 10px;
  }

  .achievement-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .achievement-badge.first-clear {
    background: rgba(100, 149, 237, 0.2);
    color: #6495ed;
  }

  .achievement-badge.server-first {
    background: linear-gradient(135deg, rgba(220, 60, 60, 0.3) 0%, rgba(255, 215, 0, 0.2) 100%);
    color: #ffd700;
    border: 1px solid rgba(255, 215, 0, 0.4);
  }

  .breakthrough-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin: 12px 16px;
    padding: 14px;
    background: linear-gradient(135deg, rgba(147, 112, 219, 0.2) 0%, rgba(138, 43, 226, 0.15) 100%);
    border: 1px solid rgba(147, 112, 219, 0.4);
    border-radius: 8px;
    animation: breakthrough-glow 2s ease-in-out infinite;
  }

  @keyframes breakthrough-glow {
    0%,
    100% {
      box-shadow: 0 0 10px rgba(147, 112, 219, 0.3);
    }
    50% {
      box-shadow: 0 0 20px rgba(147, 112, 219, 0.5);
    }
  }

  .breakthrough-icon {
    color: #9370db;
  }

  .breakthrough-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .breakthrough-title {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .breakthrough-realm {
    font-size: 1.1rem;
    font-weight: 700;
    color: #9370db;
  }

  .defeat-hint {
    padding: 12px 16px 20px;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .info-tabs {
    margin-top: 16px;
  }

  .empty {
    text-align: center;
    padding: 24px;
    color: var(--text-secondary);
  }

  .ranking-list,
  .firsts-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ranking-item,
  .first-item {
    display: flex;
    align-items: center;
    padding: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }

  .rank-pos {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-weight: 700;
    font-size: 0.9rem;
    margin-right: 12px;
    background: var(--bg-card);
    color: var(--text-secondary);
  }

  .rank-pos.gold {
    background: linear-gradient(135deg, #ffd700 0%, #b8860b 100%);
    color: #1a1a1a;
  }

  .rank-pos.silver {
    background: linear-gradient(135deg, #c0c0c0 0%, #808080 100%);
    color: #1a1a1a;
  }

  .rank-pos.bronze {
    background: linear-gradient(135deg, #cd7f32 0%, #8b4513 100%);
    color: #1a1a1a;
  }

  .rank-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .rank-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .rank-floor {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .first-item {
    justify-content: space-between;
  }

  .first-floor {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 600;
    color: var(--color-gold);
  }

  .first-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .first-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .first-time {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
</style>
