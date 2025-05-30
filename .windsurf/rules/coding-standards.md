---
trigger: model_decision
description: 
globs: 
---
# Coding Standards and Best Practices

## 1. Code Comments

### General Guidelines
- Use comments to explain "why" rather than "what"
- Keep comments up-to-date with code changes
- Remove commented-out code before committing
- Use TODO comments for future improvements
- Use English

### Comment Types
```typescript
// Single line comment for brief explanations

/**
 * Multi-line comment for complex explanations
 * @param paramName - Description of parameter
 * @returns Description of return value
 */

// TODO: Add error handling for edge cases
```

## 2. Naming Conventions

### Variables and Functions
- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces
- Use UPPER_SNAKE_CASE for constants
- Use descriptive names that indicate purpose

### Examples
```typescript
// Good
const maxRetryCount = 3;
function calculateTotalPrice() {}
class UserService {}
const API_KEY = 'your-api-key';

// Bad
const x = 3;
function calc() {}
class us {}
const key = 'your-api-key';
```

## 3. Code Structure

### File Organization
- One class/interface per file
- Group related functions together
- Keep files focused and concise
- Use meaningful file names

### Function Guidelines
- Keep functions small and focused
- Limit parameters to 3-4 maximum
- Use default parameters when appropriate
- Return early to reduce nesting

## 4. Error Handling

### Best Practices
- Use try-catch blocks for expected errors
- Log errors with context
- Provide meaningful error messages
- Handle edge cases explicitly

### Example
```typescript
try {
  // Code that might throw
} catch (error) {
  console.error('Failed to process data:', error);
  throw new Error('Custom error message');
}
```

## 5. Testing

### Guidelines
- Write tests for all new features
- Keep tests independent
- Use descriptive test names
- Test edge cases and error conditions

### Example
```typescript
describe('UserService', () => {
  it('should create user with valid data', () => {
    // Test implementation
  });
});
```


- [ ] Security is addressed 