<template>
  <div class="soul-seize-panel">
    <!-- 夺舍状态卡片 -->
    <div class="status-card">
      <div class="status-header">
        <Ghost :size="20" />
        <span>夺舍状态</span>
      </div>
      <div class="status-content">
        <div class="status-item">
          <span class="label">傀儡数量</span>
          <span class="value">{{ soulSeize?.puppetCount || 0 }}/{{ soulSeize?.maxPuppets || 3 }}</span>
        </div>
        <div class="status-item">
          <span class="label">战力加成</span>
          <span class="value bonus">+{{ (soulSeize?.puppetBonus || 0).toFixed(0) }}%</span>
        </div>
        <div class="status-item">
          <span class="label">冷却状态</span>
          <span v-if="cooldownRemaining > 0" class="value cooldown">{{ formatCooldown(cooldownRemaining) }}</span>
          <span v-else class="value ready">可使用</span>
        </div>
      </div>
    </div>

    <!-- 傀儡列表 -->
    <div class="section-title">
      <UserMinus :size="18" />
      <span>我的傀儡</span>
    </div>

    <div v-if="puppets.length === 0" class="empty-state">
      <Ghost :size="32" />
      <span>暂无傀儡</span>
    </div>

    <div v-else class="puppet-list">
      <div v-for="puppet in puppets" :key="puppet.id" class="puppet-card">
        <div class="puppet-info">
          <div class="puppet-avatar">
            <Skull :size="20" />
          </div>
          <div class="puppet-details">
            <div class="puppet-name">{{ puppet.puppetName }}</div>
            <div class="puppet-time">
              <Clock :size="14" />
              <span>剩余: {{ formatTime(puppet.remainingMs) }}</span>
            </div>
          </div>
        </div>
        <button class="release-btn" @click="handleRelease(puppet.id)" :disabled="loading">
          <Unlock :size="16" />
          释放
        </button>
      </div>
    </div>

    <!-- 寻找目标 -->
    <div class="section-title">
      <Target :size="18" />
      <span>寻找目标</span>
    </div>

    <div class="target-search">
      <div class="search-box">
        <Search :size="18" />
        <input v-model="searchKeyword" placeholder="搜索玩家名称..." @keyup.enter="searchTargets" />
      </div>
      <button class="search-btn" @click="searchTargets" :disabled="loading">
        <RefreshCw :size="16" :class="{ spin: searching }" />
        搜索
      </button>
    </div>

    <div v-if="searching" class="loading-targets">
      <Loader2 :size="24" class="spin" />
      <span>搜索中...</span>
    </div>

    <div v-else-if="targets.length === 0 && searched" class="empty-state">
      <Users :size="32" />
      <span>未找到可夺舍的目标</span>
    </div>

    <div v-else-if="targets.length > 0" class="target-list">
      <div v-for="target in targets" :key="target.id" class="target-card">
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
        <button class="seize-btn" :disabled="!canSeize || loading" @click="handleSeize(target.id, target.name)">
          <Crosshair :size="16" />
          夺舍
        </button>
      </div>
    </div>

    <!-- 结果弹窗 -->
    <Teleport to="body">
      <div v-if="showResult" class="result-modal-overlay" @click="showResult = false">
        <div class="result-modal" :class="{ success: lastResult?.success, failure: !lastResult?.success }" @click.stop>
          <div class="result-icon">
            <CheckCircle v-if="lastResult?.success" :size="48" />
            <XCircle v-else :size="48" />
          </div>
          <div class="result-title">{{ lastResult?.success ? '夺舍成功' : '夺舍失败' }}</div>
          <div class="result-message">{{ lastResult?.message }}</div>
          <div v-if="!lastResult?.success && lastResult?.backlash" class="backlash-info">
            <AlertTriangle :size="16" />
            <span>遭受反噬，损失 {{ lastResult.backlash.hpLost }} 生命值</span>
          </div>
          <button class="result-btn" @click="showResult = false">确定</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useHeishaStore, type SeizeResult, type PvpTarget } from '@/stores/heisha'
  import {
    Ghost,
    UserMinus,
    Skull,
    Clock,
    Unlock,
    Target,
    Search,
    RefreshCw,
    Loader2,
    Users,
    Swords,
    Crosshair,
    CheckCircle,
    XCircle,
    AlertTriangle
  } from 'lucide-vue-next'

  const heishaStore = useHeishaStore()
  const { soulSeizeStatus: soulSeize, puppets, loading } = storeToRefs(heishaStore)

  const searchKeyword = ref('')
  const targets = ref<PvpTarget[]>([])
  const searching = ref(false)
  const searched = ref(false)
  const showResult = ref(false)
  const lastResult = ref<SeizeResult | null>(null)

  // 冷却倒计时
  const cooldownRemaining = ref(0)
  let cooldownTimer: ReturnType<typeof setInterval> | null = null

  const canSeize = computed(() => {
    return heishaStore.canSeize && cooldownRemaining.value <= 0
  })

  // 格式化冷却时间
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

  // 格式化时间
  function formatTime(ms: number): string {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}分${seconds}秒`
  }

  // 更新冷却时间
  function updateCooldown() {
    if (soulSeize.value?.cooldownMs) {
      cooldownRemaining.value = Math.max(0, soulSeize.value.cooldownMs - (Date.now() - heishaStore.lastRefresh))
    } else {
      cooldownRemaining.value = 0
    }
  }

  // 搜索目标
  async function searchTargets() {
    searching.value = true
    searched.value = true
    try {
      await heishaStore.fetchPvpTargets(20)
      // 过滤匹配的目标
      if (searchKeyword.value.trim()) {
        targets.value = heishaStore.pvpTargets.filter(t => t.name.toLowerCase().includes(searchKeyword.value.toLowerCase()))
      } else {
        targets.value = heishaStore.pvpTargets
      }
    } finally {
      searching.value = false
    }
  }

  // 发动夺舍
  async function handleSeize(targetId: string, _targetName: string) {
    if (!canSeize.value) return

    try {
      const result = await heishaStore.soulSeize(targetId)
      lastResult.value = result
      showResult.value = true
      updateCooldown()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '夺舍失败'
      lastResult.value = { success: false, message }
      showResult.value = true
    }
  }

  // 释放傀儡
  async function handleRelease(puppetId: string) {
    try {
      await heishaStore.releasePuppet(puppetId)
    } catch (error) {
      console.error('释放傀儡失败:', error)
    }
  }

  onMounted(async () => {
    await heishaStore.fetchPuppets()
    updateCooldown()
    cooldownTimer = setInterval(updateCooldown, 1000)
  })

  onUnmounted(() => {
    if (cooldownTimer) {
      clearInterval(cooldownTimer)
    }
  })
</script>

<style scoped>
  .soul-seize-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .status-card {
    background: linear-gradient(135deg, rgba(127, 29, 29, 0.15) 0%, rgba(30, 30, 30, 0.9) 100%);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 12px;
    overflow: hidden;
  }

  .status-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, transparent 100%);
    color: #f87171;
    font-weight: 600;
  }

  .status-content {
    display: flex;
    justify-content: space-around;
    padding: 16px;
  }

  .status-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .status-item .label {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .status-item .value {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .status-item .value.bonus {
    color: #f87171;
  }

  .status-item .value.cooldown {
    color: #fbbf24;
  }

  .status-item .value.ready {
    color: #4ade80;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    padding: 8px 0;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 32px;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .puppet-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .puppet-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    transition: all 0.2s ease;
  }

  .puppet-card:hover {
    border-color: rgba(220, 38, 38, 0.4);
  }

  .puppet-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .puppet-avatar {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
    border-radius: 8px;
    color: white;
  }

  .puppet-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .puppet-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .puppet-time {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: #fbbf24;
  }

  .release-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-muted);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .release-btn:hover:not(:disabled) {
    border-color: #dc2626;
    color: #dc2626;
  }

  .release-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .target-search {
    display: flex;
    gap: 8px;
  }

  .search-box {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-muted);
  }

  .search-box input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .search-box input::placeholder {
    color: var(--text-muted);
  }

  .search-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 16px;
    background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .search-btn:hover:not(:disabled) {
    transform: scale(1.02);
    box-shadow: 0 0 12px rgba(220, 38, 38, 0.4);
  }

  .search-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .loading-targets {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px;
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
    border-color: rgba(220, 38, 38, 0.4);
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

  .seize-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%);
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .seize-btn:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 0 12px rgba(220, 38, 38, 0.5);
  }

  .seize-btn:disabled {
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
    border-radius: 16px;
    padding: 32px;
    text-align: center;
    max-width: 320px;
    animation: scaleIn 0.3s ease;
  }

  .result-modal.success {
    border: 2px solid #4ade80;
    box-shadow: 0 0 30px rgba(74, 222, 128, 0.3);
  }

  .result-modal.failure {
    border: 2px solid #f87171;
    box-shadow: 0 0 30px rgba(248, 113, 113, 0.3);
  }

  .result-icon {
    margin-bottom: 16px;
  }

  .result-modal.success .result-icon {
    color: #4ade80;
  }

  .result-modal.failure .result-icon {
    color: #f87171;
  }

  .result-title {
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: 8px;
    color: var(--text-primary);
  }

  .result-message {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-bottom: 16px;
  }

  .backlash-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    background: rgba(248, 113, 113, 0.1);
    border-radius: 6px;
    color: #f87171;
    font-size: 0.85rem;
    margin-bottom: 16px;
  }

  .result-btn {
    width: 100%;
    padding: 10px;
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
</style>
