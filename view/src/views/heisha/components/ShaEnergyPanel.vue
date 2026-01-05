<template>
  <div class="sha-energy-panel">
    <!-- 初始加载状态 -->
    <div v-if="initialLoading" class="initial-loading">
      <Loader2 :size="32" class="spin" />
      <span>正在加载煞气状态...</span>
    </div>

    <!-- 加载完成后显示内容 -->
    <template v-else>
      <!-- 煞气状态卡片 -->
      <div class="sha-card">
        <div class="sha-header">
          <Flame :size="20" />
          <span>煞气淬体</span>
        </div>

        <div class="sha-display">
          <div class="sha-ring">
            <svg viewBox="0 0 100 100">
              <circle class="ring-bg" cx="50" cy="50" r="42" />
              <circle class="ring-progress" cx="50" cy="50" r="42" :stroke-dasharray="`${shaPercent * 2.64} 264`" />
            </svg>
            <div class="sha-center">
              <Zap :size="24" />
              <span class="sha-number">{{ shaEnergy?.current || 0 }}</span>
            </div>
          </div>

          <div class="sha-info">
            <div class="info-row">
              <span class="label">当前煞气</span>
              <span class="value">{{ shaEnergy?.current || 0 }}/{{ shaEnergy?.max || 100 }}</span>
            </div>
            <div class="info-row">
              <span class="label">战力加成</span>
              <span class="value bonus">+{{ (shaEnergy?.bonusPercent || 0).toFixed(1) }}%</span>
            </div>
            <div class="info-row">
              <span class="label">每日衰减</span>
              <span class="value decay">-{{ shaEnergy?.decayAmount || 5 }}</span>
            </div>
          </div>
        </div>

        <div class="sha-tips">
          <div class="tip-item">
            <Swords :size="14" />
            <span>击败敌人获得煞气</span>
          </div>
          <div class="tip-item">
            <TrendingUp :size="14" />
            <span>每点煞气+0.5%战力</span>
          </div>
        </div>
      </div>

      <!-- PvP挑战区域 -->
      <div class="pvp-section">
        <div class="section-header">
          <Sword :size="20" />
          <span>切磋挑战</span>
          <div class="pvp-count">今日: {{ pvpStatus?.dailyChallenges || 0 }}/{{ pvpStatus?.maxChallenges || 5 }}</div>
        </div>

        <!-- 挑战按钮 -->
        <div class="pvp-actions">
          <button class="refresh-btn" @click="refreshTargets" :disabled="loadingTargets">
            <RefreshCw :size="16" :class="{ spin: loadingTargets }" />
            刷新对手
          </button>
          <button class="history-btn" @click="showHistory = true">
            <History :size="16" />
            战斗记录
          </button>
        </div>

        <!-- 目标列表 -->
        <div v-if="loadingTargets" class="loading-state">
          <Loader2 :size="24" class="spin" />
          <span>搜索对手中...</span>
        </div>

        <div v-else-if="pvpTargets.length === 0" class="empty-state">
          <Users :size="32" />
          <span>暂无可挑战的对手</span>
          <span class="hint">点击刷新对手寻找目标</span>
        </div>

        <div v-else class="target-list">
          <div v-for="target in pvpTargets" :key="target.id" class="target-card">
            <div class="target-avatar">
              <User :size="20" />
            </div>
            <div class="target-info">
              <div class="target-name">{{ target.name }}</div>
              <div class="target-details">
                <span class="realm">{{ target.realmName }}</span>
                <span v-if="target.sectName" class="sect">{{ target.sectName }}</span>
              </div>
            </div>
            <div class="target-power">
              <Swords :size="14" />
              <span>{{ target.power }}</span>
            </div>
            <button class="challenge-btn" :disabled="!canChallenge || isBattling" @click="handleChallenge(target.id, target.name)">
              <Sword :size="14" />
              挑战
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- 战斗记录弹窗 -->
    <Teleport to="body">
      <div v-if="showHistory" class="history-modal-overlay" @click="showHistory = false">
        <div class="history-modal" @click.stop>
          <div class="history-header">
            <History :size="20" />
            <span>战斗记录</span>
            <button class="close-btn" @click="showHistory = false">
              <X :size="20" />
            </button>
          </div>

          <div v-if="loadingHistory" class="history-loading">
            <Loader2 :size="24" class="spin" />
            <span>加载中...</span>
          </div>

          <div v-else-if="pvpHistory.length === 0" class="history-empty">
            <FileText :size="32" />
            <span>暂无战斗记录</span>
          </div>

          <div v-else class="history-list">
            <div v-for="record in pvpHistory" :key="record.id" class="history-item" :class="record.result">
              <div class="history-result">
                <Trophy v-if="record.result === 'win'" :size="18" />
                <Frown v-else-if="record.result === 'lose'" :size="18" />
                <Minus v-else :size="18" />
              </div>
              <div class="history-info">
                <div class="opponent-name">{{ record.isChallenger ? '挑战' : '被挑战' }} {{ record.opponentName }}</div>
                <div class="history-details">
                  <span :class="record.cultivationChange >= 0 ? 'gain' : 'loss'">
                    修为 {{ record.cultivationChange >= 0 ? '+' : '' }}{{ record.cultivationChange }}
                  </span>
                </div>
              </div>
              <div class="history-time">
                {{ formatHistoryTime(record.createdAt) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 战斗动画弹窗 -->
    <Teleport to="body">
      <div v-if="showBattleAnimation" class="battle-animation-overlay">
        <div class="battle-animation-modal">
          <div class="battle-fighters">
            <div class="fighter-box you">
              <User :size="40" />
              <span>你</span>
            </div>
            <div class="battle-clash">
              <Swords :size="32" class="clash-icon" />
            </div>
            <div class="fighter-box enemy">
              <User :size="40" />
              <span>{{ currentTargetName }}</span>
            </div>
          </div>
          <div class="battle-log">
            <div v-for="(log, index) in battleLog" :key="index" class="log-item" :style="{ animationDelay: `${index * 0.3}s` }">
              {{ log }}
            </div>
          </div>
          <div class="battle-loading">
            <Loader2 :size="24" class="spin" />
            <span>战斗中...</span>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 战斗结果弹窗 -->
    <Teleport to="body">
      <div v-if="showResult" class="result-modal-overlay" @click="showResult = false">
        <div class="result-modal" :class="battleResult?.result" @click.stop>
          <div class="battle-animation">
            <div class="versus">
              <div class="fighter you">
                <User :size="32" />
                <span>你</span>
                <span class="power">{{ battleResult?.challengerPower }}</span>
              </div>
              <div class="vs-icon">VS</div>
              <div class="fighter enemy">
                <User :size="32" />
                <span>{{ currentTargetName }}</span>
                <span class="power">{{ battleResult?.defenderPower }}</span>
              </div>
            </div>
          </div>

          <div class="result-badge">
            <Trophy v-if="battleResult?.result === 'challenger_win'" :size="40" />
            <Frown v-else-if="battleResult?.result === 'defender_win'" :size="40" />
            <Minus v-else :size="40" />
          </div>

          <div class="result-text">
            {{ getResultText(battleResult?.result) }}
          </div>

          <div class="result-rewards">
            <div class="reward-item" :class="(battleResult?.rewards?.cultivationChange ?? 0) >= 0 ? 'gain' : 'loss'">
              <Sparkles :size="16" />
              <span>
                修为 {{ (battleResult?.rewards?.cultivationChange ?? 0) >= 0 ? '+' : ''
                }}{{ battleResult?.rewards?.cultivationChange ?? 0 }}
              </span>
            </div>
            <div v-if="(battleResult?.rewards?.shaEnergyGain ?? 0) > 0" class="reward-item gain">
              <Flame :size="16" />
              <span>煞气 +{{ battleResult?.rewards?.shaEnergyGain }}</span>
            </div>
          </div>

          <button class="result-btn" @click="showResult = false">确定</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useHeishaStore, type ChallengeResult } from '@/stores/heisha'
  import {
    Flame,
    Zap,
    Swords,
    TrendingUp,
    Sword,
    RefreshCw,
    History,
    Loader2,
    Users,
    User,
    X,
    FileText,
    Trophy,
    Frown,
    Minus,
    Sparkles
  } from 'lucide-vue-next'

  const heishaStore = useHeishaStore()
  const { shaEnergy, pvpStatus, pvpTargets, pvpHistory } = storeToRefs(heishaStore)

  const initialLoading = ref(true)
  const loadingTargets = ref(false)
  const loadingHistory = ref(false)
  const showHistory = ref(false)
  const showResult = ref(false)
  const isBattling = ref(false)
  const showBattleAnimation = ref(false)
  const battleResult = ref<ChallengeResult | null>(null)
  const currentTargetName = ref('')
  const battleLog = ref<string[]>([])

  const shaPercent = computed(() => {
    if (!shaEnergy.value) return 0
    return (shaEnergy.value.current / shaEnergy.value.max) * 100
  })

  const canChallenge = computed(() => {
    if (isBattling.value) return false
    return heishaStore.canPvpChallenge
  })

  // 格式化历史时间
  function formatHistoryTime(timestamp: number): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return `${Math.floor(diff / 86400000)}天前`
  }

  // 获取结果文本
  function getResultText(result?: string): string {
    switch (result) {
      case 'challenger_win':
        return '挑战成功!'
      case 'defender_win':
        return '挑战失败'
      case 'draw':
        return '势均力敌'
      default:
        return ''
    }
  }

  // 刷新目标
  async function refreshTargets() {
    loadingTargets.value = true
    try {
      await heishaStore.fetchPvpTargets(10)
    } finally {
      loadingTargets.value = false
    }
  }

  // 生成战斗日志
  function generateBattleLog(result: ChallengeResult, targetName: string): string[] {
    const logs: string[] = []
    logs.push(`⚔️ 向 ${targetName} 发起挑战！`)
    logs.push(`📊 你的战力: ${result.challengerPower}`)
    logs.push(`📊 对手战力: ${result.defenderPower}`)

    const powerDiff = result.challengerPower - result.defenderPower
    if (powerDiff > 100) {
      logs.push('💪 你占据绝对优势！')
    } else if (powerDiff > 0) {
      logs.push('⚡ 你略占上风...')
    } else if (powerDiff < -100) {
      logs.push('😰 对手实力远超于你...')
    } else if (powerDiff < 0) {
      logs.push('🤔 对手略胜一筹...')
    } else {
      logs.push('⚖️ 双方势均力敌！')
    }

    if (result.result === 'challenger_win') {
      logs.push('🎉 你获得了胜利！')
      if (result.rewards.cultivationChange > 0) {
        logs.push(`✨ 获得修为 +${result.rewards.cultivationChange}`)
      }
      if (result.rewards.shaEnergyGain > 0) {
        logs.push(`🔥 获得煞气 +${result.rewards.shaEnergyGain}`)
      }
    } else if (result.result === 'defender_win') {
      logs.push('💔 你败下阵来...')
      if (result.rewards.cultivationChange < 0) {
        logs.push(`📉 损失修为 ${result.rewards.cultivationChange}`)
      }
    } else {
      logs.push('🤝 双方不分胜负')
    }

    return logs
  }

  // 发起挑战
  async function handleChallenge(targetId: string, targetName: string) {
    if (!canChallenge.value || isBattling.value) return

    isBattling.value = true
    currentTargetName.value = targetName
    battleLog.value = []
    showBattleAnimation.value = true

    try {
      // 显示战斗动画
      battleLog.value.push(`⚔️ 向 ${targetName} 发起挑战！`)

      await new Promise(resolve => setTimeout(resolve, 500))
      battleLog.value.push('🌀 战斗进行中...')

      const result = await heishaStore.pvpChallenge(targetId)
      battleResult.value = result

      // 生成完整战斗日志
      battleLog.value = generateBattleLog(result, targetName)

      await new Promise(resolve => setTimeout(resolve, 800))
      showBattleAnimation.value = false
      showResult.value = true

      // 刷新历史记录（强制重新加载）
      heishaStore.$patch({ pvpHistory: [] })
    } catch (error) {
      console.error('挑战失败:', error)
      battleLog.value.push('❌ 挑战失败，请稍后重试')
      showBattleAnimation.value = false
    } finally {
      isBattling.value = false
    }
  }

  // 加载历史记录
  async function loadHistory(force = false) {
    if (!force && pvpHistory.value.length > 0) return
    loadingHistory.value = true
    try {
      await heishaStore.fetchPvpHistory(20)
    } finally {
      loadingHistory.value = false
    }
  }

  onMounted(async () => {
    try {
      // 注意：不调用fetchStatus，因为父组件HeishaArts已经调用过了
      // 只获取PvP相关的数据
      await heishaStore.fetchPvpStatus()
      // 获取挑战目标
      await refreshTargets()
    } catch (error) {
      console.error('初始化煞气淬体失败:', error)
    } finally {
      initialLoading.value = false
    }
  })

  // 监听历史弹窗打开
  watch(showHistory, async val => {
    if (val) {
      await loadHistory(true)
    }
  })
</script>

<style scoped>
  .sha-energy-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .initial-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 60px 20px;
    color: #f87171;
  }

  .sha-card {
    background: linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(30, 30, 30, 0.9) 100%);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 12px;
    overflow: hidden;
  }

  .sha-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, transparent 100%);
    color: #f87171;
    font-weight: 600;
  }

  .sha-display {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 20px;
  }

  .sha-ring {
    position: relative;
    width: 100px;
    height: 100px;
  }

  .sha-ring svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-bg {
    fill: none;
    stroke: rgba(220, 38, 38, 0.2);
    stroke-width: 8;
  }

  .ring-progress {
    fill: none;
    stroke: #dc2626;
    stroke-width: 8;
    stroke-linecap: round;
    transition: stroke-dasharray 0.5s ease;
  }

  .sha-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #f87171;
  }

  .sha-number {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .sha-info {
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

  .info-row .value.bonus {
    color: #4ade80;
  }

  .info-row .value.decay {
    color: #f87171;
  }

  .sha-tips {
    display: flex;
    gap: 16px;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid rgba(220, 38, 38, 0.2);
  }

  .tip-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  /* PvP区域 */
  .pvp-section {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    overflow: hidden;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: var(--bg-secondary);
    font-weight: 600;
    color: var(--text-primary);
  }

  .pvp-count {
    margin-left: auto;
    font-size: 0.85rem;
    font-weight: normal;
    color: var(--text-muted);
  }

  .pvp-actions {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
  }

  .refresh-btn,
  .history-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: transparent;
    color: var(--text-primary);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .refresh-btn:hover:not(:disabled),
  .history-btn:hover {
    border-color: #dc2626;
    color: #dc2626;
  }

  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 32px;
    color: var(--text-muted);
  }

  .empty-state .hint {
    font-size: 0.8rem;
  }

  .target-list {
    max-height: 280px;
    overflow-y: auto;
  }

  .target-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
    transition: all 0.2s ease;
  }

  .target-card:last-child {
    border-bottom: none;
  }

  .target-card:hover {
    background: var(--bg-secondary);
  }

  .target-avatar {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-secondary);
    border-radius: 8px;
    color: var(--text-muted);
  }

  .target-info {
    flex: 1;
  }

  .target-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .target-details {
    display: flex;
    gap: 8px;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .target-details .realm {
    color: #a78bfa;
  }

  .target-details .sect {
    color: #60a5fa;
  }

  .target-power {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: rgba(220, 38, 38, 0.1);
    border-radius: 4px;
    color: #f87171;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .challenge-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%);
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .challenge-btn:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 0 12px rgba(220, 38, 38, 0.5);
  }

  .challenge-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 历史弹窗 */
  .history-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  .history-modal {
    width: 90%;
    max-width: 400px;
    max-height: 80vh;
    background: var(--bg-card);
    border-radius: 16px;
    overflow: hidden;
    animation: scaleIn 0.3s ease;
  }

  .history-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background: var(--bg-secondary);
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-btn {
    margin-left: auto;
    padding: 4px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: var(--bg-card);
    color: var(--text-primary);
  }

  .history-loading,
  .history-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 48px;
    color: var(--text-muted);
  }

  .history-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .history-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
  }

  .history-item:last-child {
    border-bottom: none;
  }

  .history-result {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
  }

  .history-item.win .history-result {
    background: rgba(74, 222, 128, 0.2);
    color: #4ade80;
  }

  .history-item.lose .history-result {
    background: rgba(248, 113, 113, 0.2);
    color: #f87171;
  }

  .history-item.draw .history-result {
    background: rgba(251, 191, 36, 0.2);
    color: #fbbf24;
  }

  .history-info {
    flex: 1;
  }

  .opponent-name {
    font-weight: 500;
    color: var(--text-primary);
  }

  .history-details {
    font-size: 0.8rem;
  }

  .history-details .gain {
    color: #4ade80;
  }

  .history-details .loss {
    color: #f87171;
  }

  .history-time {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  /* 战斗结果弹窗 */
  .result-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  .result-modal {
    width: 90%;
    max-width: 360px;
    background: var(--bg-card);
    border-radius: 16px;
    padding: 24px;
    text-align: center;
    animation: scaleIn 0.3s ease;
  }

  .result-modal.challenger_win {
    border: 2px solid #4ade80;
    box-shadow: 0 0 30px rgba(74, 222, 128, 0.3);
  }

  .result-modal.defender_win {
    border: 2px solid #f87171;
    box-shadow: 0 0 30px rgba(248, 113, 113, 0.3);
  }

  .result-modal.draw {
    border: 2px solid #fbbf24;
    box-shadow: 0 0 30px rgba(251, 191, 36, 0.3);
  }

  .battle-animation {
    margin-bottom: 20px;
  }

  .versus {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .fighter {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .fighter.you {
    color: #60a5fa;
  }

  .fighter.enemy {
    color: #f87171;
  }

  .fighter .power {
    font-size: 0.8rem;
    opacity: 0.8;
  }

  .vs-icon {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-muted);
  }

  .result-badge {
    margin-bottom: 12px;
  }

  .result-modal.challenger_win .result-badge {
    color: #4ade80;
  }

  .result-modal.defender_win .result-badge {
    color: #f87171;
  }

  .result-modal.draw .result-badge {
    color: #fbbf24;
  }

  .result-text {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 16px;
  }

  .result-rewards {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-bottom: 20px;
  }

  .reward-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: var(--bg-secondary);
    border-radius: 6px;
    font-size: 0.9rem;
  }

  .reward-item.gain {
    color: #4ade80;
  }

  .reward-item.loss {
    color: #f87171;
  }

  .result-btn {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .result-btn:hover {
    transform: scale(1.02);
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

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* 战斗动画弹窗 */
  .battle-animation-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1001;
    animation: fadeIn 0.3s ease;
  }

  .battle-animation-modal {
    width: 90%;
    max-width: 400px;
    padding: 32px 24px;
    text-align: center;
  }

  .battle-fighters {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    margin-bottom: 32px;
  }

  .fighter-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background: var(--bg-card);
    border-radius: 12px;
    min-width: 80px;
    animation: fighterEnter 0.5s ease;
  }

  .fighter-box.you {
    color: #60a5fa;
    border: 2px solid #60a5fa;
    box-shadow: 0 0 20px rgba(96, 165, 250, 0.3);
  }

  .fighter-box.enemy {
    color: #f87171;
    border: 2px solid #f87171;
    box-shadow: 0 0 20px rgba(248, 113, 113, 0.3);
  }

  .battle-clash {
    color: #fbbf24;
    animation: clashPulse 0.5s ease-in-out infinite;
  }

  .clash-icon {
    animation: clashRotate 1s linear infinite;
  }

  @keyframes fighterEnter {
    from {
      opacity: 0;
      transform: scale(0.5);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes clashPulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
  }

  @keyframes clashRotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .battle-log {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 24px;
    min-height: 120px;
  }

  .log-item {
    padding: 8px 16px;
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 0.9rem;
    animation: logSlideIn 0.3s ease forwards;
    opacity: 0;
    transform: translateX(-20px);
  }

  @keyframes logSlideIn {
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .battle-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #f87171;
    font-size: 0.9rem;
  }

  @media (max-width: 400px) {
    .sha-display {
      flex-direction: column;
    }

    .sha-tips {
      flex-direction: column;
      gap: 8px;
    }

    .pvp-actions {
      flex-direction: column;
    }

    .refresh-btn,
    .history-btn {
      justify-content: center;
    }

    .battle-fighters {
      gap: 12px;
    }

    .fighter-box {
      min-width: 60px;
      padding: 12px;
    }
  }
</style>
