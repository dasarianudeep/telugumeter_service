const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000

app.use('/static', express.static(__dirname+'/static'));

app.get('/reviews', require('./src/service'));

app.listen(PORT, () => console.log(`Server started at Port: ${PORT}`));
