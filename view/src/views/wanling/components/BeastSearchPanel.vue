<template>
  <div class="beast-search-panel">
    <n-space vertical :size="16">
      <!-- 寻觅状态 -->
      <n-card size="small">
        <div class="search-status">
          <div class="status-item">
            <span class="status-label">今日寻觅次数</span>
            <span class="status-value">{{ searchStatus?.dailySearches || 0 }} / {{ searchStatus?.maxDailySearches || 3 }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">灵兽数量</span>
            <span class="status-value">{{ beasts.length }} / {{ maxBeasts }}</span>
          </div>
          <div v-if="cooldownRemaining > 0" class="status-item">
            <span class="status-label">冷却中</span>
            <span class="status-value countdown">{{ formatCooldown(cooldownRemaining) }}</span>
          </div>
        </div>
      </n-card>

      <!-- 寻觅按钮 -->
      <div class="search-action">
        <n-button type="primary" size="large" :loading="loading" :disabled="!canSearch || isBeastFull" @click="handleSearch">
          {{ isBeastFull ? '灵兽已满' : cooldownRemaining > 0 ? '冷却中...' : '寻觅灵兽' }}
        </n-button>
        <div class="search-tip">寻觅成功率随境界提升而增加，可能发现普通至传说品质的灵兽</div>
      </div>

      <!-- 寻觅结果 -->
      <n-card v-if="searchResult" size="small" :title="searchResult.success ? '寻觅成功！' : '寻觅失败'">
        <div class="search-result">
          <div class="result-message">{{ searchResult.message }}</div>
          <template v-if="searchResult.beast">
            <n-divider />
            <div class="result-beast">
              <n-tag :color="{ color: getRarityConfig(searchResult.beast.rarity).color, textColor: '#fff' }" size="small">
                {{ getRarityConfig(searchResult.beast.rarity).name }}
              </n-tag>
              <span class="beast-name">{{ searchResult.beast.name }}</span>
            </div>
            <div class="result-stats">
              <span>攻击: {{ searchResult.beast.stats.attack }}</span>
              <span>防御: {{ searchResult.beast.stats.defense }}</span>
              <span>速度: {{ searchResult.beast.stats.speed }}</span>
              <span>HP: {{ searchResult.beast.stats.hp }}</span>
            </div>
            <div class="result-skills">技能: {{ searchResult.beast.skills.length > 0 ? searchResult.beast.skills.join(', ') : '无' }}</div>
          </template>
        </div>
      </n-card>

      <!-- 稀有度说明 -->
      <n-card size="small" title="灵兽稀有度">
        <n-space :size="12">
          <n-tag v-for="(config, key) in BEAST_RARITY_CONFIG" :key="key" :color="{ color: config.color, textColor: '#fff' }">
            {{ config.name }}
          </n-tag>
        </n-space>
        <div class="rarity-desc">稀有度越高的灵兽属性和成长率越强，但出现概率越低</div>
      </n-card>
    </n-space>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useWanlingStore, BEAST_RARITY_CONFIG, type SearchResult } from '@/stores/wanling'
  import { extractErrorMessage } from '@/api'
  import { useMessage } from 'naive-ui'

  const message = useMessage()
  const wanlingStore = useWanlingStore()
  const { beasts, maxBeasts, searchStatus, loading } = storeToRefs(wanlingStore)

  const searchResult = ref<SearchResult | null>(null)
  const cooldownRemaining = ref(0)
  let cooldownTimer: ReturnType<typeof setInterval> | null = null

  // 计算是否可以寻觅
  const canSearch = computed(() => {
    return wanlingStore.canSearch && !wanlingStore.isBeastFull
  })

  // 灵兽是否已满
  const isBeastFull = computed(() => wanlingStore.isBeastFull)

  // 获取稀有度配置
  const getRarityConfig = wanlingStore.getRarityConfig

  // 格式化冷却时间
  const formatCooldown = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    if (hours > 0) {
      return `${hours}时${minutes}分${seconds}秒`
    }
    if (minutes > 0) {
      return `${minutes}分${seconds}秒`
    }
    return `${seconds}秒`
  }

  // 更新冷却时间
  const updateCooldown = () => {
    if (searchStatus.value?.cooldownMs) {
      cooldownRemaining.value = Math.max(0, searchStatus.value.cooldownMs - (Date.now() - wanlingStore.lastRefresh))
    } else {
      cooldownRemaining.value = 0
    }
  }

  // 寻觅灵兽
  const handleSearch = async () => {
    try {
      const result = await wanlingStore.searchBeast()
      searchResult.value = result
      if (result.success) {
        message.success(result.message)
      } else {
        message.warning(result.message)
      }
      updateCooldown()
    } catch (error) {
      message.error(extractErrorMessage(error, '寻觅失败'))
    }
  }

  onMounted(() => {
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
  .beast-search-panel {
    padding: 4px 0;
  }

  /* 卡片通用样式 */
  .beast-search-panel :deep(.n-card) {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
  }

  .beast-search-panel :deep(.n-card-header) {
    padding: 14px 16px 10px;
  }

  .beast-search-panel :deep(.n-card__content) {
    padding: 12px 16px 16px;
  }

  /* 状态区域 */
  .search-status {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }

  .status-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 14px;
    background: rgba(8, 145, 178, 0.05);
    border-radius: 8px;
    min-width: 100px;
  }

  .status-label {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .status-value {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .status-value.countdown {
    color: #f59e0b;
    font-family: 'Consolas', monospace;
  }

  /* 寻觅按钮区域 */
  .search-action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 32px 20px;
    background: linear-gradient(135deg, rgba(8, 145, 178, 0.08) 0%, rgba(6, 182, 212, 0.03) 100%);
    border: 1px dashed rgba(8, 145, 178, 0.3);
    border-radius: 12px;
    position: relative;
    overflow: hidden;
  }

  .search-action::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(8, 145, 178, 0.1) 0%, transparent 60%);
    animation: pulse-bg 4s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes pulse-bg {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.5;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
  }

  .search-action :deep(.n-button) {
    position: relative;
    z-index: 1;
    min-width: 160px;
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 1px;
  }

  .search-tip {
    font-size: 0.8rem;
    color: var(--text-muted);
    text-align: center;
    position: relative;
    z-index: 1;
  }

  /* 寻觅结果 */
  .search-result {
    padding: 4px 0;
  }

  .result-message {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 12px;
    padding: 8px 12px;
    background: rgba(8, 145, 178, 0.05);
    border-radius: 6px;
  }

  .result-beast {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .beast-name {
    font-size: 1.1rem;
    font-weight: 600;
    background: linear-gradient(135deg, #0891b2, #22d3ee);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .result-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding: 12px;
    background: rgba(8, 145, 178, 0.05);
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .result-stats span {
    font-size: 0.8rem;
    color: var(--text-secondary);
    text-align: center;
  }

  .result-skills {
    font-size: 0.85rem;
    color: var(--text-muted);
    padding: 8px 12px;
    background: rgba(139, 92, 246, 0.05);
    border-radius: 6px;
  }

  /* 稀有度说明 */
  .rarity-desc {
    margin-top: 12px;
    font-size: 0.8rem;
    color: var(--text-muted);
    padding-top: 10px;
    border-top: 1px solid var(--border-color);
  }

  /* 响应式 */
  @media (max-width: 480px) {
    .search-status {
      flex-direction: column;
      gap: 10px;
    }

    .status-item {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }

    .result-stats {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
