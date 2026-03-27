// Set NODE_ENV to production so isStatic fast-paths activate
// and benchmarks reflect real-world performance, not dev-mode overhead.
// Restored in setup-after.js via afterAll.
process.env.NODE_ENV = 'production';
