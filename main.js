import { createGame, turn, step, DIRECTIONS } from './game.js'

const BOARD_SIZE = 20
const TICK_MS = 110
const SWIPE_THRESHOLD_PX = 24
const MAX_QUEUED_TURNS = 2
const BEST_SCORE_KEY = 'snake.bestScore'
const FART_LIFE_MS = 800
const FART_PUFFS_PER_EAT = 6
const FART_SOUND_SECONDS = 0.5

const COLOURS = {
  skin: '#E8B48A',
  hair: '#2C2520',
  eye: '#0B0907',
  shirt: '#3D7BFF',
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
let fartClouds = []
let audioContext = null

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
  draw(performance.now())
}

function drawCell(cell, cellSize, inset) {
  const side = cellSize - inset * 2
  context.beginPath()
  context.roundRect(cell.x * cellSize + inset, cell.y * cellSize + inset, side, side, side * 0.28)
  context.fill()
}

function cellCentre(cell, cellSize) {
  return { x: (cell.x + 0.5) * cellSize, y: (cell.y + 0.5) * cellSize }
}

function drawFood(cellSize) {
  if (!game.food) return
  context.save()
  context.fillStyle = COLOURS.food
  context.shadowColor = COLOURS.foodGlow
  context.shadowBlur = cellSize * 1.2
  drawCell(game.food, cellSize, cellSize * 0.18)
  context.restore()
}

// Body segments are a blue shirt with two skin-coloured arms.
function drawBodySegment(segment, cellSize, side) {
  context.fillStyle = COLOURS.shirt
  drawCell(segment, cellSize, cellSize * 0.16)

  const centre = cellCentre(segment, cellSize)
  context.fillStyle = COLOURS.skin
  for (const sign of [-1, 1]) {
    context.beginPath()
    context.arc(
      centre.x + side.x * sign * cellSize * 0.4,
      centre.y + side.y * sign * cellSize * 0.4,
      cellSize * 0.11,
      0,
      Math.PI * 2,
    )
    context.fill()
  }
}

// The head is a skin-coloured circle with hair on the back and two eyes at the front.
function drawHead(cell, cellSize, direction) {
  const centre = cellCentre(cell, cellSize)
  const radius = cellSize * 0.46
  const side = { x: -direction.y, y: direction.x }

  context.fillStyle = COLOURS.skin
  context.beginPath()
  context.arc(centre.x, centre.y, radius, 0, Math.PI * 2)
  context.fill()

  const backAngle = Math.atan2(-direction.y, -direction.x)
  context.fillStyle = COLOURS.hair
  context.beginPath()
  context.arc(centre.x, centre.y, radius, backAngle - Math.PI / 2, backAngle + Math.PI / 2)
  context.closePath()
  context.fill()

  context.fillStyle = COLOURS.eye
  for (const sign of [-1, 1]) {
    context.beginPath()
    context.arc(
      centre.x + direction.x * radius * 0.35 + side.x * sign * radius * 0.4,
      centre.y + direction.y * radius * 0.35 + side.y * sign * radius * 0.4,
      radius * 0.13,
      0,
      Math.PI * 2,
    )
    context.fill()
  }
}

function drawFartClouds(cellSize, now) {
  for (const puff of fartClouds) {
    const age = (now - puff.bornAt) / FART_LIFE_MS
    const x = (puff.startX + puff.driftX * age) * cellSize
    const y = (puff.startY - age * 0.9) * cellSize
    context.fillStyle = `rgba(166, 156, 146, ${0.55 * (1 - age)})`
    context.beginPath()
    context.arc(x, y, cellSize * (0.18 + 0.3 * age), 0, Math.PI * 2)
    context.fill()
  }
}

function draw(now) {
  const cellSize = canvas.width / game.size
  const side = { x: -game.direction.y, y: game.direction.x }
  context.clearRect(0, 0, canvas.width, canvas.height)

  drawFood(cellSize)
  game.snake.slice(1).forEach((segment) => drawBodySegment(segment, cellSize, side))
  drawHead(game.snake[0], cellSize, game.direction)
  drawFartClouds(cellSize, now)
}

// Runs every frame so the fart clouds animate smoothly, even between game ticks.
function frame(now) {
  fartClouds = fartClouds.filter((puff) => now - puff.bornAt < FART_LIFE_MS)
  draw(now)
  requestAnimationFrame(frame)
}

function spawnFart(tail, now) {
  const puffs = Array.from({ length: FART_PUFFS_PER_EAT }, () => ({
    startX: tail.x + 0.5 + (Math.random() - 0.5) * 0.4,
    startY: tail.y + 0.5 + (Math.random() - 0.5) * 0.4,
    driftX: (Math.random() - 0.5) * 0.6,
    bornAt: now,
  }))
  fartClouds = [...fartClouds, ...puffs]
}

// Browsers only allow sound after a click, so the audio context is made from the Play button.
function ensureAudio() {
  try {
    audioContext ??= new AudioContext()
    if (audioContext.state === 'suspended') audioContext.resume()
    return audioContext
  } catch (error) {
    console.warn('Sound unavailable:', error)
    return null
  }
}

function playFartSound() {
  const ctx = ensureAudio()
  if (!ctx) return

  const start = ctx.currentTime
  const oscillator = ctx.createOscillator()
  oscillator.type = 'sawtooth'
  oscillator.frequency.setValueAtTime(110, start)
  oscillator.frequency.exponentialRampToValueAtTime(55, start + FART_SOUND_SECONDS)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.6, start + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + FART_SOUND_SECONDS)

  oscillator.connect(gain).connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + FART_SOUND_SECONDS)
}

function render() {
  scoreText.textContent = String(game.score)
  bestText.textContent = String(bestScore)
  overlay.hidden = game.status === 'playing'
  if (game.status === 'over') {
    message.textContent = game.food === null ? 'You filled the board' : 'Game over'
    playButton.textContent = 'Play again'
  }
}

function startGame() {
  ensureAudio()
  game = { ...createGame(BOARD_SIZE), status: 'playing' }
  queuedTurns = []
  fartClouds = []
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
  const previous = game
  game = step(nextTurn ? turn(game, nextTurn) : game)

  if (game.score > previous.score) {
    // The tail the snake just ate from is where the fart comes out.
    spawnFart(previous.snake[previous.snake.length - 1], performance.now())
    playFartSound()
  }

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
requestAnimationFrame(frame)
