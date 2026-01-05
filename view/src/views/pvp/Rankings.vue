<template>
  <div class="rankings-page">
    <div class="page-header">
      <div class="header-icon">
        <Trophy :size="24" />
      </div>
      <div class="header-info">
        <h2>天骄榜</h2>
        <p>修仙界最强者排行</p>
      </div>
    </div>

    <div class="tabs">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <n-spin size="medium" />
      <span>加载中...</span>
    </div>

    <div v-else-if="rankings.length === 0" class="empty-state">
      <Trophy :size="48" class="empty-icon" />
      <span>暂无排行数据</span>
    </div>

    <div v-else class="ranking-list">
      <div
        v-for="player in rankings"
        :key="player.rank"
        class="ranking-item"
        :class="{ 'top-three': player.rank <= 3 }"
      >
        <div class="rank-badge" :style="{ color: getRankColor(player.rank) }">
          <component v-if="getRankIcon(player.rank)" :is="getRankIcon(player.rank)" :size="20" />
          <span v-else class="rank-number">{{ player.rank }}</span>
        </div>
        <div class="player-info">
          <span class="player-name">{{ player.name }}</span>
          <span class="player-realm">{{ player.realmName }}</span>
          <span v-if="player.sectName" class="player-sect">{{ player.sectName }}</span>
        </div>
        <div class="player-value">
          <component :is="getValueIcon()" :size="14" />
          <span>{{ formatValue(player.value) }}</span>
        </div>
      </div>
    </div>

    <!-- 加载更多 -->
    <div v-if="rankings.length > 0 && hasMore" class="load-more">
      <button @click="loadMore" :disabled="loadingMore">
        {{ loadingMore ? '加载中...' : '加载更多' }}
      </button>
    </div>

    <!-- 我的排名 -->
    <div v-if="myRank" class="my-rank">
      <span class="my-rank-label">我的排名</span>
      <span class="my-rank-value">
        {{ myRank.rank > 0 ? `第 ${myRank.rank} 名` : '未上榜' }}
        <span v-if="myRank.rank > 0" class="my-value">（{{ formatValue(myRank.value) }}）</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Trophy, Crown, Medal, Award, TrendingUp, Coins, Sword, Skull, Target } from 'lucide-vue-next'
import { useMessage } from 'naive-ui'
import { rankingApi, extractErrorMessage } from '@/api'

type RankingType = 'cultivation' | 'power' | 'evil' | 'pvpKills' | 'loot'

interface RankingEntry {
  rank: number
  characterId: string
  name: string
  value: number
  sectId: string | null
  sectName: string | null
  realmTier: number
  realmSubTier: number
  realmName: string
}

interface PlayerRanking {
  type: RankingType
  rank: number
  value: number
  total: number
}

const message = useMessage()

const activeTab = ref<RankingType>('cultivation')
const rankings = ref<RankingEntry[]>([])
const myRank = ref<PlayerRanking | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)
const offset = ref(0)
const limit = 50

const tabs: { key: RankingType; label: string }[] = [
  { key: 'cultivation', label: '修为榜' },
  { key: 'power', label: '战力榜' },
  { key: 'evil', label: '恶人榜' },
  { key: 'pvpKills', label: '击杀榜' },
  { key: 'loot', label: '掠夺榜' }
]

const getRankIcon = (rank: number) => {
  if (rank === 1) return Crown
  if (rank === 2) return Medal
  if (rank === 3) return Award
  return null
}

const getRankColor = (rank: number) => {
  if (rank === 1) return '#ffd700'
  if (rank === 2) return '#c0c0c0'
  if (rank === 3) return '#cd7f32'
  return 'var(--text-muted)'
}

const getValueIcon = () => {
  switch (activeTab.value) {
    case 'cultivation':
      return TrendingUp
    case 'power':
      return Sword
    case 'evil':
      return Skull
    case 'pvpKills':
      return Target
    case 'loot':
      return Coins
    default:
      return TrendingUp
  }
}

const formatValue = (value: number) => {
  if (value >= 100000000) {
    return (value / 100000000).toFixed(1) + '亿'
  }
  if (value >= 10000) {
    return (value / 10000).toFixed(1) + '万'
  }
  return value.toLocaleString()
}

const fetchRankings = async (append = false) => {
  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
    offset.value = 0
    rankings.value = []
  }

  try {
    let data
    switch (activeTab.value) {
      case 'cultivation':
        data = await rankingApi.getCultivationRanking(limit, offset.value)
        break
      case 'power':
        data = await rankingApi.getPowerRanking(limit, offset.value)
        break
      case 'evil':
        data = await rankingApi.getEvilRanking(limit, offset.value)
        break
      case 'pvpKills':
        data = await rankingApi.getPvpKillsRanking(limit, offset.value)
        break
      case 'loot':
        data = await rankingApi.getLootRanking(limit, offset.value)
        break
    }

    const newRankings = data.data as RankingEntry[]
    if (append) {
      rankings.value = [...rankings.value, ...newRankings]
    } else {
      rankings.value = newRankings
    }

    hasMore.value = newRankings.length === limit
    offset.value += newRankings.length
  } catch (err) {
    message.error(extractErrorMessage(err, '获取排行榜失败'))
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const fetchMyRank = async () => {
  try {
    const data = await rankingApi.getMyRank(activeTab.value)
    myRank.value = data.data
  } catch {
    myRank.value = null
  }
}

const switchTab = async (tab: RankingType) => {
  if (activeTab.value === tab) return
  activeTab.value = tab
  await Promise.all([fetchRankings(), fetchMyRank()])
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  await fetchRankings(true)
}

onMounted(async () => {
  await Promise.all([fetchRankings(), fetchMyRank()])
})
</script>

<style scoped>
.rankings-page {
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
  background: linear-gradient(135deg, #c9a959 0%, #a08040 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a1812;
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

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  padding: 4px;
  background: var(--bg-card);
  border-radius: 4px;
  border: 1px solid var(--border-color);
  overflow-x: auto;
}

.tab-item {
  flex: 1;
  min-width: max-content;
  padding: 10px 12px;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-secondary);
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab-item.active {
  background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
  color: var(--text-primary);
  font-weight: 600;
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

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.ranking-item.top-three {
  background: linear-gradient(135deg, rgba(201, 169, 89, 0.1) 0%, rgba(160, 128, 64, 0.05) 100%);
  border-color: rgba(201, 169, 89, 0.3);
}

.rank-badge {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rank-number {
  font-weight: 700;
  font-size: 1rem;
}

.player-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.player-name {
  font-weight: 600;
  color: var(--text-primary);
}

.player-realm {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.player-sect {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.player-value {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-gold);
  font-weight: 600;
  font-size: 0.9rem;
}

.load-more {
  text-align: center;
  margin-bottom: 16px;
}

.load-more button {
  padding: 10px 24px;
  background: var(--bg-card);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.load-more button:hover:not(:disabled) {
  border-color: var(--color-gold);
  color: var(--color-gold);
}

.load-more button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.my-rank {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  background: rgba(93, 124, 111, 0.1);
  border: 1px solid rgba(93, 124, 111, 0.3);
  border-radius: 4px;
}

.my-rank-label {
  color: var(--text-secondary);
}

.my-rank-value {
  color: var(--color-gold);
  font-weight: 600;
}

.my-value {
  font-weight: 400;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
</style>
