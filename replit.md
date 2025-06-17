# Marketing KPI Dashboard Application

## Overview

This is a full-stack marketing KPI (Key Performance Indicator) dashboard application built with Node.js/Express backend and React frontend. The application tracks marketing performance across the Customer Value Journey (CVJ) stages and provides data entry, analysis, and reporting capabilities for marketing teams.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **State Management**: React Query (TanStack Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: JWT-based authentication with refresh tokens
- **API Design**: RESTful API with standardized response formats

## Key Components

### Database Layer
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Connection Pool**: Neon serverless with connection pooling
- **Schema Management**: Drizzle migrations with type-safe schema definitions
- **Retry Logic**: Built-in connection retry mechanism for reliability

### Authentication System
- **JWT Tokens**: Separate access and refresh tokens
- **Token Storage**: HTTP-only cookies with localStorage fallback
- **Role-based Access**: Admin-only routes for data management
- **Password Security**: bcrypt hashing with configurable rounds

### CVJ (Customer Value Journey) Framework
The application organizes KPIs across 8 CVJ stages:
1. **Aware** - Brand awareness and visibility metrics
2. **Engage** - User engagement and interaction metrics
3. **Subscribe** - Lead generation and subscription metrics
4. **Convert** - Sales conversion metrics
5. **Excite** - Customer satisfaction metrics
6. **Ascend** - Upselling and expansion metrics
7. **Advocate** - Customer advocacy metrics
8. **Promote** - Referral and promotion metrics

### Data Structure Hierarchy
```
CVJ Stages → Sub Categories → KPIs → Weekly Data Entries
                          ↓
                    Monthly Targets
```

## Data Flow

### Dashboard Data Flow
1. User selects time period (weeks/months)
2. Frontend queries aggregated dashboard data
3. Backend processes weekly data entries against monthly targets
4. Calculated performance percentages and status indicators
5. Real-time updates via React Query invalidation

### Data Entry Flow
1. Admin creates weeks and sets date ranges
2. Users enter weekly performance data for each KPI
3. System validates data against KPI unit types
4. Multi-month period handling for cross-month weeks
5. Automatic aggregation for monthly reporting

### Admin Management Flow
1. CVJ stage and subcategory structure management
2. KPI creation with unit types and default targets
3. Weekly period definition and management
4. Monthly target setting per KPI
5. Data export and reporting capabilities

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless connection
- **drizzle-orm**: Type-safe database ORM
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **express**: Web framework
- **react**: Frontend framework
- **@tanstack/react-query**: Server state management
- **tailwindcss**: Utility-first CSS framework

### UI Components
- **@radix-ui/***: Accessible component primitives
- **shadcn/ui**: Pre-built component library
- **lucide-react**: Icon library
- **react-hook-form**: Form handling
- **zod**: Schema validation

### Development Tools
- **vite**: Build tool and dev server
- **typescript**: Type safety
- **tsx**: TypeScript execution
- **drizzle-kit**: Database migration tool

## Deployment Strategy

### Development Environment
- **Runtime**: Replit with Node.js 20
- **Database**: PostgreSQL 16 module
- **Hot Reload**: Vite HMR for frontend, tsx for backend
- **Port Configuration**: Backend on 5000, frontend dev on 24678

### Production Deployment
- **Platform**: Replit Autoscale deployment
- **Build Process**: Vite build + esbuild for server bundling
- **Environment Variables**: Comprehensive configuration via .env
- **Database**: Neon PostgreSQL with connection pooling
- **Caching**: Redis for session storage and caching (optional)

### Container Support
- **Docker**: Multi-service docker-compose setup
- **Services**: App, PostgreSQL, Redis
- **Health Checks**: Database and service health monitoring
- **Volume Mounting**: Persistent data and log storage

### Configuration Management
- **Environment Variables**: Comprehensive .env configuration
- **Security**: JWT secrets, bcrypt rounds, rate limiting
- **Database**: Multiple connection parameter options
- **File Uploads**: Configurable size limits and allowed types
- **Logging**: Structured logging with configurable levels

## Changelog
- June 17, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.