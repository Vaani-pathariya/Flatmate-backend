const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Hello this is your nodejs backend!');
});

app.listen(port, () => console.log(`Hello world app listening on port ${port}!`))