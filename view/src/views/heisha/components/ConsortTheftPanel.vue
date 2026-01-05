<template>
  <div class="consort-theft-panel">
    <!-- 已窃取的侍妾 -->
    <div v-if="stolenConsort" class="stolen-section">
      <div class="stolen-card">
        <div class="stolen-header">
          <Heart :size="20" />
          <span>窃取的侍妾</span>
          <div class="expires-badge">
            <Clock :size="14" />
            <span>{{ formatTime(expiresRemaining) }}</span>
          </div>
        </div>

        <div class="consort-info">
          <div class="consort-avatar">
            <Sparkles :size="24" />
          </div>
          <div class="consort-details">
            <div class="consort-name">{{ stolenConsort.consortName }}</div>
            <div class="consort-origin">
              <span>原主:</span>
              <span class="owner-name">{{ stolenConsort.originalOwnerName }}</span>
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <!-- 魔音灌脑 -->
          <div class="action-card">
            <div class="action-header">
              <Volume2 :size="18" />
              <span>魔音灌脑</span>
            </div>
            <div class="action-desc">消耗侍妾精神，获得修为</div>
            <div class="action-count">{{ stolenConsort.brainwashCount }}/{{ stolenConsort.brainwashMaxCount }}</div>
            <button class="action-btn brainwash" :disabled="!canBrainwash || loading" @click="handleBrainwash">
              <Zap :size="16" />
              灌脑 (+200修为)
            </button>
          </div>

          <!-- 强索元阴 -->
          <div class="action-card">
            <div class="action-header">
              <Flame :size="18" />
              <span>强索元阴</span>
            </div>
            <div class="action-desc">汲取精元，增强战力</div>
            <div class="action-count">{{ stolenConsort.extractCount }}/{{ stolenConsort.extractMaxCount }}</div>
            <button class="action-btn extract" :disabled="!canExtract || loading" @click="handleExtract">
              <Shield :size="16" />
              强索 (+5攻/+3防)
            </button>
          </div>
        </div>
      </div>

      <!-- Buff状态 -->
      <div v-if="extractBuff?.active" class="buff-card">
        <div class="buff-header">
          <ShieldPlus :size="18" />
          <span>元阴加持</span>
        </div>
        <div class="buff-content">
          <div class="buff-item">
            <Sword :size="16" />
            <span>攻击 +{{ extractBuff.bonus?.attack || 0 }}</span>
          </div>
          <div class="buff-item">
            <Shield :size="16" />
            <span>防御 +{{ extractBuff.bonus?.defense || 0 }}</span>
          </div>
          <div class="buff-expires">
            <Clock :size="14" />
            <span>剩余: {{ formatBuffTime(buffRemaining) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 无侍妾时显示窃取面板 -->
    <div v-else class="steal-section">
      <div class="section-intro">
        <Heart :size="32" class="intro-icon" />
        <h3>魔染红尘</h3>
        <p>窃取星宫弟子的侍妾，行魔道之事</p>
      </div>

      <!-- 冷却状态 -->
      <div v-if="cooldownRemaining > 0" class="cooldown-card">
        <Clock :size="24" />
        <div class="cooldown-text">
          <span>窃取冷却中</span>
          <span class="cooldown-time">{{ formatCooldown(cooldownRemaining) }}</span>
        </div>
      </div>

      <!-- 境界不足提示 -->
      <div v-else-if="!consortTheft?.canUse" class="realm-warning">
        <AlertCircle :size="24" />
        <span>需达到结丹期才能使用魔染红尘</span>
      </div>

      <!-- 搜索星宫弟子 -->
      <template v-else>
        <div class="section-title">
          <Search :size="18" />
          <span>寻找星宫弟子</span>
        </div>

        <div class="search-area">
          <button class="refresh-btn" @click="searchStarPalaceTargets" :disabled="searching">
            <RefreshCw :size="18" :class="{ spin: searching }" />
            刷新目标
          </button>
        </div>

        <div v-if="searching" class="loading-state">
          <Loader2 :size="24" class="spin" />
          <span>搜索星宫弟子...</span>
        </div>

        <div v-else-if="starPalaceTargets.length === 0 && searched" class="empty-state">
          <Users :size="32" />
          <span>暂无可窃取的星宫弟子</span>
        </div>

        <div v-else-if="starPalaceTargets.length > 0" class="target-list">
          <div v-for="target in starPalaceTargets" :key="target.id" class="target-card">
            <div class="target-info">
              <div class="target-avatar">
                <Star :size="18" />
              </div>
              <div class="target-details">
                <div class="target-name">{{ target.name }}</div>
                <div class="target-realm">{{ target.realmName }}</div>
              </div>
            </div>
            <button class="steal-btn" :disabled="loading" @click="handleSteal(target.id, target.name)">
              <Heart :size="16" />
              窃取
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- 结果弹窗 -->
    <Teleport to="body">
      <div v-if="showResult" class="result-modal-overlay" @click="showResult = false">
        <div class="result-modal" @click.stop>
          <div class="result-icon" :class="resultType">
            <component :is="resultIcon" :size="48" />
          </div>
          <div class="result-title">{{ resultTitle }}</div>
          <div class="result-message">{{ resultMessage }}</div>
          <button class="result-btn" @click="showResult = false">确定</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted, markRaw, type Component } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useHeishaStore, type PvpTarget } from '@/stores/heisha'
  import {
    Heart,
    Clock,
    Sparkles,
    Volume2,
    Zap,
    Flame,
    Shield,
    ShieldPlus,
    Sword,
    AlertCircle,
    Search,
    RefreshCw,
    Loader2,
    Users,
    Star,
    CheckCircle,
    XCircle
  } from 'lucide-vue-next'

  const heishaStore = useHeishaStore()
  const { stolenConsort, consortTheft, extractBuff, loading } = storeToRefs(heishaStore)

  const searching = ref(false)
  const searched = ref(false)
  const starPalaceTargets = ref<PvpTarget[]>([])
  const showResult = ref(false)
  const resultType = ref<'success' | 'error'>('success')
  const resultTitle = ref('')
  const resultMessage = ref('')
  const resultIcon = ref<Component>(markRaw(CheckCircle))

  // 倒计时
  const expiresRemaining = ref(0)
  const cooldownRemaining = ref(0)
  const buffRemaining = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  const canBrainwash = computed(() => heishaStore.canBrainwash)
  const canExtract = computed(() => heishaStore.canExtract)

  // 格式化时间
  function formatTime(ms: number): string {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    if (hours > 0) {
      return `${hours}时${minutes}分后归还`
    }
    return `${minutes}分后归还`
  }

  function formatCooldown(ms: number): string {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    if (hours > 0) {
      return `${hours}时${minutes}分${seconds}秒`
    }
    if (minutes > 0) {
      return `${minutes}分${seconds}秒`
    }
    return `${seconds}秒`
  }

  function formatBuffTime(ms: number): string {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}分${seconds}秒`
  }

  // 更新倒计时
  function updateTimers() {
    const now = Date.now()

    if (stolenConsort.value) {
      expiresRemaining.value = Math.max(0, stolenConsort.value.remainingMs - (now - heishaStore.lastRefresh))
    } else {
      expiresRemaining.value = 0
    }

    if (consortTheft.value?.cooldownMs) {
      cooldownRemaining.value = Math.max(0, consortTheft.value.cooldownMs - (now - heishaStore.lastRefresh))
    } else {
      cooldownRemaining.value = 0
    }

    if (extractBuff.value?.active && extractBuff.value.expiresAt) {
      buffRemaining.value = Math.max(0, extractBuff.value.expiresAt - now)
    } else {
      buffRemaining.value = 0
    }
  }

  // 搜索星宫弟子
  async function searchStarPalaceTargets() {
    searching.value = true
    searched.value = true
    try {
      await heishaStore.fetchPvpTargets(30)
      // 筛选星宫弟子
      starPalaceTargets.value = heishaStore.pvpTargets.filter(t => t.sectId === 'starpalace')
    } finally {
      searching.value = false
    }
  }

  // 窃取侍妾
  async function handleSteal(targetId: string, targetName: string) {
    try {
      const result = await heishaStore.stealConsort(targetId)
      resultType.value = 'success'
      resultIcon.value = markRaw(CheckCircle)
      resultTitle.value = '窃取成功'
      resultMessage.value = `成功窃取 ${targetName} 的侍妾 ${result.consortName}`
      showResult.value = true
      updateTimers()
    } catch (error: unknown) {
      resultType.value = 'error'
      resultIcon.value = markRaw(XCircle)
      resultTitle.value = '窃取失败'
      resultMessage.value = error instanceof Error ? error.message : '窃取失败'
      showResult.value = true
    }
  }

  // 魔音灌脑
  async function handleBrainwash() {
    try {
      const result = await heishaStore.brainwash()
      resultType.value = 'success'
      resultIcon.value = markRaw(Zap)
      resultTitle.value = '魔音灌脑'
      resultMessage.value = `获得 ${result.cultivationGain} 修为，剩余 ${result.remainingCount} 次`
      showResult.value = true
    } catch (error: unknown) {
      resultType.value = 'error'
      resultIcon.value = markRaw(XCircle)
      resultTitle.value = '操作失败'
      resultMessage.value = error instanceof Error ? error.message : '操作失败'
      showResult.value = true
    }
  }

  // 强索元阴
  async function handleExtract() {
    try {
      const result = await heishaStore.extract()
      resultType.value = 'success'
      resultIcon.value = markRaw(Flame)
      resultTitle.value = '强索元阴'
      resultMessage.value = `获得攻击+${result.bonus.attack}、防御+${result.bonus.defense}，剩余 ${result.remainingCount} 次`
      showResult.value = true
      updateTimers()
    } catch (error: unknown) {
      resultType.value = 'error'
      resultIcon.value = markRaw(XCircle)
      resultTitle.value = '操作失败'
      resultMessage.value = error instanceof Error ? error.message : '操作失败'
      showResult.value = true
    }
  }

  onMounted(async () => {
    await heishaStore.fetchStolenConsort()
    updateTimers()
    timer = setInterval(updateTimers, 1000)
  })

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
    }
  })
</script>

<style scoped>
  .consort-theft-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .stolen-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .stolen-card {
    background: linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(30, 30, 30, 0.9) 100%);
    border: 1px solid rgba(236, 72, 153, 0.3);
    border-radius: 12px;
    overflow: hidden;
  }

  .stolen-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, transparent 100%);
    color: #f472b6;
    font-weight: 600;
  }

  .expires-badge {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: rgba(251, 191, 36, 0.2);
    border-radius: 4px;
    font-size: 0.8rem;
    color: #fbbf24;
  }

  .consort-info {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
  }

  .consort-avatar {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #db2777 0%, #ec4899 100%);
    border-radius: 12px;
    color: white;
    box-shadow: 0 0 20px rgba(236, 72, 153, 0.4);
  }

  .consort-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .consort-name {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .consort-origin {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .consort-origin .owner-name {
    color: #60a5fa;
  }

  .action-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 0 16px 16px;
  }

  .action-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .action-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .action-desc {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .action-count {
    font-size: 0.8rem;
    color: #a78bfa;
    font-weight: 600;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px;
    border: none;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn.brainwash {
    background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%);
    color: white;
  }

  .action-btn.extract {
    background: linear-gradient(135deg, #db2777 0%, #ec4899 100%);
    color: white;
  }

  .action-btn:hover:not(:disabled) {
    transform: scale(1.02);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .buff-card {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(30, 30, 30, 0.9) 100%);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 10px;
    padding: 12px 16px;
  }

  .buff-header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #a78bfa;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .buff-content {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .buff-item {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .buff-expires {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: #fbbf24;
  }

  /* 窃取面板 */
  .steal-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .section-intro {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 32px 16px;
    text-align: center;
  }

  .section-intro .intro-icon {
    color: #ec4899;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
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

  .section-intro h3 {
    margin: 0;
    font-size: 1.2rem;
    color: var(--text-primary);
  }

  .section-intro p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  .cooldown-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 10px;
    color: #fbbf24;
  }

  .cooldown-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .cooldown-time {
    font-weight: 700;
    font-size: 1.1rem;
  }

  .realm-warning {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.3);
    border-radius: 10px;
    color: #f87171;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .search-area {
    display: flex;
    justify-content: center;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 24px;
    background: linear-gradient(135deg, #db2777 0%, #ec4899 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .refresh-btn:hover:not(:disabled) {
    transform: scale(1.02);
    box-shadow: 0 0 15px rgba(236, 72, 153, 0.4);
  }

  .refresh-btn:disabled {
    opacity: 0.6;
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

  .target-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 300px;
    overflow-y: auto;
  }

  .target-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    transition: all 0.2s ease;
  }

  .target-card:hover {
    border-color: rgba(236, 72, 153, 0.4);
  }

  .target-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .target-avatar {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #eab308 0%, #fbbf24 100%);
    border-radius: 8px;
    color: white;
  }

  .target-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .target-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .target-realm {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .steal-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: linear-gradient(135deg, #db2777 0%, #ec4899 100%);
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .steal-btn:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 0 12px rgba(236, 72, 153, 0.5);
  }

  .steal-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 结果弹窗 */
  .result-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  .result-modal {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 32px;
    text-align: center;
    max-width: 320px;
    animation: scaleIn 0.3s ease;
  }

  .result-icon {
    margin-bottom: 16px;
  }

  .result-icon.success {
    color: #4ade80;
  }

  .result-icon.error {
    color: #f87171;
  }

  .result-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .result-message {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-bottom: 20px;
  }

  .result-btn {
    width: 100%;
    padding: 10px;
    background: linear-gradient(135deg, #db2777 0%, #ec4899 100%);
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

  @media (max-width: 400px) {
    .action-buttons {
      grid-template-columns: 1fr;
    }

    .buff-content {
      flex-direction: column;
      align-items: flex-start;
    }

    .buff-expires {
      margin-left: 0;
    }
  }
</style>
