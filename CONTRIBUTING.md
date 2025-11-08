# Contributing to Mobile Detailing Scheduling App

Thank you for your interest in contributing to the Mobile Detailing Scheduling App! We welcome contributions from the community.

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (code snippets, screenshots, etc.)
- **Describe the behavior you observed** and what you expected to see
- **Include environment details** (browser, OS, Node.js version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List any alternative solutions** you've considered

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Install dependencies**: `npm install`
3. **Make your changes** following our coding standards
4. **Test your changes**: `npm run dev` and verify functionality
5. **Update documentation** if needed
6. **Commit your changes** with clear, descriptive commit messages
7. **Push to your fork** and submit a pull request

## Development Process

### Setting Up Development Environment

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/mobile-detailing-app.git
cd mobile-detailing-app

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Start development server
npm run dev
```

### Coding Standards

- **TypeScript**: Use strict typing, avoid `any` when possible
- **React**: Use functional components with hooks
- **Formatting**: Code is automatically formatted with Prettier
- **Linting**: Follow ESLint rules (run `npm run lint` if available)
- **Naming**:
  - Components: PascalCase (e.g., `AppointmentCard.tsx`)
  - Functions/variables: camelCase (e.g., `handleSubmit`)
  - Types/Interfaces: PascalCase (e.g., `AppointmentType`)
  - Files: kebab-case for utilities (e.g., `date-utils.ts`)

### Component Guidelines

- Keep components small and focused (single responsibility)
- Extract reusable logic into custom hooks
- Use TypeScript interfaces for props
- Add JSDoc comments for complex components/functions
- Prefer composition over inheritance

### Commit Messages

Follow the conventional commits specification:

```
type(scope): subject

body (optional)
footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(appointments): add recurring appointment feature
fix(calendar): resolve date picker timezone issue
docs(readme): update installation instructions
```

### Testing

Before submitting a pull request:

1. **Test the development build**: `npm run dev`
2. **Test the production build**: `npm run build && npm run preview`
3. **Verify no console errors** in browser DevTools
4. **Test in multiple browsers** (Chrome, Firefox, Safari)
5. **Check responsive design** on mobile devices

### Pull Request Guidelines

- **Keep PRs focused**: One feature/fix per PR
- **Update the README** if adding new features
- **Add comments** explaining complex logic
- **Reference issues**: Use "Fixes #123" in PR description
- **Request review**: Tag maintainers for review
- **Address feedback**: Respond to review comments promptly

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components (don't modify directly)
│   ├── figma/          # Figma utilities
│   ├── hooks/          # Custom React hooks
│   └── utils/          # Component utilities
├── types/              # TypeScript type definitions
├── services/           # Business logic services
├── config/             # Configuration files
└── lib/                # Utility libraries
```

## Component Development

### Adding a New Component

1. Create component file in appropriate directory
2. Define TypeScript interface for props
3. Implement component with proper typing
4. Export component from `index.ts` if applicable
5. Use component in parent component

Example:
```tsx
// src/components/CustomerCard.tsx
import React from 'react';

interface CustomerCardProps {
  name: string;
  email: string;
  phone: string;
  onEdit?: () => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({
  name,
  email,
  phone,
  onEdit,
}) => {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold">{name}</h3>
      <p className="text-sm text-gray-600">{email}</p>
      <p className="text-sm text-gray-600">{phone}</p>
      {onEdit && (
        <button onClick={onEdit} className="mt-2 text-blue-600">
          Edit
        </button>
      )}
    </div>
  );
};
```

### Adding a New Service

1. Create service file in `src/services/`
2. Define service class with methods
3. Add TypeScript types for parameters/returns
4. Document public methods with JSDoc
5. Export service instance

## Questions?

Feel free to open an issue for any questions or clarifications needed!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
