const router = require('koa-router')()
const User = require('../models/userSchema')
const Counter = require('../models/counterSchema')
const util = require('../utils/util')
const jwt = require('jsonwebtoken')

router.prefix('/users')

router.post('/login', async (ctx) => {
  try {
    const { userName, userPwd } = ctx.request.body
    /**
     * 返回数据库指定字段，有三种方式
     * 1. 'userId userName userEmail state role deptId roleList'
     * 2. {userId: 1, _id: 0}
     * 3. select('userId)
     */
    const res = await User.findOne({
      userName,
      userPwd
    }, 'userId userName userEmail state role deptId roleList')

    if (res) {
      const data = res._doc
      const token = jwt.sign({
        data
      }, 'manager', { expiresIn: '1h' })

      console.log('token=>', token)

      data.token = token
      ctx.body = util.success(data)
    } else {
      ctx.body = util.fail('账号或密码不正确')
    }
  } catch (error) {
    ctx.body = util.fail(error.msg)
  }
})

router.get('/list', async (ctx) => {
  const { userId, userName, state } = ctx.request.query
  const { page, skipIndex } = util.pager(ctx.request.query)
  let params = {}
  if (userId) params.userId = userId
  if (userName) params.userName = userName
  if (state && state != '0') params.state = state
  try {
    const query = User.find(params, { _id: 0, userPwd: 0 })
    const list = await query.skip(skipIndex).limit(page.pageSize)
    const total = await User.countDocuments(params)

    ctx.body = util.success({
      page: {
        ...page,
        total
      },
      list
    })
  } catch (error) {
    ctx.body = util.fail(`查询异常:${error.stack}`)
  }
})

router.post('/delete', async (ctx) => {
  const { userIds } = ctx.request.body
  // User.updateMany({ $or: [{ userId: 10001 }, { userId: 10002 }] })
  const res = await User.updateMany({ userId: { $in: userIds } }, { state: 2 })
  if (res.nModified) {
    ctx.body = util.success(res, `共删除成功${res.nModified}条`)
    return
  }
  ctx.body = util.fail('删除失败')
})

router.post('/operate', async (ctx) => {
  const { userId, userName, userEmail, mobile, job, state, roleList, deptId, action } = ctx.request.body
  if (action === 'add') {
    // 新增用户
    if (!userName || !userEmail || !deptId) {
      ctx.body = util.fail('参数错误', util.CODE.PARAM_ERROR)
      return
    }
    const res = await User.findOne({ $or: [{ userName }, { userEmail }] }, '_id userName userEmail')
    if (res) {
      ctx.body = util.fail(`有重复的用户，信息如下：${userName} - ${userEmail}`)
    } else {
      const doc = await Counter.findOneAndUpdate({ _id: 'userId' }, { $inc: { sequence_value: 1 } }, { new: true })
      try {
        const user = new User({
          userId: doc.sequence_value,
          userName,
          userPwd: '123456',
          userEmail,
          role: 1, // 默认普通用户
          mobile,
          job,
          state,
          roleList,
          deptId
        })
        user.save()
        ctx.body = util.success('', '用户创建成功')
      } catch (error) {
        ctx.body = util.fail(error.stack, '用户创建失败')
      }
    }
  } else {
    // 更新用户
    if (!deptId) {
      ctx.body = util.fail('部门不能为空', util.CODE.PARAM_ERROR)
      return
    }
    try {
      const res = await User.findOneAndUpdate({ userId }, { mobile, job, state, roleList, deptId })
      ctx.body = util.success({}, '更新成功')
    } catch (error) {
      ctx.body = util.fail(`更新失败${error.stack}`)
    }
  }
})

module.exports = router
