# Writeup

Section 1

1. why you, why us

I am a strong fit for this role because I have lots of passion for problem solving. I have 10 years of engineering experience. I have been working the past 6 years professionally using Flutter and I can transfer all those skills into the tech stack the team is using.

My real strenght is I won't stop until a problem is solved. An honest weakness that I see in your stack is Qodana. I've never used it before.

2. Decisions and trade-offs

The three most interesting technical decisions I made in Part 1 were:

shared package free of code

- The brief was clear that the shared package can't contain framework code, so the
  real question was where to draw the line. I put the types, the Zod schemas, the
  pay calculation, and a small API client in there, but left the React Query hooks
  in the web app.

storing money as integer cents

- I didn't want to deal with floating point anywhere near pay, so everything
  money-related is an integer number of cents, and I only convert to dollars at the
  edges.

database

- not sure which database to use but seems like I chose the correct one and easy to use

What I'd do differently for production, with a team:

SQLite was the right call for a take-home since it runs straight from a clone with
no Docker, but for real use I'd move to Postgres, which the Drizzle schema is
basically ready for.

There's no auth right now and only one implied reviewer, so
I'd add real users, record who approved a week, and keep a history of review
actions instead of one row I overwrite.

Plus the usual production things: logging, error
tracking.

Section 2

1. I have 6 years of professional experience with Flutter not React Native

2. Macbook air M2 chip
