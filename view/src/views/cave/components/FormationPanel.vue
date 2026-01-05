<template>
  <div class="formation-panel">
    <!-- 当前激活阵法 -->
    <div v-if="status?.activeFormation" class="active-formation">
      <div class="active-header">
        <ShieldCheck :size="18" />
        <span>护府阵法</span>
      </div>
      <div class="active-card">
        <div class="formation-name">{{ status.activeFormation.name }}</div>
        <div class="formation-tier">{{ status.activeFormation.tierName }}</div>
        <div class="formation-effects">
          <div v-if="status.activeFormation.effects.damageReduction" class="effect-item">
            <ShieldHalf :size="14" />
            <span>减伤 {{ status.activeFormation.effects.damageReduction }}%</span>
          </div>
          <div v-if="status.activeFormation.effects.reflectDamage" class="effect-item">
            <Undo2 :size="14" />
            <span>反伤 {{ status.activeFormation.effects.reflectDamage }}%</span>
          </div>
          <div v-if="status.activeFormation.effects.dodgeChance" class="effect-item">
            <Wind :size="14" />
            <span>闪避 {{ status.activeFormation.effects.dodgeChance }}%</span>
          </div>
          <div v-if="status.activeFormation.effects.counterAttack" class="effect-item">
            <Zap :size="14" />
            <span>反击 {{ status.activeFormation.effects.counterAttack }}%</span>
          </div>
        </div>
        <div class="remaining-time">
          <Timer :size="14" />
          <span>剩余 {{ formatTime(status.activeFormation.remainingTime) }}</span>
        </div>
        <NButton type="error" size="small" @click="handleDeactivate">
          <template #icon>
            <XCircle :size="14" />
          </template>
          撤阵
        </NButton>
      </div>
    </div>

    <div v-else class="no-formation">
      <ShieldOff :size="32" />
      <p>洞府未布置防护阵法</p>
    </div>

    <!-- 已学习阵法 -->
    <div class="section">
      <h3>
        <BookOpen :size="16" />
        已习阵法
      </h3>
      <div v-if="!status?.learnedFormations?.length" class="empty-section">尚未习得任何阵法</div>
      <div v-else class="formation-list">
        <div v-for="formation in status.learnedFormations" :key="formation.id" class="formation-card learned">
          <div class="card-header">
            <span class="formation-name">{{ formation.name }}</span>
            <span class="formation-tier">{{ formation.tierName }}</span>
          </div>
          <p class="formation-desc">{{ formation.description }}</p>
          <div class="formation-effects">
            <span v-if="formation.effects.damageReduction" class="effect-tag">减伤{{ formation.effects.damageReduction }}%</span>
            <span v-if="formation.effects.reflectDamage" class="effect-tag">反伤{{ formation.effects.reflectDamage }}%</span>
            <span v-if="formation.effects.dodgeChance" class="effect-tag">闪避{{ formation.effects.dodgeChance }}%</span>
            <span v-if="formation.effects.counterAttack" class="effect-tag">反击{{ formation.effects.counterAttack }}%</span>
          </div>
          <div class="card-footer">
            <div class="activation-cost">
              <Coins :size="12" />
              {{ formation.activationCost.spiritStones }}
              <Sparkles :size="12" />
              {{ formation.activationCost.cultivation }}
            </div>
            <NButton v-if="formation.canActivate" type="primary" size="small" @click="handleActivate(formation.id)">布阵</NButton>
            <span v-else class="cannot-activate">已激活其他阵法</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 可学习阵法 -->
    <div class="section">
      <h3>
        <GraduationCap :size="16" />
        可习阵法
      </h3>
      <div v-if="!status?.availableFormations?.length" class="empty-section">暂无可学习的阵法</div>
      <div v-else class="formation-list">
        <div
          v-for="formation in status.availableFormations"
          :key="formation.id"
          class="formation-card available"
          :class="{ 'can-learn': formation.canLearn }"
        >
          <div class="card-header">
            <span class="formation-name">{{ formation.name }}</span>
            <span class="formation-tier">{{ formation.tierName }}</span>
          </div>
          <p class="formation-desc">{{ formation.description }}</p>
          <div class="formation-effects">
            <span v-if="formation.effects.damageReduction" class="effect-tag">减伤{{ formation.effects.damageReduction }}%</span>
            <span v-if="formation.effects.reflectDamage" class="effect-tag">反伤{{ formation.effects.reflectDamage }}%</span>
            <span v-if="formation.effects.dodgeChance" class="effect-tag">闪避{{ formation.effects.dodgeChance }}%</span>
            <span v-if="formation.effects.counterAttack" class="effect-tag">反击{{ formation.effects.counterAttack }}%</span>
          </div>
          <div class="card-footer">
            <div class="learn-cost">
              <Coins :size="12" />
              {{ formation.learnCost.spiritStones }}
            </div>
            <NButton v-if="formation.canLearn" type="primary" size="small" @click="handleLearn(formation.id)">习得</NButton>
            <span v-else class="realm-requirement">需 {{ getRealmName(formation.requiredRealmTier) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue'
  import { NButton, useMessage } from 'naive-ui'
  import {
    ShieldCheck,
    ShieldHalf,
    ShieldOff,
    BookOpen,
    GraduationCap,
    Timer,
    Coins,
    Sparkles,
    Wind,
    Zap,
    Undo2,
    XCircle
  } from 'lucide-vue-next'
  import { formationApi, extractErrorMessage } from '@/api'

  interface FormationEffects {
    damageReduction: number
    reflectDamage: number
    dodgeChance: number
    counterAttack: number
  }

  interface FormationInfo {
    id: string
    name: string
    description: string
    tier: number
    tierName: string
    effects: FormationEffects
    learnCost: { spiritStones: number }
    activationCost: { spiritStones: number; cultivation: number }
    duration: number
    requiredRealmTier: number
    isLearned: boolean
    canLearn: boolean
    canActivate: boolean
  }

  interface ActiveFormationInfo extends FormationInfo {
    expiresAt: number
    remainingTime: number
  }

  interface FormationStatus {
    learnedFormations: FormationInfo[]
    availableFormations: FormationInfo[]
    activeFormation: ActiveFormationInfo | null
  }

  const message = useMessage()
  const status = ref<FormationStatus | null>(null)

  const realmNames = ['炼气期', '筑基期', '结丹期', '元婴期', '化神期', '炼虚期', '合体期', '大乘期', '渡劫期']
  const getRealmName = (tier: number) => realmNames[tier - 1] || `${tier}阶`

  const formatTime = (ms: number) => {
    if (ms <= 0) return '已过期'
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) return `${hours}小时${minutes}分`
    return `${minutes}分钟`
  }

  const fetchStatus = async () => {
    try {
      const data = await formationApi.getStatus()
      status.value = data.data
    } catch (err) {
      message.error(extractErrorMessage(err, '获取阵法状态失败'))
    }
  }

  const handleLearn = async (formationId: string) => {
    try {
      const data = await formationApi.learn(formationId)
      message.success(data.data.message)
      await fetchStatus()
    } catch (err) {
      message.error(extractErrorMessage(err, '学习失败'))
    }
  }

  const handleActivate = async (formationId: string) => {
    try {
      const data = await formationApi.activate(formationId)
      message.success(data.data.message)
      await fetchStatus()
    } catch (err) {
      message.error(extractErrorMessage(err, '激活失败'))
    }
  }

  const handleDeactivate = async () => {
    try {
      const data = await formationApi.deactivate()
      message.success(data.data.message)
      await fetchStatus()
    } catch (err) {
      message.error(extractErrorMessage(err, '撤阵失败'))
    }
  }

  let timer: ReturnType<typeof setInterval> | null = null

  onMounted(async () => {
    await fetchStatus()
    timer = setInterval(() => {
      if (status.value?.activeFormation && status.value.activeFormation.remainingTime > 0) {
        status.value.activeFormation.remainingTime -= 1000
        if (status.value.activeFormation.remainingTime <= 0) {
          fetchStatus()
        }
      }
    }, 1000)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })
</script>

<style scoped>
  .formation-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .active-formation {
    background: var(--bg-card);
    border: 1px solid rgba(74, 222, 128, 0.3);
    border-radius: 12px;
    padding: 16px;
  }

  .active-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: #4ade80;
    margin-bottom: 12px;
  }

  .active-card .formation-name {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .active-card .formation-tier {
    font-size: 0.8rem;
    color: var(--color-gold);
    margin-bottom: 12px;
  }

  .active-card .formation-effects {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 12px;
  }

  .active-card .effect-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .remaining-time {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: #fbbf24;
    margin-bottom: 12px;
  }

  .no-formation {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    background: var(--bg-card);
    border: 1px dashed var(--border-color);
    border-radius: 12px;
    color: var(--text-muted);
    gap: 8px;
  }

  .section h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    color: var(--text-primary);
    margin: 0 0 12px;
  }

  .empty-section {
    text-align: center;
    padding: 20px;
    color: var(--text-muted);
    background: var(--bg-card);
    border: 1px dashed var(--border-color);
    border-radius: 10px;
    font-size: 0.85rem;
  }

  .formation-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .formation-card {
    padding: 14px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
  }

  .formation-card.learned {
    border-color: rgba(93, 124, 111, 0.4);
  }

  .formation-card.can-learn {
    border-color: rgba(201, 169, 89, 0.4);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .card-header .formation-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .card-header .formation-tier {
    font-size: 0.75rem;
    padding: 2px 8px;
    background: rgba(201, 169, 89, 0.15);
    color: var(--color-gold);
    border-radius: 4px;
  }

  .formation-desc {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 0 0 10px;
    line-height: 1.4;
  }

  .formation-card .formation-effects {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  .effect-tag {
    font-size: 0.7rem;
    padding: 2px 6px;
    background: rgba(138, 109, 183, 0.15);
    color: #8a6db7;
    border-radius: 4px;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 10px;
    border-top: 1px solid var(--border-color);
  }

  .learn-cost,
  .activation-cost {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: var(--color-gold);
  }

  .realm-requirement,
  .cannot-activate {
    font-size: 0.75rem;
    color: var(--text-muted);
  }
</style>
