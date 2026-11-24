import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createGame, turn, step, DIRECTIONS } from './game.js'

const firstFreeCell = () => 0

function playingGame(overrides = {}) {
  return { ...createGame(10, firstFreeCell), status: 'playing', ...overrides }
}

test('new game starts ready with a three-segment snake heading right', () => {
  const game = createGame(10, firstFreeCell)

  assert.equal(game.status, 'ready')
  assert.equal(game.snake.length, 3)
  assert.deepEqual(game.direction, DIRECTIONS.right)
  assert.equal(game.score, 0)
})

test('food never spawns on the snake', () => {
  const game = createGame(10, firstFreeCell)

  const onSnake = game.snake.some((s) => s.x === game.food.x && s.y === game.food.y)

  assert.equal(onSnake, false)
})

test('step moves the head one cell and keeps the length', () => {
  const game = playingGame({ food: { x: 0, y: 0 } })
  const head = game.snake[0]

  const next = step(game, firstFreeCell)

  assert.deepEqual(next.snake[0], { x: head.x + 1, y: head.y })
  assert.equal(next.snake.length, 3)
})

test('step does not mutate the previous state', () => {
  const game = playingGame({ food: { x: 0, y: 0 } })
  const snapshot = structuredClone(game)

  step(game, firstFreeCell)

  assert.deepEqual(game, snapshot)
})

test('eating food grows the snake, adds a point and moves the food', () => {
  const start = playingGame()
  const head = start.snake[0]
  const game = { ...start, food: { x: head.x + 1, y: head.y } }

  const next = step(game, firstFreeCell)

  assert.equal(next.snake.length, 4)
  assert.equal(next.score, 1)
  assert.notDeepEqual(next.food, game.food)
})

test('turning back on itself is ignored', () => {
  const game = playingGame()

  const next = turn(game, DIRECTIONS.left)

  assert.deepEqual(next.queuedDirection, DIRECTIONS.right)
})

test('turning sideways is applied on the next step', () => {
  const game = playingGame({ food: { x: 0, y: 0 } })
  const head = game.snake[0]

  const next = step(turn(game, DIRECTIONS.down), firstFreeCell)

  assert.deepEqual(next.snake[0], { x: head.x, y: head.y + 1 })
})

test('hitting a wall ends the game', () => {
  const game = playingGame({
    snake: [{ x: 9, y: 5 }, { x: 8, y: 5 }, { x: 7, y: 5 }],
    food: { x: 0, y: 0 },
  })

  const next = step(game, firstFreeCell)

  assert.equal(next.status, 'over')
})

test('running into its own body ends the game', () => {
  const game = playingGame({
    snake: [
      { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 },
      { x: 6, y: 5 }, { x: 6, y: 4 },
    ],
    direction: DIRECTIONS.up,
    queuedDirection: DIRECTIONS.right,
    food: { x: 0, y: 0 },
  })

  const next = step(game, firstFreeCell)

  assert.equal(next.status, 'over')
})

test('moving into the cell the tail just left is allowed', () => {
  const game = playingGame({
    snake: [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }],
    direction: DIRECTIONS.up,
    queuedDirection: DIRECTIONS.right,
    food: { x: 0, y: 0 },
  })

  const next = step(game, firstFreeCell)

  assert.equal(next.status, 'playing')
})

test('step does nothing unless the game is playing', () => {
  const game = createGame(10, firstFreeCell)

  assert.equal(step(game, firstFreeCell), game)
})
