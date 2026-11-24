/**
 * Snake rules. Pure functions: every call returns a new game object and
 * never changes the one passed in, so the drawing code can't corrupt state.
 *
 * @typedef {{ x: number, y: number }} Cell
 * @typedef {'ready' | 'playing' | 'over'} Status
 * @typedef {{
 *   size: number, snake: Cell[], direction: Cell, queuedDirection: Cell,
 *   food: Cell | null, score: number, status: Status
 * }} Game
 */

export const DIRECTIONS = Object.freeze({
  up: Object.freeze({ x: 0, y: -1 }),
  down: Object.freeze({ x: 0, y: 1 }),
  left: Object.freeze({ x: -1, y: 0 }),
  right: Object.freeze({ x: 1, y: 0 }),
})

const START_LENGTH = 3

const sameCell = (a, b) => a.x === b.x && a.y === b.y

/**
 * Picks a free cell for the food. `random` works like Math.random.
 * @param {number} size
 * @param {Cell[]} snake
 * @param {() => number} random
 * @returns {Cell | null} null when the snake fills the whole board
 */
function placeFood(size, snake, random) {
  const freeCells = []
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const cell = { x, y }
      if (!snake.some((segment) => sameCell(segment, cell))) freeCells.push(cell)
    }
  }
  if (freeCells.length === 0) return null
  return freeCells[Math.floor(random() * freeCells.length)]
}

/**
 * @param {number} size board width and height in cells
 * @param {() => number} [random]
 * @returns {Game}
 */
export function createGame(size, random = Math.random) {
  const middle = Math.floor(size / 2)
  const snake = Array.from({ length: START_LENGTH }, (_, i) => ({ x: middle - i, y: middle }))
  return {
    size,
    snake,
    direction: DIRECTIONS.right,
    queuedDirection: DIRECTIONS.right,
    food: placeFood(size, snake, random),
    score: 0,
    status: 'ready',
  }
}

/**
 * Queues a turn for the next step. A 180° turn is ignored.
 * @param {Game} game
 * @param {Cell} direction
 * @returns {Game}
 */
export function turn(game, direction) {
  const isReverse =
    direction.x === -game.direction.x && direction.y === -game.direction.y
  if (isReverse) return game
  return { ...game, queuedDirection: direction }
}

/**
 * Advances the game by one move.
 * @param {Game} game
 * @param {() => number} [random]
 * @returns {Game}
 */
export function step(game, random = Math.random) {
  if (game.status !== 'playing') return game

  const direction = game.queuedDirection
  const head = { x: game.snake[0].x + direction.x, y: game.snake[0].y + direction.y }

  const hitWall = head.x < 0 || head.y < 0 || head.x >= game.size || head.y >= game.size
  if (hitWall) return { ...game, direction, status: 'over' }

  const ate = game.food !== null && sameCell(head, game.food)
  // The tail moves away this step unless we just ate, so its cell is free.
  const body = ate ? game.snake : game.snake.slice(0, -1)
  if (body.some((segment) => sameCell(segment, head))) {
    return { ...game, direction, status: 'over' }
  }

  const snake = [head, ...body]
  if (!ate) return { ...game, snake, direction }

  const food = placeFood(game.size, snake, random)
  return {
    ...game,
    snake,
    direction,
    food,
    score: game.score + 1,
    status: food === null ? 'over' : 'playing',
  }
}
