# The Salsa Beat Machine 🎼🎹🥁

Combine and arrange musical instruments to create different Salsa tunes. Great for musicians and dancers who want
to practive their Salsa timing and trains their ears.

▶ Check out the [online version](https://www.salsabeatmachine.org/)

▶ Get the [Android App](https://play.google.com/store/apps/details?id=com.salsarhythm&hl=en)

Built with [Next.js](https://nextjs.org/).

## Local development

1. Run:

```shell
npm install
npm run fetch:audio
npm run dev
```

`fetch:audio` downloads the sample bank (`main.webm`, `main.mp3`, `main.json`) from
salsabeatmachine.org into `public/assets/audio`, which the repo does not carry.

Then go to http://localhost:3009/ and start hacking!

## Serving the static export under a path prefix

`npm run build` writes a static `out/`. It assumes the site root; set
`NEXT_PUBLIC_BASE_PATH` to serve it from somewhere else:

```shell
NEXT_PUBLIC_BASE_PATH=/some/prefix npm run build
```

That sets Next's `basePath` and the audio bank's URL together, so both the page
assets and the samples resolve under the prefix.

## Backend Features

This repository includes comprehensive documentation for adding backend functionality to the SalsaNor Beat Machine. The backend would enable user accounts, pattern saving, social features, and analytics.

### 📚 Backend Documentation

- **[Quick Start Guide](./docs/QUICK_START.md)** - ⚡ Get started in 5 minutes
- **[Backend Summary](./docs/BACKEND_SUMMARY.md)** - High-level overview of proposed backend features
- **[Backend Architecture](./docs/BACKEND_ARCHITECTURE.md)** - Technical architecture and technology stack
- **[API Specification](./docs/API_SPECIFICATION.md)** - Complete API endpoint documentation
- **[Database Schema](./docs/DATABASE_SCHEMA.md)** - Database design with Prisma schema
- **[Implementation Guide](./docs/IMPLEMENTATION_GUIDE.md)** - Step-by-step implementation instructions
- **[Environment Variables](.env.example)** - Environment configuration template

### 🎯 Key Backend Features

- **User Authentication** - Register, login, OAuth integration
- **Pattern Management** - Save, load, and share custom beat patterns
- **Social Features** - Follow users, like patterns, comment, activity feed
- **User Profiles** - Customizable profiles with preferences and statistics
- **Analytics** - Track popular instruments, tempos, and patterns
- **Dynamic Configurations** - Serve machine configurations via API

### 🚀 Getting Started with Backend

**Quick Setup (5 minutes):** Follow the [Quick Start Guide](./docs/QUICK_START.md) to add authentication and pattern saving.

**Full Implementation:** To add complete backend functionality to this project:

1. Review the [Backend Summary](./docs/BACKEND_SUMMARY.md) for an overview
2. Follow the [Quick Start Guide](./docs/QUICK_START.md) for initial setup
3. Use the [Implementation Guide](./docs/IMPLEMENTATION_GUIDE.md) for detailed step-by-step instructions
4. Refer to the [API Specification](./docs/API_SPECIFICATION.md) as a reference for endpoints
5. Use the [Database Schema](./docs/DATABASE_SCHEMA.md) for data modeling

The documentation provides everything needed to implement a production-ready backend, from authentication to social features to analytics.
