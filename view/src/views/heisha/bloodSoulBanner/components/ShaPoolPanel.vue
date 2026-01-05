<template>
  <div class="sha-pool-panel">
    <!-- 煞气状态 -->
    <div class="sha-status-card">
      <div class="sha-header">
        <Flame :size="20" />
        <span>煞气池</span>
      </div>

      <div class="sha-display">
        <div class="sha-ring">
          <svg viewBox="0 0 100 100">
            <circle class="ring-bg" cx="50" cy="50" r="42" />
            <circle
              class="ring-progress"
              cx="50"
              cy="50"
              r="42"
              :stroke-dasharray="`${shaPercent * 2.64} 264`"
            />
          </svg>
          <div class="sha-center">
            <Zap :size="24" />
            <span class="sha-number">{{ shaPoolStatus?.current || 0 }}</span>
          </div>
        </div>

        <div class="sha-info">
          <div class="info-row">
            <span class="label">当前煞气</span>
            <span class="value">{{ shaPoolStatus?.current || 0 }}/{{ shaPoolStatus?.max || 100 }}</span>
          </div>
          <div class="info-row">
            <span class="label">战力加成</span>
            <span class="value bonus">+{{ (shaPoolStatus?.bonusPercent || 0).toFixed(1) }}%</span>
          </div>
          <div class="info-row">
            <span class="label">杀戮值加成</span>
            <span class="value kill-bonus">+{{ (shaPoolStatus?.killCountBonus || 0).toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 煞气获取方式 -->
    <div class="acquisition-section">
      <div class="section-title">
        <TrendingUp :size="18" />
        <span>煞气获取</span>
      </div>

      <!-- 每日献祭 -->
      <div class="acquisition-card">
        <div class="card-icon sacrifice">
          <Skull :size="20" />
        </div>
        <div class="card-info">
          <div class="card-title">每日献祭</div>
          <div class="card-desc">
            获得 {{ SHA_POOL_CONFIG.dailySacrifice.baseSha }}
            + 杀戮值×{{ SHA_POOL_CONFIG.dailySacrifice.killCountBonus }} 煞气
          </div>
        </div>
        <button
          class="action-btn"
          :disabled="operatingAction !== null || !canDailySacrifice"
          @click="handleDailySacrifice"
        >
          <Loader2 v-if="operatingAction === 'sacrifice'" :size="16" class="spin" />
          <span v-else>{{ canDailySacrifice ? '献祭' : '已献祭' }}</span>
        </button>
      </div>

      <!-- 化功为煞 -->
      <div class="acquisition-card">
        <div class="card-icon convert">
          <RefreshCw :size="20" />
        </div>
        <div class="card-info">
          <div class="card-title">化功为煞</div>
          <div class="card-desc">
            {{ SHA_POOL_CONFIG.cultivationToSha.ratio }}修为 = 1煞气
            (今日{{ shaPoolStatus?.dailyConverted || 0 }}/{{ SHA_POOL_CONFIG.cultivationToSha.dailyLimit }})
          </div>
        </div>
        <button
          class="action-btn"
          :disabled="operatingAction !== null || !canConvert"
          @click="showConvertModal = true"
        >
          转换
        </button>
      </div>

      <!-- PvP获取提示 -->
      <div class="acquisition-card pvp-tip">
        <div class="card-icon pvp">
          <Swords :size="20" />
        </div>
        <div class="card-info">
          <div class="card-title">PvP胜利</div>
          <div class="card-desc">
            击败敌人获得 {{ SHA_POOL_CONFIG.pvpShaGain.min }}-{{ SHA_POOL_CONFIG.pvpShaGain.max }} 煞气
          </div>
        </div>
        <div class="pvp-hint">
          <ArrowRight :size="16" />
          <span>前往煞气淬体</span>
        </div>
      </div>
    </div>

    <!-- 化功为煞弹窗 -->
    <Teleport to="body">
      <div v-if="showConvertModal" class="modal-overlay" @click="showConvertModal = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <RefreshCw :size="20" />
            <span>化功为煞</span>
            <button class="close-btn" @click="showConvertModal = false">
              <X :size="20" />
            </button>
          </div>

          <div class="modal-body">
            <div class="convert-info">
              <div class="info-item">
                <span class="label">转换比例</span>
                <span class="value">{{ SHA_POOL_CONFIG.cultivationToSha.ratio }}修为 = 1煞气</span>
              </div>
              <div class="info-item">
                <span class="label">今日已转换</span>
                <span class="value">{{ shaPoolStatus?.dailyConverted || 0 }}/{{ SHA_POOL_CONFIG.cultivationToSha.dailyLimit }}</span>
              </div>
              <div class="info-item">
                <span class="label">可转换上限</span>
                <span class="value">{{ maxConvertAmount }} 煞气</span>
              </div>
            </div>

            <div class="convert-input">
              <label>转换煞气数量</label>
              <div class="input-wrapper">
                <input
                  type="number"
                  v-model.number="convertAmount"
                  :min="1"
                  :max="maxConvertAmount"
                  placeholder="输入数量"
                />
                <button class="max-btn" @click="convertAmount = maxConvertAmount">最大</button>
              </div>
              <div class="convert-preview">
                消耗修为: {{ convertAmount * SHA_POOL_CONFIG.cultivationToSha.ratio }}
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="cancel-btn" @click="showConvertModal = false">取消</button>
            <button
              class="confirm-btn"
              :disabled="operatingAction !== null || convertAmount <= 0"
              @click="handleConvert"
            >
              <Loader2 v-if="operatingAction === 'convert'" :size="16" class="spin" />
              <span v-else>确认转换</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBloodSoulBannerStore } from '@/stores/bloodSoulBanner'
import { SHA_POOL_CONFIG } from '@/game/constants/bloodSoulBanner'
import {
  Flame,
  Zap,
  TrendingUp,
  Skull,
  RefreshCw,
  Swords,
  ArrowRight,
  X,
  Loader2
} from 'lucide-vue-next'

const bannerStore = useBloodSoulBannerStore()
const { shaPoolStatus } = storeToRefs(bannerStore)

const showConvertModal = ref(false)
const convertAmount = ref(10)
const operatingAction = ref<'sacrifice' | 'convert' | null>(null)

const shaPercent = computed(() => {
  if (!shaPoolStatus.value) return 0
  return (shaPoolStatus.value.current / shaPoolStatus.value.max) * 100
})

const canDailySacrifice = computed(() => {
  return shaPoolStatus.value?.canSacrifice ?? true
})

const canConvert = computed(() => {
  const remaining = SHA_POOL_CONFIG.cultivationToSha.dailyLimit - (shaPoolStatus.value?.dailyConverted || 0)
  return remaining > 0
})

const maxConvertAmount = computed(() => {
  return SHA_POOL_CONFIG.cultivationToSha.dailyLimit - (shaPoolStatus.value?.dailyConverted || 0)
})

async function handleDailySacrifice() {
  if (operatingAction.value || !canDailySacrifice.value) return

  operatingAction.value = 'sacrifice'
  try {
    await bannerStore.dailySacrifice()
  } finally {
    operatingAction.value = null
  }
}

async function handleConvert() {
  if (operatingAction.value || convertAmount.value <= 0) return

  operatingAction.value = 'convert'
  try {
    await bannerStore.convertCultivation(convertAmount.value)
    showConvertModal.value = false
  } finally {
    operatingAction.value = null
  }
}
</script>

<style scoped>
.sha-pool-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 煞气状态卡片 */
.sha-status-card {
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

.info-row .value.kill-bonus {
  color: #f87171;
}

/* 获取方式区域 */
.acquisition-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  font-weight: 600;
  color: var(--text-primary);
}

.acquisition-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.acquisition-card:last-child {
  border-bottom: none;
}

.card-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.card-icon.sacrifice {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.card-icon.convert {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}

.card-icon.pvp {
  background: rgba(139, 92, 246, 0.15);
  color: #a855f7;
}

.card-info {
  flex: 1;
}

.card-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.card-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%);
  border: none;
  border-radius: 6px;
  color: white;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 0 12px rgba(220, 38, 38, 0.5);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pvp-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal-content {
  width: 90%;
  max-width: 360px;
  background: var(--bg-card);
  border-radius: 16px;
  overflow: hidden;
  animation: scaleIn 0.3s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: var(--bg-secondary);
  font-weight: 600;
  color: #fbbf24;
}

.close-btn {
  margin-left: auto;
  padding: 4px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
}

.close-btn:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.modal-body {
  padding: 16px;
}

.convert-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.info-item .label {
  color: var(--text-muted);
}

.info-item .value {
  color: var(--text-primary);
  font-weight: 500;
}

.convert-input label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.input-wrapper {
  display: flex;
  gap: 8px;
}

.input-wrapper input {
  flex: 1;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 1rem;
}

.input-wrapper input:focus {
  outline: none;
  border-color: #fbbf24;
}

.max-btn {
  padding: 8px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
}

.max-btn:hover {
  border-color: #fbbf24;
  color: #fbbf24;
}

.convert-preview {
  margin-top: 8px;
  font-size: 0.8rem;
  color: #f87171;
}

.modal-footer {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.cancel-btn,
.confirm-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.cancel-btn:hover {
  background: var(--bg-card);
}

.confirm-btn {
  background: linear-gradient(135deg, #b45309 0%, #fbbf24 100%);
  border: none;
  color: white;
}

.confirm-btn:hover:not(:disabled) {
  transform: scale(1.02);
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

@media (max-width: 400px) {
  .sha-display {
    flex-direction: column;
  }

  .input-wrapper {
    flex-direction: column;
  }
}
</style>
