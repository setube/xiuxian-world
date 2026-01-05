/**
 * 虚天殿·降魔 副本路由
 */
import { Router, type IRouter } from 'express'
import { authMiddleware, characterMiddleware } from '../middlewares/auth.middleware'
import * as dungeonController from '../controllers/dungeon.controller'

const router: IRouter = Router()

// 所有路由需要认证和角色
router.use(authMiddleware, characterMiddleware)

// 玩家副本状态
router.get('/status', dungeonController.getPlayerStatus)

// 获取房间列表
router.get('/rooms', dungeonController.getRoomList)

// 获取房间详情
router.get('/rooms/:id', dungeonController.getRoomDetail)

// 创建房间
router.post('/rooms', dungeonController.createRoom)

// 加入房间
router.post('/rooms/:id/join', dungeonController.joinRoom)

// 离开房间
router.post('/rooms/:id/leave', dungeonController.leaveRoom)

// 踢出成员
router.post('/rooms/:id/kick', dungeonController.kickMember)

// 解散房间
router.post('/rooms/:id/disband', dungeonController.disbandRoom)

// 开始副本
router.post('/rooms/:id/start', dungeonController.startDungeon)

// 选择道路（第二关）
router.post('/rooms/:id/path', dungeonController.selectPath)

// 挑战当前关卡 / 推进下一关
router.post('/rooms/:id/challenge', dungeonController.challengeStage)
router.post('/rooms/:id/next', dungeonController.challengeStage)

// 副本历史
router.get('/history', dungeonController.getHistory)

export default router
