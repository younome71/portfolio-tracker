const { jwtDecode } = require('jwt-decode');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjgzMDBhNTJlZDBkYzNiOTdhZTYyMTEwIiwicm9sZSI6InBhcmVudCJ9LCJpYXQiOjE3NDc5ODAwMjQsImV4cCI6MTc0ODU4NDgyNH0.eFdnbbdDcTzugU2Av6XvEkVJRlvkAnNWIgWkqs3yQRo';

try {
  const decoded = jwtDecode(token);
  console.log("Decoded Token:", decoded);
} catch (e) {
  console.error("Error decoding token:", e);
}
