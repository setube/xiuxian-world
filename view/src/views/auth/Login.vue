<template>
  <div class="login-form">
    <h2 class="form-title">登录</h2>

    <n-form>
      <n-form-item>
        <n-input v-model:value="formData.username" placeholder="请输入用户名" size="large">
          <template #prefix>
            <User :size="18" class="input-icon" />
          </template>
        </n-input>
      </n-form-item>

      <n-form-item>
        <n-input
          v-model:value="formData.password"
          type="password"
          placeholder="请输入密码"
          size="large"
          show-password-on="click"
          @keyup.enter="handleLogin"
        >
          <template #prefix>
            <Lock :size="18" class="input-icon" />
          </template>
        </n-input>
      </n-form-item>

      <n-button type="primary" block size="large" :loading="loading" class="submit-btn" @click="handleLogin">进入修仙世界</n-button>
    </n-form>

    <div class="form-footer">
      <span class="footer-text">还没有账号？</span>
      <n-button text type="primary" @click="router.push('/auth/register')">立即注册</n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useMessage } from 'naive-ui'
  import { useAuthStore } from '@/stores/auth'
  import { extractErrorMessage } from '@/api'
  import { User, Lock } from 'lucide-vue-next'

  const router = useRouter()
  const authStore = useAuthStore()

  const formData = ref({
    username: '',
    password: ''
  })
  const loading = ref(false)
  const message = useMessage()

  const handleLogin = async () => {
    if (!formData.value.username || !formData.value.password) {
      message.warning('请填写用户名和密码')
      return
    }

    loading.value = true
    try {
      const result = await authStore.login(formData.value.username, formData.value.password)
      message.success('登录成功，欢迎回到修仙世界')

      if (result.character && result.character.spiritRootId) {
        router.push('/')
      } else {
        // 没有角色或没有灵根，需要进行灵根测试
        router.push('/spirit-root-detection')
      }
    } catch (error: unknown) {
      message.error(extractErrorMessage(error, '登录失败'))
    } finally {
      loading.value = false
    }
  }
</script>

<style scoped>
  .login-form {
    width: 100%;
  }

  .form-title {
    font-size: 1.5rem;
    font-weight: 600;
    text-align: center;
    margin: 0 0 24px;
    color: var(--text-primary);
    letter-spacing: 4px;
  }

  .input-icon {
    color: var(--text-muted);
  }

  .submit-btn {
    margin-top: 8px;
    height: 44px;
    font-size: 1rem;
    letter-spacing: 2px;
  }

  .form-footer {
    margin-top: 20px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .footer-text {
    color: var(--text-secondary);
  }

  :deep(.n-input) {
    --n-border-radius: 4px !important;
    --n-border: 1px solid var(--border-color) !important;
    --n-border-focus: 1px solid var(--color-gold) !important;
    --n-box-shadow-focus: 0 0 0 2px rgba(201, 169, 89, 0.1) !important;
  }

  :deep(.n-form-item) {
    --n-label-text-color: var(--text-secondary) !important;
  }
</style>
