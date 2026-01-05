<template>
  <div class="flame-fan-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-icon">
        <Flame :size="28" />
      </div>
      <div class="header-info">
        <h2>七焰扇</h2>
        <p>上古火系至宝</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <Loader :size="32" class="spin" />
      <p>加载中...</p>
    </div>

    <div v-else-if="!status" class="error-state">
      <AlertCircle :size="32" />
      <p>加载失败</p>
    </div>

    <template v-else>
      <!-- 装备状态卡片 -->
      <div class="status-card">
        <div class="status-header">
          <h3>装备状态</h3>
          <div class="combat-power" v-if="status.combatPower > 0">
            <Swords :size="16" />
            <span>战力 +{{ status.combatPower.toLocaleString() }}</span>
          </div>
        </div>

        <div class="equipment-info">
          <div class="fan-slot">
            <div class="slot-icon" :class="{ active: status.equippedFlameFan }">
              <Flame :size="32" />
            </div>
            <div class="slot-info">
              <span class="slot-label">当前装备</span>
              <span class="slot-value" :class="{ equipped: status.equippedFlameFan }">
                {{ getFanName(status.equippedFlameFan) }}
              </span>
            </div>
          </div>

          <!-- 火灵根共鸣 -->
          <div v-if="status.fireResonance.hasResonance" class="resonance-info">
            <Sparkles :size="16" />
            <span class="resonance-type" :class="status.fireResonance.type">
              {{ status.fireResonance.type === 'full' ? '完全共鸣' : '部分共鸣' }}
            </span>
            <span class="resonance-bonus">伤害 +{{ status.fireResonance.bonusPercent }}%</span>
          </div>
        </div>

        <!-- 装备操作按钮 -->
        <div class="equip-actions" v-if="status.hasThreeFlameFan || status.hasSevenFlameFan">
          <template v-if="status.hasSevenFlameFan">
            <button
              v-if="status.equippedFlameFan !== 'seven_flame_fan'"
              class="equip-btn legendary"
              @click="handleEquip('seven_flame_fan')"
              :disabled="actionLoading"
            >
              装备七焰扇
            </button>
          </template>
          <template v-if="status.hasThreeFlameFan">
            <button
              v-if="status.equippedFlameFan !== 'three_flame_fan'"
              class="equip-btn epic"
              @click="handleEquip('three_flame_fan')"
              :disabled="actionLoading"
            >
              装备三焰扇
            </button>
          </template>
          <button v-if="status.equippedFlameFan" class="unequip-btn" @click="handleUnequip" :disabled="actionLoading">
            卸下装备
          </button>
        </div>
      </div>

      <!-- Debuff状态 -->
      <div v-if="status.debuff" class="debuff-card">
        <div class="debuff-header">
          <AlertTriangle :size="18" />
          <span>炼器反噬</span>
        </div>
        <p class="debuff-desc">{{ status.debuff.description }}</p>
        <div class="debuff-effects">
          <span>修炼效率 -{{ status.debuff.cultivationReduction }}%</span>
          <span>战力 -{{ status.debuff.combatPowerReduction }}%</span>
        </div>
        <div class="debuff-timer">
          <Clock :size="14" />
          <span>剩余 {{ formatTime(status.debuff.remainingMs) }}</span>
        </div>
      </div>

      <!-- 拥有的法宝 -->
      <div class="owned-fans">
        <h3>法宝列表</h3>
        <div class="fans-grid">
          <!-- 三焰扇 -->
          <div class="fan-card epic" :class="{ owned: status.hasThreeFlameFan }">
            <div class="fan-header">
              <div class="fan-icon">
                <Flame :size="24" />
              </div>
              <div>
                <h4>三焰扇</h4>
                <span class="quality-tag epic">地品</span>
              </div>
            </div>
            <p class="fan-desc">古法炼制的火系法宝仿品，战力+11,800</p>
            <div class="fan-status">
              <template v-if="status.hasThreeFlameFan">
                <CheckCircle :size="14" />
                <span>已拥有</span>
              </template>
              <template v-else>
                <XCircle :size="14" />
                <span>未拥有</span>
              </template>
            </div>
          </div>

          <!-- 七焰扇 -->
          <div class="fan-card legendary" :class="{ owned: status.hasSevenFlameFan }">
            <div class="fan-header">
              <div class="fan-icon">
                <Flame :size="24" />
              </div>
              <div>
                <h4>七焰扇</h4>
                <span class="quality-tag legendary">天品</span>
              </div>
            </div>
            <p class="fan-desc">上古火系至宝，战力+35,000，火灵根共鸣+50%伤害</p>
            <div class="fan-status">
              <template v-if="status.hasSevenFlameFan">
                <CheckCircle :size="14" />
                <span>已拥有</span>
              </template>
              <template v-else>
                <XCircle :size="14" />
                <span>未拥有</span>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 炼制区域 -->
      <div class="crafting-section">
        <h3>炼器工坊</h3>

        <!-- 三焰扇炼制 -->
        <div class="craft-card" v-if="!status.hasThreeFlameFan">
          <div class="craft-header">
            <div class="craft-title">
              <Flame :size="20" />
              <h4>炼制三焰扇</h4>
              <span class="quality-tag epic">地品</span>
            </div>
            <div class="success-rate">
              <Target :size="14" />
              <span>成功率 {{ status.craftInfo.threeFlameFan.successRate }}%</span>
            </div>
          </div>

          <div class="materials-list">
            <div
              v-for="mat in status.craftInfo.threeFlameFan.materials"
              :key="mat.itemId"
              class="material-item"
              :class="{ enough: mat.owned >= mat.required }"
            >
              <span class="mat-name">{{ mat.name }}</span>
              <span class="mat-count">{{ mat.owned }}/{{ mat.required }}</span>
            </div>
          </div>

          <div class="craft-cost">
            <Coins :size="14" />
            <span>消耗 {{ status.craftInfo.threeFlameFan.spiritStoneCost.toLocaleString() }} 灵石</span>
          </div>

          <div class="craft-warning">
            <AlertTriangle :size="14" />
            <span>失败将损失全部材料、5%修为，30%概率获得火焰反噬debuff</span>
          </div>

          <button
            class="craft-btn epic"
            @click="handleCraft('three_flame_fan')"
            :disabled="!status.craftInfo.threeFlameFan.canCraft || craftLoading"
          >
            <Sword :size="16" />
            {{ craftLoading ? '炼制中...' : status.craftInfo.threeFlameFan.reason || '开始炼制' }}
          </button>
        </div>

        <!-- 七焰扇炼制 -->
        <div class="craft-card" v-if="status.hasThreeFlameFan && !status.hasSevenFlameFan">
          <div class="craft-header">
            <div class="craft-title">
              <Flame :size="20" />
              <h4>炼制七焰扇</h4>
              <span class="quality-tag legendary">天品</span>
            </div>
            <div class="success-rate">
              <Target :size="14" />
              <span>成功率 {{ status.craftInfo.sevenFlameFan.successRate }}%</span>
            </div>
          </div>

          <div class="materials-list">
            <div
              v-for="mat in status.craftInfo.sevenFlameFan.materials"
              :key="mat.itemId"
              class="material-item"
              :class="{ enough: mat.owned >= mat.required }"
            >
              <span class="mat-name">{{ mat.name }}</span>
              <span class="mat-count">{{ mat.owned }}/{{ mat.required }}</span>
            </div>
          </div>

          <div class="craft-cost">
            <Coins :size="14" />
            <span>消耗 {{ status.craftInfo.sevenFlameFan.spiritStoneCost.toLocaleString() }} 灵石</span>
          </div>

          <div class="craft-warning severe">
            <AlertTriangle :size="14" />
            <span>失败将损失三焰扇和全部材料、10%修为，60%概率获得严重debuff</span>
          </div>

          <button
            class="craft-btn legendary"
            @click="handleCraft('seven_flame_fan')"
            :disabled="!status.craftInfo.sevenFlameFan.canCraft || craftLoading"
          >
            <Sword :size="16" />
            {{ craftLoading ? '炼制中...' : status.craftInfo.sevenFlameFan.reason || '开始炼制' }}
          </button>
        </div>

        <!-- 已拥有七焰扇 -->
        <div v-if="status.hasSevenFlameFan" class="complete-message">
          <Award :size="48" />
          <h4>恭喜！你已拥有上古至宝【七焰扇】</h4>
          <p>天下火系法宝，无出其右</p>
        </div>
      </div>
    </template>

    <!-- 炼制结果弹窗 -->
    <n-modal v-model:show="showResultModal" :mask-closable="true">
      <div class="result-modal" :class="{ success: craftResult?.crafted }">
        <div class="result-header">
          <component :is="craftResult?.crafted ? CheckCircle2 : XCircle" :size="48" />
          <h2>{{ craftResult?.itemName }}</h2>
        </div>

        <p class="result-message">{{ craftResult?.message }}</p>

        <div v-if="craftResult?.penalties" class="result-penalties">
          <div v-if="craftResult.penalties.cultivationLost > 0" class="penalty-item">
            <TrendingDown :size="14" />
            <span>损失修为：{{ craftResult.penalties.cultivationLost.toLocaleString() }}</span>
          </div>
        </div>

        <button class="close-result-btn" @click="showResultModal = false">确定</button>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import {
    Flame,
    Loader,
    AlertCircle,
    Swords,
    Sparkles,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
    Coins,
    Sword,
    Target,
    Award,
    CheckCircle2,
    TrendingDown
  } from 'lucide-vue-next'
  import { useMessage } from 'naive-ui'
  import { useFlameFanStore, type CraftResult } from '@/stores/flameFan'
  import { storeToRefs } from 'pinia'

  const message = useMessage()
  const flameFanStore = useFlameFanStore()
  const { status, loading } = storeToRefs(flameFanStore)

  const actionLoading = ref(false)
  const craftLoading = ref(false)
  const showResultModal = ref(false)
  const craftResult = ref<CraftResult | null>(null)

  const getFanName = (type: string | null) => {
    if (!type) return '未装备'
    if (type === 'three_flame_fan') return '三焰扇'
    if (type === 'seven_flame_fan') return '七焰扇'
    return '未知'
  }

  const formatTime = (ms: number) => {
    if (ms <= 0) return '0秒'
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)

    if (hours > 0) {
      return `${hours}小时${minutes}分`
    }
    if (minutes > 0) {
      return `${minutes}分${seconds}秒`
    }
    return `${seconds}秒`
  }

  const handleEquip = async (type: 'three_flame_fan' | 'seven_flame_fan') => {
    actionLoading.value = true
    try {
      const result = await flameFanStore.equip(type)
      message.success(result.message)
    } catch (err: any) {
      message.error(err.response?.data?.message || '装备失败')
    } finally {
      actionLoading.value = false
    }
  }

  const handleUnequip = async () => {
    actionLoading.value = true
    try {
      const result = await flameFanStore.unequip()
      message.success(result.message)
    } catch (err: any) {
      message.error(err.response?.data?.message || '卸下失败')
    } finally {
      actionLoading.value = false
    }
  }

  const handleCraft = async (type: 'three_flame_fan' | 'seven_flame_fan') => {
    craftLoading.value = true
    try {
      const result = await flameFanStore.craft(type)
      craftResult.value = result
      showResultModal.value = true

      if (result.crafted) {
        message.success(result.message)
      } else {
        message.warning(result.message)
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || '炼制失败')
    } finally {
      craftLoading.value = false
    }
  }

  onMounted(async () => {
    await flameFanStore.fetchStatus(true)
  })
</script>

<style scoped>
  .flame-fan-page {
    padding: 16px;
    max-width: 800px;
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  .header-icon {
    width: 56px;
    height: 56px;
    border-radius: 8px;
    background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    box-shadow: 0 0 20px rgba(249, 115, 22, 0.4);
  }

  .header-info h2 {
    margin: 0 0 4px;
    font-size: 1.5rem;
    color: var(--text-primary);
  }

  .header-info p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .loading-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px;
    color: var(--text-muted);
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

  /* 状态卡片 */
  .status-card {
    padding: 20px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    margin-bottom: 16px;
  }

  .status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .status-header h3 {
    margin: 0;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .combat-power {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%);
    border: 1px solid rgba(249, 115, 22, 0.3);
    border-radius: 8px;
    color: #f97316;
    font-weight: 600;
  }

  .equipment-info {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }

  .fan-slot {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .slot-icon {
    width: 56px;
    height: 56px;
    border-radius: 8px;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
  }

  .slot-icon.active {
    background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
    color: #fff;
  }

  .slot-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .slot-label {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .slot-value {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .slot-value.equipped {
    color: #f97316;
  }

  .resonance-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(249, 115, 22, 0.1);
    border: 1px solid rgba(249, 115, 22, 0.3);
    border-radius: 8px;
    color: #f97316;
  }

  .resonance-type.full {
    font-weight: 600;
  }

  .resonance-bonus {
    margin-left: auto;
    font-weight: 600;
  }

  .equip-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .equip-btn,
  .unequip-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .equip-btn.epic {
    background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
    color: #fff;
  }

  .equip-btn.legendary {
    background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
    color: #fff;
  }

  .equip-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .unequip-btn {
    background: var(--bg-input);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .equip-btn:disabled,
  .unequip-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Debuff卡片 */
  .debuff-card {
    padding: 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 12px;
    margin-bottom: 16px;
  }

  .debuff-header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #ef4444;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .debuff-desc {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .debuff-effects {
    display: flex;
    gap: 16px;
    font-size: 0.85rem;
    color: #ef4444;
    margin-bottom: 8px;
  }

  .debuff-timer {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  /* 拥有的法宝 */
  .owned-fans {
    margin-bottom: 24px;
  }

  .owned-fans h3 {
    margin: 0 0 16px;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .fans-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
  }

  .fan-card {
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    opacity: 0.6;
  }

  .fan-card.owned {
    opacity: 1;
  }

  .fan-card.epic {
    border-left: 3px solid #a855f7;
  }

  .fan-card.legendary {
    border-left: 3px solid #f97316;
  }

  .fan-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .fan-icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fan-card.epic .fan-icon {
    background: rgba(168, 85, 247, 0.2);
    color: #a855f7;
  }

  .fan-card.legendary .fan-icon {
    background: rgba(249, 115, 22, 0.2);
    color: #f97316;
  }

  .fan-header h4 {
    margin: 0 0 4px;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .quality-tag {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .quality-tag.epic {
    background: rgba(168, 85, 247, 0.2);
    color: #a855f7;
  }

  .quality-tag.legendary {
    background: rgba(249, 115, 22, 0.2);
    color: #f97316;
  }

  .fan-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-bottom: 12px;
    line-height: 1.5;
  }

  .fan-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
  }

  .fan-card.owned .fan-status {
    color: #22c55e;
  }

  .fan-card:not(.owned) .fan-status {
    color: var(--text-muted);
  }

  /* 炼制区域 */
  .crafting-section {
    margin-top: 24px;
  }

  .crafting-section h3 {
    margin: 0 0 16px;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .craft-card {
    padding: 20px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    margin-bottom: 16px;
  }

  .craft-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .craft-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #f97316;
  }

  .craft-title h4 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  .success-rate {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    color: #22c55e;
  }

  .materials-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
    margin-bottom: 12px;
  }

  .material-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--bg-secondary);
    border-radius: 6px;
    font-size: 0.85rem;
    color: #ef4444;
  }

  .material-item.enough {
    color: #22c55e;
  }

  .craft-cost {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 14px;
    background: rgba(234, 179, 8, 0.1);
    border-radius: 6px;
    font-size: 0.9rem;
    color: #eab308;
    margin-bottom: 12px;
  }

  .craft-warning {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 6px;
    font-size: 0.85rem;
    color: #f59e0b;
    margin-bottom: 16px;
    line-height: 1.5;
  }

  .craft-warning.severe {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;
  }

  .craft-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .craft-btn.epic {
    background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
    color: #fff;
  }

  .craft-btn.legendary {
    background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
    color: #fff;
  }

  .craft-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  }

  .craft-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .complete-message {
    text-align: center;
    padding: 40px;
    background: linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%);
    border: 1px solid rgba(249, 115, 22, 0.3);
    border-radius: 12px;
    color: #f97316;
  }

  .complete-message h4 {
    margin: 16px 0 8px;
    font-size: 1.2rem;
    color: var(--text-primary);
  }

  .complete-message p {
    margin: 0;
    color: var(--text-secondary);
  }

  /* 结果弹窗 */
  .result-modal {
    width: 400px;
    padding: 24px;
    background: var(--bg-card);
    border-radius: 12px;
    text-align: center;
  }

  .result-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    color: #ef4444;
  }

  .result-modal.success .result-header {
    color: #22c55e;
  }

  .result-header h2 {
    margin: 0;
    font-size: 1.2rem;
    color: var(--text-primary);
  }

  .result-message {
    font-size: 0.95rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 16px;
  }

  .result-penalties {
    margin-bottom: 20px;
  }

  .penalty-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 0.9rem;
    color: #ef4444;
  }

  .close-result-btn {
    padding: 10px 32px;
    background: var(--bg-input);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .close-result-btn:hover {
    background: var(--bg-card);
  }
</style>
