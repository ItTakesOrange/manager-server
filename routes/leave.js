const router = require('koa-router')()
const Leave = require('../models/leaveSchema')
const Dept = require('../models/deptSchema')
const util = require('../utils/util')

router.prefix('/leave')

router.get('/list', async (ctx) => {
  try {
    const { applyState, type } = ctx.request.query
    const { page, skipIndex } = util.pager(ctx.request.query)
    const authorization = ctx.request.headers.authorization
    let { data } = util.decoded(authorization)
    let params = {}
    if (type === 'approve') {
      if (applyState == 1 || applyState == 2) {
        params.curAuditUserName = data.userName
        params.$or = [{ applyState: 1 }, { applyState: 2 }]
      } else if (applyState > 2) {
        params = { 'auditFlows.userId': data.userId, applyState }
      } else {
        params = { 'auditFlows.userId': data.userId }
      }
    } else {
      params = {
        'applyUser.userId': data.userId
      }
      if (applyState) params.applyState = applyState
    }
    const query = Leave.find(params)
    const list = await query.skip(skipIndex).limit(page.pageSize)
    const total = await Leave.countDocuments(params)
    ctx.body = util.success({
      page: {
        ...page,
        total
      },
      list
    })
  } catch (error) {
    ctx.body = util.fail(`查询失败: ${error.stack}`)
  }
})

router.post('/operate', async (ctx) => {
  try {
    const { _id, action, ...params } = ctx.request.body
    const authorization = ctx.request.headers.authorization
    const { data } = util.decoded(authorization)
    if (action === 'create') {
      // 生成申请单号
      let orderNo = 'XJ'
      orderNo += util.formatDate(new Date(), 'yyyyMMdd')
      const total = await Leave.countDocuments()
      params.orderNo = orderNo + total

      // 获取当前用户的部门id
      let deptId = data.deptId.pop()
      // 查找部门负责人信息
      let dept = await Dept.findById(deptId)
      // 获取人事部门和财务部门负责人信息
      let deptList = await Dept.find({ deptName: { $in: ['人事部门', '财务部门'] } })
      let auditUsers = dept.userName
      let auditFlows = [
        {
          userId: dept.userId,
          userName: dept.userName,
          userEmail: dept.userEmail
        }
      ]
      deptList.forEach(item => {
        auditFlows.push({
          userId: item.userId,
          userName: item.userName,
          userEmail: item.userEmail
        })
        auditUsers += ',' + item.userName
      })
      params.auditUsers = auditUsers
      params.curAuditUserName = dept.userName
      params.auditFlows = auditFlows
      params.auditLogs = []
      params.applyUser = {
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail
      }
      await Leave.create(params)
      ctx.body = util.success('', '创建成功')
    } else if (action === 'delete') {
      await Leave.findByIdAndUpdate(_id, { applyState: 5 })
      ctx.body = util.success('', '删除成功')
    }
  } catch (error) {
    ctx.body = util.fail(`查询失败: ${error.stack}`)
  }
})

router.post('/approve', async (ctx) => {
  try {
    const { _id, action, remark } = ctx.request.body
    const authorization = ctx.request.headers.authorization
    const { data } = util.decoded(authorization)
    let params = {}
    // 1:待审批 2:审批中 3:审批拒绝 4:审批通过 5:作废
    let doc = await Leave.findById(_id)
    let auditLogs = doc.auditLogs || []
    if (action === 'refuse') {
      params.applyState = 3
    } else {
      if (doc.auditFlows.length === doc.auditLogs.length) {
        ctx.body = util.success('', '当前申请单已处理，请勿重复提交')
        return
      } else if (doc.auditFlows.length === doc.auditLogs.length + 1) {
        // 最后一个审批人
        params.applyState = 4
      } else if (doc.auditFlows.length > doc.auditLogs.length) {
        params.applyState = 2
        params.curAuditUserName = doc.auditFlows[doc.auditLogs.length + 1].userName
      }
      auditLogs.push({
        userId: data.userId,
        userName: data.userName,
        createTime: new Date(),
        remark,
        action: action === 'refuse' ? '审批拒绝' : '审批通过'
      })
    }
    params.auditLogs = auditLogs
    await Leave.findByIdAndUpdate(_id, params)
    ctx.body = util.success('', '处理成功')
  } catch (error) {
    ctx.body = util.fail(`查询失败: ${error.stack}`)
  }
})

module.exports = router
