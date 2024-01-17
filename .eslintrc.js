module.exports = {
    "env": {
        "commonjs": true,
        "browser": true,
        "es6": false
    },
    "extends": [
        "airbnb-base",
        "prettier",
    ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "plugins": [
        "prettier"
    ],
    "rules": {
        "prettier/prettier": "error"
    }
};
