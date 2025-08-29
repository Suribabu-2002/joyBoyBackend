# Joyboy Backend

This is the backend for the Joyboy application, a movie and TV show tracking app.

## Features

- Get a list of all movies
- Get a single movie by its ID
- Get a list of all genres
- Add a movie to your watchlist
- Get your watchlist
- Remove a movie from your watchlist

## Getting Started

To get a local copy up and running follow these simple example steps.

### Prerequisites

- npm
  ```sh
  npm install npm@latest -g
  ```

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/your_username_/Project-Name.git
   ```
2. Install NPM packages
   ```sh
   npm install
   ```
3. Create a `.env` file in the root directory and add the following environment variables:
    ```
    MONGO_URI=<your_mongo_db_uri>
    PORT_NO=<your_port_no>
    ```

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.
Open [http://localhost:8080](http://localhost:8080) to view it in the browser.

### `npm test`

Launches the test runner in the interactive watch mode.

### `npm run prettier`

Formats all files in the project using Prettier.

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | / | Home route |
| GET | /genres | Get all genres |
| GET | /movies | Get all movies |
| GET | /movie/:id | Get a single movie by its ID |
| POST | /watchList/:id | Add a movie to your watchlist |
| GET | /watch-list | Get your watchlist |
| DELETE | /watchList/:id | Remove a movie from your watchlist |

## Technologies Used

- [Node.js](https://nodejs.org/en/)
- [Express](https://expressjs.com/)
- [Mongoose](https://mongoosejs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Cors](https://www.npmjs.com/package/cors)
- [Dotenv](https://www.npmjs.com/package/dotenv)
- [Nodemon](https://www.npmjs.com/package/nodemon)
- [Prettier](https://prettier.io/)

## Deployment

This project is deployed on [Vercel](https://vercel.com/).
