<template>
  <div class="battle-hub-page">
    <div class="page-header">
      <div class="header-icon">
        <Swords :size="24" />
      </div>
      <div class="header-info">
        <h2>神通对决</h2>
        <p>以武会友，以战证道</p>
      </div>
    </div>

    <!-- 功能入口网格 -->
    <div class="feature-grid">
      <!-- 木人阁 -->
      <router-link to="/wooden-dummy" class="feature-card">
        <div class="card-icon dummy">
          <Sword :size="28" />
        </div>
        <div class="card-content">
          <h3>木人阁</h3>
          <p>与木人傀儡切磋，评估自身战力</p>
        </div>
        <ChevronRight :size="20" class="card-arrow" />
      </router-link>

      <!-- 洞府阵法 -->
      <router-link to="/formation" class="feature-card">
        <div class="card-icon formation">
          <Shield :size="28" />
        </div>
        <div class="card-content">
          <h3>洞府阵法</h3>
          <p>布置防护阵法，抵御来犯之敌</p>
        </div>
        <ChevronRight :size="20" class="card-arrow" />
      </router-link>

      <!-- 天骄榜 -->
      <router-link to="/rankings" class="feature-card">
        <div class="card-icon rankings">
          <Trophy :size="28" />
        </div>
        <div class="card-content">
          <h3>天骄榜</h3>
          <p>修仙界最强者排行</p>
        </div>
        <ChevronRight :size="20" class="card-arrow" />
      </router-link>

      <!-- 斗法场 -->
      <router-link to="/arena" class="feature-card">
        <div class="card-icon arena">
          <Swords :size="28" />
        </div>
        <div class="card-content">
          <h3>斗法场</h3>
          <p>与其他修士一决高下</p>
        </div>
        <ChevronRight :size="20" class="card-arrow" />
      </router-link>

      <!-- 夺宝 -->
      <router-link to="/loot" class="feature-card">
        <div class="card-icon treasure">
          <Coins :size="28" />
        </div>
        <div class="card-content">
          <h3>夺宝</h3>
          <p>掠夺他人灵石资源</p>
        </div>
        <ChevronRight :size="20" class="card-arrow" />
      </router-link>
    </div>

    <!-- 战力概览 -->
    <div class="power-overview">
      <h3>
        <TrendingUp :size="18" />
        我的排名
      </h3>
      <div class="power-stats">
        <div class="power-item">
          <span class="power-label">战力榜</span>
          <span class="power-value">{{ formatRank(myRanks?.power?.rank) }}</span>
        </div>
        <div class="power-item">
          <span class="power-label">修为榜</span>
          <span class="power-value">{{ formatRank(myRanks?.cultivation?.rank) }}</span>
        </div>
        <div class="power-item">
          <span class="power-label">恶人榜</span>
          <span class="power-value">{{ formatRank(myRanks?.evil?.rank) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { Swords, Sword, Shield, Trophy, Coins, TrendingUp, ChevronRight } from 'lucide-vue-next'
  import { rankingApi } from '@/api'

  interface RankInfo {
    type: string
    rank: number
    value: number
    total: number
  }

  interface MyRanks {
    cultivation: RankInfo
    evil: RankInfo
    power: RankInfo
    pvpKills: RankInfo
    loot: RankInfo
  }

  const myRanks = ref<MyRanks | null>(null)

  const formatRank = (rank: number | undefined) => {
    if (!rank || rank === 0) return '未上榜'
    return `#${rank}`
  }

  const fetchMyRanks = async () => {
    try {
      const data = await rankingApi.getAllMyRanks()
      myRanks.value = data.data
    } catch {
      // Ignore error
    }
  }

  onMounted(() => {
    fetchMyRanks()
  })
</script>

<style scoped>
  .battle-hub-page {
    padding: 16px;
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  .header-icon {
    width: 48px;
    height: 48px;
    border-radius: 4px;
    background: linear-gradient(135deg, #8b3a3a 0%, #6b2a2a 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    border: 1px solid rgba(200, 100, 100, 0.5);
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

  .feature-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }

  .feature-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s ease;
  }

  .feature-card:hover {
    border-color: var(--color-gold);
    transform: translateX(4px);
  }

  .card-icon {
    width: 56px;
    height: 56px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
  }

  .card-icon.dummy {
    background: linear-gradient(135deg, #8b6914 0%, #6b4e0f 100%);
  }

  .card-icon.formation {
    background: linear-gradient(135deg, #4a6fa5 0%, #3a5a8a 100%);
  }

  .card-icon.rankings {
    background: linear-gradient(135deg, #c9a959 0%, #a08040 100%);
    color: #1a1812;
  }

  .card-icon.arena {
    background: linear-gradient(135deg, #8b3a3a 0%, #6b2a2a 100%);
  }

  .card-icon.treasure {
    background: linear-gradient(135deg, #6b5a8a 0%, #4a3a6a 100%);
  }

  .card-content {
    flex: 1;
  }

  .card-content h3 {
    margin: 0 0 4px;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .card-content p {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .card-arrow {
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .feature-card:hover .card-arrow {
    color: var(--color-gold);
  }

  .power-overview {
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }

  .power-overview h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    color: var(--text-primary);
    margin: 0 0 16px;
  }

  .power-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .power-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 4px;
  }

  .power-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .power-value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-gold);
  }
</style>
