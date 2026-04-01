# Beauty Contest Backend

## Start

1. Copy `.env_example` to `.env`
2. Configure PostgreSQL credentials
3. Install dependencies:
   - `npm install`
4. Run:
   - `npm run dev`

## API Base

- `http://localhost:5000/api`

## Main endpoints

- `POST /auth/register` - organizer registration
- `POST /auth/login` - organizer/jury login
- `POST /auth/logout` - logout
- `POST /contests` - create contest (organizer)
- `GET /contests` - list contests
- `POST /jury` - create jury user for contest (organizer)
- `GET /jury/:contestId` - list jury for contest
- `POST /participants` - create participant (organizer)
- `GET /participants/:contestId` - list participants
- `POST /criteria` - create criterion (organizer)
- `GET /criteria/:contestId` - list criteria
- `PUT /scores` - add/update score (jury)
- `GET /scores/:contestId` - list scores
