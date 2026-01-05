<template>
  <div class="curse-panel">
    <!-- 自身被诅咒状态 -->
    <div v-if="curseStatus?.isCursed" class="cursed-status">
      <div class="cursed-header">
        <Sparkles :size="20" class="curse-icon" />
        <span>你正被丹魔之咒侵蚀</span>
      </div>
      <div class="cursed-info">
        <div class="cursed-item">
          <span class="label">施咒者</span>
          <span class="value">{{ curseStatus.casterName || '未知' }}</span>
        </div>
        <div class="cursed-item">
          <span class="label">剩余时间</span>
          <span class="value warning">{{ formatTime(curseStatus.remainingMs || 0) }}</span>
        </div>
        <div class="cursed-item">
          <span class="label">已被吸取</span>
          <span class="value danger">{{ curseStatus.storedCultivation || 0 }} 修为</span>
        </div>
      </div>
      <div class="cursed-effects">
        <AlertTriangle :size="14" />
        <span>咒印效果：炼丹成功率 -10%，每10分钟被吸取100-200修为</span>
      </div>
      <button class="remove-curse-btn" @click="handleRemoveCurse" :disabled="loading">
        <Shield :size="16" />
        使用九转解厄丹解咒
      </button>
    </div>

    <!-- 我的施咒记录 -->
    <div class="section-title">
      <Target :size="18" />
      <span>我的咒印</span>
    </div>

    <div v-if="castRecords.length === 0" class="empty-state">
      <Sparkles :size="32" />
      <span>暂无施咒记录</span>
    </div>

    <div v-else class="curse-list">
      <div v-for="record in castRecords" :key="record.targetId" class="curse-card">
        <div class="curse-target">
          <div class="target-avatar">
            <User :size="18" />
          </div>
          <div class="target-info">
            <div class="target-name">{{ record.targetName }}</div>
            <div class="target-time">
              <Clock :size="12" />
              <span>剩余: {{ formatTime(record.remainingMs) }}</span>
            </div>
          </div>
        </div>
        <div class="curse-stored">
          <Zap :size="14" />
          <span>{{ record.storedCultivation }} 修为</span>
        </div>
        <button class="harvest-btn" @click="handleHarvest(record.targetId, record.targetName)" :disabled="loading">
          <Download :size="16" />
          收割
        </button>
      </div>
    </div>

    <!-- 施放咒术 -->
    <div class="section-title">
      <Crosshair :size="18" />
      <span>施放咒术</span>
    </div>

    <div class="cast-info">
      <div class="cast-cost">
        <span class="label">消耗：</span>
        <span class="value">丹魔心萃 x1 + 500修为</span>
      </div>
      <div class="cast-effect">
        <span class="label">效果：</span>
        <span class="value">对目标种下咒印，持续12小时，每10分钟吸取100-200修为</span>
      </div>
    </div>

    <div class="target-search">
      <div class="search-box">
        <Search :size="18" />
        <input v-model="targetName" placeholder="输入目标道号..." @keyup.enter="handleCast" />
      </div>
      <button class="cast-btn" @click="handleCast" :disabled="loading || !targetName.trim()">
        <Sparkles :size="16" />
        施咒
      </button>
    </div>

    <!-- 结果弹窗 -->
    <Teleport to="body">
      <div v-if="showResult" class="result-modal-overlay" @click="showResult = false">
        <div class="result-modal" :class="{ success: lastResult?.success, failure: !lastResult?.success }" @click.stop>
          <div class="result-icon">
            <CheckCircle v-if="lastResult?.success" :size="48" />
            <XCircle v-else :size="48" />
          </div>
          <div class="result-title">{{ resultTitle }}</div>
          <div class="result-message">{{ lastResult?.message }}</div>
          <div v-if="lastResult?.cultivationGained" class="bonus-info">
            <Zap :size="16" />
            <span>获得 {{ lastResult.cultivationGained }} 修为</span>
          </div>
          <button class="result-btn" @click="showResult = false">确定</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useHeishaStore } from '@/stores/heisha'
  import { pvpApi } from '@/api'
  import {
    Sparkles,
    AlertTriangle,
    Shield,
    Target,
    User,
    Clock,
    Zap,
    Download,
    Crosshair,
    Search,
    CheckCircle,
    XCircle
  } from 'lucide-vue-next'

  const heishaStore = useHeishaStore()
  const { curseStatus, castRecords, loading } = storeToRefs(heishaStore)

  const targetName = ref('')
  const showResult = ref(false)
  const lastResult = ref<{ success: boolean; message: string; cultivationGained?: number } | null>(null)
  const resultTitle = ref('')

  // 格式化时间
  function formatTime(ms: number): string {
    if (ms <= 0) return '已结束'
    const hours = Math.floor(ms / (60 * 60 * 1000))
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    }
    return `${minutes}分钟`
  }

  // 施放咒术
  async function handleCast() {
    if (!targetName.value.trim()) return

    try {
      // 先通过名称查找目标ID
      const searchRes = await pvpApi.getTargets(50)
      const targets = searchRes.data as { id: string; name: string }[]
      const target = targets.find(t => t.name === targetName.value.trim())

      if (!target) {
        lastResult.value = { success: false, message: '未找到该目标，请确认道号是否正确' }
        resultTitle.value = '施咒失败'
        showResult.value = true
        return
      }

      const result = await heishaStore.castCurse(target.id)
      lastResult.value = result
      resultTitle.value = result.success ? '施咒成功' : '施咒失败'
      showResult.value = true

      if (result.success) {
        targetName.value = ''
      }
    } catch (error: unknown) {
      const err = error as { message?: string }
      lastResult.value = { success: false, message: err.message || '施咒失败' }
      resultTitle.value = '施咒失败'
      showResult.value = true
    }
  }

  // 收割修为
  async function handleHarvest(targetId: string, _targetNameStr: string) {
    try {
      const result = await heishaStore.harvestCurse(targetId)
      lastResult.value = result
      resultTitle.value = result.success ? '收割成功' : '收割失败'
      showResult.value = true
    } catch (error: unknown) {
      const err = error as { message?: string }
      lastResult.value = { success: false, message: err.message || '收割失败' }
      resultTitle.value = '收割失败'
      showResult.value = true
    }
  }

  // 解除诅咒
  async function handleRemoveCurse() {
    try {
      const result = await heishaStore.removeCurse()
      lastResult.value = { success: result.success, message: result.message }
      resultTitle.value = result.success ? '解咒成功' : '解咒失败'
      showResult.value = true
    } catch (error: unknown) {
      const err = error as { message?: string }
      lastResult.value = { success: false, message: err.message || '解咒失败' }
      resultTitle.value = '解咒失败'
      showResult.value = true
    }
  }

  onMounted(async () => {
    await heishaStore.fetchCurseStatus()
  })
</script>

<style scoped>
  .curse-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* 被诅咒状态 */
  .cursed-status {
    background: linear-gradient(135deg, rgba(139, 69, 19, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%);
    border: 1px solid rgba(139, 69, 19, 0.4);
    border-radius: 12px;
    padding: 16px;
  }

  .cursed-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #d97706;
    margin-bottom: 12px;
  }

  .curse-icon {
    animation: curseGlow 2s ease-in-out infinite;
  }

  @keyframes curseGlow {
    0%,
    100% {
      opacity: 0.7;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.1);
    }
  }

  .cursed-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }

  .cursed-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
  }

  .cursed-item .label {
    color: var(--text-muted);
  }

  .cursed-item .value {
    font-weight: 500;
  }

  .cursed-item .value.warning {
    color: #f59e0b;
  }

  .cursed-item .value.danger {
    color: #dc2626;
  }

  .cursed-effects {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.1);
    padding: 8px 12px;
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .remove-curse-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .remove-curse-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .remove-curse-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 区块标题 */
  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--text-primary);
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-color);
  }

  /* 空状态 */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 32px;
    color: var(--text-muted);
  }

  /* 咒印列表 */
  .curse-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .curse-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    transition: all 0.2s;
  }

  .curse-card:hover {
    border-color: rgba(220, 38, 38, 0.3);
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.1);
  }

  .curse-target {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
  }

  .target-avatar {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
    border-radius: 8px;
    color: white;
  }

  .target-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .target-name {
    font-weight: 500;
    color: var(--text-primary);
  }

  .target-time {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .curse-stored {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
    color: #f59e0b;
    font-weight: 500;
  }

  .harvest-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .harvest-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  }

  .harvest-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 施放咒术 */
  .cast-info {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 0.85rem;
  }

  .cast-cost,
  .cast-effect {
    display: flex;
    gap: 8px;
  }

  .cast-cost .label,
  .cast-effect .label {
    color: var(--text-muted);
    white-space: nowrap;
  }

  .cast-cost .value,
  .cast-effect .value {
    color: var(--text-primary);
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
    padding: 0 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-muted);
  }

  .search-box input {
    flex: 1;
    padding: 10px 0;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-size: 0.9rem;
    outline: none;
  }

  .search-box input::placeholder {
    color: var(--text-muted);
  }

  .cast-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cast-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  }

  .cast-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 结果弹窗 */
  .result-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .result-modal {
    width: 100%;
    max-width: 320px;
    background: var(--bg-card);
    border-radius: 16px;
    padding: 24px;
    text-align: center;
    animation: modalAppear 0.2s ease;
  }

  @keyframes modalAppear {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .result-modal.success .result-icon {
    color: #10b981;
  }

  .result-modal.failure .result-icon {
    color: #dc2626;
  }

  .result-icon {
    margin-bottom: 16px;
  }

  .result-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .result-message {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-bottom: 16px;
    line-height: 1.5;
  }

  .bonus-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    background: rgba(245, 158, 11, 0.1);
    border-radius: 8px;
    color: #f59e0b;
    font-weight: 500;
    margin-bottom: 16px;
  }

  .result-btn {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .result-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  }
</style>
