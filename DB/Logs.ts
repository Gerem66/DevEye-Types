export interface DBLogsType {
    ID: number;
    UID: number;
    IP: string;
    Level: number;
    Type: string;
    Description: string;
    Date: number; // timestamp
}

export interface LogsType {
    id: number;
    uid: number;
    ip: string;
    level: number;
    type: string;
    description: string;
    date: number;
}
