export interface OAuthCredentialsPort {
  access_token?: string;
  refresh_token?: string;
}

export interface OAuthTokensPort {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}

export interface OAuthClientPort {
  setCredentials(credentials: OAuthCredentialsPort): void;
  refreshAccessToken(): Promise<{ credentials: OAuthTokensPort }>;
  generateAuthUrl(options: {
    access_type: 'offline';
    scope: string[];
    prompt: 'consent';
    state?: string;
  }): string;
  getToken(code: string): Promise<{ tokens: OAuthTokensPort }>;
}

export interface CalendarEventsPort {
  insert(input: {
    calendarId: string;
    requestBody: unknown;
  }): Promise<{ data: { id?: string | null } }>;
  update(input: {
    calendarId: string;
    eventId: string;
    requestBody: unknown;
  }): Promise<{ data: { id?: string | null } }>;
  delete(input: {
    calendarId: string;
    eventId: string;
  }): Promise<void>;
  get(input: {
    calendarId: string;
    eventId: string;
  }): Promise<{ data: unknown }>;
  list(input: {
    calendarId: string;
    maxResults?: number;
    timeMin?: string;
  }): Promise<{
    data: {
      items?: unknown[];
    };
  }>;
}

export interface CalendarCalendarsPort {
  get(input: { calendarId: string }): Promise<{
    data: {
      id?: string | null;
      summary?: string | null;
      timeZone?: string | null;
      description?: string | null;
      location?: string | null;
    };
  }>;
}

export interface CalendarClientPort {
  events: CalendarEventsPort;
  calendars: CalendarCalendarsPort;
}

export interface GoogleCalendarSdkPort {
  createOAuth2Client(): OAuthClientPort;
  createCalendarClient(auth: OAuthClientPort): CalendarClientPort;
}
