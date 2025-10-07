# Contributing to VoteGuard

First off, thank you for considering contributing to VoteGuard! It's people like you that make VoteGuard such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title** for the issue to identify the problem.
* **Describe the exact steps which reproduce the problem** in as many details as possible.
* **Provide specific examples to demonstrate the steps**.
* **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
* **Explain which behavior you expected to see instead and why**.
* **Include screenshots and animated GIFs** if possible.

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title** for the issue to identify the suggestion.
* **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
* **Provide specific examples to demonstrate the steps**.
* **Describe the current behavior** and **explain which behavior you expected to see instead**.
* **Explain why this enhancement would be useful** to most VoteGuard users.

### Pull Requests

* Fill in the required template
* Do not include issue numbers in the PR title
* Follow the TypeScript styleguide
* Include thoughtfully-worded, well-structured tests
* Document new code
* End all files with a newline

## Development Process

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Setup Development Environment

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/voteguard-voting-system.git

# Navigate to the project
cd voteguard-voting-system

# Install dependencies
npm install

# Create .env.local file and add your environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

## Coding Guidelines

### TypeScript Style Guide

* Use TypeScript for all new code
* Use interfaces over types when possible
* Use meaningful variable names
* Add JSDoc comments for functions
* Use async/await over promises

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line
* Consider starting the commit message with an applicable emoji:
    * 🎨 `:art:` when improving the format/structure of the code
    * 🐎 `:racehorse:` when improving performance
    * 🔒 `:lock:` when dealing with security
    * 🐛 `:bug:` when fixing a bug
    * 🔥 `:fire:` when removing code or files
    * ✅ `:white_check_mark:` when adding tests
    * 📝 `:memo:` when writing docs

### JavaScript/TypeScript Style Guide

All JavaScript/TypeScript must adhere to [JavaScript Standard Style](https://standardjs.com/).

* 2 spaces for indentation
* Single quotes for strings
* No unused variables
* Space after keywords
* Space after function name
* Always use `===` instead of `==`
* Infix operators must be spaced
* Commas should have a space after them
* Keep else statements on the same line as their curly braces

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Documentation

* Use JSDoc for functions and classes
* Keep README.md up to date
* Update API documentation when changing endpoints
* Include examples in documentation

## Questions?

Feel free to open an issue with your question or reach out to the maintainers directly.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
