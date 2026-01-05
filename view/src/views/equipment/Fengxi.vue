<template>
  <div class="fengxi-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-icon">
        <Zap :size="28" />
      </div>
      <div class="header-info">
        <h2>风雷翅</h2>
        <p>乱星海绝世法宝</p>
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
      <!-- 未炼化状态 -->
      <div v-if="!status.refined" class="unrefined-section">
        <div class="info-card">
          <div class="card-icon">
            <CloudOff :size="48" />
          </div>
          <h3>尚未炼化风雷翅</h3>
          <div class="lore-box">
            <p>此法宝乃乱星海九级妖修风希斩杀雷鹏所得，蕴含风雷之力，催动时可达天下极速。</p>
            <p>炼化后可获得三大神通：</p>
            <ul>
              <li>
                <strong>天行神速</strong>
                - 缩短各类神通冷却时间
              </li>
              <li>
                <strong>雷光遁影</strong>
                - 提升战斗中的机动性与保命能力
              </li>
              <li>
                <strong>风雷降世</strong>
                - 三种战略级主动技能
              </li>
            </ul>
          </div>
          <button class="refine-btn" @click="handleRefine" :disabled="refining || !status.hasWings">
            <Sparkles :size="16" />
            {{ refining ? '炼化中...' : status.hasWings ? '炼化风雷翅' : '背包中无风雷翅' }}
          </button>
        </div>
      </div>

      <!-- 已炼化状态 -->
      <template v-else>
        <!-- 装备状态卡片 -->
        <div class="equipment-status-card">
          <div class="status-header">
            <div class="status-badge" :class="{ equipped: status.equipped }">
              {{ status.equipped ? '已装备' : '未装备' }}
            </div>
            <div class="action-buttons">
              <button v-if="!status.equipped" class="equip-btn" @click="handleEquip" :disabled="actionLoading">装备</button>
              <button v-else class="unequip-btn" @click="handleUnequip" :disabled="actionLoading || status.locked">
                {{ status.locked ? '锁定中' : '卸下' }}
              </button>
            </div>
          </div>

          <!-- 神通反锁状态 -->
          <div v-if="status.locked" class="lock-warning">
            <Lock :size="16" />
            <div class="lock-info">
              <strong>【神通反锁】</strong>
              <p>风雷翅被以下神通的因果之力锁定：</p>
              <div class="lock-reasons">
                <div v-for="reason in status.lockReasons" :key="reason.skillId" class="lock-reason">
                  <span class="skill-name">{{ reason.skillName }}</span>
                  <span class="unlock-time">{{ formatTime(reason.remaining) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 三大神通 -->
        <div class="skills-section">
          <!-- (一) 天行神速 -->
          <div class="skill-card passive">
            <div class="skill-header">
              <Wind :size="20" />
              <div>
                <h3>天行神速</h3>
                <span class="skill-type">修炼效率神通（被动）</span>
              </div>
            </div>
            <p class="skill-desc">{{ status.passiveSkills.tianxingShensu.description }}</p>
            <div class="skill-effects">
              <div v-for="(effect, idx) in status.passiveSkills.tianxingShensu.effects" :key="idx" class="effect-item">
                <CheckCircle :size="14" />
                <span>{{ effect }}</span>
              </div>
            </div>
            <div class="skill-restriction">
              <AlertTriangle :size="14" />
              <span>{{ status.passiveSkills.tianxingShensu.restriction }}</span>
            </div>
          </div>

          <!-- (二) 雷光遁影 -->
          <div class="skill-card passive">
            <div class="skill-header">
              <Zap :size="20" />
              <div>
                <h3>雷光遁影</h3>
                <span class="skill-type">斗法神通（被动）</span>
              </div>
            </div>
            <p class="skill-desc">{{ status.passiveSkills.leiguangDunying.description }}</p>
            <div class="skill-effects">
              <div v-for="(effect, idx) in status.passiveSkills.leiguangDunying.effects" :key="idx" class="effect-item">
                <CheckCircle :size="14" />
                <span>{{ effect }}</span>
              </div>
            </div>
          </div>

          <!-- (三) 风雷降世 -->
          <div class="skill-card active">
            <div class="skill-header">
              <Sparkles :size="20" />
              <div>
                <h3>风雷降世</h3>
                <span class="skill-type">战略神通（主动）</span>
              </div>
            </div>
            <p class="skill-desc">{{ status.passiveSkills.fengleiJiangshi.description }}</p>
            <div class="skill-info">
              <div class="info-row">
                <span class="label">消耗：</span>
                <span class="value">{{ status.passiveSkills.fengleiJiangshi.cost }}</span>
              </div>
              <div class="info-row">
                <span class="label">冷却：</span>
                <span class="value">
                  {{ status.passiveSkills.fengleiJiangshi.cooldown }}
                  <span v-if="status.skillCooldownRemaining > 0" class="cooldown-timer">
                    （剩余 {{ formatTime(status.skillCooldownRemaining) }}）
                  </span>
                </span>
              </div>
            </div>

            <!-- 三式技能 -->
            <div class="sub-skills">
              <div
                v-for="skill in status.passiveSkills.fengleiJiangshi.skills"
                :key="skill.name"
                class="sub-skill"
                @click="openSkillModal(skill)"
              >
                <div class="sub-skill-header">
                  <h4>{{ skill.name }}</h4>
                  <span class="positioning">{{ skill.positioning }}</span>
                </div>
                <p class="sub-skill-desc">{{ skill.description }}</p>
                <div class="sub-skill-command">
                  <Terminal :size="12" />
                  <code>{{ skill.command }} @目标</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- 技能使用弹窗 -->
    <n-modal v-model:show="showSkillModal" :mask-closable="true">
      <div class="skill-modal" v-if="selectedSkill">
        <div class="modal-header">
          <h2>{{ selectedSkill.name }}</h2>
          <span class="positioning-tag">{{ selectedSkill.positioning }}</span>
        </div>

        <p class="modal-desc">{{ selectedSkill.description }}</p>

        <div class="target-input">
          <label>目标角色ID：</label>
          <input v-model="targetId" type="text" placeholder="请输入目标角色ID" class="input-field" />
        </div>

        <div class="modal-actions">
          <button class="cancel-btn" @click="showSkillModal = false">取消</button>
          <button class="confirm-btn" @click="handleUseSkill" :disabled="!targetId || skillLoading || !status?.equipped">
            <Zap :size="16" />
            {{ skillLoading ? '施展中...' : '施展神通' }}
          </button>
        </div>
      </div>
    </n-modal>

    <!-- 结果弹窗 -->
    <n-modal v-model:show="showResultModal" :mask-closable="true">
      <div class="result-modal" :class="{ success: skillResult?.success }">
        <div class="result-header">
          <component :is="skillResult?.success ? CheckCircle2 : XCircle" :size="48" />
          <h2>{{ skillResult?.skillName }}</h2>
        </div>

        <p class="result-message">{{ skillResult?.message }}</p>

        <div v-if="skillResult" class="result-details">
          <div v-if="skillResult.damage" class="detail-item">
            <Sword :size="14" />
            <span>造成伤害：{{ skillResult.damage }}</span>
          </div>
          <div v-if="skillResult.selfCost" class="detail-item">
            <TrendingDown :size="14" />
            <span>消耗修为：{{ skillResult.selfCost }}</span>
          </div>
          <div v-if="skillResult.lootedSpiritStones" class="detail-item success">
            <Coins :size="14" />
            <span>夺取灵石：{{ skillResult.lootedSpiritStones }}</span>
          </div>
          <div v-if="skillResult.formationBroken !== undefined" class="detail-item" :class="{ success: skillResult.formationBroken }">
            <Shield :size="14" />
            <span>{{ skillResult.formationBroken ? '护山大阵已破' : '护山大阵抵御成功' }}</span>
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
    Zap,
    CloudOff,
    Sparkles,
    Wind,
    CheckCircle,
    AlertTriangle,
    Lock,
    Terminal,
    Loader,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Sword,
    TrendingDown,
    Coins,
    Shield
  } from 'lucide-vue-next'
  import { useMessage } from 'naive-ui'
  import { fengxiApi, extractErrorMessage } from '@/api'

  const message = useMessage()

  const loading = ref(true)
  const status = ref<any>(null)
  const refining = ref(false)
  const actionLoading = ref(false)

  const showSkillModal = ref(false)
  const selectedSkill = ref<any>(null)
  const targetId = ref('')
  const skillLoading = ref(false)

  const showResultModal = ref(false)
  const skillResult = ref<any>(null)

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

  const fetchStatus = async () => {
    loading.value = true
    try {
      const res = await fengxiApi.getStatus()
      status.value = res.data
    } catch (err) {
      message.error(extractErrorMessage(err, '加载失败'))
    } finally {
      loading.value = false
    }
  }

  const handleRefine = async () => {
    refining.value = true
    try {
      const res = await fengxiApi.refine()
      message.success(res.data.message)
      await fetchStatus()
    } catch (err) {
      message.error(extractErrorMessage(err, '炼化失败'))
    } finally {
      refining.value = false
    }
  }

  const handleEquip = async () => {
    actionLoading.value = true
    try {
      const res = await fengxiApi.equip()
      message.success(res.data.message)
      await fetchStatus()
    } catch (err) {
      message.error(extractErrorMessage(err, '装备失败'))
    } finally {
      actionLoading.value = false
    }
  }

  const handleUnequip = async () => {
    actionLoading.value = true
    try {
      const res = await fengxiApi.unequip()
      message.success(res.data.message)
      await fetchStatus()
    } catch (err) {
      message.error(extractErrorMessage(err, '卸下失败'))
    } finally {
      actionLoading.value = false
    }
  }

  const openSkillModal = (skill: any) => {
    if (!status.value?.equipped) {
      message.warning('请先装备风雷翅')
      return
    }
    selectedSkill.value = skill
    targetId.value = ''
    showSkillModal.value = true
  }

  const handleUseSkill = async () => {
    if (!targetId.value) {
      message.warning('请输入目标角色ID')
      return
    }

    skillLoading.value = true
    try {
      let res
      if (selectedSkill.value.name === '无相劫掠') {
        res = await fengxiApi.usePlunder(targetId.value)
      } else if (selectedSkill.value.name === '寂灭神雷') {
        res = await fengxiApi.useFormationBreak(targetId.value)
      } else if (selectedSkill.value.name === '血色惊雷') {
        res = await fengxiApi.useBloodThunder(targetId.value)
      }

      if (res) {
        skillResult.value = res.data
        showSkillModal.value = false
        showResultModal.value = true
        await fetchStatus()
      }
    } catch (err) {
      message.error(extractErrorMessage(err, '技能施展失败'))
    } finally {
      skillLoading.value = false
    }
  }

  onMounted(async () => {
    await fetchStatus()
  })
</script>

<style scoped>
  .fengxi-page {
    padding: 16px;
    max-width: 1200px;
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
    background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    border: 2px solid rgba(139, 92, 246, 0.3);
  }

  .header-info h2 {
    margin: 0 0 4px;
    font-size: 1.5rem;
    color: var(--text-primary);
    letter-spacing: 2px;
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
    justify-content: center;
    padding: 60px 20px;
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

  /* 未炼化状态 */
  .unrefined-section .info-card {
    text-align: center;
    padding: 40px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
  }

  .card-icon {
    color: var(--text-muted);
    margin-bottom: 20px;
  }

  .info-card h3 {
    margin: 0 0 20px;
    font-size: 1.2rem;
    color: var(--text-primary);
  }

  .lore-box {
    text-align: left;
    max-width: 600px;
    margin: 0 auto 30px;
    padding: 20px;
    background: rgba(139, 92, 246, 0.05);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 8px;
  }

  .lore-box p {
    margin: 0 0 12px;
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .lore-box ul {
    margin: 12px 0 0;
    padding-left: 20px;
  }

  .lore-box li {
    margin: 8px 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .refine-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 32px;
    background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .refine-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
  }

  .refine-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 装备状态卡片 */
  .equipment-status-card {
    padding: 20px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    margin-bottom: 24px;
  }

  .status-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .status-badge {
    padding: 6px 16px;
    background: rgba(107, 114, 128, 0.1);
    color: var(--text-secondary);
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .status-badge.equipped {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
  }

  .equip-btn,
  .unequip-btn {
    padding: 8px 20px;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .equip-btn {
    background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
    color: #fff;
  }

  .equip-btn:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }

  .unequip-btn {
    background: var(--bg-input);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .unequip-btn:hover:not(:disabled) {
    background: var(--bg-card);
  }

  .unequip-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .lock-warning {
    display: flex;
    gap: 12px;
    padding: 16px;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 8px;
    color: #f59e0b;
  }

  .lock-info strong {
    display: block;
    margin-bottom: 8px;
  }

  .lock-info p {
    margin: 0 0 8px;
    font-size: 0.85rem;
  }

  .lock-reasons {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .lock-reason {
    display: flex;
    justify-content: space-between;
    padding: 6px 12px;
    background: rgba(245, 158, 11, 0.1);
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .skill-name {
    font-weight: 600;
  }

  /* 技能卡片 */
  .skills-section {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .skill-card {
    padding: 24px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
  }

  .skill-card.passive {
    border-left: 4px solid #3b82f6;
  }

  .skill-card.active {
    border-left: 4px solid #8b5cf6;
  }

  .skill-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .skill-header > svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: #8b5cf6;
  }

  .skill-header h3 {
    margin: 0 0 4px;
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  .skill-type {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .skill-desc {
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 16px;
  }

  .skill-effects {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  .effect-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .effect-item svg {
    flex-shrink: 0;
    color: #22c55e;
  }

  .skill-restriction {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 6px;
    font-size: 0.85rem;
    color: #f59e0b;
  }

  .skill-restriction svg {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .skill-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
    padding: 12px;
    background: rgba(139, 92, 246, 0.05);
    border-radius: 6px;
  }

  .info-row {
    display: flex;
    font-size: 0.9rem;
  }

  .info-row .label {
    color: var(--text-muted);
    min-width: 60px;
  }

  .info-row .value {
    color: var(--text-primary);
  }

  .cooldown-timer {
    color: #f59e0b;
    font-weight: 600;
  }

  .sub-skills {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
  }

  .sub-skill {
    padding: 16px;
    background: rgba(139, 92, 246, 0.05);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .sub-skill:hover {
    border-color: rgba(139, 92, 246, 0.5);
    background: rgba(139, 92, 246, 0.1);
    transform: translateY(-2px);
  }

  .sub-skill-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .sub-skill-header h4 {
    margin: 0;
    font-size: 1rem;
    color: #a78bfa;
  }

  .positioning {
    font-size: 0.75rem;
    color: var(--text-muted);
    padding: 2px 8px;
    background: rgba(139, 92, 246, 0.1);
    border-radius: 4px;
  }

  .sub-skill-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.5;
    margin-bottom: 8px;
  }

  .sub-skill-command {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .sub-skill-command code {
    font-family: 'Courier New', monospace;
    color: #a78bfa;
  }

  /* 弹窗 */
  .skill-modal,
  .result-modal {
    width: 450px;
    padding: 24px;
    background: var(--bg-card);
    border-radius: 12px;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.3rem;
    color: var(--text-primary);
  }

  .positioning-tag {
    font-size: 0.8rem;
    color: var(--text-muted);
    padding: 4px 12px;
    background: rgba(139, 92, 246, 0.1);
    border-radius: 12px;
  }

  .modal-desc {
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 20px;
  }

  .target-input {
    margin-bottom: 20px;
  }

  .target-input label {
    display: block;
    margin-bottom: 8px;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .input-field {
    width: 100%;
    padding: 10px 14px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .input-field:focus {
    outline: none;
    border-color: #8b5cf6;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .cancel-btn,
  .confirm-btn {
    padding: 10px 24px;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cancel-btn {
    background: var(--bg-input);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .cancel-btn:hover {
    background: var(--bg-card);
  }

  .confirm-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
    color: #fff;
  }

  .confirm-btn:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }

  .confirm-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 结果弹窗 */
  .result-modal {
    text-align: center;
  }

  .result-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    color: #f87171;
  }

  .result-modal.success .result-header {
    color: #22c55e;
  }

  .result-header h2 {
    margin: 0;
    font-size: 1.2rem;
  }

  .result-message {
    font-size: 0.95rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 20px;
  }

  .result-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
  }

  .detail-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .detail-item.success {
    color: #22c55e;
  }

  .close-result-btn {
    padding: 10px 32px;
    background: var(--bg-input);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .close-result-btn:hover {
    background: var(--bg-card);
  }
</style>
