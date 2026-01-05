<template>
  <div class="profile-page">
    <!-- 角色头像卡片 -->
    <div class="hero-card">
      <div class="avatar-section">
        <div class="avatar-frame">
          <div class="avatar">
            <span>{{ playerStore.displayName?.charAt(0) || '修' }}</span>
          </div>
          <div class="realm-ring" :class="`tier-${realmTier}`" />
        </div>
        <div class="hero-info">
          <h2 class="player-name">{{ playerStore.displayName }}</h2>
          <div class="realm-badge" :class="`realm-tier-${realmTier}`">
            <Sparkles :size="14" />
            <span>{{ playerStore.realmDisplay }}</span>
          </div>
          <div class="combat-power">
            <TrendingUp :size="14" />
            <span>战力 {{ playerStore.combatPower }}</span>
          </div>
        </div>
      </div>

      <!-- 修炼进度 -->
      <div class="cultivation-progress">
        <div class="progress-header">
          <span>修炼进度</span>
          <span class="progress-value">{{ playerStore.character?.realmProgress || 0 }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${playerStore.character?.realmProgress || 0}%` }" />
        </div>
        <div class="exp-info">
          <span>修为：{{ playerStore.character?.experience || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- 灵根信息 -->
    <div class="section-card" v-if="playerStore.spiritRoot">
      <div class="section-header">
        <Flame :size="16" />
        <span>灵根资质</span>
      </div>
      <div class="spirit-root-display">
        <div class="root-badge" :class="playerStore.spiritRoot.rootType">
          {{ playerStore.spiritRoot.name }}
        </div>
        <p class="root-desc">{{ playerStore.spiritRoot.description }}</p>
        <div class="root-stats">
          <div class="root-stat">
            <span class="stat-label">修炼加成</span>
            <span class="stat-value">+{{ playerStore.spiritRoot.cultivationBonus }}%</span>
          </div>
          <div class="root-stat">
            <span class="stat-label">战力加成</span>
            <span class="stat-value">+{{ playerStore.spiritRoot.combatPowerBonus }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 属性面板 -->
    <div class="section-card">
      <div class="section-header">
        <Activity :size="16" />
        <span>角色属性</span>
      </div>
      <div class="stats-grid">
        <div class="stat-item">
          <Heart :size="20" class="stat-icon hp" />
          <div class="stat-info">
            <span class="stat-value">{{ playerStore.stats?.hp || 0 }}/{{ playerStore.stats?.maxHp || 0 }}</span>
            <span class="stat-label">生命</span>
          </div>
        </div>
        <div class="stat-item">
          <Zap :size="20" class="stat-icon mp" />
          <div class="stat-info">
            <span class="stat-value">{{ playerStore.stats?.mp || 0 }}/{{ playerStore.stats?.maxMp || 0 }}</span>
            <span class="stat-label">灵力</span>
          </div>
        </div>
        <div class="stat-item">
          <Sword :size="20" class="stat-icon attack" />
          <div class="stat-info">
            <span class="stat-value">{{ playerStore.stats?.attack || 0 }}</span>
            <span class="stat-label">攻击</span>
          </div>
        </div>
        <div class="stat-item">
          <Shield :size="20" class="stat-icon defense" />
          <div class="stat-info">
            <span class="stat-value">{{ playerStore.stats?.defense || 0 }}</span>
            <span class="stat-label">防御</span>
          </div>
        </div>
        <div class="stat-item">
          <Wind :size="20" class="stat-icon speed" />
          <div class="stat-info">
            <span class="stat-value">{{ playerStore.stats?.speed || 0 }}</span>
            <span class="stat-label">速度</span>
          </div>
        </div>
        <div class="stat-item">
          <Sparkles :size="20" class="stat-icon luck" />
          <div class="stat-info">
            <span class="stat-value">{{ playerStore.stats?.luck || 0 }}</span>
            <span class="stat-label">幸运</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 宗门信息 -->
    <div class="section-card">
      <div class="section-header">
        <Building2 :size="16" />
        <span>宗门信息</span>
      </div>
      <div class="sect-info">
        <div class="sect-row">
          <span class="sect-label">所属宗门</span>
          <span class="sect-value" :class="{ highlight: playerStore.character?.sect?.name }">
            {{ playerStore.character?.sect?.name || '无门无派' }}
          </span>
        </div>
        <div class="sect-row" v-if="playerStore.character?.sect?.name">
          <span class="sect-label">宗门职位</span>
          <span class="sect-value">{{ playerStore.character?.sect?.rankName || '外门弟子' }}</span>
        </div>
      </div>
    </div>

    <!-- 资源信息 -->
    <div class="section-card">
      <div class="section-header">
        <Coins :size="16" />
        <span>资源储备</span>
      </div>
      <div class="resources-grid">
        <div class="resource-item">
          <Coins :size="24" class="resource-icon" />
          <div class="resource-info">
            <span class="resource-value">{{ (playerStore.character?.spiritStones || 0).toLocaleString() }}</span>
            <span class="resource-label">灵石</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, computed } from 'vue'
  import { usePlayerStore } from '@/stores/player'
  import {
    Sparkles,
    TrendingUp,
    Heart,
    Zap,
    Sword,
    Shield,
    Wind,
    Flame,
    Activity,
    Building2,
    Coins
  } from 'lucide-vue-next'

  const playerStore = usePlayerStore()

  const realmTier = computed(() => playerStore.character?.realm?.tier || 1)

  onMounted(async () => {
    await playerStore.fetchStats()
  })
</script>

<style scoped>
  .profile-page {
    padding: 12px;
    padding-bottom: 100px;
    max-width: 480px;
    margin: 0 auto;
  }

  /* 英雄卡片 */
  .hero-card {
    background: linear-gradient(135deg, rgba(93, 124, 111, 0.15) 0%, rgba(61, 90, 79, 0.1) 100%);
    border: 1px solid rgba(201, 169, 89, 0.3);
    border-radius: 6px;
    padding: 20px;
    margin-bottom: 16px;
    position: relative;
    overflow: hidden;
  }

  .hero-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, var(--color-gold), transparent);
  }

  .avatar-section {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
  }

  .avatar-frame {
    position: relative;
    width: 72px;
    height: 72px;
  }

  .avatar {
    width: 100%;
    height: 100%;
    border-radius: 6px;
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--text-primary);
    border: 2px solid var(--color-gold);
    box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.3);
  }

  .realm-ring {
    position: absolute;
    inset: -4px;
    border-radius: 10px;
    border: 2px solid transparent;
    pointer-events: none;
  }

  .realm-ring.tier-1 { border-color: rgba(156, 163, 175, 0.5); }
  .realm-ring.tier-2 { border-color: rgba(124, 184, 138, 0.5); }
  .realm-ring.tier-3 { border-color: rgba(107, 159, 201, 0.5); }
  .realm-ring.tier-4 { border-color: rgba(156, 122, 184, 0.5); }
  .realm-ring.tier-5 { border-color: rgba(201, 169, 89, 0.5); }
  .realm-ring.tier-6 { border-color: rgba(201, 106, 90, 0.5); }
  .realm-ring.tier-7 { border-color: rgba(212, 165, 201, 0.5); }
  .realm-ring.tier-8 { border-color: rgba(90, 184, 184, 0.5); }
  .realm-ring.tier-9 { border-color: rgba(240, 230, 200, 0.5); box-shadow: 0 0 10px rgba(240, 230, 200, 0.3); }

  .hero-info {
    flex: 1;
  }

  .player-name {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 8px;
    letter-spacing: 1px;
  }

  .realm-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .combat-power {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--color-gold);
    font-size: 0.9rem;
    font-weight: 600;
  }

  .cultivation-progress {
    padding-top: 16px;
    border-top: 1px solid rgba(201, 169, 89, 0.2);
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 0.85rem;
  }

  .progress-header span:first-child {
    color: var(--text-secondary);
  }

  .progress-value {
    color: var(--color-gold);
    font-weight: 600;
  }

  .progress-bar {
    height: 8px;
    background: rgba(93, 124, 111, 0.2);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #5d7c6f, var(--color-gold));
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .exp-info {
    margin-top: 8px;
    font-size: 0.75rem;
    color: var(--text-muted);
    text-align: right;
  }

  /* 通用区块卡片 */
  .section-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 12px;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 12px;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
    color: var(--color-gold);
    font-weight: 600;
    font-size: 0.9rem;
  }

  /* 灵根显示 */
  .spirit-root-display {
    text-align: center;
  }

  .root-badge {
    display: inline-block;
    padding: 8px 24px;
    border-radius: 4px;
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 12px;
  }

  .root-badge.heavenly {
    background: linear-gradient(135deg, rgba(240, 230, 200, 0.2) 0%, rgba(201, 169, 89, 0.15) 100%);
    color: #f0e6c8;
    border: 1px solid rgba(240, 230, 200, 0.4);
  }

  .root-badge.variant {
    background: linear-gradient(135deg, rgba(156, 122, 184, 0.2) 0%, rgba(156, 122, 184, 0.1) 100%);
    color: #9c7ab8;
    border: 1px solid rgba(156, 122, 184, 0.4);
  }

  .root-badge.true {
    background: linear-gradient(135deg, rgba(107, 159, 201, 0.2) 0%, rgba(107, 159, 201, 0.1) 100%);
    color: #6b9fc9;
    border: 1px solid rgba(107, 159, 201, 0.4);
  }

  .root-badge.pseudo {
    background: linear-gradient(135deg, rgba(124, 184, 138, 0.2) 0%, rgba(124, 184, 138, 0.1) 100%);
    color: #7cb88a;
    border: 1px solid rgba(124, 184, 138, 0.4);
  }

  .root-badge.waste {
    background: linear-gradient(135deg, rgba(156, 163, 175, 0.2) 0%, rgba(156, 163, 175, 0.1) 100%);
    color: #9ca3af;
    border: 1px solid rgba(156, 163, 175, 0.4);
  }

  .root-desc {
    color: var(--text-secondary);
    font-size: 0.85rem;
    margin: 0 0 16px;
    line-height: 1.6;
  }

  .root-stats {
    display: flex;
    justify-content: center;
    gap: 32px;
  }

  .root-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .root-stat .stat-label {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .root-stat .stat-value {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-gold);
  }

  /* 属性网格 */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 4px;
  }

  .stat-icon {
    flex-shrink: 0;
  }

  .stat-icon.hp { color: #9b4a3c; }
  .stat-icon.mp { color: #5d7c6f; }
  .stat-icon.attack { color: #c96a5a; }
  .stat-icon.defense { color: #6b8e7a; }
  .stat-icon.speed { color: #5ab8b8; }
  .stat-icon.luck { color: #c9a959; }

  .stat-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .stat-info .stat-value {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stat-info .stat-label {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  /* 宗门信息 */
  .sect-info {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sect-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
  }

  .sect-label {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .sect-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .sect-value.highlight {
    color: var(--color-gold);
  }

  /* 资源网格 */
  .resources-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .resource-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: rgba(201, 169, 89, 0.08);
    border: 1px solid rgba(201, 169, 89, 0.2);
    border-radius: 4px;
  }

  .resource-icon {
    color: var(--color-gold);
  }

  .resource-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .resource-value {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-gold);
  }

  .resource-label {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  /* 境界颜色 */
  .realm-tier-1 { color: #9ca3af; background: rgba(156, 163, 175, 0.15); border: 1px solid rgba(156, 163, 175, 0.3); }
  .realm-tier-2 { color: #7cb88a; background: rgba(124, 184, 138, 0.15); border: 1px solid rgba(124, 184, 138, 0.3); }
  .realm-tier-3 { color: #6b9fc9; background: rgba(107, 159, 201, 0.15); border: 1px solid rgba(107, 159, 201, 0.3); }
  .realm-tier-4 { color: #9c7ab8; background: rgba(156, 122, 184, 0.15); border: 1px solid rgba(156, 122, 184, 0.3); }
  .realm-tier-5 { color: #c9a959; background: rgba(201, 169, 89, 0.15); border: 1px solid rgba(201, 169, 89, 0.3); }
  .realm-tier-6 { color: #c96a5a; background: rgba(201, 106, 90, 0.15); border: 1px solid rgba(201, 106, 90, 0.3); }
  .realm-tier-7 { color: #d4a5c9; background: rgba(212, 165, 201, 0.15); border: 1px solid rgba(212, 165, 201, 0.3); }
  .realm-tier-8 { color: #5ab8b8; background: rgba(90, 184, 184, 0.15); border: 1px solid rgba(90, 184, 184, 0.3); }
  .realm-tier-9 { color: #f0e6c8; background: rgba(240, 230, 200, 0.15); border: 1px solid rgba(240, 230, 200, 0.3); }

  @media (max-width: 400px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .resources-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
