const express = require('express')
const app = express()
const dbConnect = require('./db_connect')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const host = 'localhost'
const port = 3000

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

//welcome
app.get('/', (req, res) => {
	res.send('Welcome to your todo list!')
})

//register
app.post('/register', (req, res) => {
	const username = req.body.username
	const password = req.body.password

	dbConnect.query('SELECT * FROM users WHERE username = ?', [username], (err, result) => {
		if (err) {
			console.error(err)
			return res.status(500).json({ message: 'Internal Server Error' })
		}

		if (result.length > 0) {
			return res.status(400).json({ message: 'Username already exists' })
		}

		bcrypt.hash(password, 10, (hashErr, hash) => {
			if (hashErr) {
				console.error(hashErr)
				return res.status(500).json({ message: 'Internal Server Error' })
			}

			dbConnect.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], (insertErr, insertResult) => {
				if (insertErr) {
					console.error(insertErr)
					return res.status(500).json({ message: 'Internal Server Error' })
				}

				res.json({
					result: insertResult,
					message: 'User Registered!',
				})
			})
		})
	})
})

//login
app.post('/login', (req, res) => {
	const username = req.body.username
	const password = req.body.password

	dbConnect.query('SELECT * FROM users WHERE username = ?', [username], (err, result) => {
		if (err) throw err
		if (result.length > 0) {
			console.log(result)
			bcrypt.compare(password, result[0].password, (err, response) => {
				if (response) {
					const token = jwt.sign({ username: result[0].username }, '123')
					res.json({ token: token })
				} else {
					res.json({ message: 'Invalid username/password' })
				}
			})
		} else {
			res.json({ message: 'User not found' })
		}
	})
})

//verify token
function verifyToken(req, res, next) {
	const bearerHeader = req.headers['authorization']
	if (typeof bearerHeader !== 'undefined') {
		const bearer = bearerHeader.split(' ')
		const token = bearer[1]
		req.token = token
		next()
	} else {
		res.sendStatus(403)
	}
}

//get username
function getUsernameFromToken(token) {
	try {
		const decodedToken = jwt.verify(token, '123')
		const username = decodedToken.username
		return username
	} catch (error) {
		console.error('Error decoding JWT token:', error)
		return null
	}
}

//add todolist
app.post('/todolist', verifyToken, (req, res) => {
	const title = req.body.title
	const description = req.body.description
	const done = req.body.done

	const username = getUsernameFromToken(req.token)

	dbConnect.query('INSERT INTO todolists (username, title, description, done) VALUES (?, ?, ?, ?)', [username, title, description, done], (err, result) => {
		if (err) {
			console.error(err)
			return res.status(500).json({ message: 'Internal Server Error' })
		}

		res.json({ message: 'Todolist added' })
	})
})

//show todolist
app.get('/todolist', verifyToken, (req, res) => {
	const username = getUsernameFromToken(req.token)

	dbConnect.query('SELECT * FROM todolists WHERE username = ?', [username], (err, result) => {
		if (err) {
			console.error(err)
			return res.status(500).json({ message: 'Internal Server Error' })
		}
		res.json(result)
	})
})

//update status done todolist
app.put('/todolist/:id', verifyToken, (req, res) => {
	const todolist_id = req.params.id
	const done = req.body.done

	const username = getUsernameFromToken(req.token)
	dbConnect.query('SELECT * FROM todolists WHERE todolist_id = ? AND username = ?', [todolist_id, username], (selectErr, selectResult) => {
		if (selectErr) {
			console.error(selectErr)
			return res.status(500).json({ message: 'Internal Server Error' })
		}

		if (selectResult.length === 0) {
			return res.status(403).json({ message: 'Forbidden' })
		}

		// Jika entri ditemukan, lakukan pembaruan status done
		dbConnect.query('UPDATE todolists SET done = ? WHERE todolist_id = ?', [done, todolist_id], (updateErr, updateResult) => {
			if (updateErr) {
				console.error(updateErr)
				return res.status(500).json({ message: 'Internal Server Error' })
			}
			res.json({ message: 'Todolist updated' })
		})
	})
})

//delete todolist
app.delete('/todolist/:id', verifyToken, (req, res) => {
	const todolist_id = req.params.id
	const username = getUsernameFromToken(req.token)

	dbConnect.query('SELECT * FROM todolists WHERE todolist_id = ? AND username = ?', [todolist_id, username], (selectErr, selectResult) => {
		if (selectErr) {
			console.error(selectErr)
			return res.status(500).json({ message: 'Internal Server Error' })
		}

		if (selectResult.length === 0) {
			return res.status(403).json({ message: 'Forbidden' })
		}

		// Jika entri ditemukan, lakukan pembaruan status done
		dbConnect.query('DELETE FROM todolists WHERE todolist_id = ?', [todolist_id], (updateErr, updateResult) => {
			if (updateErr) {
				console.error(updateErr)
				return res.status(500).json({ message: 'Internal Server Error' })
			}
			res.json({ message: 'Todolist deleted' })
		})
	})
})

app.listen(port, () => console.log(`API running at ${host}:${port}!`))
