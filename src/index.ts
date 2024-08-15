import { Context, Hono, Next } from 'hono'
import { cors } from 'hono/cors'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

type Bindings = {
  DB: D1Database
}

type Variables = {
  clientId: string
}

const todoSchema = z.object({
  id: z.number(),
  title: z.string(),
  completed: z.union([z.boolean(), z.number().transform((n) => n === 1)]),
  created_at: z.string(),
  client_id: z.string(),
})

type Todo = z.infer<typeof todoSchema>

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use('/*', cors())

// クライアント ID を生成または検証するミドルウェアを追加
app.use('/*', (c: Context, next: Next) => {
  let clientId = c.req.header('X-Client-ID')
  if (!clientId) {
    clientId = uuidv4()
    c.header('X-Client-ID', clientId)
  }
  c.set('clientId', clientId)
  return next()
})

// Todo 一覧の取得
app.get('/todos', async (c) => {
  const clientId = c.get('clientId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM todos WHERE client_id = ? ORDER BY created_at DESC'
  )
    .bind(clientId)
    .all()

  return c.json(results.map((todo) => todoSchema.parse(todo)))
})

// Todo 1 件の作成
app.post(
  '/todos',
  zValidator('json', z.object({ title: z.string() })),
  async (c) => {
    const { title } = c.req.valid('json')
    const clientId = c.get('clientId')
    const { results } = await c.env.DB.prepare(
      'INSERT INTO todos (title, completed, created_at, client_id) VALUES (?, 0, datetime("now"), ?) RETURNING *'
    )
      .bind(title, clientId)
      .run()
    const todo = todoSchema.parse(results[0])
    return c.json(todo)
  }
)

// Todo N 件の更新
app.patch(
  '/todos',
  zValidator(
    'json',
    z.array(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        completed: z.boolean().optional(),
      })
    )
  ),
  async (c) => {
    const updates = c.req.valid('json')
    const clientId = c.get('clientId')
    const results: Todo[] = []

    for (const update of updates) {
      const { id, title, completed } = update
      const { results: updatedTodo } = await c.env.DB.prepare(
        'UPDATE todos SET title = COALESCE(?, title), completed = COALESCE(?, completed) WHERE id = ? AND client_id = ? RETURNING *'
      )
        .bind(
          title,
          completed === undefined ? undefined : completed ? 1 : 0,
          id,
          clientId
        )
        .run()
      if (updatedTodo.length > 0) {
        results.push(todoSchema.parse(updatedTodo[0]))
      }
    }

    return c.json(results)
  }
)

// Todo N 件の削除
app.delete(
  '/todos',
  zValidator('json', z.object({ ids: z.array(z.number()) })),
  async (c) => {
    const { ids } = c.req.valid('json')
    const clientId = c.get('clientId')
    const placeholders = ids.map(() => '?').join(',')
    const { results } = await c.env.DB.prepare(
      `DELETE FROM todos WHERE id IN (${placeholders}) AND client_id = ? RETURNING *`
    )
      .bind(...ids, clientId)
      .run()
    return c.json(results.map((todo) => todoSchema.parse(todo)))
  }
)

export default app
