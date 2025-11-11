/**
 * Loja de Computador ERP - Visual Hacker
 * Lightweight ERP for products (student project style comments included)
 *
 * How to run:
 *   npm install
 *   npm start
 * Open: http://localhost:4000
 *
 * Author: Student (university project) - simple CRUD with SQLite
 */

// Import modules
const express = require('express'); // web framework
const bodyParser = require('body-parser'); // parse form data
const sqlite3 = require('sqlite3').verbose(); // lightweight DB
const path = require('path');

// Create app and config
const app = express();
const PORT = process.env.PORT || 4000; // using port 4000 as requested
const DB_FILE = path.join(__dirname, 'db.sqlite');

// Set view engine and middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Database initialization ---
// NOTE: This is a simple local DB for the student project.
// In production we would use migrations and a proper DB server.
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Erro ao abrir banco de dados:', err);
    process.exit(1);
  }
});

db.serialize(() => {
  // create table if not exists
  db.run(`CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco REAL NOT NULL DEFAULT 0,
    quantidade INTEGER NOT NULL DEFAULT 0
  );`);
});

// --- Routes ---

// Dashboard (simple stats)
// This endpoint gathers count, total stock and total value.
// For a student project it's acceptable to run three queries sequentially.
app.get('/', (req, res) => {
  db.serialize(() => {
    db.get('SELECT COUNT(*) as total FROM produtos', (err, trow) => {
      if (err) return res.status(500).send('DB error');
      db.get('SELECT SUM(quantidade) as estoque_total FROM produtos', (err, srow) => {
        if (err) return res.status(500).send('DB error');
        db.get('SELECT SUM(preco * quantidade) as valor_total FROM produtos', (err, vrow) => {
          if (err) return res.status(500).send('DB error');
          res.render('index', {
            stats: {
              total: trow.total || 0,
              estoque: srow.estoque_total || 0,
              valor: vrow.valor_total ? Number(vrow.valor_total).toFixed(2) : '0.00'
            }
          });
        });
      });
    });
  });
});

// List products with simple search
app.get('/produtos', (req, res) => {
  const q = req.query.q || '';
  const params = [];
  let sql = 'SELECT * FROM produtos';
  if (q) {
    sql += ' WHERE nome LIKE ? OR descricao LIKE ? OR id = ?';
    params.push('%' + q + '%', '%'+q+'%', Number(q) || -1);
  }
  sql += ' ORDER BY id DESC';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).send('DB error');
    res.render('produtos', { produtos: rows, q });
  });
});

// Show new product form
app.get('/produtos/novo', (req, res) => {
  res.render('form', { produto: null });
});

// Create product - simple insertion
app.post('/produtos', (req, res) => {
  const { nome, descricao, preco, quantidade } = req.body;
  db.run('INSERT INTO produtos (nome, descricao, preco, quantidade) VALUES (?, ?, ?, ?)',
    [nome, descricao, parseFloat(preco) || 0, parseInt(quantidade) || 0],
    function(err) {
      if (err) return res.status(500).send('Erro ao criar produto');
      res.redirect('/produtos');
    });
});

// Edit product form - fetch by id
app.get('/produtos/editar/:id', (req, res) => {
  const id = Number(req.params.id);
  db.get('SELECT * FROM produtos WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).send('Erro DB');
    if (!row) return res.status(404).send('Produto não encontrado');
    res.render('form', { produto: row });
  });
});

// Update product - apply changes
app.post('/produtos/editar/:id', (req, res) => {
  const id = Number(req.params.id);
  const { nome, descricao, preco, quantidade } = req.body;
  db.run('UPDATE produtos SET nome=?, descricao=?, preco=?, quantidade=? WHERE id=?',
    [nome, descricao, parseFloat(preco) || 0, parseInt(quantidade) || 0, id],
    function(err) {
      if (err) return res.status(500).send('Erro ao atualizar');
      res.redirect('/produtos');
    });
});

// Delete product
app.post('/produtos/excluir/:id', (req, res) => {
  const id = Number(req.params.id);
  db.run('DELETE FROM produtos WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).send('Erro ao excluir');
    res.redirect('/produtos');
  });
});

// Simple API endpoint used for integration/testing
app.get('/api/produtos', (req, res) => {
  db.all('SELECT * FROM produtos ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// Start server
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
