<template>
  <div class="formation-page">
    <div class="page-header">
      <div class="header-icon">
        <Shield :size="24" />
      </div>
      <div class="header-info">
        <h2>洞府阵法</h2>
        <p>布置防护阵法，抵御来犯之敌</p>
      </div>
    </div>

    <!-- 当前激活阵法 -->
    <div v-if="status?.activeFormation" class="active-formation">
      <div class="active-header">
        <ShieldCheck :size="18" />
        <span>当前防护</span>
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
        <button class="deactivate-btn" @click="handleDeactivate">
          <XCircle :size="16" />
          撤阵
        </button>
      </div>
    </div>

    <!-- 已学习阵法 -->
    <div class="section">
      <h3>
        <BookOpen :size="18" />
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
            <div v-if="formation.effects.damageReduction" class="effect-item">
              <ShieldHalf :size="12" />
              {{ formation.effects.damageReduction }}%
            </div>
            <div v-if="formation.effects.reflectDamage" class="effect-item">
              <Undo2 :size="12" />
              {{ formation.effects.reflectDamage }}%
            </div>
            <div v-if="formation.effects.dodgeChance" class="effect-item">
              <Wind :size="12" />
              {{ formation.effects.dodgeChance }}%
            </div>
            <div v-if="formation.effects.counterAttack" class="effect-item">
              <Zap :size="12" />
              {{ formation.effects.counterAttack }}%
            </div>
          </div>
          <div class="card-footer">
            <div class="activation-cost">
              <Coins :size="12" />
              {{ formation.activationCost.spiritStones }}
              <Sparkles :size="12" class="ml-2" />
              {{ formation.activationCost.cultivation }}
            </div>
            <button v-if="formation.canActivate" class="activate-btn" @click="handleActivate(formation.id)">布阵</button>
            <span v-else class="cannot-activate">已激活其他阵法</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 可学习阵法 -->
    <div class="section">
      <h3>
        <GraduationCap :size="18" />
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
            <div v-if="formation.effects.damageReduction" class="effect-item">
              <ShieldHalf :size="12" />
              {{ formation.effects.damageReduction }}%
            </div>
            <div v-if="formation.effects.reflectDamage" class="effect-item">
              <Undo2 :size="12" />
              {{ formation.effects.reflectDamage }}%
            </div>
            <div v-if="formation.effects.dodgeChance" class="effect-item">
              <Wind :size="12" />
              {{ formation.effects.dodgeChance }}%
            </div>
            <div v-if="formation.effects.counterAttack" class="effect-item">
              <Zap :size="12" />
              {{ formation.effects.counterAttack }}%
            </div>
          </div>
          <div class="card-footer">
            <div class="learn-cost">
              <Coins :size="12" />
              {{ formation.learnCost.spiritStones }}
            </div>
            <button v-if="formation.canLearn" class="learn-btn" @click="handleLearn(formation.id)">习得</button>
            <span v-else class="realm-requirement">需 {{ getRealmName(formation.requiredRealmTier) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import {
    Shield,
    ShieldCheck,
    ShieldHalf,
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
  import { useMessage } from 'naive-ui'
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
    if (hours > 0) {
      return `${hours}小时${minutes}分`
    }
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

  // 定时更新剩余时间
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

  import { onUnmounted } from 'vue'
  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
    }
  })
</script>

<style scoped>
  .formation-page {
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
    background: linear-gradient(135deg, #4a6fa5 0%, #3a5a8a 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    border: 1px solid rgba(100, 149, 237, 0.5);
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

  .active-formation {
    margin-bottom: 24px;
  }

  .active-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: #4ade80;
    margin-bottom: 8px;
  }

  .active-card {
    padding: 16px;
    background: linear-gradient(135deg, rgba(74, 222, 128, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%);
    border: 1px solid rgba(74, 222, 128, 0.3);
    border-radius: 4px;
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
    gap: 12px;
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

  .deactivate-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;
  }

  .deactivate-btn:hover {
    background: rgba(239, 68, 68, 0.25);
  }

  .section {
    margin-bottom: 24px;
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
    padding: 24px;
    color: var(--text-secondary);
    background: var(--bg-card);
    border: 1px dashed var(--border-color);
    border-radius: 4px;
  }

  .formation-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }

  .formation-card {
    padding: 14px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    transition: all 0.2s ease;
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
    padding: 2px 6px;
    background: rgba(201, 169, 89, 0.15);
    color: var(--color-gold);
    border-radius: 2px;
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
    gap: 8px;
    margin-bottom: 12px;
  }

  .formation-card .effect-item {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 0.75rem;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 6px;
    border-radius: 2px;
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

  .ml-2 {
    margin-left: 8px;
  }

  .learn-btn,
  .activate-btn {
    padding: 6px 14px;
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    color: var(--text-primary);
    border: 1px solid rgba(93, 124, 111, 0.5);
    border-radius: 4px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .learn-btn:hover,
  .activate-btn:hover {
    background: linear-gradient(135deg, #6d8c7f 0%, #4d6a5f 100%);
  }

  .realm-requirement,
  .cannot-activate {
    font-size: 0.75rem;
    color: var(--text-muted);
  }
</style>
