const app = require("./app");
require("dotenv").config();

const PORT = process.env.PORT || 3000;

// Only start the server if not in Lambda environment
if (require.main === module && !process.env.LAMBDA_TASK_ROOT) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
