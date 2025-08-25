// prints the decoded PEM if FIREBASE_PRIVATE_KEY uses \n escapes correctly
console.log(process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"));
