const bcrypt = require("bcrypt");

// Replace with the hash from the database
const storedHash = "$2b$10$5yD40JWxrpNJefnweVAz7OSZMQ1LQRp5/gYKPYQV4F8QkH31Hv0qu";

// Replace with the plain-text password being tested
const password = "etek@1234";

bcrypt.compare(password, storedHash, (err, result) => {
  if (err) {
    console.error("Error comparing passwords:", err);
  } else {
    console.log("Password is valid:", result);
  }
});
