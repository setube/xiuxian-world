import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'
import router from '@/router'
import { initSocket, disconnectSocket } from '@/services/socket'

interface User {
  id: string
  username: string
  email: string
}

export const useAuthStore = defineStore(
  'auth',
  () => {
    const user = ref<User | null>(null)
    const accessToken = ref<string | null>(null)
    const refreshToken = ref<string | null>(null)

    const isAuthenticated = computed(() => !!accessToken.value)

    const register = async (username: string, email: string, password: string) => {
      const { data } = await authApi.register({ username, email, password })
      user.value = data.user
      accessToken.value = data.tokens.accessToken
      refreshToken.value = data.tokens.refreshToken

      localStorage.setItem('accessToken', data.tokens.accessToken)
      localStorage.setItem('refreshToken', data.tokens.refreshToken)

      // 初始化 Socket 连接
      initSocket()

      return data
    }

    const login = async (username: string, password: string) => {
      const { data } = await authApi.login({ username, password })
      user.value = data.user
      accessToken.value = data.tokens.accessToken
      refreshToken.value = data.tokens.refreshToken

      localStorage.setItem('accessToken', data.tokens.accessToken)
      localStorage.setItem('refreshToken', data.tokens.refreshToken)

      if (data.character) {
        localStorage.setItem('characterId', data.character.id)
        // 保存道号（name就是道号）
        if (data.character.name) {
          localStorage.setItem('daoName', data.character.name)
        }
        if (data.character.spiritRootId) {
          localStorage.setItem('spiritRootId', data.character.spiritRootId)
        }
      }

      // 初始化 Socket 连接
      initSocket()

      return data
    }

    const logout = () => {
      // 断开 Socket 连接
      disconnectSocket()
      user.value = null
      accessToken.value = null
      refreshToken.value = null

      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('characterId')
      localStorage.removeItem('spiritRootId')
      localStorage.removeItem('daoName')

      router.push({ name: 'Login' })
    }

    const initFromStorage = () => {
      accessToken.value = localStorage.getItem('accessToken')
      refreshToken.value = localStorage.getItem('refreshToken')
    }

    return {
      user,
      accessToken,
      refreshToken,
      isAuthenticated,
      register,
      login,
      logout,
      initFromStorage
    }
  },
  {
    persist: true
  }
)
