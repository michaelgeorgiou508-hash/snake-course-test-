import { createGame, turn, step, DIRECTIONS } from './game.js'

const BOARD_SIZE = 20
const TICK_MS = 110
const SWIPE_THRESHOLD_PX = 24
const MAX_QUEUED_TURNS = 2
const BEST_SCORE_KEY = 'snake.bestScore'

const COLOURS = {
  snake: '#F5F0EA',
  food: '#FF6A13',
  foodGlow: 'rgba(255, 106, 19, 0.7)',
}

const KEY_DIRECTIONS = {
  ArrowUp: DIRECTIONS.up, w: DIRECTIONS.up,
  ArrowDown: DIRECTIONS.down, s: DIRECTIONS.down,
  ArrowLeft: DIRECTIONS.left, a: DIRECTIONS.left,
  ArrowRight: DIRECTIONS.right, d: DIRECTIONS.right,
}

const board = document.getElementById('board')
const canvas = document.getElementById('canvas')
const context = canvas.getContext('2d')
const overlay = document.getElementById('overlay')
const message = document.getElementById('message')
const playButton = document.getElementById('play')
const scoreText = document.getElementById('score')
const bestText = document.getElementById('best')

let game = createGame(BOARD_SIZE)
let queuedTurns = []
let bestScore = loadBestScore()

// Private browsing can block storage; the game still works without a saved best.
function loadBestScore() {
  try {
    return Number(localStorage.getItem(BEST_SCORE_KEY)) || 0
  } catch {
    return 0
  }
}

function saveBestScore(score) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(score))
  } catch {
    // Nothing to do: the best score just won't survive a reload.
  }
}

function resizeCanvas() {
  const pixels = Math.round(board.clientWidth * window.devicePixelRatio)
  canvas.width = pixels
  canvas.height = pixels
  draw()
}

function drawCell(cell, cellSize, inset) {
  const side = cellSize - inset * 2
  context.beginPath()
  context.roundRect(cell.x * cellSize + inset, cell.y * cellSize + inset, side, side, side * 0.28)
  context.fill()
}

function draw() {
  const cellSize = canvas.width / game.size
  const gap = Math.max(1, cellSize * 0.06)
  context.clearRect(0, 0, canvas.width, canvas.height)

  if (game.food) {
    context.save()
    context.fillStyle = COLOURS.food
    context.shadowColor = COLOURS.foodGlow
    context.shadowBlur = cellSize * 1.2
    drawCell(game.food, cellSize, cellSize * 0.18)
    context.restore()
  }

  context.fillStyle = COLOURS.snake
  game.snake.forEach((segment, index) => {
    context.globalAlpha = index === 0 ? 1 : 0.78
    drawCell(segment, cellSize, gap)
  })
  context.globalAlpha = 1
}

function render() {
  scoreText.textContent = String(game.score)
  bestText.textContent = String(bestScore)
  overlay.hidden = game.status === 'playing'
  if (game.status === 'over') {
    message.textContent = game.food === null ? 'You filled the board' : 'Game over'
    playButton.textContent = 'Play again'
  }
  draw()
}

function startGame() {
  game = { ...createGame(BOARD_SIZE), status: 'playing' }
  queuedTurns = []
  render()
}

function queueTurn(direction) {
  if (game.status !== 'playing') return
  queuedTurns = [...queuedTurns, direction].slice(0, MAX_QUEUED_TURNS)
}

function tick() {
  if (game.status !== 'playing' || document.hidden) return

  const [nextTurn, ...remainingTurns] = queuedTurns
  queuedTurns = remainingTurns
  game = step(nextTurn ? turn(game, nextTurn) : game)

  if (game.score > bestScore) {
    bestScore = game.score
    saveBestScore(bestScore)
  }
  render()
  if (game.status === 'over') playButton.focus()
}

document.addEventListener('keydown', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
  const direction = KEY_DIRECTIONS[key]
  if (!direction) return
  event.preventDefault()
  queueTurn(direction)
})

let swipeStart = null

board.addEventListener('pointerdown', (event) => {
  swipeStart = { x: event.clientX, y: event.clientY }
})

board.addEventListener('pointermove', (event) => {
  if (!swipeStart) return
  const dx = event.clientX - swipeStart.x
  const dy = event.clientY - swipeStart.y
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD_PX) return

  const horizontal = Math.abs(dx) > Math.abs(dy)
  if (horizontal) queueTurn(dx > 0 ? DIRECTIONS.right : DIRECTIONS.left)
  else queueTurn(dy > 0 ? DIRECTIONS.down : DIRECTIONS.up)
  // Restart from here so one long drag can make several turns.
  swipeStart = { x: event.clientX, y: event.clientY }
})

const endSwipe = () => { swipeStart = null }
board.addEventListener('pointerup', endSwipe)
board.addEventListener('pointercancel', endSwipe)

playButton.addEventListener('click', startGame)
window.addEventListener('resize', resizeCanvas)

resizeCanvas()
render()
playButton.focus()
setInterval(tick, TICK_MS)
