export type Endpoints = 'auth' | 'check-token' | 'get-token';

export interface EndpointTypes {
  auth: string;
  'check-token': null;
  'get-token': string;
}
