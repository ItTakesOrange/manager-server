const router = require('koa-router')()
const util = require('../utils/util')
const Dept = require('../models/deptSchema')

router.prefix('/dept')

router.get('/list', async (ctx) => {
  let { deptName } = ctx.request.query
  let params = {}
  if (deptName) params.deptName = deptName
  let rootList = await Dept.find(params) || []
  if (deptName) {
    ctx.body = util.success(rootList)
  } else {
    let treeList = getTreeDept(rootList, null, [])
    ctx.body = util.success(treeList, '成功')
  }
})

function getTreeDept(rootList, id, list) {
  for(let i = 0; i < rootList.length; i++) {
    const item = rootList[i]
    if (String(item.parentId.slice().pop()) === String(id)) {
      list.push(item._doc)
    }
  }
  list.forEach(item => {
    item.children = []
    getTreeDept(rootList, item._id, item.children)
    if (item.children.length === 0) {
      delete item.children
    }
  })
  return list
}

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
