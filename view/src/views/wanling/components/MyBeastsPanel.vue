<template>
  <div class="my-beasts-panel">
    <!-- 灵兽列表 -->
    <n-space vertical :size="12">
      <!-- 空状态 -->
      <n-empty v-if="beasts.length === 0" description="暂无灵兽，快去寻觅吧！">
        <template #extra>
          <n-button type="primary" @click="$emit('search')">寻觅灵兽</n-button>
        </template>
      </n-empty>

      <!-- 灵兽卡片列表 -->
      <n-grid v-else :cols="1" :x-gap="12" :y-gap="12">
        <n-gi v-for="beast in beasts" :key="beast.id">
          <n-card size="small" hoverable>
            <div class="beast-card">
              <!-- 左侧信息 -->
              <div class="beast-info">
                <div class="beast-header">
                  <n-tag :color="{ color: getRarityConfig(beast.rarity).color, textColor: '#fff' }" size="small">
                    {{ getRarityConfig(beast.rarity).name }}
                  </n-tag>
                  <span class="beast-name">{{ beast.customName || beast.name }}</span>
                  <span class="beast-level">Lv.{{ beast.level }}</span>
                  <n-tag v-if="beast.status === 'deployed'" type="success" size="small">出战中</n-tag>
                  <n-tag v-if="beast.status === 'injured'" type="error" size="small">受伤</n-tag>
                  <n-tag v-if="beast.status === 'resting'" type="info" size="small">休息中</n-tag>
                </div>

                <!-- 属性 -->
                <div class="beast-stats">
                  <span>攻击: {{ beast.stats.attack }}</span>
                  <span>防御: {{ beast.stats.defense }}</span>
                  <span>速度: {{ beast.stats.speed }}</span>
                  <span>HP: {{ beast.stats.currentHp }}/{{ beast.stats.hp }}</span>
                </div>

                <!-- 进度条 -->
                <div class="beast-bars">
                  <div class="bar-item">
                    <span class="bar-label">经验</span>
                    <n-progress
                      type="line"
                      :percentage="Math.floor((beast.exp / beast.expToNextLevel) * 100)"
                      :show-indicator="false"
                      status="success"
                    />
                    <span class="bar-value">{{ beast.exp }}/{{ beast.expToNextLevel }}</span>
                  </div>
                  <div class="bar-item">
                    <span class="bar-label">饱食</span>
                    <n-progress
                      type="line"
                      :percentage="beast.satiety"
                      :show-indicator="false"
                      :status="beast.satiety < 30 ? 'error' : 'info'"
                    />
                    <span class="bar-value">{{ beast.satiety }}%</span>
                  </div>
                  <div class="bar-item">
                    <span class="bar-label">忠诚</span>
                    <n-progress type="line" :percentage="beast.loyalty" :show-indicator="false" :status="getLoyaltyStatus(beast.loyalty)" />
                    <span class="bar-value">{{ getLoyaltyLevel(beast.loyalty).name }}</span>
                  </div>
                </div>
              </div>

              <!-- 右侧操作 -->
              <div class="beast-actions">
                <n-button-group vertical size="small">
                  <n-button
                    v-if="beast.status === 'idle' || beast.status === 'resting'"
                    type="primary"
                    @click="handleDeploy(beast.id)"
                    :loading="loading"
                  >
                    出战
                  </n-button>
                  <n-button v-if="beast.status === 'deployed'" type="warning" @click="handleRecall(beast.id)" :loading="loading">
                    收回
                  </n-button>
                  <n-button @click="openFeedModal(beast)">喂养</n-button>
                  <n-button @click="openRenameModal(beast)">改名</n-button>
                  <n-button v-if="beast.canEvolve" type="success" @click="handleEvolve(beast.id)" :loading="loading">进化</n-button>
                  <n-button type="error" @click="handleRelease(beast)" :loading="loading" :disabled="beast.status === 'deployed'">
                    放生
                  </n-button>
                </n-button-group>
              </div>
            </div>
          </n-card>
        </n-gi>
      </n-grid>
    </n-space>

    <!-- 喂养弹窗 -->
    <n-modal v-model:show="showFeedModal" preset="dialog" title="喂养灵兽">
      <n-space vertical :size="12">
        <div v-if="selectedBeast">正在喂养: {{ selectedBeast.customName || selectedBeast.name }}</div>
        <n-radio-group v-model:value="selectedFood">
          <n-space vertical>
            <n-radio v-for="(food, id) in BEAST_FOODS" :key="id" :value="id">
              {{ food.name }} (经验+{{ food.expGain }}, {{ food.cost }}灵石)
            </n-radio>
          </n-space>
        </n-radio-group>
      </n-space>
      <template #action>
        <n-button @click="showFeedModal = false">取消</n-button>
        <n-button type="primary" @click="handleFeed" :loading="loading">确认喂养</n-button>
      </template>
    </n-modal>

    <!-- 改名弹窗 -->
    <n-modal v-model:show="showRenameModal" preset="dialog" title="灵兽改名">
      <n-space vertical :size="12">
        <div v-if="selectedBeast">原名: {{ selectedBeast.name }}</div>
        <n-input v-model:value="newBeastName" placeholder="请输入新名字（最多10字）" maxlength="10" />
      </n-space>
      <template #action>
        <n-button @click="showRenameModal = false">取消</n-button>
        <n-button type="primary" @click="handleRename" :loading="loading">确认改名</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useWanlingStore, BEAST_FOODS, type SpiritBeastInfo } from '@/stores/wanling'
  import { extractErrorMessage } from '@/api'
  import { useMessage, useDialog } from 'naive-ui'

  defineEmits(['search'])

  const message = useMessage()
  const dialog = useDialog()
  const wanlingStore = useWanlingStore()
  const { beasts, loading } = storeToRefs(wanlingStore)

  // 喂养弹窗
  const showFeedModal = ref(false)
  const selectedBeast = ref<SpiritBeastInfo | null>(null)
  const selectedFood = ref('food_spirit_grass')

  // 改名弹窗
  const showRenameModal = ref(false)
  const newBeastName = ref('')

  // 获取稀有度配置
  const getRarityConfig = wanlingStore.getRarityConfig

  // 获取忠诚度等级
  const getLoyaltyLevel = wanlingStore.getLoyaltyLevel

  // 获取忠诚度状态
  const getLoyaltyStatus = (loyalty: number): 'success' | 'warning' | 'error' | 'info' => {
    if (loyalty >= 80) return 'success'
    if (loyalty >= 60) return 'info'
    if (loyalty >= 40) return 'warning'
    return 'error'
  }

  // 打开喂养弹窗
  const openFeedModal = (beast: SpiritBeastInfo) => {
    selectedBeast.value = beast
    selectedFood.value = 'food_spirit_grass'
    showFeedModal.value = true
  }

  // 打开改名弹窗
  const openRenameModal = (beast: SpiritBeastInfo) => {
    selectedBeast.value = beast
    newBeastName.value = beast.customName || ''
    showRenameModal.value = true
  }

  // 出战灵兽
  const handleDeploy = async (beastId: string) => {
    try {
      await wanlingStore.deployBeast(beastId)
      message.success('灵兽已出战')
    } catch (error) {
      message.error(extractErrorMessage(error, '出战失败'))
    }
  }

  // 收回灵兽
  const handleRecall = async (beastId: string) => {
    try {
      await wanlingStore.recallBeast(beastId)
      message.success('灵兽已收回')
    } catch (error) {
      message.error(extractErrorMessage(error, '收回失败'))
    }
  }

  // 喂养灵兽
  const handleFeed = async () => {
    if (!selectedBeast.value) return

    try {
      const result = await wanlingStore.feedBeast(selectedBeast.value.id, selectedFood.value)
      showFeedModal.value = false
      if (result.levelUp) {
        message.success(`${result.message}`)
      } else {
        message.success(`喂养成功！经验+${result.expGain}`)
      }
    } catch (error) {
      message.error(extractErrorMessage(error, '喂养失败'))
    }
  }

  // 改名灵兽
  const handleRename = async () => {
    if (!selectedBeast.value || !newBeastName.value.trim()) return

    try {
      await wanlingStore.renameBeast(selectedBeast.value.id, newBeastName.value.trim())
      showRenameModal.value = false
      message.success('改名成功')
    } catch (error) {
      message.error(extractErrorMessage(error, '改名失败'))
    }
  }

  // 进化灵兽
  const handleEvolve = async (beastId: string) => {
    try {
      const result = await wanlingStore.evolveBeast(beastId)
      message.success(result.message)
    } catch (error) {
      message.error(extractErrorMessage(error, '进化失败'))
    }
  }

  // 放生灵兽
  const handleRelease = (beast: SpiritBeastInfo) => {
    dialog.warning({
      title: '确认放生',
      content: `确定要放生【${beast.customName || beast.name}】吗？此操作不可撤销！`,
      positiveText: '确认',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          const result = await wanlingStore.releaseBeast(beast.id)
          message.success(result.message)
        } catch (error) {
          message.error(extractErrorMessage(error, '放生失败'))
        }
      }
    })
  }
</script>

<style scoped>
  .my-beasts-panel {
    padding: 4px 0;
  }

  /* 空状态 */
  .my-beasts-panel :deep(.n-empty) {
    padding: 40px 20px;
    background: linear-gradient(135deg, rgba(8, 145, 178, 0.05) 0%, rgba(6, 182, 212, 0.02) 100%);
    border: 1px dashed rgba(8, 145, 178, 0.3);
    border-radius: 12px;
  }

  /* 灵兽卡片 */
  .my-beasts-panel :deep(.n-card) {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    transition: all 0.3s ease;
  }

  .my-beasts-panel :deep(.n-card:hover) {
    border-color: rgba(8, 145, 178, 0.4);
    box-shadow: 0 4px 16px rgba(8, 145, 178, 0.15);
  }

  .beast-card {
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }

  .beast-info {
    flex: 1;
    min-width: 0;
  }

  .beast-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }

  .beast-name {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--text-primary);
    background: linear-gradient(135deg, #0891b2, #22d3ee);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .beast-level {
    color: var(--text-muted);
    font-size: 0.85rem;
    font-weight: 500;
    padding: 2px 8px;
    background: rgba(8, 145, 178, 0.1);
    border-radius: 4px;
  }

  .beast-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 12px;
    padding: 10px 12px;
    background: rgba(8, 145, 178, 0.05);
    border-radius: 8px;
  }

  .beast-stats span {
    font-size: 0.8rem;
    color: var(--text-secondary);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .beast-stats span::before {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .beast-bars {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .bar-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .bar-label {
    width: 36px;
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  .bar-item :deep(.n-progress) {
    flex: 1;
  }

  .bar-item :deep(.n-progress-graph-line-fill) {
    border-radius: 4px;
  }

  .bar-value {
    width: 70px;
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-align: right;
    font-weight: 500;
  }

  .beast-actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .beast-actions :deep(.n-button-group) {
    gap: 4px;
  }

  .beast-actions :deep(.n-button) {
    font-size: 0.8rem;
  }

  /* 响应式 */
  @media (max-width: 540px) {
    .beast-card {
      flex-direction: column;
    }

    .beast-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .beast-actions {
      justify-content: flex-end;
    }

    .beast-actions :deep(.n-button-group) {
      flex-direction: row !important;
      flex-wrap: wrap;
    }
  }
</style>
