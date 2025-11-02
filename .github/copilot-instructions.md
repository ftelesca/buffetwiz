# BuffetWiz AI Agent Instructions

## Project Overview
BuffetWiz is a React-based catering management system built with:
- Vite + TypeScript + React
- Shadcn/UI components (based on Radix UI)
- Supabase for authentication and data storage
- TanStack Query for data fetching/caching

## Key Architecture Patterns

### Authentication Flow
- Authentication state managed via `AuthContext` (`src/contexts/AuthContext.tsx`)
- Protected routes wrapped with `ProtectedRoute` component
- User profile data synced with Supabase profiles table
- Sign in/up flows in `src/components/auth/*`

### Component Organization
- UI components in `src/components/ui/*` - shadcn/ui primitives
- Feature components grouped by domain:
  - `auth/` - Authentication components
  - `chat/` - AI chat interface components  
  - `events/` - Event management 
  - `recipes/` - Recipe management
  - `supplies/` - Supply/inventory management

### Data Flow
- Supabase Edge Functions for backend logic (`supabase/functions/`)
- TanStack Query for data fetching/caching
- Forms built using shadcn/ui form components
- State management via React Context (Auth, Theme)

### Core Data Models
- Events (events, event_menu)
- Recipes (recipes, recipe_items) 
- Supplies/Items (items, units)
- Customers (customers)

## Development Workflow

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint codebase
npm run lint
```

## Key Integration Points
- Supabase Authentication
- Supabase Edge Functions (wizard-chat)
- Google Calendar Integration
- Spreadsheet Import/Export

## Project Conventions
1. Component Structure
   - Use TypeScript for all new components
   - Group related components in feature folders
   - UI components use shadcn/ui patterns

2. Data Fetching
   - Use TanStack Query hooks for data fetching
   - Handle loading/error states consistently
   - Cache invalidation via queryClient

3. Styling
   - Tailwind CSS for styling
   - Use shadcn/ui class patterns
   - Dark/light theme support via ThemeContext

4. Forms
   - Use shadcn/ui form components
   - Consistent validation patterns
   - Loading states during submission

## Common Tasks
- Adding new UI components: Use shadcn/ui CLI
- Adding protected routes: Wrap with ProtectedRoute
- Data fetching: Create TanStack Query hook
- Form handling: Use shadcn/ui form components
- Error handling: Use toast notifications

## Key Files for Context
- `src/App.tsx` - Main app structure and routing
- `src/contexts/AuthContext.tsx` - Auth state management
- `src/components/layout/MainLayout.tsx` - Core layout structure
- `src/lib/utils.ts` - Shared utilities
- `supabase/functions/wizard-chat/index.ts` - AI chat backend