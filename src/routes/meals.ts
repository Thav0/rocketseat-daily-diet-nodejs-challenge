import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import {z} from 'zod'
import { knex } from '../database'
import { checkSessionIdExists } from '../middleware/check-session-id-exists'

export async function mealsRoutes(app: FastifyInstance) {

  app.get('/', {preHandler: [checkSessionIdExists]} , async (request, reply) => {
    const {sessionId} =  request.cookies

    const meals = await knex('meals')
      .where('session_id', sessionId)
      .select()

    return {
      meals
    }
  })

  app.post('/', async (request, reply) => {
    const createMealBodySchema = z.object({
      name: z.string(),
      description: z.string(),
      date_time: z.string().datetime(),
      is_on_diet: z.boolean()
    })

    const {name, description, date_time, is_on_diet} = createMealBodySchema.parse(request.body)

    let sessionId =  request.cookies.sessionId

    if(!sessionId){
      sessionId =  randomUUID();

      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
      })
    }

    await knex('meals').insert({
      id: randomUUID(),
      name,
      description,
      date_time,
      is_on_diet,
      session_id: sessionId
    })

    return reply.status(201).send()
  })

  app.get('/:id', {preHandler: [checkSessionIdExists]}, async (request) => {
    const {sessionId} =  request.cookies

    const getMealParamsSchema = z.object({
      id: z.string().uuid()
    })

    const { id } = getMealParamsSchema.parse(request.params)

    const meal = await knex('meals')
      .where({
        id,
        session_id: sessionId
      })
      .first()

    return {
      meal
    }
  })

  app.put('/:id', {preHandler: [checkSessionIdExists]}, async (request, reply) => {
    const {sessionId} =  request.cookies

    const getMealParamsSchema = z.object({
      id: z.string().uuid()
    })

    const updateMealBodySchema = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      date_time: z.string().datetime().optional(),
      is_on_diet: z.boolean().optional()
    })

    const { id } = getMealParamsSchema.parse(request.params)
    const updateData = updateMealBodySchema.parse(request.body)

    await knex('meals')
      .where({
        id,
        session_id: sessionId
      })
      .update(updateData)

    return reply.status(204).send()
  })

  app.delete('/:id', {preHandler: [checkSessionIdExists]}, async (request, reply) => {
    const {sessionId} =  request.cookies

    const getMealParamsSchema = z.object({
      id: z.string().uuid()
    })

    const { id } = getMealParamsSchema.parse(request.params)

    await knex('meals')
      .where({
        id,
        session_id: sessionId
      })
      .delete()

    return reply.status(204).send()
  })

  app.get('/metrics', {preHandler: [checkSessionIdExists]}, async (request) => {
    const {sessionId} =  request.cookies
    
    const totalMeals = await knex('meals')
      .where('session_id', sessionId)
      .count('id', {as: 'total'})
      .first()

    const mealsOnDiet = await knex('meals')
      .where('session_id', sessionId)
      .where('is_on_diet', true)
      .count('id', {as: 'total'})
      .first()

    const mealsOffDiet = await knex('meals')
      .where('session_id', sessionId)
      .where('is_on_diet', false)
      .count('id', {as: 'total'})
      .first()

    const allMeals = await knex('meals')
      .where('session_id', sessionId)
      .orderBy('date_time', 'desc')
      .select('is_on_diet')

    let bestSequence = 0
    let currentSequence = 0

    for (const meal of allMeals) {
      if (meal.is_on_diet) {
        currentSequence++
        bestSequence = Math.max(bestSequence, currentSequence)
      } else {
        currentSequence = 0
      }
    }

    return {
      totalMeals: Number(totalMeals?.total) || 0,
      mealsOnDiet: Number(mealsOnDiet?.total) || 0,
      mealsOffDiet: Number(mealsOffDiet?.total) || 0,
      bestSequenceOnDiet: bestSequence
    }
  })
}