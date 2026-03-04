import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import {
  GoogleCalendarSdkPort,
  OAuthClientPort,
  CalendarClientPort
} from './google-calendar-client-port';

function asOAuth2Client(client: OAuthClientPort): OAuth2Client {
  return client as unknown as OAuth2Client;
}

export class GoogleCalendarGoogleApisAdapter implements GoogleCalendarSdkPort {
  createOAuth2Client(): OAuthClientPort {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI_PROD;

    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET devem estar configurados');
    }

    return new OAuth2Client(clientId, clientSecret, redirectUri) as unknown as OAuthClientPort;
  }

  createCalendarClient(auth: OAuthClientPort): CalendarClientPort {
    type GoogleCalendarOptions = Parameters<typeof google.calendar>[0];
    const options = {
      version: 'v3',
      auth: asOAuth2Client(auth)
    } as unknown as GoogleCalendarOptions;
    const calendar = google.calendar(options);

    return calendar as unknown as CalendarClientPort;
  }
}
