import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import {z} from 'zod'
import { knex } from '../database'
import { checkSessionIdExists } from '../middleware/check-session-id-exists'

export async function transactionsRoutes(app: FastifyInstance) {

  app.get('/', {preHandler: [checkSessionIdExists]} , async (request, reply) => {
    const {sessionId} =  request.cookies

    const transactions = await knex('transactions')
      .where('session_id', sessionId)
      .select()

    return {
      transactions
    }
  })

  app.post('/', async (request, reply) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit'])
    })

    // Validate the data coming from the request
    const {amount, title, type} = createTransactionBodySchema.parse(request.body)

    let sessionId =  request.cookies.sessionId

    if(!sessionId){
      sessionId =  randomUUID();

      reply.cookie('sessionId', sessionId, {
        path: '/', // any route can access this cookie Exe.: /transactions, only those routes
        maxAge: 1000 * 60 * 60 * 24 * 7 // milliseconds 7 days
      })
    }

    await knex('transactions').insert({
      id: randomUUID(),
      amount: type === 'credit' ? amount : amount * -1,
      title,
      session_id: sessionId
    })

    return reply.status(201).send()
  })

  app.get('/:id', {preHandler: [checkSessionIdExists]}, async (request) => {
    const {sessionId} =  request.cookies

    const getTransactionParamsSchema = z.object({
      id: z.string().uuid()
    })

    const { id } = getTransactionParamsSchema.parse(request.params)

    const transaction = await knex('transactions')
      .where({
        id,
        session_id: sessionId
      })
      .first()

    return {
      transaction
    }
  })

  app.get('/summary', {preHandler: [checkSessionIdExists]}, async (request) => {
    const {sessionId} =  request.cookies
    
    const summary = await knex('transactions')
      .where('session_id', sessionId)
      .sum('amount',{as: 'amount'})
      .first()

    return {
      summary
    }
  })
}