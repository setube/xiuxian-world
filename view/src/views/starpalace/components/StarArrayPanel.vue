<template>
  <div class="star-array-panel">
    <!-- 背景星阵粒子 -->
    <div class="array-particles">
      <div
        v-for="i in 18"
        :key="i"
        class="array-star"
        :style="{
          '--delay': Math.random() * 6 + 's',
          '--x': Math.random() * 100 + '%',
          '--y': Math.random() * 100 + '%',
          '--size': Math.random() * 4 + 2 + 'px',
          '--duration': Math.random() * 4 + 3 + 's'
        }"
      />
    </div>

    <!-- 个人状态 -->
    <div class="personal-status">
      <div class="status-header">
        <Users :size="20" />
        <span>周天星斗大阵</span>
      </div>
      <p class="status-desc">与同门联手布阵，获得强大的修炼加成</p>

      <!-- 当前buff状态 -->
      <div v-if="array?.hasActiveBuff" class="buff-card">
        <div class="buff-icon">
          <Zap :size="24" />
        </div>
        <div class="buff-info">
          <div class="buff-title">
            <span>大阵效果生效中</span>
            <span class="buff-role">{{ array.isInitiator ? '(阵眼)' : '(助阵)' }}</span>
          </div>
          <div class="buff-bonus">
            <span>成功率: {{ array.bonus.successRate }}%</span>
            <span>产出加成: +{{ array.bonus.yieldBonus }}%</span>
          </div>
          <div class="buff-time">剩余: {{ formatTime(array.buffExpiresIn) }}</div>
        </div>
      </div>

      <!-- 冷却状态 -->
      <div v-if="!array?.canInitiate && array?.cooldownMs" class="cooldown-info">
        <Clock :size="16" />
        <span>大阵冷却中: {{ formatTime(array.cooldownMs) }}</span>
      </div>

      <!-- 发起大阵按钮 -->
      <button v-if="array?.canInitiate" class="initiate-btn" :disabled="loading" @click="handleInitiate">
        <Sparkles :size="18" />
        <span>启阵</span>
      </button>
    </div>

    <!-- 大阵效果说明 -->
    <div class="array-info">
      <div class="info-header">
        <Info :size="18" />
        <span>大阵效果</span>
      </div>
      <div class="info-grid">
        <div class="info-item">
          <div class="role">阵眼(发起者)</div>
          <div class="bonus">成功率 98%</div>
          <div class="bonus">产出 +50%</div>
        </div>
        <div class="info-item">
          <div class="role">助阵者</div>
          <div class="bonus">成功率 80%</div>
          <div class="bonus">产出 +30%</div>
        </div>
      </div>
      <div class="info-note">
        <span>持续3小时 · 冷却12小时 · 最多10人</span>
      </div>
    </div>

    <!-- 活跃大阵列表 -->
    <div class="active-arrays">
      <div class="section-header">
        <Orbit :size="18" />
        <span>当前活跃大阵</span>
      </div>

      <div v-if="!array?.activeArrays?.length" class="no-arrays">
        <CircleDashed :size="32" />
        <span>暂无活跃大阵</span>
      </div>

      <div v-else class="arrays-list">
        <div v-for="item in array.activeArrays" :key="item.id" class="array-card">
          <div class="array-info-row">
            <div class="initiator">
              <User :size="16" />
              <span>{{ item.initiatorName }}</span>
            </div>
            <div class="participants">
              <Users :size="14" />
              <span>{{ item.participantCount }}/10</span>
            </div>
          </div>
          <div class="array-time">
            <Clock :size="14" />
            <span>剩余: {{ getArrayRemaining(item.expiresAt) }}</span>
          </div>
          <button v-if="item.canJoin" class="join-btn" :disabled="loading" @click="handleJoin(item.id)">
            <UserPlus :size="16" />
            <span>助阵</span>
          </button>
          <div v-else class="already-joined">
            <Check :size="16" />
            <span>已参与</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { useStarPalaceStore } from '@/stores/starpalace'
  import { extractErrorMessage } from '@/api'
  import { useMessage } from 'naive-ui'
  import { Users, Zap, Clock, Sparkles, Info, Orbit, CircleDashed, User, UserPlus, Check } from 'lucide-vue-next'

  const starPalaceStore = useStarPalaceStore()
  const { array, loading } = storeToRefs(starPalaceStore)
  const message = useMessage()

  function formatTime(ms: number): string {
    if (ms <= 0) return '可用'
    const hours = Math.floor(ms / (60 * 60 * 1000))
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
    if (hours > 0) return `${hours}时${minutes}分`
    return `${minutes}分钟`
  }

  function getArrayRemaining(expiresAt: number): string {
    const remaining = expiresAt - Date.now()
    return formatTime(remaining)
  }

  async function handleInitiate() {
    try {
      await starPalaceStore.initiateArray()
      message.success('周天星斗大阵已启动！获得3小时强力加成')
    } catch (error) {
      message.error(extractErrorMessage(error, '启阵失败'))
    }
  }

  async function handleJoin(arrayId: string) {
    try {
      await starPalaceStore.joinArray(arrayId)
      message.success('助阵成功！获得3小时修炼加成')
    } catch (error) {
      message.error(extractErrorMessage(error, '助阵失败'))
    }
  }
</script>

<style scoped>
  .star-array-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: relative;
    overflow: hidden;
  }

  /* 背景星阵粒子 */
  .array-particles {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 0;
  }

  .array-star {
    position: absolute;
    left: var(--x);
    top: var(--y);
    width: var(--size);
    height: var(--size);
    background: radial-gradient(circle, rgba(99, 102, 241, 0.9) 0%, rgba(139, 92, 246, 0.5) 50%, transparent 100%);
    border-radius: 50%;
    animation: arrayTwinkle var(--duration) ease-in-out infinite;
    animation-delay: var(--delay);
  }

  @keyframes arrayTwinkle {
    0%,
    100% {
      opacity: 0.2;
      transform: scale(0.8);
    }
    50% {
      opacity: 1;
      transform: scale(1.2);
    }
  }

  /* 个人状态 */
  .personal-status {
    padding: 16px;
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(99, 102, 241, 0.03) 100%);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 12px;
    position: relative;
    z-index: 1;
    box-shadow: 0 0 15px rgba(99, 102, 241, 0.08);
  }

  .status-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #6366f1;
    margin-bottom: 8px;
  }

  .status-desc {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin: 0 0 16px;
  }

  /* Buff卡片 */
  .buff-card {
    display: flex;
    gap: 12px;
    padding: 12px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 10px;
    margin-bottom: 12px;
  }

  .buff-icon {
    position: relative;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 50%;
    color: white;
    flex-shrink: 0;
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
    animation: buffIconGlow 2s ease-in-out infinite;
  }

  @keyframes buffIconGlow {
    0%,
    100% {
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
    }
    50% {
      box-shadow: 0 0 30px rgba(99, 102, 241, 0.8);
    }
  }

  .buff-info {
    flex: 1;
  }

  .buff-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .buff-role {
    font-size: 0.8rem;
    color: #6366f1;
  }

  .buff-bonus {
    display: flex;
    gap: 12px;
    font-size: 0.85rem;
    color: #52c41a;
    margin-bottom: 4px;
  }

  .buff-time {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  /* 冷却状态 */
  .cooldown-info {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px;
    background: rgba(250, 173, 20, 0.1);
    border-radius: 8px;
    font-size: 0.85rem;
    color: #faad14;
    margin-bottom: 12px;
  }

  /* 启阵按钮 */
  .initiate-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
    animation: initiateBtnPulse 2s ease-in-out infinite;
  }

  @keyframes initiateBtnPulse {
    0%,
    100% {
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
    }
    50% {
      box-shadow: 0 0 30px rgba(99, 102, 241, 0.6);
    }
  }

  .initiate-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 25px rgba(99, 102, 241, 0.5);
    animation: none;
  }

  .initiate-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 大阵效果说明 */
  .array-info {
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    position: relative;
    z-index: 1;
  }

  .info-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 12px;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 12px;
  }

  .info-item {
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 8px;
    text-align: center;
  }

  .info-item .role {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 6px;
  }

  .info-item .bonus {
    font-size: 0.85rem;
    color: #52c41a;
  }

  .info-note {
    text-align: center;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  /* 活跃大阵列表 */
  .active-arrays {
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    position: relative;
    z-index: 1;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 12px;
  }

  .no-arrays {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;
    color: var(--text-muted);
    gap: 8px;
  }

  .arrays-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .array-card {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 8px;
  }

  .array-info-row {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
  }

  .initiator,
  .participants,
  .array-time {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
  }

  .initiator {
    font-weight: 500;
    color: var(--text-primary);
  }

  .participants {
    color: var(--text-muted);
  }

  .array-time {
    color: var(--text-muted);
  }

  .join-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .join-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .join-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .already-joined {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
    border-radius: 6px;
    font-size: 0.8rem;
  }
</style>
