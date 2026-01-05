<template>
  <div class="social-panel">
    <!-- 拜访洞府 -->
    <div class="visit-section">
      <h4 class="section-title">
        <Search :size="16" />
        拜访洞府
      </h4>
      <div class="visit-input">
        <NInput v-model:value="targetName" placeholder="输入道号" @keyup.enter="handleVisit" />
        <NButton type="primary" :loading="visiting" :disabled="!targetName.trim()" @click="handleVisit">拜访</NButton>
      </div>
    </div>

    <!-- 留言板 -->
    <div class="messages-section">
      <h4 class="section-title">
        <MessageSquare :size="16" />
        留言板
        <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
      </h4>

      <div v-if="loadingMessages" class="loading-messages">
        <Loader :size="20" class="spinning" />
      </div>
      <div v-else-if="messages.length === 0" class="no-messages">暂无留言</div>
      <div v-else class="messages-list">
        <div v-for="msg in messages" :key="msg.id" class="message-item" :class="{ unread: !msg.isRead }" @click="handleMarkRead(msg)">
          <div class="message-header">
            <span class="message-from">{{ msg.visitorName }}</span>
            <span class="message-time">{{ formatDate(msg.createdAt) }}</span>
          </div>
          <p class="message-content">{{ msg.content }}</p>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="messagesTotal > 10" class="pagination">
        <NButton size="small" :disabled="currentPage <= 1" @click="loadMessages(currentPage - 1)">上一页</NButton>
        <span class="page-info">{{ currentPage }} / {{ Math.ceil(messagesTotal / 10) }}</span>
        <NButton size="small" :disabled="currentPage >= Math.ceil(messagesTotal / 10)" @click="loadMessages(currentPage + 1)">
          下一页
        </NButton>
      </div>
    </div>

    <!-- 拜访结果弹窗 -->
    <NModal v-model:show="showVisitModal" preset="card" style="width: 90%; max-width: 450px">
      <template #header>
        <div class="modal-header">
          <Mountain :size="18" />
          <span>{{ visitResult?.ownerName }} 的洞府</span>
        </div>
      </template>
      <div class="visit-result-content">
        <!-- 洞府等级 -->
        <div class="visit-levels">
          <div class="level-item">
            <Zap :size="16" />
            <span>灵脉 Lv.{{ visitResult?.spiritVeinLevel }}</span>
          </div>
          <div class="level-item">
            <Sparkles :size="16" />
            <span>静室 Lv.{{ visitResult?.meditationChamberLevel }}</span>
          </div>
        </div>

        <!-- 展示的景观 -->
        <div v-if="visitResult?.displayedSceneries?.length" class="visit-sceneries">
          <h4>洞天绘卷</h4>
          <div class="scenery-tags">
            <span v-for="scenery in visitResult.displayedSceneries" :key="scenery.id" class="scenery-tag">
              {{ scenery.name }}
            </span>
          </div>
        </div>

        <!-- 万宝阁 -->
        <div v-if="visitResult?.treasureDisplay?.length" class="visit-treasures">
          <h4>万宝阁</h4>
          <div class="treasure-list">
            <div v-for="treasure in visitResult.treasureDisplay" :key="treasure.slot" class="treasure-item">
              <Package :size="14" />
              <span>{{ treasure.itemName }}</span>
            </div>
          </div>
        </div>

        <!-- 留言 -->
        <div class="leave-message">
          <h4>留下足迹</h4>
          <NInput v-model:value="messageContent" type="textarea" placeholder="写下你的留言..." :maxlength="100" show-count />
          <NButton type="primary" :loading="sendingMessage" :disabled="!messageContent.trim()" @click="handleLeaveMessage">留言</NButton>
        </div>

        <!-- 统计 -->
        <div class="visit-stats">
          <span class="stat-item">
            <Users :size="14" />
            {{ visitResult?.stats?.totalPlayerVisits || 0 }} 次拜访
          </span>
          <span class="stat-item">
            <MessageSquare :size="14" />
            {{ visitResult?.stats?.totalGuestMessages || 0 }} 条留言
          </span>
        </div>
      </div>
    </NModal>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useCaveStore, type CaveVisitResult, type GuestMessage } from '@/stores/cave'
  import { NInput, NButton, NModal, useMessage } from 'naive-ui'
  import { Search, MessageSquare, Loader, Mountain, Zap, Sparkles, Package, Users } from 'lucide-vue-next'

  const caveStore = useCaveStore()
  const message = useMessage()

  const targetName = ref('')
  const visiting = ref(false)
  const showVisitModal = ref(false)
  const visitResult = ref<CaveVisitResult | null>(null)
  const messageContent = ref('')
  const sendingMessage = ref(false)
  const loadingMessages = ref(false)
  const currentPage = ref(1)

  const messages = computed(() => caveStore.messages)
  const messagesTotal = computed(() => caveStore.messagesTotal)
  const unreadCount = computed(() => caveStore.unreadMessagesCount)

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const loadMessages = async (page: number) => {
    loadingMessages.value = true
    currentPage.value = page
    try {
      await caveStore.fetchMessages(page)
    } finally {
      loadingMessages.value = false
    }
  }

  const handleVisit = async () => {
    if (!targetName.value.trim()) return

    visiting.value = true
    try {
      const result = await caveStore.visitCave(targetName.value.trim())
      visitResult.value = result
      messageContent.value = ''
      showVisitModal.value = true
    } catch (error) {
      message.error((error as Error).message || '拜访失败')
    } finally {
      visiting.value = false
    }
  }

  const handleLeaveMessage = async () => {
    if (!messageContent.value.trim() || !visitResult.value) return

    sendingMessage.value = true
    try {
      await caveStore.leaveMessage(visitResult.value.ownerName, messageContent.value.trim())
      message.success('留言成功')
      messageContent.value = ''
    } catch (error) {
      message.error((error as Error).message || '留言失败')
    } finally {
      sendingMessage.value = false
    }
  }

  const handleMarkRead = async (msg: GuestMessage) => {
    if (!msg.isRead) {
      await caveStore.markMessageRead(msg.id)
    }
  }

  onMounted(() => {
    loadMessages(1)
  })
</script>

<style scoped>
  .social-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 16px;
    font-size: 0.95rem;
    color: var(--text-primary);
  }

  .unread-badge {
    background: #f5222d;
    color: white;
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 10px;
    margin-left: 4px;
  }

  .visit-section {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 16px;
  }

  .visit-input {
    display: flex;
    gap: 10px;
  }

  .visit-input .n-input {
    flex: 1;
  }

  .messages-section {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 16px;
  }

  .loading-messages,
  .no-messages {
    text-align: center;
    padding: 24px;
    color: var(--text-muted);
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

  .messages-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .message-item {
    padding: 14px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .message-item:hover {
    border-color: #8a6db7;
  }

  .message-item.unread {
    border-left: 3px solid #8a6db7;
    background: rgba(138, 109, 183, 0.05);
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .message-from {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  .message-time {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .message-content {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.4;
    word-break: break-all;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 16px;
  }

  .page-info {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  /* 拜访结果弹窗 */
  .modal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #8a6db7;
  }

  .visit-result-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .visit-levels {
    display: flex;
    gap: 20px;
    padding: 14px;
    background: var(--bg-secondary);
    border-radius: 10px;
  }

  .level-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    color: #8a6db7;
  }

  .visit-sceneries,
  .visit-treasures {
    padding: 14px;
    background: var(--bg-secondary);
    border-radius: 10px;
  }

  .visit-sceneries h4,
  .visit-treasures h4,
  .leave-message h4 {
    margin: 0 0 12px;
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  .scenery-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .scenery-tag {
    padding: 4px 10px;
    background: rgba(138, 109, 183, 0.15);
    border-radius: 4px;
    font-size: 0.8rem;
    color: #8a6db7;
  }

  .treasure-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .treasure-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: var(--color-gold);
  }

  .leave-message {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .leave-message .n-button {
    align-self: flex-end;
  }

  .visit-stats {
    display: flex;
    justify-content: center;
    gap: 20px;
    padding-top: 12px;
    border-top: 1px solid var(--border-color);
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: var(--text-muted);
  }
</style>
