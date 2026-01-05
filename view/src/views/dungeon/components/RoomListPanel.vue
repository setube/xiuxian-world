<template>
  <div class="room-list-panel">
    <!-- 创建房间按钮 -->
    <div class="create-section">
      <div class="dungeon-intro">
        <div class="intro-icon">
          <Skull :size="32" />
        </div>
        <div class="intro-content">
          <h3>虚天殿·降魔</h3>
          <p>上古秘境虚天殿，蛮胡子道人盘踞于此。需5人金丹期以上修士组队挑战。</p>
          <div class="intro-requirements">
            <span>
              <Users :size="12" />
              5人组队
            </span>
            <span>
              <Star :size="12" />
              金丹初期+
            </span>
            <span>
              <Map :size="12" />
              消耗虚天残图×1
            </span>
          </div>
        </div>
      </div>
      <NButton
        type="primary"
        size="large"
        :disabled="!dungeonStore.canCreateRoom"
        :loading="dungeonStore.actionLoading"
        @click="emit('create')"
      >
        <template #icon>
          <Plus :size="18" />
        </template>
        创建房间
      </NButton>
      <p v-if="dungeonStore.isInRoom" class="cannot-create-reason">你已在房间中</p>
      <p v-else-if="!dungeonStore.status?.xutianMapCount" class="cannot-create-reason">
        需要虚天残图才能创建房间（闭关修炼时有极小概率获得）
      </p>
    </div>

    <!-- 房间列表 -->
    <div class="room-list">
      <div class="list-header">
        <h3>
          <Castle :size="16" />
          可加入的房间
        </h3>
        <NButton quaternary size="small" :loading="refreshing" @click="handleRefresh">
          <template #icon>
            <RefreshCw :size="14" :class="{ spinning: refreshing }" />
          </template>
          刷新
        </NButton>
      </div>

      <div v-if="waitingRooms.length === 0" class="empty-list">
        <Ghost :size="48" />
        <p>暂无可加入的房间</p>
        <span>创建一个房间，召集同道共探秘境</span>
      </div>

      <TransitionGroup name="room" tag="div" class="room-items">
        <div v-for="room in waitingRooms" :key="room.id" class="room-card">
          <div class="room-info">
            <div class="room-header">
              <span class="room-name">{{ room.leaderName }}的队伍</span>
              <span class="room-status" :class="room.status">
                {{ room.status === 'waiting' ? '招募中' : '进行中' }}
              </span>
            </div>
            <div class="room-members">
              <div class="member-slots">
                <div
                  v-for="member in room.members"
                  :key="member.characterId"
                  class="member-slot filled"
                  :title="member.name + ' - ' + getRoleName(member.role)"
                >
                  <div class="slot-role" :style="{ background: getRoleColor(member.role) }">
                    {{ getRoleName(member.role).charAt(0) }}
                  </div>
                </div>
                <div v-for="i in 5 - room.members.length" :key="'empty-' + i" class="member-slot empty">
                  <UserPlus :size="14" />
                </div>
              </div>
              <span class="member-count">{{ room.members.length }}/5</span>
            </div>
          </div>
          <NButton
            type="primary"
            size="small"
            :disabled="dungeonStore.isInRoom || room.members.length >= 5"
            :loading="joiningRoomId === room.id"
            @click="handleJoin(room.id)"
          >
            加入
          </NButton>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useDungeonStore, DUNGEON_ROLES, type DungeonRole } from '@/stores/dungeon'
  import { NButton } from 'naive-ui'
  import { Plus, Castle, RefreshCw, Ghost, Skull, Users, Star, Map, UserPlus } from 'lucide-vue-next'

  const emit = defineEmits<{
    (e: 'join', roomId: string): void
    (e: 'create'): void
  }>()

  const dungeonStore = useDungeonStore()

  const refreshing = ref(false)
  const joiningRoomId = ref<string | null>(null)

  // 等待中的房间
  const waitingRooms = computed(() => {
    return dungeonStore.rooms.filter(room => room.status === 'waiting')
  })

  // 获取职业名称
  const getRoleName = (role: DungeonRole) => {
    return DUNGEON_ROLES[role]?.name || '未知'
  }

  // 获取职业颜色
  const getRoleColor = (role: DungeonRole) => {
    return DUNGEON_ROLES[role]?.color || '#888'
  }

  // 刷新房间列表
  const handleRefresh = async () => {
    refreshing.value = true
    try {
      await dungeonStore.fetchRooms()
    } finally {
      refreshing.value = false
    }
  }

  // 加入房间
  const handleJoin = async (roomId: string) => {
    joiningRoomId.value = roomId
    try {
      emit('join', roomId)
    } finally {
      joiningRoomId.value = null
    }
  }
</script>

<style scoped>
  .room-list-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* 创建房间区域 */
  .create-section {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .dungeon-intro {
    display: flex;
    gap: 16px;
    width: 100%;
  }

  .intro-icon {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(220, 38, 38, 0.05) 100%);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #dc2626;
    flex-shrink: 0;
  }

  .intro-content {
    flex: 1;
  }

  .intro-content h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 8px;
    color: var(--text-primary);
  }

  .intro-content p {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: 0 0 12px;
    line-height: 1.5;
  }

  .intro-requirements {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .intro-requirements span {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: var(--text-muted);
    background: var(--bg-secondary);
    padding: 4px 8px;
    border-radius: 4px;
  }

  .cannot-create-reason {
    font-size: 0.8rem;
    color: #f5222d;
    margin: 0;
  }

  /* 房间列表 */
  .room-list {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 16px;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .list-header h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
    color: var(--text-primary);
  }

  .spinning {
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

  .empty-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: var(--text-muted);
  }

  .empty-list p {
    margin: 16px 0 4px;
    font-size: 0.95rem;
  }

  .empty-list span {
    font-size: 0.8rem;
    opacity: 0.7;
  }

  .room-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .room-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    transition: all 0.2s;
  }

  .room-card:hover {
    border-color: rgba(220, 38, 38, 0.3);
    background: rgba(220, 38, 38, 0.05);
  }

  .room-info {
    flex: 1;
  }

  .room-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .room-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .room-status {
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 4px;
    background: #52c41a20;
    color: #52c41a;
  }

  .room-status.in_progress {
    background: #faad1420;
    color: #faad14;
  }

  .room-members {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .member-slots {
    display: flex;
    gap: 4px;
  }

  .member-slot {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .member-slot.empty {
    background: var(--bg-card);
    border: 1px dashed var(--border-color);
    color: var(--text-muted);
  }

  .member-slot.filled {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
  }

  .slot-role {
    width: 100%;
    height: 100%;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: white;
  }

  .member-count {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  /* 过渡动画 */
  .room-enter-active,
  .room-leave-active {
    transition: all 0.3s ease;
  }

  .room-enter-from {
    opacity: 0;
    transform: translateX(-20px);
  }

  .room-leave-to {
    opacity: 0;
    transform: translateX(20px);
  }
</style>
