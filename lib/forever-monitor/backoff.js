// n + 1
exports.incremental = function(n) {
  return n + 1;
};

// (2^n - 1) / 2
exports.exponential = function(n) {
  return (Math.pow(2, n) - 1) / 2;
};

// F(n) = { 0                    n = 0
//          1                    n = 1
//          F(n - 1) + F(n - 2)  n > 1
//        }
function fibonacci_recursive(n) {
  return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
};
exports.fibonacci = fibonacci_recursive;
