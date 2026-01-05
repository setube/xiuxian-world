<template>
  <div class="room-detail-panel">
    <div v-if="!dungeonStore.currentRoom" class="no-room">
      <Ghost :size="48" />
      <p>未加入任何房间</p>
    </div>

    <template v-else>
      <!-- 房间头部信息 -->
      <div class="room-header-card">
        <div class="room-title">
          <h2>{{ dungeonStore.currentRoom.dungeonName || '虚天殿·降魔' }}</h2>
          <span class="room-status" :class="dungeonStore.currentRoom.status">
            {{ statusText }}
          </span>
        </div>
        <div class="room-meta">
          <span>队长: {{ dungeonStore.currentRoom.leaderName }}</span>
          <span v-if="dungeonStore.isInProgress">当前第 {{ dungeonStore.currentRoom.currentStage }} 关</span>
        </div>
      </div>

      <!-- 队伍成员 -->
      <div class="team-section">
        <h3>
          <Users :size="16" />
          队伍成员 ({{ dungeonStore.memberCount }}/5)
        </h3>
        <div class="team-grid">
          <div
            v-for="(member, index) in teamMembers"
            :key="member?.characterId || 'empty-' + index"
            class="member-card"
            :class="{ empty: !member, leader: member?.characterId === dungeonStore.currentRoom.leaderId }"
          >
            <template v-if="member">
              <div class="member-role" :style="{ background: getRoleColor(member.role) }">
                {{ getRoleName(member.role) }}
              </div>
              <div class="member-info">
                <span class="member-name">
                  {{ member.name }}
                  <Crown v-if="member.characterId === dungeonStore.currentRoom.leaderId" :size="12" class="leader-icon" />
                </span>
                <span class="member-realm">{{ member.realmName || '未知境界' }}</span>
                <span class="member-power">战力 {{ formatNumber(member.power) }}</span>
              </div>
              <NButton
                v-if="
                  dungeonStore.isLeader &&
                  member.characterId !== dungeonStore.currentRoom.leaderId &&
                  dungeonStore.currentRoom.status === 'waiting'
                "
                quaternary
                size="tiny"
                type="error"
                class="kick-btn"
                @click="handleKick(member.characterId)"
              >
                <X :size="12" />
              </NButton>
            </template>
            <template v-else>
              <div class="empty-slot">
                <UserPlus :size="24" />
                <span>等待加入</span>
              </div>
            </template>
          </div>
        </div>

        <!-- 职业说明 -->
        <div class="role-legend">
          <div v-for="(role, key) in DUNGEON_ROLES" :key="key" class="role-item">
            <span class="role-badge" :style="{ background: role.color }">{{ role.name.charAt(0) }}</span>
            <span class="role-name">{{ role.name }}</span>
          </div>
        </div>
      </div>

      <!-- 副本进度（进行中时显示） -->
      <div v-if="dungeonStore.isInProgress || dungeonStore.isCompleted" class="progress-section">
        <h3>
          <Swords :size="16" />
          副本进度
        </h3>
        <div class="stage-progress">
          <div
            v-for="stage in 3"
            :key="stage"
            class="stage-node"
            :class="{
              completed: isStageCompleted(stage),
              current: dungeonStore.currentRoom.currentStage === stage && dungeonStore.isInProgress,
              failed: isStageFailed(stage)
            }"
          >
            <div class="stage-icon">
              <Check v-if="isStageCompleted(stage)" :size="16" />
              <X v-else-if="isStageFailed(stage)" :size="16" />
              <span v-else>{{ stage }}</span>
            </div>
            <span class="stage-name">{{ getStageName(stage) }}</span>
          </div>
          <div class="progress-line">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }" />
          </div>
        </div>

        <!-- 关卡结果 -->
        <div v-if="dungeonStore.currentRoom.stageResults?.length" class="stage-results">
          <div
            v-for="result in dungeonStore.currentRoom.stageResults"
            :key="result.stage"
            class="result-card"
            :class="{ success: result.success, failed: !result.success }"
          >
            <div class="result-header">
              <span class="result-stage">{{ result.stageName }}</span>
              <span class="result-status">{{ result.success ? '通过' : '失败' }}</span>
            </div>
            <div class="result-events">
              <p v-for="(event, idx) in result.events" :key="idx" class="result-event">{{ event }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 第二关路径选择 -->
      <div
        v-if="
          dungeonStore.isInProgress &&
          dungeonStore.currentRoom.currentStage === 2 &&
          !dungeonStore.currentRoom.selectedPath &&
          dungeonStore.isLeader
        "
        class="path-selection"
      >
        <h3>
          <Route :size="16" />
          选择道路
        </h3>
        <p class="path-hint">第二关需要选择冰道或火道，选择与队员灵根匹配的道路可获得加成</p>
        <div class="path-buttons">
          <NButton type="info" size="large" :loading="dungeonStore.actionLoading" @click="handleSelectPath('ice')">
            <template #icon>
              <Snowflake :size="18" />
            </template>
            冰之道
          </NButton>
          <NButton type="warning" size="large" :loading="dungeonStore.actionLoading" @click="handleSelectPath('fire')">
            <template #icon>
              <Flame :size="18" />
            </template>
            火之道
          </NButton>
        </div>
      </div>

      <!-- 奖励展示（完成时显示） -->
      <div v-if="dungeonStore.isCompleted && dungeonStore.currentRoom.rewards" class="rewards-section">
        <h3>
          <Gift :size="16" />
          副本奖励
        </h3>
        <div class="rewards-grid">
          <div class="reward-item">
            <Sparkles :size="20" />
            <span>修为 +{{ formatNumber(dungeonStore.currentRoom.rewards.exp) }}</span>
          </div>
          <div class="reward-item">
            <Award :size="20" />
            <span>宗门贡献 +{{ dungeonStore.currentRoom.rewards.sectContribution }}</span>
          </div>
          <div v-if="dungeonStore.currentRoom.rewards.xutianDingFragment" class="reward-item legendary">
            <Hexagon :size="20" />
            <span>虚天鼎残片 x1</span>
          </div>
          <div v-for="item in dungeonStore.currentRoom.rewards.items" :key="item.itemId" class="reward-item">
            <Package :size="20" />
            <span>{{ item.name }} x{{ item.quantity }}</span>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <!-- 等待中 -->
        <template v-if="dungeonStore.currentRoom.status === 'waiting'">
          <NButton
            v-if="dungeonStore.isLeader"
            type="primary"
            size="large"
            :disabled="!dungeonStore.canStart"
            :loading="dungeonStore.actionLoading"
            @click="handleStart"
          >
            <template #icon>
              <Play :size="18" />
            </template>
            开始副本
          </NButton>
          <NButton v-if="dungeonStore.isLeader" type="error" size="large" :loading="dungeonStore.actionLoading" @click="handleDisband">
            解散房间
          </NButton>
          <NButton v-else type="default" size="large" :loading="dungeonStore.actionLoading" @click="handleLeave">离开房间</NButton>
        </template>

        <!-- 进行中 -->
        <template v-else-if="dungeonStore.isInProgress">
          <NButton
            v-if="dungeonStore.isLeader && canAdvance"
            type="primary"
            size="large"
            :loading="dungeonStore.actionLoading"
            @click="handleNextStage"
          >
            <template #icon>
              <ChevronRight :size="18" />
            </template>
            {{ dungeonStore.currentRoom.currentStage < 3 ? '进入下一关' : '挑战Boss' }}
          </NButton>
        </template>

        <!-- 完成/失败 -->
        <template v-else-if="dungeonStore.isCompleted">
          <NButton type="primary" size="large" @click="handleLeave">离开副本</NButton>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useDungeonStore, DUNGEON_ROLES, type DungeonRole, type DungeonMember } from '@/stores/dungeon'
  import { NButton, useMessage, useDialog } from 'naive-ui'
  import {
    Ghost,
    Users,
    Crown,
    UserPlus,
    X,
    Swords,
    Check,
    Route,
    Snowflake,
    Flame,
    Gift,
    Sparkles,
    Award,
    Hexagon,
    Package,
    Play,
    ChevronRight
  } from 'lucide-vue-next'

  const dungeonStore = useDungeonStore()
  const message = useMessage()
  const dialog = useDialog()

  // 状态文本
  const statusText = computed(() => {
    const status = dungeonStore.currentRoom?.status
    switch (status) {
      case 'waiting':
        return '等待中'
      case 'in_progress':
        return '进行中'
      case 'completed':
        return '已通关'
      case 'failed':
        return '已失败'
      case 'disbanded':
        return '已解散'
      default:
        return '未知'
    }
  })

  // 队伍成员（填充空位）
  const teamMembers = computed(() => {
    const members = dungeonStore.currentRoom?.members || []
    const result: (DungeonMember | null)[] = [...members]
    while (result.length < 5) {
      result.push(null)
    }
    return result
  })

  // 进度百分比
  const progressPercent = computed(() => {
    const room = dungeonStore.currentRoom
    if (!room) return 0
    const completedStages = room.stageResults?.filter(r => r.success).length || 0
    return (completedStages / 3) * 100
  })

  // 是否可以推进
  const canAdvance = computed(() => {
    const room = dungeonStore.currentRoom
    if (!room || room.status !== 'in_progress') return false
    // 第二关需要先选择路径
    if (room.currentStage === 2 && !room.selectedPath) return false
    return true
  })

  // 获取职业名称
  const getRoleName = (role: DungeonRole) => {
    return DUNGEON_ROLES[role]?.name || '未知'
  }

  // 获取职业颜色
  const getRoleColor = (role: DungeonRole) => {
    return DUNGEON_ROLES[role]?.color || '#888'
  }

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万'
    }
    return num.toLocaleString()
  }

  // 获取关卡名称
  const getStageName = (stage: number) => {
    switch (stage) {
      case 1:
        return '灵渊之地'
      case 2:
        return '冰火之路'
      case 3:
        return '决战蛮胡子'
      default:
        return `第${stage}关`
    }
  }

  // 关卡是否完成
  const isStageCompleted = (stage: number) => {
    const results = dungeonStore.currentRoom?.stageResults || []
    return results.some(r => r.stage === stage && r.success)
  }

  // 关卡是否失败
  const isStageFailed = (stage: number) => {
    const results = dungeonStore.currentRoom?.stageResults || []
    return results.some(r => r.stage === stage && !r.success)
  }

  // 踢出成员
  const handleKick = async (characterId: string) => {
    dialog.warning({
      title: '踢出成员',
      content: '确定要将该成员踢出房间吗？',
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          await dungeonStore.kickMember(characterId)
          message.success('已踢出成员')
        } catch (error) {
          message.error((error as Error).message || '操作失败')
        }
      }
    })
  }

  // 开始副本
  const handleStart = async () => {
    try {
      await dungeonStore.startDungeon()
      message.success('副本开始！')
    } catch (error) {
      message.error((error as Error).message || '开始失败')
    }
  }

  // 选择路径
  const handleSelectPath = async (path: 'ice' | 'fire') => {
    try {
      await dungeonStore.selectPath(path)
      message.success(`已选择${path === 'ice' ? '冰' : '火'}之道`)
    } catch (error) {
      message.error((error as Error).message || '选择失败')
    }
  }

  // 推进下一关
  const handleNextStage = async () => {
    try {
      const result = await dungeonStore.nextStage()
      if (result?.stageResult?.success) {
        message.success('闯关成功！')
      } else {
        message.error('闯关失败...')
      }
    } catch (error) {
      message.error((error as Error).message || '操作失败')
    }
  }

  // 离开房间
  const handleLeave = async () => {
    try {
      await dungeonStore.leaveRoom()
      message.success('已离开房间')
    } catch (error) {
      message.error((error as Error).message || '离开失败')
    }
  }

  // 解散房间
  const handleDisband = async () => {
    dialog.warning({
      title: '解散房间',
      content: '确定要解散房间吗？所有成员都会被移出。',
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          await dungeonStore.disbandRoom()
          message.success('房间已解散')
        } catch (error) {
          message.error((error as Error).message || '解散失败')
        }
      }
    })
  }
</script>

<style scoped>
  .room-detail-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .no-room {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    color: var(--text-muted);
  }

  .no-room p {
    margin-top: 16px;
  }

  /* 房间头部 */
  .room-header-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 16px;
  }

  .room-title {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .room-title h2 {
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-primary);
  }

  .room-status {
    font-size: 0.75rem;
    padding: 4px 8px;
    border-radius: 4px;
    background: #52c41a20;
    color: #52c41a;
  }

  .room-status.in_progress {
    background: #1890ff20;
    color: #1890ff;
  }

  .room-status.completed {
    background: #52c41a20;
    color: #52c41a;
  }

  .room-status.failed {
    background: #f5222d20;
    color: #f5222d;
  }

  .room-meta {
    display: flex;
    gap: 16px;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  /* 队伍成员 */
  .team-section {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 16px;
  }

  .team-section h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 16px;
    color: var(--text-primary);
  }

  .team-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .member-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px;
    position: relative;
    min-height: 100px;
  }

  .member-card.empty {
    border-style: dashed;
  }

  .member-card.leader {
    border-color: #faad14;
  }

  .member-role {
    font-size: 0.7rem;
    font-weight: 700;
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    display: inline-block;
    margin-bottom: 8px;
  }

  .member-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .member-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .leader-icon {
    color: #faad14;
  }

  .member-realm,
  .member-power {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .kick-btn {
    position: absolute;
    top: 8px;
    right: 8px;
  }

  .empty-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
    gap: 8px;
  }

  .empty-slot span {
    font-size: 0.8rem;
  }

  /* 职业说明 */
  .role-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border-color);
  }

  .role-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .role-badge {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 700;
    color: white;
  }

  .role-name {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  /* 副本进度 */
  .progress-section {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 16px;
  }

  .progress-section h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 16px;
    color: var(--text-primary);
  }

  .stage-progress {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    padding: 0 20px;
    margin-bottom: 16px;
  }

  .progress-line {
    position: absolute;
    top: 20px;
    left: 40px;
    right: 40px;
    height: 4px;
    background: var(--border-color);
    border-radius: 2px;
    z-index: 0;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #52c41a, #1890ff);
    border-radius: 2px;
    transition: width 0.5s ease;
  }

  .stage-node {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    z-index: 1;
  }

  .stage-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--bg-secondary);
    border: 2px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-muted);
    transition: all 0.3s;
  }

  .stage-node.current .stage-icon {
    border-color: #1890ff;
    color: #1890ff;
    animation: pulse 2s ease-in-out infinite;
  }

  .stage-node.completed .stage-icon {
    background: #52c41a;
    border-color: #52c41a;
    color: white;
  }

  .stage-node.failed .stage-icon {
    background: #f5222d;
    border-color: #f5222d;
    color: white;
  }

  @keyframes pulse {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(24, 144, 255, 0.4);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(24, 144, 255, 0);
    }
  }

  .stage-name {
    font-size: 0.75rem;
    color: var(--text-muted);
    white-space: nowrap;
  }

  /* 关卡结果 */
  .stage-results {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .result-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px;
  }

  .result-card.success {
    border-left: 3px solid #52c41a;
  }

  .result-card.failed {
    border-left: 3px solid #f5222d;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .result-stage {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .result-status {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .result-card.success .result-status {
    background: #52c41a20;
    color: #52c41a;
  }

  .result-card.failed .result-status {
    background: #f5222d20;
    color: #f5222d;
  }

  .result-events {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .result-event {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
  }

  .result-event:first-child {
    font-weight: 600;
    color: var(--text-primary);
  }

  /* 路径选择 */
  .path-selection {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 16px;
  }

  .path-selection h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 8px;
    color: var(--text-primary);
  }

  .path-hint {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin: 0 0 16px;
  }

  .path-buttons {
    display: flex;
    gap: 12px;
  }

  /* 奖励展示 */
  .rewards-section {
    background: linear-gradient(135deg, rgba(250, 173, 20, 0.1) 0%, rgba(250, 173, 20, 0.02) 100%);
    border: 1px solid rgba(250, 173, 20, 0.3);
    border-radius: 12px;
    padding: 16px;
  }

  .rewards-section h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 16px;
    color: #faad14;
  }

  .rewards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }

  .reward-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 10px;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .reward-item.legendary {
    border-color: #faad14;
    color: #faad14;
  }

  /* 操作按钮 */
  .action-buttons {
    display: flex;
    gap: 12px;
    justify-content: center;
    padding-top: 8px;
  }
</style>
