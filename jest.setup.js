import '@testing-library/jest-dom'

// Polyfill for Request API in tests
import 'isomorphic-fetch'

// Mock environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
process.env.JWT_SECRET = 'test-secret-key'
