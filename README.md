# SkyCast

A clean Expo React Native weather application for Android and Web.

## Features

- City search
- Current weather
- Humidity, wind, visibility and pressure
- 12-hour forecast
- 7-day forecast
- Current location
- Dynamic weather gradient
- Responsive web layout
- No API key required

## Run locally

```bash
npm install
npx expo start -c
```

Press `w` for web or `a` for Android.

## Weather API

SkyCast uses Open-Meteo for weather and geocoding data.

## GitHub Pages

Create a production web build:

```bash
npx expo export --platform web
```

The generated `dist` folder contains the static website. GitHub Pages can host this web build.

For project pages, configure the Expo web output/base path as required by your GitHub repository name before deployment.
