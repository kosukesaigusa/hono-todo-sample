export const openApiDoc = {
  openapi: '3.0.0',
  info: {
    title: 'Todo API',
    version: '1.0.0',
    description: 'シンプルな Todo アプリケーションの API',
  },
  paths: {
    '/sign_in': {
      post: {
        summary: 'サインイン',
        description: 'クライアント ID を発行または再利用します。',
        parameters: [
          {
            in: 'header',
            name: 'X-Client-ID',
            schema: { type: 'string' },
            required: false,
            description: '既存のクライアント ID（オプション）',
          },
        ],
        responses: {
          '200': {
            description: '成功時のレスポンス',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    clientId: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/todos': {
      get: {
        summary: 'Todo 一覧取得',
        description: '認証されたユーザーの Todo 一覧を取得します。',
        security: [{ clientId: [] }],
        responses: {
          '200': {
            description: '成功時のレスポンス',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    todos: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Todo' },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        summary: 'Todo 作成',
        description: '新しい Todo を作成します。',
        security: [{ clientId: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                },
                required: ['title'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: '成功時のレスポンス',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Todo' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/todos/{id}': {
      patch: {
        summary: 'Todo 更新',
        description: '指定された ID の Todo を更新します。',
        security: [{ clientId: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
            description: '更新する Todo の ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  completed: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: '成功時のレスポンス',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Todo' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': {
            description: 'Todo が見つからない場合',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        summary: 'Todo 削除',
        description: '指定された ID の Todo を削除します。',
        security: [{ clientId: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
            description: '削除する Todo の ID',
          },
        ],
        responses: {
          '200': {
            description: '成功時のレスポンス',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Todo' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': {
            description: 'Todo が見つからない場合',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/todos/bulk-complete': {
      post: {
        summary: '複数の Todo の完了状態を一括更新',
        description: '指定された ID の Todo の完了状態をまとめて更新します。',
        security: [{ clientId: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ids: {
                    type: 'array',
                    items: { type: 'integer' },
                  },
                  completed: { type: 'boolean' },
                },
                required: ['ids', 'completed'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: '成功時のレスポンス',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    todos: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Todo' },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': {
            description: '該当する Todo が見つからない場合',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/todos/bulk-delete': {
      post: {
        summary: '複数の Todo をまとめて削除',
        description: '指定された ID の Todo をまとめて削除します。',
        security: [{ clientId: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ids: {
                    type: 'array',
                    items: { type: 'integer' },
                  },
                },
                required: ['ids'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: '成功時のレスポンス',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    todos: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Todo' },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': {
            description: '該当する Todo が見つからない場合',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Todo: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          completed: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
          client_id: { type: 'string' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: '認証エラー',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example:
                    '認証に失敗しました。有効なクライアント ID を提供してください。',
                },
              },
            },
          },
        },
      },
    },
    securitySchemes: {
      clientId: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Client-ID',
      },
    },
  },
}
