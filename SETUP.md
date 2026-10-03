# Coach Joy 001 — launch setup

## 1. Supabase
Create a free Supabase project.

In SQL Editor:
1. Open `supabase/schema.sql`.
2. Run the SQL. The private policy is already restricted to `ahmjoyuchechi@gmail.com`.

Create Coach Joy's Auth user with:
- Email: `ahmjoyuchechi@gmail.com`
- Password: choose a private password and do not put it in this project.

## 2. Connect the website
The website has been connected to the Supabase project URL and publishable key.

The public calendar reads occupied slots through `get_booked_slots`, while booking creation uses `create_booking`. The private dashboard uses Supabase Auth and the RLS policy for `ahmjoyuchechi@gmail.com`.

## 3. Email notifications
This project uses EmailJS for the student confirmation and Coach Joy notification.
Create an EmailJS account and configure a Gmail/SMTP email service.

Create two templates:

### Student confirmation template
To: `{{to_email}}`
Subject: `Coach Joy 001 | Conversation confirmed`

Suggested body:

Your schedule has been confirmed and noted down.

Coach Joy's team will contact you on WhatsApp at the scheduled time and date.

Date: {{date}}
Time: {{time}}

Thank you.

### Coach notification template
To: `{{to_email}}`
Subject: `New Coach Joy booking | {{date}} | {{time}}`

Suggested body:

A new conversation has been booked.

Name: {{name}}
Email: {{email}}
WhatsApp: {{whatsapp}}
Date: {{date}}
Time: {{time}}

Then put the EmailJS public key, service ID and both template IDs in `app.js`.

## 4. Hosting
The site can be deployed on a free static host. Upload the project files, then test:
- mobile landing page
- calendar
- booking
- double booking protection
- student email
- Coach Joy email
- private dashboard

## Important privacy point
The public calendar does NOT expose student names, emails or WhatsApp numbers. It only receives the list of occupied time slots through a restricted database function. The private dashboard requires Coach Joy's authenticated account.
