const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

const url = 'mongodb://localhost:27017/mydatabase';
const client = new MongoClient(url);

app.use(bodyParser.json());

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Access denied');
  try {
    const decoded = jwt.verify(token, 'secretkey');
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).send('Invalid token');
  }
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  client.connect(function(err) {
    const db = client.db('mydatabase');
    const collection = db.collection('Users');
    collection.findOne({username: username, password: password}, function(err, user) {
      if (user) {
        const token = jwt.sign({ username }, 'secretkey');
        res.send({ token });
      } else {
        res.status(401).send('Invalid username or password');
      }
      client.close();
    });
  });
});

app.get('/api/inventory', (req, res) => {
  client.connect(function(err) {
    const db = client.db('mydatabase');
    const collection = db.collection('Inventory');
    collection.find({}).toArray(function(err, inventory) {
      res.send(inventory);
      client.close();
    });
  });
});

app.get('/api/inventory/low-quantity', (req, res) => {
  client.connect(function(err) {
    const db = client.db('mydatabase');
    const collection = db.collection('Inventory');
    const query = {instock: {$lt: 100}};
    collection.find(query).toArray(function(err, inventory) {
      res.send(inventory);
      client.close();
    });
  });
});

app.get('/api/orders', verifyToken, (req, res) => {
  client.connect(function(err) {
    const db = client.db('mydatabase');
    const collection = db.collection('Order');
    collection.find({}).toArray(function(err, orders) {
      res.send(orders);
      client.close();
    });
  });
});

app.get('/api/orders-with-products', verifyToken, (req, res) => {
  client.connect(function(err) {
    const db = client.db('mydatabase');
    const orderCollection = db.collection('Order');
    const productCollection = db.collection('Inventory');
    orderCollection.find({}).toArray(function(err, orders) {
      productCollection.find({}).toArray(function(err, products) {
        const ordersWithProducts = orders.map(order => {
          const productsInOrder = order.items.map(item => {
            const product = products.find(p => p.sku === item.sku);
            return {
              ...item,
              description: product.description
            };
          });
          return {
            ...order,
            items: productsInOrder
          };
        });
        res.send(ordersWithProducts);
        client.close();
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});