// utils/findInvalidChars.js
export const findInvalidChars = (value) => {
  const allowedRegex = /^[a-zA-Z0-9\s\-&']+$/;
  const invalidChars = new Set();

  for (const char of value) {
    if (!allowedRegex.test(char)) {
      invalidChars.add(char);
    }
  }

  return Array.from(invalidChars);
};
