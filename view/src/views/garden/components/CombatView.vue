<template>
  <div class="combat-view">
    <div class="combat-header">
      <Swords :size="20" />
      <span>战斗中</span>
      <span class="round-badge">第 {{ combat?.round || 1 }} 回合</span>
    </div>

    <div class="combatants">
      <!-- 玩家状态 -->
      <div class="combatant player">
        <div class="combatant-icon">
          <User :size="28" />
        </div>
        <div class="combatant-info">
          <span class="combatant-name">你</span>
          <div class="hp-bar">
            <div class="hp-fill player-hp" :style="{ width: playerHpPercent + '%' }" />
          </div>
          <span class="hp-text">HP: {{ combat?.playerHp || 0 }}</span>
        </div>
      </div>

      <!-- VS -->
      <div class="vs-icon">
        <Zap :size="24" />
      </div>

      <!-- 妖兽状态 -->
      <div class="combatant monster">
        <div class="combatant-icon monster-icon">
          <Bug :size="28" />
        </div>
        <div class="combatant-info">
          <span class="combatant-name monster-name">{{ combat?.monster?.name || '妖兽' }}</span>
          <div class="hp-bar">
            <div class="hp-fill monster-hp" :style="{ width: monsterHpPercent + '%' }" />
          </div>
          <span class="hp-text">HP: {{ combat?.monster?.currentHp || 0 }}/{{ combat?.monster?.maxHp || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- 战斗操作 -->
    <div class="combat-actions">
      <button class="action-btn attack-btn" :disabled="loading" @click="$emit('attack')">
        <Sword :size="18" />
        <span>攻击</span>
      </button>
      <button class="action-btn flee-btn" :disabled="loading" @click="$emit('flee')">
        <LogOut :size="18" />
        <span>逃跑</span>
      </button>
    </div>

    <!-- 战斗提示 -->
    <div class="combat-hint">
      <AlertCircle :size="14" />
      <span>逃跑有50%成功率，失败会受到伤害</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Swords, User, Bug, Zap, Sword, LogOut, AlertCircle } from 'lucide-vue-next'

  interface CombatData {
    monster: {
      name: string
      currentHp: number
      maxHp: number
    }
    playerHp: number
    round: number
  }

  const props = defineProps<{
    combat?: CombatData
    loading?: boolean
  }>()

  defineEmits<{
    (e: 'attack'): void
    (e: 'flee'): void
  }>()

  const playerHpPercent = computed(() => {
    if (!props.combat) return 100
    // 假设玩家最大HP为1000（实际应该从角色数据获取）
    return Math.max(0, (props.combat.playerHp / 1000) * 100)
  })

  const monsterHpPercent = computed(() => {
    if (!props.combat?.monster) return 100
    return Math.max(0, (props.combat.monster.currentHp / props.combat.monster.maxHp) * 100)
  })
</script>

<style scoped>
  .combat-view {
    padding: 20px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
  }

  .combat-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 24px;
    color: #f5222d;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .round-badge {
    font-size: 0.8rem;
    font-weight: 500;
    padding: 4px 10px;
    background: rgba(245, 34, 45, 0.1);
    border-radius: 10px;
    color: #f5222d;
  }

  .combatants {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
  }

  .combatant {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .combatant-icon {
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(93, 124, 111, 0.1);
    color: #5d7c6f;
  }

  .monster-icon {
    background: rgba(245, 34, 45, 0.1);
    color: #f5222d;
  }

  .combatant-info {
    text-align: center;
    width: 100%;
  }

  .combatant-name {
    display: block;
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .monster-name {
    color: #f5222d;
  }

  .hp-bar {
    width: 100%;
    height: 8px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 4px;
  }

  .hp-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .player-hp {
    background: linear-gradient(90deg, #52c41a, #73d13d);
  }

  .monster-hp {
    background: linear-gradient(90deg, #f5222d, #ff4d4f);
  }

  .hp-text {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .vs-icon {
    flex-shrink: 0;
    color: var(--color-gold);
  }

  .combat-actions {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
  }

  .action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 20px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .attack-btn {
    background: linear-gradient(135deg, #f5222d 0%, #cf1322 100%);
    color: white;
  }

  .attack-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(245, 34, 45, 0.3);
  }

  .flee-btn {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
  }

  .flee-btn:hover:not(:disabled) {
    border-color: var(--text-muted);
  }

  .combat-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 0.8rem;
    color: var(--text-muted);
  }
</style>
