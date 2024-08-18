import { swaggerUI } from '@hono/swagger-ui'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { prettyJSON } from 'hono/pretty-json'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { openApiDoc } from './open-api'

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

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use(prettyJSON())

app.use(cors())

// Swagger UI のエンドポイントを追加する。
app.get('/swagger-ui', swaggerUI({ url: '/openapi.json' }))

// OpenAPI JSON を提供するエンドポイントを追加する。
app.get('/openapi.json', (c) => {
  return c.json(openApiDoc)
})

// 仮のサインイン機能として、X-Client-ID (UUID) を発行する。
app.post('/sign_in', (c) => {
  let clientId = c.req.header('X-Client-ID')
  if (!clientId) {
    clientId = uuidv4()
  }
  return c.json({ clientId })
})

// 以下のすべてのルートに対してミドルウェアを適用する。
app.use((c, next) => {
  const clientId = c.req.header('X-Client-ID')
  if (!clientId) {
    throw new HTTPException(401)
  }
  c.set('clientId', clientId)
  return next()
})

// Todo 一覧を取得する。
app.get('/todos', async (c) => {
  const clientId = c.get('clientId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM todos WHERE client_id = ? ORDER BY created_at DESC'
  )
    .bind(clientId)
    .all()

  return c.json({ todos: results.map((todo) => todoSchema.parse(todo)) })
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

// Todo 1 件を更新する。
app.patch(
  '/todos/:id',
  zValidator(
    'json',
    z.object({
      title: z.string().optional(),
      completed: z.boolean().optional(),
    })
  ),
  async (c) => {
    const id = parseInt(c.req.param('id'))
    const { title, completed } = c.req.valid('json')
    const clientId = c.get('clientId')

    const { results } = await c.env.DB.prepare(
      'UPDATE todos SET title = COALESCE(?, title), completed = COALESCE(?, completed) WHERE id = ? AND client_id = ? RETURNING *'
    )
      .bind(
        title,
        completed === undefined ? undefined : completed ? 1 : 0,
        id,
        clientId
      )
      .run()

    if (results.length === 0) {
      return c.json({ message: 'Todo not found' }, 404)
    }

    const todo = todoSchema.parse(results[0])
    return c.json(todo)
  }
)

// 複数の Todo の完了状態を一括更新する。
app.post(
  '/todos/bulk-complete',
  zValidator(
    'json',
    z.object({
      ids: z.array(z.number()),
      completed: z.boolean(),
    })
  ),
  async (c) => {
    const { ids, completed } = c.req.valid('json')
    const clientId = c.get('clientId')

    // プレースホルダーを生成する。
    const placeholders = ids.map(() => '?').join(',')

    const { results } = await c.env.DB.prepare(
      `UPDATE todos SET completed = ? WHERE id IN (${placeholders}) AND client_id = ? RETURNING *`
    )
      .bind(completed ? 1 : 0, ...ids, clientId)
      .all()

    const updatedTodos = results.map((todo) => todoSchema.parse(todo))

    if (updatedTodos.length === 0) {
      return c.json({ message: 'No todos found or updated' }, 404)
    }

    return c.json({ todos: updatedTodos })
  }
)

// Todo 1 件を削除する。
app.delete('/todos/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const clientId = c.get('clientId')

  const { results } = await c.env.DB.prepare(
    'DELETE FROM todos WHERE id = ? AND client_id = ? RETURNING *'
  )
    .bind(id, clientId)
    .run()

  if (results.length === 0) {
    return c.json({ message: 'Todo not found' }, 404)
  }

  const todo = todoSchema.parse(results[0])
  return c.json(todo)
})

// 複数の Todo をまとめて削除する。
app.post(
  '/todos/bulk-delete',
  zValidator(
    'json',
    z.object({
      ids: z.array(z.number()),
    })
  ),
  async (c) => {
    const { ids } = c.req.valid('json')
    const clientId = c.get('clientId')

    // プレースホルダーを生成する。
    const placeholders = ids.map(() => '?').join(',')

    const { results } = await c.env.DB.prepare(
      `DELETE FROM todos WHERE id IN (${placeholders}) AND client_id = ? RETURNING *`
    )
      .bind(...ids, clientId)
      .all()

    const deletedTodos = results.map((todo) => todoSchema.parse(todo))

    if (deletedTodos.length === 0) {
      return c.json({ message: 'No todos found or deleted' }, 404)
    }

    return c.json({ todos: deletedTodos })
  }
)

export default app
