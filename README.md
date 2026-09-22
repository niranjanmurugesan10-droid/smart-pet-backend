# Smart Pet Adoption System — Backend

## Setup

1. Open PowerShell in this `server` folder.
2. Install packages:
   `npm install`
3. Create `.env` from `.env.example`:
   - `PORT=5000`
   - `MONGO_URI=mongodb://localhost:27017/smartpet`
   - `JWT_SECRET=your_secret`
4. Start:
   `npm run dev`
   or
   `npm start`

MongoDB must be running locally.

## Main API routes

- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/pets`
- GET `/api/pets/mine` (JWT)
- GET `/api/pets/:id`
- POST `/api/pets` (owner/admin JWT)
- PUT `/api/pets/:id` (owner/admin JWT; own pet unless admin)
- DELETE `/api/pets/:id` (owner/admin JWT; own pet unless admin)
- POST `/api/adoptions` (adopter JWT)
- GET `/api/adoptions/my-requests` (adopter JWT)
- GET `/api/adoptions/received` (owner/admin JWT)
- PUT `/api/adoptions/:id/status` (owner/admin JWT)

## Authentication

For protected requests send:

`Authorization: Bearer YOUR_JWT_TOKEN`

Public registration intentionally cannot create an admin account.
