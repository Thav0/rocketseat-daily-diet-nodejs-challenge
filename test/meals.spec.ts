import {beforeAll, afterAll, it, describe, expect, beforeEach} from 'vitest'
import {execSync} from 'node:child_process'
import request from 'supertest'
import {app} from '../src/app'

describe('Meals routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async() => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  it('should be able to create a new meal', async () => {
    await request(app.server)
      .post('/meals')
      .send({
        name: 'Breakfast',
        description: 'Healthy breakfast with fruits',
        date_time: '2025-09-02T08:00:00.000Z',
        is_on_diet: true,
      })
      .expect(201)
  })

  it('should be able to list all meals', async () => {
    const createMealResponse = await request(app.server)
      .post('/meals')
      .send({
        name: 'Breakfast',
        description: 'Healthy breakfast with fruits',
        date_time: '2025-09-02T08:00:00.000Z',
        is_on_diet: true,
      });

    const cookies = createMealResponse.get('Set-Cookie');

    const listMealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200)

      expect(listMealsResponse.body.meals).toEqual([
        expect.objectContaining({
            name: 'Breakfast',
            description: 'Healthy breakfast with fruits',
            is_on_diet: 1,
        })
      ])
  })

  it('should be able to get a specific meal', async () => {
    const createMealResponse = await request(app.server)
      .post('/meals')
      .send({
        name: 'Breakfast',
        description: 'Healthy breakfast with fruits',
        date_time: '2025-09-02T08:00:00.000Z',
        is_on_diet: true,
      });

    const cookies = createMealResponse.get('Set-Cookie');

    const listMealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200);

      const mealId  = listMealsResponse.body.meals[0].id 

      const getMealResponse = await request(app.server)
      .get(`/meals/${mealId}`)
      .set('Cookie', cookies)
      .expect(200);

      expect(getMealResponse.body.meal).toEqual(
        expect.objectContaining({
            name: 'Breakfast',
            description: 'Healthy breakfast with fruits',
            is_on_diet: 1,
        })
      )
  })

  it('should be able to update a meal', async () => {
    const createMealResponse = await request(app.server)
      .post('/meals')
      .send({
        name: 'Breakfast',
        description: 'Healthy breakfast with fruits',
        date_time: '2025-09-02T08:00:00.000Z',
        is_on_diet: true,
      });

    const cookies = createMealResponse.get('Set-Cookie');

    const listMealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200);

    const mealId = listMealsResponse.body.meals[0].id;

    await request(app.server)
      .put(`/meals/${mealId}`)
      .set('Cookie', cookies)
      .send({
        name: 'Updated Breakfast',
        is_on_diet: false,
      })
      .expect(204)
  })

  it('should be able to delete a meal', async () => {
    const createMealResponse = await request(app.server)
      .post('/meals')
      .send({
        name: 'Breakfast',
        description: 'Healthy breakfast with fruits',
        date_time: '2025-09-02T08:00:00.000Z',
        is_on_diet: true,
      });

    const cookies = createMealResponse.get('Set-Cookie');

    const listMealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200);

    const mealId = listMealsResponse.body.meals[0].id;

    await request(app.server)
      .delete(`/meals/${mealId}`)
      .set('Cookie', cookies)
      .expect(204)
  })

   it('should be able to get the metrics', async () => {
    const createMealResponse = await request(app.server)
      .post('/meals')
      .send({
        name: 'Healthy meal',
        description: 'On diet meal',
        date_time: '2025-09-02T08:00:00.000Z',
        is_on_diet: true,
      });

    const cookies = createMealResponse.get('Set-Cookie');

    await request(app.server)
      .post('/meals')
      .set('Cookie', cookies)
      .send({
        name: 'Cheat meal',
        description: 'Off diet meal',
        date_time: '2025-09-02T12:00:00.000Z',
        is_on_diet: false,
      });

    const metricsResponse = await request(app.server)
      .get('/meals/metrics')
      .set('Cookie', cookies)
      .expect(200)

      expect(metricsResponse.body).toEqual({
        totalMeals: 2,
        mealsOnDiet: 1,
        mealsOffDiet: 1,
        bestSequenceOnDiet: 1,
     })
  })
})

