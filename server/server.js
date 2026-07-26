require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const app = require('./app');
 
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});