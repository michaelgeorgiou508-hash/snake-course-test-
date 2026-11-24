# Changelog

## 24/11/2026

### Changed: snake is a long human, and it farts when it eats

- **What:** the snake is drawn as a person (skin-coloured head with hair and eyes, blue shirt segments with arms). Eating spawns a grey fart cloud at the tail and plays a short sound.
- **Why:** requested by Michael.
- **Roll back:** revert this commit, or restore the earlier `main.js` drawing code (`COLOURS.snake` and the `draw()` function).

### Added: basic snake game

- **What:** a snake game that runs in the browser. Rules live in `game.js`, drawing and input in `main.js`, the page in `index.html`, and rule tests in `game.test.js`.
- **Why:** first version of the project.
- **Roll back:** this is the first commit, so there is nothing earlier to return to. Delete the files to remove it.
