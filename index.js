const express = require('express');
const app = express();

app.use('/static', express.static(__dirname+'/static'));

app.get('/reviews', require('./src/service'));

app.listen(8080, () => console.log(`Server started at Port 8080`));
