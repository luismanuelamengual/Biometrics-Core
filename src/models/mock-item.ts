export interface MockItem {
    endpoint: string;
    response: string | object | ((any) => string | object);
    responseDelay?: number;
    method?: string;
    statusCode?: number;
}
