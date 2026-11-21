# CampusCare

**Student Wellness Screening and Counselling Coordination System**

## Introduction

CampusCare is a web-based application developed to support student well-being within an educational institution. In many institutions, wellness records and counselling appointments are handled manually, which makes it difficult to maintain records, track appointment requests and manage counsellor availability. CampusCare addresses these issues by providing a single platform where students can complete wellness screenings and request counselling appointments, and where counsellors can manage their schedules and respond to requests.

The screening results produced by the system are intended for wellness support only and should not be treated as medical diagnoses.

## Objectives

- To develop a centralized platform for student wellness management.
- To provide registration and login for students and counsellors.
- To support wellness screening and the maintenance of screening history.
- To allow students to request counselling appointments and track their status.
- To allow counsellors to publish availability and accept or reject requests.
- To store all records in an organized relational database.
- To restrict access to information based on user roles.

## Features

### Student Module
- Registration and login
- Student dashboard
- Wellness screening and screening history
- Counselling appointment requests
- Appointment status tracking (pending, accepted or rejected)

### Counsellor Module
- Login (accounts may require approval before activation)
- Counsellor dashboard
- Management of availability, including date, start and end time, and online or offline mode
- Management of appointment requests
- Access to authorized student information
- Appointment history

### General
- Role-based access control for students and counsellors
- Password recovery

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite |
| Backend | Java |
| Database connectivity | JDBC |
| Database | MySQL 8.0 |

## Database

The system uses a MySQL database named `campuscare`, which contains the following tables:

1. `students`
2. `counsellors`
3. `screenings`
4. `counsellor_availability`
5. `appointments`
6. `password_recovery`

<!-- Add your exported schema file (e.g. database/schema.sql) and mention it here. -->

## Installation and Setup

### Prerequisites
- Java Development Kit (JDK)
- MySQL 8.0
- Bun or npm
- A web browser

### Steps

1. Clone the repository.
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO
   ```

2. Create a MySQL database named `campuscare` and import the schema file.

3. Copy `.env.example` to `.env` and enter your own values.
   ```
   DB_HOST=
   DB_PORT=
   DB_USER=
   DB_PASSWORD=
   SMTP_HOST=
   SMTP_PORT=
   SMTP_USER=
   SMTP_PASSWORD=
   ```
   The `.env` file is excluded from version control and must never be committed.

4. Start the backend.
   <!-- Add the command used to start the Java backend. -->

5. Start the frontend.
   <!-- Add the commands to install dependencies and start the Vite development server. -->

## Security and Privacy

Because the system handles sensitive student information, the following measures are followed:

- Credentials and secrets are stored in environment variables and not in the source code.
- Authorization is validated on the backend according to user role.
- Parameterized SQL queries are used to help prevent SQL injection.
- Access to wellness records and appointment details is restricted to authorized users.

## Future Enhancements

- Wellness analytics and visual reports
- Automated appointment reminders and notifications
- Improved scheduling and detection of appointment conflicts
- Secure online counselling integration
- Improved mobile responsiveness
- Audit logs and data backup


## Contribution Notes

Do not commit database passwords, `.env` files, authentication tokens, or any real student or counselling data to this repository.
