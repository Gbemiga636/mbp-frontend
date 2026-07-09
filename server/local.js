require('dotenv').config();
const { createApp } = require('./index');

const PORT = Number(process.env.PORT || 4000);
const app = createApp();

app.listen(PORT, () => {
  console.log(`MBP API listening on http://localhost:${PORT}`);
});
