const router = require('koa-router')()
const util = require('../utils/util')
const Dept = require('../models/deptSchema')

router.prefix('/dept')

router.get('/list', async (ctx) => {
  const { deptName } = ctx.request.query
  const params = {}
  if (deptName) params.deptName = deptName
  const rootList = await Dept.find(params) || []
  ctx.body = util.success(rootList, '成功')
})

router.post('/operate', async (ctx) => {
  const { _id, action, ...params } = ctx.request.body
  try {
    let info = ''
    if (action === 'create') {
      await Dept.create(params)
      info = '创建成功'
    } else if (action === 'edit') {
      params.updateTime = new Date()
      await Dept.findByIdAndUpdate(_id, params)
      info = '编辑成功'
    } else if (action === 'delete') {
      await Dept.findByIdAndDelete(_id)
      await Dept.deleteMany({ parentId: { $all: [_id] } })
      info = '删除成功'
    }
    ctx.body = util.success('', info)
  } catch (error) {
    ctx.body = util.fail(error.stack)
  }
})

module.exports = router
