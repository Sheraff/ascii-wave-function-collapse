import TILES from './tiles.js'
const GRID_SIZE = [50, 20]
const NEIGHBORS = [
	[0, -1],
	[1, 0],
	[0, 1],
	[-1, 0],
]

const pre = document.querySelector('pre')
if(!pre)
	throw new Error('No pre element found')
start(pre)

function start(pre) {
	const array = createNewGrid(GRID_SIZE)
	const backtrack = {
		cursor: 0,
		stack: [],
	}
	loop(pre, array, backtrack)
}

async function loop(pre, array, backtrack) {
	const cells = getMinEntropyCells(array)
	if (cells.length === 0)
		return
	const randomCell = cells[Math.floor(Math.random() * cells.length)]
	try {
		assignSuitableOption(array, randomCell, backtrack)
		collapseNeighbors(array, randomCell, backtrack)
		backtrack.cursor = Math.max(0, backtrack.cursor - 0.1)
		draw(pre, array)
		await frame()
		loop(pre, array, backtrack)
	} catch (error) {
		if(backtrack.stack.length > 0) {
			const reset = resetToCursor(backtrack)
			console.log('backtracking', Math.round(backtrack.cursor), error.message)
			loop(pre, reset, backtrack)
		} else {
			console.log('restarting', error.message)
			start(pre)
		}
	}
}

function frame() {
	return new Promise(resolve => requestAnimationFrame(resolve))
}

function resetToCursor(backtrack) {
	backtrack.cursor += 1
	const revertCount = Math.min(Math.floor(backtrack.cursor), backtrack.stack.length)
	const [reset] = backtrack.stack.splice(backtrack.stack.length - revertCount)
	return JSON.parse(reset)
}

function collapseNeighbors(array, cell, backtrack, stack = []) {
	for (let i = 0; i < NEIGHBORS.length; i++) {
		const vector = NEIGHBORS[i]
		const x = cell.x + vector[0]
		const y = cell.y + vector[1]
		if (x < 0 || x >= GRID_SIZE[0] || y < 0 || y >= GRID_SIZE[1])
			continue
		const neighbor = getCellFromXY(array, x, y)
		if (neighbor.tile)
			continue
		const possibilities = cell.tile
			? [cell.tile.is[i]]
			: cell.accepts[i]
		const mirrorIndex = (i + 2) % 4
		const compatibleOptions = neighbor.accepts[mirrorIndex].filter(
			option => possibilities.includes(option)
		)
		if (compatibleOptions.length === 0)
			throw new Error('Invalid neighbor')
		const entropyDifference = neighbor.accepts[mirrorIndex].length - compatibleOptions.length
		if (entropyDifference !== 0)
			stack.push(neighbor)
		neighbor.accepts[mirrorIndex] = compatibleOptions
		neighbor.entropy -= entropyDifference
		// if (neighbor.entropy === 4)
		// 	assignSuitableOption(array, neighbor, backtrack)
	}
	if (stack.length > 0) {
		const nextCell = stack.shift()
		collapseNeighbors(array, nextCell, backtrack, stack)
	}
}

function assignSuitableOption(array, cell, backtrack) {
	const options = TILES.filter(option => 
		cell.accepts.every(
			(directionalOption, i) => directionalOption.includes(option.is[i])
		)
	)

	if (options.length === 0)
		throw new Error('No suitable options')

	backtrack.stack.push(JSON.stringify(array))
	
	const randomOption = options[Math.floor(Math.random() * options.length)]
	cell.tile = randomOption
}

function createNewGrid([width, height]) {
	return new Array(width * height).fill(0).map((_, index, array) => {
		const [x, y] = getXYFromIndex(array, index)
		const top    = y === 0          ? [0] : [0,1,2,3]
		const right  = x === width - 1  ? [0] : [0,1,2,3]
		const bottom = y === height - 1 ? [0] : [0,1,2,3]
		const left   = x === 0          ? [0] : [0,1,2,3]
		const entropy = top.length + right.length + bottom.length + left.length
		return ({
			index,
			x,
			y,
			entropy,
			accepts: [
				top,
				right,
				bottom,
				left,
			],
			tile: null,
		})
	})
}

function getMinEntropyCells(array) {
	let min = Infinity
	let cells = []
	for(let i = 0; i < array.length; i++) {
		const cell = array[i]
		if (cell.tile)
			continue
		if (cell.entropy < min) {
			min = cell.entropy
			cells = [cell]
		} else if (cell.entropy === min) {
			cells.push(cell)
		}
	}
	return cells
}

function draw(pre, array) {
	let text = ''
	for(let y = 0; y < GRID_SIZE[1]; y++) {
		for(let x = 0; x < GRID_SIZE[0]; x++) {
			const cell = getCellFromXY(array, x, y)
			text += cell.tile?.symbol || ' '
		}
		text += '\n'
	}
	pre.textContent = text
}

function getXYFromIndex(array, i) {
	const x = i % GRID_SIZE[0]
	const y = Math.floor(i / GRID_SIZE[0])
	return [x, y]
}

function getCellFromXY(array, x, y) {
	return array[y * GRID_SIZE[0] + x]
}
