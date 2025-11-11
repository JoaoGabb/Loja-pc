/**
 
 *
 * como rodar:
 *   npm install
 *   npm start
 * abrir no chrome: http://localhost:4000
 *
 * autor: Joao Gabriel rgm 36044008 simples CRUD com SQLite
 */

// Importar
const express = require('express'); 
const bodyParser = require('body-parser'); 
const sqlite3 = require('sqlite3').verbose(); 
const path = require('path');

// Crear app e configurar
const app = express();
const PORT = process.env.PORT || 4000; // usar porta 4000
const DB_FILE = path.join(__dirname, 'db.sqlite');

// Configurar mecanismo de visualização 
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Inicialização do banco de dados ---
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Erro ao abrir banco de dados:', err);
    process.exit(1);
  }
});

db.serialize(() => {
  // criar tabela se não existir
  db.run(`CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco REAL NOT NULL DEFAULT 0,
    quantidade INTEGER NOT NULL DEFAULT 0
  );`);
});

// Painel (estatísticas simples)
// Este endpoint coleta a contagem, o estoque total e o valor total.
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

// Liste produtos com pesquisa simples
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

// Novo formulario
app.get('/produtos/novo', (req, res) => {
  res.render('form', { produto: null });
});

// criar produto
app.post('/produtos', (req, res) => {
  const { nome, descricao, preco, quantidade } = req.body;
  db.run('INSERT INTO produtos (nome, descricao, preco, quantidade) VALUES (?, ?, ?, ?)',
    [nome, descricao, parseFloat(preco) || 0, parseInt(quantidade) || 0],
    function(err) {
      if (err) return res.status(500).send('Erro ao criar produto');
      res.redirect('/produtos');
    });
});

// Formulário de edição do produto sendo ele buscar por ID
app.get('/produtos/editar/:id', (req, res) => {
  const id = Number(req.params.id);
  db.get('SELECT * FROM produtos WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).send('Erro DB');
    if (!row) return res.status(404).send('Produto não encontrado');
    res.render('form', { produto: row });
  });
});

//Atualizar produto 
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

// Deletar produto
app.post('/produtos/excluir/:id', (req, res) => {
  const id = Number(req.params.id);
  db.run('DELETE FROM produtos WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).send('Erro ao excluir');
    res.redirect('/produtos');
  });
});

// 
app.get('/api/produtos', (req, res) => {
  db.all('SELECT * FROM produtos ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// Startando o serve
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
