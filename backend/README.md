# Pet Shop Backend

This is the backend for the Pet Shop application. It provides APIs for user authentication, pet management, and appointment scheduling.

## Features

- User authentication (register, login, logout)
- Pet management (add, update, delete)
- Appointment scheduling (create, update, delete)
- MongoDB database integration
- JWT authentication
- RESTful API design

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=4003
   MONGODB_URI=mongodb://localhost:27017/pet-shop
   JWT_SECRET=your-secret-key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- POST /api/auth/register - Register a new user
- POST /api/auth/login - Login a user
- POST /api/auth/logout - Logout a user
- GET /api/auth/me - Get current user information

### Pets
- GET /api/pets - Get all pets for the current user
- POST /api/pets - Add a new pet
- PUT /api/pets/:id - Update a pet
- DELETE /api/pets/:id - Delete a pet

### Appointments
- GET /api/appointments - Get all appointments for the current user
- POST /api/appointments - Create a new appointment
- PUT /api/appointments/:id - Update an appointment
- DELETE /api/appointments/:id - Delete an appointment

## License

MIT 