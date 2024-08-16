import { zValidator } from '@hono/zod-validator'
import { Context, Hono, Next } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

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

// 仮のサインイン機能として、X-Client-ID (UUID) を発行してヘッダに与える。
app.post('/sign_in', async (c) => {
  let clientId = c.req.header('X-Client-ID')
  if (!clientId) {
    clientId = uuidv4()
  }
  c.header('X-Client-ID', clientId)
  return c.json({ clientId })
})

// 以下のすべてのルートに対してミドルウェアを適用する。
app.use('/*', async (c: Context, next: Next) => {
  const clientId = c.req.header('X-Client-ID')
  if (!clientId) {
    throw new HTTPException(401)
  }
  c.set('clientId', clientId)
  await next()
})

// Todo 一覧を取得する。
app.get('/todos', async (c) => {
  const clientId = c.get('clientId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM todos WHERE client_id = ? ORDER BY created_at DESC'
  )
    .bind(clientId)
    .all()

  return c.json(results.map((todo) => todoSchema.parse(todo)))
})

// Todo 1 件を作成する。
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

// Todo N 件を更新する。
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

// Todo N 件を削除する。
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
